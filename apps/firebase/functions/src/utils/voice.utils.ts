import { firemix } from "@firemix/mixed";
import { mixpath } from "@repo/firemix";
import { AI_MAX_AUDIO_DURATION_SECONDS } from "@repo/functions";
import { Member } from "@repo/types";
import { getMemberExceedsTokenLimit, getMemberExceedsWordLimit } from "@repo/utilities";
import { AuthData } from "firebase-functions/tasks";
import { loadFullConfig } from "./config.utils";
import { ClientError } from "./error.utils";

export const validateAudioInput = (args: {
  audioMimeType: string;
}): { ext: string } => {
  const audioMimeType = args.audioMimeType;
  const audioExt = audioMimeType.split("/").at(-1);
  if (!audioExt) {
    throw new ClientError("Invalid audio MIME type");
  }

  return { ext: audioExt };
};

export const validateMemberWithinLimits = async (args: {
  auth: AuthData;
}): Promise<{ member: Member }> => {
  const member = await firemix().get(mixpath.members(args.auth.uid));
  if (!member) {
    console.warn("no member found for user", args.auth.uid);
    throw new ClientError("You must be a member");
  }

  const config = await loadFullConfig();
  if (getMemberExceedsWordLimit(member.data, config)) {
    console.warn("member exceeds word limit", member.data);
    throw new ClientError("You have exceeded your word limit");
  }

  if (getMemberExceedsTokenLimit(member.data, config)) {
    console.warn("member exceeds token limit", member.data);
    throw new ClientError("You have exceeded your token limit");
  }

  return { member: member.data };
};

export const incrementWordCount = async (args: {
  auth: AuthData;
  count: number;
}): Promise<void> => {
  const roundedInt = Math.max(0, Math.round(args.count));
  await firemix().update(mixpath.members(args.auth.uid), {
    wordsToday: firemix().increment(roundedInt),
    wordsThisMonth: firemix().increment(roundedInt),
    wordsTotal: firemix().increment(roundedInt),
    updatedAt: firemix().now(),
  });
};

export const incrementTokenCount = async (args: {
  auth: AuthData;
  count: number;
}): Promise<void> => {
  const roundedInt = Math.max(0, Math.round(args.count));
  await firemix().update(mixpath.members(args.auth.uid), {
    tokensToday: firemix().increment(roundedInt),
    tokensThisMonth: firemix().increment(roundedInt),
    tokensTotal: firemix().increment(roundedInt),
    updatedAt: firemix().now(),
  });
};

const WAV_HEADER_MIN_LENGTH = 44;

const readChunkId = (buffer: Buffer, offset: number): string =>
  buffer.toString("ascii", offset, offset + 4);

const alignChunkSize = (size: number): number =>
  size % 2 === 0 ? size : size + 1;

const getPcmWavDurationSeconds = (buffer: Buffer): number => {
  if (buffer.byteLength < WAV_HEADER_MIN_LENGTH) {
    throw new ClientError("Audio file is too small to process");
  }

  if (
    readChunkId(buffer, 0) !== "RIFF" ||
    readChunkId(buffer, 8) !== "WAVE"
  ) {
    throw new ClientError("Audio file must be a PCM WAV clip");
  }

  let offset = 12;
  let sampleRate: number | undefined;
  let bitsPerSample: number | undefined;
  let channels: number | undefined;
  let dataSize: number | undefined;
  let audioFormat: number | undefined;

  while (offset + 8 <= buffer.byteLength) {
    const chunkId = readChunkId(buffer, offset);
    const chunkSize = buffer.readUInt32LE(offset + 4);
    const chunkDataStart = offset + 8;
    const chunkDataEnd = chunkDataStart + chunkSize;

    if (chunkDataEnd > buffer.byteLength) {
      break;
    }

    if (chunkId === "fmt ") {
      audioFormat = buffer.readUInt16LE(chunkDataStart);
      channels = buffer.readUInt16LE(chunkDataStart + 2);
      sampleRate = buffer.readUInt32LE(chunkDataStart + 4);
      bitsPerSample = buffer.readUInt16LE(chunkDataStart + 14);
    } else if (chunkId === "data") {
      dataSize = chunkSize;
      if (sampleRate && bitsPerSample && channels) {
        break;
      }
    }

    offset = chunkDataEnd + alignChunkSize(chunkSize) - chunkSize;
  }

  if (audioFormat !== 1 || !sampleRate || !bitsPerSample || !channels) {
    throw new ClientError("Only linear PCM WAV audio is supported");
  }

  if (!dataSize) {
    throw new ClientError("Audio file is missing data");
  }

  const bytesPerSample = (bitsPerSample / 8) * channels;

  if (!bytesPerSample || !Number.isFinite(bytesPerSample)) {
    throw new ClientError("Invalid audio encoding");
  }

  const durationSeconds = dataSize / (bytesPerSample * sampleRate);

  if (!Number.isFinite(durationSeconds) || durationSeconds <= 0) {
    throw new ClientError("Unable to determine audio duration");
  }

  return durationSeconds;
};

export const ensureAudioDurationWithinLimit = (args: {
  audioBuffer: Buffer;
  maxDurationSeconds?: number;
}): number => {
  const maxDuration = args.maxDurationSeconds ?? AI_MAX_AUDIO_DURATION_SECONDS;
  const durationSeconds = getPcmWavDurationSeconds(args.audioBuffer);

  if (durationSeconds > maxDuration) {
    const maxMinutes = Math.round((maxDuration / 60) * 10) / 10;
    throw new ClientError(
      `Audio duration must be ${maxMinutes} minutes or less`
    );
  }

  return durationSeconds;
};
