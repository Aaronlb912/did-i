package com.aaronbryant.didi.widget;

import android.app.AlarmManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Build;

// Redraws the widget at each ask time still to come tonight, so a question
// shows up when its time comes even with the app closed. The 30-minute
// refresh in widgetprovider_diditonight.xml is the backup if one is dropped.
public final class WidgetAlarms {
    public static final String ACTION = "com.aaronbryant.didi.WIDGET_ASK_TIME";
    private static final String PREFS = "did_i_widget_alarms";
    private static final String COUNT = "count";
    private static final int CAP = 12;

    private WidgetAlarms() {}

    public static void arm(Context context, double[] times) {
        AlarmManager alarms = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
        if (alarms == null) return;
        SharedPreferences prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
        int before = prefs.getInt(COUNT, 0);
        for (int i = 0; i < before; i++) alarms.cancel(pending(context, i));
        long now = System.currentTimeMillis();
        int count = 0;
        for (double time : times) {
            long at = (long) time;
            if (at <= now || count >= CAP) continue;
            PendingIntent intent = pending(context, count);
            boolean exact = Build.VERSION.SDK_INT < Build.VERSION_CODES.S || alarms.canScheduleExactAlarms();
            try {
                if (exact) alarms.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, at, intent);
                else alarms.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, at, intent);
            } catch (SecurityException denied) {
                // Exact access was turned off between the check and the call.
                alarms.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, at, intent);
            }
            count++;
        }
        prefs.edit().putInt(COUNT, count).apply();
    }

    private static PendingIntent pending(Context context, int slot) {
        Intent intent = new Intent(context, DidITonight.class).setAction(ACTION);
        return PendingIntent.getBroadcast(
            context,
            slot,
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );
    }
}
