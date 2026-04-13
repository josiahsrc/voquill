package com.voquill.mobile

import android.content.SharedPreferences
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Before
import org.junit.Test

class AiConfigBridgeTest {
    private lateinit var prefs: SharedPreferences

    @Before
    fun setUp() {
        prefs = TestSharedPreferences()
    }

    @After
    fun tearDown() {
        prefs.edit().clear().commit()
    }

    @Test
    fun setKeyboardAiConfigDefersLocalModelChangesToManager() {
        prefs.edit().putString(VoquillIME.KEY_AI_TRANSCRIPTION_MODEL, "tiny").commit()

        AiConfigBridge.setKeyboardAiConfig(
            mapOf(
                "transcriptionMode" to "local",
                "postProcessingMode" to "cloud",
                "clearTranscriptionModel" to "true",
            ),
            prefs,
        )

        assertEquals("local", prefs.getString(VoquillIME.KEY_AI_TRANSCRIPTION_MODE, null))
        assertEquals("tiny", prefs.getString(VoquillIME.KEY_AI_TRANSCRIPTION_MODEL, null))
    }

    @Test
    fun setKeyboardAiConfigClearsTranscriptionModelWhenRequestedOutsideLocalMode() {
        prefs.edit().putString(VoquillIME.KEY_AI_TRANSCRIPTION_MODEL, "tiny").commit()

        AiConfigBridge.setKeyboardAiConfig(
            mapOf(
                "transcriptionMode" to "cloud",
                "postProcessingMode" to "cloud",
                "clearTranscriptionModel" to "true",
            ),
            prefs,
        )

        assertEquals("cloud", prefs.getString(VoquillIME.KEY_AI_TRANSCRIPTION_MODE, null))
        assertNull(prefs.getString(VoquillIME.KEY_AI_TRANSCRIPTION_MODEL, null))
    }
}
