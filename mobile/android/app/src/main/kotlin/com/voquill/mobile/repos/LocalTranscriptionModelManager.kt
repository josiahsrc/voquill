package com.voquill.mobile.repos

import android.content.SharedPreferences
import com.voquill.mobile.VoquillIME
import org.json.JSONObject
import java.io.File
import java.io.IOException
import java.net.HttpURLConnection
import java.net.URL

internal data class LocalTranscriptionModelDefinition(
    val slug: String,
    val label: String,
    val helper: String,
    val sizeBytes: Long,
    val languageSupport: String,
    val filename: String,
    val downloadUrl: String,
)

internal data class LocalTranscriptionModelState(
    val slug: String,
    val label: String,
    val helper: String,
    val sizeBytes: Long,
    val languageSupport: String,
    val downloaded: Boolean,
    val valid: Boolean,
    val selected: Boolean,
    val validationError: String?,
) {
    fun toChannelMap(): Map<String, Any> =
        buildMap {
            put("slug", slug)
            put("label", label)
            put("helper", helper)
            put("sizeBytes", sizeBytes)
            put("languageSupport", languageSupport)
            put("downloaded", downloaded)
            put("valid", valid)
            put("selected", selected)
            validationError?.let { put("validationError", it) }
        }
}

internal fun interface LocalTranscriptionModelDownloader {
    @Throws(IOException::class)
    fun download(
        url: String,
        destination: File,
    )
}

private data class LocalTranscriptionModelManifestEntry(
    val slug: String,
    val filename: String,
    val downloadUrl: String,
    val fileSizeBytes: Long,
    val downloadedAtEpochMs: Long,
    val downloaded: Boolean,
    val valid: Boolean,
    val selected: Boolean,
    val validationError: String?,
)

private data class LocalTranscriptionModelValidation(
    val downloaded: Boolean,
    val valid: Boolean,
    val selected: Boolean,
    val validationError: String?,
    val manifestEntry: LocalTranscriptionModelManifestEntry?,
)

private class HttpLocalTranscriptionModelDownloader : LocalTranscriptionModelDownloader {
    override fun download(
        url: String,
        destination: File,
    ) {
        val connection = URL(url).openConnection() as HttpURLConnection
        connection.requestMethod = "GET"
        connection.connectTimeout = 15_000
        connection.readTimeout = 120_000
        connection.instanceFollowRedirects = true

        try {
            if (connection.responseCode !in 200..299) {
                throw IOException("Model download failed with HTTP ${connection.responseCode}")
            }

            val contentType = connection.contentType?.lowercase()
            if (contentType != null &&
                (contentType.startsWith("text/") || contentType.contains("html"))
            ) {
                throw IOException("Model download returned unexpected content type: $contentType")
            }

            destination.parentFile?.mkdirs()
            connection.inputStream.buffered().use { input ->
                destination.outputStream().buffered().use { output ->
                    input.copyTo(output)
                }
            }

            val expectedBytes = connection.contentLengthLong
            if (expectedBytes > 0L && destination.length() != expectedBytes) {
                throw IOException("Downloaded model file is incomplete")
            }
        } finally {
            connection.disconnect()
        }
    }
}

internal class LocalTranscriptionModelManager(
    private val appFilesDir: File,
    private val downloader: LocalTranscriptionModelDownloader = HttpLocalTranscriptionModelDownloader(),
    private val clock: () -> Long = System::currentTimeMillis,
) {
    companion object {
        internal val supportedModels =
            listOf(
                LocalTranscriptionModelDefinition(
                    slug = "tiny",
                    label = "Whisper Tiny (77 MB)",
                    helper = "Fastest, lowest accuracy",
                    sizeBytes = 77_000_000,
                    languageSupport = "multilingual",
                    filename = "ggml-tiny.bin",
                    downloadUrl = "https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-tiny.bin",
                ),
                LocalTranscriptionModelDefinition(
                    slug = "base",
                    label = "Whisper Base (148 MB)",
                    helper = "Great balance of speed and accuracy",
                    sizeBytes = 148_000_000,
                    languageSupport = "multilingual",
                    filename = "ggml-base.bin",
                    downloadUrl = "https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-base.bin",
                ),
                LocalTranscriptionModelDefinition(
                    slug = "small",
                    label = "Whisper Small (488 MB)",
                    helper = "Recommended with GPU acceleration",
                    sizeBytes = 488_000_000,
                    languageSupport = "multilingual",
                    filename = "ggml-small.bin",
                    downloadUrl = "https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-small.bin",
                ),
                LocalTranscriptionModelDefinition(
                    slug = "medium",
                    label = "Whisper Medium (1.53 GB)",
                    helper = "Balanced quality and speed",
                    sizeBytes = 1_530_000_000,
                    languageSupport = "multilingual",
                    filename = "ggml-medium.bin",
                    downloadUrl = "https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-medium.bin",
                ),
                LocalTranscriptionModelDefinition(
                    slug = "turbo",
                    label = "Whisper Large v3 Turbo (1.6 GB)",
                    helper = "Fast large model, great accuracy",
                    sizeBytes = 1_600_000_000,
                    languageSupport = "multilingual",
                    filename = "ggml-large-v3-turbo.bin",
                    downloadUrl = "https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-large-v3-turbo.bin",
                ),
                LocalTranscriptionModelDefinition(
                    slug = "large",
                    label = "Whisper Large v3 (3.1 GB)",
                    helper = "Highest accuracy, requires GPU",
                    sizeBytes = 3_100_000_000,
                    languageSupport = "multilingual",
                    filename = "ggml-large-v3.bin",
                    downloadUrl = "https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-large-v3.bin",
                ),
            )

        private const val MANIFEST_VERSION = 1
        private val supportedModelsBySlug = supportedModels.associateBy { it.slug }
    }

    private val modelsDirectory = File(appFilesDir, "models")
    private val manifestFile = File(modelsDirectory, "manifest.json")
    private val manifestLock = Any()
    private val activeDownloads = mutableSetOf<String>()

    fun listModels(prefs: SharedPreferences): List<LocalTranscriptionModelState> =
        synchronized(manifestLock) {
            val manifestEntries = normalizeManifestEntries(loadManifestEntries(), prefs)

            supportedModels.map { definition ->
                val manifestEntry = manifestEntries[definition.slug]
                LocalTranscriptionModelState(
                    slug = definition.slug,
                    label = definition.label,
                    helper = definition.helper,
                    sizeBytes = definition.sizeBytes,
                    languageSupport = definition.languageSupport,
                    downloaded = manifestEntry?.downloaded == true,
                    valid = manifestEntry?.valid == true,
                    selected = manifestEntry?.selected == true,
                    validationError = manifestEntry?.validationError,
                )
            }
        }

    @Throws(IOException::class)
    fun downloadModel(slug: String): Boolean {
        val definition = supportedModelsBySlug[slug] ?: return false
        val destination = modelFileFor(definition)
        val tempFile = File(modelsDirectory, "${definition.filename}.download")

        synchronized(manifestLock) {
            ensureModelsDirectory()
            if (!activeDownloads.add(slug)) {
                throw IOException("Model download already in progress")
            }
            tempFile.delete()
        }

        try {
            downloader.download(definition.downloadUrl, tempFile)
            val fileSize = tempFile.length()
            if (fileSize <= 0L) {
                throw IOException("Downloaded model file is empty")
            }
            if (fileSize < 1_000_000L) {
                throw IOException("Downloaded model file is unexpectedly small")
            }

            synchronized(manifestLock) {
                if (destination.exists() && !destination.delete()) {
                    throw IOException("Failed to replace existing model file")
                }
                moveFile(tempFile, destination)

                val manifestEntries = loadManifestEntries()
                manifestEntries[slug] =
                    LocalTranscriptionModelManifestEntry(
                        slug = slug,
                        filename = definition.filename,
                        downloadUrl = definition.downloadUrl,
                        fileSizeBytes = fileSize,
                        downloadedAtEpochMs = clock(),
                        downloaded = true,
                        valid = true,
                        selected = false,
                        validationError = null,
                    )
                saveManifestEntries(manifestEntries)
            }
            return true
        } catch (error: Exception) {
            synchronized(manifestLock) {
                tempFile.delete()
                destination.takeIf { it.exists() && it.length() == 0L }?.delete()
            }
            if (error is IOException) {
                throw error
            }
            throw IOException("Failed to download local transcription model", error)
        } finally {
            synchronized(manifestLock) {
                activeDownloads.remove(slug)
            }
        }
    }

    @Throws(IOException::class)
    fun deleteModel(
        prefs: SharedPreferences,
        slug: String,
    ): Boolean =
        synchronized(manifestLock) {
            val definition = supportedModelsBySlug[slug] ?: return false
            if (activeDownloads.contains(slug)) {
                throw IOException("Model download already in progress")
            }
            val modelFile = modelFileFor(definition)
            if (modelFile.exists() && !modelFile.delete()) {
                throw IOException("Failed to delete local model file")
            }

            val partialFile = File(modelsDirectory, "${definition.filename}.download")
            if (partialFile.exists() && !partialFile.delete()) {
                throw IOException("Failed to delete temporary model file")
            }

            if (prefs.getString(VoquillIME.KEY_AI_TRANSCRIPTION_MODEL, null) == slug) {
                prefs.edit().remove(VoquillIME.KEY_AI_TRANSCRIPTION_MODEL).apply()
            }

            val manifestEntries = loadManifestEntries()
            manifestEntries.remove(slug)
            saveManifestEntries(manifestEntries)
            normalizeManifestEntries(manifestEntries, prefs)
            true
        }

    fun clearSelection(prefs: SharedPreferences? = null) {
        synchronized(manifestLock) {
            prefs?.edit()?.remove(VoquillIME.KEY_AI_TRANSCRIPTION_MODEL)?.apply()
            val manifestEntries = loadManifestEntries()
            for ((slug, entry) in manifestEntries) {
                manifestEntries[slug] = entry.copy(selected = false)
            }
            saveManifestEntries(manifestEntries)
        }
    }

    fun selectModel(
        prefs: SharedPreferences,
        slug: String,
    ): Boolean =
        synchronized(manifestLock) {
            if (!validateModel(slug)) {
                return false
            }

            prefs
                .edit()
                .putString(VoquillIME.KEY_AI_TRANSCRIPTION_MODE, "local")
                .putString(VoquillIME.KEY_AI_TRANSCRIPTION_MODEL, slug)
                .apply()
            syncSelectionFromPrefs(prefs)
            true
        }

    fun syncSelectionFromPrefs(prefs: SharedPreferences) {
        synchronized(manifestLock) {
            normalizeManifestEntries(loadManifestEntries(), prefs)
        }
    }

    fun validateModel(slug: String): Boolean =
        synchronized(manifestLock) {
            val manifestEntries =
                normalizeManifestEntries(
                    entries = loadManifestEntries(),
                    prefs = null,
                    preserveExistingSelection = true,
                )
            manifestEntries[slug]?.valid == true
        }

    private fun ensureModelsDirectory() {
        if (modelsDirectory.exists()) {
            return
        }
        if (!modelsDirectory.mkdirs()) {
            throw IOException("Failed to create local transcription models directory")
        }
    }

    private fun validate(
        definition: LocalTranscriptionModelDefinition,
        manifestEntry: LocalTranscriptionModelManifestEntry?,
        selectedSlug: String?,
    ): LocalTranscriptionModelValidation {
        val modelFile = modelFileFor(definition)
        val downloaded = manifestEntry?.downloaded == true || modelFile.exists()
        if (!downloaded) {
            return LocalTranscriptionModelValidation(
                downloaded = false,
                valid = false,
                selected = false,
                validationError = null,
                manifestEntry = null,
            )
        }

        val actualFileSize = if (modelFile.exists()) modelFile.length() else manifestEntry?.fileSizeBytes ?: 0L
        val validationError =
            when {
                manifestEntry == null -> "Manifest entry missing"
                manifestEntry.slug != definition.slug ||
                    manifestEntry.filename != definition.filename ||
                    manifestEntry.downloadUrl != definition.downloadUrl -> "Manifest metadata mismatch"
                !modelFile.exists() -> "Model file missing"
                manifestEntry.fileSizeBytes <= 0L -> "Manifest file size missing"
                modelFile.length() <= 0L -> "Model file is empty"
                modelFile.length() != manifestEntry.fileSizeBytes -> "Model file size mismatch"
                else -> null
            }

        val selected = selectedSlug == definition.slug && validationError == null
        val normalizedEntry =
            LocalTranscriptionModelManifestEntry(
                slug = definition.slug,
                filename = definition.filename,
                downloadUrl = definition.downloadUrl,
                fileSizeBytes = actualFileSize,
                downloadedAtEpochMs = manifestEntry?.downloadedAtEpochMs ?: clock(),
                downloaded = true,
                valid = validationError == null,
                selected = selected,
                validationError = validationError,
            )

        return LocalTranscriptionModelValidation(
            downloaded = true,
            valid = validationError == null,
            selected = selected,
            validationError = validationError,
            manifestEntry = normalizedEntry,
        )
    }

    private fun normalizeManifestEntries(
        entries: MutableMap<String, LocalTranscriptionModelManifestEntry>,
        prefs: SharedPreferences?,
        preserveExistingSelection: Boolean = false,
    ): MutableMap<String, LocalTranscriptionModelManifestEntry> {
        val selectedSlug =
            prefs?.getString(VoquillIME.KEY_AI_TRANSCRIPTION_MODEL, null)
                ?: if (preserveExistingSelection) {
                entries.values.firstOrNull { it.selected }?.slug
            } else {
                null
            }

        val normalizedEntries = linkedMapOf<String, LocalTranscriptionModelManifestEntry>()
        var changed = false

        for (definition in supportedModels) {
            val validation = validate(definition, entries[definition.slug], selectedSlug)
            val normalizedEntry = validation.manifestEntry
            if (normalizedEntry != null) {
                normalizedEntries[definition.slug] = normalizedEntry
            }
            if (entries[definition.slug] != normalizedEntry) {
                changed = true
            }
        }

        if (entries.keys.any { it !in normalizedEntries.keys }) {
            changed = true
        }

        if (changed) {
            saveManifestEntries(normalizedEntries)
        }

        return normalizedEntries
    }

    private fun moveFile(
        from: File,
        to: File,
    ) {
        if (from.renameTo(to)) {
            return
        }

        from.copyTo(to, overwrite = true)
        if (!from.delete()) {
            throw IOException("Failed to clean up temporary model file")
        }
    }

    private fun modelFileFor(definition: LocalTranscriptionModelDefinition): File = File(modelsDirectory, definition.filename)

    private fun loadManifestEntries(): MutableMap<String, LocalTranscriptionModelManifestEntry> {
        if (!manifestFile.exists()) {
            return linkedMapOf()
        }

        return try {
            val root = JSONObject(manifestFile.readText())
            val models = root.optJSONObject("models") ?: return linkedMapOf()
            buildMap {
                val keys = models.keys()
                while (keys.hasNext()) {
                    val slug = keys.next()
                    val json = models.optJSONObject(slug) ?: continue
                    put(
                        slug,
                        LocalTranscriptionModelManifestEntry(
                            slug = json.optString("slug", slug),
                            filename = json.optString("filename"),
                            downloadUrl = json.optString("downloadUrl"),
                            fileSizeBytes = json.optLong("fileSizeBytes"),
                            downloadedAtEpochMs = json.optLong("downloadedAtEpochMs"),
                            downloaded = json.optBoolean("downloaded", true),
                            valid = json.optBoolean("valid", false),
                            selected = json.optBoolean("selected", false),
                            validationError = json.optString("validationError").takeIf { it.isNotBlank() },
                        ),
                    )
                }
            }.toMutableMap()
        } catch (_: Exception) {
            linkedMapOf()
        }
    }

    private fun saveManifestEntries(entries: Map<String, LocalTranscriptionModelManifestEntry>) {
        ensureModelsDirectory()

        val root =
            JSONObject().apply {
                put("version", MANIFEST_VERSION)
                put(
                    "models",
                    JSONObject().apply {
                        entries.toSortedMap().forEach { (slug, entry) ->
                            put(
                                slug,
                                JSONObject().apply {
                                    put("slug", entry.slug)
                                    put("filename", entry.filename)
                                    put("downloadUrl", entry.downloadUrl)
                                    put("fileSizeBytes", entry.fileSizeBytes)
                                    put("downloadedAtEpochMs", entry.downloadedAtEpochMs)
                                    put("downloaded", entry.downloaded)
                                    put("valid", entry.valid)
                                    put("selected", entry.selected)
                                    if (entry.validationError != null) {
                                        put("validationError", entry.validationError)
                                    }
                                },
                            )
                        }
                    },
                )
            }

        val tempFile = File(modelsDirectory, "${manifestFile.name}.tmp")
        tempFile.writeText(root.toString(2))
        moveFile(tempFile, manifestFile)
    }
}
