#!/usr/bin/env python3
"""
Translation script for Voquill locale files.

Usage:
    python translate.py desktop
    python translate.py web

Requires a .env file in the scripts directory with:
    GROQ_API_KEY=your_api_key_here
"""

import argparse
import json
import os
import subprocess
import sys
from pathlib import Path

from dotenv import load_dotenv
from groq import Groq

SCRIPT_DIR = Path(__file__).parent
load_dotenv(SCRIPT_DIR / ".env")

APP_CONFIGS = {
    "desktop": {
        "app_dir": SCRIPT_DIR.parent / "apps" / "desktop",
        "locales_dir": SCRIPT_DIR.parent / "apps" / "desktop" / "src" / "i18n" / "locales",
        "i18n_command": ["npm", "run", "i18n"],
    },
    "web": {
        "app_dir": SCRIPT_DIR.parent / "apps" / "web",
        "locales_dir": SCRIPT_DIR.parent / "apps" / "web" / "src" / "i18n" / "locales",
        "i18n_command": ["npm", "run", "i18n:extract", "&&", "npm", "run", "i18n:sync"],
    },
    "admin": {
        "app_dir": SCRIPT_DIR.parent / "enterprise" / "admin",
        "locales_dir": SCRIPT_DIR.parent / "enterprise" / "admin" / "src" / "i18n" / "locales",
        "i18n_command": ["npm", "run", "i18n"],
    },
}

LANGUAGE_NAMES = {
    "de": "German",
    "es": "Spanish",
    "fr": "French",
    "it": "Italian",
    "ko": "Korean",
    "pt": "Portuguese (European)",
    "pt-BR": "Portuguese (Brazilian)",
    "zh-CN": "Chinese (Simplified)",
    "zh-TW": "Chinese (Traditional)",
}


def read_locale_files(locales_dir: Path) -> dict[str, dict]:
    """Read all JSON locale files from the directory."""
    locales = {}
    for json_file in locales_dir.glob("*.json"):
        locale_code = json_file.stem
        if locale_code == "en":
            continue
        with open(json_file, "r", encoding="utf-8") as f:
            locales[locale_code] = json.load(f)
    return locales


def read_en_file(locales_dir: Path) -> dict:
    """Read the English locale file."""
    en_file = locales_dir / "en.json"
    with open(en_file, "r", encoding="utf-8") as f:
        return json.load(f)


def find_changed_keys(old_locales: dict[str, dict], new_locales: dict[str, dict], en_messages: dict) -> dict[str, list[str]]:
    """Find keys that have changed values between old and new locales."""
    changed = {}

    for locale_code, new_messages in new_locales.items():
        old_messages = old_locales.get(locale_code, {})
        changed_keys = []

        for key, new_value in new_messages.items():
            old_value = old_messages.get(key)
            if old_value != new_value:
                if key in en_messages:
                    changed_keys.append(key)

        if changed_keys:
            changed[locale_code] = changed_keys

    return changed


def translate_text(client: Groq, text: str, target_language: str, max_retries: int = 3) -> str:
    """Translate text to the target language using Groq with retries."""
    is_simplified_chinese = target_language == "Chinese (Simplified)"
    is_traditional_chinese = target_language == "Chinese (Traditional)"

    chinese_note = ""
    if is_simplified_chinese:
        chinese_note = " Use Simplified Chinese characters (简体中文)."
    elif is_traditional_chinese:
        chinese_note = " Use Traditional Chinese characters (繁體中文)."

    prompt = f"""Translate the following UI text to {target_language}.{chinese_note}

Rules:
- Keep any placeholder variables like {{name}}, {{count}}, {{email}} etc. exactly as they are
- Keep any ICU message format syntax like {{count, plural, one {{...}} other {{...}}}} intact
- Only translate the human-readable text

Respond with valid JSON in this exact format:
{{"translation": "your translated text here"}}

Text to translate:
{text}"""

    last_error = None
    for attempt in range(max_retries):
        try:
            response = client.chat.completions.create(
                model="openai/gpt-oss-120b",
                messages=[{"role": "user", "content": prompt}],
                temperature=0.3,
                max_tokens=1024,
            )

            content = response.choices[0].message.content.strip()
            result = json.loads(content)
            return result["translation"]

        except (json.JSONDecodeError, KeyError) as e:
            last_error = f"JSON parse error: {e}"
            print(f"    Retry {attempt + 1}/{max_retries}: {last_error}")
        except Exception as e:
            last_error = f"API error: {e}"
            print(f"    Retry {attempt + 1}/{max_retries}: {last_error}")

    raise RuntimeError(f"Failed after {max_retries} attempts: {last_error}")


def main():
    parser = argparse.ArgumentParser(description="Translate locale files for Voquill apps")
    parser.add_argument("app", choices=["desktop", "web", "admin"], help="The app to translate (desktop, web, or admin)")
    parser.add_argument("--dry-run", action="store_true", help="Show what would be translated without making changes")
    args = parser.parse_args()

    api_key = os.getenv("GROQ_API_KEY")
    if not api_key:
        print("Error: GROQ_API_KEY not found in environment or .env file")
        sys.exit(1)

    config = APP_CONFIGS[args.app]
    locales_dir = config["locales_dir"]
    app_dir = config["app_dir"]

    if not locales_dir.exists():
        print(f"Error: Locales directory not found: {locales_dir}")
        sys.exit(1)

    print(f"Reading existing locale files from {locales_dir}...")
    old_locales = read_locale_files(locales_dir)
    print(f"  Found {len(old_locales)} locale files (excluding en.json)")

    print(f"\nRunning i18n command in {app_dir}...")
    if args.app == "web":
        subprocess.run(["npm", "run", "i18n:extract"], cwd=app_dir, check=True)
        subprocess.run(["npm", "run", "i18n:sync"], cwd=app_dir, check=True)
    else:
        subprocess.run(config["i18n_command"], cwd=app_dir, check=True)

    print("\nReading updated locale files...")
    new_locales = read_locale_files(locales_dir)
    en_messages = read_en_file(locales_dir)

    print("\nFinding changed keys...")
    changed = find_changed_keys(old_locales, new_locales, en_messages)

    if not changed:
        print("No changes detected. Nothing to translate.")
        return

    total_changes = sum(len(keys) for keys in changed.values())
    print(f"Found {total_changes} changed key(s) across {len(changed)} locale(s):")
    for locale_code, keys in changed.items():
        lang_name = LANGUAGE_NAMES.get(locale_code, locale_code)
        print(f"  {locale_code} ({lang_name}): {len(keys)} key(s)")

    if args.dry_run:
        print("\n[Dry run] Would translate the following:")
        for locale_code, keys in changed.items():
            print(f"\n{locale_code}:")
            for key in keys:
                print(f"  - {key}: {en_messages.get(key, '???')[:60]}...")
        return

    client = Groq(api_key=api_key)

    for locale_code, keys in changed.items():
        lang_name = LANGUAGE_NAMES.get(locale_code, locale_code)
        locale_file = locales_dir / f"{locale_code}.json"

        print(f"\nTranslating {len(keys)} key(s) to {lang_name}...")

        with open(locale_file, "r", encoding="utf-8") as f:
            locale_data = json.load(f)

        for key in keys:
            en_text = en_messages.get(key)
            if not en_text:
                print(f"  Warning: No English text found for key '{key}', skipping")
                continue

            print(f"  Translating: {key[:50]}...")
            try:
                translated = translate_text(client, en_text, lang_name)
                locale_data[key] = translated
                print(f"    -> {translated[:60]}{'...' if len(translated) > 60 else ''}")
            except RuntimeError as e:
                print(f"    Error: {e}, keeping original value")

        with open(locale_file, "w", encoding="utf-8") as f:
            json.dump(locale_data, f, ensure_ascii=False, indent=2)
            f.write("\n")

        print(f"  Saved {locale_file.name}")

    print("\nTranslation complete!")


if __name__ == "__main__":
    main()
