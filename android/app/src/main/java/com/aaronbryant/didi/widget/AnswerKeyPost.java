package com.aaronbryant.didi.widget;

import android.content.Context;

import com.facebook.react.ReactApplication;
import com.facebook.react.ReactHost;
import com.facebook.react.bridge.ReactContext;
import com.facebook.react.modules.core.DeviceEventManagerModule;

import org.json.JSONObject;

import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.Locale;
import java.util.TimeZone;

/**
 * A widget or watch tap, sent straight to the account with this phone's
 * answer key (supabase/answer-keys.sql) when no JavaScript is running. The
 * tap is already saved on the phone (WidgetTapStore); this only lets other
 * devices see it before the app syncs. A miss is left for that sync.
 *
 * Skipped while JS runs: the app sends the tap itself, and it must apply the
 * tap (and pay its coins) before its own row could come back from the account.
 */
public final class AnswerKeyPost {
    private AnswerKeyPost() {}

    public static void sendLater(Context context, String lampId, String kind, String night, long atMs) {
        if (lampId == null || lampId.isEmpty() || night == null || night.isEmpty()) return;
        if (!"did".equals(kind) && !"nope".equals(kind)) return;
        Context app = context.getApplicationContext();
        if (jsRunning(app)) return;
        long at = atMs > 0 ? atMs : System.currentTimeMillis();
        new Thread(() -> send(app, lampId, kind, night, at), "didi-answer-key").start();
    }

    static void send(Context context, String lampId, String kind, String night, long atMs) {
        HttpURLConnection conn = null;
        try {
            String raw = AnswerKeyStore.read(context);
            if (raw == null) return;
            JSONObject saved = new JSONObject(raw);
            String key = saved.optString("key");
            String base = saved.optString("url");
            String anon = saved.optString("anon");
            if (key.isEmpty() || !base.startsWith("https://") || anon.isEmpty()) return;
            SimpleDateFormat iso = new SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US);
            iso.setTimeZone(TimeZone.getTimeZone("UTC"));
            JSONObject body = new JSONObject()
                .put("key", key)
                .put("lamp", lampId)
                .put("night", night)
                .put("kind", kind)
                .put("at", iso.format(new Date(atMs)));
            conn = (HttpURLConnection) new URL(base + "/rest/v1/rpc/key_answer").openConnection();
            conn.setConnectTimeout(4000);
            conn.setReadTimeout(4000);
            conn.setRequestMethod("POST");
            conn.setDoOutput(true);
            conn.setRequestProperty("Content-Type", "application/json");
            conn.setRequestProperty("apikey", anon);
            conn.setRequestProperty("Authorization", "Bearer " + anon);
            try (OutputStream out = conn.getOutputStream()) {
                out.write(body.toString().getBytes(StandardCharsets.UTF_8));
            }
            conn.getResponseCode();
        } catch (Exception ignored) {
            // Left for the app's own sync.
        } finally {
            if (conn != null) conn.disconnect();
        }
    }

    static boolean jsRunning(Context context) {
        try {
            ReactHost host = ((ReactApplication) context.getApplicationContext()).getReactHost();
            ReactContext react = host == null ? null : host.getCurrentReactContext();
            return react != null && react.hasActiveReactInstance();
        } catch (Exception error) {
            return false;
        }
    }

    /** Sends a JS event when JS is running. */
    static boolean tellJs(Context context, String event) {
        try {
            ReactHost host = ((ReactApplication) context.getApplicationContext()).getReactHost();
            ReactContext react = host == null ? null : host.getCurrentReactContext();
            if (react == null || !react.hasActiveReactInstance()) return false;
            react.getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter.class).emit(event, null);
            return true;
        } catch (Exception error) {
            return false;
        }
    }
}
