package com.aaronbryant.didi.widget;

import android.app.AlarmManager;
import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.provider.Settings;

import androidx.annotation.NonNull;

import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.ReadableArray;

public class WidgetTapModule extends ReactContextBaseJavaModule {
    public static final String NAME = "WidgetTap";

    public WidgetTapModule(ReactApplicationContext context) {
        super(context);
    }

    @NonNull
    @Override
    public String getName() {
        return NAME;
    }

    @ReactMethod
    public void takePending(Promise promise) {
        promise.resolve(WidgetTapStore.take(getReactApplicationContext()));
    }

    @ReactMethod
    public void restorePending(String raw, Promise promise) {
        promise.resolve(WidgetTapStore.restore(getReactApplicationContext(), raw));
    }

    @ReactMethod
    public void saveCard(String raw, Promise promise) {
        promise.resolve(WidgetCardStore.save(getReactApplicationContext(), raw));
    }

    @ReactMethod
    public void cardStamp(Promise promise) {
        promise.resolve(WidgetCardStore.stamp(getReactApplicationContext()));
    }

    @ReactMethod
    public void armAskTimes(ReadableArray times, Promise promise) {
        double[] list = new double[times.size()];
        for (int i = 0; i < list.length; i++) list[i] = times.getDouble(i);
        WidgetAlarms.arm(getReactApplicationContext(), list);
        promise.resolve(true);
    }

    // Android 12+ only lets an app fire on the minute with Alarms & reminders on.
    @ReactMethod
    public void canExactAlarms(Promise promise) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.S) {
            promise.resolve(true);
            return;
        }
        AlarmManager alarms = (AlarmManager) getReactApplicationContext().getSystemService(Context.ALARM_SERVICE);
        promise.resolve(alarms != null && alarms.canScheduleExactAlarms());
    }

    @ReactMethod
    public void openExactAlarmSettings(Promise promise) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.S) {
            promise.resolve(false);
            return;
        }
        try {
            Intent intent = new Intent(Settings.ACTION_REQUEST_SCHEDULE_EXACT_ALARM)
                .setData(Uri.parse("package:" + getReactApplicationContext().getPackageName()))
                .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            getReactApplicationContext().startActivity(intent);
            promise.resolve(true);
        } catch (Exception error) {
            promise.resolve(false);
        }
    }

    @ReactMethod
    public void loadCard(Promise promise) {
        promise.resolve(WidgetCardStore.load(getReactApplicationContext()));
    }
}
