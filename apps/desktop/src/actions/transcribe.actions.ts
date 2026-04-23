import { invoke } from "@tauri-apps/api/core";
import {
  DictationContext,
  DictationContextTarget,
  DictationIntent,
  Nullable,
  Transcription,
  TranscriptionAudioSnapshot,
  toStoredTranscriptionContract,
} from "@voquill/types";
import { countWords, dedup } from "@voquill/utilities";
import dayjs from "dayjs";
import {
  getGenerateTextRepo,
  getTranscribeAudioRepo,
  getTranscriptionRepo,
} from "../repos";
import { getAppState, produceAppState } from "../store";
import type { TextFieldInfo } from "../types/accessibility.types";
import { PostProcessingMode, TranscriptionMode } from "../types/ai.types";
import { AudioSamples } from "../types/audio.types";
import { StopRecordingResponse } from "../types/transcription-session.types";
import {
  parseStructuredJsonResponse,
  recoverPlainTextFromLLMResponse,
} from "../utils/ai.utils";
import { createId } from "../utils/id.utils";
import {
  coerceToDictationLanguage,
  mapDictationLanguageToWhisperLanguage,
} from "../utils/language.utils";
import { getLogger } from "../utils/log.utils";
import {
  buildDictationContext,
  buildLocalizedTranscriptionPrompt,
  buildPostProcessingPrompt,
  buildSystemPostProcessingTonePrompt,
  collectDictionaryTerms,
  mergeScreenContexts,
  PostProcessingPromptInput,
  PROCESSED_TRANSCRIPTION_JSON_SCHEMA,
  PROCESSED_TRANSCRIPTION_SCHEMA,
} from "../utils/prompt.utils";
import { getToneById, getToneConfig } from "../utils/tone.utils";
import {
  getMyEffectiveUserId,
  getMyUserName,
  loadMyEffectiveDictationLanguage,
} from "../utils/user.utils";
import { showErrorSnackbar } from "./app.actions";
import { addWordsToCurrentUser } from "./user.actions";

export { planDesktopTranscriptionSelection } from "../utils/user.utils";

export type TranscribeAudioInput = {
  samples: AudioSamples;
  sampleRate: number;
  dictationLanguage?: string;
  currentApp?: DictationContextTarget | null;
  currentEditor?: DictationContextTarget | null;
  selectedText?: string | null;
  screenContext?: string | null;
};

export type TranscribeAudioMetadata = {
  modelSize?: string | null;
  inferenceDevice?: string | null;
  transcriptionPrompt?: string | null;
  transcriptionApiKeyId?: string | null;
  transcriptionMode?: TranscriptionMode | null;
  transcriptionDurationMs?: number | null;
};

export type TranscribeAudioResult = {
  rawTranscript: string;
  warnings: string[];
  metadata: TranscribeAudioMetadata;
};

export type PostProcessInput = {
  rawTranscript: string;
  toneId: Nullable<string>;
  dictationLanguage?: string;
  currentApp?: DictationContextTarget | null;
  currentEditor?: DictationContextTarget | null;
  selectedText?: string | null;
  screenContext?: string | null;
};

export type PostProcessMetadata = {
  postProcessPrompt?: string | null;
  postProcessApiKeyId?: string | null;
  postProcessMode?: PostProcessingMode | null;
  postProcessDevice?: string | null;
  postprocessDurationMs?: number | null;
};

export type PostProcessResult = {
  transcript: string;
  warnings: string[];
  metadata: PostProcessMetadata;
};

export type ResolveDesktopDictationContextInput = {
  currentApp?: DictationContextTarget | null;
  currentEditor?: DictationContextTarget | null;
  a11yInfo?: TextFieldInfo | null;
  screenContext?: string | null;
};

export type ResolvedDesktopDictationContext = {
  currentApp: DictationContextTarget | null;
  currentEditor: DictationContextTarget | null;
  selectedText: string | null;
  screenContext: string | null;
};

const FOCUSED_TEXT_FIELD_TARGET: DictationContextTarget = {
  id: "focused-text-field",
  name: "Focused text field",
};

const hasFocusedTextFieldInfo = (a11yInfo?: TextFieldInfo | null): boolean =>
  Boolean(
    a11yInfo &&
    (typeof a11yInfo.cursorPosition === "number" ||
      typeof a11yInfo.selectionLength === "number" ||
      a11yInfo.textContent),
  );

const deriveSelectedTextFromA11yInfo = (
  a11yInfo?: TextFieldInfo | null,
): string | null => {
  if (!a11yInfo?.textContent) {
    return null;
  }

  const { cursorPosition, selectionLength, textContent } = a11yInfo;
  if (
    cursorPosition == null ||
    selectionLength == null ||
    selectionLength <= 0
  ) {
    return null;
  }

  const start = Math.max(0, Math.min(cursorPosition, textContent.length));
  const end = Math.max(
    start,
    Math.min(start + selectionLength, textContent.length),
  );
  return textContent.slice(start, end) || null;
};

export const resolveDesktopDictationContext = ({
  currentApp = null,
  currentEditor = null,
  a11yInfo = null,
  screenContext = null,
}: ResolveDesktopDictationContextInput): ResolvedDesktopDictationContext => ({
  currentApp,
  currentEditor:
    currentEditor ??
    (hasFocusedTextFieldInfo(a11yInfo) ? FOCUSED_TEXT_FIELD_TARGET : null),
  selectedText: deriveSelectedTextFromA11yInfo(a11yInfo),
  screenContext: mergeScreenContexts({ accessibilityContext: screenContext }),
});

// Combined metadata type for storage compatibility
export type TranscriptionMetadata = TranscribeAudioMetadata &
  PostProcessMetadata & {
    rawTranscript?: string | null;
  };

const STT_HINT_LIMITS = {
  appName: 60,
  editorName: 60,
  selectedText: 160,
  screenContext: 220,
} as const;

const truncatePromptHint = (value: string, limit: number): string =>
  value.length <= limit ? value : `${value.slice(0, limit - 1).trimEnd()}…`;

const buildPromptDictionaryEntries = (
  context: DictationContext,
): Parameters<typeof buildLocalizedTranscriptionPrompt>[0]["entries"] => ({
  sources: context.glossaryTerms,
  replacements: Object.entries(context.replacementMap).map(
    ([source, destination]) => ({
      source,
      destination,
    }),
  ),
});

const buildContextAwareTranscriptionPrompt = (args: {
  context: DictationContext;
  dictationLanguage: Parameters<
    typeof buildLocalizedTranscriptionPrompt
  >[0]["dictationLanguage"];
  state: ReturnType<typeof getAppState>;
  supportsPromptHints: boolean;
}): string => {
  const glossaryPrompt = buildLocalizedTranscriptionPrompt({
    entries: buildPromptDictionaryEntries(args.context),
    dictationLanguage: args.dictationLanguage,
    state: args.state,
  });

  if (!args.supportsPromptHints) {
    return glossaryPrompt;
  }

  const contextHints: string[] = [];

  if (args.context.currentApp?.name) {
    contextHints.push(
      `Current app: ${truncatePromptHint(args.context.currentApp.name, STT_HINT_LIMITS.appName)}`,
    );
  }

  if (args.context.currentEditor?.name) {
    contextHints.push(
      `Current editor: ${truncatePromptHint(args.context.currentEditor.name, STT_HINT_LIMITS.editorName)}`,
    );
  }

  if (args.context.selectedText) {
    contextHints.push(
      `Selected text: ${truncatePromptHint(args.context.selectedText, STT_HINT_LIMITS.selectedText)}`,
    );
  }

  if (args.context.screenContext) {
    contextHints.push(
      `Screen context: ${truncatePromptHint(args.context.screenContext, STT_HINT_LIMITS.screenContext)}`,
    );
  }

  if (contextHints.length === 0) {
    return glossaryPrompt;
  }

  return `${glossaryPrompt}\n\nContext hints:\n${contextHints.join("\n")}`;
};

/**
 * Transcribe audio samples to text.
 * This is the first step - just converts audio to raw transcript.
 */
export const transcribeAudio = async ({
  samples,
  sampleRate,
  dictationLanguage: dictationLanguageOverride,
  currentApp = null,
  currentEditor = null,
  selectedText = null,
  screenContext = null,
}: TranscribeAudioInput): Promise<TranscribeAudioResult> => {
  const state = getAppState();

  const metadata: TranscribeAudioMetadata = {};
  const warnings: string[] = [];

  const {
    repo: transcribeRepo,
    apiKeyId: transcriptionApiKeyId,
    warnings: transcribeWarnings,
  } = getTranscribeAudioRepo();
  warnings.push(...transcribeWarnings);

  const dictationLanguage = dictationLanguageOverride
    ? coerceToDictationLanguage(dictationLanguageOverride)
    : await loadMyEffectiveDictationLanguage(state);
  const whisperLanguage =
    mapDictationLanguageToWhisperLanguage(dictationLanguage);

  getLogger().verbose(
    `Transcribing audio: language=${dictationLanguage}, whisper=${whisperLanguage}, sampleRate=${sampleRate}`,
  );

  const context = buildDictationContext({
    dictationLanguage,
    intent: {
      kind: "dictation",
      format: "clean",
    },
    terms: collectDictionaryTerms(state),
    currentApp,
    currentEditor,
    selectedText,
    screenContext,
  });
  const transcriptionPrompt = buildContextAwareTranscriptionPrompt({
    context,
    dictationLanguage,
    state,
    supportsPromptHints: transcribeRepo.supportsPromptHints(),
  });

  getLogger().verbose(
    `Transcription prompt: ${transcriptionPrompt.length} chars, apiKeyId=${transcriptionApiKeyId ?? "none"}`,
  );

  const transcribeStart = performance.now();
  const transcribeOutput = await transcribeRepo.transcribeAudio({
    samples,
    sampleRate,
    prompt: transcriptionPrompt,
    language: whisperLanguage,
  });
  const transcribeDuration = performance.now() - transcribeStart;
  const rawTranscript = transcribeOutput.text.trim();

  getLogger().info(
    `Transcription complete in ${Math.round(transcribeDuration)}ms (${rawTranscript.length} chars, mode=${transcribeOutput.metadata?.transcriptionMode ?? "unknown"})`,
  );

  metadata.modelSize =
    transcribeOutput.metadata?.modelSize ||
    state.settings.aiTranscription.modelSize ||
    null;
  metadata.inferenceDevice = transcribeOutput.metadata?.inferenceDevice || null;
  metadata.transcriptionDurationMs = Math.round(transcribeDuration);
  metadata.transcriptionPrompt = transcriptionPrompt;
  metadata.transcriptionApiKeyId = transcriptionApiKeyId;
  metadata.transcriptionMode =
    transcribeOutput.metadata?.transcriptionMode || null;

  if (warnings.length > 0) {
    getLogger().warning(`Transcription warnings: ${warnings.join("; ")}`);
  }

  return {
    rawTranscript,
    warnings: dedup(warnings),
    metadata,
  };
};



/**
 * Post-process a raw transcript using LLM.
 * This is the second step - cleans up and formats the transcript based on tone.
 */
export const postProcessTranscript = async ({
  rawTranscript,
  toneId,
  dictationLanguage: dictationLanguageOverride,
  currentApp = null,
  currentEditor = null,
  selectedText = null,
  screenContext = null,
}: PostProcessInput): Promise<PostProcessResult> => {
  const state = getAppState();

  const metadata: PostProcessMetadata = {};
  const warnings: string[] = [];

  const {
    repo: genRepo,
    apiKeyId: genApiKeyId,
    warnings: genWarnings,
  } = getGenerateTextRepo();
  warnings.push(...genWarnings);

  const tone = getToneById(state, toneId);
  const toneProcessingDisabled = tone?.shouldDisablePostProcessing ?? false;
  const enterpriseProcessingDisabled =
    state.enterpriseConfig?.allowPostProcessing === false;

  let processedTranscript = rawTranscript;
  if (toneProcessingDisabled || enterpriseProcessingDisabled) {
    getLogger().info(`Post-processing disabled for tone=${toneId}`);
    metadata.postProcessMode = "none";
  } else if (genRepo) {
    getLogger().verbose(
      `Post-processing with tone=${toneId ?? "default"}, apiKeyId=${genApiKeyId ?? "none"}`,
    );
    const dictationLanguage = dictationLanguageOverride
      ? coerceToDictationLanguage(dictationLanguageOverride)
      : await loadMyEffectiveDictationLanguage(state);
    const toneConfig = getToneConfig(state, toneId);
    const context = buildDictationContext({
      dictationLanguage,
      intent: {
        kind: "dictation",
        format: toneProcessingDisabled ? "verbatim" : "clean",
      },
      terms: collectDictionaryTerms(state),
      currentApp,
      currentEditor,
      selectedText,
      screenContext,
    });
    getLogger().verbose(
      "Post-process language:",
      dictationLanguage,
      "toneName:",
      tone?.name ?? "unknown",
    );

    const promptInput: PostProcessingPromptInput = {
      transcript: rawTranscript,
      userName: getMyUserName(state),
      dictationLanguage,
      tone: toneConfig,
      context,
    };
    const ppSystem = buildSystemPostProcessingTonePrompt(promptInput);
    const ppPrompt = buildPostProcessingPrompt(promptInput);
    getLogger().verbose(
      "Post-process prompt length:",
      ppPrompt.length,
      "system length:",
      ppSystem.length,
    );

    const postprocessStart = performance.now();
    getLogger().verbose("Calling LLM for post-processing");
    const genOutput = await genRepo.generateText({
      system: ppSystem,
      prompt: ppPrompt,
      jsonResponse: {
        name: "transcription_cleaning",
        description: "JSON response with the processed transcription",
        schema: PROCESSED_TRANSCRIPTION_JSON_SCHEMA,
      },
    });
    const postprocessDuration = performance.now() - postprocessStart;
    metadata.postprocessDurationMs = Math.round(postprocessDuration);

    getLogger().info(
      `Post-processing complete in ${Math.round(postprocessDuration)}ms`,
    );
    getLogger().verbose("LLM raw output length:", genOutput.text.length);

    try {
      const parsed = parseStructuredJsonResponse(genOutput.text, "result");

      const validationResult = PROCESSED_TRANSCRIPTION_SCHEMA.safeParse(parsed);
      if (!validationResult.success) {
        getLogger().warning(
          "Post-processing validation failed:",
          validationResult.error.message,
        );
        // Attempt a plain-text rescue: if the LLM returned text without valid JSON,
        // use it directly rather than silently falling back to the raw STT transcript.
        const rescued = recoverPlainTextFromLLMResponse(genOutput.text);
        if (rescued) {
          getLogger().warning(
            "Post-processing JSON parse failed, recovered plain text from LLM response",
          );
          processedTranscript = rescued;
        } else {
          getLogger().error(
            "Post-processing completely failed, using raw STT transcript",
          );
          warnings.push(
            `Post-processing response validation failed: ${validationResult.error.message}`,
          );
        }
      } else {
        processedTranscript = validationResult.data.result.trim();
        getLogger().verbose(
          "Processed transcript length:",
          processedTranscript.length,
        );
      }
    } catch (e) {
      getLogger().error("Failed to parse post-processing response:", e);
      // Last-resort rescue: treat the entire raw LLM output as the cleaned transcript
      // (it may just be plain text that didn't wrap in JSON).
      const rescued = recoverPlainTextFromLLMResponse(genOutput.text);
      if (rescued) {
        getLogger().warning(
          "Post-processing JSON parse failed, recovered plain text from LLM response",
        );
        processedTranscript = rescued;
      } else {
        getLogger().error(
          "Post-processing completely failed, using raw STT transcript",
        );
        warnings.push(
          `Failed to parse post-processing response: ${(e as Error).message}`,
        );
      }
    }

    metadata.postProcessPrompt = ppPrompt;
    metadata.postProcessApiKeyId = genApiKeyId;
    metadata.postProcessMode = genOutput.metadata?.postProcessingMode || null;
    metadata.postProcessDevice = genOutput.metadata?.inferenceDevice || null;
    getLogger().verbose(
      "Post-process mode:",
      metadata.postProcessMode,
      "device:",
      metadata.postProcessDevice,
    );
  } else {
    getLogger().info("No post-processing repo configured, skipping");
    metadata.postProcessMode = "none";
  }

  return {
    transcript: processedTranscript,
    warnings: dedup(warnings),
    metadata,
  };
};

export type StoreTranscriptionInput = {
  audio: StopRecordingResponse;
  rawTranscript: string | null;
  sanitizedTranscript: string | null;
  transcript: string | null;
  authoritativeTranscript?: string | null;
  isAuthoritative?: boolean | null;
  isFinalized?: boolean | null;
  dictationIntent?: DictationIntent | null;
  transcriptionMetadata: TranscribeAudioMetadata;
  postProcessMetadata: PostProcessMetadata;
  warnings: string[];
  remoteStatus?: "sent" | "received" | null;
  remoteDeviceId?: string | null;
};

export type StoreTranscriptionOutput = {
  transcription: Transcription | null;
  wordCount: number;
};

export const storeTranscription = async (
  input: StoreTranscriptionInput,
): Promise<StoreTranscriptionOutput> => {
  getLogger().verbose("Storing transcription record");
  const rate = input.audio.sampleRate;

  const sampleCount = (() => {
    const samples = input.audio.samples as unknown;
    if (Array.isArray(samples)) {
      return samples.length;
    }

    if (
      samples &&
      typeof (samples as { length?: number }).length === "number"
    ) {
      return (samples as { length: number }).length;
    }

    return 0;
  })();

  if (rate == null || Number.isNaN(rate)) {
    getLogger().error("Received audio payload without sample rate");
    showErrorSnackbar("Recording missing sample rate. Please try again.");
    return { transcription: null, wordCount: 0 };
  }

  if (rate <= 0 || sampleCount === 0) {
    getLogger().warning(
      `Skipping store: rate=${rate}, sampleCount=${sampleCount}`,
    );
    return { transcription: null, wordCount: 0 };
  }

  const state = getAppState();
  const incognitoEnabled = state.userPrefs?.incognitoModeEnabled ?? false;
  const includeInStats = state.userPrefs?.incognitoModeIncludeInStats ?? false;
  const wordsAdded = input.transcript ? countWords(input.transcript) : 0;

  if (incognitoEnabled) {
    getLogger().verbose(
      `Incognito mode: skipping storage (includeInStats=${includeInStats}, words=${wordsAdded})`,
    );
    if (wordsAdded > 0 && includeInStats) {
      try {
        await addWordsToCurrentUser(wordsAdded);
      } catch (error) {
        console.error("Failed to update usage metrics", error);
      }
    }

    return { transcription: null, wordCount: wordsAdded };
  }

  const payloadSamples = Array.isArray(input.audio.samples)
    ? input.audio.samples
    : Array.from(input.audio.samples ?? []);

  if (rate <= 0 || payloadSamples.length === 0) {
    return { transcription: null, wordCount: 0 };
  }

  const transcriptionId = createId();

  let audioSnapshot: TranscriptionAudioSnapshot | undefined;
  if (!incognitoEnabled) {
    try {
      audioSnapshot = await invoke<TranscriptionAudioSnapshot>(
        "store_transcription_audio",
        {
          id: transcriptionId,
          samples: payloadSamples,
          sampleRate: rate,
        },
      );
    } catch (error) {
      console.error("Failed to persist audio snapshot", error);
    }
  }

  const transcriptionFailed =
    input.rawTranscript === null && input.warnings.length > 0;
  const storedTranscript = !transcriptionFailed
    ? (input.transcript ?? "")
    : "[Transcription Failed]";
  const storedRawTranscript = input.rawTranscript ?? input.transcript ?? "";
  const storedContract = toStoredTranscriptionContract({
    text: storedTranscript,
    rawTranscript: storedRawTranscript,
    authoritativeTranscript:
      input.authoritativeTranscript ?? storedRawTranscript,
    isAuthoritative: input.isAuthoritative ?? true,
    isFinalized: input.isFinalized ?? true,
    ...(input.dictationIntent !== undefined
      ? { dictationIntent: input.dictationIntent }
      : {}),
  });

  const transcription: Transcription = {
    id: transcriptionId,
    transcript: storedContract.text,
    createdAt: dayjs().toISOString(),
    createdByUserId: getMyEffectiveUserId(state),
    isDeleted: false,
    audio: audioSnapshot,
    modelSize: input.transcriptionMetadata.modelSize ?? null,
    inferenceDevice: input.transcriptionMetadata.inferenceDevice ?? null,
    rawTranscript: storedContract.rawTranscript,
    authoritativeTranscript: storedContract.authoritativeTranscript,
    isAuthoritative: storedContract.isAuthoritative,
    isFinalized: storedContract.isFinalized,
    dictationIntent: storedContract.dictationIntent,
    sanitizedTranscript: input.sanitizedTranscript ?? null,
    transcriptionPrompt:
      input.transcriptionMetadata.transcriptionPrompt ?? null,
    postProcessPrompt: input.postProcessMetadata.postProcessPrompt ?? null,
    transcriptionApiKeyId:
      input.transcriptionMetadata.transcriptionApiKeyId ?? null,
    postProcessApiKeyId: input.postProcessMetadata.postProcessApiKeyId ?? null,
    transcriptionMode: input.transcriptionMetadata.transcriptionMode ?? null,
    postProcessMode: input.postProcessMetadata.postProcessMode ?? null,
    postProcessDevice: input.postProcessMetadata.postProcessDevice ?? null,
    transcriptionDurationMs:
      input.transcriptionMetadata.transcriptionDurationMs ?? null,
    postprocessDurationMs:
      input.postProcessMetadata.postprocessDurationMs ?? null,
    warnings: input.warnings.length > 0 ? input.warnings : null,
    remoteStatus: input.remoteStatus ?? null,
    remoteDeviceId: input.remoteDeviceId ?? null,
  };

  let storedTranscription: Transcription;

  try {
    storedTranscription =
      await getTranscriptionRepo().createTranscription(transcription);
  } catch (error) {
    console.error("Failed to store transcription", error);
    showErrorSnackbar("Unable to save transcription. Please try again.");
    return { transcription: null, wordCount: 0 };
  }

  produceAppState((draft) => {
    draft.transcriptionById[storedTranscription.id] = storedTranscription;
    const existingIds = draft.transcriptions.transcriptionIds.filter(
      (identifier) => identifier !== storedTranscription.id,
    );
    draft.transcriptions.transcriptionIds = [
      storedTranscription.id,
      ...existingIds,
    ];
  });

  if (wordsAdded > 0) {
    try {
      await addWordsToCurrentUser(wordsAdded);
    } catch (error) {
      console.error("Failed to update usage metrics", error);
    }
  }

  try {
    const purgedIds = await getTranscriptionRepo().purgeStaleAudio();
    if (purgedIds.length > 0) {
      produceAppState((draft) => {
        for (const purgedId of purgedIds) {
          const purged = draft.transcriptionById[purgedId];
          if (purged) {
            delete purged.audio;
          }
        }
      });
    }
  } catch (error) {
    console.error("Failed to purge stale audio snapshots", error);
  }

  return { transcription: storedTranscription, wordCount: wordsAdded };
};
