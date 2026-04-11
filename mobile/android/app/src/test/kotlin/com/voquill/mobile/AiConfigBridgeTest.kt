package com.voquill.mobile

import android.content.Context
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.RuntimeEnvironment

@RunWith(RobolectricTestRunner::class)
class AiConfigBridgeTest {
    private val prefsName = "AiConfigBridgeTest"
    private lateinit var prefs: android.content.SharedPreferences

    @Before
    fun setUp() {
        prefs = RuntimeEnvironment.getApplication().getSharedPreferences(prefsName, Context.MODE_PRIVATE)
        prefs.edit().clear().commit()
    }

    @After
    fun tearDown() {
        prefs.edit().clear().commit()
    }

    @Test
    fun setKeyboardAiConfigClearsTranscriptionModelWhenRequested() {
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
        assertNull(prefs.getString(VoquillIME.KEY_AI_TRANSCRIPTION_MODEL, null))
    }
}
