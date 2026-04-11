package com.voquill.mobile.repos

import android.media.AudioFormat
import android.media.MediaCodec
import android.media.MediaExtractor
import android.media.MediaFormat
import android.os.Build
import android.util.Log
import com.llamatik.library.platform.WhisperBridge
import java.io.ByteArrayOutputStream
import java.io.File
import java.io.IOException
import java.nio.ByteBuffer
import java.nio.ByteOrder
import kotlin.math.roundToInt

class LocalTranscribeAudioRepo(
    private val appFilesDir: File,
    private val cacheDir: File,
    private val modelSlug: String,
    private val sdkInt: Int = Build.VERSION.SDK_INT,
) : BaseTranscribeAudioRepo() {
    override fun transcribeSync(
        audioFile: File,
        prompt: String,
        language: String,
    ): String? {
        resetLastError()

        return try {
            if (!isSupported(sdkInt)) {
                return fail("Local transcription requires Android 8.0 or later")
            }

            if (!audioFile.exists() || audioFile.length() == 0L) {
                return fail("No recorded audio available")
            }

            val definition =
                LocalTranscriptionModelManager.supportedModels.firstOrNull { it.slug == modelSlug }
                    ?: return fail("Selected local model is unsupported")
            val modelFile = File(appFilesDir, "models/${definition.filename}")

            if (!modelFile.exists() || modelFile.length() == 0L) {
                return fail("Selected local model is missing or invalid")
            }

            if (!ensureModelLoaded(modelFile)) {
                return fail("Selected local model could not be loaded")
            }

            val wavFile = File(cacheDir, "voquill_local_transcribe_${modelSlug}.wav")
            WhisperAudioPreparer.prepare(audioFile = audioFile, wavFile = wavFile)

            WhisperBridge.transcribeWav(
                wavFile.absolutePath,
                language.takeIf { it.isNotBlank() && it != "auto" },
            ).trim().takeIf { it.isNotEmpty() } ?: fail("Local transcription returned empty text")
        } catch (error: Exception) {
            Log.w(TAG, "Local transcribe failed", error)
            fail(lastErrorMessage ?: "Local transcription failed")
        }
    }

    companion object {
        private const val TAG = "LocalTranscribeRepo"
        private const val MIN_LOCAL_TRANSCRIPTION_SDK = Build.VERSION_CODES.O
        private val whisperLock = Any()
        private var loadedModelPath: String? = null

        fun isSupported(sdkInt: Int = Build.VERSION.SDK_INT): Boolean = sdkInt >= MIN_LOCAL_TRANSCRIPTION_SDK

        private fun ensureModelLoaded(modelFile: File): Boolean =
            synchronized(whisperLock) {
                val modelPath = modelFile.absolutePath
                if (loadedModelPath == modelPath) {
                    return true
                }

                runCatching { WhisperBridge.release() }

                val loaded = runCatching { WhisperBridge.initModel(modelPath) }.getOrDefault(false)
                if (loaded) {
                    loadedModelPath = modelPath
                }
                loaded
            }
    }
}

private object WhisperAudioPreparer {
    private const val TARGET_SAMPLE_RATE = 16_000

    fun prepare(
        audioFile: File,
        wavFile: File,
    ) {
        val decodedAudio = decodeToMonoPcm(audioFile)
        val resampled =
            if (decodedAudio.sampleRate == TARGET_SAMPLE_RATE) {
                decodedAudio.samples
            } else {
                resample(decodedAudio.samples, decodedAudio.sampleRate, TARGET_SAMPLE_RATE)
            }
        writeWav(wavFile, resampled, TARGET_SAMPLE_RATE)
    }

    private fun decodeToMonoPcm(audioFile: File): DecodedPcm {
        val extractor = MediaExtractor()
        extractor.setDataSource(audioFile.absolutePath)

        val trackIndex =
            (0 until extractor.trackCount).firstOrNull { index ->
                extractor.getTrackFormat(index).getString(MediaFormat.KEY_MIME)?.startsWith("audio/") == true
            } ?: run {
                extractor.release()
                throw IOException("No audio track found")
            }

        extractor.selectTrack(trackIndex)
        val inputFormat = extractor.getTrackFormat(trackIndex)
        val mime = inputFormat.getString(MediaFormat.KEY_MIME) ?: throw IOException("Missing audio mime type")
        val decoder = MediaCodec.createDecoderByType(mime)

        var outputSampleRate = inputFormat.getInteger(MediaFormat.KEY_SAMPLE_RATE)
        var outputChannelCount = inputFormat.getInteger(MediaFormat.KEY_CHANNEL_COUNT)
        var outputEncoding = AudioFormat.ENCODING_PCM_16BIT
        val pcmBytes = ByteArrayOutputStream()

        try {
            decoder.configure(inputFormat, null, null, 0)
            decoder.start()

            val bufferInfo = MediaCodec.BufferInfo()
            var inputDone = false
            var outputDone = false

            while (!outputDone) {
                if (!inputDone) {
                    val inputIndex = decoder.dequeueInputBuffer(TIMEOUT_US)
                    if (inputIndex >= 0) {
                        val inputBuffer = decoder.getInputBuffer(inputIndex) ?: throw IOException("Missing decoder input buffer")
                        val sampleSize = extractor.readSampleData(inputBuffer, 0)
                        if (sampleSize < 0) {
                            decoder.queueInputBuffer(
                                inputIndex,
                                0,
                                0,
                                0L,
                                MediaCodec.BUFFER_FLAG_END_OF_STREAM,
                            )
                            inputDone = true
                        } else {
                            decoder.queueInputBuffer(
                                inputIndex,
                                0,
                                sampleSize,
                                extractor.sampleTime,
                                0,
                            )
                            extractor.advance()
                        }
                    }
                }

                when (val outputIndex = decoder.dequeueOutputBuffer(bufferInfo, TIMEOUT_US)) {
                    MediaCodec.INFO_TRY_AGAIN_LATER -> Unit
                    MediaCodec.INFO_OUTPUT_FORMAT_CHANGED -> {
                        val format = decoder.outputFormat
                        outputSampleRate = format.getInteger(MediaFormat.KEY_SAMPLE_RATE)
                        outputChannelCount = format.getInteger(MediaFormat.KEY_CHANNEL_COUNT)
                        outputEncoding =
                            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N &&
                                format.containsKey(MediaFormat.KEY_PCM_ENCODING)
                            ) {
                                format.getInteger(MediaFormat.KEY_PCM_ENCODING)
                            } else {
                                AudioFormat.ENCODING_PCM_16BIT
                            }
                    }
                    else -> {
                        if (outputIndex >= 0) {
                            val outputBuffer =
                                decoder.getOutputBuffer(outputIndex)
                                    ?: throw IOException("Missing decoder output buffer")
                            if (bufferInfo.size > 0) {
                                outputBuffer.position(bufferInfo.offset)
                                outputBuffer.limit(bufferInfo.offset + bufferInfo.size)
                                val chunk = ByteArray(bufferInfo.size)
                                outputBuffer.get(chunk)
                                pcmBytes.write(chunk)
                            }

                            if ((bufferInfo.flags and MediaCodec.BUFFER_FLAG_END_OF_STREAM) != 0) {
                                outputDone = true
                            }
                            decoder.releaseOutputBuffer(outputIndex, false)
                        }
                    }
                }
            }
        } finally {
            runCatching { decoder.stop() }
            runCatching { decoder.release() }
            extractor.release()
        }

        return DecodedPcm(
            samples = pcmToMonoFloatArray(pcmBytes.toByteArray(), outputEncoding, outputChannelCount),
            sampleRate = outputSampleRate,
        )
    }

    private fun pcmToMonoFloatArray(
        bytes: ByteArray,
        encoding: Int,
        channelCount: Int,
    ): FloatArray {
        require(channelCount > 0) { "Invalid channel count" }

        return when (encoding) {
            AudioFormat.ENCODING_PCM_FLOAT -> {
                val floats = FloatArray(bytes.size / 4 / channelCount)
                val buffer = ByteBuffer.wrap(bytes).order(ByteOrder.LITTLE_ENDIAN)
                for (frameIndex in floats.indices) {
                    var mono = 0f
                    repeat(channelCount) {
                        mono += buffer.float
                    }
                    floats[frameIndex] = mono / channelCount
                }
                floats
            }
            AudioFormat.ENCODING_PCM_8BIT -> {
                val floats = FloatArray(bytes.size / channelCount)
                var offset = 0
                for (frameIndex in floats.indices) {
                    var mono = 0f
                    repeat(channelCount) {
                        mono += ((bytes[offset++].toInt() and 0xFF) - 128) / 128f
                    }
                    floats[frameIndex] = mono / channelCount
                }
                floats
            }
            else -> {
                val floats = FloatArray(bytes.size / 2 / channelCount)
                val buffer = ByteBuffer.wrap(bytes).order(ByteOrder.LITTLE_ENDIAN)
                for (frameIndex in floats.indices) {
                    var mono = 0f
                    repeat(channelCount) {
                        mono += buffer.short / Short.MAX_VALUE.toFloat()
                    }
                    floats[frameIndex] = mono / channelCount
                }
                floats
            }
        }
    }

    private fun resample(
        samples: FloatArray,
        sourceRate: Int,
        targetRate: Int,
    ): FloatArray {
        if (samples.isEmpty() || sourceRate == targetRate) {
            return samples
        }

        val ratio = sourceRate.toDouble() / targetRate.toDouble()
        val outputSize = (samples.size * targetRate.toDouble() / sourceRate.toDouble()).roundToInt().coerceAtLeast(1)
        return FloatArray(outputSize) { index ->
            val sourceIndex = index * ratio
            val leftIndex = sourceIndex.toInt().coerceIn(0, samples.lastIndex)
            val rightIndex = (leftIndex + 1).coerceAtMost(samples.lastIndex)
            val fraction = (sourceIndex - leftIndex).toFloat()
            samples[leftIndex] * (1f - fraction) + samples[rightIndex] * fraction
        }
    }

    private fun writeWav(
        outputFile: File,
        samples: FloatArray,
        sampleRate: Int,
    ) {
        outputFile.parentFile?.mkdirs()

        val pcmData = ByteArray(samples.size * 2)
        val pcmBuffer = ByteBuffer.wrap(pcmData).order(ByteOrder.LITTLE_ENDIAN)
        for (sample in samples) {
            val clamped = sample.coerceIn(-1f, 1f)
            pcmBuffer.putShort((clamped * Short.MAX_VALUE).roundToInt().toShort())
        }

        val dataSize = pcmData.size
        val header = ByteBuffer.allocate(44).order(ByteOrder.LITTLE_ENDIAN).apply {
            put("RIFF".encodeToByteArray())
            putInt(36 + dataSize)
            put("WAVE".encodeToByteArray())
            put("fmt ".encodeToByteArray())
            putInt(16)
            putShort(1)
            putShort(1)
            putInt(sampleRate)
            putInt(sampleRate * 2)
            putShort(2)
            putShort(16)
            put("data".encodeToByteArray())
            putInt(dataSize)
        }.array()

        outputFile.outputStream().buffered().use { output ->
            output.write(header)
            output.write(pcmData)
        }
    }

    private data class DecodedPcm(
        val samples: FloatArray,
        val sampleRate: Int,
    )

    private const val TIMEOUT_US = 10_000L
}
