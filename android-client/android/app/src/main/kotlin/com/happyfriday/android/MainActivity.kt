package com.happyfriday.android

import android.content.Intent
import io.flutter.embedding.android.FlutterActivity
import io.flutter.embedding.engine.FlutterEngine
import io.flutter.plugin.common.MethodChannel

class MainActivity : FlutterActivity() {
    private val CHANNEL = "com.happyfriday/deeplink"
    private var initialDeepLink: Map<String, String>? = null

    override fun configureFlutterEngine(flutterEngine: FlutterEngine) {
        super.configureFlutterEngine(flutterEngine)
        MethodChannel(flutterEngine.dartExecutor.binaryMessenger, CHANNEL).setMethodCallHandler { call, result ->
            if (call.method == "getInitialLink") {
                result.success(initialDeepLink)
                initialDeepLink = null
            } else {
                result.notImplemented()
            }
        }
        handleIntent(intent)
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        handleIntent(intent)
        // 热启动时通过 MethodChannel 直接发送给 Flutter
        val params = extractParams(intent)
        if (params != null) {
            flutterEngine?.dartExecutor?.binaryMessenger?.let { messenger ->
                MethodChannel(messenger, CHANNEL).invokeMethod("onDeepLink", params)
            }
        }
    }

    private fun handleIntent(intent: Intent) {
        val data = intent.data ?: return
        if (data.scheme == "happyfriday" && data.host == "login") {
            val params = mutableMapOf<String, String>()
            data.getQueryParameter("token")?.let { params["token"] = it }
            data.getQueryParameter("username")?.let { params["username"] = it }
            data.getQueryParameter("server")?.let { params["server"] = it }
            data.getQueryParameter("deviceId")?.let { params["deviceId"] = it }
            data.getQueryParameter("role")?.let { params["role"] = it }
            if (params.isNotEmpty()) {
                initialDeepLink = params
            }
        }
    }

    private fun extractParams(intent: Intent): Map<String, String>? {
        val data = intent.data ?: return null
        if (data.scheme == "happyfriday" && data.host == "login") {
            val params = mutableMapOf<String, String>()
            data.getQueryParameter("token")?.let { params["token"] = it }
            data.getQueryParameter("username")?.let { params["username"] = it }
            data.getQueryParameter("server")?.let { params["server"] = it }
            data.getQueryParameter("deviceId")?.let { params["deviceId"] = it }
            data.getQueryParameter("role")?.let { params["role"] = it }
            return if (params.isNotEmpty()) params else null
        }
        return null
    }
}
