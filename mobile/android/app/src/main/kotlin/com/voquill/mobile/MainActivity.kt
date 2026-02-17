package com.voquill.mobile

import android.content.Context
import io.flutter.embedding.android.FlutterFragmentActivity
import io.flutter.embedding.engine.FlutterEngine
import io.flutter.plugin.common.MethodChannel

class MainActivity : FlutterFragmentActivity() {

    override fun configureFlutterEngine(flutterEngine: FlutterEngine) {
        super.configureFlutterEngine(flutterEngine)

        MethodChannel(flutterEngine.dartExecutor.binaryMessenger, "com.voquill.mobile/shared")
            .setMethodCallHandler { call, result ->
                when (call.method) {
                    "setKeyboardAuth" -> {
                        val apiRefreshToken = call.argument<String>("apiRefreshToken")
                        val apiKey = call.argument<String>("apiKey")
                        val functionUrl = call.argument<String>("functionUrl")
                        val authUrl = call.argument<String>("authUrl")

                        if (apiRefreshToken == null || apiKey == null || functionUrl == null || authUrl == null) {
                            result.error("INVALID_ARGS", "Missing required arguments", null)
                            return@setMethodCallHandler
                        }

                        getSharedPreferences(VoquillIME.PREFS_NAME, Context.MODE_PRIVATE)
                            .edit()
                            .putString(VoquillIME.KEY_API_REFRESH_TOKEN, apiRefreshToken)
                            .putString(VoquillIME.KEY_API_KEY, apiKey)
                            .putString(VoquillIME.KEY_FUNCTION_URL, functionUrl)
                            .putString(VoquillIME.KEY_AUTH_URL, authUrl)
                            .apply()

                        result.success(null)
                    }
                    "clearKeyboardAuth" -> {
                        getSharedPreferences(VoquillIME.PREFS_NAME, Context.MODE_PRIVATE)
                            .edit()
                            .clear()
                            .apply()

                        result.success(null)
                    }
                    else -> result.notImplemented()
                }
            }
    }
}
