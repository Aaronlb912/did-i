package com.aaronbryant.didi.color;

import android.content.res.Resources;
import android.os.Build;

import androidx.annotation.NonNull;
import androidx.core.content.ContextCompat;

import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.WritableMap;
import com.facebook.react.bridge.Arguments;

// Android 12's Material You tonal palette (android.R.color.system_*), read
// as plain color ints. JS assembles these into a look, the way every other
// look is assembled in native/palette.js -- this module only hands over the
// raw wallpaper-derived swatches, it does not know what a "look" is.
public class DynamicColorModule extends ReactContextBaseJavaModule {
    public static final String NAME = "DynamicColor";

    public DynamicColorModule(ReactApplicationContext context) {
        super(context);
    }

    @NonNull
    @Override
    public String getName() {
        return NAME;
    }

    @ReactMethod
    public void getPalette(Promise promise) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.S) {
            promise.resolve(null);
            return;
        }
        try {
            WritableMap map = Arguments.createMap();
            put(map, "accent1_100", android.R.color.system_accent1_100);
            put(map, "accent1_200", android.R.color.system_accent1_200);
            put(map, "accent1_600", android.R.color.system_accent1_600);
            put(map, "accent1_700", android.R.color.system_accent1_700);
            put(map, "accent1_800", android.R.color.system_accent1_800);
            put(map, "neutral1_50", android.R.color.system_neutral1_50);
            put(map, "neutral1_100", android.R.color.system_neutral1_100);
            put(map, "neutral1_200", android.R.color.system_neutral1_200);
            put(map, "neutral1_700", android.R.color.system_neutral1_700);
            put(map, "neutral1_800", android.R.color.system_neutral1_800);
            put(map, "neutral1_900", android.R.color.system_neutral1_900);
            put(map, "neutral2_500", android.R.color.system_neutral2_500);
            promise.resolve(map);
        } catch (Resources.NotFoundException e) {
            // A device that reports S+ but is missing the resource (some OEM skins).
            promise.resolve(null);
        }
    }

    private void put(WritableMap map, String key, int colorRes) {
        int color = ContextCompat.getColor(getReactApplicationContext(), colorRes);
        map.putString(key, String.format("#%06X", 0xFFFFFF & color));
    }
}
