package com.krisurya.zitro;

import android.os.Bundle;
import android.util.Log;
import android.view.WindowManager;
import android.webkit.WebView;
import android.os.Build;

import androidx.activity.OnBackPressedCallback;
import androidx.appcompat.app.AlertDialog;
import androidx.core.content.ContextCompat;

import com.getcapacitor.BridgeActivity;
import com.krisurya.zitro.fcm.FcmTokenManagerPlugin;

public class MainActivity extends BridgeActivity {

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        // Register plugins BEFORE super.onCreate() so Capacitor bridge picks them up
        registerPlugin(FcmTokenManagerPlugin.class);

        super.onCreate(savedInstanceState);

        // Configure status bar
        configureStatusBar();

        // Handle hardware back button
        getOnBackPressedDispatcher().addCallback(this, new OnBackPressedCallback(true) {
            @Override
            public void handleOnBackPressed() {
                handleBackOrSwipe();
            }
        });
    }

    private void configureStatusBar() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
            getWindow().addFlags(WindowManager.LayoutParams.FLAG_DRAWS_SYSTEM_BAR_BACKGROUNDS);
            getWindow().clearFlags(WindowManager.LayoutParams.FLAG_TRANSLUCENT_STATUS);

            // Set status bar color to white
            getWindow().setStatusBarColor(ContextCompat.getColor(this, android.R.color.white));

            // Make status bar icons dark (for light background)
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                getWindow().getDecorView().setSystemUiVisibility(
                    getWindow().getDecorView().getSystemUiVisibility() |
                    android.view.View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR
                );
            }
        }
    }

    @Override
    public void onBackPressed() {
        // Also handle swipe gestures (Android 13+ back gesture)
        Log.d("MainActivity", "Back pressed or swipe gesture detected");
        handleBackOrSwipe();
    }

    private void handleBackOrSwipe() {
        WebView webView = bridge.getWebView();

        if (webView != null && webView.canGoBack()) {
            // Go back in webview history
            webView.goBack();
        } else {
            // No history → show exit confirmation
            showExitDialog();
        }
    }

    private void showExitDialog() {
        new AlertDialog.Builder(this)
                .setTitle("Exit App")
                .setMessage("Are you sure you want to exit?")
                .setPositiveButton("Yes", (dialog, which) -> {
                    dialog.dismiss();
                    finishAffinity(); // exit the app
                })
                .setNegativeButton("No", (dialog, which) -> {
                    dialog.dismiss(); // just close the dialog
                })
                .show();
    }
}
