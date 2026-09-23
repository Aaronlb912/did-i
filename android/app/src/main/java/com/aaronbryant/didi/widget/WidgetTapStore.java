package com.aaronbryant.didi.widget;

import android.content.Context;
import android.content.SharedPreferences;

import org.json.JSONException;
import org.json.JSONObject;

/**
 * One pending Tonight tap. commit() returns only after the row is on disk.
 * The widget task and the next app open both take it; the lock keeps one of them.
 */
public final class WidgetTapStore {
    public static final String PREFS = "did-i-widget-tap";
    static final String KEY = "pending";
    private static final int MAX = 160;

    private WidgetTapStore() {}

    public static synchronized boolean commit(Context context, String lampId, String kind, String night) {
        String lamp = clip(lampId);
        String mark = "did".equals(kind) || "nope".equals(kind) ? kind : "";
        if (lamp.isEmpty() || mark.isEmpty()) return false;
        String storedNight = clip(night);
        try {
            String current = prefs(context).getString(KEY, "");
            if (current != null && !current.isEmpty()) {
                JSONObject existing = new JSONObject(current);
                if (lamp.equals(existing.optString("lampId")) && storedNight.equals(clip(existing.optString("night")))) {
                    return true;
                }
            }
            JSONObject row = new JSONObject();
            row.put("lampId", lamp);
            row.put("kind", mark);
            row.put("night", storedNight);
            return prefs(context).edit().putString(KEY, row.toString()).commit();
        } catch (JSONException error) {
            return false;
        }
    }

    public static synchronized String peek(Context context) {
        String raw = prefs(context).getString(KEY, "");
        return raw == null ? "" : raw;
    }

    public static synchronized String take(Context context) {
        SharedPreferences prefs = prefs(context);
        String raw = prefs.getString(KEY, "");
        if (raw == null || raw.isEmpty()) return "";
        if (!prefs.edit().remove(KEY).commit()) return "";
        return raw;
    }

    public static synchronized boolean restore(Context context, String raw) {
        if (raw == null || raw.isEmpty()) return false;
        SharedPreferences prefs = prefs(context);
        String current = prefs.getString(KEY, "");
        if (current != null && !current.isEmpty()) return false;
        return prefs.edit().putString(KEY, raw).commit();
    }

    private static SharedPreferences prefs(Context context) {
        return context.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
    }

    static String clip(String value) {
        if (value == null) return "";
        String next = value.trim();
        if (next.length() > MAX) return "";
        return next;
    }
}
