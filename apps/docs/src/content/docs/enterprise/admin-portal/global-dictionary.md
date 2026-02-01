---
title: Global Dictionary
description: Define organization-wide glossary terms and replacement rules that apply to every user.
---

The global dictionary lets you define glossary terms and replacement rules that are shared across every Voquill desktop app in your organization. Any term you add here automatically appears in every user's dictionary — no per-user configuration needed.

## How It Works

The global dictionary works the same way as the [personal dictionary](/guides/dictionary/) built into each desktop app, but at the organization level. Terms defined here are pushed to all connected desktop clients and take effect on their next transcription.

There are two types of entries:

### Glossary Terms

Glossary terms are hints provided to the transcription model during speech recognition. They improve accuracy for domain-specific vocabulary that the model might otherwise get wrong — things like product names, technical jargon, internal project names, or people's names.

For example, if your organization frequently references "Kubernetes," "Terraform," or a proprietary product name, adding these as glossary terms helps the transcription model recognize them correctly.

### Replacement Rules

Replacement rules find and replace text in the raw transcript before post-processing runs. They're useful for fixing consistent transcription errors or expanding abbreviations.

| Input | Output |
| --- | --- |
| V quill | Voquill |
| kube | Kubernetes |

Since replacements happen before the AI post-processing step, the language model sees the corrected text and works from there.

## When to Use Global vs Personal Dictionary

Use the global dictionary for terms that apply to everyone in your organization — company-specific vocabulary, product names, and industry jargon. Individual users can still add their own personal terms from the desktop app for anything specific to their role or workflow.

Global and personal dictionary entries are merged together during transcription.
