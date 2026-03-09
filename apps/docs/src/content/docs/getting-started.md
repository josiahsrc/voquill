---
title: Getting Started
description: Get up and running with Voquill.
---

## Installation

Download the latest release for your platform from [voquill.com/download](https://voquill.com/download).

### MacOS

1. Open the downloaded `.dmg` file.
2. Drag the Voquill icon into the Applications folder.
3. Eject the disk image.
4. Open Voquill from your Applications folder. On first launch, macOS may ask you to confirm since the app was downloaded from the internet — click **Open**.

### Windows

1. Run the downloaded `.exe` installer.
2. Follow the on-screen prompts to complete the installation.
3. Voquill will be available from the Start menu.

### Linux (Debian/Ubuntu)

There are multiple Linux installation options available on the [voquill.com/download](https://voquill.com/download) page. The easiest is via the APT package for automatic updates:

```bash
curl -fsSL https://voquill.github.io/apt/install.sh | bash
```

Or set up the repository manually:

```bash
# Add GPG key
curl -fsSL https://voquill.github.io/apt/gpg-key.asc \
  | sudo gpg --dearmor -o /usr/share/keyrings/voquill.gpg

# Add repository
echo "deb [signed-by=/usr/share/keyrings/voquill.gpg arch=amd64] https://voquill.github.io/apt stable main" \
  | sudo tee /etc/apt/sources.list.d/voquill.list

# Install
sudo apt-get update
sudo apt-get install voquill-desktop
```

To install the development channel instead:

```bash
curl -fsSL https://voquill.github.io/apt/install.sh | bash -s -- --dev
```

Upgrade with:

```bash
sudo apt-get update && sudo apt-get upgrade voquill-desktop
```

## First Launch

1. Open Voquill after installation.
2. Choose your transcription mode: **Local**, **API**, or **Cloud**.
3. If using local mode, Voquill will download a Whisper model on first use.

## Transcription Modes

| Mode  | Description                                           |
| ----- | ----------------------------------------------------- |
| Local | On-device transcription using Whisper. Fully offline. |
| API   | Direct connection to Groq's Whisper API.              |
| Cloud | Transcription via Voquill's cloud service.            |

## Recording Your First Transcription

Press the global hotkey to start recording. Speak naturally, then press the hotkey again to stop. Your transcription will appear automatically.

## Next Steps

- Configure tones to adjust how your transcriptions are cleaned up.
- Add dictionary terms for domain-specific vocabulary.
- Explore keyboard shortcuts in the settings.
