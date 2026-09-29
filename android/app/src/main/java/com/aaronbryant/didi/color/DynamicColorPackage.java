package com.aaronbryant.didi.color;

import androidx.annotation.Nullable;

import com.facebook.react.BaseReactPackage;
import com.facebook.react.bridge.NativeModule;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.module.model.ReactModuleInfo;
import com.facebook.react.module.model.ReactModuleInfoProvider;

import java.util.HashMap;
import java.util.Map;

public class DynamicColorPackage extends BaseReactPackage {
    @Nullable
    @Override
    public NativeModule getModule(String name, ReactApplicationContext reactContext) {
        if (DynamicColorModule.NAME.equals(name)) return new DynamicColorModule(reactContext);
        return null;
    }

    @Override
    public ReactModuleInfoProvider getReactModuleInfoProvider() {
        return () -> {
            Map<String, ReactModuleInfo> info = new HashMap<>();
            info.put(
                DynamicColorModule.NAME,
                new ReactModuleInfo(
                    DynamicColorModule.NAME,
                    DynamicColorModule.NAME,
                    false,
                    false,
                    false,
                    false
                )
            );
            return info;
        };
    }
}
