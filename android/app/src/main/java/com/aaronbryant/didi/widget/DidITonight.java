package com.aaronbryant.didi.widget;

import android.content.Context;
import android.content.Intent;

import com.reactnativeandroidwidget.RNWidgetProvider;

public class DidITonight extends RNWidgetProvider {
    @Override
    public void onReceive(Context context, Intent intent) {
        // Answer clicks are addressed here by the widget library. The receiver
        // commits the row, advances the card, and starts the widget task.
        if (WidgetTapReceiver.deliver(context, intent)) return;
        super.onReceive(context, intent);
    }
}
