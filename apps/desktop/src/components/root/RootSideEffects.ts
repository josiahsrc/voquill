import { getRec } from "@repo/utilities";
import { invoke } from "@tauri-apps/api/core";
import { isEqual } from "lodash-es";
import { useCallback, useMemo, useRef } from "react";
import type { RecordingMode } from "../../state/app.state";
import { AgentStrategy } from "../../strategies/agent.strategy";
import { BaseStrategy } from "../../strategies/base.strategy";
import { DictationStrategy } from "../../strategies/dictation.strategy";
import type { StrategyContext } from "../../types/strategy.types";
import { loadApiKeys } from "../../actions/api-key.actions";
import {
  loadAppTargets,
  tryRegisterCurrentAppTarget,
} from "../../actions/app-target.actions";
import { showErrorSnackbar } from "../../actions/app.actions";
import { loadDictionary } from "../../actions/dictionary.actions";
import { loadHotkeys } from "../../actions/hotkey.actions";
import { handleGoogleAuthPayload } from "../../actions/login.actions";
import { refreshMember } from "../../actions/member.actions";
import { openUpgradePlanDialog } from "../../actions/pricing.actions";
import { syncAutoLaunchSetting } from "../../actions/settings.actions";
import { showToast } from "../../actions/toast.actions";
import { loadTones } from "../../actions/tone.actions";
import { checkForAppUpdates } from "../../actions/updater.actions";
import { useAsyncEffect } from "../../hooks/async.hooks";
import { useIntervalAsync } from "../../hooks/helper.hooks";
import { useHotkeyHold } from "../../hooks/hotkey.hooks";
import { useTauriListen } from "../../hooks/tauri.hooks";
import { createTranscriptionSession } from "../../sessions";
import { getAppState, produceAppState, useAppStore } from "../../store";
import type { AccessibilityInfo } from "../../types/accessibility.types";
import { REGISTER_CURRENT_APP_EVENT } from "../../types/app-target.types";
import type { GoogleAuthPayload } from "../../types/google-auth.types";
import { GOOGLE_AUTH_EVENT } from "../../types/google-auth.types";
import { OverlayPhase } from "../../types/overlay.types";
import {
  StopRecordingResponse,
  TranscriptionSession,
} from "../../types/transcription-session.types";
import { playAlertSound, tryPlayAudioChime } from "../../utils/audio.utils";
import {
  AGENT_DICTATE_HOTKEY,
  DICTATE_HOTKEY,
} from "../../utils/keyboard.utils";
import { getMemberExceedsWordLimitByState } from "../../utils/member.utils";
import { isPermissionAuthorized } from "../../utils/permission.utils";
import {
  getIsOnboarded,
  getMyUser,
  getTranscriptionPrefs,
} from "../../utils/user.utils";
import {
  consumeSurfaceWindowFlag,
  surfaceMainWindow,
} from "../../utils/window.utils";

type StartRecordingResponse = {
  sampleRate: number;
};

type KeysHeldPayload = {
  keys: string[];
};

type OverlayPhasePayload = {
  phase: OverlayPhase;
};

type RecordingLevelPayload = {
  levels?: number[];
};

type StopRecordingResult = [
  StopRecordingResponse | null,
  AccessibilityInfo | null,
];

export const RootSideEffects = () => {
  const startPendingRef = useRef<Promise<void> | null>(null);
  const stopPendingRef = useRef<Promise<StopRecordingResult> | null>(null);
  const isRecordingRef = useRef(false);
  const suppressUntilRef = useRef(0);
  const overlayLoadingTokenRef = useRef<symbol | null>(null);
  const sessionRef = useRef<TranscriptionSession | null>(null);
  const strategyRef = useRef<BaseStrategy | null>(null);
  const userId = useAppStore((state) => state.auth?.uid);
  const keyPermAuthorized = useAppStore((state) =>
    isPermissionAuthorized(getRec(state.permissions, "accessibility")?.state),
  );

  const strategyContext: StrategyContext = useMemo(
    () => ({
      overlayLoadingTokenRef,
    }),
    [],
  );

  useAsyncEffect(async () => {
    if (keyPermAuthorized) {
      await invoke("start_key_listener");
    } else {
      await invoke("stop_key_listener");
    }
  }, [keyPermAuthorized]);

  useAsyncEffect(async () => {
    const loaders: Promise<unknown>[] = [
      loadHotkeys(),
      loadApiKeys(),
      loadDictionary(),
      loadTones(),
      loadAppTargets(),
      refreshMember(),
    ];
    await Promise.allSettled(loaders);
  }, [userId]);

  useAsyncEffect(async () => {
    await syncAutoLaunchSetting();
  }, []);

  useAsyncEffect(async () => {
    if (consumeSurfaceWindowFlag()) {
      await surfaceMainWindow();
    }
  }, []);

  useIntervalAsync(
    60 * 1000,
    async () => {
      await checkForAppUpdates();
    },
    [],
  );

  const startRecording = useCallback(async () => {
    const state = getAppState();
    if (state.isRecordingHotkey) {
      return;
    }

    if (isRecordingRef.current) {
      return;
    }

    if (!getIsOnboarded(state)) {
      return;
    }

    if (getMemberExceedsWordLimitByState(state)) {
      playAlertSound();
      showToast({
        title: "Word limit reached",
        message: "You've used all your free words for today.",
        toastType: "error",
        action: "upgrade",
        duration: 8_000,
      });
      return;
    }

    isRecordingRef.current = true;
    if (startPendingRef.current) {
      await startPendingRef.current;
      return;
    }

    const user = getMyUser(state);
    const preferredMicrophone = user?.preferredMicrophone ?? null;
    const currentMode = getAppState().activeRecordingMode;

    // Create or reuse strategy based on mode
    let strategy = strategyRef.current;
    if (!strategy) {
      const mode: RecordingMode = currentMode ?? "dictate";
      strategy =
        mode === "agent"
          ? new AgentStrategy(strategyContext)
          : new DictationStrategy(strategyContext);
      strategyRef.current = strategy;
    }

    const promise = (async () => {
      try {
        overlayLoadingTokenRef.current = null;

        const prefs = getTranscriptionPrefs(getAppState());
        // Don't fetch current app info here - it's slow (icon capture + encoding).
        // We'll get the toneId when recording stops via tryRegisterCurrentAppTarget().
        sessionRef.current = createTranscriptionSession(prefs);

        // Fire chime immediately (fire-and-forget) for instant feedback
        tryPlayAudioChime("start_recording_clip");

        await strategy.onBeforeStart();

        const [, startRecordingResult] = await Promise.all([
          strategy.setPhase("recording"),
          invoke<StartRecordingResponse>("start_recording", {
            args: { preferredMicrophone },
          }),
        ]);

        const sampleRate =
          typeof startRecordingResult?.sampleRate === "number" &&
          startRecordingResult.sampleRate > 0
            ? startRecordingResult.sampleRate
            : 16000;

        await sessionRef.current.onRecordingStart(sampleRate);
      } catch (error) {
        console.error("Failed to start recording via hotkey", error);
        await strategy.setPhase("idle");
        showErrorSnackbar("Unable to start recording. Please try again.");
        suppressUntilRef.current = Date.now() + 1_000;
        sessionRef.current?.cleanup();
        sessionRef.current = null;
      } finally {
        startPendingRef.current = null;
      }
    })();

    startPendingRef.current = promise;
    await promise;
  }, [strategyContext]);

  const stopRecording = useCallback(async () => {
    if (!isRecordingRef.current) {
      return;
    }

    if (stopPendingRef.current) {
      await stopPendingRef.current;
      return;
    }

    const strategy = strategyRef.current;
    if (!strategy) {
      console.error("No recording strategy found");
      return;
    }

    let loadingToken: symbol | null = null;

    const promise = (async (): Promise<StopRecordingResult> => {
      if (startPendingRef.current) {
        try {
          await startPendingRef.current;
        } catch (error) {
          console.warn("Start recording rejected while stopping", error);
        }
      }

      let audio: StopRecordingResponse | null = null;
      let a11yInfo: AccessibilityInfo | null = null;
      try {
        loadingToken = Symbol("overlay-loading");
        overlayLoadingTokenRef.current = loadingToken;

        // Fire chime immediately (fire-and-forget) for instant feedback
        tryPlayAudioChime("stop_recording_clip");

        const [, outAudio, outA11yInfo] = await Promise.all([
          strategy.setPhase("loading"),
          invoke<StopRecordingResponse>("stop_recording"),
          invoke<AccessibilityInfo>("get_accessibility_info").catch((error) => {
            console.warn("[a11y] Failed to get accessibility info:", error);
            return null;
          }),
        ]);

        audio = outAudio;
        a11yInfo = outA11yInfo;
      } catch (error) {
        console.error("Failed to stop recording via hotkey", error);
        showErrorSnackbar("Unable to stop recording. Please try again.");
        suppressUntilRef.current = Date.now() + 700;
      } finally {
        stopPendingRef.current = null;
      }

      return [audio, a11yInfo];
    })();

    stopPendingRef.current = promise;
    const [audio, a11yInfo] = await promise;

    isRecordingRef.current = false;

    const session = sessionRef.current;
    sessionRef.current = null;

    try {
      if (session && audio) {
        const [currentApp, transcribeResult] = await Promise.all([
          tryRegisterCurrentAppTarget(),
          session.finalize(audio),
        ]);
        const toneId = currentApp?.toneId ?? null;
        const rawTranscript = transcribeResult.rawTranscript;

        if (rawTranscript) {
          const { shouldContinue } = await strategy.handleTranscript({
            rawTranscript,
            toneId,
            a11yInfo,
            currentApp,
            loadingToken,
            audio,
          });

          if (!shouldContinue) {
            // Exit: clean up strategy and reset mode
            await strategy.cleanup();
            strategyRef.current = null;
            produceAppState((draft) => {
              draft.activeRecordingMode = null;
            });
          }
          // If shouldContinue is true, keep strategy and mode for next turn
        }
      }
    } finally {
      session?.cleanup();
      refreshMember();
    }
  }, []);

  const startDictationRecording = useCallback(async () => {
    produceAppState((draft) => {
      draft.activeRecordingMode = "dictate";
    });
    await startRecording();
  }, [startRecording]);

  const stopDictationRecording = useCallback(async () => {
    await stopRecording();
  }, [stopRecording]);

  const startAgentRecording = useCallback(async () => {
    produceAppState((draft) => {
      draft.activeRecordingMode = "agent";
    });
    await startRecording();
  }, [startRecording]);

  const stopAgentRecording = useCallback(async () => {
    await stopRecording();
  }, [stopRecording]);

  useHotkeyHold({
    actionName: DICTATE_HOTKEY,
    onActivate: startDictationRecording,
    onDeactivate: stopDictationRecording,
  });

  useHotkeyHold({
    actionName: AGENT_DICTATE_HOTKEY,
    onActivate: startAgentRecording,
    onDeactivate: stopAgentRecording,
  });

  useTauriListen<void>(REGISTER_CURRENT_APP_EVENT, async () => {
    await tryRegisterCurrentAppTarget();
  });

  useTauriListen<KeysHeldPayload>("keys_held", (payload) => {
    const existing = getAppState().keysHeld;
    if (isEqual(existing, payload.keys)) {
      return;
    }

    produceAppState((draft) => {
      draft.keysHeld = payload.keys;
    });
  });

  useTauriListen<OverlayPhasePayload>("overlay_phase", (payload) => {
    produceAppState((draft) => {
      draft.overlayPhase = payload.phase;
      if (payload.phase !== "recording") {
        draft.audioLevels = [];
      }
    });
  });

  useTauriListen<RecordingLevelPayload>("recording_level", (payload) => {
    const raw = Array.isArray(payload.levels) ? payload.levels : [];
    const sanitized = raw.map((value) =>
      typeof value === "number" && Number.isFinite(value) ? value : 0,
    );

    produceAppState((draft) => {
      draft.audioLevels = sanitized;
    });
  });

  useTauriListen<GoogleAuthPayload>(GOOGLE_AUTH_EVENT, (payload) =>
    handleGoogleAuthPayload(payload),
  );

  useTauriListen<{ action: string }>("toast-action", async (payload) => {
    if (payload.action === "upgrade") {
      surfaceMainWindow();
      openUpgradePlanDialog();
    }
  });

  useTauriListen<void>("agent-overlay-close", async () => {
    const strategy = strategyRef.current;
    if (strategy) {
      await strategy.cleanup();
      strategyRef.current = null;
      produceAppState((draft) => {
        draft.activeRecordingMode = null;
      });
    }
  });

  return null;
};
