import { invoke } from "@tauri-apps/api/core";
import { normalizeSamples } from "./audio.utils";
import { isLinux } from "./env.utils";

export const formatDuration = (durationMs?: number | null): string => {
  if (!durationMs || !Number.isFinite(durationMs)) {
    return "0:00";
  }

  const totalSeconds = Math.max(0, Math.round(durationMs / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
};

const createSeededRandom = (seed: number) => {
  let value = seed % 2147483647;
  if (value <= 0) {
    value += 2147483646;
  }

  return () => {
    value = (value * 16807) % 2147483647;
    return (value - 1) / 2147483646;
  };
};

export const DEFAULT_WAVEFORM_BAR_COUNT = 58;
export const MIN_WAVEFORM_BAR_VALUE = 0.05;
export const MIN_COMPUTED_BAR_COUNT = 24;
export const MAX_COMPUTED_BAR_COUNT = 120;
export const WAVEFORM_BAR_MIN_WIDTH = 2;
export const WAVEFORM_BAR_MAX_WIDTH = 4;
export const WAVEFORM_BAR_GAP = 2;

export type PlaybackStopReason = "ended" | "stopped" | "replaced";

export type PlaybackAudioData = {
  samples: number[];
  sampleRate: number;
};

export type ActiveManagedPlayback = {
  transcriptionId: string;
  mode: "native" | "web";
  rafId: number | null;
  startedAtMs: number;
  durationMs: number;
  context?: AudioContext;
  source?: AudioBufferSourceNode;
  onStop: (reason: PlaybackStopReason) => void;
};

export let activePlayback: ActiveManagedPlayback | null = null;

const stopNativePlayback = async (): Promise<void> => {
  await invoke<void>("stop_audio_playback");
};

const finishPlayback = async (
  playback: ActiveManagedPlayback,
  reason: PlaybackStopReason,
): Promise<void> => {
  if (activePlayback === playback) {
    activePlayback = null;
  }

  if (playback.rafId !== null) {
    window.cancelAnimationFrame(playback.rafId);
  }

  if (playback.mode === "web") {
    const source = playback.source;

    if (source) {
      try {
        source.onended = null;
      } catch {
        // no-op
      }

      try {
        source.stop();
      } catch {
        // no-op
      }
    }

    playback.context?.close().catch(() => undefined);
  } else if (reason !== "ended") {
    await stopNativePlayback().catch(() => undefined);
  }

  playback.onStop(reason);
};

export const stopActivePlayback = async (
  reason: PlaybackStopReason,
): Promise<void> => {
  const current = activePlayback;
  if (!current) {
    return;
  }

  await finishPlayback(current, reason);
};

const playNativeAudio = async (
  transcriptionId: string,
  data: PlaybackAudioData,
  onProgress: (progress: number) => void,
  onStop: (reason: PlaybackStopReason) => void,
): Promise<void> => {
  await stopActivePlayback("replaced");

  const samples = normalizeSamples(data.samples);
  if (
    !samples.length ||
    !Number.isFinite(data.sampleRate) ||
    data.sampleRate <= 0
  ) {
    throw new Error("Audio playback requires samples and a valid sample rate");
  }

  await invoke<void>("play_audio_samples", {
    args: {
      samples,
      sampleRate: data.sampleRate,
    },
  });

  const playback: ActiveManagedPlayback = {
    transcriptionId,
    mode: "native",
    rafId: null,
    startedAtMs: window.performance.now(),
    durationMs: (samples.length / data.sampleRate) * 1000,
    onStop,
  };
  activePlayback = playback;

  const tick = () => {
    if (activePlayback !== playback) {
      return;
    }

    const elapsedMs = Math.max(0, window.performance.now() - playback.startedAtMs);
    const ratio =
      playback.durationMs > 0
        ? Math.min(Math.max(elapsedMs / playback.durationMs, 0), 1)
        : 0;

    onProgress(ratio);

    if (ratio >= 1) {
      void finishPlayback(playback, "ended");
      return;
    }

    playback.rafId = window.requestAnimationFrame(tick);
  };

  onProgress(0);
  playback.rafId = window.requestAnimationFrame(tick);
};

const playWebAudio = async (
  transcriptionId: string,
  data: PlaybackAudioData,
  onProgress: (progress: number) => void,
  onStop: (reason: PlaybackStopReason) => void,
): Promise<void> => {
  await stopActivePlayback("replaced");

  const context = new AudioContext({ sampleRate: data.sampleRate });
  if (context.state === "suspended") {
    await context.resume();
  }

  const channelCount = 1;
  const floatSamples = Float32Array.from(data.samples ?? []);
  const buffer = context.createBuffer(
    channelCount,
    floatSamples.length,
    data.sampleRate,
  );
  buffer.getChannelData(0).set(floatSamples);

  const source = context.createBufferSource();
  source.buffer = buffer;
  source.connect(context.destination);

  const playback: ActiveManagedPlayback = {
    transcriptionId,
    mode: "web",
    rafId: null,
    startedAtMs: window.performance.now(),
    durationMs: buffer.duration * 1000,
    context,
    source,
    onStop,
  };
  activePlayback = playback;

  const tick = () => {
    if (activePlayback !== playback) {
      return;
    }

    const ratio =
      playback.durationMs > 0
        ? Math.min(
            Math.max(
              (window.performance.now() - playback.startedAtMs) /
                playback.durationMs,
              0,
            ),
            1,
          )
        : 0;
    onProgress(ratio);

    if (ratio >= 1) {
      return;
    }

    playback.rafId = window.requestAnimationFrame(tick);
  };

  source.onended = () => {
    void finishPlayback(playback, "ended");
  };

  onProgress(0);
  source.start();
  playback.rafId = window.requestAnimationFrame(tick);
};

export const playManagedAudio = async (
  transcriptionId: string,
  data: PlaybackAudioData,
  onProgress: (progress: number) => void,
  onStop: (reason: PlaybackStopReason) => void,
): Promise<void> => {
  if (isLinux()) {
    return playNativeAudio(transcriptionId, data, onProgress, onStop);
  }

  return playWebAudio(transcriptionId, data, onProgress, onStop);
};

export const buildWaveformOutline = (
  seedKey: string,
  durationMs?: number | null,
  points = 28,
): number[] => {
  if (points <= 0) {
    return [];
  }

  const durationSeed = Math.round((durationMs ?? 0) / 37);
  const stringSeed = seedKey
    .split("")
    .reduce(
      (accumulator, character) => accumulator + character.charCodeAt(0),
      0,
    );
  const combinedSeed = stringSeed * 31 + durationSeed * 17 || 1;
  const random = createSeededRandom(combinedSeed);

  return Array.from({ length: points }, (_, index) => {
    const t = points <= 1 ? 0 : index / (points - 1);
    const eased = Math.pow(t, 0.85);
    const envelope = Math.sin(Math.PI * eased);
    const modulation = 0.45 + random() * 0.55;
    const baseline = 0.12 + random() * 0.2;
    return Math.max(0.12, Math.min(1, envelope * modulation + baseline));
  });
};
