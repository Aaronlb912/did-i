package com.aaronbryant.didi.wear

import android.content.Context
import android.net.Uri
import androidx.compose.runtime.mutableStateOf
import androidx.wear.tiles.TileService
import com.google.android.gms.wearable.DataMapItem
import com.google.android.gms.wearable.PutDataMapRequest
import com.google.android.gms.wearable.Wearable
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.launch
import kotlinx.coroutines.tasks.await
import org.json.JSONArray
import org.json.JSONObject

// The last cards from the phone, kept on the watch so the app and the tile
// open with them. A tap marks the card here at once and goes to the phone.
object CardStore {
  const val CARDS_PATH = "/didi/cards"
  const val TAP_PATH = "/didi/tap"
  private const val PREFS = "didi-watch"
  private const val KEY_CARDS = "cards"
  private const val KEY_TAPS = "taps"
  // How long a tap stays on the watch while the phone has not caught up.
  private const val TAP_HOLD_MS = 10 * 60 * 1000L

  val cards = mutableStateOf<WatchCards?>(null)
  // Set by the answer that finishes the night; the done screen plays the burst once.
  val justFinished = mutableStateOf(false)

  private val scope = CoroutineScope(SupervisorJob() + Dispatchers.IO)
  private var loaded = false

  private fun prefs(context: Context) = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)

  fun load(context: Context): WatchCards? {
    if (!loaded) {
      loaded = true
      cards.value = WatchCards.parse(prefs(context).getString(KEY_CARDS, null))
    }
    return cards.value
  }

  // Cards from the phone. Taps the phone has not taken yet stay answered.
  @Synchronized
  fun receive(context: Context, raw: String) {
    val incoming = try { JSONObject(raw) } catch (e: Exception) { return }
    val now = System.currentTimeMillis()
    val taps = recentTaps(context, now)
    val items = incoming.optJSONArray("items") ?: JSONArray()
    val keep = JSONArray()
    for (t in 0 until taps.length()) {
      val tap = taps.optJSONObject(t) ?: continue
      var stillOpen = false
      for (i in 0 until items.length()) {
        val item = items.optJSONObject(i) ?: continue
        if (item.optString("id") == tap.optString("id") && item.optString("night") == tap.optString("night") &&
          item.optString("status") == "open"
        ) {
          item.put("status", tap.optString("answer"))
          stillOpen = true
        }
      }
      if (stillOpen) keep.put(tap)
    }
    val json = incoming.toString()
    val next = WatchCards.parse(json) ?: return
    prefs(context).edit().putString(KEY_CARDS, json).putString(KEY_TAPS, keep.toString()).apply()
    loaded = true
    cards.value = next
    updateTile(context)
  }

  private fun recentTaps(context: Context, now: Long): JSONArray {
    val all = try { JSONArray(prefs(context).getString(KEY_TAPS, "[]")) } catch (e: Exception) { JSONArray() }
    val out = JSONArray()
    for (i in 0 until all.length()) {
      val tap = all.optJSONObject(i) ?: continue
      if (now - tap.optLong("at") < TAP_HOLD_MS) out.put(tap)
    }
    return out
  }

  // Reads the phone's last cards from the Data Layer (the app may have
  // missed a change while it was closed).
  fun refresh(context: Context) {
    val app = context.applicationContext
    scope.launch {
      try {
        val buffer = Wearable.getDataClient(app).getDataItems(Uri.parse("wear://*$CARDS_PATH")).await()
        try {
          val item = buffer.firstOrNull() ?: return@launch
          val raw = DataMapItem.fromDataItem(item).dataMap.getString("cards") ?: return@launch
          receive(app, raw)
        } finally {
          buffer.release()
        }
      } catch (e: Exception) {
        // No phone yet: keep what is stored.
      }
    }
  }

  /** @return true when this answer finished the night (all Did). */
  @Synchronized
  fun answer(context: Context, card: WatchCard, did: Boolean): Boolean {
    val current = cards.value ?: return false
    val answer = if (did) "did" else "nope"
    val items = current.items.map {
      if (it.id == card.id && it.night == card.night) it.copy(status = answer) else it
    }
    val next = current.copy(items = items)
    val now = System.currentTimeMillis()
    val tap = JSONObject()
      .put("id", card.id)
      .put("answer", answer)
      .put("night", card.night)
      .put("dateIso", card.dateIso)
      .put("at", now)
    val stored = try { JSONObject(prefs(context).getString(KEY_CARDS, "{}")) } catch (e: Exception) { JSONObject() }
    stored.optJSONArray("items")?.let { list ->
      for (i in 0 until list.length()) {
        val item = list.optJSONObject(i) ?: continue
        if (item.optString("id") == card.id && item.optString("night") == card.night) item.put("status", answer)
      }
    }
    prefs(context).edit()
      .putString(KEY_CARDS, stored.toString())
      .putString(KEY_TAPS, recentTaps(context, now).put(tap).toString())
      .apply()
    val finished = did && items.isNotEmpty() && items.all { it.status == "did" }
    if (finished) justFinished.value = true
    cards.value = next
    updateTile(context)
    send(context.applicationContext, tap)
    return finished
  }

  // A message reaches the phone at once when it is in reach. Otherwise a data
  // item, which the Data Layer delivers when the phone is back.
  private fun send(context: Context, tap: JSONObject) {
    scope.launch {
      val bytes = tap.toString().toByteArray(Charsets.UTF_8)
      val sent = try {
        val nodes = Wearable.getNodeClient(context).connectedNodes.await()
        var ok = false
        for (node in nodes) {
          try {
            Wearable.getMessageClient(context).sendMessage(node.id, TAP_PATH, bytes).await()
            ok = true
          } catch (e: Exception) {
            // Try the next node, then the data item.
          }
        }
        ok
      } catch (e: Exception) {
        false
      }
      if (sent) return@launch
      try {
        val key = "${tap.optString("id")}-${tap.optString("night")}-${tap.optLong("at")}".replace("/", "_")
        val request = PutDataMapRequest.create("$TAP_PATH/$key")
        request.dataMap.putString("tap", tap.toString())
        Wearable.getDataClient(context).putDataItem(request.asPutDataRequest().setUrgent()).await()
      } catch (e: Exception) {
        // No Play services on the watch: the answer stays on the watch only.
      }
    }
  }

  fun updateTile(context: Context) {
    try {
      TileService.getUpdater(context).requestUpdate(DidITileService::class.java)
    } catch (e: Exception) {
      android.util.Log.w("DidI", "tile update failed", e)
    }
  }
}
