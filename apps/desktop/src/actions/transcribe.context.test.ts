import { beforeEach, describe, expect, it, vi } from "vitest";
import { AppState, INITIAL_APP_STATE } from "../state/app.state";
import * as transcribeActions from "./transcribe.actions";

const { storeState, generateTextMock } = vi.hoisted(() => ({
  storeState: {
    appState: undefined as AppState | undefined,
  },
  generateTextMock: vi.fn(),
}));

vi.mock("../repos", () => ({
  getGenerateTextRepo: () => ({
    repo: {
      generateText: generateTextMock,
    },
    apiKeyId: "post-process-key",
    warnings: [],
  }),
  getTranscribeAudioRepo: () => ({
    repo: {
      transcribeAudio: vi.fn(),
    },
    apiKeyId: "transcribe-key",
    warnings: [],
  }),
  getTranscriptionRepo: () => ({
    createTranscription: vi.fn(),
    purgeStaleAudio: vi.fn(),
  }),
}));

vi.mock("../store", () => ({
  getAppState: () => storeState.appState,
  produceAppState: vi.fn(),
}));

vi.mock("./app.actions", () => ({
  showErrorSnackbar: vi.fn(),
}));

vi.mock("./user.actions", () => ({
  addWordsToCurrentUser: vi.fn(),
}));

vi.mock("../utils/log.utils", () => ({
  getLogger: () => ({
    verbose: vi.fn(),
    info: vi.fn(),
    warning: vi.fn(),
    error: vi.fn(),
  }),
}));

describe("desktop dictation context", () => {
  beforeEach(() => {
    storeState.appState = structuredClone(INITIAL_APP_STATE);
    storeState.appState!.toneById = {
      default: {
        id: "default",
        name: "Default",
        promptTemplate: "Clean up the provided transcript",
        isSystem: true,
        createdAt: 0,
        sortOrder: 0,
      },
    };
    generateTextMock.mockReset();
    generateTextMock.mockResolvedValue({
      text: JSON.stringify({ result: "Clean transcript" }),
      metadata: {
        postProcessingMode: "cloud",
        inferenceDevice: "Cloud • Test",
      },
    });
  });

  it("derives current editor and selected text from finalize-time accessibility info", () => {
    expect("resolveDesktopDictationContext" in transcribeActions).toBe(true);

    const context = (transcribeActions as Record<string, any>)
      .resolveDesktopDictationContext({
        currentApp: {
          id: "notion",
          name: "Notion",
        },
        a11yInfo: {
          cursorPosition: 6,
          selectionLength: 6,
          textContent: "Draft launch plan",
        },
        screenContext: "Release checklist",
      });

    expect(context).toEqual({
      currentApp: {
        id: "notion",
        name: "Notion",
      },
      currentEditor: {
        id: "focused-text-field",
        name: "Focused text field",
      },
      selectedText: "launch",
      screenContext: "Release checklist",
    });
  });

  it("includes finalize-time app, editor, selection, and screen context in post-processing prompts", async () => {
    await transcribeActions.postProcessTranscript({
      rawTranscript: "update the summary",
      toneId: null,
      currentApp: {
        id: "notion",
        name: "Notion",
      },
      currentEditor: {
        id: "focused-text-field",
        name: "Focused text field",
      },
      selectedText: "launch",
      screenContext: "Release checklist",
    } as any);

    expect(generateTextMock).toHaveBeenCalledTimes(1);

    const [call] = generateTextMock.mock.calls;
    expect(call[0].system).toContain("Current app: Notion");
    expect(call[0].system).toContain("Current editor: Focused text field");
    expect(call[0].system).toContain("Selected text: launch");
    expect(call[0].system).toContain("Screen context: Release checklist");
  });
});
