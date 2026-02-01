---
title: Transcription & AI Providers
description: Configure which transcription and AI providers your organization uses.
---

The admin portal lets you manage which transcription providers and AI providers are available to your organization. This gives you centralized control over which external services Voquill connects to and how voice data is processed.

## Transcription Providers

Transcription providers handle the speech-to-text step — converting audio into raw text. From the admin portal you can add, configure, and remove the transcription services your organization uses.

This is where you manage API keys, select which provider to use, and control where audio data is sent for transcription. If your deployment uses [local transcription](/enterprise/on-premise/transcription/), you can configure that here as well.

## AI Providers

AI providers handle post-processing — taking the raw transcript and cleaning it up using a language model. This includes fixing grammar, applying tone, expanding shorthand, and generally turning spoken language into polished text. See the [post-processing guide](/guides/post-processing/) for more on how this works.

From the admin portal you can manage which AI providers are available, configure API keys, and select which models to use.

## Why Centralized Provider Management Matters

Managing providers at the organization level means:

- **No per-user API key management.** Users don't need to bring their own keys or configure providers individually.
- **Consistent configuration.** Every user in your organization uses the same providers and models.
- **Cost visibility.** API usage flows through organization-controlled accounts.
- **Security control.** You decide exactly which external services your data touches — or whether it touches any at all.

For fully air-gapped deployments, you can configure local transcription and local post-processing with no external API calls. See the [on-premise transcription](/enterprise/on-premise/transcription/) and [on-premise post-processing](/enterprise/on-premise/post-processing/) guides.
