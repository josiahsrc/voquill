import { AppTarget } from "@repo/types";
import { getRec } from "@repo/utilities";
import { invoke } from "@tauri-apps/api/core";
import { isEqual } from "lodash-es";
import { useCallback, useRef } from "react";
import { loadApiKeys } from "../../actions/api-key.actions";
import {
  loadAppTargets,
  tryRegisterCurrentAppTarget,
} from "../../actions/app-target.actions";
import { showErrorSnackbar } from "../../actions/app.actions";
import { loadDictionary } from "../../actions/dictionary.actions";
import { loadHotkeys } from "../../actions/hotkey.actions";
import { handleGoogleAuthPayload } from "../../actions/login.actions";
import { syncAutoLaunchSetting } from "../../actions/settings.actions";
import { loadTones } from "../../actions/tone.actions";
import { postProcessTranscript } from "../../actions/transcribe.actions";
import { storeTranscription } from "../../actions/transcription-storage.actions";
import { checkForAppUpdates } from "../../actions/updater.actions";
import { useAsyncEffect } from "../../hooks/async.hooks";
import { useIntervalAsync } from "../../hooks/helper.hooks";
import { useHotkeyHold } from "../../hooks/hotkey.hooks";
import { useTauriListen } from "../../hooks/tauri.hooks";
import { createTranscriptionSession } from "../../sessions";
import { getAppState, produceAppState, useAppStore } from "../../store";
import { REGISTER_CURRENT_APP_EVENT } from "../../types/app-target.types";
import type { GoogleAuthPayload } from "../../types/google-auth.types";
import { GOOGLE_AUTH_EVENT } from "../../types/google-auth.types";
import { OverlayPhase } from "../../types/overlay.types";
import {
  StopRecordingResponse,
  TranscriptionSession,
} from "../../types/transcription-session.types";
import { DICTATE_HOTKEY } from "../../utils/keyboard.utils";
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

type RecordingResult = {
  transcript: string | null;
  currentApp: AppTarget | null;
};

export const RootSideEffects = () => {
  const startPendingRef = useRef<Promise<void> | null>(null);
  const stopPendingRef = useRef<Promise<StopRecordingResponse | null> | null>(
    null,
  );
  const isRecordingRef = useRef(false);
  const suppressUntilRef = useRef(0);
  const overlayLoadingTokenRef = useRef<symbol | null>(null);
  const sessionRef = useRef<TranscriptionSession | null>(null);
  const userId = useAppStore((state) => state.auth?.uid);
  const keyPermAuthorized = useAppStore((state) =>
    isPermissionAuthorized(getRec(state.permissions, "accessibility")?.state),
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

    isRecordingRef.current = true;
    if (startPendingRef.current) {
      await startPendingRef.current;
      return;
    }

    const user = getMyUser(state);
    const preferredMicrophone = user?.preferredMicrophone ?? null;
    const playInteractionChime = user?.playInteractionChime ?? true;

    const promise = (async () => {
      try {
        overlayLoadingTokenRef.current = null;

        const prefs = getTranscriptionPrefs(getAppState());
        // Don't fetch current app info here - it's slow (icon capture + encoding).
        // We'll get the toneId when recording stops via tryRegisterCurrentAppTarget().
        sessionRef.current = createTranscriptionSession(prefs);

        const playAudioPromise = playInteractionChime
          ? invoke<void>("play_audio", { clip: "start_recording_clip" })
          : Promise.resolve();

        const [, startRecordingResult] = await Promise.all([
          invoke<void>("set_phase", { phase: "recording" }),
          invoke<StartRecordingResponse>("start_recording", {
            args: { preferredMicrophone },
          }),
          playAudioPromise,
        ]);

        const sampleRate =
          typeof startRecordingResult?.sampleRate === "number" &&
          startRecordingResult.sampleRate > 0
            ? startRecordingResult.sampleRate
            : 16000;

        await sessionRef.current.onRecordingStart(sampleRate);
      } catch (error) {
        console.error("Failed to start recording via hotkey", error);
        await invoke<void>("set_phase", { phase: "idle" });
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
  }, []);

  const stopRecording = useCallback(async () => {
    if (!isRecordingRef.current) {
      return;
    }

    if (stopPendingRef.current) {
      await stopPendingRef.current;
      return;
    }

    let loadingToken: symbol | null = null;

    const promise = (async (): Promise<StopRecordingResponse | null> => {
      if (startPendingRef.current) {
        try {
          await startPendingRef.current;
        } catch (error) {
          console.warn("Start recording rejected while stopping", error);
        }
      }

      const playInteractionChime =
        getMyUser(getAppState())?.playInteractionChime ?? true;

      let audio: StopRecordingResponse | null = null;
      try {
        loadingToken = Symbol("overlay-loading");
        overlayLoadingTokenRef.current = loadingToken;
        const [, outAudio] = await Promise.all([
          invoke<void>("set_phase", { phase: "loading" }),
          invoke<StopRecordingResponse>("stop_recording"),
          playInteractionChime
            ? invoke<void>("play_audio", { clip: "stop_recording_clip" })
            : Promise.resolve(),
        ]);

        audio = outAudio;
      } catch (error) {
        console.error("Failed to stop recording via hotkey", error);
        showErrorSnackbar("Unable to stop recording. Please try again.");
        suppressUntilRef.current = Date.now() + 700;
      } finally {
        stopPendingRef.current = null;
      }

      return audio;
    })();

    stopPendingRef.current = promise;
    const audio = await promise;

    isRecordingRef.current = false;

    const session = sessionRef.current;
    sessionRef.current = null;

    let recordingResult: RecordingResult = {
      transcript: null,
      currentApp: null,
    };

    try {
      if (session && audio) {
        const [currentApp, transcribeResult] = await Promise.all([
          tryRegisterCurrentAppTarget(),
          session.finalize(audio),
        ]);
        const toneId = currentApp?.toneId ?? null;
        const rawTranscript = transcribeResult.rawTranscript;

        let transcript = rawTranscript;
        let postProcessMetadata = {};
        const allWarnings = [...transcribeResult.warnings];

        if (rawTranscript) {
          const ppResult = await postProcessTranscript({
            rawTranscript,
            toneId,
          });
          transcript = ppResult.transcript;
          postProcessMetadata = ppResult.metadata;
          allWarnings.push(...ppResult.warnings);
        }

        // don't await so we don't block pasting
        storeTranscription({
          audio,
          rawTranscript,
          transcript,
          transcriptionMetadata: transcribeResult.metadata,
          postProcessMetadata,
          warnings: allWarnings,
        });

        recordingResult = {
          transcript,
          currentApp,
        };
      }
    } finally {
      session?.cleanup();

      if (loadingToken && overlayLoadingTokenRef.current === loadingToken) {
        overlayLoadingTokenRef.current = null;
        await invoke<void>("set_phase", { phase: "idle" });
      }

      const trimmedTranscript = recordingResult.transcript?.trim();
      if (trimmedTranscript) {
        await new Promise<void>((resolve) => {
          setTimeout(resolve, 20);
        });

        try {
          const keybind = recordingResult.currentApp?.pasteKeybind ?? null;
          await invoke<void>("paste", { text: trimmedTranscript, keybind });
        } catch (error) {
          console.error("Failed to paste transcription", error);
          showErrorSnackbar("Unable to paste transcription.");
        }
      }
    }
  }, []);

  useHotkeyHold({
    actionName: DICTATE_HOTKEY,
    onActivate: startRecording,
    onDeactivate: stopRecording,
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

  return null;
};
