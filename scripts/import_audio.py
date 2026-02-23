#!/usr/bin/env python3

import argparse
import os
import platform
import shutil
import sqlite3
import subprocess
import sys
import time
import uuid
import wave


FLAVOR_IDENTIFIERS = {
    "emulators": "com.voquill.desktop.local",
    "dev": "com.voquill.desktop.dev",
    "prod": "com.voquill.desktop",
}


def get_app_data_dir(flavor):
    identifier = FLAVOR_IDENTIFIERS[flavor]
    system = platform.system()
    if system == "Darwin":
        return os.path.expanduser(f"~/Library/Application Support/{identifier}")
    elif system == "Windows":
        return os.path.join(os.environ.get("APPDATA", ""), identifier)
    else:
        return os.path.expanduser(f"~/.config/{identifier}")


def get_db_path(flavor):
    return os.path.join(get_app_data_dir(flavor), "voquill.db")


def get_audio_dir(flavor):
    return os.path.join(get_app_data_dir(flavor), "transcription-audio")


def get_audio_duration_ms(wav_path):
    with wave.open(wav_path, "r") as w:
        frames = w.getnframes()
        rate = w.getframerate()
        if rate == 0:
            return 0
        return round((frames / rate) * 1000)


def convert_to_wav(input_path, output_path):
    ext = os.path.splitext(input_path)[1].lower()
    if ext == ".wav":
        with wave.open(input_path, "r") as w:
            if w.getnchannels() == 1 and w.getsampwidth() == 2:
                shutil.copy2(input_path, output_path)
                return

    try:
        subprocess.run(
            [
                "ffmpeg",
                "-y",
                "-i", input_path,
                "-ac", "1",
                "-ar", "16000",
                "-sample_fmt", "s16",
                "-f", "wav",
                output_path,
            ],
            check=True,
            capture_output=True,
        )
    except FileNotFoundError:
        if ext == ".wav":
            shutil.copy2(input_path, output_path)
            print("Warning: ffmpeg not found. Copied WAV as-is without normalization.")
        else:
            print(f"Error: ffmpeg is required to convert {ext} files to WAV.", file=sys.stderr)
            print("Install it with: brew install ffmpeg", file=sys.stderr)
            sys.exit(1)


def main():
    parser = argparse.ArgumentParser(
        description="Import an audio file into a running Voquill instance's database."
    )
    parser.add_argument("audio_file", help="Path to the audio file to import")
    parser.add_argument(
        "--flavor",
        choices=["emulators", "dev", "prod"],
        default="emulators",
        help="Voquill flavor to target (default: emulators)",
    )
    parser.add_argument(
        "--transcript",
        default="",
        help="Initial transcript text (default: empty)",
    )
    args = parser.parse_args()

    audio_file = os.path.abspath(args.audio_file)
    if not os.path.isfile(audio_file):
        print(f"Error: File not found: {audio_file}", file=sys.stderr)
        sys.exit(1)

    db_path = get_db_path(args.flavor)
    if not os.path.isfile(db_path):
        print(f"Error: Voquill database not found at {db_path}", file=sys.stderr)
        print("Make sure Voquill has been launched at least once.", file=sys.stderr)
        sys.exit(1)

    audio_dir = get_audio_dir(args.flavor)
    os.makedirs(audio_dir, exist_ok=True)

    transcription_id = str(uuid.uuid4())
    dest_path = os.path.join(audio_dir, f"{transcription_id}.wav")

    print(f"Converting audio to WAV...")
    convert_to_wav(audio_file, dest_path)

    duration_ms = get_audio_duration_ms(dest_path)
    timestamp_ms = int(time.time() * 1000)

    conn = sqlite3.connect(db_path)
    try:
        conn.execute(
            """INSERT INTO transcriptions (
                id, transcript, timestamp,
                audio_path, audio_duration_ms,
                transcription_mode
            ) VALUES (?, ?, ?, ?, ?, ?)""",
            (
                transcription_id,
                args.transcript,
                timestamp_ms,
                dest_path,
                duration_ms,
                "local",
            ),
        )
        conn.commit()
    finally:
        conn.close()

    print(f"Imported: {os.path.basename(audio_file)}")
    print(f"  ID:       {transcription_id}")
    print(f"  Duration: {duration_ms}ms")
    print(f"  Audio:    {dest_path}")
    print(f"  DB:       {db_path}")
    print()
    print("Restart Voquill or refresh the transcription list to see it.")


if __name__ == "__main__":
    main()
