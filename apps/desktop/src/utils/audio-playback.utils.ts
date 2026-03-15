import { invoke } from "@tauri-apps/api/core";
import { normalizeSamples } from "./audio.utils";

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

export type ActiveAudioPlayback = {
  id: string;
  rafId: number | null;
  startedAtMs: number;
  pausedAtMs: number | null;
  pausedDurationMs: number;
  durationMs: number;
  onProgress: (progress: number) => void;
  onStop: (reason: PlaybackStopReason) => void;
};

export let activePlayback: ActiveAudioPlayback | null = null;

const clearPlaybackFrame = (playback: ActiveAudioPlayback) => {
  if (playback.rafId !== null) {
    window.cancelAnimationFrame(playback.rafId);
    playback.rafId = null;
  }
};

const getElapsedMs = (playback: ActiveAudioPlayback): number => {
  const now =
    playback.pausedAtMs === null
      ? window.performance.now()
      : playback.pausedAtMs;
  return Math.max(0, now - playback.startedAtMs - playback.pausedDurationMs);
};

const finishPlayback = async (
  playback: ActiveAudioPlayback,
  reason: PlaybackStopReason,
  stopNativePlayback: boolean,
) => {
  if (activePlayback === playback) {
    activePlayback = null;
  }

  clearPlaybackFrame(playback);

  if (stopNativePlayback) {
    await invoke<void>("stop_audio_playback").catch(console.error);
  }

  playback.onStop(reason);
};

const tickPlayback = (playback: ActiveAudioPlayback) => {
  if (activePlayback !== playback || playback.pausedAtMs !== null) {
    return;
  }

  const ratio =
    playback.durationMs > 0
      ? Math.min(Math.max(getElapsedMs(playback) / playback.durationMs, 0), 1)
      : 0;

  playback.onProgress(ratio);

  if (ratio >= 1) {
    void finishPlayback(playback, "ended", false);
    return;
  }

  playback.rafId = window.requestAnimationFrame(() => tickPlayback(playback));
};

export const stopActivePlayback = async (
  reason: PlaybackStopReason,
): Promise<void> => {
  const current = activePlayback;
  if (!current) {
    return;
  }

  await finishPlayback(current, reason, reason !== "ended");
};

export const pauseActivePlayback = async (id: string): Promise<boolean> => {
  const current = activePlayback;
  if (!current || current.id !== id || current.pausedAtMs !== null) {
    return false;
  }

  await invoke<void>("pause_audio_playback");
  current.pausedAtMs = window.performance.now();
  clearPlaybackFrame(current);
  return true;
};

export const resumeActivePlayback = async (id: string): Promise<boolean> => {
  const current = activePlayback;
  if (!current || current.id !== id || current.pausedAtMs === null) {
    return false;
  }

  await invoke<void>("resume_audio_playback");
  current.pausedDurationMs += window.performance.now() - current.pausedAtMs;
  current.pausedAtMs = null;
  tickPlayback(current);
  return true;
};

export const playManagedAudio = async (
  id: string,
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

  const playback: ActiveAudioPlayback = {
    id,
    rafId: null,
    startedAtMs: window.performance.now(),
    pausedAtMs: null,
    pausedDurationMs: 0,
    durationMs: (samples.length / data.sampleRate) * 1000,
    onProgress,
    onStop,
  };

  activePlayback = playback;
  playback.onProgress(0);
  tickPlayback(playback);
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
