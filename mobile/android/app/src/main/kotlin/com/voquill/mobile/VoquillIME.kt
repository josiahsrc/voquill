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
import android.view.Gravity
import android.view.MotionEvent
import android.view.View
import android.view.inputmethod.InputMethodManager
import android.widget.FrameLayout
import android.widget.ImageButton
import android.widget.TextView
import org.json.JSONArray
import org.json.JSONObject
import java.io.File
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import java.util.TimeZone
import java.util.UUID
import java.net.HttpURLConnection
import java.net.URL
import java.util.concurrent.Executors
import kotlin.math.max
import kotlin.math.min
import kotlin.math.pow
import kotlin.math.sin

class VoquillIME : InputMethodService() {

    enum class Phase { IDLE, RECORDING, LOADING }

    private data class SharedTone(
        val name: String,
        val promptTemplate: String,
    )

    private data class SharedTerm(
        val sourceValue: String,
        val isReplacement: Boolean,
    )

    private var currentPhase = Phase.IDLE

    private lateinit var keyboardBackground: FrameLayout
    private lateinit var waveformContainer: FrameLayout
    private lateinit var pillButton: FrameLayout
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
            val horizontalInset = (16 * resources.displayMetrics.density).toInt()
            waveformContainer.addView(
                it,
                FrameLayout.LayoutParams(
                    FrameLayout.LayoutParams.MATCH_PARENT,
                    (20 * resources.displayMetrics.density).toInt(),
                    Gravity.CENTER_VERTICAL,
                ).apply {
                    marginStart = horizontalInset
                    marginEnd = horizontalInset
                },
            )
        }

        pillButton.setOnTouchListener { v, event ->
            when (event.actionMasked) {
                MotionEvent.ACTION_DOWN -> v.animate().scaleX(0.95f).scaleY(0.95f).setDuration(100).start()
                MotionEvent.ACTION_UP, MotionEvent.ACTION_CANCEL -> {
                    v.animate().scaleX(1f).scaleY(1f).setDuration(150).start()
                }
            }
            false
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
        val activeColor = Color.WHITE
        val loadingColor = if (dark) COLOR_GRAY_DARK else COLOR_GRAY_LIGHT
        val pillBg = pillButton.background as? GradientDrawable
            ?: (pillButton.background?.mutate() as? GradientDrawable)

        keyboardBackground.setBackgroundResource(
            if (dark) R.drawable.keyboard_background_dark else R.drawable.keyboard_background_light
        )
        val globeTint = if (dark) Color.argb(180, 255, 255, 255) else Color.argb(140, 0, 0, 0)
        globeButton.setColorFilter(globeTint)

        when (phase) {
            Phase.IDLE -> {
                waveformView?.alpha = 0f
                progressView?.alpha = 0f
                progressView?.stopAnimating()
                waveformView?.isActive = false
                waveformView?.waveColor = activeColor
                pillBg?.setColor(COLOR_BLUE)
                pillLabel.text = "tap to dictate"
                pillLabel.alpha = 1f
                pillButton.isClickable = true
                pillButton.isEnabled = true
            }
            Phase.RECORDING -> {
                waveformView?.alpha = 1f
                progressView?.alpha = 0f
                progressView?.stopAnimating()
                waveformView?.isActive = true
                waveformView?.waveColor = activeColor
                pillBg?.setColor(COLOR_BLUE)
                pillLabel.alpha = 0f
                pillButton.isClickable = true
                pillButton.isEnabled = true
            }
            Phase.LOADING -> {
                waveformView?.alpha = 0f
                waveformView?.isActive = false
                progressView?.alpha = 1f
                progressView?.barColor = activeColor
                progressView?.startAnimating()
                pillBg?.setColor(loadingColor)
                pillLabel.text = "Processing..."
                pillLabel.alpha = 0f
                pillButton.isClickable = false
                pillButton.isEnabled = false
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
                if (!startAudioCapture()) {
                    currentInputConnection?.commitText("[Failed to start microphone: $lastDebugLog]", 1)
                    applyPhase(Phase.IDLE)
                    return
                }
                applyPhase(Phase.RECORDING)
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
        val prefs = getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        val functionUrl = prefs.getString(KEY_FUNCTION_URL, null)
        if (functionUrl.isNullOrBlank()) {
            currentInputConnection?.commitText("[Missing function URL]", 1)
            applyPhase(Phase.IDLE)
            return
        }

        val selectedToneId = prefs.getString(KEY_SELECTED_TONE_ID, null)
        val toneById = loadToneById(prefs)
        val termIds = loadStringList(prefs, KEY_TERM_IDS)
        val termById = loadTermById(prefs)
        val dictationLanguage = prefs.getString(KEY_DICTATION_LANGUAGE, "en") ?: "en"
        val userName = prefs.getString(KEY_USER_NAME, null) ?: "User"
        val prompt = buildLocalizedTranscriptionPrompt(
            termIds = termIds,
            termById = termById,
            userName = userName,
            language = dictationLanguage,
        )
        val whisperLanguage = mapDictationLanguageToWhisperLanguage(dictationLanguage)

        executor.execute {
            val idToken = fetchIdTokenSync()
            if (idToken == null) {
                handler.post {
                    currentInputConnection?.commitText("[Auth failed: $lastDebugLog]", 1)
                    applyPhase(Phase.IDLE)
                }
                return@execute
            }

            val rawTranscript = transcribeAudioSync(
                idToken = idToken,
                functionUrl = functionUrl,
                prompt = prompt,
                language = whisperLanguage,
            )
            if (rawTranscript.isNullOrBlank()) {
                handler.post {
                    currentInputConnection?.commitText("[Transcribe failed: $lastDebugLog]", 1)
                    applyPhase(Phase.IDLE)
                }
                return@execute
            }

            val selectedTone = selectedToneId?.let { toneById[it] }
            var finalText = rawTranscript
            if (selectedTone != null) {
                val processed = generateProcessedTranscriptionSync(
                    idToken = idToken,
                    functionUrl = functionUrl,
                    transcript = rawTranscript,
                    tonePromptTemplate = selectedTone.promptTemplate,
                    userName = userName,
                    dictationLanguage = dictationLanguage,
                )
                if (!processed.isNullOrBlank()) {
                    finalText = processed
                }
            }

            val cleanText = finalText.trim()
            if (cleanText.isEmpty()) {
                handler.post {
                    applyPhase(Phase.IDLE)
                }
                return@execute
            }

            incrementWordCountSync(
                idToken = idToken,
                functionUrl = functionUrl,
                text = cleanText,
            )
            saveTranscription(
                prefs = prefs,
                text = cleanText,
                rawTranscript = rawTranscript,
                toneId = selectedToneId,
                toneName = selectedTone?.name,
            )

            val committedText = "$cleanText "
            handler.post {
                currentInputConnection?.commitText(committedText, 1)
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

    private fun transcribeAudioSync(
        idToken: String,
        functionUrl: String,
        prompt: String,
        language: String,
    ): String? {
        return try {
            val audioFile = File(audioFilePath)
            if (!audioFile.exists() || audioFile.length() == 0L) {
                dbg("transcribeAudio: no audio data at $audioFilePath")
                return null
            }

            val audioBase64 = Base64.encodeToString(audioFile.readBytes(), Base64.NO_WRAP)

            dbg("transcribeAudio: ${audioFile.length()} bytes → $functionUrl")

            val result = invokeHandlerSync(
                functionUrl = functionUrl,
                idToken = idToken,
                name = "ai/transcribeAudio",
                args = JSONObject().apply {
                    put("audioBase64", audioBase64)
                    put("audioMimeType", "audio/mp4")
                    put("prompt", prompt)
                    put("language", language)
                },
            ) ?: return null
            val text = result.optString("text", "")
            dbg("transcribeAudio: success")
            text
        } catch (e: Exception) {
            dbg("transcribeAudio: ${e.message}")
            null
        }
    }

    private fun generateProcessedTranscriptionSync(
        idToken: String,
        functionUrl: String,
        transcript: String,
        tonePromptTemplate: String,
        userName: String,
        dictationLanguage: String,
    ): String? {
        return try {
            val result = invokeHandlerSync(
                functionUrl = functionUrl,
                idToken = idToken,
                name = "ai/generateText",
                args = JSONObject().apply {
                    put("system", buildSystemPostProcessingPrompt())
                    put(
                        "prompt",
                        buildPostProcessingPrompt(
                            transcript = transcript,
                            tonePromptTemplate = tonePromptTemplate,
                            userName = userName,
                            dictationLanguage = dictationLanguage,
                        ),
                    )
                    put("jsonResponse", buildPostProcessingJsonResponse())
                },
            ) ?: return null
            val text = result.optString("text", "")
            val parsed = try {
                JSONObject(text).optString("processedTranscription", "")
            } catch (_: Exception) {
                ""
            }
            if (parsed.isNotBlank()) {
                parsed.trim()
            } else {
                dbg("Could not parse processedTranscription from JSON, using raw")
                text.trim()
            }
        } catch (e: Exception) {
            dbg("Post-processing failed, using raw transcript: ${e.message}")
            null
        }
    }

    private fun incrementWordCountSync(idToken: String, functionUrl: String, text: String) {
        try {
            val wordCount = text.split(Regex("\\s+")).filter { it.isNotBlank() }.size
            if (wordCount <= 0) {
                return
            }

            invokeHandlerSync(
                functionUrl = functionUrl,
                idToken = idToken,
                name = "user/incrementWordCount",
                args = JSONObject().apply {
                    put("wordCount", wordCount)
                    put("timezone", TimeZone.getDefault().id)
                },
            )
        } catch (e: Exception) {
            dbg("incrementWordCount failed: ${e.message}")
        }
    }

    private fun saveTranscription(
        prefs: android.content.SharedPreferences,
        text: String,
        rawTranscript: String,
        toneId: String?,
        toneName: String?,
    ) {
        val id = UUID.randomUUID().toString()
        val record = JSONObject().apply {
            put("id", id)
            put("text", text)
            put("rawTranscript", rawTranscript)
            put("createdAt", isoTimestampNow())
            if (!toneId.isNullOrBlank()) put("toneId", toneId)
            if (!toneName.isNullOrBlank()) put("toneName", toneName)
        }

        val audioSource = File(audioFilePath)
        if (audioSource.exists() && audioSource.length() > 0L) {
            val audioDir = File(filesDir, "keyboard_audio")
            if (!audioDir.exists()) {
                audioDir.mkdirs()
            }
            val destination = File(audioDir, "$id.m4a")
            try {
                audioSource.copyTo(destination, overwrite = true)
                record.put("audioPath", destination.absolutePath)
            } catch (e: Exception) {
                dbg("Failed to copy audio: ${e.message}")
            }
        }

        val existing = loadJsonArray(prefs, KEY_TRANSCRIPTIONS)
        val merged = JSONArray()
        merged.put(record)

        val keepOldCount = max(0, MAX_TRANSCRIPTION_ENTRIES - 1)
        val kept = min(existing.length(), keepOldCount)
        for (i in 0 until kept) {
            merged.put(existing.opt(i))
        }

        for (i in keepOldCount until existing.length()) {
            val old = existing.optJSONObject(i) ?: continue
            val oldAudioPath = old.optString("audioPath", "")
            if (oldAudioPath.isNotBlank()) {
                File(oldAudioPath).delete()
            }
        }

        prefs
            .edit()
            .putString(KEY_TRANSCRIPTIONS, merged.toString())
            .putInt(KEY_APP_UPDATE_COUNTER, prefs.getInt(KEY_APP_UPDATE_COUNTER, 0) + 1)
            .apply()
    }

    private fun invokeHandlerSync(
        functionUrl: String,
        idToken: String,
        name: String,
        args: JSONObject,
    ): JSONObject? {
        return try {
            val response = postJsonSync(
                urlString = functionUrl,
                payload = JSONObject().apply {
                    put(
                        "data",
                        JSONObject().apply {
                            put("name", name)
                            put("args", args)
                        },
                    )
                },
                authorization = "Bearer $idToken",
            ) ?: return null

            if (response.status !in 200..299) {
                dbg("$name failed: HTTP ${response.status} ${response.body.take(200)}")
                return null
            }

            val json = JSONObject(response.body)
            val result = json.optJSONObject("result")
            if (result == null) {
                dbg("$name failed: invalid response")
                return null
            }
            result
        } catch (e: Exception) {
            dbg("$name failed: ${e.message}")
            null
        }
    }

    private data class HttpResponse(
        val status: Int,
        val body: String,
    )

    private fun postJsonSync(
        urlString: String,
        payload: JSONObject,
        authorization: String? = null,
    ): HttpResponse? {
        return try {
            val url = URL(urlString)
            val conn = url.openConnection() as HttpURLConnection
            conn.requestMethod = "POST"
            conn.setRequestProperty("Content-Type", "application/json")
            if (!authorization.isNullOrBlank()) {
                conn.setRequestProperty("Authorization", authorization)
            }
            conn.doOutput = true
            conn.outputStream.use { it.write(payload.toString().toByteArray()) }

            val status = conn.responseCode
            val stream = if (status in 200..299) conn.inputStream else conn.errorStream
            val body = stream?.bufferedReader()?.use { it.readText() }.orEmpty()
            conn.disconnect()
            HttpResponse(status, body)
        } catch (e: Exception) {
            dbg("HTTP call failed: ${e.message}")
            null
        }
    }

    private fun loadJsonArray(prefs: android.content.SharedPreferences, key: String): JSONArray {
        val raw = prefs.getString(key, null) ?: return JSONArray()
        return try {
            JSONArray(raw)
        } catch (_: Exception) {
            JSONArray()
        }
    }

    private fun loadStringList(prefs: android.content.SharedPreferences, key: String): List<String> {
        val array = loadJsonArray(prefs, key)
        val out = ArrayList<String>(array.length())
        for (i in 0 until array.length()) {
            out.add(array.optString(i))
        }
        return out
    }

    private fun loadToneById(prefs: android.content.SharedPreferences): Map<String, SharedTone> {
        val raw = prefs.getString(KEY_TONE_BY_ID, null) ?: return emptyMap()
        return try {
            val root = JSONObject(raw)
            val out = HashMap<String, SharedTone>()
            val keys = root.keys()
            while (keys.hasNext()) {
                val toneId = keys.next()
                val toneJson = root.optJSONObject(toneId) ?: continue
                val name = toneJson.optString("name", "")
                val promptTemplate = toneJson.optString("promptTemplate", "")
                if (name.isNotBlank() && promptTemplate.isNotBlank()) {
                    out[toneId] = SharedTone(name, promptTemplate)
                }
            }
            out
        } catch (_: Exception) {
            emptyMap()
        }
    }

    private fun loadTermById(prefs: android.content.SharedPreferences): Map<String, SharedTerm> {
        val raw = prefs.getString(KEY_TERM_BY_ID, null) ?: return emptyMap()
        return try {
            val root = JSONObject(raw)
            val out = HashMap<String, SharedTerm>()
            val keys = root.keys()
            while (keys.hasNext()) {
                val termId = keys.next()
                val termJson = root.optJSONObject(termId) ?: continue
                val sourceValue = termJson.optString("sourceValue", "")
                if (sourceValue.isBlank()) {
                    continue
                }
                val isReplacement = termJson.optBoolean("isReplacement", false)
                out[termId] = SharedTerm(sourceValue = sourceValue, isReplacement = isReplacement)
            }
            out
        } catch (_: Exception) {
            emptyMap()
        }
    }

    private fun buildTranscriptionPrompt(
        termIds: List<String>,
        termById: Map<String, SharedTerm>,
        userName: String,
    ): String {
        val glossary = ArrayList<String>()
        glossary.add("Voquill")
        glossary.add(userName)
        for (termId in termIds) {
            val term = termById[termId] ?: continue
            if (term.isReplacement) continue
            val sanitized = term.sourceValue
                .replace("\u0000", "")
                .replace(Regex("\\s+"), " ")
                .trim()
            if (sanitized.isNotEmpty()) {
                glossary.add(sanitized)
            }
        }
        return "Glossary: ${glossary.joinToString(", ")}\n" +
            "Consider this glossary when transcribing. Do not mention these rules; simply return the cleaned transcript."
    }

    private fun buildLocalizedTranscriptionPrompt(
        termIds: List<String>,
        termById: Map<String, SharedTerm>,
        userName: String,
        language: String,
    ): String {
        val base = buildTranscriptionPrompt(termIds, termById, userName)
        return when (language) {
            "zh-CN" -> "以下是普通话的句子。\n\n$base"
            "zh-TW", "zh-HK" -> "以下是普通話的句子。\n\n$base"
            else -> base
        }
    }

    private fun mapDictationLanguageToWhisperLanguage(language: String): String {
        return language.substringBefore("-")
    }

    private fun isoTimestampNow(): String {
        val formatter = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSSXXX", Locale.US)
        formatter.timeZone = TimeZone.getDefault()
        return formatter.format(Date())
    }

    private fun buildSystemPostProcessingPrompt(): String {
        return "You are a transcript rewriting assistant. You modify the style and tone of the transcript " +
            "while keeping the subject matter the same. Your response MUST be in JSON format with ONLY a " +
            "single field 'processedTranscription' that contains the rewritten transcript."
    }

    private fun buildPostProcessingPrompt(
        transcript: String,
        tonePromptTemplate: String,
        userName: String,
        dictationLanguage: String,
    ): String {
        return """
            Your task is to post-process a transcription.

            Context:
            - The speaker's name is $userName.
            - The speaker wants the processed transcription to be in the $dictationLanguage language.

            Instructions:
            ```
            $tonePromptTemplate
            ```

            Here is the transcript that you need to process:
            ```
            $transcript
            ```

            Post-process transcription according to the instructions.

            **CRITICAL** Your response MUST be in JSON format.
        """.trimIndent()
    }

    private fun buildPostProcessingJsonResponse(): JSONObject {
        return JSONObject().apply {
            put("name", "transcription_cleaning")
            put("description", "JSON response with the processed transcription")
            put(
                "schema",
                JSONObject().apply {
                    put("type", "object")
                    put(
                        "properties",
                        JSONObject().apply {
                            put(
                                "processedTranscription",
                                JSONObject().apply {
                                    put("type", "string")
                                    put(
                                        "description",
                                        "The processed version of the transcript. Empty if no transcript.",
                                    )
                                },
                            )
                        },
                    )
                    put("required", JSONArray().put("processedTranscription"))
                    put("additionalProperties", false)
                },
            )
        }
    }

    private fun startAudioCapture(): Boolean {
        smoothedLevel = 0f
        return try {
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
            true
        } catch (e: Exception) {
            dbg("startAudioCapture: ${e.message}")
            false
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

    override fun onFinishInput() {
        super.onFinishInput()
        if (currentPhase == Phase.RECORDING) {
            stopAudioCapture()
            applyPhase(Phase.IDLE)
        }
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
        const val KEY_USER_NAME = "voquill_user_name"
        const val KEY_DICTATION_LANGUAGE = "voquill_dictation_language"
        const val KEY_DICTATION_LANGUAGES = "voquill_dictation_languages"
        const val KEY_SELECTED_TONE_ID = "voquill_selected_tone_id"
        const val KEY_ACTIVE_TONE_IDS = "voquill_active_tone_ids"
        const val KEY_TONE_BY_ID = "voquill_tone_by_id"
        const val KEY_TERM_IDS = "voquill_term_ids"
        const val KEY_TERM_BY_ID = "voquill_term_by_id"
        const val KEY_TRANSCRIPTIONS = "voquill_transcriptions"
        const val KEY_MIXPANEL_UID = "voquill_mixpanel_uid"
        const val KEY_MIXPANEL_TOKEN = "voquill_mixpanel_token"
        const val KEY_APP_UPDATE_COUNTER = "voquill_app_update_counter"
        const val KEY_KEYBOARD_UPDATE_COUNTER = "voquill_keyboard_update_counter"

        const val COLOR_BLUE = 0xFF3380FF.toInt()
        const val COLOR_GRAY_LIGHT = 0xFFC7C7CC.toInt()
        const val COLOR_GRAY_DARK = 0xFF48484A.toInt()
        const val MAX_TRANSCRIPTION_ENTRIES = 50
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

        private val basePhaseStep = 0.18f
        private val attackSmoothing = 0.3f
        private val decaySmoothing = 0.12f

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
