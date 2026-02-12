package com.voquill.app

import android.Manifest
import android.content.Context
import android.content.pm.PackageManager
import android.content.res.Configuration
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.LinearGradient
import android.graphics.Paint
import android.graphics.PorterDuff
import android.graphics.PorterDuffXfermode
import android.graphics.Shader
import android.graphics.drawable.GradientDrawable
import android.inputmethodservice.InputMethodService
import android.media.MediaRecorder
import android.os.Handler
import android.os.Looper
import android.util.Base64
import android.util.Log
import android.view.Choreographer
import android.view.View
import android.view.inputmethod.InputMethodManager
import android.widget.FrameLayout
import android.widget.ImageButton
import android.widget.ImageView
import android.widget.LinearLayout
import android.widget.TextView
import org.json.JSONObject
import java.io.File
import java.net.HttpURLConnection
import java.net.URL
import java.util.concurrent.Executors
import kotlin.math.max
import kotlin.math.min
import kotlin.math.pow
import kotlin.math.sin

class VoquillIME : InputMethodService() {

    enum class Phase { IDLE, RECORDING, LOADING }

    private var currentPhase = Phase.IDLE

    private lateinit var keyboardBackground: FrameLayout
    private lateinit var waveformContainer: FrameLayout
    private lateinit var pillButton: LinearLayout
    private lateinit var pillIcon: ImageView
    private lateinit var pillLabel: TextView
    private lateinit var globeButton: ImageButton

    private var waveformView: AudioWaveformView? = null
    private var progressView: IndeterminateProgressView? = null

    private var mediaRecorder: MediaRecorder? = null
    private val handler = Handler(Looper.getMainLooper())
    private var levelRunnable: Runnable? = null
    private var smoothedLevel = 0f

    private var cachedIdToken: String? = null
    private var cachedIdTokenExpiry = 0L

    private val executor = Executors.newSingleThreadExecutor()

    private var lastDebugLog = ""

    private fun dbg(msg: String) {
        Log.d("[VoquillKB]", msg)
        lastDebugLog = msg
    }

    private val audioFilePath: String
        get() = File(cacheDir, "voquill_kb.m4a").absolutePath

    override fun onCreateInputView(): View {
        val view = layoutInflater.inflate(R.layout.keyboard_view, null)

        keyboardBackground = view.findViewById(R.id.keyboard_background)
        waveformContainer = view.findViewById(R.id.waveform_container)
        pillButton = view.findViewById(R.id.pill_button)
        pillIcon = view.findViewById(R.id.pill_icon)
        pillLabel = view.findViewById(R.id.pill_label)
        globeButton = view.findViewById(R.id.globe_button)

        waveformView = AudioWaveformView(this).also {
            waveformContainer.addView(it, FrameLayout.LayoutParams(
                FrameLayout.LayoutParams.MATCH_PARENT,
                FrameLayout.LayoutParams.MATCH_PARENT
            ))
        }

        progressView = IndeterminateProgressView(this).also {
            it.alpha = 0f
            waveformContainer.addView(it, FrameLayout.LayoutParams(
                FrameLayout.LayoutParams.MATCH_PARENT,
                FrameLayout.LayoutParams.MATCH_PARENT
            ))
        }

        pillButton.setOnClickListener { onPillTap() }
        globeButton.setOnClickListener {
            val imm = getSystemService(INPUT_METHOD_SERVICE) as InputMethodManager
            @Suppress("DEPRECATION")
            imm.switchToNextInputMethod(window.window!!.attributes.token, false)
        }

        window.window?.decorView?.setBackgroundColor(Color.TRANSPARENT)
        window.window?.navigationBarColor = Color.TRANSPARENT

        waveformView?.startAnimating()
        applyPhase(Phase.IDLE)

        return view
    }

    override fun onConfigurationChanged(newConfig: Configuration) {
        super.onConfigurationChanged(newConfig)
        updateColorsForPhase()
    }

    private val isDarkMode: Boolean
        get() = (resources.configuration.uiMode and Configuration.UI_MODE_NIGHT_MASK) == Configuration.UI_MODE_NIGHT_YES

    private fun updateColorsForPhase() {
        applyPhase(currentPhase)
    }

    private fun applyPhase(phase: Phase) {
        currentPhase = phase
        val dark = isDarkMode
        val activeColor = if (dark) Color.WHITE else Color.BLACK
        val idleColor = if (dark) Color.argb(64, 255, 255, 255) else Color.argb(51, 0, 0, 0)
        val pillBg = pillButton.background as? GradientDrawable
            ?: (pillButton.background?.mutate() as? GradientDrawable)

        keyboardBackground.setBackgroundResource(
            if (dark) R.drawable.keyboard_background_dark else R.drawable.keyboard_background_light
        )
        val globeTint = if (dark) Color.argb(180, 255, 255, 255) else Color.argb(140, 0, 0, 0)
        globeButton.setColorFilter(globeTint)

        when (phase) {
            Phase.IDLE -> {
                waveformView?.alpha = 1f
                progressView?.alpha = 0f
                progressView?.stopAnimating()
                waveformView?.isActive = false
                waveformView?.waveColor = idleColor
                pillBg?.setColor(COLOR_BLUE)
                pillIcon.setImageResource(R.drawable.ic_mic)
                pillIcon.visibility = View.VISIBLE
                pillLabel.text = "Tap to dictate"
                pillButton.isClickable = true
            }
            Phase.RECORDING -> {
                waveformView?.alpha = 1f
                progressView?.alpha = 0f
                progressView?.stopAnimating()
                waveformView?.isActive = true
                waveformView?.waveColor = activeColor
                pillBg?.setColor(COLOR_RED)
                pillIcon.setImageResource(R.drawable.ic_stop)
                pillIcon.visibility = View.VISIBLE
                pillLabel.text = "Stop dictating"
                pillButton.isClickable = true
            }
            Phase.LOADING -> {
                waveformView?.alpha = 0f
                progressView?.alpha = 1f
                progressView?.barColor = activeColor
                progressView?.startAnimating()
                pillBg?.setColor(COLOR_GRAY)
                pillIcon.visibility = View.GONE
                pillLabel.text = "Loading..."
                pillButton.isClickable = false
            }
        }
    }

    private fun onPillTap() {
        when (currentPhase) {
            Phase.IDLE -> {
                if (checkSelfPermission(Manifest.permission.RECORD_AUDIO) != PackageManager.PERMISSION_GRANTED) {
                    currentInputConnection?.commitText("[Microphone permission not granted — open Voquill app to allow]", 1)
                    return
                }
                applyPhase(Phase.RECORDING)
                startAudioCapture()
            }
            Phase.RECORDING -> {
                stopAudioCapture()
                applyPhase(Phase.LOADING)
                handleTranscription()
            }
            Phase.LOADING -> {}
        }
    }

    private fun handleTranscription() {
        executor.execute {
            val idToken = fetchIdTokenSync()
            if (idToken == null) {
                handler.post {
                    currentInputConnection?.commitText("[Auth failed: $lastDebugLog]", 1)
                    applyPhase(Phase.IDLE)
                }
                return@execute
            }

            val text = transcribeAudioSync(idToken)
            handler.post {
                if (!text.isNullOrEmpty()) {
                    currentInputConnection?.commitText(text, 1)
                } else {
                    currentInputConnection?.commitText("[Transcribe failed: $lastDebugLog]", 1)
                }
                applyPhase(Phase.IDLE)
            }
        }
    }

    private fun fetchIdTokenSync(): String? {
        val cached = cachedIdToken
        if (cached != null && System.currentTimeMillis() < cachedIdTokenExpiry) {
            dbg("Using cached ID token")
            return cached
        }

        val prefs = getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        val apiRefreshToken = prefs.getString(KEY_API_REFRESH_TOKEN, null)
        val functionUrl = prefs.getString(KEY_FUNCTION_URL, null)
        val apiKey = prefs.getString(KEY_API_KEY, null)
        val authUrl = prefs.getString(KEY_AUTH_URL, null)

        val missing = listOfNotNull(
            if (apiRefreshToken == null) "apiRefreshToken" else null,
            if (functionUrl == null) "functionUrl" else null,
            if (apiKey == null) "apiKey" else null,
            if (authUrl == null) "authUrl" else null,
        )
        if (missing.isNotEmpty()) {
            dbg("Missing keys in SharedPreferences: ${missing.joinToString()}")
            return null
        }

        dbg("Step 1: refreshApiToken → $functionUrl")
        val customToken = refreshApiTokenSync(functionUrl!!, apiRefreshToken!!) ?: return null

        dbg("Step 2: exchangeCustomToken → $authUrl")
        val (idToken, expiresIn) = exchangeCustomTokenSync(authUrl!!, apiKey!!, customToken)
            ?: return null

        cachedIdToken = idToken
        cachedIdTokenExpiry = System.currentTimeMillis() + ((expiresIn - 300) * 1000).toLong()
        dbg("ID token acquired, expiresIn=${expiresIn}s")
        return idToken
    }

    private fun refreshApiTokenSync(functionUrl: String, apiRefreshToken: String): String? {
        return try {
            val url = URL(functionUrl)
            val conn = url.openConnection() as HttpURLConnection
            conn.requestMethod = "POST"
            conn.setRequestProperty("Content-Type", "application/json")
            conn.doOutput = true

            val payload = JSONObject().apply {
                put("data", JSONObject().apply {
                    put("name", "auth/refreshApiToken")
                    put("args", JSONObject().apply {
                        put("apiRefreshToken", apiRefreshToken)
                    })
                })
            }
            conn.outputStream.use { it.write(payload.toString().toByteArray()) }

            val status = conn.responseCode
            val body = (if (status in 200..299) conn.inputStream else conn.errorStream)
                .bufferedReader().readText()

            val json = JSONObject(body)
            val apiToken = json.getJSONObject("result").getString("apiToken")
            dbg("refreshApiToken: success, status=$status")
            apiToken
        } catch (e: Exception) {
            dbg("refreshApiToken: ${e.message}")
            null
        }
    }

    private fun exchangeCustomTokenSync(authUrl: String, apiKey: String, customToken: String): Pair<String, Double>? {
        return try {
            val url = URL("$authUrl/v1/accounts:signInWithCustomToken?key=$apiKey")
            val conn = url.openConnection() as HttpURLConnection
            conn.requestMethod = "POST"
            conn.setRequestProperty("Content-Type", "application/json")
            conn.doOutput = true

            val payload = JSONObject().apply {
                put("token", customToken)
                put("returnSecureToken", true)
            }
            conn.outputStream.use { it.write(payload.toString().toByteArray()) }

            val status = conn.responseCode
            val body = (if (status in 200..299) conn.inputStream else conn.errorStream)
                .bufferedReader().readText()

            val json = JSONObject(body)
            val idToken = json.getString("idToken")
            val expiresIn = json.getString("expiresIn").toDouble()
            dbg("exchangeCustomToken: success, status=$status")
            Pair(idToken, expiresIn)
        } catch (e: Exception) {
            dbg("exchangeCustomToken: ${e.message}")
            null
        }
    }

    private fun transcribeAudioSync(idToken: String): String? {
        return try {
            val audioFile = File(audioFilePath)
            if (!audioFile.exists() || audioFile.length() == 0L) {
                dbg("transcribeAudio: no audio data at $audioFilePath")
                return null
            }

            val audioBase64 = Base64.encodeToString(audioFile.readBytes(), Base64.NO_WRAP)
            val prefs = getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            val functionUrl = prefs.getString(KEY_FUNCTION_URL, null)
                ?: run { dbg("transcribeAudio: missing functionUrl"); return null }

            dbg("transcribeAudio: ${audioFile.length()} bytes → $functionUrl")

            val url = URL(functionUrl)
            val conn = url.openConnection() as HttpURLConnection
            conn.requestMethod = "POST"
            conn.setRequestProperty("Content-Type", "application/json")
            conn.setRequestProperty("Authorization", "Bearer $idToken")
            conn.doOutput = true

            val payload = JSONObject().apply {
                put("data", JSONObject().apply {
                    put("name", "ai/transcribeAudio")
                    put("args", JSONObject().apply {
                        put("audioBase64", audioBase64)
                        put("audioMimeType", "audio/mp4")
                    })
                })
            }
            conn.outputStream.use { it.write(payload.toString().toByteArray()) }

            val status = conn.responseCode
            val body = (if (status in 200..299) conn.inputStream else conn.errorStream)
                .bufferedReader().readText()

            val json = JSONObject(body)
            val text = json.getJSONObject("result").getString("text")
            dbg("transcribeAudio: success")
            text
        } catch (e: Exception) {
            dbg("transcribeAudio: ${e.message}")
            null
        }
    }

    private fun startAudioCapture() {
        smoothedLevel = 0f
        try {
            val file = File(audioFilePath)
            if (file.exists()) file.delete()

            mediaRecorder = MediaRecorder().apply {
                setAudioSource(MediaRecorder.AudioSource.MIC)
                setOutputFormat(MediaRecorder.OutputFormat.MPEG_4)
                setAudioEncoder(MediaRecorder.AudioEncoder.AAC)
                setAudioSamplingRate(44100)
                setAudioChannels(1)
                setOutputFile(audioFilePath)
                prepare()
                start()
            }

            val runnable = object : Runnable {
                override fun run() {
                    updateLevels()
                    handler.postDelayed(this, 30)
                }
            }
            levelRunnable = runnable
            handler.postDelayed(runnable, 30)
        } catch (e: Exception) {
            dbg("startAudioCapture: ${e.message}")
        }
    }

    private fun updateLevels() {
        val recorder = mediaRecorder ?: return
        try {
            val maxAmplitude = recorder.maxAmplitude
            val db = if (maxAmplitude > 0) 20 * Math.log10(maxAmplitude.toDouble()) else -50.0
            val clampedDb = max(db, -50.0)
            val normalized = ((clampedDb + 50) / 50).toFloat()
            val curved = normalized.pow(0.7f)

            val s = if (curved > smoothedLevel) 0.4f else 0.4f
            smoothedLevel += (curved - smoothedLevel) * s

            waveformView?.updateLevel(max(smoothedLevel, 0.08f))
        } catch (_: Exception) {}
    }

    private fun stopAudioCapture() {
        levelRunnable?.let { handler.removeCallbacks(it) }
        levelRunnable = null
        try {
            mediaRecorder?.stop()
            mediaRecorder?.release()
        } catch (_: Exception) {}
        mediaRecorder = null
    }

    override fun onDestroy() {
        super.onDestroy()
        stopAudioCapture()
        waveformView?.stopAnimating()
        progressView?.stopAnimating()
        executor.shutdownNow()
    }

    companion object {
        const val PREFS_NAME = "voquill_keyboard"
        const val KEY_API_REFRESH_TOKEN = "voquill_api_refresh_token"
        const val KEY_API_KEY = "voquill_api_key"
        const val KEY_FUNCTION_URL = "voquill_function_url"
        const val KEY_AUTH_URL = "voquill_auth_url"

        const val COLOR_BLUE = 0xFF3380FF.toInt()
        const val COLOR_RED = 0xFFFF3B30.toInt()
        const val COLOR_GRAY = 0xFF8E8E93.toInt()
    }

    private class WaveConfig(
        val frequency: Float,
        val multiplier: Float,
        val phaseOffset: Float,
        val opacity: Float,
    )

    // ========== AudioWaveformView ==========

    class AudioWaveformView(context: Context) : View(context) {

        private var phase = 0f
        private var currentLevel = 0f
        private var targetLevel = 0f

        private val basePhaseStep = 0.14f
        private val attackSmoothing = 0.25f
        private val decaySmoothing = 0.25f

        private val waveConfigs = listOf(
            WaveConfig(0.8f, 1.0f, 0f, 1.0f),
            WaveConfig(1.0f, 0.8f, 0.85f, 0.65f),
            WaveConfig(1.25f, 0.6f, 1.7f, 0.35f),
        )

        var waveColor: Int = Color.BLACK
            set(value) { field = value; invalidate() }

        var isActive: Boolean = false
            set(value) { field = value; if (!value) targetLevel = 0f }

        private val paint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
            style = Paint.Style.STROKE
            strokeWidth = 2.5f * resources.displayMetrics.density
            strokeCap = Paint.Cap.ROUND
            strokeJoin = Paint.Join.ROUND
        }

        private val fadePaint = Paint().apply {
            xfermode = PorterDuffXfermode(PorterDuff.Mode.DST_IN)
        }

        private var frameCallback: Choreographer.FrameCallback? = null

        fun startAnimating() {
            stopAnimating()
            val cb = object : Choreographer.FrameCallback {
                override fun doFrame(frameTimeNanos: Long) {
                    tick()
                    Choreographer.getInstance().postFrameCallback(this)
                }
            }
            frameCallback = cb
            Choreographer.getInstance().postFrameCallback(cb)
        }

        fun stopAnimating() {
            frameCallback?.let { Choreographer.getInstance().removeFrameCallback(it) }
            frameCallback = null
        }

        fun updateLevel(level: Float) {
            targetLevel = level
        }

        private fun tick() {
            val smoothing = if (targetLevel > currentLevel) attackSmoothing else decaySmoothing
            currentLevel += (targetLevel - currentLevel) * smoothing

            if (isActive) {
                phase += basePhaseStep + (currentLevel * 0.06f)
            }
            if (phase > Math.PI.toFloat() * 2) phase -= Math.PI.toFloat() * 2

            invalidate()
        }

        override fun onDraw(canvas: Canvas) {
            val w = width.toFloat()
            val h = height.toFloat()
            val mid = h / 2f

            val sc = canvas.saveLayer(0f, 0f, w, h, null)

            if (!isActive && currentLevel < 0.01f) {
                paint.color = waveColor
                paint.alpha = 255
                canvas.drawLine(0f, mid, w, mid, paint)
            } else {
                for (cfg in waveConfigs) {
                    val amp = h * 0.45f * currentLevel * cfg.multiplier
                    val segments = 60
                    paint.color = waveColor
                    paint.alpha = (cfg.opacity * 255).toInt()

                    var prevX = 0f
                    var prevY = mid + amp * sin(cfg.frequency * 0f * Math.PI.toFloat() * 2 + phase + cfg.phaseOffset)

                    for (i in 1..segments) {
                        val x = i.toFloat() / segments * w
                        val y = mid + amp * sin(cfg.frequency * (x / w) * Math.PI.toFloat() * 2 + phase + cfg.phaseOffset)
                        canvas.drawLine(prevX, prevY, x, y, paint)
                        prevX = x
                        prevY = y
                    }
                }
            }

            val fadeShader = LinearGradient(
                0f, 0f, w, 0f,
                intArrayOf(Color.TRANSPARENT, Color.WHITE, Color.WHITE, Color.TRANSPARENT),
                floatArrayOf(0f, 0.12f, 0.88f, 1f),
                Shader.TileMode.CLAMP
            )
            fadePaint.shader = fadeShader
            canvas.drawRect(0f, 0f, w, h, fadePaint)

            canvas.restoreToCount(sc)
        }
    }

    // ========== IndeterminateProgressView ==========

    class IndeterminateProgressView(context: Context) : View(context) {

        private var time = 0f
        private val cycleDuration = 1.8f

        var barColor: Int = Color.BLACK

        private val paint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
            style = Paint.Style.STROKE
            strokeWidth = 2.5f * resources.displayMetrics.density
            strokeCap = Paint.Cap.ROUND
        }

        private val fadePaint = Paint().apply {
            xfermode = PorterDuffXfermode(PorterDuff.Mode.DST_IN)
        }

        private var frameCallback: Choreographer.FrameCallback? = null

        fun startAnimating() {
            stopAnimating()
            time = 0f
            val cb = object : Choreographer.FrameCallback {
                override fun doFrame(frameTimeNanos: Long) {
                    time += 1f / 60f
                    if (time > cycleDuration) time -= cycleDuration
                    invalidate()
                    Choreographer.getInstance().postFrameCallback(this)
                }
            }
            frameCallback = cb
            Choreographer.getInstance().postFrameCallback(cb)
        }

        fun stopAnimating() {
            frameCallback?.let { Choreographer.getInstance().removeFrameCallback(it) }
            frameCallback = null
        }

        private fun easeInOut(t: Float): Float {
            return if (t < 0.5f) 2 * t * t else -1 + (4 - 2 * t) * t
        }

        override fun onDraw(canvas: Canvas) {
            val w = width.toFloat()
            val h = height.toFloat()
            val mid = h / 2f

            val sc = canvas.saveLayer(0f, 0f, w, h, null)

            paint.color = barColor
            paint.alpha = 38
            canvas.drawLine(0f, mid, w, mid, paint)

            val t = time / cycleDuration
            val headT = easeInOut(min(t * 1.2f, 1f))
            val head = -0.1f + headT * 1.2f
            val tailRaw = max((t - 0.2f) / 0.8f, 0f)
            val tailT = easeInOut(min(tailRaw, 1f))
            val tail = -0.1f + tailT * 1.2f

            val startX = tail * w
            val endX = head * w
            val clampedStart = max(0f, min(w, startX))
            val clampedEnd = max(0f, min(w, endX))

            if (clampedEnd > clampedStart + 1) {
                paint.color = barColor
                paint.alpha = 255
                canvas.drawLine(clampedStart, mid, clampedEnd, mid, paint)
            }

            val fadeShader = LinearGradient(
                0f, 0f, w, 0f,
                intArrayOf(Color.TRANSPARENT, Color.WHITE, Color.WHITE, Color.TRANSPARENT),
                floatArrayOf(0f, 0.12f, 0.88f, 1f),
                Shader.TileMode.CLAMP
            )
            fadePaint.shader = fadeShader
            canvas.drawRect(0f, 0f, w, h, fadePaint)

            canvas.restoreToCount(sc)
        }
    }
}
