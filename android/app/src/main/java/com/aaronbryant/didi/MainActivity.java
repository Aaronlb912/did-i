package com.aaronbryant.didi;

import android.graphics.Color;
import android.os.Bundle;
import android.view.Window;
import android.webkit.WebSettings;
import android.webkit.WebView;
import androidx.core.splashscreen.SplashScreen;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsControllerCompat;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        SplashScreen.installSplashScreen(this).setOnExitAnimationListener(provider -> provider.remove());
        Window window = getWindow();
        WindowCompat.setDecorFitsSystemWindows(window, true);
        window.setStatusBarColor(Color.parseColor("#0e1014"));
        window.setNavigationBarColor(Color.parseColor("#0e1014"));
        WindowInsetsControllerCompat insets =
            new WindowInsetsControllerCompat(window, window.getDecorView());
        insets.setAppearanceLightStatusBars(false);
        insets.setAppearanceLightNavigationBars(false);
        super.onCreate(savedInstanceState);
        if (getBridge() == null) {
            return;
        }
        WebView webView = getBridge().getWebView();
        if (webView == null) {
            return;
        }
        WebSettings settings = webView.getSettings();
        settings.setSupportZoom(false);
        settings.setBuiltInZoomControls(false);
        settings.setDisplayZoomControls(false);
        webView.setBackgroundColor(Color.parseColor("#0e1014"));
    }
}
