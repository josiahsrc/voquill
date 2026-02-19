import { AppTarget } from "@repo/types";
import { getRec } from "@repo/utilities";
import { invoke } from "@tauri-apps/api/core";
import { secondsToMilliseconds } from "framer-motion";
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
import {
  handleEnterpriseOidcPayload,
  handleGoogleAuthPayload,
} from "../../actions/login.actions";
import { refreshMember } from "../../actions/member.actions";
import { openUpgradePlanDialog } from "../../actions/pricing.actions";
import { syncAutoLaunchSetting } from "../../actions/settings.actions";
import { showToast } from "../../actions/toast.actions";
import {
  loadTones,
  switchWritingStyleBackward,
  switchWritingStyleForward,
} from "../../actions/tone.actions";
import { storeTranscription } from "../../actions/transcribe.actions";
import {
  checkForAppUpdates,
  dismissUpdateDialog,
  installAvailableUpdate,
} from "../../actions/updater.actions";
import {
  migratePreferredMicrophoneToPreferences,
  recordStreak,
  refreshCurrentUser,
} from "../../actions/user.actions";
import { useAsyncEffect } from "../../hooks/async.hooks";
import { useIntervalAsync } from "../../hooks/helper.hooks";
import {
  useHotkeyFire,
  useHotkeyHold,
  useHotkeyHoldMany,
} from "../../hooks/hotkey.hooks";
import { useTauriListen } from "../../hooks/tauri.hooks";
import { createTranscriptionSession } from "../../sessions";
import type { RecordingMode } from "../../state/app.state";
import { getAppState, produceAppState, useAppStore } from "../../store";
import { AgentStrategy } from "../../strategies/agent.strategy";
import { BaseStrategy } from "../../strategies/base.strategy";
import { DictationStrategy } from "../../strategies/dictation.strategy";
import { OpenClawAgentStrategy } from "../../strategies/openclaw-agent.strategy";
import type { TextFieldInfo } from "../../types/accessibility.types";
import { REGISTER_CURRENT_APP_EVENT } from "../../types/app-target.types";
import type { EnterpriseOidcPayload } from "../../types/enterprise-oidc.types";
import { ENTERPRISE_OIDC_EVENT } from "../../types/enterprise-oidc.types";
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
import { getEffectiveStylingMode } from "../../utils/feature.utils";
import {
  AGENT_DICTATE_HOTKEY,
  CANCEL_TRANSCRIPTION_HOTKEY,
  DICTATE_HOTKEY,
  getAdditionalLanguageEntries,
  SWITCH_WRITING_STYLE_HOTKEY,
} from "../../utils/keyboard.utils";
import { getLogger } from "../../utils/log.utils";
import { flashPillTooltip } from "../../utils/overlay.utils";
import { isPermissionAuthorized } from "../../utils/permission.utils";
import { minutesToMilliseconds } from "../../utils/time.utils";
import { getToneIdToUse } from "../../utils/tone.utils";
import {
  getAgentModePrefs,
  getEffectivePillVisibility,
  getIsDictationUnlocked,
  getMyPreferredMicrophone,
  getMyPrimaryDictationLanguage,
  getTranscriptionPrefs,
} from "../../utils/user.utils";
import {
  consumeSurfaceWindowFlag,
  surfaceMainWindow,
} from "../../utils/window.utils";

// These limits are here to help prevent people from accidentally leaving their mic on
const RECORDING_WARNING_DURATION_MS = minutesToMilliseconds(4);
const RECORDING_AUTO_STOP_DURATION_MS = minutesToMilliseconds(5);

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
  TextFieldInfo | null,
  AppTarget | null,
];

export const RootSideEffects = () => {
  const startPendingRef = useRef<Promise<void> | null>(null);
  const stopPendingRef = useRef<Promise<StopRecordingResult> | null>(null);
  const updateInitializedRef = useRef(false);
  const isRecordingRef = useRef(false);
  const suppressUntilRef = useRef(0);
  const overlayLoadingTokenRef = useRef<symbol | null>(null);
  const sessionRef = useRef<TranscriptionSession | null>(null);
  const strategyRef = useRef<BaseStrategy | null>(null);
  const recordingWarningTimerRef = useRef<NodeJS.Timeout | null>(null);
  const recordingAutoStopTimerRef = useRef<NodeJS.Timeout | null>(null);
  const userId = useAppStore((state) => state.auth?.uid);
  const keyPermAuthorized = useAppStore((state) =>
    isPermissionAuthorized(getRec(state.permissions, "accessibility")?.state),
  );
  const intl = useIntl();

  const startDictationRef = useRef<(() => void) | null>(null);
  const stopDictationRef = useRef<(() => void) | null>(null);
  const startAgentRef = useRef<(() => void) | null>(null);
  const stopAgentRef = useRef<(() => void) | null>(null);
  const stopRecordingRef = useRef<(() => void) | null>(null);

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

  const clearRecordingTimers = useCallback(() => {
    if (recordingWarningTimerRef.current) {
      clearTimeout(recordingWarningTimerRef.current);
      recordingWarningTimerRef.current = null;
    }
    if (recordingAutoStopTimerRef.current) {
      clearTimeout(recordingAutoStopTimerRef.current);
      recordingAutoStopTimerRef.current = null;
    }
  }, []);

  const resetRecordingState = useCallback(async () => {
    getLogger().warning("Resetting recording state");
    isRecordingRef.current = false;
    strategyRef.current = null;
    clearRecordingTimers();
    try {
      await invoke("stop_recording");
    } catch (e) {
      getLogger().error(`Failed to stop recording during reset: ${e}`);
    }
    sessionRef.current?.cleanup();
    sessionRef.current = null;
    getLogger().info("Recording state reset complete");
  }, [clearRecordingTimers]);

  useAsyncEffect(async () => {
    if (keyPermAuthorized) {
      getLogger().info(
        "Accessibility permission authorized, starting key listener",
      );
      await invoke("start_key_listener");
    } else {
      getLogger().info(
        "Accessibility permission not authorized, stopping key listener",
      );
      await invoke("stop_key_listener");
    }
  }, [keyPermAuthorized]);

  useAsyncEffect(async () => {
    getLogger().info(`Loading user data (userId=${userId ?? "none"})`);
    await Promise.allSettled([refreshMember(), refreshCurrentUser()]);

    getLogger().verbose(
      "Loading hotkeys, API keys, dictionary, tones, app targets",
    );
    const loaders: Promise<unknown>[] = [
      loadHotkeys(),
      loadApiKeys(),
      loadDictionary(),
      loadTones(),
      loadAppTargets(),
      migratePreferredMicrophoneToPreferences(),
    ];
    await Promise.allSettled(loaders);
    getLogger().info("Initial data load complete");
  }, [userId]);

  useIntervalAsync(
    minutesToMilliseconds(15),
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
    minutesToMilliseconds(1),
    async () => {
      if (!updateInitializedRef.current) {
        dismissUpdateDialog();
        updateInitializedRef.current = true;
      }

      const available = await checkForAppUpdates();
      invoke("set_menu_icon", {
        variant: available ? "update" : "default",
      }).catch(console.error);
    },
    [],
  );

  const startRecording = useCallback(async () => {
    const state = getAppState();
    if (state.isRecordingHotkey) {
      getLogger().verbose("startRecording skipped: recording hotkey active");
      return;
    }

    if (isRecordingRef.current) {
      getLogger().verbose("startRecording skipped: already recording");
      return;
    }

    // Create or reuse strategy based on mode
    const currentMode = getAppState().activeRecordingMode;
    let strategy = strategyRef.current;
    if (!strategy) {
      const mode: RecordingMode = currentMode ?? "dictate";
      getLogger().info(`Creating ${mode} strategy`);
      if (mode === "agent") {
        const prefs = getAgentModePrefs(getAppState());
        getLogger().verbose(`Agent mode prefs: mode=${prefs.mode}`);
        if (prefs.mode === "openclaw") {
          strategy = new OpenClawAgentStrategy(
            strategyContext,
            prefs.gatewayUrl,
            prefs.token,
          );
        } else {
          strategy = new AgentStrategy(strategyContext);
        }
      } else {
        strategy = new DictationStrategy(strategyContext);
      }
      strategyRef.current = strategy;
    }

    const validationError = strategy.validateAvailability();
    if (validationError) {
      getLogger().warning(`Recording blocked: ${validationError.title}`);
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
      getLogger().verbose("startRecording waiting on pending start");
      await startPendingRef.current;
      return;
    }

    const preferredMicrophone = getMyPreferredMicrophone(state);
    const promise = (async () => {
      try {
        overlayLoadingTokenRef.current = null;

        const prefs = getTranscriptionPrefs(getAppState());
        getLogger().verbose(`Transcription prefs: mode=${prefs.mode}`);

        // Don't fetch current app info here - it's slow (icon capture + encoding).
        // We'll get the toneId when recording stops via tryRegisterCurrentAppTarget().
        sessionRef.current = createTranscriptionSession(prefs);

        // Fire chime immediately (fire-and-forget) for instant feedback
        tryPlayAudioChime("start_recording_clip");

        await strategy.onBeforeStart();

        getLogger().info(
          `Starting recording (mic=${preferredMicrophone ?? "default"})`,
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

        getLogger().verbose(`Recording started (sampleRate=${sampleRate})`);
        await sessionRef.current.onRecordingStart(sampleRate);

        clearRecordingTimers();
        const currentSession = sessionRef.current;
        recordingWarningTimerRef.current = setTimeout(() => {
          if (sessionRef.current !== currentSession) return;
          getLogger().warning("Recording duration warning (4 min)");
          showToast({
            title: intl.formatMessage({
              defaultMessage: "Recording ending soon",
            }),
            message: intl.formatMessage({
              defaultMessage:
                "Audio recording will automatically stop in 60 seconds.",
            }),
            toastType: "info",
            duration: 5_000,
          });
        }, RECORDING_WARNING_DURATION_MS);

        recordingAutoStopTimerRef.current = setTimeout(() => {
          if (sessionRef.current !== currentSession) return;
          getLogger().warning("Recording auto-stopped (5 min limit)");
          showToast({
            title: intl.formatMessage({
              defaultMessage: "Recording stopped",
            }),
            message: intl.formatMessage({
              defaultMessage:
                "Audio recording was automatically stopped due to duration limit.",
            }),
            toastType: "info",
            duration: 5_000,
          });

          dictationController.reset();
          agentController.reset();
          void stopRecordingRef.current?.();
        }, RECORDING_AUTO_STOP_DURATION_MS);
      } catch (error) {
        getLogger().error(`Failed to start recording: ${error}`);

        isRecordingRef.current = false;
        strategyRef.current = null;
        clearRecordingTimers();
        dictationController.reset();
        agentController.reset();

        try {
          await invoke("stop_recording");
        } catch {
          // Recording may not have started yet
        }

        await strategy.setPhase("idle");
        const errorMessage =
          error instanceof Error
            ? error.message
            : "Unable to start recording. Please try again.";
        showToast({
          title: intl.formatMessage({
            defaultMessage: "Recording failed",
          }),
          message: errorMessage,
          toastType: "error",
          duration: 8_000,
        });
        suppressUntilRef.current = Date.now() + 1_000;
        sessionRef.current?.cleanup();
        sessionRef.current = null;
        produceAppState((draft) => {
          draft.activeRecordingMode = null;
        });
      } finally {
        startPendingRef.current = null;
      }
    })();

    startPendingRef.current = promise;
    await promise;
  }, [clearRecordingTimers, intl, strategyContext]);

  const stopRecording = useCallback(async () => {
    if (!isRecordingRef.current) {
      getLogger().verbose("stopRecording skipped: not recording");
      return;
    }

    if (stopPendingRef.current) {
      getLogger().verbose("stopRecording waiting on pending stop");
      await stopPendingRef.current;
      return;
    }

    getLogger().info("Stopping recording");
    clearRecordingTimers();

    const strategy = strategyRef.current;
    if (!strategy) {
      getLogger().warning("No recording strategy found, attempting recovery");
      await resetRecordingState();
      return;
    }

    let loadingToken: symbol | null = null;

    const promise = (async (): Promise<StopRecordingResult> => {
      if (startPendingRef.current) {
        try {
          await startPendingRef.current;
        } catch (error) {
          getLogger().warning(
            `Start recording rejected while stopping: ${error}`,
          );
        }
      }

      let audio: StopRecordingResponse | null = null;
      let a11yInfo: TextFieldInfo | null = null;
      let appTarget: AppTarget | null = null;
      try {
        loadingToken = Symbol("overlay-loading");
        overlayLoadingTokenRef.current = loadingToken;

        tryPlayAudioChime("stop_recording_clip");

        getLogger().verbose("Invoking stop_recording and fetching a11y info");
        const [, outAudio, outA11yInfo, outAppTarget] = await Promise.all([
          strategy.setPhase("loading"),
          invoke<StopRecordingResponse>("stop_recording"),
          invoke<TextFieldInfo>("get_text_field_info").catch((error) => {
            getLogger().verbose(`Failed to get text field info: ${error}`);
            return null;
          }),
          tryRegisterCurrentAppTarget().catch((error) => {
            getLogger().verbose(`Failed to get current app target: ${error}`);
            return null;
          }),
        ]);

        audio = outAudio;
        a11yInfo = outA11yInfo;
        appTarget = outAppTarget;
        getLogger().verbose(
          `Recording stopped (hasSamples=${!!audio?.samples})`,
        );
      } catch (error) {
        getLogger().error(`Failed to stop recording: ${error}`);
        showErrorSnackbar("Unable to stop recording. Please try again.");
        suppressUntilRef.current = Date.now() + 700;
      } finally {
        stopPendingRef.current = null;
      }

      return [audio, a11yInfo, appTarget];
    })();

    stopPendingRef.current = promise;
    const [audio, a11yInfo, appTarget] = await getLogger().stopwatch(
      "stopRecording",
      async () => await promise,
    );

    isRecordingRef.current = false;

    const session = sessionRef.current;
    sessionRef.current = null;

    try {
      if (session && audio) {
        getLogger().info("Finalizing transcription session");
        trackAppUsed(appTarget?.name ?? "Unknown");
        const toneId = getToneIdToUse(getAppState(), {
          currentAppToneId: appTarget?.toneId ?? null,
        });

        const transcribeResult = await session.finalize(audio, {
          toneId,
          a11yInfo,
        });
        const rawTranscript = transcribeResult.rawTranscript;
        const processedTranscript = transcribeResult.processedTranscript;
        getLogger().verbose(
          `Transcription result: rawTranscript=${rawTranscript ? `${rawTranscript.length} chars` : "empty"}, toneId=${toneId ?? "none"}, app=${appTarget?.name ?? "unknown"}`,
        );

        let transcript: string | null = null;
        let sanitizedTranscript: string | null = null;
        let postProcessMetadata = {};
        let postProcessWarnings: string[] = [];

        if (rawTranscript) {
          getLogger().info("Post-processing transcript");
          const result = await strategy.handleTranscript({
            rawTranscript,
            processedTranscript,
            sessionPostProcessMetadata: transcribeResult.postProcessMetadata,
            toneId,
            a11yInfo,
            currentApp: appTarget,
            loadingToken,
            audio,
            transcriptionMetadata: transcribeResult.metadata,
            transcriptionWarnings: transcribeResult.warnings,
          });

          transcript = result.transcript;
          sanitizedTranscript = result.sanitizedTranscript;
          postProcessMetadata = result.postProcessMetadata;
          postProcessWarnings = result.postProcessWarnings;
          getLogger().verbose(
            `Post-processing complete: transcript=${transcript ? `${transcript.length} chars` : "empty"}, warnings=${postProcessWarnings.length}`,
          );

          if (!result.shouldContinue) {
            getLogger().verbose("Strategy complete, cleaning up");
            await strategy.cleanup();
            strategyRef.current = null;
            produceAppState((draft) => {
              draft.activeRecordingMode = null;
            });
          }
        } else {
          getLogger().warning("Empty transcript, resetting to idle");
          if (loadingToken && overlayLoadingTokenRef.current === loadingToken) {
            overlayLoadingTokenRef.current = null;
            await invoke<void>("set_phase", { phase: "idle" });
          }

          await strategy.cleanup();
          strategyRef.current = null;
          produceAppState((draft) => {
            draft.activeRecordingMode = null;
          });
        }

        if (strategy.shouldStoreTranscript()) {
          getLogger().verbose("Storing transcription");
          storeTranscription({
            audio,
            rawTranscript: rawTranscript ?? null,
            sanitizedTranscript,
            transcript,
            transcriptionMetadata: transcribeResult.metadata,
            postProcessMetadata,
            warnings: [...transcribeResult.warnings, ...postProcessWarnings],
          });
        }
      } else {
        getLogger().warning(
          `No session or audio to process (session=${!!session}, audio=${!!audio})`,
        );
      }
    } finally {
      session?.cleanup();
      produceAppState((draft) => {
        draft.dictationLanguageOverride = null;
      });
      refreshMember();
      getLogger().info("Dictation flow complete");
    }
  }, [clearRecordingTimers, resetRecordingState]);

  const startDictationRecording = useCallback(async () => {
    const state = getAppState();
    if (!getIsDictationUnlocked(state)) {
      getLogger().verbose("Dictation not unlocked, ignoring start");
      return;
    }

    recordStreak();
    getLogger().info("Starting dictation recording");
    trackDictationStart();
    produceAppState((draft) => {
      draft.activeRecordingMode = "dictate";
      draft.dictationLanguageOverride = getMyPrimaryDictationLanguage(state);
    });
    await startRecording();
  }, [startRecording]);

  const stopDictationRecording = useCallback(async () => {
    getLogger().info("Stopping dictation recording");
    await stopRecording();
  }, [stopRecording]);

  const startAgentRecording = useCallback(async () => {
    const state = getAppState();
    if (!getIsDictationUnlocked(state)) {
      getLogger().verbose("Dictation not unlocked, ignoring agent start");
      return;
    }

    recordStreak();
    getLogger().info("Starting agent recording");
    trackAgentStart();
    produceAppState((draft) => {
      draft.activeRecordingMode = "agent";
    });
    await startRecording();
  }, [intl, startRecording]);

  const stopAgentRecording = useCallback(async () => {
    getLogger().info("Stopping agent recording");
    await stopRecording();
  }, [stopRecording]);

  startDictationRef.current = startDictationRecording;
  stopDictationRef.current = stopDictationRecording;
  startAgentRef.current = startAgentRecording;
  stopAgentRef.current = stopAgentRecording;
  stopRecordingRef.current = stopRecording;

  const cancelDictation = useCallback(async () => {
    getLogger().info("Cancelling dictation");
    showToast({
      title: intl.formatMessage({
        defaultMessage: "Transcription cancelled",
      }),
      message: intl.formatMessage({
        defaultMessage:
          "The current transcription session has been cancelled. You can change the hotkey for this in settings.",
      }),
      toastType: "info",
      duration: 3_000,
    });

    dictationController.reset();
    agentController.reset();
    const strategy = strategyRef.current;
    if (strategy) {
      await strategy.cleanup();
    }
    if (isRecordingRef.current || strategyRef.current) {
      await resetRecordingState();
    }
    await invoke<void>("set_phase", { phase: "idle" });
    produceAppState((draft) => {
      draft.activeRecordingMode = null;
    });
  }, [dictationController, agentController, resetRecordingState]);

  useHotkeyHold({
    actionName: DICTATE_HOTKEY,
    controller: dictationController,
  });

  useHotkeyHold({
    actionName: AGENT_DICTATE_HOTKEY,
    controller: agentController,
  });

  const additionalLanguageEntries = useAppStore(getAdditionalLanguageEntries);
  const additionalLanguageControllers = useMemo(
    () =>
      additionalLanguageEntries.map((entry) => ({
        actionName: entry.actionName,
        controller: getOrCreateController(
          entry.actionName,
          () => {
            produceAppState((draft) => {
              draft.activeRecordingMode = "dictate";
              draft.dictationLanguageOverride = entry.language;
            });
            void startRecording();
          },
          () => {
            void stopRecording();
          },
        ),
      })),
    [additionalLanguageEntries, startRecording, stopRecording],
  );

  useHotkeyHoldMany({
    actions: additionalLanguageControllers,
  });

  const isManualStyling = useAppStore(
    (state) => getEffectiveStylingMode(state) === "manual",
  );
  const lastStyleSwitchRef = useRef(0);
  const handleSwitchWritingStyle = useCallback(() => {
    const now = Date.now();
    const elapsed = now - lastStyleSwitchRef.current;
    lastStyleSwitchRef.current = now;
    if (elapsed > secondsToMilliseconds(3)) {
      flashPillTooltip();
      return;
    }

    void switchWritingStyleForward();
  }, []);

  useHotkeyFire({
    actionName: SWITCH_WRITING_STYLE_HOTKEY,
    isDisabled: !isManualStyling,
    onFire: handleSwitchWritingStyle,
  });

  const isActiveSession = useAppStore(
    (state) => state.activeRecordingMode !== null,
  );
  useHotkeyFire({
    actionName: CANCEL_TRANSCRIPTION_HOTKEY,
    isDisabled: !isActiveSession,
    onFire: () => void cancelDictation(),
  });

  useTauriListen<void>(REGISTER_CURRENT_APP_EVENT, async () => {
    await tryRegisterCurrentAppTarget();
  });

  useTauriListen<void>("tray-install-update", () => {
    surfaceMainWindow();
    installAvailableUpdate();
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

  useTauriListen<EnterpriseOidcPayload>(ENTERPRISE_OIDC_EVENT, (payload) =>
    handleEnterpriseOidcPayload(payload),
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
    } else if (payload.action === "surface_window") {
      surfaceMainWindow();
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

  useTauriListen<void>("cancel-dictation", () => {
    void cancelDictation();
  });

  useTauriListen<void>("on-click-dictate", () => {
    debouncedToggle("dictation", dictationController);
  });

  useTauriListen<void>("tone-switch-forward", () => {
    void switchWritingStyleForward();
  });

  useTauriListen<void>("tone-switch-backward", () => {
    void switchWritingStyleBackward();
  });

  const pillHoverEnabled = useAppStore((state) => {
    if (!getIsDictationUnlocked(state)) {
      return false;
    }
    const visibility = getEffectivePillVisibility(
      state.userPrefs?.dictationPillVisibility,
    );
    return visibility === "persistent";
  });

  useEffect(() => {
    invoke("set_pill_hover_enabled", { enabled: pillHoverEnabled }).catch(
      console.error,
    );
  }, [pillHoverEnabled]);

  return null;
};
