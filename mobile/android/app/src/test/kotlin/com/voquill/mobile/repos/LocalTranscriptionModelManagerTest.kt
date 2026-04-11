package com.voquill.mobile.repos

import android.content.SharedPreferences
import com.voquill.mobile.VoquillIME
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Rule
import org.junit.Test
import org.junit.rules.TestName
import java.io.File
import java.io.IOException
import java.util.concurrent.CountDownLatch
import java.util.concurrent.TimeUnit
import java.util.concurrent.atomic.AtomicReference
import kotlin.concurrent.thread

class LocalTranscriptionModelManagerTest {
    @get:Rule
    val testName = TestName()

    private lateinit var prefs: SharedPreferences
    private lateinit var appFilesDir: File

    @Before
    fun setUp() {
        prefs = InMemorySharedPreferences()
        appFilesDir = File("build/test-workdirs/${javaClass.simpleName}/${testName.methodName}")
        appFilesDir.deleteRecursively()
        assertTrue(appFilesDir.mkdirs())
    }

    @After
    fun tearDown() {
        prefs.edit().clear().commit()
        appFilesDir.deleteRecursively()
    }

    @Test
    fun listModels_readsCatalogManifestAndSelectionState() {
        writeInstalledModel(slug = "tiny", fileContents = "tiny-model".encodeToByteArray())
        prefs
            .edit()
            .putString(VoquillIME.KEY_AI_TRANSCRIPTION_MODE, "local")
            .putString(VoquillIME.KEY_AI_TRANSCRIPTION_MODEL, "tiny")
            .commit()

        val models = manager().listModels(prefs)
        val tiny = models.first { it.slug == "tiny" }

        assertEquals(listOf("tiny", "base", "small", "medium", "turbo", "large"), models.map { it.slug })
        assertEquals("Whisper Tiny (77 MB)", tiny.label)
        assertEquals("Fastest, lowest accuracy", tiny.helper)
        assertEquals(77_000_000L, tiny.sizeBytes)
        assertEquals("multilingual", tiny.languageSupport)
        assertTrue(tiny.downloaded)
        assertTrue(tiny.valid)
        assertTrue(tiny.selected)
        assertNull(tiny.validationError)
        assertTrue(readManifestFile().contains("\"selected\": true"))
        assertTrue(readManifestFile().contains("\"valid\": true"))
    }

    @Test
    fun validateModel_reportsMissingFileFromManifest() {
        writeManifestOnly(slug = "tiny", fileSizeBytes = 1234L)

        val manager = manager()
        val models = manager.listModels(prefs)
        val tiny = models.first { it.slug == "tiny" }

        assertTrue(tiny.downloaded)
        assertFalse(tiny.valid)
        assertEquals("Model file missing", tiny.validationError)
        assertFalse(manager.validateModel("tiny"))
    }

    @Test
    fun selectModel_requiresAValidDownloadedModel() {
        writeManifestOnly(slug = "tiny", fileSizeBytes = 10L)

        val manager = manager()

        assertFalse(manager.selectModel(prefs, "tiny"))
        assertNull(prefs.getString(VoquillIME.KEY_AI_TRANSCRIPTION_MODE, null))
        assertNull(prefs.getString(VoquillIME.KEY_AI_TRANSCRIPTION_MODEL, null))

        writeInstalledModel(slug = "tiny", fileContents = "tiny-model".encodeToByteArray())

        assertTrue(manager.selectModel(prefs, "tiny"))
        assertEquals("local", prefs.getString(VoquillIME.KEY_AI_TRANSCRIPTION_MODE, null))
        assertEquals("tiny", prefs.getString(VoquillIME.KEY_AI_TRANSCRIPTION_MODEL, null))
    }

    @Test
    fun deleteModel_removesManifestAndClearsSelectedSlug() {
        writeInstalledModel(slug = "tiny", fileContents = "tiny-model".encodeToByteArray())
        prefs
            .edit()
            .putString(VoquillIME.KEY_AI_TRANSCRIPTION_MODE, "local")
            .putString(VoquillIME.KEY_AI_TRANSCRIPTION_MODEL, "tiny")
            .commit()

        val manager = manager()

        assertTrue(manager.deleteModel(prefs, "tiny"))
        assertFalse(File(appFilesDir, "models/ggml-tiny.bin").exists())
        assertNull(prefs.getString(VoquillIME.KEY_AI_TRANSCRIPTION_MODEL, null))
        assertEquals("local", prefs.getString(VoquillIME.KEY_AI_TRANSCRIPTION_MODE, null))
        assertFalse(manager.listModels(prefs).first { it.slug == "tiny" }.downloaded)
    }

    @Test
    fun downloadModel_writesCatalogFileAndManifest() {
        var requestedUrl: String? = null
        val manager =
            manager(
                downloader =
                    LocalTranscriptionModelDownloader { url, destination ->
                        requestedUrl = url
                        destination.parentFile?.mkdirs()
                        destination.writeText("turbo-model")
                    },
            )

        assertTrue(manager.downloadModel("turbo"))
        assertEquals(
            "https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-large-v3-turbo.bin",
            requestedUrl,
        )
        assertTrue(File(appFilesDir, "models/ggml-large-v3-turbo.bin").exists())
        assertTrue(manager.validateModel("turbo"))
        assertTrue(manager.listModels(prefs).first { it.slug == "turbo" }.downloaded)
        assertTrue(readManifestFile().contains("ggml-large-v3-turbo.bin"))
        assertTrue(readManifestFile().contains("\"downloaded\": true"))
        assertTrue(readManifestFile().contains("\"valid\": true"))
    }

    @Test
    fun deleteModel_rejectsDeletionWhileDownloadIsInProgress() {
        val downloadStarted = CountDownLatch(1)
        val allowDownloadToFinish = CountDownLatch(1)
        val downloadError = AtomicReference<Throwable?>(null)
        val manager =
            manager(
                downloader =
                    LocalTranscriptionModelDownloader { _, destination ->
                        downloadStarted.countDown()
                        assertTrue(allowDownloadToFinish.await(5, TimeUnit.SECONDS))
                        destination.parentFile?.mkdirs()
                        destination.writeText("tiny-model")
                    },
            )

        val downloadThread =
            thread(start = true) {
                try {
                    manager.downloadModel("tiny")
                } catch (error: Throwable) {
                    downloadError.set(error)
                }
            }

        assertTrue(downloadStarted.await(5, TimeUnit.SECONDS))

        val error =
            try {
                manager.deleteModel(prefs, "tiny")
                null
            } catch (ioError: IOException) {
                ioError
            }

        assertNotNull(error)
        assertEquals("Model download already in progress", error?.message)

        allowDownloadToFinish.countDown()
        downloadThread.join(5_000)

        assertNull(downloadError.get())
        assertTrue(File(appFilesDir, "models/ggml-tiny.bin").exists())
        assertTrue(manager.listModels(prefs).first { it.slug == "tiny" }.downloaded)
    }

    @Test
    fun deleteModel_preservesManifestWhenFileDeletionFails() {
        writeManifestOnly(slug = "tiny", fileSizeBytes = 10L)
        val modelPath = File(appFilesDir, "models/ggml-tiny.bin")
        assertTrue(modelPath.mkdirs())
        File(modelPath, "nested.bin").writeText("still-here")

        val error =
            try {
                manager().deleteModel(prefs, "tiny")
                null
            } catch (ioError: IOException) {
                ioError
            }

        assertNotNull(error)
        assertEquals("Failed to delete local model file", error?.message)
        assertTrue(readManifestFile().contains(""""tiny""""))
    }

    @Test
    fun syncSelectionFromPrefs_updatesManifestSelectedState() {
        writeInstalledModel(slug = "tiny", fileContents = "tiny-model".encodeToByteArray())
        writeInstalledModel(slug = "base", fileContents = "base-model".encodeToByteArray())
        prefs
            .edit()
            .putString(VoquillIME.KEY_AI_TRANSCRIPTION_MODE, "local")
            .putString(VoquillIME.KEY_AI_TRANSCRIPTION_MODEL, "base")
            .commit()

        manager().syncSelectionFromPrefs(prefs)

        val manifest = readManifestFile()
        assertTrue(manifest.contains(""""tiny""""))
        assertTrue(manifest.contains(""""base""""))
        assertTrue(manifest.contains(""""selected": true"""))
        assertEquals("base", manager().listModels(prefs).first { it.selected }.slug)
    }

    @Test
    fun validateModel_preservesExistingSelectedManifestState() {
        writeInstalledModel(slug = "tiny", fileContents = "tiny-model".encodeToByteArray())
        prefs
            .edit()
            .putString(VoquillIME.KEY_AI_TRANSCRIPTION_MODE, "local")
            .putString(VoquillIME.KEY_AI_TRANSCRIPTION_MODEL, "tiny")
            .commit()
        val manager = manager()
        manager.syncSelectionFromPrefs(prefs)

        assertTrue(manager.validateModel("tiny"))
        assertEquals("tiny", manager.listModels(prefs).first { it.selected }.slug)
        assertTrue(readManifestFile().contains(""""selected": true"""))
    }

    private fun manager(
        downloader: LocalTranscriptionModelDownloader = LocalTranscriptionModelDownloader { _, _ -> },
    ) = LocalTranscriptionModelManager(appFilesDir = appFilesDir, downloader = downloader, clock = { 1_700_000_000_000L })

    private fun writeInstalledModel(
        slug: String,
        fileContents: ByteArray,
    ) {
        val definition = LocalTranscriptionModelManager.supportedModels.first { it.slug == slug }
        val modelFile = File(appFilesDir, "models/${definition.filename}")
        modelFile.parentFile?.mkdirs()
        modelFile.writeBytes(fileContents)
        writeManifestOnly(slug = slug, fileSizeBytes = fileContents.size.toLong())
    }

    private fun writeManifestOnly(
        slug: String,
        fileSizeBytes: Long,
    ) {
        val definition = LocalTranscriptionModelManager.supportedModels.first { it.slug == slug }
        val manifestFile = File(appFilesDir, "models/manifest.json")
        manifestFile.parentFile?.mkdirs()
        manifestFile.writeText(
            """
            {
              "version": 1,
              "models": {
                "$slug": {
                  "slug": "$slug",
                  "filename": "${definition.filename}",
                  "downloadUrl": "${definition.downloadUrl}",
                  "fileSizeBytes": $fileSizeBytes,
                  "downloadedAtEpochMs": 1700000000000
                }
              }
            }
            """.trimIndent(),
        )
    }

    private fun readManifestFile(): String = File(appFilesDir, "models/manifest.json").takeIf { it.exists() }?.readText().orEmpty()
}

private class InMemorySharedPreferences : SharedPreferences {
    private val values = linkedMapOf<String, Any?>()

    override fun getAll(): MutableMap<String, *> = LinkedHashMap(values)

    override fun getString(
        key: String?,
        defValue: String?,
    ): String? = values[key] as? String ?: defValue

    @Suppress("UNCHECKED_CAST")
    override fun getStringSet(
        key: String?,
        defValues: MutableSet<String>?,
    ): MutableSet<String>? = (values[key] as? Set<String>)?.toMutableSet() ?: defValues

    override fun getInt(
        key: String?,
        defValue: Int,
    ): Int = values[key] as? Int ?: defValue

    override fun getLong(
        key: String?,
        defValue: Long,
    ): Long = values[key] as? Long ?: defValue

    override fun getFloat(
        key: String?,
        defValue: Float,
    ): Float = values[key] as? Float ?: defValue

    override fun getBoolean(
        key: String?,
        defValue: Boolean,
    ): Boolean = values[key] as? Boolean ?: defValue

    override fun contains(key: String?): Boolean = values.containsKey(key)

    override fun edit(): SharedPreferences.Editor = Editor()

    override fun registerOnSharedPreferenceChangeListener(listener: SharedPreferences.OnSharedPreferenceChangeListener?) {
    }

    override fun unregisterOnSharedPreferenceChangeListener(listener: SharedPreferences.OnSharedPreferenceChangeListener?) {
    }

    private inner class Editor : SharedPreferences.Editor {
        private val pending = linkedMapOf<String, Any?>()
        private var clearRequested = false

        override fun putString(
            key: String?,
            value: String?,
        ): SharedPreferences.Editor = apply {
            pending[key.orEmpty()] = value
        }

        override fun putStringSet(
            key: String?,
            values: MutableSet<String>?,
        ): SharedPreferences.Editor = apply {
            pending[key.orEmpty()] = values?.toSet()
        }

        override fun putInt(
            key: String?,
            value: Int,
        ): SharedPreferences.Editor = apply {
            pending[key.orEmpty()] = value
        }

        override fun putLong(
            key: String?,
            value: Long,
        ): SharedPreferences.Editor = apply {
            pending[key.orEmpty()] = value
        }

        override fun putFloat(
            key: String?,
            value: Float,
        ): SharedPreferences.Editor = apply {
            pending[key.orEmpty()] = value
        }

        override fun putBoolean(
            key: String?,
            value: Boolean,
        ): SharedPreferences.Editor = apply {
            pending[key.orEmpty()] = value
        }

        override fun remove(key: String?): SharedPreferences.Editor = apply {
            pending[key.orEmpty()] = null
        }

        override fun clear(): SharedPreferences.Editor = apply {
            clearRequested = true
        }

        override fun commit(): Boolean {
            if (clearRequested) {
                values.clear()
            }
            pending.forEach { (key, value) ->
                if (value == null) values.remove(key) else values[key] = value
            }
            pending.clear()
            clearRequested = false
            return true
        }

        override fun apply() {
            commit()
        }
    }
}
