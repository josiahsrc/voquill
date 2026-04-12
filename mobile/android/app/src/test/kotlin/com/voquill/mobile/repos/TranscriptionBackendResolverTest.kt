package com.voquill.mobile.repos

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test

class TranscriptionBackendResolverTest {
    @Test
    fun resolve_returns_local_backend_when_mode_is_local_and_model_is_valid() {
        val result =
            TranscriptionBackendResolver.resolve(
                transcriptionMode = "local",
                selectedModel = "tiny",
                hasApiKey = false,
                hasCloudConfig = false,
                localModelValid = true,
            )

        assertEquals(TranscriptionBackend.Local("tiny"), result)
    }

    @Test
    fun resolve_returns_null_when_local_model_is_missing_or_invalid() {
        val missingModel =
            TranscriptionBackendResolver.resolve(
                transcriptionMode = "local",
                selectedModel = null,
                hasApiKey = false,
                hasCloudConfig = false,
                localModelValid = false,
            )
        val invalidModel =
            TranscriptionBackendResolver.resolve(
                transcriptionMode = "local",
                selectedModel = "tiny",
                hasApiKey = false,
                hasCloudConfig = false,
                localModelValid = false,
            )

        assertNull(missingModel)
        assertNull(invalidModel)
    }

    @Test
    fun resolve_returns_api_only_when_api_mode_has_an_api_key() {
        assertEquals(
            TranscriptionBackend.Api,
            TranscriptionBackendResolver.resolve(
                transcriptionMode = "api",
                selectedModel = null,
                hasApiKey = true,
                hasCloudConfig = true,
                localModelValid = false,
            ),
        )
        assertNull(
            TranscriptionBackendResolver.resolve(
                transcriptionMode = "api",
                selectedModel = null,
                hasApiKey = false,
                hasCloudConfig = true,
                localModelValid = false,
            ),
        )
    }

    @Test
    fun resolve_returns_cloud_only_when_cloud_mode_has_cloud_config() {
        assertEquals(
            TranscriptionBackend.Cloud,
            TranscriptionBackendResolver.resolve(
                transcriptionMode = "cloud",
                selectedModel = null,
                hasApiKey = true,
                hasCloudConfig = true,
                localModelValid = true,
            ),
        )
        assertNull(
            TranscriptionBackendResolver.resolve(
                transcriptionMode = "cloud",
                selectedModel = null,
                hasApiKey = true,
                hasCloudConfig = false,
                localModelValid = true,
            ),
        )
    }

    @Test
    fun resolve_treats_null_or_blank_mode_as_cloud() {
        assertEquals(
            TranscriptionBackend.Cloud,
            TranscriptionBackendResolver.resolve(
                transcriptionMode = null,
                selectedModel = null,
                hasApiKey = false,
                hasCloudConfig = true,
                localModelValid = false,
            ),
        )
        assertEquals(
            TranscriptionBackend.Cloud,
            TranscriptionBackendResolver.resolve(
                transcriptionMode = "   ",
                selectedModel = null,
                hasApiKey = false,
                hasCloudConfig = true,
                localModelValid = false,
            ),
        )
    }
}
