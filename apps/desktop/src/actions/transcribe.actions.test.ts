import type { ApiKey } from "@voquill/types";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AppState, INITIAL_APP_STATE } from "../state/app.state";
import {
  planDesktopTranscriptionSelection,
  storeTranscription,
  transcribeAudio,
} from "./transcribe.actions";

const {
  storeState,
  invokeMock,
  createTranscriptionMock,
  purgeStaleAudioMock,
  addWordsToCurrentUserMock,
  transcribeAudioRepoMock,
  getTranscribeAudioRepoMock,
  loadMyEffectiveDictationLanguageMock,
} = vi.hoisted(() => ({
  storeState: {
    appState: undefined as AppState | undefined,
  },
  invokeMock: vi.fn(),
  createTranscriptionMock: vi.fn(),
  purgeStaleAudioMock: vi.fn(),
  addWordsToCurrentUserMock: vi.fn(),
  transcribeAudioRepoMock: vi.fn(),
  getTranscribeAudioRepoMock: vi.fn(),
  loadMyEffectiveDictationLanguageMock: vi.fn(async () => "en"),
}));

vi.mock("@tauri-apps/api/core", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@tauri-apps/api/core")>();

  return {
    ...actual,
    invoke: invokeMock,
  };
});

vi.mock("../repos", () => ({
  getTranscriptionRepo: () => ({
    createTranscription: createTranscriptionMock,
    purgeStaleAudio: purgeStaleAudioMock,
  }),
  getTranscribeAudioRepo: getTranscribeAudioRepoMock,
  getGenerateTextRepo: () => ({
    repo: null,
    apiKeyId: null,
    warnings: [],
  }),
}));

vi.mock("../store", () => ({
  getAppState: () => storeState.appState,
  produceAppState: (fn: (draft: AppState) => void) => {
    if (!storeState.appState) {
      throw new Error("App state not initialized for test");
    }

    fn(storeState.appState);
  },
}));

vi.mock("./app.actions", () => ({
  showErrorSnackbar: vi.fn(),
}));

vi.mock("../utils/log.utils", () => ({
  getLogger: () => ({
    verbose: vi.fn(),
    info: vi.fn(),
    warning: vi.fn(),
    error: vi.fn(),
  }),
}));

vi.mock("./user.actions", () => ({
  addWordsToCurrentUser: addWordsToCurrentUserMock,
}));

vi.mock("../utils/user.utils", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("../utils/user.utils")>();

  return {
    ...actual,
    loadMyEffectiveDictationLanguage: loadMyEffectiveDictationLanguageMock,
  };
});

const makeApiKey = (overrides: Partial<ApiKey> & Pick<ApiKey, "id" | "provider">): ApiKey => ({
  id: overrides.id,
  name: overrides.name ?? overrides.id,
  provider: overrides.provider,
  createdAt: overrides.createdAt ?? "2026-04-22T00:00:00.000Z",
  keySuffix: overrides.keySuffix ?? "1234",
  keyFull: overrides.keyFull ?? "secret",
  transcriptionModel: overrides.transcriptionModel ?? null,
  postProcessingModel: overrides.postProcessingModel ?? null,
  openRouterConfig: overrides.openRouterConfig ?? null,
  baseUrl: overrides.baseUrl ?? null,
  azureRegion: overrides.azureRegion ?? null,
  includeV1Path: overrides.includeV1Path ?? null,
});

describe("planDesktopTranscriptionSelection", () => {
  beforeEach(() => {
    invokeMock.mockReset();
    createTranscriptionMock.mockReset();
    purgeStaleAudioMock.mockReset();
    addWordsToCurrentUserMock.mockReset();
    transcribeAudioRepoMock.mockReset();
    getTranscribeAudioRepoMock.mockReset();
    loadMyEffectiveDictationLanguageMock.mockReset();
    loadMyEffectiveDictationLanguageMock.mockResolvedValue("en");
    storeState.appState = structuredClone(INITIAL_APP_STATE);
    invokeMock.mockResolvedValue({
      filePath: "/audio/transcription.wav",
      durationMs: 250,
    });
    createTranscriptionMock.mockImplementation(async (transcription) => transcription);
    purgeStaleAudioMock.mockResolvedValue([]);
    addWordsToCurrentUserMock.mockResolvedValue(undefined);
  });

  it("chooses a capability-matched BYOK provider instead of blindly reusing the current one", () => {
    const state: AppState = {
      ...INITIAL_APP_STATE,
      local: {
        ...INITIAL_APP_STATE.local,
        accurateDictationEnabled: true,
      },
      settings: {
        ...INITIAL_APP_STATE.settings,
        aiTranscription: {
          ...INITIAL_APP_STATE.settings.aiTranscription,
          mode: "api",
          selectedApiKeyId: "azure-key",
        },
      },
      apiKeyById: {
        "azure-key": makeApiKey({
          id: "azure-key",
          name: "Azure",
          provider: "azure",
          transcriptionModel: "whisper",
          azureRegion: "eastus",
        }),
        "deepgram-key": makeApiKey({
          id: "deepgram-key",
          name: "Deepgram",
          provider: "deepgram",
          transcriptionModel: "nova-3",
        }),
      },
    };

    expect(planDesktopTranscriptionSelection(state)).toMatchObject({
      apiKeyId: "deepgram-key",
      provider: "deepgram",
      model: "nova-3",
    });
  });

  it("preserves the selected BYOK provider and model when they already satisfy accurate dictation", () => {
    const state: AppState = {
      ...INITIAL_APP_STATE,
      local: {
        ...INITIAL_APP_STATE.local,
        accurateDictationEnabled: true,
      },
      settings: {
        ...INITIAL_APP_STATE.settings,
        aiTranscription: {
          ...INITIAL_APP_STATE.settings.aiTranscription,
          mode: "api",
          selectedApiKeyId: "selected-deepgram",
        },
      },
      apiKeyById: {
        "fallback-deepgram": makeApiKey({
          id: "fallback-deepgram",
          provider: "deepgram",
          transcriptionModel: "nova-2",
        }),
        "selected-deepgram": makeApiKey({
          id: "selected-deepgram",
          provider: "deepgram",
          transcriptionModel: "nova-3",
        }),
      },
    };

    expect(planDesktopTranscriptionSelection(state)).toMatchObject({
      apiKeyId: "selected-deepgram",
      provider: "deepgram",
      model: "nova-3",
    });
  });
});

describe("transcribeAudio", () => {
  beforeEach(() => {
    invokeMock.mockReset();
    createTranscriptionMock.mockReset();
    purgeStaleAudioMock.mockReset();
    addWordsToCurrentUserMock.mockReset();
    transcribeAudioRepoMock.mockReset();
    getTranscribeAudioRepoMock.mockReset();
    loadMyEffectiveDictationLanguageMock.mockReset();
    loadMyEffectiveDictationLanguageMock.mockResolvedValue("en");
    storeState.appState = structuredClone(INITIAL_APP_STATE);
    transcribeAudioRepoMock.mockResolvedValue({
      text: "hello world",
      metadata: {
        transcriptionMode: "api",
        modelSize: "mock-model",
        inferenceDevice: "Mock Device",
      },
    });
  });

  it("adds bounded editor and screen context only for provider paths that support prompt hints", async () => {
    getTranscribeAudioRepoMock.mockReturnValue({
      repo: {
        transcribeAudio: transcribeAudioRepoMock,
        supportsPromptHints: () => true,
      },
      apiKeyId: "prompt-capable-key",
      warnings: [],
    });

    const result = await transcribeAudio({
      samples: new Float32Array([0.1, -0.1, 0.2]),
      sampleRate: 16_000,
      dictationLanguage: "en",
      currentApp: { id: "notes", name: "Notes" },
      currentEditor: { id: "body", name: "Document Body" },
      selectedText:
        "This selected text should be bounded before it reaches the provider. ".repeat(
          4,
        ),
      screenContext:
        "This screen context should also be bounded before it reaches the provider prompt. ".repeat(
          5,
        ),
    });

    expect(transcribeAudioRepoMock).toHaveBeenCalledTimes(1);
    expect(transcribeAudioRepoMock).toHaveBeenCalledWith(
      expect.objectContaining({
        prompt: expect.stringContaining("Context hints:"),
      }),
    );

    const repoInput = transcribeAudioRepoMock.mock.calls[0]?.[0] as {
      prompt: string;
    };
    expect(repoInput.prompt).toContain("Current app: Notes");
    expect(repoInput.prompt).toContain("Current editor: Document Body");
    expect(repoInput.prompt).toContain("Selected text:");
    expect(repoInput.prompt).toContain("Screen context:");
    expect(repoInput.prompt).toContain("…");
    expect(result.metadata.transcriptionPrompt).toBe(repoInput.prompt);
  });

  it("preserves the existing glossary prompt when the provider path does not support prompt hints", async () => {
    getTranscribeAudioRepoMock.mockReturnValue({
      repo: {
        transcribeAudio: transcribeAudioRepoMock,
        supportsPromptHints: () => false,
      },
      apiKeyId: "fallback-key",
      warnings: [],
    });

    await transcribeAudio({
      samples: new Float32Array([0.1, -0.1, 0.2]),
      sampleRate: 16_000,
      dictationLanguage: "en",
      currentApp: { id: "notes", name: "Notes" },
      currentEditor: { id: "body", name: "Document Body" },
      selectedText: "Existing draft section",
      screenContext: "Release dashboard",
    });

    const repoInput = transcribeAudioRepoMock.mock.calls[0]?.[0] as {
      prompt: string;
    };
    expect(repoInput.prompt).toContain("Glossary:");
    expect(repoInput.prompt).not.toContain("Context hints:");
    expect(repoInput.prompt).not.toContain("Current editor:");
    expect(repoInput.prompt).not.toContain("Screen context:");
  });
});

describe("storeTranscription", () => {
  beforeEach(() => {
    invokeMock.mockReset();
    createTranscriptionMock.mockReset();
    purgeStaleAudioMock.mockReset();
    addWordsToCurrentUserMock.mockReset();
    storeState.appState = structuredClone(INITIAL_APP_STATE);
    invokeMock.mockResolvedValue({
      filePath: "/audio/transcription.wav",
      durationMs: 250,
    });
    createTranscriptionMock.mockImplementation(async (transcription) => transcription);
    purgeStaleAudioMock.mockResolvedValue([]);
    addWordsToCurrentUserMock.mockResolvedValue(undefined);
  });

  it("stores the shared authoritative transcript contract fields", async () => {
    const result = await storeTranscription({
      audio: {
        samples: [0.1, -0.1, 0.2],
        sampleRate: 16_000,
      },
      rawTranscript: "raw hello world",
      sanitizedTranscript: "raw hello world",
      transcript: "Hello world",
      transcriptionMetadata: {},
      postProcessMetadata: {},
      warnings: [],
    });

    expect(createTranscriptionMock).toHaveBeenCalledWith(
      expect.objectContaining({
        authoritativeTranscript: "raw hello world",
        isAuthoritative: true,
        isFinalized: true,
        dictationIntent: {
          kind: "dictation",
          format: "clean",
        },
      }),
    );
    expect(result.transcription).toMatchObject({
      authoritativeTranscript: "raw hello world",
      isAuthoritative: true,
      isFinalized: true,
      dictationIntent: {
        kind: "dictation",
        format: "clean",
      },
    });
  });
});
