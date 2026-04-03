#!/Users/josiah/repos/voquill/.venv/bin/python3
"""
Prompt testing and self-improvement tool.

Usage:

  # List available models
  python3 scripts/prompts.py list

  # Run a prompt against one or more models
  python3 scripts/prompts.py --model groq-llama4-scout,gpt-5.4 \
    --prompt scripts/prompts/polished.txt \
    --transcript scripts/transcripts/hey-harry.txt

  # Self-improvement loop — optimize a prompt for a target model
  # by comparing its output against a golden (reference) model.
  python3 scripts/prompts.py self-improve \
    --golden-model gpt-5.4 \
    --golden-prompt scripts/prompts/polished.txt \
    --target-model groq-llama4-scout \
    --target-prompt scripts/prompts/polished.txt

  # With optional args:
  python3 scripts/prompts.py self-improve \
    --golden-model gpt-5.4 \
    --golden-prompt scripts/prompts/polished.txt \
    --target-model groq-llama4-scout \
    --target-prompt scripts/prompts/polished.txt \
    --judge-model gpt-5.4 \
    --transcripts-dir scripts/transcripts \
    --output-dir scripts/prompt-self-improvement \
    --max-epochs 10

  Output structure:
    scripts/prompt-self-improvement/
      golden/                  # Golden model outputs (cached, reused across runs)
        hey-harry.txt.json
      epochs/
        000/                   # Each epoch stores its prompt, results, and eval
          prompt.txt
          results/hey-harry.txt.json
          eval.json
        001/
          ...
"""

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

OPENAI_MODELS = {
    "gpt-5.4": "gpt-5.4",
}

REASONING_EFFORT = {
    "openai/gpt-oss-120b": "low",
}

MODELS = {**OLLAMA_MODELS, **GROQ_MODELS, **OPENAI_MODELS}


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
    print("\nOpenAI models:\n")
    for alias, tag in OPENAI_MODELS.items():
        print(f"  {alias:<24} -> {tag}")
    print("\nYou can also pass any Ollama, Groq, or OpenAI model name directly with --model.")


CYAN = "\033[36m"
GREEN = "\033[32m"
RED = "\033[31m"
GREY = "\033[90m"
GREEN_BG = "\033[42;30m"
RED_BG = "\033[41;37m"
RESET = "\033[0m"


def is_groq_model(model_tag: str) -> bool:
    return model_tag in GROQ_MODELS.values() or any(model_tag == alias for alias in GROQ_MODELS)


def is_openai_model(model_tag: str) -> bool:
    return model_tag in OPENAI_MODELS.values() or any(model_tag == alias for alias in OPENAI_MODELS)


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


EVAL_SYSTEM_PROMPT = """\
You are an evaluation judge. You will be given:
1. A system prompt that was given to another model
2. The original input transcript that was provided to the model
3. The output that model produced

Break the system prompt into its individual instructions/criteria. For each one, determine \
whether the model's output satisfies it ("pass") or not ("fail"). The "slice" should be a \
short quote or paraphrase of that part of the prompt.

IMPORTANT: You MUST carefully compare the output against the ORIGINAL TRANSCRIPT to judge \
correctly. For example:
- If the prompt says "do not add details" — check whether the output contains anything NOT \
in the original transcript. If a phrase exists in the original, it was NOT added.
- If the prompt says "preserve wording" — check whether the output changed words that were \
already correct and understandable in the original.
- If the prompt says "remove filler" — check whether removed words were actually filler, \
false starts, or repetitions in the original.

Do not guess or assume. Base every judgment on a direct comparison between the original \
transcript and the output.

Respond with JSON only: { "evals": [{ "status": "pass" | "fail", "slice": "<text from prompt>", "reason": "<short explanation>" }] }"""


def evaluate_result(sys_prompt: str, result: str, transcript: str, judge_model: str = "gpt-5.4") -> list[dict]:
    from openai import OpenAI

    client = OpenAI()
    completion = client.chat.completions.create(
        model=judge_model,
        messages=[
            {"role": "system", "content": EVAL_SYSTEM_PROMPT},
            {
                "role": "user",
                "content": (
                    f'System prompt:\n"""\n{sys_prompt}\n"""\n\n'
                    f'Original transcript:\n"""\n{transcript}\n"""\n\n'
                    f'Model output:\n"""\n{result}\n"""'
                ),
            },
        ],
        response_format={"type": "json_object"},
    )

    content = completion.choices[0].message.content
    try:
        parsed = json.loads(content)
        return parsed.get("evals", [])
    except json.JSONDecodeError:
        return []


def print_evals(evals: list[dict]):
    for e in evals:
        status = e.get("status", "?")
        slice_text = e.get("slice", "")
        reason = e.get("reason", "")
        if status == "pass":
            print(f"  {GREEN_BG} pass {RESET} {slice_text}")
        else:
            print(f"  {RED_BG} fail {RESET} {slice_text}")
        print(f"  {GREY}{reason}{RESET}")
        print()


def run_openai(model_tag: str, sys_prompt: str, transcript: str) -> str:
    from openai import OpenAI

    client = OpenAI()
    completion = client.chat.completions.create(
        model=model_tag,
        messages=[
            {"role": "system", "content": sys_prompt},
            {"role": "user", "content": user_prompt(transcript)},
        ],
        response_format={"type": "json_object"},
    )

    return completion.choices[0].message.content


def run_one(model_tag: str, sys_prompt: str, transcript: str) -> str:
    if is_openai_model(model_tag):
        return run_openai(model_tag, sys_prompt, transcript)
    if is_groq_model(model_tag):
        return run_groq(model_tag, sys_prompt, transcript)
    return run_ollama(model_tag, sys_prompt, transcript)


def resolve_transcripts(transcript_arg: str) -> list[Path]:
    paths = []
    for part in transcript_arg.split(","):
        p = Path(part.strip())
        if p.is_dir():
            paths.extend(sorted(p.glob("*.txt")))
        elif p.is_file():
            paths.append(p)
        else:
            print(f"{RED}Not found: {p}{RESET}", file=sys.stderr)
            sys.exit(1)
    if not paths:
        print(f"{RED}No transcript files found{RESET}", file=sys.stderr)
        sys.exit(1)
    return paths


def run_prompt(model_tags: list[str], sys_prompt: str, transcript_files: list[Path], judge_model: str = None):
    for tf in transcript_files:
        transcript = tf.read_text()
        print(f"\n{CYAN}=== {tf.name} ==={RESET}")
        print(transcript)

        for i, tag in enumerate(model_tags):
            start = time.perf_counter()
            content = run_one(tag, sys_prompt, transcript)
            ms = int((time.perf_counter() - start) * 1000)
            result = extract_result(content)

            print(f"\n{GREEN}{tag} {GREY}[{ms}ms]{RESET}")
            print(result)

            if judge_model:
                evals = evaluate_result(sys_prompt, content, transcript, judge_model)
                print()
                print_evals(evals)

            if i < len(model_tags) - 1:
                print(f"\n{GREY}---{RESET}")


SELF_IMPROVE_DIR = Path(__file__).parent / "prompt-self-improvement"

REFINE_PROMPT = """\
You are a prompt engineer. You are given a system prompt that was used with a target model, \
but the target model's output did not match the golden (reference) output closely enough.

Your job is to refine the system prompt so the target model produces output closer to the \
golden output. You may adjust wording, add clarifications, reorder instructions, or add \
constraints — but do NOT change the fundamental task.

IMPORTANT: Consider the target model's size and capability level. Smaller, less powerful \
models struggle with long or complex instructions. For these models, keep prompts short, \
direct, and focused on the most critical instructions. Avoid multi-layered or nuanced \
directives that only large frontier models can reliably follow. When in doubt, simplify.

CRITICAL: The refined prompt must be GENERAL-PURPOSE. You must NEVER include specific \
examples, sample inputs, sample outputs, or any content from the test set in the prompt. \
The prompt must work for any transcript, not just the ones that failed. Baking test data \
into the prompt is cheating and produces a prompt that overfits to the test set.

Respond with the refined system prompt text only. No JSON wrapping, no explanation — just \
the new prompt."""

COMPARE_PROMPT = """\
You are an evaluation judge. Compare the target model's output against the golden (reference) \
output. They were both produced from the same transcript using different models/prompts.

Focus on MEANINGFUL differences. These models are non-deterministic, so minor wording \
variations are expected and acceptable.

DO penalize for:
1. Dropped content: Missing names, numbers, dates, key details, or entire sentences.
2. Added content: Introducing information not present in the golden output.
3. Meaning changes: Altering what was actually said or intended.
4. Tone/register shifts: Making casual speech formal, or vice versa.
5. Structural differences: Merging or splitting sentences in ways that change readability \
or lose the speaker's voice.
6. Fundamental wording and/or phrasing changes

Scoring guide:
- 95-100: Essentially the same. Only trivial, inconsequential differences.
- 85-94: Very close. Minor wording differences but all content, meaning, and tone preserved.
- 70-84: Meaningful differences. Dropped details, added content, or noticeable tone shifts.
- 50-69: Significant divergence. Multiple missing details or wrong tone throughout.
- 0-49: Substantially different output.

Respond with JSON only:
{
  "score": <0-100>,
  "passed": <true if score >= 90>,
  "issues": ["<specific issue with exact quote from both outputs>", ...],
  "summary": "<one-line summary>"
}"""


def run_golden(model_tag: str, sys_prompt: str, transcripts_dir: Path, output_dir: Path):
    golden_dir = output_dir / "golden"
    golden_dir.mkdir(parents=True, exist_ok=True)

    transcript_files = sorted(transcripts_dir.glob("*.txt"))
    if not transcript_files:
        print(f"{RED}No transcript files found in {transcripts_dir}{RESET}")
        sys.exit(1)

    print(f"\n{CYAN}=== Generating golden outputs ==={RESET}")
    print(f"  Model: {model_tag}")
    print(f"  Transcripts: {len(transcript_files)} files")

    for tf in transcript_files:
        out_file = golden_dir / f"{tf.name}.json"
        if out_file.exists():
            print(f"  {GREY}Skipping {tf.name} (already exists){RESET}")
            continue

        transcript = tf.read_text()
        print(f"  Running {tf.name}...", end=" ", flush=True)
        start = time.perf_counter()
        content = run_one(model_tag, sys_prompt, transcript)
        ms = int((time.perf_counter() - start) * 1000)
        result = extract_result(content)

        out_file.write_text(json.dumps({"result": result, "raw": content}, indent=2))
        print(f"{GREEN}done{RESET} {GREY}[{ms}ms]{RESET}")

    return golden_dir


def run_epoch(
    epoch_num: int,
    target_model_tag: str,
    sys_prompt: str,
    transcripts_dir: Path,
    golden_dir: Path,
    output_dir: Path,
    judge_model: str = "gpt-5.4",
) -> tuple[str, bool]:
    epoch_label = f"{epoch_num:03d}"
    epoch_dir = output_dir / "epochs" / epoch_label
    results_dir = epoch_dir / "results"
    results_dir.mkdir(parents=True, exist_ok=True)

    # Save the prompt used this epoch
    (epoch_dir / "prompt.txt").write_text(sys_prompt)

    transcript_files = sorted(transcripts_dir.glob("*.txt"))

    print(f"\n{CYAN}=== Epoch {epoch_label} ==={RESET}")
    print(f"  Target model: {target_model_tag}")

    # Run target model on all transcripts
    for tf in transcript_files:
        transcript = tf.read_text()
        print(f"  Running {tf.name}...", end=" ", flush=True)
        start = time.perf_counter()
        content = run_one(target_model_tag, sys_prompt, transcript)
        ms = int((time.perf_counter() - start) * 1000)
        result = extract_result(content)

        (results_dir / f"{tf.name}.json").write_text(
            json.dumps({"result": result, "raw": content}, indent=2)
        )

        golden_result = json.loads((golden_dir / f"{tf.name}.json").read_text())["result"]
        stem = tf.stem
        (results_dir / f"{stem}.md").write_text(
            f"# {stem}\n\n"
            f"## Original Transcript\n\n{transcript}\n\n"
            f"## Golden Output\n\n{golden_result}\n\n"
            f"## Target Output\n\n{result}\n"
        )

        print(f"{GREEN}done{RESET} {GREY}[{ms}ms]{RESET}")

    # Eval each result against golden
    from openai import OpenAI

    client = OpenAI()
    all_evals = []
    all_passed = True

    print(f"\n  {CYAN}Evaluating...{RESET}")
    for tf in transcript_files:
        golden_file = golden_dir / f"{tf.name}.json"
        target_file = results_dir / f"{tf.name}.json"

        golden_data = json.loads(golden_file.read_text())
        target_data = json.loads(target_file.read_text())

        completion = client.chat.completions.create(
            model=judge_model,
            messages=[
                {"role": "system", "content": COMPARE_PROMPT},
                {
                    "role": "user",
                    "content": (
                        f"Golden output:\n\"\"\"\n{golden_data['result']}\n\"\"\"\n\n"
                        f"Target output:\n\"\"\"\n{target_data['result']}\n\"\"\""
                    ),
                },
            ],
            response_format={"type": "json_object"},
        )

        eval_content = completion.choices[0].message.content
        try:
            eval_result = json.loads(eval_content)
        except json.JSONDecodeError:
            eval_result = {"score": 0, "passed": False, "issues": ["Failed to parse eval"], "summary": eval_content}

        eval_result["transcript"] = tf.name
        all_evals.append(eval_result)

        passed = eval_result.get("passed", False)
        score = eval_result.get("score", 0)
        summary = eval_result.get("summary", "")

        if passed:
            print(f"    {GREEN_BG} pass {RESET} {tf.name} (score: {score}) — {summary}")
        else:
            all_passed = False
            print(f"    {RED_BG} fail {RESET} {tf.name} (score: {score}) — {summary}")
            for issue in eval_result.get("issues", []):
                print(f"      {GREY}• {issue}{RESET}")

    # Save eval results
    (epoch_dir / "eval.json").write_text(json.dumps(all_evals, indent=2))

    avg_score = sum(e.get("score", 0) for e in all_evals) / max(len(all_evals), 1)
    print(f"\n  Average score: {avg_score:.1f}/100")

    if all_passed:
        print(f"\n  {GREEN}All transcripts passed! Stopping.{RESET}")
        return sys_prompt, True

    # Refine the prompt using GPT-5.4
    print(f"\n  {CYAN}Refining prompt...{RESET}")
    failures = [e for e in all_evals if not e.get("passed", False)]
    failure_summary = "\n".join(
        f"- {e['transcript']}: score={e.get('score', 0)}, issues: {', '.join(e.get('issues', []))}"
        for e in failures
    )

    completion = client.chat.completions.create(
        model=judge_model,
        messages=[
            {"role": "system", "content": REFINE_PROMPT},
            {
                "role": "user",
                "content": (
                    f"Current system prompt:\n\"\"\"\n{sys_prompt}\n\"\"\"\n\n"
                    f"Failure patterns (issues only, no test data):\n{failure_summary}"
                ),
            },
        ],
    )

    refined = completion.choices[0].message.content.strip()
    print(f"\n  {GREEN}Refined prompt:{RESET}")
    print(f"  {GREY}{refined}{RESET}")

    return refined, False


def cmd_self_improve(args):
    golden_model = MODELS.get(args.golden_model, args.golden_model)
    target_model = MODELS.get(args.target_model, args.target_model)
    judge_model = MODELS.get(args.judge_model, args.judge_model)
    golden_prompt = Path(args.golden_prompt).read_text().strip()
    target_prompt = Path(args.target_prompt).read_text().strip()
    transcripts_dir = Path(args.transcripts_dir)
    output_dir = Path(args.output_dir)
    max_epochs = args.max_epochs

    import shutil

    output_dir.mkdir(parents=True, exist_ok=True)

    epochs_dir = output_dir / "epochs"
    if epochs_dir.exists():
        shutil.rmtree(epochs_dir)
        print(f"{GREY}Cleared previous epochs{RESET}")

    # Step 1: Generate golden outputs
    golden_dir = run_golden(golden_model, golden_prompt, transcripts_dir, output_dir)

    # Step 2: Epoch loop
    current_prompt = target_prompt
    for epoch in range(max_epochs):
        current_prompt, converged = run_epoch(
            epoch, target_model, current_prompt, transcripts_dir, golden_dir, output_dir, judge_model
        )
        if converged:
            break
    else:
        print(f"\n{RED}Reached max epochs ({max_epochs}) without convergence.{RESET}")

    print(f"\n{GREEN}Final prompt saved in last epoch directory.{RESET}")


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
    run_p.add_argument("--transcript", "-t", required=True, help="Transcript file(s) — comma-separated paths or a directory")
    run_p.add_argument("--judge-model", default=None, help="Model to evaluate results (omit to skip eval)")

    # self-improve
    si_p = sub.add_parser("self-improve", help="Self-improving prompt optimization loop")
    si_p.add_argument("--golden-model", required=True, help="Model to produce golden reference outputs")
    si_p.add_argument("--golden-prompt", required=True, help="Path to golden system prompt file")
    si_p.add_argument("--target-model", required=True, help="Model to optimize the prompt for")
    si_p.add_argument("--target-prompt", required=True, help="Path to initial target prompt file")
    si_p.add_argument("--transcripts-dir", default=str(Path(__file__).parent / "transcripts"), help="Directory of transcript files")
    si_p.add_argument("--output-dir", default=str(SELF_IMPROVE_DIR), help="Output directory for results")
    si_p.add_argument("--max-epochs", type=int, default=10, help="Maximum number of refinement epochs")
    si_p.add_argument("--judge-model", default="gpt-5.4", help="Model used for evaluation and prompt refinement (default: gpt-5.4)")

    # Also support flat usage: prompts.py --model X --prompt Y --transcript Z
    parser.add_argument("--model", "-m", help="Model alias or Ollama tag")
    parser.add_argument("--prompt", "-p", help="Path to system prompt text file")
    parser.add_argument("--transcript", "-t", help="Transcript file(s) — comma-separated paths or a directory")
    parser.add_argument("--judge-model", default=None, help="Model to evaluate results (omit to skip eval)")

    args = parser.parse_args()

    if args.command == "pull":
        tag = MODELS.get(args.model, args.model)
        pull_model(tag)
    elif args.command == "list":
        list_models()
    elif args.command == "run":
        tags = [MODELS.get(m.strip(), m.strip()) for m in args.model.split(",")]
        sys_prompt = open(args.prompt).read().strip()
        transcript_files = resolve_transcripts(args.transcript)
        judge = MODELS.get(args.judge_model, args.judge_model) if args.judge_model else None
        run_prompt(tags, sys_prompt, transcript_files, judge)
    elif args.command == "self-improve":
        cmd_self_improve(args)
    elif args.model and args.transcript and args.prompt:
        tags = [MODELS.get(m.strip(), m.strip()) for m in args.model.split(",")]
        sys_prompt = open(args.prompt).read().strip()
        transcript_files = resolve_transcripts(args.transcript)
        judge = MODELS.get(args.judge_model, args.judge_model) if args.judge_model else None
        run_prompt(tags, sys_prompt, transcript_files, judge)
    else:
        parser.print_help()


if __name__ == "__main__":
    main()
