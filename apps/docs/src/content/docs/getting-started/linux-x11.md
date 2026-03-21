---
title: Linux (X11)
description: Install Voquill on Linux with X11.
---

This guide is for Linux desktops running an X11 session. If you are using Wayland, see [Linux (Wayland)](/getting-started/linux-wayland) instead.

To check which display server you are using:

```bash
echo $XDG_SESSION_TYPE
```

## Installation

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
