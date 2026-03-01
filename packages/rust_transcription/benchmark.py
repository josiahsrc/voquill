#!/usr/bin/env python3
"""Benchmark CPU vs GPU transcription using the rust_transcription sidecar."""

import argparse
import json
import os
import signal
import struct
import subprocess
import sys
import time
import wave
from pathlib import Path
from urllib.error import URLError
from urllib.request import Request, urlopen

PACKAGE_DIR = Path(__file__).resolve().parent
DEFAULT_BINARY_DIR = PACKAGE_DIR / "target" / "release"
DEFAULT_MODELS_DIR = PACKAGE_DIR.parent.parent / "models"

CPU_PORT = 7771
GPU_PORT = 7772


def load_wav(path: Path) -> tuple[list[float], int]:
    with wave.open(str(path), "rb") as wf:
        n_channels = wf.getnchannels()
        sampwidth = wf.getsampwidth()
        sample_rate = wf.getframerate()
        raw = wf.readframes(wf.getnframes())

    n_samples = len(raw) // sampwidth
    if sampwidth == 2:
        pcm = struct.unpack(f"<{n_samples}h", raw)
        samples = [s / 32767.0 for s in pcm]
    elif sampwidth == 4:
        pcm = struct.unpack(f"<{n_samples}i", raw)
        samples = [s / 2147483647.0 for s in pcm]
    else:
        raise ValueError(f"Unsupported sample width: {sampwidth}")

    if n_channels > 1:
        mono = []
        for i in range(0, len(samples), n_channels):
            mono.append(sum(samples[i : i + n_channels]) / n_channels)
        samples = mono

    return samples, sample_rate


def load_audio(path: Path) -> tuple[list[float], int]:
    if path.suffix.lower() == ".wav":
        return load_wav(path)

    try:
        from pydub import AudioSegment
    except ImportError:
        sys.exit("pydub is required for non-WAV files: pip install pydub")

    seg = AudioSegment.from_file(str(path)).set_channels(1)
    raw = seg.raw_data
    n_samples = len(raw) // seg.sample_width
    pcm = struct.unpack(f"<{n_samples}h", raw)
    samples = [s / 32767.0 for s in pcm]
    return samples, seg.frame_rate


def wait_for_health(port: int, timeout: float = 15.0) -> dict:
    deadline = time.time() + timeout
    while time.time() < deadline:
        try:
            with urlopen(f"http://127.0.0.1:{port}/health", timeout=2) as resp:
                return json.loads(resp.read())
        except (URLError, OSError):
            time.sleep(0.2)
    raise TimeoutError(f"Sidecar on port {port} did not become healthy in {timeout}s")


def start_sidecar(binary: Path, port: int, models_dir: Path) -> subprocess.Popen:
    env = {
        **os.environ,
        "RUST_TRANSCRIPTION_HOST": "127.0.0.1",
        "RUST_TRANSCRIPTION_PORT": str(port),
        "RUST_TRANSCRIPTION_MODELS_DIR": str(models_dir),
    }
    proc = subprocess.Popen(
        [str(binary)],
        env=env,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )
    try:
        wait_for_health(port)
    except TimeoutError:
        proc.kill()
        proc.wait()
        raise
    return proc


def stop_sidecar(proc: subprocess.Popen):
    proc.send_signal(signal.SIGTERM)
    try:
        proc.wait(timeout=5)
    except subprocess.TimeoutExpired:
        proc.kill()
        proc.wait()


def transcribe(port: int, samples: list[float], sample_rate: int, model: str, device_id: str | None = None) -> dict:
    payload = json.dumps({
        "model": model,
        "samples": samples,
        "sampleRate": sample_rate,
        "language": "en",
        "initialPrompt": None,
        "deviceId": device_id,
    }).encode("utf-8")

    req = Request(
        f"http://127.0.0.1:{port}/v1/transcriptions",
        data=payload,
        headers={"Content-Type": "application/json"},
        method="POST",
    )

    start = time.time()
    with urlopen(req, timeout=600) as resp:
        result = json.loads(resp.read())
    result["roundTripMs"] = round((time.time() - start) * 1000)
    return result


def run_benchmark(audio_path: Path, binary_dir: Path, models_dir: Path, model: str, modes: list[str]):
    print(f"Loading {audio_path.name}...")
    samples, sample_rate = load_audio(audio_path)
    duration = len(samples) / sample_rate
    print(f"  {len(samples)} samples, {sample_rate} Hz, {duration:.2f}s\n")

    results = []

    if "cpu" in modes:
        cpu_bin = binary_dir / "rust-transcription-cpu"
        if not cpu_bin.exists():
            sys.exit(f"CPU binary not found: {cpu_bin}\nBuild with: cargo build --release --bin rust-transcription-cpu")

        print("Starting CPU sidecar...")
        proc = start_sidecar(cpu_bin, CPU_PORT, models_dir)
        try:
            print("Transcribing (CPU)...")
            result = transcribe(CPU_PORT, samples, sample_rate, model)
            results.append(("CPU", "CPU", result))
            print(f"  {result['durationMs']}ms server / {result['roundTripMs']}ms round-trip")
            print(f"  Text: {result['text']}\n")
        finally:
            stop_sidecar(proc)

    if "gpu" in modes:
        gpu_bin = binary_dir / "rust-transcription-gpu"
        if not gpu_bin.exists():
            sys.exit(f"GPU binary not found: {gpu_bin}\nBuild with: cargo build --release --bin rust-transcription-gpu --features gpu")

        print("Starting GPU sidecar...")
        proc = start_sidecar(gpu_bin, GPU_PORT, models_dir)
        try:
            devices_resp = json.loads(urlopen(f"http://127.0.0.1:{GPU_PORT}/v1/devices").read())
            devices = devices_resp["devices"]
            print(f"  Devices: {', '.join(d['name'] + ' (' + d['id'] + ')' for d in devices)}\n")

            for device in devices:
                print(f"Transcribing (GPU - {device['name']})...")
                result = transcribe(GPU_PORT, samples, sample_rate, model, device["id"])
                results.append(("GPU", f"{device['name']} ({device['id']})", result))
                print(f"  {result['durationMs']}ms server / {result['roundTripMs']}ms round-trip")
                print(f"  Text: {result['text']}\n")
        finally:
            stop_sidecar(proc)

    print("=" * 70)
    print(f"{'Mode':<6} {'Device':<30} {'Inference':>10} {'Round-trip':>11}  Text")
    print("-" * 70)
    for mode, device, result in results:
        text = result["text"][:40] + "..." if len(result["text"]) > 40 else result["text"]
        print(f"{mode:<6} {device:<30} {result['durationMs']:>8}ms {result['roundTripMs']:>9}ms  {text}")

    if len(results) >= 2:
        cpu_results = [r for r in results if r[0] == "CPU"]
        gpu_results = [r for r in results if r[0] == "GPU"]
        if cpu_results and gpu_results:
            cpu_ms = cpu_results[0][2]["durationMs"]
            best_gpu = min(r[2]["durationMs"] for r in gpu_results)
            print(f"\nGPU speedup: {cpu_ms / best_gpu:.2f}x ({cpu_ms}ms -> {best_gpu}ms)")


def main():
    parser = argparse.ArgumentParser(description="Benchmark CPU vs GPU transcription")
    parser.add_argument("audio", type=Path, help="Path to audio file (WAV, MP3, etc.)")
    parser.add_argument("--model", default="tiny", help="Whisper model name (default: tiny)")
    parser.add_argument("--binary-dir", type=Path, default=DEFAULT_BINARY_DIR, help="Directory containing sidecar binaries")
    parser.add_argument("--models-dir", type=Path, default=DEFAULT_MODELS_DIR, help="Directory containing downloaded model files")
    parser.add_argument("--mode", choices=["cpu", "gpu", "both"], default="both", help="Which mode(s) to benchmark (default: both)")
    args = parser.parse_args()

    if not args.audio.exists():
        sys.exit(f"Audio file not found: {args.audio}")

    modes = ["cpu", "gpu"] if args.mode == "both" else [args.mode]
    run_benchmark(args.audio, args.binary_dir, args.models_dir, args.model, modes)


if __name__ == "__main__":
    main()
