#!/Users/josiah/repos/voquill/.venv/bin/python3

import argparse
import json
import subprocess
import sys
import time
from pathlib import Path
from urllib.request import urlopen, Request
from urllib.error import URLError

from dotenv import load_dotenv

load_dotenv(Path(__file__).parent / ".env")

OLLAMA_BASE = "http://localhost:11434"

OLLAMA_MODELS = {
    "gemma4": "gemma4:latest",
    "gemma4-e2b": "gemma4:e2b",
    "gemma4-27b": "gemma4:26b",
    "gemma4-31b": "gemma4:31b",
    "gpt-oss-120b": "gpt-oss:120b",
    "llama4-scout": "llama4:scout",
    "qwen3-235b": "qwen3:235b",
}

GROQ_MODELS = {
    "groq-llama4-scout": "meta-llama/llama-4-scout-17b-16e-instruct",
    "groq-gpt-oss-120b": "openai/gpt-oss-120b",
}

REASONING_EFFORT = {
    "openai/gpt-oss-120b": "low",
}

MODELS = {**OLLAMA_MODELS, **GROQ_MODELS}


def user_prompt(transcript: str) -> str:
    return f"""\
Here is the transcript: "{transcript}"
""".strip()


def pull_model(model_tag: str):
    print(f"Pulling {model_tag}...")
    subprocess.run(["ollama", "pull", model_tag], check=True)
    print(f"Done pulling {model_tag}")


def list_models():
    print("Ollama models:\n")
    for alias, tag in OLLAMA_MODELS.items():
        print(f"  {alias:<24} -> {tag}")
    print("\nGroq models:\n")
    for alias, tag in GROQ_MODELS.items():
        print(f"  {alias:<24} -> {tag}")
    print("\nYou can also pass any Ollama or Groq model name directly with --model.")


CYAN = "\033[36m"
GREEN = "\033[32m"
GREY = "\033[90m"
RESET = "\033[0m"


def is_groq_model(model_tag: str) -> bool:
    return model_tag in GROQ_MODELS.values() or any(model_tag == alias for alias in GROQ_MODELS)


def extract_result(content: str) -> str:
    try:
        parsed = json.loads(content)
        return parsed.get("result", content)
    except json.JSONDecodeError:
        return content


def run_groq(model_tag: str, sys_prompt: str, transcript: str) -> str:
    from groq import Groq

    client = Groq()
    kwargs = {}
    if model_tag in REASONING_EFFORT:
        kwargs["reasoning_effort"] = REASONING_EFFORT[model_tag]

    completion = client.chat.completions.create(
        model=model_tag,
        messages=[
            {"role": "system", "content": sys_prompt},
            {"role": "user", "content": user_prompt(transcript)},
        ],
        response_format={"type": "json_object"},
        stream=False,
        **kwargs,
    )

    return completion.choices[0].message.content


def run_ollama(model_tag: str, sys_prompt: str, transcript: str) -> str:
    payload = {
        "model": model_tag,
        "messages": [
            {"role": "system", "content": sys_prompt},
            {"role": "user", "content": user_prompt(transcript)},
        ],
        "format": {"type": "object", "properties": {"result": {"type": "string"}}, "required": ["result"]},
        "stream": False,
    }

    body = json.dumps(payload).encode()
    req = Request(f"{OLLAMA_BASE}/api/chat", data=body, headers={"Content-Type": "application/json"})

    try:
        with urlopen(req, timeout=600) as resp:
            data = json.loads(resp.read())
    except URLError as e:
        print(f"Error: Cannot connect to Ollama. Is it running? (ollama serve)\n{e}", file=sys.stderr)
        sys.exit(1)

    return data["message"]["content"]


def run_one(model_tag: str, sys_prompt: str, transcript: str) -> str:
    if is_groq_model(model_tag):
        return run_groq(model_tag, sys_prompt, transcript)
    return run_ollama(model_tag, sys_prompt, transcript)


def run_prompt(model_tags: list[str], sys_prompt: str, transcript: str):
    print(f"\n{CYAN}Original{RESET}")
    print(transcript)

    for tag in model_tags:
        start = time.perf_counter()
        content = run_one(tag, sys_prompt, transcript)
        ms = int((time.perf_counter() - start) * 1000)
        print(f"\n{GREEN}{tag} {GREY}[{ms}ms]{RESET}")
        print(extract_result(content))


def main():
    parser = argparse.ArgumentParser(description="Test open-source models via Ollama")
    sub = parser.add_subparsers(dest="command")

    # pull
    pull_p = sub.add_parser("pull", help="Pull/download a model")
    pull_p.add_argument("model", help="Model alias or Ollama tag")

    # list
    sub.add_parser("list", help="List available model aliases")

    # run (default)
    run_p = sub.add_parser("run", help="Run a transcript cleanup prompt")
    run_p.add_argument("--model", "-m", required=True, help="Model alias or Ollama tag")
    run_p.add_argument("--prompt", "-p", required=True, help="Path to system prompt text file")
    run_p.add_argument("--transcript", "-t", required=True, help="Path to transcript text file")

    # Also support flat usage: prompts.py --model X --prompt Y --transcript Z
    parser.add_argument("--model", "-m", help="Model alias or Ollama tag")
    parser.add_argument("--prompt", "-p", help="Path to system prompt text file")
    parser.add_argument("--transcript", "-t", help="Path to transcript text file")

    args = parser.parse_args()

    if args.command == "pull":
        tag = MODELS.get(args.model, args.model)
        pull_model(tag)
    elif args.command == "list":
        list_models()
    elif args.command == "run":
        tags = [MODELS.get(m.strip(), m.strip()) for m in args.model.split(",")]
        sys_prompt = open(args.prompt).read().strip()
        transcript = open(args.transcript).read()
        run_prompt(tags, sys_prompt, transcript)
    elif args.model and args.transcript and args.prompt:
        tags = [MODELS.get(m.strip(), m.strip()) for m in args.model.split(",")]
        sys_prompt = open(args.prompt).read().strip()
        transcript = open(args.transcript).read()
        run_prompt(tags, sys_prompt, transcript)
    else:
        parser.print_help()


if __name__ == "__main__":
    main()
