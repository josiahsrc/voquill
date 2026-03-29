import { readFileSync } from "fs";
import { resolve } from "path";
import { describe, expect, it } from "vitest";
import {
  GroqTranscribeAudioRepo,
  TranscribeAudioOutput,
  TranscribeSegmentInput,
} from "../../src/repos/transcribe-audio.repo";
import { getStringSimilarity } from "../../src/utils/string.utils";
import { getGroqApiKey } from "../helpers/env.utils";

/**
 * Parses a WAV file buffer and returns audio samples as Float32Array.
 * Assumes 16-bit PCM format.
 */
function parseWavFile(buffer: Buffer): {
  samples: Float32Array;
  sampleRate: number;
} {
  const view = new DataView(
    buffer.buffer,
    buffer.byteOffset,
    buffer.byteLength,
  );

  // Verify RIFF header
  const riff = String.fromCharCode(
    view.getUint8(0),
    view.getUint8(1),
    view.getUint8(2),
    view.getUint8(3),
  );
  if (riff !== "RIFF") {
    throw new Error("Invalid WAV file: missing RIFF header");
  }

  // Verify WAVE format
  const wave = String.fromCharCode(
    view.getUint8(8),
    view.getUint8(9),
    view.getUint8(10),
    view.getUint8(11),
  );
  if (wave !== "WAVE") {
    throw new Error("Invalid WAV file: missing WAVE format");
  }

  // Parse chunks to find fmt and data
  let sampleRate = 0;
  let bitsPerSample = 0;
  let dataOffset = 0;
  let dataSize = 0;

  let offset = 12;
  while (offset < buffer.length) {
    const chunkId = String.fromCharCode(
      view.getUint8(offset),
      view.getUint8(offset + 1),
      view.getUint8(offset + 2),
      view.getUint8(offset + 3),
    );
    const chunkSize = view.getUint32(offset + 4, true);

    if (chunkId === "fmt ") {
      sampleRate = view.getUint32(offset + 12, true);
      bitsPerSample = view.getUint16(offset + 22, true);
    } else if (chunkId === "data") {
      dataOffset = offset + 8;
      dataSize = chunkSize;
      break;
    }

    offset += 8 + chunkSize;
  }

  if (bitsPerSample !== 16) {
    throw new Error(`Unsupported bits per sample: ${bitsPerSample}`);
  }

  // Convert 16-bit PCM to Float32
  const numSamples = dataSize / 2;
  const samples = new Float32Array(numSamples);

  for (let i = 0; i < numSamples; i++) {
    const int16 = view.getInt16(dataOffset + i * 2, true);
    samples[i] = int16 / 32768;
  }

  return { samples, sampleRate };
}

// Normalize both texts for comparison (lowercase, collapse whitespace, remove punctuation)
const normalize = (text: string) =>
  text
    .toLowerCase()
    .replace(/[^\w\s]/g, "") // remove punctuation
    .replace(/\s+/g, " ") // collapse whitespace
    .trim();

type DurArgs = {
  segmentDurationSec: number;
  overlapDurationSec: number;
  batchChunkCount: number;
};

class TestGroqTranscribeAudioRepo extends GroqTranscribeAudioRepo {
  public segmentCount = 0;
  private durArgs: DurArgs;

  constructor(apiKey: string, durArgs: DurArgs) {
    super(apiKey, "whisper-large-v3-turbo");
    this.durArgs = durArgs;
  }

  protected override getSegmentDurationSec(): number {
    return this.durArgs.segmentDurationSec;
  }

  protected override getOverlapDurationSec(): number {
    return this.durArgs.overlapDurationSec;
  }

  protected override getBatchChunkCount(): number {
    return this.durArgs.batchChunkCount;
  }

  protected override async transcribeSegment(
    input: TranscribeSegmentInput,
  ): Promise<TranscribeAudioOutput> {
    this.segmentCount++;
    return super.transcribeSegment(input);
  }
}

describe("Groq Transcription Integration", () => {
  const assetsDir = resolve(__dirname, "../assets");
  const audioPath = resolve(assetsDir, "transcript-0.wav");
  const expectedTextPath = resolve(assetsDir, "transcript-0.txt");

  it("should transcribe audio with segment splitting and merging", async () => {
    const apiKey = getGroqApiKey();
    const repo = new TestGroqTranscribeAudioRepo(apiKey, {
      segmentDurationSec: 20,
      overlapDurationSec: 8, // step = 20 - 8 = 12s, with enough overlap for quality merging
      batchChunkCount: 2,
    });

    const wavBuffer = readFileSync(audioPath);
    const { samples, sampleRate } = parseWavFile(wavBuffer);

    const result = await repo.transcribeAudio({
      samples,
      sampleRate,
    });

    console.log(`Segments processed: ${repo.segmentCount}`);
    console.log(`Transcription: ${result.text}`);

    // Verify multiple segments were processed (44s audio with 15s segments, 12s step)
    // Expected: 0-15s, 12-27s, 24-39s, 36-44s = 4 segments
    expect(repo.segmentCount).toBe(4);

    // Verify we got text back
    expect(result.text).toBeTruthy();
    expect(result.text.length).toBeGreaterThan(100);

    // Verify metadata
    expect(result.metadata?.transcriptionMode).toBe("api");
    expect(result.metadata?.inferenceDevice).toBe("API • Groq");

    // Load expected text for comparison
    const expectedText = readFileSync(expectedTextPath, "utf-8").trim();

    const normalizedResult = normalize(result.text);
    const normalizedExpected = normalize(expectedText);
    console.log(`Normalized Expected (${normalizedExpected.length} chars):\n${normalizedExpected}\n`);
    console.log(`Normalized Result (${normalizedResult.length} chars):\n${normalizedResult}\n`);

    // Calculate similarity (0-1 ratio)
    const similarity = getStringSimilarity(
      normalizedResult,
      normalizedExpected,
    );

    console.log(
      `\nExpected (${normalizedExpected.length} chars):\n${normalizedExpected}\n`,
    );
    console.log(
      `Got (${normalizedResult.length} chars):\n${normalizedResult}\n`,
    );
    console.log(`Similarity: ${(similarity * 100).toFixed(2)}%`);

    // Require at least 99% similarity (allows for minor ASR variations)
    expect(similarity).toBeGreaterThanOrEqual(0.995);
  }, 60000); // 60 second timeout for API calls
});
