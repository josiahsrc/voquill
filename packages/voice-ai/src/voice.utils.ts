import type {
  ChatCompletionContentPart,
  ChatCompletionMessageParam,
} from "groq-sdk/resources/chat/completions";
import { WaveFile } from "wavefile";
import z from "zod";
import zodToJsonSchema from "zod-to-json-schema";

export type AudioSource = ArrayBuffer | ArrayBufferView | Blob;

export const DEFAULT_MAX_SEGMENT_DURATION_SECONDS = 60;

export const sanitizeExtension = (ext?: string): string => {
  if (!ext) {
    return "wav";
  }

  const trimmed = ext.trim().replace(/^\.+/, "");
  return trimmed.length > 0 ? trimmed : "wav";
};

export const resolveFileName = (
  fileName: string | undefined,
  ext: string | undefined,
): string => {
  if (fileName && fileName.trim().length > 0) {
    return fileName.trim();
  }

  return `audio.${sanitizeExtension(ext)}`;
};

export const splitFileName = (
  fileName: string,
): { base: string; ext: string | null } => {
  const trimmed = fileName.trim();
  if (!trimmed) {
    return { base: "audio", ext: null };
  }

  const lastDot = trimmed.lastIndexOf(".");
  if (lastDot <= 0 || lastDot >= trimmed.length - 1) {
    return { base: trimmed, ext: null };
  }

  return {
    base: trimmed.slice(0, lastDot),
    ext: sanitizeExtension(trimmed.slice(lastDot + 1)),
  };
};

export const ensureFileNameHasExt = (fileName: string, ext: string): string => {
  const trimmed = fileName.trim();
  if (!trimmed) {
    return `audio.${ext}`;
  }

  const { base, ext: existingExt } = splitFileName(trimmed);
  if (existingExt) {
    return trimmed;
  }

  return `${base}.${ext}`;
};

export const buildChunkFileName = (
  baseFileName: string,
  index: number,
  total: number,
  ext: string,
): string => {
  if (total <= 1) {
    return baseFileName;
  }

  const { base } = splitFileName(baseFileName);
  return `${base}-part-${index + 1}.${ext}`;
};

export const audioSourceToUint8Array = async (
  source: AudioSource,
): Promise<Uint8Array> => {
  if (source instanceof ArrayBuffer) {
    return new Uint8Array(source.slice(0));
  }

  if (ArrayBuffer.isView(source)) {
    const view = source as ArrayBufferView;
    return new Uint8Array(
      view.buffer.slice(view.byteOffset, view.byteOffset + view.byteLength),
    );
  }

  if (typeof Blob !== "undefined" && source instanceof Blob) {
    const arrayBuffer = await source.arrayBuffer();
    return new Uint8Array(arrayBuffer);
  }

  throw new Error("Unsupported audio source type");
};

const cloneWaveMetadata = (wave: WaveFile): WaveFile => {
  const source = wave as any;
  const clone = new WaveFile() as any;
  clone.container = source.container;
  clone.format = source.format;
  clone.bitDepth = source.bitDepth;
  clone.fmt = JSON.parse(JSON.stringify(source.fmt ?? {}));
  clone.fact = JSON.parse(JSON.stringify(source.fact ?? {}));
  clone.cue = JSON.parse(JSON.stringify(source.cue ?? {}));
  clone.smpl = JSON.parse(JSON.stringify(source.smpl ?? {}));
  clone.bext = JSON.parse(JSON.stringify(source.bext ?? {}));
  clone.iXML = JSON.parse(JSON.stringify(source.iXML ?? {}));
  clone.ds64 = JSON.parse(JSON.stringify(source.ds64 ?? {}));
  clone.LIST = JSON.parse(JSON.stringify(source.LIST ?? []));
  clone.junk = JSON.parse(JSON.stringify(source.junk ?? {}));
  clone._PMX = JSON.parse(JSON.stringify(source._PMX ?? {}));
  clone.data = {
    chunkId: source.data?.chunkId ?? "data",
    chunkSize: 0,
    samples: new Uint8Array(0),
  };
  return clone;
};

const createWaveSegmentBuffer = (
  template: WaveFile,
  audioBytes: Uint8Array,
  blockAlign: number,
): ArrayBuffer => {
  const chunkWave = cloneWaveMetadata(template) as any;
  chunkWave.data.samples = audioBytes;
  chunkWave.data.chunkSize = audioBytes.length;

  if (chunkWave.fact?.chunkId) {
    const frames = blockAlign > 0
      ? Math.floor(audioBytes.length / blockAlign)
      : 0;
    chunkWave.fact.dwSampleLength = frames;
  }

  if (chunkWave.ds64?.chunkId) {
    chunkWave.ds64.chunkId = "";
    chunkWave.ds64.chunkSize = 0;
    chunkWave.ds64.riffSizeHigh = 0;
    chunkWave.ds64.riffSizeLow = 0;
    chunkWave.ds64.dataSizeHigh = 0;
    chunkWave.ds64.dataSizeLow = 0;
    chunkWave.ds64.originationTime = 0;
    chunkWave.ds64.sampleCountHigh = 0;
    chunkWave.ds64.sampleCountLow = 0;
  }

  const buffer = chunkWave.toBuffer();
  const copy = new Uint8Array(buffer.length);
  copy.set(buffer);
  return copy.buffer;
};

export const tryParseWaveFile = (bytes: Uint8Array): WaveFile | null => {
  try {
    return new WaveFile(bytes);
  } catch {
    return null;
  }
};

export const getWaveDurationSeconds = (wave: WaveFile): number => {
  const waveInternal = wave as any;
  const dataBytes: Uint8Array | undefined = waveInternal.data?.samples;
  const byteRate = Number(waveInternal.fmt?.byteRate ?? 0);
  if (!dataBytes || dataBytes.length === 0) {
    return 0;
  }
  if (!Number.isFinite(byteRate) || byteRate <= 0) {
    return 0;
  }

  return dataBytes.length / byteRate;
};

export const getWaveDurationMilliseconds = (wave: WaveFile): number => {
  return getWaveDurationSeconds(wave) * 1000;
};

export const splitAudioIntoSegments = async (
  audio: AudioSource,
): Promise<ArrayBuffer[] | null> => {
  const maxSegmentDurationSeconds = DEFAULT_MAX_SEGMENT_DURATION_SECONDS;
  try {
    const bytes = await audioSourceToUint8Array(audio);
    const wave = tryParseWaveFile(bytes);
    if (!wave) {
      return null;
    }

    const waveInternal = wave as any;
    const dataBytes: Uint8Array | undefined = waveInternal.data?.samples;
    const byteRate = Number(waveInternal.fmt?.byteRate ?? 0);
    const blockAlign = Number(waveInternal.fmt?.blockAlign ?? 0);
    if (!dataBytes || dataBytes.length === 0) {
      return null;
    }
    if (!Number.isFinite(byteRate) || byteRate <= 0) {
      return null;
    }

    const durationSeconds = dataBytes.length / byteRate;
    if (
      !Number.isFinite(durationSeconds) ||
      durationSeconds <= maxSegmentDurationSeconds
    ) {
      return null;
    }

    const bytesPerSegment = Math.max(
      blockAlign > 0 ? blockAlign : 1,
      Math.floor(byteRate * maxSegmentDurationSeconds),
    );
    if (bytesPerSegment <= 0 || bytesPerSegment >= dataBytes.length) {
      return null;
    }

    const segments: ArrayBuffer[] = [];
    for (let offset = 0; offset < dataBytes.length;) {
      let end = Math.min(dataBytes.length, offset + bytesPerSegment);
      if (blockAlign > 0 && end < dataBytes.length) {
        const remainder = (end - offset) % blockAlign;
        if (remainder !== 0) {
          end -= remainder;
        }
      }
      if (end <= offset) {
        const step = blockAlign > 0 ? blockAlign : bytesPerSegment;
        end = Math.min(dataBytes.length, offset + step);
      }

      const chunkBytes = dataBytes.slice(offset, end);
      if (chunkBytes.length === 0) {
        break;
      }

      const segmentBuffer = createWaveSegmentBuffer(
        wave,
        chunkBytes,
        blockAlign,
      );
      segments.push(segmentBuffer);
      offset += chunkBytes.length;
    }

    return segments.length > 1 ? segments : null;
  } catch {
    return null;
  }
};

export const getAudioDurationSeconds = async (
  audio: AudioSource,
): Promise<number | null> => {
  try {
    const bytes = await audioSourceToUint8Array(audio);
    const wave = tryParseWaveFile(bytes);
    if (!wave) {
      return null;
    }

    const seconds = getWaveDurationSeconds(wave);
    return Number.isFinite(seconds) && seconds > 0 ? seconds : null;
  } catch {
    return null;
  }
};

export const getAudioDurationMilliseconds = async (
  audio: AudioSource,
): Promise<number | null> => {
  const seconds = await getAudioDurationSeconds(audio);
  return seconds === null ? null : seconds * 1000;
};

export const runWithRetry = async <T>(
  operation: (attempt: number) => Promise<T>,
  retries = 0,
): Promise<T> => {
  const attempts = Math.max(1, retries + 1);
  let lastError: unknown;

  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      return await operation(attempt);
    } catch (error) {
      lastError = error;
      if (attempt === attempts - 1) {
        throw error;
      }
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error("Operation failed after retries");
};

const CLEANED_TRANSCRIPTION_SCHEMA = z.object({
  cleanedTranscription: z
    .string()
    .describe("The cleaned-up version of the transcript."),
});

export const CLEANED_TRANSCRIPTION_JSON_SCHEMA =
  zodToJsonSchema(CLEANED_TRANSCRIPTION_SCHEMA, "Schema").definitions?.Schema ??
  {};

export const parseCleanedTranscription = (payload: string): string => {
  const parsed = CLEANED_TRANSCRIPTION_SCHEMA.parse(JSON.parse(payload));
  return parsed.cleanedTranscription;
};

const BASE_POST_PROCESS_PROMPT = `
You convert imperfect audio transcriptions into their intended written form based on context.

I just transcribed this audio. Clean it up by removing filler words, false starts, stutters, and obvious transcription mistakes. Fix grammar, punctuation, and capitalization while preserving tone and meaning. Do not add new content. Do not use m-dashes. Output only the corrected transcript.
`.trim();

export const buildPostProcessMessages = (args: {
  transcript: string;
  prompt?: string;
}): ChatCompletionMessageParam[] => {
  const additionalPrompt = args.prompt?.trim();
  const userPrompt = additionalPrompt
    ? `${BASE_POST_PROCESS_PROMPT}\n\nAdditional instructions:\n${additionalPrompt}\n`
    : BASE_POST_PROCESS_PROMPT;

  const transcriptSection = `
Transcript:
-------
${args.transcript}
-------
`.trim();

  return [
    {
      role: "system",
      content: [
        {
          type: "text",
          text:
            "You convert imperfect audio transcriptions into their intended written form based on context.",
        },
      ],
    },
    {
      role: "user",
      content: [
        {
          type: "text",
          text: `${userPrompt}\n\n${transcriptSection}`,
        },
      ],
    },
  ];
};

export const contentToString = (
  content: string | ChatCompletionContentPart[] | null | undefined,
): string => {
  if (!content) {
    return "";
  }

  if (typeof content === "string") {
    return content;
  }

  return content
    .map((part) => {
      if (part.type === "text") {
        return part.text ?? "";
      }
      return "";
    })
    .join("")
    .trim();
};
