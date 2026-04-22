import { INITIAL_APP_STATE } from "../../src/state/app.state";
import { afterEach, expect, test, vi } from "vitest";

const { routeTranscriptOutput } = vi.hoisted(() => ({
  routeTranscriptOutput: vi.fn().mockResolvedValue({
    delivered: false,
    remote: false,
  }),
}));

vi.mock("../../src/utils/output-routing.utils", () => ({
  routeTranscriptOutput,
}));

vi.mock("../../src/utils/log.utils", () => ({
  getLogger: () => ({
    verbose: vi.fn(),
    info: vi.fn(),
    warning: vi.fn(),
    error: vi.fn(),
  }),
}));

vi.mock("../../src/store", () => {
  let state: Record<string, unknown> = {};

  return {
    getAppState: () => state,
    setAppState: (nextState: Record<string, unknown>) => {
      state = nextState;
    },
  };
});

vi.mock("../../src/utils/tone.utils", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("../../src/utils/tone.utils")>();
  return {
    ...actual,
    getToneIdToUse: () => actual.VERBATIM_TONE_ID,
  };
});

const { setAppState } = await import("../../src/store");
const { DictationStrategy } =
  await import("../../src/strategies/dictation.strategy");

afterEach(() => {
  routeTranscriptOutput.mockClear();
  setAppState({ ...INITIAL_APP_STATE });
});

test("streamed dictation inserts live deltas and only appends the final tail", async () => {
  setAppState({
    ...INITIAL_APP_STATE,
    userPrefs: {
      realtimeOutputEnabled: true,
      remoteOutputEnabled: false,
      remoteTargetDeviceId: null,
    } as never,
  });

  const strategy = new DictationStrategy();

  strategy.handleInterimSegment("hello");
  await Promise.resolve();
  await Promise.resolve();

  expect(routeTranscriptOutput).toHaveBeenCalledTimes(1);
  expect(routeTranscriptOutput).toHaveBeenNthCalledWith(1, {
    text: "hello ",
    mode: "dictation",
    currentAppId: null,
  });

  const result = await strategy.handleTranscript({
    rawTranscript: "hello world",
    processedTranscript: null,
    toneId: null,
    a11yInfo: null,
    currentApp: null,
    loadingToken: null,
    audio: { samples: [], sampleRate: 16000 },
    transcriptionMetadata: {},
    transcriptionWarnings: [],
  });

  expect(routeTranscriptOutput).toHaveBeenCalledTimes(2);
  expect(routeTranscriptOutput).toHaveBeenNthCalledWith(2, {
    text: "world ",
    mode: "dictation",
    currentAppId: null,
  });
  expect(result.transcript).toBe("hello world");
  expect(result.sanitizedTranscript).toBe("hello world");
});
