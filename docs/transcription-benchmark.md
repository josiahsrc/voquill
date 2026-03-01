# Transcription Benchmark: CPU vs GPU

**Date:** 2026-03-01
**Model:** Whisper `tiny` (`ggml-tiny.bin`, ~77 MB)
**Hardware:** 2x NVIDIA GeForce RTX 3080

## Test 1: `party.mp3`

**Audio:** MP3, stereo, 24000 Hz, 47.30s

| Mode | Device | Server Duration | Round-trip Time | Transcribed Text |
|------|--------|-----------------|-----------------|------------------|
| CPU  | CPU    | 1846 ms         | 1967 ms         | "Okay I riots (Arabic)" |
| GPU  | gpu:0 (RTX 3080) | 654 ms | 780 ms | "[Speaking in foreign language] ..." |

- **GPU speedup:** ~2.8x faster inference (654 ms vs 1846 ms)
- Neither mode produced a useful transcription — audio is likely music/non-English.

## Test 2: `muffin-man.wav`

**Audio:** 16-bit PCM, mono, 44100 Hz, 4.86s

| Mode | Device | Server Duration | Round-trip Time | Transcribed Text |
|------|--------|-----------------|-----------------|------------------|
| CPU  | CPU    | 782 ms          | 819 ms          | "Generate me a three sentence poem about the muffin man" |
| GPU  | gpu:0 (RTX 3080) | 523 ms | 559 ms | "Generate me a three sentence poem about the muffin man" |

- **GPU speedup:** ~1.5x faster inference (523 ms vs 782 ms)
- Both modes produced identical, accurate transcription.

## Summary

| Audio | Duration | CPU Inference | GPU Inference | GPU Speedup |
|-------|----------|---------------|---------------|-------------|
| party.mp3 | 47.30s | 1846 ms | 654 ms | 2.82x |
| muffin-man.wav | 4.86s | 782 ms | 523 ms | 1.50x |

GPU advantage scales with audio length — **2.8x** speedup on longer audio vs **1.5x** on short audio.
