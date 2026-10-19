package com.aaronbryant.didi.watch;

import android.content.Context;
import android.net.Uri;

import com.aaronbryant.didi.widget.AnswerKeyPost;
import com.aaronbryant.didi.widget.WidgetCardStore;
import com.aaronbryant.didi.widget.WidgetTapStore;
import com.facebook.react.ReactApplication;
import com.facebook.react.ReactHost;
import com.facebook.react.bridge.ReactContext;
import com.facebook.react.modules.core.DeviceEventManagerModule;
import com.google.android.gms.wearable.DataEvent;
import com.google.android.gms.wearable.DataEventBuffer;
import com.google.android.gms.wearable.DataMapItem;
import com.google.android.gms.wearable.MessageEvent;
import com.google.android.gms.wearable.Wearable;
import com.google.android.gms.wearable.WearableListenerService;
import com.reactnativeandroidwidget.RNWidgetJsCommunication;

import org.json.JSONObject;

import java.nio.charset.StandardCharsets;

/**
 * Did or Not yet from the watch. Saved the same way as a home screen widget
 * tap (WidgetTapReceiver): the row is on disk before any JavaScript runs, so
 * it counts even with the phone app closed. Then JS takes the queue: at once
 * when the app is running (onWatchTap), else the widget's headless task, else
 * the next app open.
 *
 * A message arrives when the watch is in reach; otherwise the watch puts a
 * data item under /didi/tap/ that the Data Layer delivers later. Both land here.
 */
public class WatchTapService extends WearableListenerService {
    static final String TAP_PATH = "/didi/tap";
    private static final int MAX_TAP = 2000;

    @Override
    public void onMessageReceived(MessageEvent event) {
        if (!TAP_PATH.equals(event.getPath())) return;
        byte[] data = event.getData();
        if (data == null || data.length > MAX_TAP) return;
        save(this, new String(data, StandardCharsets.UTF_8));
    }

    @Override
    public void onDataChanged(DataEventBuffer events) {
        for (DataEvent event : events) {
            if (event.getType() != DataEvent.TYPE_CHANGED) continue;
            Uri uri = event.getDataItem().getUri();
            String path = uri.getPath();
            if (path == null || !path.startsWith(TAP_PATH + "/")) continue;
            String raw = DataMapItem.fromDataItem(event.getDataItem()).getDataMap().getString("tap", "");
            if (raw.length() <= MAX_TAP) save(this, raw);
            // Taken: drop it so it is not delivered again.
            Wearable.getDataClient(this).deleteDataItems(uri);
        }
    }

    static void save(Context context, String raw) {
        String id;
        String answer;
        String night;
        long at;
        try {
            JSONObject tap = new JSONObject(raw);
            id = tap.optString("id").trim();
            answer = tap.optString("answer").trim();
            night = tap.optString("night").trim();
            // When it was tapped on the watch; a late delivery keeps that time.
            at = tap.optLong("at", 0L);
        } catch (Exception error) {
            return;
        }
        if (!"did".equals(answer) && !"nope".equals(answer)) return;
        if (WidgetTapStore.commit(context, id, answer, night, at) != WidgetTapStore.WROTE) return;
        AnswerKeyPost.sendLater(context, id, answer, night, at);
        try {
            WidgetCardStore.advance(context, id, answer, night);
        } catch (Exception ignored) {
            // The row is on disk. JS redraws the widget.
        }
        if (tellJs(context)) return;
        try {
            RNWidgetJsCommunication.requestWidgetUpdate(context, "DidITonight");
        } catch (Exception ignored) {
            // The row is on disk. The next app open applies it.
        }
    }

    private static boolean tellJs(Context context) {
        try {
            ReactHost host = ((ReactApplication) context.getApplicationContext()).getReactHost();
            ReactContext react = host == null ? null : host.getCurrentReactContext();
            if (react == null || !react.hasActiveReactInstance()) return false;
            react.getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter.class)
                .emit(WatchModule.TAP_EVENT, null);
            return true;
        } catch (Exception error) {
            return false;
        }
    }
}
