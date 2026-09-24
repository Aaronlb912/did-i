package com.aaronbryant.didi.widget;

import androidx.annotation.NonNull;

import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;

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
    public void loadCard(Promise promise) {
        promise.resolve(WidgetCardStore.load(getReactApplicationContext()));
    }
}
