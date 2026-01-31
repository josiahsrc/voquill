---
title: Self-Hosted Cloud Setup
description: Deploy Voquill Enterprise on your own cloud infrastructure.
---

Self-Hosted Cloud gives you full control over your Voquill Enterprise deployment by running it on your own cloud infrastructure. You provision and manage the servers, database, and networking within your cloud account.

## Prerequisites

- A cloud account with your provider of choice (AWS, GCP, Azure, or another provider).
- A Voquill Enterprise license key. Contact [enterprise@voquill.com](mailto:enterprise@voquill.com) if you don't have one yet.

## 1. Obtain a License Key

Contact [enterprise@voquill.com](mailto:enterprise@voquill.com) to obtain your license key. You'll need this to configure the gateway service.

## 2. Deploy to Your Cloud Provider

Follow the guide for your cloud provider:

- [AWS](/enterprise/self-hosted-cloud/aws/)
- [GCP](/enterprise/self-hosted-cloud/gcp/)
- [Azure](/enterprise/self-hosted-cloud/azure/)
Each guide walks you through provisioning the necessary resources and deploying the Voquill services.

## 3. Configure the Desktop App

Each Voquill desktop client needs an `enterprise.json` file placed in the app config directory. If you're distributing Voquill with a tool like Microsoft Intune, this file can be placed automatically as part of the deployment.

If you're doing this manually, place the file at the following path for each platform:

| Platform | Path |
| --- | --- |
| macOS | `~/Library/Application Support/com.voquill.desktop/enterprise.json` |
| Linux | `~/.config/com.voquill.desktop/enterprise.json` |
| Windows | `C:\Users\<User>\AppData\Roaming\com.voquill.desktop\enterprise.json` |

The file should contain:

```json
{
  "gatewayUrl": "https://your-gateway-url"
}
```

Replace `your-gateway-url` with the public URL of your deployed gateway service.

## 4. Create the First Admin

Open your admin portal URL in your browser. The first person to sign up becomes the organization admin. Use a strong password and save it somewhere safe — there is no password recovery for the initial admin account.

From here you can manage users, configure settings, and control how Voquill operates across your organization.
