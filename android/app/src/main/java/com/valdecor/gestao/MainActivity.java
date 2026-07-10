package com.valdecor.gestao;

import android.os.Bundle;
import android.view.WindowManager;
import android.view.View;
import android.webkit.WebView;
import android.graphics.Color;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        // Set white background before anything loads to avoid black flash
        getWindow().setBackgroundDrawableResource(android.R.color.white);

        super.onCreate(savedInstanceState);

        // Edge-to-edge: extend app behind status bar and navigation bar
        getWindow().setDecorFitsSystemWindows(false);

        // Make status bar transparent so content fills to the top
        getWindow().setStatusBarColor(Color.TRANSPARENT);
        // Make navigation bar transparent so content fills to the bottom
        getWindow().setNavigationBarColor(Color.TRANSPARENT);

        // Use dark icons on status bar (visible on white/light background)
        getWindow().getInsetsController().setSystemBarsAppearance(
            android.view.WindowInsetsController.APPEARANCE_LIGHT_STATUS_BARS,
            android.view.WindowInsetsController.APPEARANCE_LIGHT_STATUS_BARS
        );

        // Use dark icons on navigation bar (visible on white/light background)
        getWindow().getInsetsController().setSystemBarsAppearance(
            android.view.WindowInsetsController.APPEARANCE_LIGHT_NAVIGATION_BARS,
            android.view.WindowInsetsController.APPEARANCE_LIGHT_NAVIGATION_BARS
        );

        // Set the WebView background to white to prevent black screen during loading
        if (bridge != null && bridge.getWebView() != null) {
            WebView webView = bridge.getWebView();
            webView.setBackgroundColor(Color.WHITE);
            // Force the web view to fill the entire screen
            webView.setFitsSystemWindows(false);
        }
    }
}
