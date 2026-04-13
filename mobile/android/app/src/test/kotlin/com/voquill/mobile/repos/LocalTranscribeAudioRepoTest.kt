package com.voquill.mobile.repos

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test
import java.io.File
import java.nio.file.Files

class LocalTranscribeAudioRepoTest {
    @Test
    fun transcribeSync_returnsUnsupportedMessage_beforeTouchingWhisper_onOlderAndroid() {
        val appFilesDir = Files.createTempDirectory("local-stt-app").toFile()
        val cacheDir = Files.createTempDirectory("local-stt-cache").toFile()
        val audioFile = File(cacheDir, "sample.m4a").apply { writeText("placeholder") }

        try {
            val repo =
                LocalTranscribeAudioRepo(
                    appFilesDir = appFilesDir,
                    cacheDir = cacheDir,
                    modelSlug = "tiny",
                    sdkInt = 24,
                )

            val result = repo.transcribeSync(audioFile, prompt = "", language = "en")

            assertNull(result)
            assertEquals("Local transcription requires Android 8.0 or later", repo.lastErrorMessage)
        } finally {
            appFilesDir.deleteRecursively()
            cacheDir.deleteRecursively()
        }
    }
}
