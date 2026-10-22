package com.aaronbryant.didi.widget;

import android.content.Context;
import android.content.SharedPreferences;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

/**
 * Tonight taps made before JS runs, oldest first. commit() returns only after
 * the queue is on disk. The widget task and the next app open both take it;
 * the lock keeps one of them. A second tap for the same lamp and night keeps
 * the first mark, except a Did after a Not yet replaces it.
 */
public final class WidgetTapStore {
    public static final String PREFS = "did-i-widget-tap";
    static final String KEY = "pending";
    private static final int MAX = 160;
    // A card holds far fewer questions than this. It only stops a runaway queue.
    private static final int MAX_ROWS = 40;

    /** commit() results: not saved, an earlier mark was kept, or this tap was saved. */
    public static final int FAILED = 0;
    public static final int KEPT = 1;
    public static final int WROTE = 2;

    private WidgetTapStore() {}

    public static synchronized int commit(Context context, String lampId, String kind, String night) {
        return commit(context, lampId, kind, night, 0L);
    }

    // at: when the tap happened (ms), for taps that arrive late (a watch
    // reconnecting). 0 or a future time means now.
    public static synchronized int commit(Context context, String lampId, String kind, String night, long at) {
        long now = System.currentTimeMillis();
        long tappedAt = at > 0 && at <= now ? at : now;
        String lamp = clip(lampId);
        String mark = "did".equals(kind) || "nope".equals(kind) ? kind : "";
        if (lamp.isEmpty() || mark.isEmpty()) return FAILED;
        String storedNight = clip(night);
        try {
            JSONArray rows = rows(prefs(context).getString(KEY, ""));
            for (int i = 0; i < rows.length(); i++) {
                JSONObject existing = rows.optJSONObject(i);
                if (existing == null) continue;
                if (lamp.equals(existing.optString("lampId")) && storedNight.equals(clip(existing.optString("night")))) {
                    // Did after Not yet wins; anything else keeps the first mark.
                    if (!"did".equals(mark) || !"nope".equals(existing.optString("kind"))) return KEPT;
                    existing.put("kind", mark);
                    existing.put("at", tappedAt);
                    if (at > 0) existing.put("sent", at); else existing.remove("sent");
                    return prefs(context).edit().putString(KEY, rows.toString()).commit() ? WROTE : FAILED;
                }
            }
            // Full: drop the oldest so the newest tap still counts.
            while (rows.length() >= MAX_ROWS) rows.remove(0);
            JSONObject row = new JSONObject();
            row.put("lampId", lamp);
            row.put("kind", mark);
            row.put("night", storedNight);
            // When it was tapped, so JS can drop a tap on a card whose night already turned.
            row.put("at", tappedAt);
            // The watch's own time, so the taken list it gets back matches its tap.
            if (at > 0) row.put("sent", at);
            rows.put(row);
            return prefs(context).edit().putString(KEY, rows.toString()).commit() ? WROTE : FAILED;
        } catch (JSONException error) {
            return FAILED;
        }
    }

    /** Every queued row as a JSON array string, or "" when none. */
    public static synchronized String peek(Context context) {
        JSONArray rows = rows(prefs(context).getString(KEY, ""));
        return rows.length() == 0 ? "" : rows.toString();
    }

    public static synchronized String take(Context context) {
        SharedPreferences prefs = prefs(context);
        JSONArray rows = rows(prefs.getString(KEY, ""));
        if (rows.length() == 0) return "";
        if (!prefs.edit().remove(KEY).commit()) return "";
        return rows.toString();
    }

    /** Puts rows JS could not apply back in front of any taps made since. */
    public static synchronized boolean restore(Context context, String raw) {
        JSONArray back = rows(raw);
        if (back.length() == 0) return false;
        SharedPreferences prefs = prefs(context);
        JSONArray later = rows(prefs.getString(KEY, ""));
        for (int i = 0; i < later.length() && back.length() < MAX_ROWS; i++) {
            JSONObject row = later.optJSONObject(i);
            if (row != null) back.put(row);
        }
        return prefs.edit().putString(KEY, back.toString()).commit();
    }

    // Builds before the queue stored one object. Read that as a queue of one.
    static JSONArray rows(String raw) {
        if (raw == null) return new JSONArray();
        String text = raw.trim();
        if (text.isEmpty()) return new JSONArray();
        try {
            if (text.startsWith("[")) return new JSONArray(text);
            JSONArray one = new JSONArray();
            one.put(new JSONObject(text));
            return one;
        } catch (JSONException error) {
            return new JSONArray();
        }
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
