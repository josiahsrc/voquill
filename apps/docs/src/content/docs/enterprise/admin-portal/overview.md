---
title: Admin Portal
description: Manage users, dictionary terms, transcription providers, and settings from the admin portal.
---

The admin portal is your central hub for managing your Voquill Enterprise deployment. From here you can manage users, configure global dictionary terms, set up transcription and AI providers, and control organization-wide settings.

## Opening the Admin Portal

How you access the admin portal depends on your deployment type.

### Managed Cloud

If you're on a managed cloud deployment, we provide the admin portal URL during onboarding. If you've lost it, contact [enterprise@voquill.com](mailto:enterprise@voquill.com).

### Self-Hosted Cloud

You'll need to host the admin portal yourself as part of your cloud deployment. The URL depends on where and how you deployed the admin service. Refer to your cloud provider setup guide for details:

- [AWS](/enterprise/self-hosted-cloud/aws/)
- [GCP](/enterprise/self-hosted-cloud/gcp/)
- [Azure](/enterprise/self-hosted-cloud/azure/)

### On-Premise

The admin portal runs as a Docker container on port `5100` by default. Access it at `http://your-host:5100` where `your-host` is the hostname or IP of the machine running your Docker services. See the [On-Premise Setup](/enterprise/on-premise/setup/) guide for details.

## Sections

| Section | Description |
| --- | --- |
| **Users** | Manage seats, reset passwords, and control who has access. |
| **Global Dictionary** | Define glossary terms and replacement rules shared across the organization. |
| **Transcription Providers** | Configure which transcription services your organization uses. |
| **AI Providers** | Configure which AI providers handle post-processing. |
| **Settings** | View your license, manage seats, control feature flags, and sign out. |
