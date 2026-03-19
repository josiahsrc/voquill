package com.voquill.mobile

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
import org.json.JSONArray
import org.json.JSONObject
import java.io.ByteArrayOutputStream
import java.io.File
import java.net.HttpURLConnection
import java.net.URL
import java.util.Locale
import java.util.UUID
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
            val prefs = getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            val byokProvider = prefs.getString(KEY_BYOK_PROVIDER, null)
            val byokApiKey = prefs.getString(KEY_BYOK_API_KEY, null)

            if (!byokProvider.isNullOrEmpty() && (!byokApiKey.isNullOrEmpty() || byokProvider == "speaches")) {
                dbg("BYOK transcription via $byokProvider")
                var text = transcribeAudioByokSync()
                if (!text.isNullOrEmpty()) {
                    val processed = postProcessByokSync(text)
                    if (!processed.isNullOrEmpty()) {
                        text = processed
                    }
                }
                handler.post {
                    if (!text.isNullOrEmpty()) {
                        currentInputConnection?.commitText("$text ", 1)
                    } else {
                        currentInputConnection?.commitText("[BYOK transcribe failed: $lastDebugLog]", 1)
                    }
                    applyPhase(Phase.IDLE)
                }
                return@execute
            }

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

    private fun transcribeAudioByokSync(): String? {
        val audioFile = File(audioFilePath)
        if (!audioFile.exists() || audioFile.length() == 0L) {
            dbg("BYOK: no audio data at $audioFilePath")
            return null
        }

        val prefs = getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        val provider = prefs.getString(KEY_BYOK_PROVIDER, null) ?: return null
        val apiKey = prefs.getString(KEY_BYOK_API_KEY, null) ?: ""
        val baseUrl = prefs.getString(KEY_BYOK_BASE_URL, null) ?: ""
        val model = prefs.getString(KEY_BYOK_MODEL, null) ?: ""
        val language = Locale.getDefault().language

        dbg("BYOK: provider=$provider, audioSize=${audioFile.length()}")

        return try {
            when (provider) {
                "groq" -> transcribeMultipartWhisperSync(
                    url = "https://api.groq.com/openai/v1/audio/transcriptions",
                    apiKey = apiKey,
                    model = model.ifEmpty { "whisper-large-v3-turbo" },
                    language = language,
                    audioFile = audioFile,
                )
                "openai" -> transcribeMultipartWhisperSync(
                    url = "https://api.openai.com/v1/audio/transcriptions",
                    apiKey = apiKey,
                    model = model.ifEmpty { "whisper-1" },
                    language = language,
                    audioFile = audioFile,
                )
                "deepgram" -> transcribeDeepgramSync(apiKey, model, language, audioFile)
                "assemblyai" -> transcribeAssemblyAiSync(apiKey, audioFile)
                "elevenlabs" -> transcribeElevenLabsSync(apiKey, model, audioFile)
                "gemini" -> transcribeGeminiSync(apiKey, model, audioFile)
                "azure" -> transcribeAzureSync(apiKey, baseUrl, language, audioFile)
                "openai-compatible" -> transcribeMultipartWhisperSync(
                    url = "${baseUrl.trimEnd('/')}/v1/audio/transcriptions",
                    apiKey = apiKey,
                    model = model.ifEmpty { "whisper-1" },
                    language = language,
                    audioFile = audioFile,
                )
                "speaches" -> transcribeMultipartWhisperSync(
                    url = "${baseUrl.trimEnd('/')}/v1/audio/transcriptions",
                    apiKey = "",
                    model = model.ifEmpty { "whisper-1" },
                    language = language,
                    audioFile = audioFile,
                )
                else -> {
                    dbg("BYOK: unknown provider '$provider'")
                    null
                }
            }
        } catch (e: Exception) {
            dbg("BYOK: ${e.message}")
            null
        }
    }

    private fun transcribeMultipartWhisperSync(
        url: String,
        apiKey: String,
        model: String,
        language: String,
        audioFile: File,
    ): String? {
        val fields = mutableMapOf(
            "model" to model,
            "language" to language,
        )
        val body = postMultipartSync(
            url = url,
            headers = if (apiKey.isNotEmpty()) mapOf("Authorization" to "Bearer $apiKey") else emptyMap(),
            audioFile = audioFile,
            audioFieldName = "file",
            audioMimeType = "audio/mp4",
            audioFileName = "audio.m4a",
            textFields = fields,
        ) ?: return null

        val json = JSONObject(body)
        return json.getString("text")
    }

    private fun transcribeDeepgramSync(
        apiKey: String,
        model: String,
        language: String,
        audioFile: File,
    ): String? {
        val dgModel = model.ifEmpty { "nova-3" }
        val urlStr = "https://api.deepgram.com/v1/listen?model=$dgModel&smart_format=true&language=$language"
        val conn = URL(urlStr).openConnection() as HttpURLConnection
        conn.requestMethod = "POST"
        conn.setRequestProperty("Authorization", "Token $apiKey")
        conn.setRequestProperty("Content-Type", "audio/mp4")
        conn.doOutput = true

        conn.outputStream.use { it.write(audioFile.readBytes()) }

        val status = conn.responseCode
        val body = (if (status in 200..299) conn.inputStream else conn.errorStream)
            .bufferedReader().readText()

        if (status !in 200..299) {
            dbg("BYOK deepgram: HTTP $status — $body")
            return null
        }

        val json = JSONObject(body)
        return json.getJSONObject("results")
            .getJSONArray("channels").getJSONObject(0)
            .getJSONArray("alternatives").getJSONObject(0)
            .getString("transcript")
    }

    private fun transcribeAssemblyAiSync(apiKey: String, audioFile: File): String? {
        val uploadConn = URL("https://api.assemblyai.com/v2/upload").openConnection() as HttpURLConnection
        uploadConn.requestMethod = "POST"
        uploadConn.setRequestProperty("Authorization", apiKey)
        uploadConn.setRequestProperty("Content-Type", "application/octet-stream")
        uploadConn.doOutput = true
        uploadConn.outputStream.use { it.write(audioFile.readBytes()) }

        val uploadStatus = uploadConn.responseCode
        val uploadBody = (if (uploadStatus in 200..299) uploadConn.inputStream else uploadConn.errorStream)
            .bufferedReader().readText()
        if (uploadStatus !in 200..299) {
            dbg("BYOK assemblyai upload: HTTP $uploadStatus — $uploadBody")
            return null
        }
        val uploadUrl = JSONObject(uploadBody).getString("upload_url")

        val createConn = URL("https://api.assemblyai.com/v2/transcript").openConnection() as HttpURLConnection
        createConn.requestMethod = "POST"
        createConn.setRequestProperty("Authorization", apiKey)
        createConn.setRequestProperty("Content-Type", "application/json")
        createConn.doOutput = true
        val payload = JSONObject().apply { put("audio_url", uploadUrl) }
        createConn.outputStream.use { it.write(payload.toString().toByteArray()) }

        val createStatus = createConn.responseCode
        val createBody = (if (createStatus in 200..299) createConn.inputStream else createConn.errorStream)
            .bufferedReader().readText()
        if (createStatus !in 200..299) {
            dbg("BYOK assemblyai create: HTTP $createStatus — $createBody")
            return null
        }
        val transcriptId = JSONObject(createBody).getString("id")

        for (i in 0 until 60) {
            Thread.sleep(2000)
            val pollConn = URL("https://api.assemblyai.com/v2/transcript/$transcriptId")
                .openConnection() as HttpURLConnection
            pollConn.setRequestProperty("Authorization", apiKey)
            val pollStatus = pollConn.responseCode
            val pollBody = (if (pollStatus in 200..299) pollConn.inputStream else pollConn.errorStream)
                .bufferedReader().readText()
            val pollJson = JSONObject(pollBody)
            val status = pollJson.getString("status")
            if (status == "completed") return pollJson.getString("text")
            if (status == "error") {
                dbg("BYOK assemblyai: transcription error — ${pollJson.optString("error")}")
                return null
            }
        }
        dbg("BYOK assemblyai: polling timed out")
        return null
    }

    private fun transcribeElevenLabsSync(
        apiKey: String,
        model: String,
        audioFile: File,
    ): String? {
        val fields = mutableMapOf(
            "model_id" to model.ifEmpty { "scribe_v1" },
        )
        val body = postMultipartSync(
            url = "https://api.elevenlabs.io/v1/speech-to-text",
            headers = mapOf("xi-api-key" to apiKey),
            audioFile = audioFile,
            audioFieldName = "file",
            audioMimeType = "audio/mp4",
            audioFileName = "audio.m4a",
            textFields = fields,
        ) ?: return null

        return JSONObject(body).getString("text")
    }

    private fun transcribeGeminiSync(
        apiKey: String,
        model: String,
        audioFile: File,
    ): String? {
        val geminiModel = model.ifEmpty { "gemini-2.5-flash" }
        val urlStr = "https://generativelanguage.googleapis.com/v1beta/models/$geminiModel:generateContent?key=$apiKey"

        val audioBase64 = Base64.encodeToString(audioFile.readBytes(), Base64.NO_WRAP)

        val payload = JSONObject().apply {
            put("contents", JSONArray().put(JSONObject().apply {
                put("parts", JSONArray().apply {
                    put(JSONObject().apply {
                        put("inline_data", JSONObject().apply {
                            put("mime_type", "audio/mp4")
                            put("data", audioBase64)
                        })
                    })
                    put(JSONObject().apply {
                        put("text", "Transcribe this audio exactly as spoken. Output only the transcription text, nothing else.")
                    })
                })
            }))
        }

        val conn = URL(urlStr).openConnection() as HttpURLConnection
        conn.requestMethod = "POST"
        conn.setRequestProperty("Content-Type", "application/json")
        conn.doOutput = true
        conn.outputStream.use { it.write(payload.toString().toByteArray()) }

        val status = conn.responseCode
        val body = (if (status in 200..299) conn.inputStream else conn.errorStream)
            .bufferedReader().readText()

        if (status !in 200..299) {
            dbg("BYOK gemini: HTTP $status — $body")
            return null
        }

        val json = JSONObject(body)
        return json.getJSONArray("candidates")
            .getJSONObject(0)
            .getJSONObject("content")
            .getJSONArray("parts")
            .getJSONObject(0)
            .getString("text")
    }

    private fun transcribeAzureSync(
        apiKey: String,
        region: String,
        language: String,
        audioFile: File,
    ): String? {
        val azureRegion = region.ifEmpty { "eastus" }
        val azureLang = if (language.length == 2) "$language-${language.uppercase()}" else language
        val urlStr = "https://$azureRegion.stt.speech.microsoft.com/speech/recognition/conversation/cognitiveservices/v1?language=$azureLang"

        val conn = URL(urlStr).openConnection() as HttpURLConnection
        conn.requestMethod = "POST"
        conn.setRequestProperty("Ocp-Apim-Subscription-Key", apiKey)
        conn.setRequestProperty("Content-Type", "audio/mp4")
        conn.doOutput = true
        conn.outputStream.use { it.write(audioFile.readBytes()) }

        val status = conn.responseCode
        val body = (if (status in 200..299) conn.inputStream else conn.errorStream)
            .bufferedReader().readText()

        if (status !in 200..299) {
            dbg("BYOK azure: HTTP $status — $body")
            return null
        }

        val json = JSONObject(body)
        return json.getString("DisplayText")
    }

    private fun postMultipartSync(
        url: String,
        headers: Map<String, String>,
        audioFile: File,
        audioFieldName: String,
        audioMimeType: String,
        audioFileName: String,
        textFields: Map<String, String>,
    ): String? {
        val boundary = "----VoquillBoundary${UUID.randomUUID()}"
        val crlf = "\r\n"

        val bodyStream = ByteArrayOutputStream()

        for ((key, value) in textFields) {
            bodyStream.write("--$boundary$crlf".toByteArray())
            bodyStream.write("Content-Disposition: form-data; name=\"$key\"$crlf$crlf".toByteArray())
            bodyStream.write("$value$crlf".toByteArray())
        }

        bodyStream.write("--$boundary$crlf".toByteArray())
        bodyStream.write("Content-Disposition: form-data; name=\"$audioFieldName\"; filename=\"$audioFileName\"$crlf".toByteArray())
        bodyStream.write("Content-Type: $audioMimeType$crlf$crlf".toByteArray())
        bodyStream.write(audioFile.readBytes())
        bodyStream.write(crlf.toByteArray())
        bodyStream.write("--$boundary--$crlf".toByteArray())

        val requestBody = bodyStream.toByteArray()

        val conn = URL(url).openConnection() as HttpURLConnection
        conn.requestMethod = "POST"
        conn.setRequestProperty("Content-Type", "multipart/form-data; boundary=$boundary")
        for ((key, value) in headers) {
            conn.setRequestProperty(key, value)
        }
        conn.doOutput = true
        conn.outputStream.use { it.write(requestBody) }

        val status = conn.responseCode
        val responseBody = (if (status in 200..299) conn.inputStream else conn.errorStream)
            .bufferedReader().readText()

        if (status !in 200..299) {
            dbg("BYOK multipart $url: HTTP $status — $responseBody")
            return null
        }

        return responseBody
    }

    private fun postProcessByokSync(rawTranscript: String): String? {
        val prefs = getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        val ppProvider = prefs.getString(KEY_BYOK_PP_PROVIDER, null)
        val ppApiKey = prefs.getString(KEY_BYOK_PP_API_KEY, null)

        if (ppProvider.isNullOrEmpty() || ppApiKey.isNullOrEmpty()) return null

        val ppModel = prefs.getString(KEY_BYOK_PP_MODEL, null)
        val ppBaseUrl = prefs.getString(KEY_BYOK_PP_BASE_URL, null)

        return try {
            val systemPrompt = "You are a transcript rewriting assistant. Clean up the transcript for grammar, punctuation, and clarity while keeping the meaning identical. Return only the cleaned text, nothing else."
            val userPrompt = "Clean up this transcript:\n\n$rawTranscript"

            when (ppProvider) {
                "groq" -> chatCompletionSync(
                    url = "https://api.groq.com/openai/v1/chat/completions",
                    apiKey = ppApiKey,
                    model = ppModel ?: "llama-3.3-70b-versatile",
                    systemPrompt = systemPrompt,
                    userPrompt = userPrompt,
                )
                "openai" -> chatCompletionSync(
                    url = "https://api.openai.com/v1/chat/completions",
                    apiKey = ppApiKey,
                    model = ppModel ?: "gpt-4o-mini",
                    systemPrompt = systemPrompt,
                    userPrompt = userPrompt,
                )
                "gemini" -> geminiGenerateSync(
                    apiKey = ppApiKey,
                    model = ppModel ?: "gemini-2.5-flash",
                    systemPrompt = systemPrompt,
                    userPrompt = userPrompt,
                )
                "deepseek" -> chatCompletionSync(
                    url = "https://api.deepseek.com/v1/chat/completions",
                    apiKey = ppApiKey,
                    model = ppModel ?: "deepseek-chat",
                    systemPrompt = systemPrompt,
                    userPrompt = userPrompt,
                )
                "claude" -> claudeGenerateSync(
                    apiKey = ppApiKey,
                    model = ppModel ?: "claude-sonnet-4-5-20250514",
                    systemPrompt = systemPrompt,
                    userPrompt = userPrompt,
                )
                "openrouter" -> chatCompletionSync(
                    url = "https://openrouter.ai/api/v1/chat/completions",
                    apiKey = ppApiKey,
                    model = ppModel ?: "meta-llama/llama-3.3-70b-instruct",
                    systemPrompt = systemPrompt,
                    userPrompt = userPrompt,
                )
                "ollama" -> chatCompletionSync(
                    url = "${ppBaseUrl ?: "http://localhost:11434"}/v1/chat/completions",
                    apiKey = ppApiKey,
                    model = ppModel ?: "llama3",
                    systemPrompt = systemPrompt,
                    userPrompt = userPrompt,
                )
                "openai-compatible" -> chatCompletionSync(
                    url = "${ppBaseUrl ?: "https://api.openai.com"}/v1/chat/completions",
                    apiKey = ppApiKey,
                    model = ppModel ?: "gpt-4o-mini",
                    systemPrompt = systemPrompt,
                    userPrompt = userPrompt,
                )
                else -> null
            }
        } catch (e: Exception) {
            dbg("postProcess: ${e.message}")
            null
        }
    }

    private fun chatCompletionSync(
        url: String,
        apiKey: String,
        model: String,
        systemPrompt: String,
        userPrompt: String,
    ): String? {
        val conn = URL(url).openConnection() as HttpURLConnection
        conn.requestMethod = "POST"
        conn.setRequestProperty("Content-Type", "application/json")
        conn.setRequestProperty("Authorization", "Bearer $apiKey")
        conn.doOutput = true
        conn.connectTimeout = 30000
        conn.readTimeout = 60000

        val payload = JSONObject().apply {
            put("model", model)
            put("messages", JSONArray().apply {
                put(JSONObject().apply {
                    put("role", "system")
                    put("content", systemPrompt)
                })
                put(JSONObject().apply {
                    put("role", "user")
                    put("content", userPrompt)
                })
            })
        }
        conn.outputStream.use { it.write(payload.toString().toByteArray()) }

        val status = conn.responseCode
        val body = (if (status in 200..299) conn.inputStream else conn.errorStream)
            .bufferedReader().readText()
        conn.disconnect()

        if (status !in 200..299) {
            dbg("chatCompletion: HTTP $status")
            return null
        }

        val json = JSONObject(body)
        return json.getJSONArray("choices")
            .getJSONObject(0)
            .getJSONObject("message")
            .getString("content")
            .trim()
    }

    private fun geminiGenerateSync(
        apiKey: String,
        model: String,
        systemPrompt: String,
        userPrompt: String,
    ): String? {
        val url = URL("https://generativelanguage.googleapis.com/v1beta/models/$model:generateContent?key=$apiKey")
        val conn = url.openConnection() as HttpURLConnection
        conn.requestMethod = "POST"
        conn.setRequestProperty("Content-Type", "application/json")
        conn.doOutput = true
        conn.connectTimeout = 30000
        conn.readTimeout = 60000

        val payload = JSONObject().apply {
            put("system_instruction", JSONObject().apply {
                put("parts", JSONArray().apply {
                    put(JSONObject().apply { put("text", systemPrompt) })
                })
            })
            put("contents", JSONArray().apply {
                put(JSONObject().apply {
                    put("parts", JSONArray().apply {
                        put(JSONObject().apply { put("text", userPrompt) })
                    })
                })
            })
        }
        conn.outputStream.use { it.write(payload.toString().toByteArray()) }

        val status = conn.responseCode
        val body = (if (status in 200..299) conn.inputStream else conn.errorStream)
            .bufferedReader().readText()
        conn.disconnect()

        if (status !in 200..299) {
            dbg("geminiGenerate: HTTP $status")
            return null
        }

        val json = JSONObject(body)
        return json.getJSONArray("candidates")
            .getJSONObject(0)
            .getJSONObject("content")
            .getJSONArray("parts")
            .getJSONObject(0)
            .getString("text")
            .trim()
    }

    private fun claudeGenerateSync(
        apiKey: String,
        model: String,
        systemPrompt: String,
        userPrompt: String,
    ): String? {
        val url = URL("https://api.anthropic.com/v1/messages")
        val conn = url.openConnection() as HttpURLConnection
        conn.requestMethod = "POST"
        conn.setRequestProperty("Content-Type", "application/json")
        conn.setRequestProperty("x-api-key", apiKey)
        conn.setRequestProperty("anthropic-version", "2023-06-01")
        conn.doOutput = true
        conn.connectTimeout = 30000
        conn.readTimeout = 60000

        val payload = JSONObject().apply {
            put("model", model)
            put("max_tokens", 4096)
            put("system", systemPrompt)
            put("messages", JSONArray().apply {
                put(JSONObject().apply {
                    put("role", "user")
                    put("content", userPrompt)
                })
            })
        }
        conn.outputStream.use { it.write(payload.toString().toByteArray()) }

        val status = conn.responseCode
        val body = (if (status in 200..299) conn.inputStream else conn.errorStream)
            .bufferedReader().readText()
        conn.disconnect()

        if (status !in 200..299) {
            dbg("claudeGenerate: HTTP $status")
            return null
        }

        val json = JSONObject(body)
        return json.getJSONArray("content")
            .getJSONObject(0)
            .getString("text")
            .trim()
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

        const val KEY_BYOK_PROVIDER = "voquill_byok_provider"
        const val KEY_BYOK_API_KEY = "voquill_byok_api_key"
        const val KEY_BYOK_BASE_URL = "voquill_byok_base_url"
        const val KEY_BYOK_MODEL = "voquill_byok_model"

        const val KEY_BYOK_PP_PROVIDER = "voquill_byok_pp_provider"
        const val KEY_BYOK_PP_API_KEY = "voquill_byok_pp_api_key"
        const val KEY_BYOK_PP_BASE_URL = "voquill_byok_pp_base_url"
        const val KEY_BYOK_PP_MODEL = "voquill_byok_pp_model"

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
