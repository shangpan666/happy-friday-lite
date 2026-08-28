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
import android.speech.RecognitionListener;
import android.speech.RecognizerIntent;
import android.speech.SpeechRecognizer;
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
    private SpeechRecognizer speechRecognizer;
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
        if (ContextCompat.checkSelfPermission(this, Manifest.permission.RECORD_AUDIO) != PackageManager.PERMISSION_GRANTED)
            need.add(Manifest.permission.RECORD_AUDIO);
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
        public void startVoice() {
            runOnUiThread(() -> {
                if (ContextCompat.checkSelfPermission(MainActivity.this, Manifest.permission.RECORD_AUDIO)
                        != PackageManager.PERMISSION_GRANTED) {
                    toast("请先授予麦克风权限");
                    return;
                }
                startSpeech();
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

    private void startSpeech() {
        if (speechRecognizer == null) {
            speechRecognizer = SpeechRecognizer.createSpeechRecognizer(this);
            speechRecognizer.setRecognitionListener(new RecognitionListener() {
                @Override public void onReadyForSpeech(Bundle params) { }
                @Override public void onBeginningOfSpeech() { }
                @Override public void onRmsChanged(float rmsdB) { }
                @Override public void onBufferReceived(byte[] buffer) { }
                @Override public void onEndOfSpeech() { }
                @Override public void onError(int error) {
                    new Handler(Looper.getMainLooper()).post(() -> toast("语音识别失败，请重试"));
                }
                @Override public void onResults(Bundle results) {
                    sendVoice(results);
                }
                @Override public void onPartialResults(Bundle partialResults) {
                    sendVoice(partialResults);
                }
                @Override public void onEvent(int eventType, Bundle params) { }
            });
        }
        Intent intent = new Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH);
        intent.putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM);
        intent.putExtra(RecognizerIntent.EXTRA_LANGUAGE, Locale.CHINESE.toString());
        intent.putExtra(RecognizerIntent.EXTRA_PARTIAL_RESULTS, true);
        speechRecognizer.startListening(intent);
    }

    private void sendVoice(Bundle results) {
        ArrayList<String> matches = results.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION);
        if (matches != null && !matches.isEmpty()) {
            String text = matches.get(0);
            String js = "if(window.onVoiceResult)window.onVoiceResult(" + JSONObject.quote(text) + ");";
            new Handler(Looper.getMainLooper()).post(() -> webView.evaluateJavascript(js, null));
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
        if (speechRecognizer != null) { speechRecognizer.destroy(); speechRecognizer = null; }
        super.onDestroy();
    }
}
