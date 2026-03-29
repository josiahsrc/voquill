package com.voquill.mobile.repos

import android.util.Base64
import android.util.Log
import org.json.JSONObject
import java.io.File
import java.net.HttpURLConnection
import java.net.URL
import java.util.UUID

abstract class BaseTranscribeAudioRepo {
    abstract fun transcribeSync(audioFile: File, prompt: String, language: String): String?
}

// MARK: - Cloud Implementation

class CloudTranscribeAudioRepo(
    private val config: RepoConfig,
) : BaseTranscribeAudioRepo() {

    override fun transcribeSync(audioFile: File, prompt: String, language: String): String? {
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
    provider: String,
    baseUrl: String?,
) : BaseTranscribeAudioRepo() {

    private val apiUrl: String
    private val model: String

    init {
        when (provider) {
            "groq" -> {
                apiUrl = "https://api.groq.com/openai/v1/audio/transcriptions"
                model = "whisper-large-v3"
            }
            "speaches" -> {
                val base = (baseUrl ?: "").trimEnd('/')
                apiUrl = "$base/v1/audio/transcriptions"
                model = "whisper-large-v3"
            }
            "openaiCompatible" -> {
                val base = (baseUrl ?: "").trimEnd('/')
                apiUrl = "$base/audio/transcriptions"
                model = "whisper-1"
            }
            else -> {
                apiUrl = "https://api.openai.com/v1/audio/transcriptions"
                model = "whisper-1"
            }
        }
    }

    override fun transcribeSync(audioFile: File, prompt: String, language: String): String? {
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
                if (language.isNotBlank()) writeField("language", language)

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

    companion object {
        private const val TAG = "ByokTranscribeRepo"
    }
}
