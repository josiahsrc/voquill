package com.voquill.mobile.repos

import android.util.Base64
import android.util.Log
import org.json.JSONObject
import java.io.File
import java.net.HttpURLConnection
import java.net.URL
import java.util.UUID

abstract class BaseTranscribeAudioRepo {
    var lastErrorMessage: String? = null
        protected set

    protected fun resetLastError() {
        lastErrorMessage = null
    }

    protected fun fail(message: String): String? {
        lastErrorMessage = message
        return null
    }

    abstract fun transcribeSync(audioFile: File, prompt: String, language: String): String?
}

data class TranscribeRepoBuildResult(
    val repo: BaseTranscribeAudioRepo?,
    val errorMessage: String? = null,
)

// MARK: - Cloud Implementation

class CloudTranscribeAudioRepo(
    private val config: RepoConfig,
) : BaseTranscribeAudioRepo() {

    override fun transcribeSync(audioFile: File, prompt: String, language: String): String? {
        resetLastError()
        return try {
            if (!audioFile.exists() || audioFile.length() == 0L) {
                Log.w(TAG, "No audio data at ${audioFile.absolutePath}")
                return null
            }

            val audioBase64 = Base64.encodeToString(audioFile.readBytes(), Base64.NO_WRAP)

            val result = invokeHandlerSync(
                config = config,
                name = "ai/transcribeAudio",
                args = JSONObject().apply {
                    put("audioBase64", audioBase64)
                    put("audioMimeType", "audio/mp4")
                    put("prompt", prompt)
                    put("language", language)
                },
            ) ?: return null

            result.optString("text", "")
        } catch (e: Exception) {
            Log.w(TAG, "Cloud transcribe failed: ${e.message}")
            null
        }
    }

    companion object {
        private const val TAG = "CloudTranscribeRepo"
    }
}

// MARK: - BYOK Implementation

class ByokTranscribeAudioRepo(
    private val apiKey: String,
    private val provider: String,
    baseUrl: String?,
    modelOverride: String?,
    private val azureRegion: String?,
) : BaseTranscribeAudioRepo() {

    private val apiUrl: String
    private val model: String

    init {
        when (provider) {
            "groq" -> {
                apiUrl = "https://api.groq.com/openai/v1/audio/transcriptions"
                model = modelOverride ?: "whisper-large-v3"
            }
            "speaches" -> {
                val base = (baseUrl ?: "").trimEnd('/')
                apiUrl = "$base/v1/audio/transcriptions"
                model = modelOverride ?: "whisper-large-v3"
            }
            "openaiCompatible" -> {
                val base = (baseUrl ?: "").trimEnd('/')
                apiUrl = "$base/audio/transcriptions"
                model = modelOverride ?: "whisper-1"
            }
            "ollama" -> {
                val base = (baseUrl ?: "http://localhost:11434").trimEnd('/')
                apiUrl = "$base/v1/audio/transcriptions"
                model = modelOverride ?: "whisper-1"
            }
            "gemini" -> {
                apiUrl = "" // handled in transcribeGemini
                model = modelOverride ?: "gemini-2.0-flash"
            }
            "azure" -> {
                apiUrl = "" // handled in transcribeAzure
                model = modelOverride ?: ""
            }
            else -> {
                apiUrl = "https://api.openai.com/v1/audio/transcriptions"
                model = modelOverride ?: "whisper-1"
            }
        }
    }

    override fun transcribeSync(audioFile: File, prompt: String, language: String): String? {
        resetLastError()
        return when (provider) {
            "gemini" -> transcribeGemini(audioFile, prompt, language)
            "azure" -> transcribeAzure(audioFile, language)
            else -> transcribeWhisperCompatible(audioFile, prompt, language)
        }
    }

    private fun transcribeWhisperCompatible(audioFile: File, prompt: String, language: String): String? {
        return try {
            if (!audioFile.exists() || audioFile.length() == 0L) {
                Log.w(TAG, "No audio data")
                return null
            }

            val boundary = UUID.randomUUID().toString()
            val url = URL(apiUrl)
            val conn = url.openConnection() as HttpURLConnection
            conn.requestMethod = "POST"
            conn.setRequestProperty("Authorization", "Bearer $apiKey")
            conn.setRequestProperty("Content-Type", "multipart/form-data; boundary=$boundary")
            conn.doOutput = true

            conn.outputStream.buffered().use { out ->
                fun writeField(name: String, value: String) {
                    out.write("--$boundary\r\n".toByteArray())
                    out.write("Content-Disposition: form-data; name=\"$name\"\r\n\r\n".toByteArray())
                    out.write("$value\r\n".toByteArray())
                }

                out.write("--$boundary\r\n".toByteArray())
                out.write("Content-Disposition: form-data; name=\"file\"; filename=\"audio.m4a\"\r\n".toByteArray())
                out.write("Content-Type: audio/mp4\r\n\r\n".toByteArray())
                out.write(audioFile.readBytes())
                out.write("\r\n".toByteArray())

                writeField("model", model)
                writeField("response_format", "text")
                if (prompt.isNotBlank()) writeField("prompt", prompt)
                if (language.isNotBlank() && language != "auto") writeField("language", language)

                out.write("--$boundary--\r\n".toByteArray())
            }

            val status = conn.responseCode
            val body = (if (status in 200..299) conn.inputStream else conn.errorStream)
                ?.bufferedReader()?.use { it.readText() }.orEmpty()
            conn.disconnect()

            if (status !in 200..299) {
                Log.w(TAG, "BYOK transcribe: HTTP $status ${body.take(200)}")
                return null
            }

            body.trim()
        } catch (e: Exception) {
            Log.w(TAG, "BYOK transcribe failed: ${e.message}")
            null
        }
    }

    private fun transcribeGemini(audioFile: File, prompt: String, language: String): String? {
        return try {
            if (!audioFile.exists() || audioFile.length() == 0L) {
                Log.w(TAG, "No audio data")
                return null
            }

            val audioBase64 = Base64.encodeToString(audioFile.readBytes(), Base64.NO_WRAP)
            val transcribePrompt = if (prompt.isNotBlank())
                "Transcribe this audio exactly. Use these terms if you hear them: $prompt. Output only the transcription text."
            else
                "Transcribe this audio exactly. Output only the transcription text."

            val payload = JSONObject().apply {
                put("contents", org.json.JSONArray().apply {
                    put(JSONObject().apply {
                        put("parts", org.json.JSONArray().apply {
                            put(JSONObject().apply {
                                put("inline_data", JSONObject().apply {
                                    put("mime_type", "audio/mp4")
                                    put("data", audioBase64)
                                })
                            })
                            put(JSONObject().apply {
                                put("text", transcribePrompt)
                            })
                        })
                    })
                })
            }

            val urlString = "https://generativelanguage.googleapis.com/v1beta/models/$model:generateContent?key=$apiKey"
            val response = postJsonSync(urlString = urlString, payload = payload) ?: return null

            if (response.status !in 200..299) {
                Log.w(TAG, "Gemini transcribe: HTTP ${response.status} ${response.body.take(200)}")
                return null
            }

            val json = JSONObject(response.body)
            val candidates = json.optJSONArray("candidates") ?: return null
            val content = candidates.optJSONObject(0)?.optJSONObject("content") ?: return null
            val parts = content.optJSONArray("parts") ?: return null
            parts.optJSONObject(0)?.optString("text", "")?.trim()
        } catch (e: Exception) {
            Log.w(TAG, "Gemini transcribe failed: ${e.message}")
            null
        }
    }

    private fun transcribeAzure(audioFile: File, language: String): String? {
        return try {
            if (!audioFile.exists() || audioFile.length() == 0L) {
                Log.w(TAG, "No audio data")
                return null
            }

            val region = azureRegion ?: "eastus"
            val lang = if (language.isBlank() || language == "auto") "en-US" else language
            val urlString = "https://$region.stt.speech.microsoft.com/speech/recognition/conversation/cognitiveservices/v1?language=$lang&format=detailed"

            val response = postBytesSync(
                urlString = urlString,
                data = audioFile.readBytes(),
                contentType = "audio/mp4",
                headers = mapOf(
                    "Ocp-Apim-Subscription-Key" to apiKey,
                    "Accept" to "application/json",
                ),
            ) ?: return null

            if (response.status !in 200..299) {
                Log.w(TAG, "Azure STT: HTTP ${response.status} ${response.body.take(200)}")
                return null
            }

            val json = JSONObject(response.body)
            json.optString("DisplayText", "").trim()
        } catch (e: Exception) {
            Log.w(TAG, "Azure STT failed: ${e.message}")
            null
        }
    }

    companion object {
        private const val TAG = "ByokTranscribeRepo"
    }
}
