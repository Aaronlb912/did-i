package com.aaronbryant.didi.wear

import com.google.android.gms.wearable.DataEvent
import com.google.android.gms.wearable.DataEventBuffer
import com.google.android.gms.wearable.DataMapItem
import com.google.android.gms.wearable.WearableListenerService

// New cards from the phone, also when the watch app is closed.
class CardsListenerService : WearableListenerService() {
  override fun onDataChanged(events: DataEventBuffer) {
    for (event in events) {
      if (event.type != DataEvent.TYPE_CHANGED) continue
      if (event.dataItem.uri.path != CardStore.CARDS_PATH) continue
      val raw = DataMapItem.fromDataItem(event.dataItem).dataMap.getString("cards") ?: continue
      CardStore.receive(this, raw)
    }
  }
}
