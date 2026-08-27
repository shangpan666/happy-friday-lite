# Phronesis Mobile ProGuard Rules

# Keep WebView JavaScript interface
-keepclassmembers class com.phronesis.mobile.MainActivity$WebAppInterface {
    @android.webkit.JavascriptInterface <methods>;
}

# Keep ZXing
-keep class com.google.zxing.** { *; }

# Keep AndroidX
-keep class androidx.** { *; }
