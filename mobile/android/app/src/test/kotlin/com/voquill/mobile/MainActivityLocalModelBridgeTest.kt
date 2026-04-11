package com.voquill.mobile

import android.content.Context
import org.json.JSONArray
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.RuntimeEnvironment

@RunWith(RobolectricTestRunner::class)
class MainActivityLocalModelBridgeTest {
    private lateinit var context: Context
    private lateinit var prefsName: String

    @Before
    fun setUp() {
        context = RuntimeEnvironment.getApplication().applicationContext
        prefsName = "main-activity-local-model-bridge-${System.nanoTime()}"
    }

    @After
    fun tearDown() {
        prefs().edit().clear().commit()
    }

    @Test
    fun listModels_readsSelectedAndDownloadedFlags() {
        prefs()
            .edit()
            .putString(VoquillIME.KEY_AI_TRANSCRIPTION_MODE, "local")
            .putString(VoquillIME.KEY_AI_TRANSCRIPTION_MODEL, "tiny")
            .putString(
                LocalModelBridge.KEY_DOWNLOADED_MODELS,
                JSONArray().put("tiny").toString(),
            )
            .commit()

        val models = LocalModelBridge.listModels(prefs())
        val tiny = models.first { it["slug"] == "tiny" }

        assertEquals(true, tiny["downloaded"])
        assertEquals(true, tiny["valid"])
        assertEquals(true, tiny["selected"])
    }

    @Test
    fun selectModel_persistsLocalModeAndSlug() {
        prefs()
            .edit()
            .putString(
                LocalModelBridge.KEY_DOWNLOADED_MODELS,
                JSONArray().put("tiny").toString(),
            )
            .commit()

        assertTrue(LocalModelBridge.selectModel(prefs(), "tiny"))

        assertEquals("local", prefs().getString(VoquillIME.KEY_AI_TRANSCRIPTION_MODE, null))
        assertEquals("tiny", prefs().getString(VoquillIME.KEY_AI_TRANSCRIPTION_MODEL, null))
    }

    @Test
    fun selectModel_rejectsUndownloadedSlug() {
        assertEquals(false, LocalModelBridge.selectModel(prefs(), "tiny"))
        assertEquals(null, prefs().getString(VoquillIME.KEY_AI_TRANSCRIPTION_MODE, null))
        assertEquals(null, prefs().getString(VoquillIME.KEY_AI_TRANSCRIPTION_MODEL, null))
    }

    private fun prefs() = context.getSharedPreferences(prefsName, Context.MODE_PRIVATE)
}
