# Privacy Policy

_Last updated: February 24, 2026_

This Privacy Policy explains how **Handaptive LLC** ("we," "us," or "our") collects, uses, and protects your information when you use the Voquill application, website, and related services (collectively, the "Service"). Voquill is designed with privacy in mind — your voice data is never retained, and your transcriptions stay on your device.

## 1. Information We Collect

### Account Information

If you create a Voquill account (required for cloud mode, optional otherwise), we collect:

- **Email address** (via email/password sign-up or Google OAuth)
- **Display name** (from Google OAuth, or as you provide it)
- **Optional profile information** you choose to provide, such as your name, bio, company, and job title

No account is required to use Voquill in local or API key mode.

### Voice and Audio Data

**We never retain your voice data.** How audio is handled depends on the mode you choose:

- **Local mode:** Audio is processed entirely on your device. No audio data ever leaves your device.
- **Cloud mode:** Audio is transmitted to our servers, processed by a third-party speech-to-text service (Groq) to produce a text transcription, and immediately discarded. We do not store audio recordings.
- **API key mode:** Audio is sent directly from your device to the third-party provider you configure. We never see or handle this data.
- **Enterprise mode:** Audio is routed through your organization's self-hosted server. Refer to your organization's privacy policy.

### Transcriptions

Your transcription text and history are stored **locally on your device only**. We do not store transcription content on our servers, even in cloud mode.

Voquill also offers an **incognito mode** that prevents transcriptions from being saved even locally.

### Usage Data and Analytics

We use Mixpanel to collect anonymous product analytics to help us improve Voquill. This includes:

- Page views and navigation within the app
- Feature usage (e.g., activating dictation, completing onboarding)
- Subscription plan status
- General device information (platform, locale)

Analytics are **disabled entirely for enterprise deployments**.

We do not use analytics data to track the content of your transcriptions or voice recordings.

### Payment Information

We do not directly collect or store payment card details. Payments are processed by:

- **Stripe** for desktop and web subscriptions
- **Apple App Store** (via RevenueCat) for mobile subscriptions

We receive limited billing information from these processors, such as your subscription status and Stripe customer ID, to manage your account.

### Locally Stored Data

The desktop application stores the following on your device in a local database:

- User profile and preferences
- Transcription history and associated audio files
- Custom dictionary terms and writing tones
- API keys (encrypted at rest)
- Hotkey configurations

This data does not leave your device unless you use cloud sync features.

## 2. How We Use Your Information

We use the information we collect to:

- Provide, maintain, and improve the Service
- Process transcriptions in cloud mode
- Manage your account and subscription
- Enforce usage limits for cloud features
- Send transactional emails (e.g., account verification)
- Analyze aggregate usage patterns to improve the product
- Respond to support requests

## 3. Information Sharing

We do not sell your personal information. We share information only in these limited circumstances:

- **Third-party service providers** that help us operate the Service (see Section 5), solely to perform services on our behalf.
- **When required by law**, such as in response to a subpoena, court order, or other legal process.
- **To protect rights and safety**, when we believe disclosure is necessary to protect our rights, your safety, or the safety of others.
- **Business transfers**, in connection with a merger, acquisition, or sale of assets, in which case your information may be transferred as part of the transaction.

We never share the content of your transcriptions or voice recordings because we do not have them.

## 4. Data Storage and Security

- **Cloud data** (account profiles, subscription information, dictionary terms, and writing tones) is stored in Google Firebase, which uses industry-standard security practices.
- **Local data** is stored in an SQLite database on your device. API keys are encrypted at rest.
- **Enterprise data** is stored on your organization's self-hosted infrastructure.

We implement reasonable security measures to protect your information, but no method of transmission or storage is 100% secure.

## 5. Third-Party Services

Depending on your configuration, the Service may interact with the following third-party services:

| Service | Purpose |
|---|---|
| Google Firebase | Account authentication, cloud data storage |
| Groq | Cloud speech-to-text transcription and text processing |
| Stripe | Payment processing (desktop/web) |
| RevenueCat / Apple | Payment processing (mobile) |
| Mixpanel | Product analytics |
| Loops | Transactional email |
| HuggingFace | Downloading speech-to-text models for local use |

When you use **API key mode**, your data is sent directly to whichever third-party provider you configure (e.g., OpenAI, Anthropic, Google, Deepseek, OpenRouter, Azure). These interactions are governed by those providers' privacy policies, not ours.

## 6. Data Retention

- **Voice/audio data:** Never retained. Processed transiently in cloud mode and immediately discarded.
- **Transcriptions:** Stored locally on your device indefinitely until you delete them or delete your account.
- **Account data:** Retained while your account is active. When you delete your account, we delete your profile, subscription records, and associated data from our servers.
- **Analytics data:** Retained in accordance with Mixpanel's data retention policies.

## 7. Your Rights and Choices

You have the following rights regarding your data:

- **Access and export:** Your transcription data is stored locally on your device and is accessible to you at any time.
- **Deletion:** You can delete your account through the application settings, which removes your data from our servers and clears your local data. You can also delete individual transcriptions at any time.
- **Opt out of analytics:** Enterprise deployments have analytics disabled by default.
- **Incognito mode:** You can enable incognito mode to prevent transcriptions from being stored, even locally.
- **Local-only use:** You can use Voquill entirely offline in local mode, with no data leaving your device.

If you have additional requests regarding your data, contact us at [privacy@voquill.com](mailto:privacy@voquill.com).

## 8. Children's Privacy

Voquill is not intended for children under 13. We do not knowingly collect personal information from children under 13. If we learn that we have collected information from a child under 13, we will take steps to delete it promptly. If you believe a child under 13 has provided us with personal information, please contact us at [privacy@voquill.com](mailto:privacy@voquill.com).

## 9. International Data Transfers

If you are located outside the United States, your information may be transferred to and processed in the United States, where our servers and service providers are located. By using the Service, you consent to this transfer.

## 10. Changes to This Policy

We may update this Privacy Policy from time to time. When we make material changes, we will update the "Last updated" date and may notify you through the application or by other means. Your continued use of the Service after changes are posted constitutes acceptance of the revised policy.

## 11. Contact Us

For questions about this Privacy Policy or Voquill's privacy practices, you can:

- Open an issue on our [GitHub repository](https://github.com/HandaptiveTouch/voquill)
- Contact us at [privacy@voquill.com](mailto:privacy@voquill.com)
