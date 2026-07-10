package com.valdecor.gestao;

import android.os.Bundle;
import android.os.Build;
import android.view.WindowManager;
import android.view.View;
import android.webkit.WebView;
import android.graphics.Color;

import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsControllerCompat;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        // Set white background before anything loads to avoid black flash
        getWindow().setBackgroundDrawableResource(android.R.color.white);

        super.onCreate(savedInstanceState);

        // Edge-to-edge: extend app behind status bar and navigation bar
        WindowCompat.setDecorFitsSystemWindows(getWindow(), false);

        // Make status bar and navigation bar transparent
        getWindow().setStatusBarColor(Color.TRANSPARENT);
        getWindow().setNavigationBarColor(Color.TRANSPARENT);

        // Use WindowInsetsControllerCompat for dark system bar icons (compatible with API 24+)
        WindowInsetsControllerCompat controller = WindowCompat.getInsetsController(getWindow(), getWindow().getDecorView());
        controller.setAppearanceLightStatusBars(true);
        controller.setAppearanceLightNavigationBars(true);

        // Set the WebView background to white to prevent black screen during loading
        if (bridge != null && bridge.getWebView() != null) {
            WebView webView = bridge.getWebView();
            webView.setBackgroundColor(Color.WHITE);
            webView.setFitsSystemWindows(false);
        }
    }
}
