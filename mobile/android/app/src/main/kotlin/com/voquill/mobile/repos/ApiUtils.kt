package com.voquill.mobile.repos

import android.util.Log
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL

data class HttpResponse(
    val status: Int,
    val body: String,
)

fun postJsonSync(
    urlString: String,
    payload: JSONObject,
    authorization: String? = null,
    extraHeaders: Map<String, String> = emptyMap(),
): HttpResponse? {
    return try {
        val url = URL(urlString)
        val conn = url.openConnection() as HttpURLConnection
        conn.requestMethod = "POST"
        conn.setRequestProperty("Content-Type", "application/json")
        if (!authorization.isNullOrBlank()) {
            conn.setRequestProperty("Authorization", authorization)
        }
        for ((key, value) in extraHeaders) {
            conn.setRequestProperty(key, value)
        }
        conn.doOutput = true
        conn.outputStream.use { it.write(payload.toString().toByteArray()) }

        val status = conn.responseCode
        val stream = if (status in 200..299) conn.inputStream else conn.errorStream
        val body = stream?.bufferedReader()?.use { it.readText() }.orEmpty()
        conn.disconnect()
        HttpResponse(status, body)
    } catch (e: Exception) {
        Log.w("VoquillRepo", "HTTP call failed: ${e.message}")
        null
    }
}

fun postBytesSync(
    urlString: String,
    data: ByteArray,
    contentType: String,
    headers: Map<String, String> = emptyMap(),
): HttpResponse? {
    return try {
        val url = URL(urlString)
        val conn = url.openConnection() as HttpURLConnection
        conn.requestMethod = "POST"
        conn.setRequestProperty("Content-Type", contentType)
        for ((key, value) in headers) {
            conn.setRequestProperty(key, value)
        }
        conn.doOutput = true
        conn.outputStream.use { it.write(data) }

        val status = conn.responseCode
        val stream = if (status in 200..299) conn.inputStream else conn.errorStream
        val body = stream?.bufferedReader()?.use { it.readText() }.orEmpty()
        conn.disconnect()
        HttpResponse(status, body)
    } catch (e: Exception) {
        Log.w("VoquillRepo", "HTTP call failed: ${e.message}")
        null
    }
}

fun invokeHandlerSync(
    config: RepoConfig,
    name: String,
    args: JSONObject,
): JSONObject? {
    return try {
        val response = postJsonSync(
            urlString = config.functionUrl,
            payload = JSONObject().apply {
                put("data", JSONObject().apply {
                    put("name", name)
                    put("args", args)
                })
            },
            authorization = "Bearer ${config.idToken}",
        ) ?: return null

        if (response.status !in 200..299) {
            Log.w("VoquillRepo", "$name failed: HTTP ${response.status} ${response.body.take(200)}")
            return null
        }

        val json = JSONObject(response.body)
        json.optJSONObject("result")
    } catch (e: Exception) {
        Log.w("VoquillRepo", "$name failed: ${e.message}")
        null
    }
}
