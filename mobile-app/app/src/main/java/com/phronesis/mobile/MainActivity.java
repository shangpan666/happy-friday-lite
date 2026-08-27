package com.phronesis.mobile;

import android.annotation.SuppressLint;
import android.app.Activity;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Bundle;
import android.view.View;
import android.view.WindowManager;
import android.webkit.JavascriptInterface;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Toast;

import androidx.appcompat.app.AppCompatActivity;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;
import androidx.swiperefreshlayout.widget.SwipeRefreshLayout;

public class MainActivity extends AppCompatActivity {
    private WebView webView;
    private SwipeRefreshLayout swipeRefresh;
    private ValueCallback<Uri[]> fileChooserCallback;
    private static final int FILE_CHOOSER_REQUEST = 1001;
    private static final int CAMERA_PERMISSION_REQUEST = 1002;
    private static final int SCAN_REQUEST = 1003;

    // 保存的服务器地址
    private String savedServerUrl = "";

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        
        // 全屏沉浸式
        getWindow().setFlags(
            WindowManager.LayoutParams.FLAG_LAYOUT_NO_LIMITS,
            WindowManager.LayoutParams.FLAG_LAYOUT_NO_LIMITS
        );
        
        setContentView(R.layout.activity_main);
        
        // 初始化下拉刷新
        swipeRefresh = findViewById(R.id.swipeRefresh);
        swipeRefresh.setColorSchemeResources(
            R.color.primary,
            R.color.primary_dark
        );
        swipeRefresh.setOnRefreshListener(this::refreshPage);
        
        // 初始化 WebView
        initWebView();
        
        // 加载页面
        loadApp();
    }

    @SuppressLint("SetJavaScriptEnabled")
    private void initWebView() {
        webView = findViewById(R.id.webView);
        
        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setAllowFileAccess(true);
        settings.setAllowContentAccess(true);
        settings.setMediaPlaybackRequiresUserGesture(false);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_ALWAYS_ALLOW);
        
        // 启用缓存
        settings.setCacheMode(WebSettings.LOAD_DEFAULT);
        settings.setAppCacheEnabled(true);
        settings.setAppCachePath(getApplicationContext().getCacheDir().getAbsolutePath());
        
        // 添加 JavaScript 接口
        webView.addJavascriptInterface(new WebAppInterface(), "Android");
        
        webView.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                String url = request.getUrl().toString();
                
                // 处理自定义协议
                if (url.startsWith("phronesis://")) {
                    handleDeepLink(url);
                    return true;
                }
                
                // 外部链接在浏览器中打开
                if (!url.contains("phronesis") && !url.contains("localhost")) {
                    Intent intent = new Intent(Intent.ACTION_VIEW, Uri.parse(url));
                    startActivity(intent);
                    return true;
                }
                
                return false;
            }
            
            @Override
            public void onPageFinished(WebView view, String url) {
                super.onPageFinished(view, url);
                swipeRefresh.setRefreshing(false);
                
                // 注入保存的服务器地址
                if (!savedServerUrl.isEmpty()) {
                    view.evaluateJavascript(
                        "localStorage.setItem('serverUrl', '" + savedServerUrl + "')",
                        null
                    );
                }
            }
        });
        
        webView.setWebChromeClient(new WebChromeClient() {
            @Override
            public boolean onShowFileChooser(WebView webView, ValueCallback<Uri[]> callback, FileChooserParams fileChooserParams) {
                if (fileChooserCallback != null) {
                    fileChooserCallback.onReceiveValue(null);
                }
                fileChooserCallback = callback;
                
                Intent intent = fileChooserParams.createIntent();
                try {
                    startActivityForResult(intent, FILE_CHOOSER_REQUEST);
                } catch (Exception e) {
                    fileChooserCallback = null;
                    return false;
                }
                return true;
            }
        });
    }

    private void loadApp() {
        // 从 SharedPreferences 读取保存的服务器地址
        savedServerUrl = getSharedPreferences("phronesis", MODE_PRIVATE)
            .getString("server_url", "");
        
        if (!savedServerUrl.isEmpty()) {
            // 有保存的地址，直接加载
            webView.loadUrl(savedServerUrl + "/#/mobile");
        } else {
            // 没有保存的地址，显示连接页面
            webView.loadUrl("file:///android_asset/connect.html");
        }
    }

    private void refreshPage() {
        if (webView != null) {
            webView.reload();
        } else {
            swipeRefresh.setRefreshing(false);
        }
    }

    private void handleDeepLink(String url) {
        // 处理 phronesis:// 协议
        if (url.startsWith("phronesis://connect/")) {
            String serverUrl = url.replace("phronesis://connect/", "http://");
            connectToServer(serverUrl);
        }
    }

    private void connectToServer(String serverUrl) {
        // 验证服务器连接
        savedServerUrl = serverUrl;
        
        // 保存到 SharedPreferences
        getSharedPreferences("phronesis", MODE_PRIVATE)
            .edit()
            .putString("server_url", serverUrl)
            .apply();
        
        // 加载手机端界面
        webView.loadUrl(serverUrl + "/#/mobile");
        Toast.makeText(this, "已连接到服务器", Toast.LENGTH_SHORT).show();
    }

    // JavaScript 接口
    public class WebAppInterface {
        @JavascriptInterface
        public void scanQRCode() {
            runOnUiThread(() -> {
                // 检查相机权限
                if (ContextCompat.checkSelfPermission(MainActivity.this, 
                    android.Manifest.permission.CAMERA) != PackageManager.PERMISSION_GRANTED) {
                    ActivityCompat.requestPermissions(MainActivity.this,
                        new String[]{android.Manifest.permission.CAMERA},
                        CAMERA_PERMISSION_REQUEST);
                } else {
                    startQRScan();
                }
            });
        }

        @JavascriptInterface
        public void connectToServer(String serverUrl) {
            runOnUiThread(() -> {
                MainActivity.this.connectToServer(serverUrl);
            });
        }

        @JavascriptInterface
        public void saveServerUrl(String url) {
            savedServerUrl = url;
            getSharedPreferences("phronesis", MODE_PRIVATE)
                .edit()
                .putString("server_url", url)
                .apply();
        }

        @JavascriptInterface
        public String getServerUrl() {
            return savedServerUrl;
        }

        @JavascriptInterface
        public void showToast(String message) {
            runOnUiThread(() -> {
                Toast.makeText(MainActivity.this, message, Toast.LENGTH_SHORT).show();
            });
        }

        @JavascriptInterface
        public void vibrate(int milliseconds) {
            runOnUiThread(() -> {
                android.os.Vibrator vibrator = (android.os.Vibrator) 
                    getSystemService(android.content.Context.VIBRATOR_SERVICE);
                if (vibrator != null) {
                    vibrator.vibrate(android.os.VibrationEffect.createOneShot(
                        milliseconds, android.os.VibrationEffect.DEFAULT_AMPLITUDE));
                }
            });
        }

        @JavascriptInterface
        public void shareText(String text) {
            runOnUiThread(() -> {
                Intent intent = new Intent(Intent.ACTION_SEND);
                intent.setType("text/plain");
                intent.putExtra(Intent.EXTRA_TEXT, text);
                startActivity(Intent.createChooser(intent, "分享"));
            });
        }
    }

    private void startQRScan() {
        Intent intent = new Intent(this, ScanActivity.class);
        startActivityForResult(intent, SCAN_REQUEST);
    }

    @Override
    public void onRequestPermissionsResult(int requestCode, String[] permissions, int[] grantResults) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults);
        
        if (requestCode == CAMERA_PERMISSION_REQUEST) {
            if (grantResults.length > 0 && grantResults[0] == PackageManager.PERMISSION_GRANTED) {
                startQRScan();
            } else {
                Toast.makeText(this, "需要相机权限来扫描二维码", Toast.LENGTH_SHORT).show();
            }
        }
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        
        if (requestCode == FILE_CHOOSER_REQUEST) {
            if (resultCode == Activity.RESULT_OK && data != null) {
                if (fileChooserCallback != null) {
                    fileChooserCallback.onReceiveValue(new Uri[]{data.getData()});
                    fileChooserCallback = null;
                }
            } else if (fileChooserCallback != null) {
                fileChooserCallback.onReceiveValue(null);
                fileChooserCallback = null;
            }
        } else if (requestCode == SCAN_REQUEST) {
            if (resultCode == Activity.RESULT_OK && data != null) {
                String qrResult = data.getStringExtra("qr_result");
                if (qrResult != null && !qrResult.isEmpty()) {
                    // 解析二维码内容
                    if (qrResult.startsWith("http://") || qrResult.startsWith("https://")) {
                        connectToServer(qrResult);
                    } else if (qrResult.startsWith("phronesis://")) {
                        handleDeepLink(qrResult);
                    } else {
                        Toast.makeText(this, "无法识别的二维码", Toast.LENGTH_SHORT).show();
                    }
                }
            }
        }
    }

    @Override
    public void onBackPressed() {
        if (webView != null && webView.canGoBack()) {
            webView.goBack();
        } else {
            super.onBackPressed();
        }
    }

    @Override
    protected void onDestroy() {
        if (webView != null) {
            webView.destroy();
        }
        super.onDestroy();
    }
}
