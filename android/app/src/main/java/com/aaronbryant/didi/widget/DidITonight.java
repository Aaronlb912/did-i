package com.aaronbryant.didi.widget;

import android.appwidget.AppWidgetManager;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;

import com.reactnativeandroidwidget.RNWidgetProvider;

public class DidITonight extends RNWidgetProvider {
    @Override
    public void onReceive(Context context, Intent intent) {
        // Answer clicks are addressed here by the widget library. The receiver
        // commits the row, advances the card, and starts the widget task.
        if (WidgetTapReceiver.deliver(context, intent)) return;
        // An ask time came round, or a reboot / clock change cleared the
        // alarms: redraw like a normal update (the task arms them again).
        String action = intent.getAction();
        if (WidgetAlarms.ACTION.equals(action)
                || Intent.ACTION_BOOT_COMPLETED.equals(action)
                || Intent.ACTION_TIME_CHANGED.equals(action)
                || Intent.ACTION_TIMEZONE_CHANGED.equals(action)
                || Intent.ACTION_MY_PACKAGE_REPLACED.equals(action)) {
            AppWidgetManager manager = AppWidgetManager.getInstance(context);
            int[] ids = manager.getAppWidgetIds(new ComponentName(context, DidITonight.class));
            if (ids.length > 0) onUpdate(context, manager, ids);
            return;
        }
        super.onReceive(context, intent);
    }
}
