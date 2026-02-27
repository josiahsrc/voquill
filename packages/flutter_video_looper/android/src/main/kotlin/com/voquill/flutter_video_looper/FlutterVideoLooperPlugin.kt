package com.voquill.flutter_video_looper

import android.app.Activity
import android.content.Context
import io.flutter.embedding.engine.plugins.FlutterPlugin
import io.flutter.embedding.engine.plugins.activity.ActivityAware
import io.flutter.embedding.engine.plugins.activity.ActivityPluginBinding
import io.flutter.plugin.common.BinaryMessenger
import io.flutter.plugin.common.StandardMessageCodec
import io.flutter.plugin.platform.PlatformView
import io.flutter.plugin.platform.PlatformViewFactory

class FlutterVideoLooperPlugin : FlutterPlugin, ActivityAware {
    private var viewFactory: VideoLooperViewFactory? = null

    override fun onAttachedToEngine(binding: FlutterPlugin.FlutterPluginBinding) {
        viewFactory = VideoLooperViewFactory(binding.binaryMessenger, binding.flutterAssets)
        binding.platformViewRegistry.registerViewFactory(
            "flutter_video_looper", viewFactory!!
        )
    }

    override fun onDetachedFromEngine(binding: FlutterPlugin.FlutterPluginBinding) {
        viewFactory = null
    }

    override fun onAttachedToActivity(binding: ActivityPluginBinding) {
        viewFactory?.activity = binding.activity
    }

    override fun onDetachedFromActivityForConfigChanges() {
        viewFactory?.activity = null
    }

    override fun onReattachedToActivityForConfigChanges(binding: ActivityPluginBinding) {
        viewFactory?.activity = binding.activity
    }

    override fun onDetachedFromActivity() {
        viewFactory?.activity = null
    }
}

class VideoLooperViewFactory(
    private val messenger: BinaryMessenger,
    private val flutterAssets: FlutterPlugin.FlutterAssets
) : PlatformViewFactory(StandardMessageCodec.INSTANCE) {
    var activity: Activity? = null

    override fun create(context: Context, id: Int, args: Any?): PlatformView {
        @Suppress("UNCHECKED_CAST")
        val params = args as? Map<String, Any> ?: emptyMap()
        return VideoLooperPlatformView(context, id, params, messenger, flutterAssets, activity)
    }
}
