package com.voquill.mobile.repos

sealed interface TranscriptionBackend {
    data object Cloud : TranscriptionBackend

    data object Api : TranscriptionBackend

    data class Local(
        val model: String,
    ) : TranscriptionBackend
}

object TranscriptionBackendResolver {
    fun resolve(
        transcriptionMode: String?,
        selectedModel: String?,
        hasApiKey: Boolean,
        hasCloudConfig: Boolean,
        localModelValid: Boolean,
    ): TranscriptionBackend? =
        when (transcriptionMode?.takeIf { it.isNotBlank() } ?: "cloud") {
            "local" -> selectedModel?.takeIf { localModelValid }?.let { TranscriptionBackend.Local(it) }
            "api" -> TranscriptionBackend.Api.takeIf { hasApiKey }
            "cloud" -> TranscriptionBackend.Cloud.takeIf { hasCloudConfig }
            else -> null
        }
}
