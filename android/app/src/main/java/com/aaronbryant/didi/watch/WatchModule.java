package com.aaronbryant.didi.watch;

import androidx.annotation.NonNull;

import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.google.android.gms.wearable.PutDataMapRequest;
import com.google.android.gms.wearable.PutDataRequest;
import com.google.android.gms.wearable.Wearable;

/**
 * Sends tonight's cards (native/watch-sync.js) to the Wear OS app on the
 * Data Layer. The item stays put, so a watch that connects later still gets
 * the last cards. No watch, or no Play services: the put fails quietly.
 */
public class WatchModule extends ReactContextBaseJavaModule {
    public static final String NAME = "DidIWatch";
    public static final String CARDS_PATH = "/didi/cards";
    public static final String TAP_EVENT = "onWatchTap";
    private static final int MAX_JSON = 90000;

    public WatchModule(ReactApplicationContext context) {
        super(context);
    }

    @NonNull
    @Override
    public String getName() {
        return NAME;
    }

    @ReactMethod
    public void sendCards(String json) {
        if (json == null || json.isEmpty() || json.length() > MAX_JSON) return;
        try {
            PutDataMapRequest map = PutDataMapRequest.create(CARDS_PATH);
            map.getDataMap().putString("cards", json);
            PutDataRequest request = map.asPutDataRequest().setUrgent();
            Wearable.getDataClient(getReactApplicationContext()).putDataItem(request);
        } catch (Exception ignored) {
            // No watch is fine.
        }
    }

    // Needed by NativeEventEmitter; the service emits onWatchTap itself.
    @ReactMethod
    public void addListener(String eventName) {}

    @ReactMethod
    public void removeListeners(double count) {}
}
