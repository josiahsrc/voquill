---
title: Global Styles
description: Define organization-wide writing styles and prompt templates that apply to every user.
---

Global styles let you define writing styles that are shared across every Voquill desktop app in your organization. Any style you add here automatically becomes available to every user — giving your entire team a consistent set of writing options without per-user configuration.

## How It Works

Global styles work the same way as the [personal styles](/guides/styles/) built into each desktop app, but at the organization level. Styles defined here are pushed to all connected desktop clients and are available for selection immediately.

Each style has a name and a prompt that controls how Voquill's AI rewrites the raw transcription.

## Why Use Global Styles

Managing styles at the organization level lets you curate a consistent voice across your team. Instead of each person writing their own prompts, you can define styles once and distribute them to everyone.

This is useful when you want to:

- Enforce a consistent writing voice for external communication
- Provide ready-made styles for common workflows (emails, meeting notes, documentation)
- Iterate on prompt quality in one place rather than asking every user to update individually

Once you've landed on styles that work well, everyone in the organization gets them automatically.

## Style vs Template

When creating a global style, you can choose between two modes using the toggle at the top of the dialog: **Style** and **Template**.

### Style Mode

Style mode is the simpler option. You provide a name and a prompt describing the writing style you want. Voquill wraps your prompt into a standard processing pipeline that handles the transcript, language, and JSON formatting automatically.

Use style mode when you want to describe _how_ the output should sound without worrying about the underlying prompt structure. For example:

```
- Use a warm, helpful tone
- Address the customer's concern directly
- Keep responses concise
```

### Template Mode

Template mode gives you full control over the entire prompt sent to the language model. Instead of Voquill wrapping your instructions, **your prompt _is_ the prompt** — including where the transcript appears, how the user is referenced, and what language the output should be in.

Use template mode when the standard pipeline doesn't fit your use case, or when you need precise control over how the model behaves.

## Writing a Template

A template has two fields: an optional **System Prompt** and a required **Prompt Template**.

### System Prompt

The system prompt sets the model's persona and high-level behavior. If you leave it blank, Voquill uses a default system prompt. If you provide one, it replaces the default entirely.

Example:

```
You are a medical transcription assistant for <username/>.
Always use standard medical terminology and abbreviations.
```

### Prompt Template

The prompt template is the main instruction sent to the model. This is where you tell the model what to do with the transcript.

Example:

```
Rewrite the following transcript for <username/> in <language/>.
Keep the tone professional and use standard medical terminology.

Transcript:
<transcript/>

Your response MUST be in JSON format.
```

### Available Variables

Both the system prompt and the prompt template support these variables. They are replaced with actual values at runtime:

| Variable | Description |
| --- | --- |
| `<transcript/>` | The raw transcription text. |
| `<username/>` | The name of the user who recorded the transcription. |
| `<language/>` | The user's dictation language (e.g. "English", "Français"). |

### JSON Response Requirement

The model must respond in JSON format with a single field called `processedTranscription`. You should always explicitly instruct the model to respond in JSON at the end of your prompt template. While Voquill enforces a JSON schema on the model's output, including the instruction in your prompt reinforces the requirement and produces more reliable results.

The expected response structure is:

```json
{
  "processedTranscription": "The rewritten text goes here."
}
```

### Tips for Writing Templates

- Always include `<transcript/>` in your prompt template. Without it, the model won't have access to the transcription.
- Always end your prompt template with `Your response MUST be in JSON format.` to reinforce the JSON output requirement.
- Use `<language/>` if your organization is multilingual and you want the output to match the user's dictation language.
- Keep the system prompt focused on the model's role and general behavior. Put task-specific instructions in the prompt template.
- Test your template with different transcript lengths and languages before rolling it out to everyone.

### Example: Report Template

**System Prompt:**

```
You are a report writing assistant for <username/>.
You convert spoken transcripts into structured reports.
```

**Prompt Template:**

```
Take the following transcript from <username/> and convert it into a structured report in <language/>.

The report must have exactly 3 distinct parts:
1. Summary — A brief overview of what was said.
2. Key Details — The important facts, figures, or decisions mentioned.
3. Action Items — Any next steps or follow-ups that were discussed.

Transcript:
<transcript/>

Your response MUST be in JSON format.
```

## Managing Styles

From the **Global Styles** tab in the admin portal you can add, edit, and delete styles. Each style requires a name and a prompt (or prompt template, if using template mode).

## Global vs Personal Styles

Global styles appear alongside the built-in styles on every user's desktop app. Individual users can still create personal styles for anything specific to their own workflow. Both global and personal styles are available for selection in the style picker.
