package com.aaronbryant.didi.wear

import androidx.compose.ui.graphics.Color
import java.time.LocalDate
import org.json.JSONArray
import org.json.JSONObject

// The cards the phone sends (watchCardsFromProps in native/watch-sync.js),
// the same JSON the Apple Watch reads. Every field but items is optional.
data class WatchCard(
  val id: String,
  val night: String,
  val dateIso: String,
  val question: String,
  val tag: String,
  val status: String,
  // Counted in Today's meter (last night's grace cards are not). True from an
  // older phone build, so every card counts the old way.
  val counted: Boolean = true,
)

// One shape in the widget's part format: a kind letter, then numbers and
// colour strings, e.g. ["e", 24, 30, 15, 14, "#f0a64a"].
class ShapePart(private val values: List<Any?>) {
  val kind: String = values.firstOrNull() as? String ?: ""

  fun num(i: Int): Float {
    val v = values.getOrNull(i) as? Number ?: return 0f
    val f = v.toFloat()
    return if (f.isFinite()) f else 0f
  }

  fun text(i: Int): String = values.getOrNull(i) as? String ?: ""
}

data class WatchBuddy(val parts: List<ShapePart>, val behind: List<ShapePart>, val front: List<ShapePart>) {
  val all: List<ShapePart> get() = behind + parts + front
}

data class WatchCards(
  val items: List<WatchCard>,
  val didLabel: String,
  val nopeLabel: String,
  val clearLabel: String,
  val emptyLabel: String,
  val leftLabel: String,
  val allDoneLabel: String,
  val notYetLabel: String,
  val countLabel: String,
  val openPhoneLabel: String,
  val colors: JSONObject?,
  val buddy: WatchBuddy?,
  val streak: Int,
  val streakLabel: String,
  val streakOneLabel: String,
  val cheer: List<String>,
  // Today's counted questions with no card on the watch: done (Did or late)
  // and later (still to come, Did wes included). null from an older phone
  // build, which counts every card and every answer the old way.
  val offDone: Int? = null,
  val offLater: Int = 0,
  // Did we cards that wait on the phone (they open the app), and the phone's
  // "{n} waiting on your phone". 0 and empty from an older phone build.
  val phoneWaiting: Int = 0,
  val phoneWaitingLabel: String = "",
) {
  val openCards: List<WatchCard> get() = items.filter { it.status == "open" }
  val answered: Int get() = items.count { it.status != "open" }
  // "2 of 4" and the ring: Today's meter when the phone sends it.
  private val counted: List<WatchCard> get() = if (offDone == null) items else items.filter { it.counted }
  val countTotal: Int get() = counted.size + (offDone ?: 0) + offLater
  val countDone: Int get() =
    if (offDone == null) answered else counted.count { it.status == "did" } + offDone
  val palette: Palette get() = Palette(colors)
  // From a past night: the newest card's dateIso is before yesterday on the
  // watch's calendar. Tonight (boardDate) is always today or, before the day
  // fold, yesterday, so this never hides tonight's cards.
  val stale: Boolean get() {
    val newest = items.maxOfOrNull { it.dateIso } ?: return false
    if (newest.length != 10) return false
    return newest < LocalDate.now().minusDays(1).toString()
  }

  companion object {
    fun parse(raw: String?): WatchCards? {
      if (raw.isNullOrEmpty()) return null
      return try {
        val o = JSONObject(raw)
        val list = o.optJSONArray("items") ?: JSONArray()
        val items = (0 until list.length()).mapNotNull { i ->
          val it = list.optJSONObject(i) ?: return@mapNotNull null
          WatchCard(
            id = it.optString("id"),
            night = it.optString("night"),
            dateIso = it.optString("dateIso"),
            question = it.optString("question"),
            tag = it.optString("tag"),
            status = it.optString("status", "open"),
            counted = it.optBoolean("counted", true),
          )
        }.filter { it.id.isNotEmpty() }
        WatchCards(
          items = items,
          didLabel = o.optString("didLabel"),
          nopeLabel = o.optString("nopeLabel"),
          clearLabel = o.optString("clearLabel"),
          emptyLabel = o.optString("emptyLabel"),
          leftLabel = o.optString("leftLabel"),
          allDoneLabel = o.optString("allDoneLabel"),
          notYetLabel = o.optString("notYetLabel"),
          countLabel = o.optString("countLabel"),
          openPhoneLabel = o.optString("openPhoneLabel"),
          colors = o.optJSONObject("colors"),
          buddy = o.optJSONObject("buddy")?.let { b ->
            val parts = parts(b.optJSONArray("parts"))
            if (parts.isEmpty()) null else WatchBuddy(parts, parts(b.optJSONArray("behind")), parts(b.optJSONArray("front")))
          },
          streak = o.optInt("streak", 0),
          offDone = if (o.has("done")) o.optInt("done", 0).coerceAtLeast(0) else null,
          offLater = o.optInt("later", 0).coerceAtLeast(0),
          phoneWaiting = o.optInt("phoneWaiting", 0).coerceAtLeast(0),
          phoneWaitingLabel = o.optString("phoneWaitingLabel"),
          streakLabel = o.optString("streakLabel"),
          streakOneLabel = o.optString("streakOneLabel"),
          cheer = o.optJSONArray("cheer")?.let { a -> (0 until a.length()).map { a.optString(it) } } ?: emptyList(),
        )
      } catch (e: Exception) {
        null
      }
    }

    private fun parts(a: JSONArray?): List<ShapePart> {
      if (a == null) return emptyList()
      return (0 until a.length()).mapNotNull { i ->
        val p = a.optJSONArray(i) ?: return@mapNotNull null
        val values = (0 until p.length()).map { j ->
          when (val v = p.opt(j)) {
            is Number, is String -> v
            else -> 0
          }
        }
        ShapePart(values).takeIf { it.kind.isNotEmpty() }
      }
    }
  }
}

// "{n} left" from the phone, with the numbers put in. null when empty.
fun fill(template: String, vararg vars: Pair<String, Int>): String? {
  if (template.isEmpty()) return null
  var text = template
  for ((key, value) in vars) text = text.replace("{$key}", value.toString())
  return text
}

fun String.orNull(): String? = ifEmpty { null }

// "#rrggbb", "#rgb", "#rrggbbaa" or "transparent". null when it is none of those.
fun hexColor(raw: String?): Color? {
  val s = raw?.trim()?.lowercase() ?: return null
  if (s == "transparent") return Color.Transparent
  if (!s.startsWith("#")) return null
  var h = s.drop(1)
  if (h.length == 3) h = h.map { "$it$it" }.joinToString("")
  if (h.length != 6 && h.length != 8) return null
  val v = h.toLongOrNull(16) ?: return null
  val rgb = if (h.length == 8) v shr 8 else v
  val alpha = if (h.length == 8) (v and 0xff).toFloat() / 255f else 1f
  return Color(
    red = ((rgb shr 16) and 0xff).toInt(),
    green = ((rgb shr 8) and 0xff).toInt(),
    blue = (rgb and 0xff).toInt(),
  ).copy(alpha = alpha)
}

// The app's lime dark palette when the phone sent no colours.
class Palette(private val c: JSONObject?) {
  private fun pick(key: String, fallback: Long) = hexColor(c?.optString(key)) ?: Color(fallback)
  val accent = pick("accent", 0xFFC9F24D)
  val ink = pick("ink", 0xFFF4F6FA)
  val soft = pick("soft", 0xFF99A1B0)
  val card = pick("card", 0xFF16191F)
  val card2 = pick("card2", 0xFF1D212A)
  val line = pick("line", 0xFF2B3140)
  val bg = pick("bg", 0xFF000000)
}
