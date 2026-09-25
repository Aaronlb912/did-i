package com.aaronbryant.didi.widget;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.res.ColorStateList;
import android.os.Build;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.util.TypedValue;
import android.view.View;
import android.widget.RemoteViews;

import com.aaronbryant.didi.R;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import java.util.Locale;

/**
 * The last Tonight snapshot, so a tap can show the next question before JS.
 * Same steps as advanceTonightCard in src/lib/widget-tonight.js.
 */
public final class WidgetCardStore {
    static final String PREFS = "did-i-widget-card";
    static final String PROPS = "props";
    static final String STAMP = "stamp";
    private static final int MAX_JSON = 200000;

    private WidgetCardStore() {}

    public static synchronized boolean save(Context context, String raw) {
        if (raw == null || raw.isEmpty() || raw.length() > MAX_JSON) return false;
        try {
            JSONObject incoming = new JSONObject(raw);
            if (pendingStillOpen(context, incoming)) return false;
            keepColors(context, incoming);
            return prefs(context).edit().putString(PROPS, incoming.toString()).commit();
        } catch (JSONException error) {
            return false;
        }
    }

    public static synchronized String stamp(Context context) {
        return String.valueOf(prefs(context).getLong(STAMP, 0));
    }

    public static synchronized String load(Context context) {
        String raw = prefs(context).getString(PROPS, "");
        return raw == null ? "" : raw;
    }

    /** @return true when the card moved to the next question or the empty line */
    public static synchronized boolean advance(Context context, String lampId, String kind, String night) {
        String raw = prefs(context).getString(PROPS, "");
        if (raw == null || raw.isEmpty()) return false;
        try {
            JSONObject next = step(new JSONObject(raw), lampId, kind, night);
            if (next == null) return false;
            next.put("updatedAt", System.currentTimeMillis());
            SharedPreferences.Editor editor = prefs(context).edit();
            editor.putString(PROPS, next.toString());
            editor.putLong(STAMP, prefs(context).getLong(STAMP, 0) + 1);
            if (!editor.commit()) return false;
            paintIfJsIsSlow(context.getApplicationContext(), next.optLong("updatedAt"));
            return true;
        } catch (JSONException error) {
            return false;
        }
    }

    // The native layout is plainer than the JS card (no buddy, no Next), so
    // painting it right away flashes a different look before JS redraws a
    // moment later. Wait briefly and paint only if JS has not saved a newer
    // card by then (a cold start, where JS can take a few seconds).
    private static final long NATIVE_PAINT_DELAY_MS = 700;

    private static void paintIfJsIsSlow(final Context context, final long advancedAt) {
        new Handler(Looper.getMainLooper()).postDelayed(() -> {
            try {
                String raw = prefs(context).getString(PROPS, "");
                if (raw == null || raw.isEmpty()) return;
                JSONObject current = new JSONObject(raw);
                if (current.optLong("updatedAt") != advancedAt) return;
                paint(context, current);
            } catch (Exception ignored) {
                // The headless redraw paints the bitmap.
            }
        }, NATIVE_PAINT_DELAY_MS);
    }

    static JSONObject step(JSONObject card, String lampId, String kind, String night) throws JSONException {
        String id = WidgetTapStore.clip(lampId);
        String mark = "did".equals(kind) ? "yes" : "nope".equals(kind) ? "skip" : "";
        if (id.isEmpty() || mark.isEmpty()) return null;
        JSONArray items = card.optJSONArray("items");
        if (items == null) return null;
        JSONObject lead = leadItem(card, items);
        if (lead == null || !id.equals(lead.optString("lampId"))) return null;
        String nightKey = WidgetTapStore.clip(night);
        if (!nightKey.isEmpty() && !nightKey.equals(lead.optString("periodKey"))) return null;

        JSONArray nextItems = new JSONArray();
        String leadNight = lead.optString("periodKey");
        for (int i = 0; i < items.length(); i++) {
            JSONObject item = items.optJSONObject(i);
            if (item == null) continue;
            JSONObject copy = new JSONObject(item.toString());
            boolean isLead = id.equals(copy.optString("lampId"))
                && leadNight.equals(copy.optString("periodKey"))
                && "open".equals(copy.optString("status"));
            if (isLead) copy.put("status", mark);
            nextItems.put(copy);
        }

        JSONObject nextLead = null;
        int left = 0;
        for (int i = 0; i < nextItems.length(); i++) {
            JSONObject item = nextItems.optJSONObject(i);
            if (item == null || !"open".equals(item.optString("status"))) continue;
            left += 1;
            if (nextLead == null) nextLead = item;
        }

        String footer = card.optString("footer");
        String question = "";
        String leadId = "";
        // Items can come from different tags now, so the header follows
        // whichever question is showing, not one fixed tag.
        String tagTitle = card.optString("tagTitle");
        if (nextLead == null) {
            String clear = card.optString("clearLabel").trim();
            String empty = card.optString("emptyLabel").trim();
            String open = card.optString("openLabel").trim();
            String line = nextItems.length() > 0 ? clear : empty;
            if (line.isEmpty()) line = open;
            if (line.isEmpty()) line = footer.trim();
            if (line.isEmpty()) return null;
            footer = line;
        } else {
            question = nextLead.optString("question").trim();
            if (question.isEmpty()) question = nextLead.optString("label").trim();
            if (question.isEmpty()) return null;
            leadId = nextLead.optString("lampId");
            String nextTag = nextLead.optString("tag").trim();
            if (!nextTag.isEmpty()) tagTitle = nextTag;
        }

        JSONObject next = new JSONObject(card.toString());
        next.put("items", nextItems);
        next.put("leadLampId", leadId);
        next.put("question", question);
        next.put("tagTitle", tagTitle);
        next.put("left", left);
        next.put("footer", footer);
        return next;
    }

    private static void paint(Context context, JSONObject card) throws JSONException {
        AppWidgetManager manager = AppWidgetManager.getInstance(context);
        int[] ids = manager.getAppWidgetIds(new ComponentName(context, DidITonight.class));
        if (ids == null) return;
        for (int id : ids) {
            manager.updateAppWidget(id, views(context, card, id));
        }
    }

    private static RemoteViews views(Context context, JSONObject card, int widgetId) throws JSONException {
        RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.widget_tonight_card);
        JSONObject colors = card.optJSONObject("colors");
        boolean gem = colors != null && colors.optBoolean("gem");
        int bg = color(colors, "bg", 0xFF0E1014);
        int panel = color(colors, "panel", 0xFF16191F);
        int ink = color(colors, "ink", 0xFFF4F6FA);
        int inkSoft = color(colors, "inkSoft", 0xFF99A1B0);
        int on = color(colors, "on", 0xFFC9F24D);
        fill(views, R.id.widget_card_root, gem ? bg : panel);
        fill(views, R.id.widget_card_ring, on);
        fill(views, R.id.widget_card_panel, panel);

        String tag = card.optString("tagTitle");
        views.setTextViewText(R.id.widget_card_tag, tag.toUpperCase(Locale.getDefault()));
        views.setTextColor(R.id.widget_card_tag, on);

        JSONArray items = card.optJSONArray("items");
        JSONObject lead = items == null ? null : leadItem(card, items);
        int height = 0;
        try {
            height = com.reactnativeandroidwidget.RNWidgetUtil.getWidgetHeight(context, widgetId);
        } catch (Exception ignored) {
            height = 0;
        }
        boolean compact = height > 0 && height < 130;
        views.setTextViewTextSize(
            R.id.widget_card_question,
            TypedValue.COMPLEX_UNIT_SP,
            lead == null ? 14 : (compact ? 16 : 22)
        );

        String openUri = card.optString("openUri");
        if (openUri.isEmpty()) openUri = "didi://tonight";
        views.setOnClickPendingIntent(R.id.widget_card_question, openIntent(context, widgetId, openUri, 3));

        if (lead == null) {
            views.setTextViewText(R.id.widget_card_question, card.optString("footer"));
            views.setTextColor(R.id.widget_card_question, inkSoft);
            views.setViewVisibility(R.id.widget_card_actions, View.GONE);
            views.setViewVisibility(R.id.widget_card_open, View.VISIBLE);
            views.setTextViewText(R.id.widget_card_open, card.optString("openLabel"));
            views.setTextColor(R.id.widget_card_open, on);
            views.setOnClickPendingIntent(R.id.widget_card_open, openIntent(context, widgetId, openUri, 4));
            return views;
        }

        String question = card.optString("question").trim();
        if (question.isEmpty()) question = lead.optString("question").trim();
        if (question.isEmpty()) question = lead.optString("label").trim();
        views.setTextViewText(R.id.widget_card_question, question);
        views.setTextColor(R.id.widget_card_question, ink);
        views.setViewVisibility(R.id.widget_card_actions, View.VISIBLE);
        views.setViewVisibility(R.id.widget_card_open, View.GONE);

        fill(views, R.id.widget_card_nope, color(colors, "skip", 0xFF7D8694));
        fill(views, R.id.widget_card_did, on);
        views.setTextViewText(R.id.widget_card_nope, card.optString("nopeLabel"));
        views.setTextViewText(R.id.widget_card_did, card.optString("didLabel"));
        views.setTextColor(R.id.widget_card_nope, ink);
        views.setTextColor(R.id.widget_card_did, bg);

        String lampId = lead.optString("lampId");
        String night = lead.optString("periodKey");
        views.setOnClickPendingIntent(
            R.id.widget_card_nope,
            answerIntent(context, widgetId, lampId, "nope", night, 1)
        );
        views.setOnClickPendingIntent(
            R.id.widget_card_did,
            answerIntent(context, widgetId, lampId, "did", night, 2)
        );
        return views;
    }

    private static PendingIntent answerIntent(
        Context context,
        int widgetId,
        String lampId,
        String kind,
        String night,
        int slot
    ) {
        Intent intent = new Intent(context.getPackageName() + ".WIDGET_CLICK");
        intent.setComponent(new ComponentName(context, DidITonight.class));
        intent.putExtra("widgetId", widgetId);
        intent.putExtra("clickAction", "ANSWER");
        Bundle data = new Bundle();
        data.putString("lampId", lampId);
        data.putString("kind", kind);
        data.putString("night", night);
        intent.putExtra("clickActionData", data);
        return PendingIntent.getBroadcast(
            context,
            requestCode(widgetId, slot),
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_MUTABLE
        );
    }

    private static PendingIntent openIntent(Context context, int widgetId, String uri, int slot) {
        Intent intent = new Intent(context.getPackageName() + ".WIDGET_CLICK");
        intent.setComponent(new ComponentName(context, DidITonight.class));
        intent.putExtra("widgetId", widgetId);
        intent.putExtra("clickAction", "OPEN_URI");
        Bundle data = new Bundle();
        data.putString("uri", uri);
        intent.putExtra("clickActionData", data);
        return PendingIntent.getBroadcast(
            context,
            requestCode(widgetId, slot),
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_MUTABLE
        );
    }

    private static int requestCode(int widgetId, int slot) {
        return (widgetId & 0xffff) * 8 + slot;
    }

    private static JSONObject leadItem(JSONObject card, JSONArray items) {
        String id = card.optString("leadLampId").trim();
        boolean hasOpen = false;
        for (int i = 0; i < items.length(); i++) {
            JSONObject item = items.optJSONObject(i);
            if (item != null && "open".equals(item.optString("status"))) {
                hasOpen = true;
                break;
            }
        }
        JSONObject firstOpen = null;
        JSONObject firstSkip = null;
        for (int i = 0; i < items.length(); i++) {
            JSONObject item = items.optJSONObject(i);
            if (item == null) continue;
            String status = item.optString("status");
            if ("open".equals(status)) {
                if (firstOpen == null) firstOpen = item;
                if (!id.isEmpty() && id.equals(item.optString("lampId"))) return item;
            } else if (!hasOpen && "skip".equals(status)) {
                if (firstSkip == null) firstSkip = item;
                if (!id.isEmpty() && id.equals(item.optString("lampId"))) return item;
            }
        }
        if (firstOpen != null) return firstOpen;
        return firstSkip;
    }

    private static boolean pendingStillOpen(Context context, JSONObject incoming) {
        String raw = WidgetTapStore.peek(context);
        if (raw.isEmpty()) return false;
        try {
            JSONObject tap = new JSONObject(raw);
            return itemOpen(incoming, tap.optString("lampId"), tap.optString("night"));
        } catch (JSONException error) {
            return false;
        }
    }

    private static boolean itemOpen(JSONObject card, String lampId, String night) {
        JSONArray items = card.optJSONArray("items");
        if (items == null || lampId == null || lampId.isEmpty()) return false;
        for (int i = 0; i < items.length(); i++) {
            JSONObject item = items.optJSONObject(i);
            if (item == null || !lampId.equals(item.optString("lampId"))) continue;
            if (!night.isEmpty() && !night.equals(item.optString("periodKey"))) continue;
            if ("open".equals(item.optString("status"))) return true;
        }
        return false;
    }

    private static void keepColors(Context context, JSONObject incoming) throws JSONException {
        if (incoming.has("colors") && !incoming.isNull("colors")) return;
        String raw = prefs(context).getString(PROPS, "");
        if (raw == null || raw.isEmpty()) return;
        JSONObject stored = new JSONObject(raw);
        if (stored.has("colors") && !stored.isNull("colors")) {
            incoming.put("colors", stored.get("colors"));
        }
    }

    private static void fill(RemoteViews views, int id, int color) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            views.setColorStateList(id, "setBackgroundTintList", ColorStateList.valueOf(color));
        } else {
            views.setInt(id, "setBackgroundColor", color);
        }
    }

    private static int color(JSONObject colors, String key, int fallback) {
        if (colors == null) return fallback;
        String raw = colors.optString(key, "");
        if (raw.isEmpty()) return fallback;
        try {
            return android.graphics.Color.parseColor(raw);
        } catch (IllegalArgumentException error) {
            return fallback;
        }
    }

    private static SharedPreferences prefs(Context context) {
        return context.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
    }
}
