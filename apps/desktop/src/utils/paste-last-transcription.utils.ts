import type { Transcription } from "@voquill/types";
import type { PasteKeybindSupport } from "../state/app.state";

const FAILED_TRANSCRIPTION_PLACEHOLDER = "[Transcription Failed]";

export type TranscriptionStateLike = {
  transcriptionById: Record<string, Transcription | undefined>;
  transcriptions: {
    transcriptionIds: string[];
  };
};

export type ResolveReplayPasteKeybindArgs = {
  supportsPasteKeybinds: PasteKeybindSupport;
  userPasteKeybind?: string | null;
  appTargetPasteKeybind?: string | null;
};

export const getPasteableTranscript = (
  transcription: Transcription | null | undefined,
): string | null => {
  const transcript = transcription?.transcript.trim() ?? "";
  if (!transcript || transcript === FAILED_TRANSCRIPTION_PLACEHOLDER) {
    return null;
  }

  return transcript;
};

export const findLatestPasteableTranscript = (
  transcriptions: Array<Transcription | null | undefined>,
): string | null => {
  for (const transcription of transcriptions) {
    const transcript = getPasteableTranscript(transcription);
    if (transcript) {
      return transcript;
    }
  }

  return null;
};

export const getLatestPasteableTranscriptFromState = (
  state: TranscriptionStateLike,
): string | null => {
  return findLatestPasteableTranscript(
    state.transcriptions.transcriptionIds.map(
      (id) => state.transcriptionById[id],
    ),
  );
};

export const resolveReplayPasteKeybind = ({
  supportsPasteKeybinds,
  userPasteKeybind,
  appTargetPasteKeybind,
}: ResolveReplayPasteKeybindArgs): string | null => {
  if (supportsPasteKeybinds === "disabled") {
    return null;
  }

  const userKeybind = userPasteKeybind ?? null;
  if (supportsPasteKeybinds === "global") {
    return userKeybind;
  }

  return appTargetPasteKeybind ?? userKeybind;
};
