package com.aaronbryant.didi.widget;

import android.content.Context;

import com.google.firebase.messaging.RemoteMessage;
import com.reactnativeandroidwidget.RNWidgetJsCommunication;

import expo.modules.notifications.service.ExpoFirebaseMessagingService;

/**
 * Firebase messages for the app. A silent wake (data "wake", from
 * supabase/wake-push.sql) means an answer changed elsewhere: JS pulls and
 * redraws the widget and the watch. Everything else goes to expo-notifications
 * as before. Registered in AndroidManifest.xml in place of Expo's service.
 */
public class WakeMessagingService extends ExpoFirebaseMessagingService {
    public static final String WAKE_EVENT = "didiWake";
    private static final String PREFS = "didi-wake";

    @Override
    public void onMessageReceived(RemoteMessage message) {
        if (!"1".equals(message.getData().get("wake"))) {
            super.onMessageReceived(message);
            return;
        }
        // The app is running: it pulls now.
        if (AnswerKeyPost.tellJs(this, WAKE_EVENT)) return;
        // Not running: the widget task pulls first (takeWake), then redraws
        // the widget and sends the watch its cards.
        getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit().putLong("at", System.currentTimeMillis()).commit();
        try {
            RNWidgetJsCommunication.requestWidgetUpdate(this, WidgetTapReceiver.WIDGET);
        } catch (Exception ignored) {
            // The next app open pulls anyway.
        }
    }

    /** True once per wake that came in while JS was not running (in the last hour). */
    static synchronized boolean take(Context context) {
        android.content.SharedPreferences prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
        long at = prefs.getLong("at", 0L);
        if (at == 0L) return false;
        prefs.edit().remove("at").commit();
        return System.currentTimeMillis() - at < 3600_000L;
    }
}
