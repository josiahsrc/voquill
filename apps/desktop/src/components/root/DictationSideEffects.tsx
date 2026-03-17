import { AppTarget } from "@repo/types";
import { invoke } from "@tauri-apps/api/core";
import { secondsToMilliseconds } from "framer-motion";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useIntl } from "react-intl";
import { tryRegisterCurrentAppTarget } from "../../actions/app-target.actions";
import { refreshMember } from "../../actions/member.actions";
import { dismissToast, showToast } from "../../actions/toast.actions";
import {
  switchWritingStyleBackward,
  switchWritingStyleForward,
} from "../../actions/tone.actions";
import {
  resolveToolPermission,
  setToolAlwaysAllow,
} from "../../actions/tool.actions";
import { storeTranscription } from "../../actions/transcribe.actions";
import { recordStreak } from "../../actions/user.actions";
import {
  useHotkeyFire,
  useHotkeyHold,
  useHotkeyHoldMany,
} from "../../hooks/hotkey.hooks";
import { useLocalStorage } from "../../hooks/local-storage.hooks";
import { useTauriListen } from "../../hooks/tauri.hooks";
import { useToastAction } from "../../hooks/toast.hooks";
import { createTranscriptionSession } from "../../sessions";
import { RecordingMode } from "../../state/app.state";
import { getAppState, produceAppState, useAppStore } from "../../store";
import { AgentStrategy } from "../../strategies/agent.strategy";
import { BaseStrategy } from "../../strategies/base.strategy";
import { DictationStrategy } from "../../strategies/dictation.strategy";
import { TextFieldInfo } from "../../types/accessibility.types";
import type { OverlayResolvePermissionPayload } from "../../types/overlay.types";
import {
  StopRecordingResponse,
  TranscriptionSession,
} from "../../types/transcription-session.types";
import {
  ActivationController,
  debouncedToggle,
} from "../../utils/activation.utils";
import {
  trackAgentStart,
  trackAppUsed,
  trackDictationStart,
} from "../../utils/analytics.utils";
import { ASSISTANT_MODE_ENABLED_KEY } from "../../utils/assistant-mode.utils";
import { playAlertSound, tryPlayAudioChime } from "../../utils/audio.utils";
import { getEffectiveStylingMode } from "../../utils/feature.utils";
import {
  AGENT_DICTATE_HOTKEY,
  CANCEL_TRANSCRIPTION_HOTKEY,
  DICTATE_HOTKEY,
  getAdditionalLanguageEntries,
  SWITCH_WRITING_STYLE_HOTKEY,
  syncHotkeyCombosToNative,
} from "../../utils/keyboard.utils";
import { getLogger } from "../../utils/log.utils";
import { flashPillTooltip } from "../../utils/overlay.utils";
import { minutesToMilliseconds } from "../../utils/time.utils";
import { getToneIdToUse } from "../../utils/tone.utils";
import {
  getEffectivePillVisibility,
  getIsDictationUnlocked,
  getMyPreferredMicrophone,
  getMyPrimaryDictationLanguage,
  getTranscriptionPrefs,
} from "../../utils/user.utils";

// These limits are here to help prevent people from accidentally leaving their mic on
const RECORDING_WARNING_DURATION_MS = minutesToMilliseconds(4);
const RECORDING_AUTO_STOP_DURATION_MS = minutesToMilliseconds(5);

type StartRecordingResponse = {
  sampleRate: number;
};

type AbortMessage = {
  title?: string;
  body: unknown;
};

type RawStopResp = {
  shouldContinue: boolean;
  abortMessage?: string;
};

export const DictationSideEffects = () => {
  const intl = useIntl();

  const strategyRef = useRef<BaseStrategy | null>(null);
  const sessionRef = useRef<TranscriptionSession | null>(null);
  const recordingWarningTimerRef = useRef<NodeJS.Timeout | null>(null);
  const recordingAutoStopTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastStyleSwitchRef = useRef(0);
  const cancelPromptTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isStoppingRef = useRef(false);
  const [isStopping, setIsStopping] = useState(false);
  const [assistantModeEnabled] = useLocalStorage<boolean>(
    ASSISTANT_MODE_ENABLED_KEY,
    false,
  );

  const isManualStyling = useAppStore(
    (state) => getEffectiveStylingMode(state) === "manual",
  );
  const isActiveSession = useAppStore(
    (state) => state.activeRecordingMode !== null,
  );
  const activeRecordingMode = useAppStore((state) => state.activeRecordingMode);
  const additionalLanguageEntries = useAppStore(getAdditionalLanguageEntries);
  const isDictationUnlocked = useAppStore(getIsDictationUnlocked);
  const isDictationInteractable = isDictationUnlocked && !isStopping;
  const pillHoverEnabled = useAppStore((state) => {
    if (!getIsDictationUnlocked(state)) {
      return false;
    }
    const visibility = getEffectivePillVisibility(
      state.userPrefs?.dictationPillVisibility,
    );
    return visibility === "persistent";
  });

  const dictationController = useMemo(
    () =>
      new ActivationController(
        () => startDictationRecording(),
        () => stopDictationRecording(),
      ),
    [],
  );

  const agentController = useMemo(
    () =>
      new ActivationController(
        () => startAgentRecording(),
        () => stopAgentRecording(),
      ),
    [],
  );

  const additionalLanguageControllers = useMemo(
    () =>
      additionalLanguageEntries.map((entry) => ({
        actionName: entry.actionName,
        controller: new ActivationController(
          () =>
            startRecording({
              mode: "dictate",
              language: entry.language,
            }),
          () => stopRecording(),
        ),
      })),
    [additionalLanguageEntries],
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

  const clearCancelPromptTimer = useCallback(() => {
    if (cancelPromptTimerRef.current) {
      clearTimeout(cancelPromptTimerRef.current);
      cancelPromptTimerRef.current = null;
    }
  }, []);

  const abortRecording = useCallback(async (message?: AbortMessage) => {
    getLogger().info(
      `Aborting recording (hasSession=${!!sessionRef.current}, hasStrategy=${!!strategyRef.current}${message ? `, reason=${String(message.body).slice(0, 120)}` : ""})`,
    );
    clearRecordingTimers();
    clearCancelPromptTimer();
    invoke<void>("set_phase", { phase: "idle" });
    invoke("stop_recording").catch((e) =>
      getLogger().verbose(`stop_recording failed during abort: ${e}`),
    );

    dictationController.reset();
    agentController.reset();
    for (const { controller } of additionalLanguageControllers) {
      controller.reset();
    }

    strategyRef.current?.cleanup();
    strategyRef.current = null;
    sessionRef.current = null;

    produceAppState((draft) => {
      draft.activeRecordingMode = null;
    });

    if (message) {
      playAlertSound();
      showToast({
        title:
          message.title ||
          intl.formatMessage({
            defaultMessage: "Recording stopped",
          }),
        message: String(message.body),
        toastType: "error",
        duration: 8_000,
      });
    }
  }, []);

  const stopRecordingRaw = useCallback(async (): Promise<RawStopResp> => {
    getLogger().info("Stopping recording");
    clearRecordingTimers();

    const [audio, a11yInfo, appTarget] = await getLogger().stopwatch(
      "stopRecording",
      async () => {
        let audio: StopRecordingResponse | null = null;
        let a11yInfo: TextFieldInfo | null = null;
        let appTarget: AppTarget | null = null;
        try {
          tryPlayAudioChime("stop_recording_clip");

          getLogger().verbose("Invoking stop_recording and fetching a11y info");
          const [, outAudio, outA11yInfo, outAppTarget] = await Promise.all([
            strategyRef.current?.setPhase("loading"),
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
          showToast({
            title: intl.formatMessage({
              defaultMessage: "Failed to stop recording",
            }),
            message: String(error),
            toastType: "error",
            duration: 8_000,
          });
        }

        return [audio, a11yInfo, appTarget];
      },
    );

    if (!audio) {
      getLogger().warning("stopRecordingRaw: no audio data received");
      return {
        shouldContinue: false,
        abortMessage: "No audio data received",
      };
    }

    getLogger().info("Finalizing transcription session");
    trackAppUsed(appTarget?.name ?? "Unknown");
    const toneId = getToneIdToUse(getAppState(), {
      currentAppToneId: appTarget?.toneId ?? null,
    });

    const transcribeResult = await sessionRef.current?.finalize(audio, {
      toneId,
      a11yInfo,
    });
    const rawTranscript = transcribeResult?.rawTranscript;
    getLogger().verbose(
      `Transcription result: rawTranscript=${rawTranscript ? `${rawTranscript.length} chars` : "empty"}, toneId=${toneId ?? "none"}, app=${appTarget?.name ?? "unknown"}`,
    );
    if (!rawTranscript) {
      getLogger().warning("stopRecordingRaw: no rawTranscript from finalize");
      return {
        shouldContinue: false,
      };
    }

    const session = sessionRef.current;
    const strategy = strategyRef.current;
    if (!session || !strategy) {
      getLogger().warning(
        `stopRecordingRaw: refs cleared (session=${!!session}, strategy=${!!strategy})`,
      );
      return {
        shouldContinue: false,
      };
    }

    if (getAppState().activeRecordingMode === "agent") {
      await strategy.setPhase("idle");
    }

    getLogger().info("Post-processing transcript");
    const result = await strategy.handleTranscript({
      rawTranscript,
      processedTranscript: transcribeResult.processedTranscript,
      serverPostProcessMetadata: transcribeResult.postProcessMetadata,
      toneId,
      a11yInfo,
      currentApp: appTarget,
      loadingToken: null,
      audio,
      transcriptionMetadata: transcribeResult.metadata,
      transcriptionWarnings: transcribeResult.warnings,
    });

    const transcript = result.transcript;
    const sanitizedTranscript = result.sanitizedTranscript;
    const postProcessMetadata = result.postProcessMetadata;
    const postProcessWarnings = result.postProcessWarnings;
    getLogger().verbose(
      `Post-processing complete: transcript=${transcript ? `${transcript.length} chars` : "empty"}, warnings=${postProcessWarnings.length}`,
    );

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

    refreshMember();
    return {
      shouldContinue: result.shouldContinue,
    };
  }, []);

  const stopRecording = useCallback(async () => {
    if (isStoppingRef.current) {
      getLogger().info("stopRecording skipped (already stopping)");
      return;
    }

    getLogger().info("stopRecording entered");
    isStoppingRef.current = true;
    setIsStopping(true);
    try {
      const res = await stopRecordingRaw().catch((error) => {
        getLogger().error(
          `Error during stopRecording: ${error}${error instanceof Error ? ` [name=${error.name}, stack=${error.stack}]` : ""}`,
        );
        return {
          shouldContinue: false,
          abortMessage: String(error),
        };
      });

      getLogger().info(
        `stopRecording result: shouldContinue=${res.shouldContinue}, abortMessage=${res.abortMessage ?? "none"}`,
      );
      if (!res.shouldContinue) {
        await abortRecording(
          res.abortMessage ? { body: res.abortMessage } : undefined,
        );
      }
    } finally {
      isStoppingRef.current = false;
      setIsStopping(false);
    }
  }, [stopRecordingRaw, setIsStopping]);

  const startRecordingTimers = useCallback(() => {
    clearRecordingTimers();

    recordingWarningTimerRef.current = setTimeout(() => {
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

      stopRecording();
    }, RECORDING_AUTO_STOP_DURATION_MS);
  }, [stopRecording, intl, clearRecordingTimers]);

  const startRecording = useCallback(
    async (args: { mode: RecordingMode; language?: string | null }) => {
      const state = getAppState();
      const mode = args.mode;
      const language = args.language || getMyPrimaryDictationLanguage(state);
      produceAppState((draft) => {
        draft.activeRecordingMode = mode;
        draft.dictationLanguageOverride = language;
      });

      let strategy: BaseStrategy | null = strategyRef.current ?? null;
      if (!strategy) {
        if (mode === "agent") {
          strategy = new AgentStrategy();
        } else {
          strategy = new DictationStrategy();
        }
      }

      const validationError = strategy.validateAvailability();
      if (validationError) {
        abortRecording({
          title: validationError.title,
          body: validationError.body,
        });
        return;
      }

      const preferredMicrophone = getMyPreferredMicrophone(state);
      const transcriptPrefs = getTranscriptionPrefs(state);
      try {
        getLogger().info(`Transcription prefs: mode=${transcriptPrefs.mode}`);
        const session = createTranscriptionSession(transcriptPrefs);
        getLogger().info(
          `Created transcription session: ${session.constructor.name}`,
        );

        tryPlayAudioChime("start_recording_clip");
        if (session.supportsStreaming()) {
          session.setInterimResultCallback((segment) => {
            strategy.handleInterimSegment(segment);
          });
        }

        sessionRef.current = session;
        strategyRef.current = strategy;
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

        const sampleRate = startRecordingResult.sampleRate;
        getLogger().verbose(`Recording started (sampleRate=${sampleRate})`);
        await sessionRef.current.onRecordingStart(sampleRate);
        if (!sessionRef.current || !strategyRef.current) {
          abortRecording();
          return;
        }

        startRecordingTimers();
      } catch (error) {
        getLogger().error(`Failed to start recording: ${error}`);

        sessionRef.current?.cleanup();
        sessionRef.current = null;
        strategyRef.current = null;

        dictationController.reset();
        agentController.reset();

        clearRecordingTimers();
        invoke("stop_recording").catch((e) =>
          getLogger().verbose(
            `stop_recording failed during error handling: ${e}`,
          ),
        );

        showToast({
          title: intl.formatMessage({
            defaultMessage: "Recording failed",
          }),
          message: String(error),
          toastType: "error",
          duration: 8_000,
        });
      }
    },
    [],
  );

  const startDictationRecording = useCallback(async () => {
    const state = getAppState();
    if (!getIsDictationUnlocked(state)) {
      getLogger().verbose("Dictation not unlocked, ignoring start");
      return;
    }

    recordStreak();
    getLogger().info("Starting dictation recording");
    trackDictationStart();
    await startRecording({ mode: "dictate" });
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
    await startRecording({ mode: "agent" });
  }, [startRecording]);

  const stopAgentRecording = useCallback(async () => {
    getLogger().info("Stopping agent recording");
    await stopRecording();
  }, [stopRecording]);

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

  const promptCancelTranscription = useCallback(() => {
    if (cancelPromptTimerRef.current) {
      clearCancelPromptTimer();
      dismissToast();
      abortRecording();
      return;
    }

    const CANCEL_PROMPT_DURATION = 5_000;
    cancelPromptTimerRef.current = setTimeout(() => {
      cancelPromptTimerRef.current = null;
    }, CANCEL_PROMPT_DURATION);

    void showToast({
      title: intl.formatMessage({
        defaultMessage: "Cancel transcription?",
      }),
      message: intl.formatMessage({
        defaultMessage:
          "Press the 'cancel' hotkey again to discard the transcript.",
      }),
      toastType: "info",
      action: "confirm_cancel_transcription",
      duration: CANCEL_PROMPT_DURATION,
    }).catch((error) => {
      getLogger().error(`Failed to show cancel transcription toast: ${error}`);
    });
  }, [intl]);

  useHotkeyFire({
    actionName: SWITCH_WRITING_STYLE_HOTKEY,
    isDisabled: !isManualStyling,
    onFire: handleSwitchWritingStyle,
  });

  useHotkeyHold({
    actionName: DICTATE_HOTKEY,
    isDisabled: !isDictationInteractable || activeRecordingMode === "agent",
    controller: dictationController,
  });

  useHotkeyHold({
    actionName: AGENT_DICTATE_HOTKEY,
    isDisabled:
      !isDictationInteractable ||
      !assistantModeEnabled ||
      activeRecordingMode === "dictate",
    controller: agentController,
  });

  useHotkeyFire({
    actionName: CANCEL_TRANSCRIPTION_HOTKEY,
    isDisabled: !isActiveSession,
    onFire: promptCancelTranscription,
  });

  useHotkeyHoldMany({
    isDisabled: !isDictationInteractable || activeRecordingMode === "agent",
    actions: additionalLanguageControllers,
  });

  useEffect(() => {
    syncHotkeyCombosToNative();
  }, [isActiveSession, isManualStyling]);

  useTauriListen<void>("assistant-mode-close", async () => {
    const strategy = strategyRef.current;
    if (strategy) {
      await strategy.cleanup();
    }
    if (strategyRef.current) {
      await abortRecording();
    }
    produceAppState((draft) => {
      draft.activeRecordingMode = null;
    });
  });

  useTauriListen<void>("cancel-dictation", () => {
    abortRecording();
  });

  useToastAction(async (payload) => {
    if (payload.action === "confirm_cancel_transcription") {
      await abortRecording();
    }
  });

  useTauriListen<void>("on-click-dictate", () => {
    if (isDictationInteractable) {
      debouncedToggle("dictation", dictationController);
    }
  });

  useTauriListen<void>("on-click-agent-talk", () => {
    if (isDictationInteractable) {
      debouncedToggle("agent", agentController);
    }
  });

  useTauriListen<void>("tone-switch-forward", () => {
    switchWritingStyleForward();
  });

  useTauriListen<void>("tone-switch-backward", () => {
    switchWritingStyleBackward();
  });

  useTauriListen<OverlayResolvePermissionPayload>(
    "overlay-resolve-permission",
    (payload) => {
      if (payload.alwaysAllow) {
        const permission =
          getAppState().toolPermissionById[payload.permissionId];
        if (permission) {
          setToolAlwaysAllow({
            toolId: permission.toolId,
            params: permission.params,
            allowed: true,
          });
        }
      }
      resolveToolPermission(payload.permissionId, payload.status);
    },
  );

  useEffect(() => {
    invoke("set_pill_hover_enabled", { enabled: pillHoverEnabled }).catch(
      console.error,
    );
  }, [pillHoverEnabled]);

  useEffect(() => {
    invoke("set_pill_assistant_mode", {
      assistantMode: activeRecordingMode === "agent",
    }).catch(console.error);
  }, [activeRecordingMode]);

  return null;
};
