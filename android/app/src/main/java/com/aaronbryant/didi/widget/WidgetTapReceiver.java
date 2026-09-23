package com.aaronbryant.didi.widget;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.os.Bundle;

import com.reactnativeandroidwidget.RNWidgetJsCommunication;

/**
 * Did and Did not land here before any JavaScript. The library's click
 * pending intent is addressed to {@link DidITonight}; that provider calls
 * {@link #deliver} on this receiver, which commits the row, advances the
 * card from the last snapshot, and then starts the same widget headless task.
 */
public class WidgetTapReceiver extends BroadcastReceiver {
    public static final String ACTION = "com.aaronbryant.didi.WIDGET_TAP";
    static final String WIDGET = "DidITonight";

    @Override
    public void onReceive(Context context, Intent intent) {
        deliver(context, intent);
    }

    /** @return true when the tap was committed and the widget task was started */
    public static boolean deliver(Context context, Intent intent) {
        if (!isAnswerTap(intent)) return false;
        Bundle data = intent.getBundleExtra("clickActionData");
        String lampId = text(data, "lampId");
        String kind = text(data, "kind");
        String night = text(data, "night");
        if (!WidgetTapStore.commit(context, lampId, kind, night)) return false;
        try {
            WidgetCardStore.advance(context, lampId, kind, night);
        } catch (Exception ignored) {
            // The row is on disk. The headless task still redraws the card.
        }
        try {
            RNWidgetJsCommunication.requestWidgetUpdate(context, WIDGET);
        } catch (Exception ignored) {
            // The row is already on disk. The next app open applies it.
        }
        return true;
    }

    static boolean isAnswerTap(Intent intent) {
        if (intent == null) return false;
        if (!"ANSWER".equals(intent.getStringExtra("clickAction"))) return false;
        Bundle data = intent.getBundleExtra("clickActionData");
        String kind = text(data, "kind");
        return "did".equals(kind) || "nope".equals(kind);
    }

    private static String text(Bundle data, String key) {
        if (data == null || !data.containsKey(key)) return "";
        Object value = data.get(key);
        if (value == null) return "";
        return String.valueOf(value).trim();
    }
}
