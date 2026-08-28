package com.phronesis.mobile;

import android.Manifest;
import android.annotation.SuppressLint;
import android.app.Activity;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.webkit.JavascriptInterface;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Toast;

import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;

import org.json.JSONObject;

import java.util.ArrayList;
import java.util.Locale;

public class MainActivity extends Activity {
    private WebView webView;
    private static final int PERM_REQ = 2001;
    private static final int SCAN_REQ = 2002;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_main);

        webView = findViewById(R.id.webView);
        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setAllowFileAccess(true);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_ALWAYS_ALLOW);
        settings.setCacheMode(WebSettings.LOAD_DEFAULT);
        webView.addJavascriptInterface(new WebAppInterface(), "Android");
        webView.setWebViewClient(new WebViewClient());

        webView.loadUrl("file:///android_asset/index.html");

        requestPermissions();
    }

    private void requestPermissions() {
        ArrayList<String> need = new ArrayList<>();
        if (ContextCompat.checkSelfPermission(this, Manifest.permission.CAMERA) != PackageManager.PERMISSION_GRANTED)
            need.add(Manifest.permission.CAMERA);
        if (!need.isEmpty())
            ActivityCompat.requestPermissions(this, need.toArray(new String[0]), PERM_REQ);
    }

    public class WebAppInterface {
        @JavascriptInterface
        public void onReady() { }

        @JavascriptInterface
        public String getConfig() {
            return getSharedPreferences("phronesis", MODE_PRIVATE).getString("ph_config", "");
        }

        @JavascriptInterface
        public void setConfig(String json) {
            getSharedPreferences("phronesis", MODE_PRIVATE).edit().putString("ph_config", json).apply();
        }

        @JavascriptInterface
        public void scanQR() {
            runOnUiThread(() -> {
                if (ContextCompat.checkSelfPermission(MainActivity.this, Manifest.permission.CAMERA)
                        != PackageManager.PERMISSION_GRANTED) {
                    toast("请先授予相机权限");
                    return;
                }
                startActivityForResult(new Intent(MainActivity.this, ScanActivity.class), SCAN_REQ);
            });
        }

        @JavascriptInterface
        public void showToast(String msg) {
            runOnUiThread(() -> toast(msg));
        }

        @JavascriptInterface
        public String loadData(String key) {
            return getSharedPreferences("phronesis", MODE_PRIVATE).getString("ph_" + key, "");
        }

        @JavascriptInterface
        public void saveData(String key, String value) {
            getSharedPreferences("phronesis", MODE_PRIVATE).edit().putString("ph_" + key, value).apply();
        }
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        if (requestCode == SCAN_REQ && resultCode == RESULT_OK && data != null) {
            String value = data.getStringExtra("SCAN_RESULT");
            if (value != null) {
                String js = "if(window.onQRResult)window.onQRResult(" + JSONObject.quote(value) + ");";
                webView.evaluateJavascript(js, null);
            }
        }
    }

    private void toast(String msg) {
        Toast.makeText(this, msg, Toast.LENGTH_SHORT).show();
    }

    @Override
    public void onBackPressed() {
        if (webView != null && webView.canGoBack()) webView.goBack();
        else super.onBackPressed();
    }

    @Override
    protected void onDestroy() {
        super.onDestroy();
    }
}
