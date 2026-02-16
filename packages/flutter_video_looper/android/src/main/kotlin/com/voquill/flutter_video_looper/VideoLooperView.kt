package com.voquill.flutter_video_looper

import android.app.Activity
import android.app.PictureInPictureParams
import android.content.Context
import android.net.Uri
import android.os.Build
import android.util.Rational
import android.view.View
import androidx.annotation.OptIn
import androidx.media3.common.MediaItem
import androidx.media3.common.Player
import androidx.media3.common.VideoSize
import androidx.media3.common.util.UnstableApi
import androidx.media3.exoplayer.ExoPlayer
import androidx.media3.ui.PlayerView
import io.flutter.embedding.engine.plugins.FlutterPlugin
import io.flutter.plugin.common.BinaryMessenger
import io.flutter.plugin.common.MethodCall
import io.flutter.plugin.common.MethodChannel
import io.flutter.plugin.platform.PlatformView

@OptIn(UnstableApi::class)
class VideoLooperPlatformView(
    context: Context,
    viewId: Int,
    args: Map<String, Any>,
    messenger: BinaryMessenger,
    flutterAssets: FlutterPlugin.FlutterAssets,
    private val activity: Activity?
) : PlatformView, MethodChannel.MethodCallHandler {

    private val playerView: PlayerView
    private val player: ExoPlayer
    private val channel: MethodChannel
    private val isPipEnabled: Boolean
    private var videoWidth = 0
    private var videoHeight = 0

    init {
        isPipEnabled = args["isPipEnabled"] as? Boolean ?: false
        channel = MethodChannel(messenger, "flutter_video_looper_$viewId")
        channel.setMethodCallHandler(this)

        player = ExoPlayer.Builder(context).build().apply {
            repeatMode = Player.REPEAT_MODE_ALL
        }

        playerView = PlayerView(context).apply {
            this.player = this@VideoLooperPlatformView.player
            useController = false
            keepScreenOn = true
        }

        val assetPath = args["assetPath"] as? String ?: ""
        val assetKey = flutterAssets.getAssetFilePathByName(assetPath)
        player.setMediaItem(MediaItem.fromUri(Uri.parse("asset:///$assetKey")))

        player.addListener(object : Player.Listener {
            override fun onVideoSizeChanged(size: VideoSize) {
                videoWidth = size.width
                videoHeight = size.height
                if (isPipEnabled && Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                    updateAutoEnterPip()
                }
            }
        })

        player.prepare()
        player.play()
    }

    override fun getView(): View = playerView

    override fun dispose() {
        player.release()
        channel.setMethodCallHandler(null)
    }

    override fun onMethodCall(call: MethodCall, result: MethodChannel.Result) {
        when (call.method) {
            "enterPip" -> {
                enterPip()
                result.success(null)
            }
            "dispose" -> {
                dispose()
                result.success(null)
            }
            else -> result.notImplemented()
        }
    }

    private fun enterPip() {
        if (!isPipEnabled || Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return
        val act = activity ?: return
        val builder = PictureInPictureParams.Builder()
        if (videoWidth > 0 && videoHeight > 0) {
            builder.setAspectRatio(Rational(videoWidth, videoHeight))
        }
        act.enterPictureInPictureMode(builder.build())
    }

    private fun updateAutoEnterPip() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.S) return
        val act = activity ?: return
        val builder = PictureInPictureParams.Builder().setAutoEnterEnabled(true)
        if (videoWidth > 0 && videoHeight > 0) {
            builder.setAspectRatio(Rational(videoWidth, videoHeight))
        }
        act.setPictureInPictureParams(builder.build())
    }
}
