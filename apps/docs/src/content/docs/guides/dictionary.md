---
title: Dictionary
description: Improve transcription accuracy with glossary terms and replacement rules.
---

The dictionary helps Voquill handle domain-specific vocabulary, names, and acronyms that speech recognition might otherwise get wrong. It has two features: glossary terms and replacement rules.

## Glossary Terms

Glossary terms are fed directly to the transcription model as hints. When you add a glossary term, the speech recognition model uses it as a reference during transcription itself, making it more likely to produce the correct word.

This is especially useful for:

- Product names (e.g., "Voquill", "PostgreSQL")
- People's names (e.g., "Josiah", "Satya Nadella")
- Technical jargon (e.g., "Kubernetes", "WebSocket")
- Anything the transcription model consistently mishears

## Replacement Rules

Replacement rules find and replace text in the raw transcript, right before post-processing runs. If Voquill keeps getting a word wrong, you can add a replacement rule to fix it automatically.

For example:

| Input    | Output    |
| -------- | --------- |
| GPT      | ChatGPT   |
| V quill  | Voquill   |

You can also use replacement rules as **snippets**. Define a short trigger phrase and have it expand into something longer — useful for boilerplate text, signatures, or common phrases you dictate frequently.

| Input         | Output                                      |
| ------------- | ------------------------------------------- |
| sig block     | Best regards, Josiah — Voquill Team         |
| addr          | 123 Main Street, Suite 400, New York, NY    |

Since replacements happen on the raw transcript before the AI post-processing step, the language model sees the corrected text and works from there.

## Managing the Dictionary

Open the dictionary from settings. From there you can add, edit, and delete both glossary terms and replacement rules. Changes take effect immediately on your next transcription.
