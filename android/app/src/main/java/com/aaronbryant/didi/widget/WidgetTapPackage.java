package com.aaronbryant.didi.widget;

import androidx.annotation.Nullable;

import com.aaronbryant.didi.watch.WatchModule;
import com.facebook.react.BaseReactPackage;
import com.facebook.react.bridge.NativeModule;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.module.model.ReactModuleInfo;
import com.facebook.react.module.model.ReactModuleInfoProvider;

import java.util.HashMap;
import java.util.Map;

public class WidgetTapPackage extends BaseReactPackage {
    @Nullable
    @Override
    public NativeModule getModule(String name, ReactApplicationContext reactContext) {
        if (WidgetTapModule.NAME.equals(name)) return new WidgetTapModule(reactContext);
        if (WatchModule.NAME.equals(name)) return new WatchModule(reactContext);
        return null;
    }

    @Override
    public ReactModuleInfoProvider getReactModuleInfoProvider() {
        return () -> {
            Map<String, ReactModuleInfo> info = new HashMap<>();
            info.put(
                WidgetTapModule.NAME,
                new ReactModuleInfo(
                    WidgetTapModule.NAME,
                    WidgetTapModule.NAME,
                    false,
                    false,
                    false,
                    false
                )
            );
            info.put(
                WatchModule.NAME,
                new ReactModuleInfo(WatchModule.NAME, WatchModule.NAME, false, false, false, false)
            );
            return info;
        };
    }
}
