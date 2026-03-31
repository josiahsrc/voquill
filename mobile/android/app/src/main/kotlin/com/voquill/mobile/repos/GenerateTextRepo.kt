package com.voquill.mobile.repos

import android.util.Log
import org.json.JSONArray
import org.json.JSONObject

abstract class BaseGenerateTextRepo {
    abstract fun generateTextSync(system: String?, prompt: String, jsonResponse: Boolean = false): String?
}

// MARK: - Cloud Implementation

class CloudGenerateTextRepo(
    private val config: RepoConfig,
) : BaseGenerateTextRepo() {

    override fun generateTextSync(system: String?, prompt: String, jsonResponse: Boolean): String? {
        return try {
            val args = JSONObject().apply {
                put("prompt", prompt)
                if (system != null) put("system", system)
                if (jsonResponse) put("jsonResponse", buildPostProcessingJsonSchema())
            }

            val result = invokeHandlerSync(
                config = config,
                name = "ai/generateText",
                args = args,
            ) ?: return null

            result.optString("text", "")
        } catch (e: Exception) {
            Log.w(TAG, "Cloud generate failed: ${e.message}")
            null
        }
    }

    companion object {
        private const val TAG = "CloudGenerateTextRepo"

        fun buildPostProcessingJsonSchema(): JSONObject {
            return JSONObject().apply {
                put("type", "object")
                put("properties", JSONObject().apply {
                    put("processedTranscription", JSONObject().apply {
                        put("type", "string")
                    })
                })
                put("required", JSONArray().apply {
                    put("processedTranscription")
                })
                put("additionalProperties", false)
            }
        }
    }
}

// MARK: - BYOK Implementation

class ByokGenerateTextRepo(
    private val apiKey: String,
    provider: String,
    baseUrl: String?,
) : BaseGenerateTextRepo() {

    private val apiUrl: String
    private val model: String

    init {
        when (provider) {
            "groq" -> {
                apiUrl = "https://api.groq.com/openai/v1/chat/completions"
                model = "llama-3.3-70b-versatile"
            }
            "deepseek" -> {
                apiUrl = "https://api.deepseek.com/chat/completions"
                model = "deepseek-chat"
            }
            "openRouter" -> {
                apiUrl = "https://openrouter.ai/api/v1/chat/completions"
                model = "openai/gpt-4o-mini"
            }
            "openaiCompatible" -> {
                val base = (baseUrl ?: "").trimEnd('/')
                apiUrl = "$base/chat/completions"
                model = "gpt-4o-mini"
            }
            else -> {
                apiUrl = "https://api.openai.com/v1/chat/completions"
                model = "gpt-4o-mini"
            }
        }
    }

    override fun generateTextSync(system: String?, prompt: String, jsonResponse: Boolean): String? {
        return try {
            val messages = JSONArray()
            if (!system.isNullOrBlank()) {
                messages.put(JSONObject().apply {
                    put("role", "system")
                    put("content", system)
                })
            }
            messages.put(JSONObject().apply {
                put("role", "user")
                put("content", prompt)
            })

            val payload = JSONObject().apply {
                put("model", model)
                put("messages", messages)
                if (jsonResponse) {
                    put("response_format", JSONObject().apply {
                        put("type", "json_object")
                    })
                }
            }

            val response = postJsonSync(
                urlString = apiUrl,
                payload = payload,
                authorization = "Bearer $apiKey",
            ) ?: return null

            if (response.status !in 200..299) {
                Log.w(TAG, "BYOK generate: HTTP ${response.status} ${response.body.take(200)}")
                return null
            }

            val json = JSONObject(response.body)
            val choices = json.optJSONArray("choices") ?: return null
            val first = choices.optJSONObject(0) ?: return null
            val message = first.optJSONObject("message") ?: return null
            message.optString("content", "")
        } catch (e: Exception) {
            Log.w(TAG, "BYOK generate failed: ${e.message}")
            null
        }
    }

    companion object {
        private const val TAG = "ByokGenerateTextRepo"
    }
}
