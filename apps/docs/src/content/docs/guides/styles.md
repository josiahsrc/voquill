---
title: Styles
description: Customize how Voquill cleans up your transcriptions with styles.
---

Styles (also called tones) control how Voquill's AI post-processes your raw transcription. After speech is converted to text, a language model rewrites it according to the active style's prompt.

## Built-in Styles

Voquill ships with several built-in styles:

- **Light** — Minimal changes. Fixes obvious errors and punctuation but keeps your words mostly intact.
- **Casual** — Relaxed, conversational tone.
- **Formal** — Polished and professional language.
- **Business** — Suited for emails, reports, and workplace communication.
- **Punny** — Adds wordplay and humor.

## Switching Styles

Select your active style from the main screen. The active style is applied to all subsequent transcriptions.

## Custom Styles

You can create your own styles with a custom prompt. When writing a prompt, use the `{transcript}` placeholder to indicate where the raw transcription should be inserted.

For example:

```
Rewrite the following transcript as bullet points:

{transcript}
```

Custom styles are stored locally and can be edited or deleted at any time.
