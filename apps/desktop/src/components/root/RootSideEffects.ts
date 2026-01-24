import { getRec } from "@repo/utilities";
import { invoke } from "@tauri-apps/api/core";
import { isEqual } from "lodash-es";
import { useCallback, useEffect, useMemo, useRef } from "react";
import { useIntl } from "react-intl";
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
import {
  checkForAppUpdates,
  dismissUpdateDialog,
} from "../../actions/updater.actions";
import {
  migratePreferredMicrophoneToPreferences,
  refreshCurrentUser,
  toggleActiveDictationLanguage,
} from "../../actions/user.actions";
import { useAsyncEffect } from "../../hooks/async.hooks";
import { useIntervalAsync } from "../../hooks/helper.hooks";
import { useHotkeyFire, useHotkeyHold } from "../../hooks/hotkey.hooks";
import { useTauriListen } from "../../hooks/tauri.hooks";
import { createTranscriptionSession } from "../../sessions";
import type { RecordingMode } from "../../state/app.state";
import { getAppState, produceAppState, useAppStore } from "../../store";
import { AgentStrategy } from "../../strategies/agent.strategy";
import { BaseStrategy } from "../../strategies/base.strategy";
import { DictationStrategy } from "../../strategies/dictation.strategy";
import type { TextFieldInfo } from "../../types/accessibility.types";
import { REGISTER_CURRENT_APP_EVENT } from "../../types/app-target.types";
import type { GoogleAuthPayload } from "../../types/google-auth.types";
import { GOOGLE_AUTH_EVENT } from "../../types/google-auth.types";
import type { OverlayPhase } from "../../types/overlay.types";
import type { StrategyContext } from "../../types/strategy.types";
import {
  StopRecordingResponse,
  TranscriptionSession,
} from "../../types/transcription-session.types";
import {
  debouncedToggle,
  getOrCreateController,
} from "../../utils/activation.utils";
import {
  trackAgentStart,
  trackAppUsed,
  trackDictationStart,
} from "../../utils/analytics.utils";
import { playAlertSound, tryPlayAudioChime } from "../../utils/audio.utils";
import {
  AGENT_DICTATE_HOTKEY,
  DICTATE_HOTKEY,
  LANGUAGE_SWITCH_HOTKEY,
} from "../../utils/keyboard.utils";
import { isPermissionAuthorized } from "../../utils/permission.utils";
import {
  daysToMilliseconds,
  hoursToMilliseconds,
} from "../../utils/time.utils";
import {
  getEffectivePillVisibility,
  getIsDictationUnlocked,
  getMyDictationLanguageCode,
  getMyPreferredMicrophone,
  getTranscriptionPrefs,
} from "../../utils/user.utils";
import {
  consumeSurfaceWindowFlag,
  setTrayTitle,
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

type StopRecordingResult = [StopRecordingResponse | null, TextFieldInfo | null];

export const RootSideEffects = () => {
  const startPendingRef = useRef<Promise<void> | null>(null);
  const stopPendingRef = useRef<Promise<StopRecordingResult> | null>(null);
  const updateInitializedRef = useRef(false);
  const isRecordingRef = useRef(false);
  const suppressUntilRef = useRef(0);
  const overlayLoadingTokenRef = useRef<symbol | null>(null);
  const sessionRef = useRef<TranscriptionSession | null>(null);
  const strategyRef = useRef<BaseStrategy | null>(null);
  const userId = useAppStore((state) => state.auth?.uid);
  const keyPermAuthorized = useAppStore((state) =>
    isPermissionAuthorized(getRec(state.permissions, "accessibility")?.state),
  );
  const intl = useIntl();

  const startDictationRef = useRef<(() => void) | null>(null);
  const stopDictationRef = useRef<(() => void) | null>(null);
  const startAgentRef = useRef<(() => void) | null>(null);
  const stopAgentRef = useRef<(() => void) | null>(null);

  const dictationController = useMemo(
    () =>
      getOrCreateController(
        "dictation",
        () => startDictationRef.current?.(),
        () => stopDictationRef.current?.(),
      ),
    [],
  );

  const agentController = useMemo(
    () =>
      getOrCreateController(
        "agent",
        () => startAgentRef.current?.(),
        () => stopAgentRef.current?.(),
      ),
    [],
  );

  const strategyContext: StrategyContext = useMemo(
    () => ({
      overlayLoadingTokenRef,
    }),
    [],
  );

  const resetRecordingState = useCallback(async () => {
    isRecordingRef.current = false;
    strategyRef.current = null;
    try {
      await invoke("stop_recording");
    } catch (e) {
      console.warn("Failed to stop recording during reset", e);
    }
    sessionRef.current?.cleanup();
    sessionRef.current = null;
  }, []);

  useAsyncEffect(async () => {
    if (keyPermAuthorized) {
      await invoke("start_key_listener");
    } else {
      await invoke("stop_key_listener");
    }
  }, [keyPermAuthorized]);

  useAsyncEffect(async () => {
    await Promise.allSettled([refreshMember(), refreshCurrentUser()]);

    const loaders: Promise<unknown>[] = [
      loadHotkeys(),
      loadApiKeys(),
      loadDictionary(),
      loadTones(),
      loadAppTargets(),
      migratePreferredMicrophoneToPreferences(),
    ];
    await Promise.allSettled(loaders);
  }, [userId]);

  useIntervalAsync(
    hoursToMilliseconds(1),
    async () => {
      await Promise.allSettled([refreshMember(), refreshCurrentUser()]);
    },
    [],
  );

  useAsyncEffect(async () => {
    await syncAutoLaunchSetting();
  }, []);

  useAsyncEffect(async () => {
    if (consumeSurfaceWindowFlag()) {
      await surfaceMainWindow();
    }
  }, []);

  // check for app updates every minute
  useIntervalAsync(
    60 * 1000,
    async () => {
      // show update dialogs after one hour on first-boot
      if (!updateInitializedRef.current) {
        dismissUpdateDialog(daysToMilliseconds(1));
        updateInitializedRef.current = true;
      }

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

    // Create or reuse strategy based on mode
    const currentMode = getAppState().activeRecordingMode;
    let strategy = strategyRef.current;
    if (!strategy) {
      const mode: RecordingMode = currentMode ?? "dictate";
      strategy =
        mode === "agent"
          ? new AgentStrategy(strategyContext)
          : new DictationStrategy(strategyContext);
      strategyRef.current = strategy;
    }

    const validationError = strategy.validateAvailability();
    if (validationError) {
      playAlertSound();
      showToast({
        title: validationError.title,
        message: validationError.body,
        toastType: "error",
        action: validationError.action ?? undefined,
        duration: 8_000,
      });
      return;
    }

    isRecordingRef.current = true;
    if (startPendingRef.current) {
      await startPendingRef.current;
      return;
    }

    const preferredMicrophone = getMyPreferredMicrophone(state);
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

        console.log(
          "[startRecording] starting recording with mic:",
          preferredMicrophone,
        );
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
        isRecordingRef.current = false;
        strategyRef.current = null;
        sessionRef.current?.cleanup();
        sessionRef.current = null;
      } finally {
        startPendingRef.current = null;
      }
    })();

    startPendingRef.current = promise;
    await promise;
  }, [intl, strategyContext]);

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
      console.warn("No recording strategy found, attempting recovery");
      await resetRecordingState();
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
      let a11yInfo: TextFieldInfo | null = null;
      try {
        loadingToken = Symbol("overlay-loading");
        overlayLoadingTokenRef.current = loadingToken;

        // Fire chime immediately (fire-and-forget) for instant feedback
        tryPlayAudioChime("stop_recording_clip");

        const [, outAudio, outA11yInfo] = await Promise.all([
          strategy.setPhase("loading"),
          invoke<StopRecordingResponse>("stop_recording"),
          invoke<TextFieldInfo>("get_text_field_info").catch((error) => {
            console.warn("[a11y] Failed to get text field info:", error);
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
        trackAppUsed(currentApp?.name ?? "Unknown");

        if (rawTranscript) {
          const { shouldContinue } = await strategy.handleTranscript({
            rawTranscript,
            toneId,
            a11yInfo,
            currentApp,
            loadingToken,
            audio,
            transcriptionMetadata: transcribeResult.metadata,
            transcriptionWarnings: transcribeResult.warnings,
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
        } else {
          // No transcript: reset overlay to idle and clean up
          if (loadingToken && overlayLoadingTokenRef.current === loadingToken) {
            overlayLoadingTokenRef.current = null;
            await invoke<void>("set_phase", { phase: "idle" });
          }

          // Clean up strategy and reset mode
          await strategy.cleanup();
          strategyRef.current = null;
          produceAppState((draft) => {
            draft.activeRecordingMode = null;
          });
        }
      }
    } finally {
      session?.cleanup();
      refreshMember();
    }
  }, [resetRecordingState]);

  const startDictationRecording = useCallback(async () => {
    const state = getAppState();
    if (!getIsDictationUnlocked(state)) {
      return;
    }

    trackDictationStart();
    produceAppState((draft) => {
      draft.activeRecordingMode = "dictate";
    });
    await startRecording();
  }, [startRecording]);

  const stopDictationRecording = useCallback(async () => {
    await stopRecording();
  }, [stopRecording]);

  const startAgentRecording = useCallback(async () => {
    const state = getAppState();
    if (!getIsDictationUnlocked(state)) {
      return;
    }

    trackAgentStart();
    produceAppState((draft) => {
      draft.activeRecordingMode = "agent";
    });
    await startRecording();
  }, [intl, startRecording]);

  const stopAgentRecording = useCallback(async () => {
    await stopRecording();
  }, [stopRecording]);

  startDictationRef.current = startDictationRecording;
  stopDictationRef.current = stopDictationRecording;
  startAgentRef.current = startAgentRecording;
  stopAgentRef.current = stopAgentRecording;

  useHotkeyHold({
    actionName: DICTATE_HOTKEY,
    controller: dictationController,
  });

  useHotkeyHold({
    actionName: AGENT_DICTATE_HOTKEY,
    controller: agentController,
  });

  const languageSwitchEnabled = useAppStore(
    (state) => state.settings.languageSwitch.enabled,
  );
  const handleLanguageSwitch = useCallback(() => {
    void toggleActiveDictationLanguage();
  }, []);

  useHotkeyFire({
    actionName: LANGUAGE_SWITCH_HOTKEY,
    isDisabled: !languageSwitchEnabled,
    onFire: handleLanguageSwitch,
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
    } else if (payload.action === "open_agent_settings") {
      surfaceMainWindow();
      produceAppState((draft) => {
        draft.settings.agentModeDialogOpen = true;
      });
    }
  });

  useTauriListen<void>("agent-overlay-close", async () => {
    const strategy = strategyRef.current;
    if (strategy) {
      await strategy.cleanup();
    }
    if (isRecordingRef.current || strategyRef.current) {
      await resetRecordingState();
    }
    produceAppState((draft) => {
      draft.activeRecordingMode = null;
    });
  });

  useTauriListen<void>("on-click-dictate", () => {
    debouncedToggle("dictation", dictationController);
  });

  const trayLanguageCode = useAppStore((state) => {
    if (!state.settings.languageSwitch.enabled) {
      return null;
    }
    return getMyDictationLanguageCode(state);
  });

  useEffect(() => {
    void setTrayTitle(trayLanguageCode);
  }, [trayLanguageCode]);

  const pillHoverEnabled = useAppStore((state) => {
    if (!getIsDictationUnlocked(state)) {
      return false;
    }
    const visibility = getEffectivePillVisibility(
      state.userPrefs?.dictationPillVisibility,
    );
    // Enable hover detection whenever the pill can be visible
    // This allows clicking the pill to start dictation
    return visibility !== "hidden";
  });

  useEffect(() => {
    invoke("set_pill_hover_enabled", { enabled: pillHoverEnabled }).catch(
      console.error,
    );
  }, [pillHoverEnabled]);

  return null;
};
