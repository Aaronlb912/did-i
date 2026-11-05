package com.aaronbryant.didi.widget;

import android.content.Intent;

import com.facebook.react.HeadlessJsTaskService;
import com.facebook.react.bridge.Arguments;
import com.facebook.react.jstasks.HeadlessJsTaskConfig;

/**
 * A reboot, app update or clock / time zone change cancels scheduled reminders.
 * With no widget placed nothing else wakes JS, so this runs the DidIPingRearm
 * task (native/ping-rearm.android.js) to set them again.
 */
public class PingRearmService extends HeadlessJsTaskService {
    static final String TASK = "DidIPingRearm";

    @Override
    protected HeadlessJsTaskConfig getTaskConfig(Intent intent) {
        return new HeadlessJsTaskConfig(TASK, Arguments.createMap(), 30000, true);
    }
}
