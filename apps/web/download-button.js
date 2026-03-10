/**
 * Reusable download button that detects the user's platform and resolves
 * the latest release URL from GitHub.
 *
 * Usage:
 *   <a class="btn-primary download-button" href="/download">Download</a>
 *
 * The script upgrades every .download-button on the page.
 */
(function () {
  const RELEASES_API_URL =
    "https://api.github.com/repos/josiahsrc/voquill/releases";
  const RELEASE_TAG_PATTERN = /^desktop-v\d/;
  const LINUX_INSTALL_COMMAND =
    "curl -fsSL https://voquill.github.io/apt/install.sh | bash";

  const PLATFORM_META = {
    mac: { name: "macOS", icon: "assets/apple.svg" },
    windows: { name: "Windows", icon: "assets/windows.svg" },
    linux: { name: "Linux", icon: "assets/ubuntu.svg" },
  };

  const ASSET_KEY_MAPPINGS = [
    { match: (n) => /^Voquill[._](?!GPU).*\.AppImage$/i.test(n), keys: ["linux-x86_64", "linux-x86_64-appimage"] },
    { match: (n) => /^Voquill[._](?!GPU).*\.deb$/i.test(n), keys: ["linux-x86_64-deb"] },
    { match: (n) => /^Voquill[._](?!GPU).*\.rpm$/i.test(n), keys: ["linux-x86_64-rpm"] },
    { match: (n) => /\.app\.tar\.gz$/i.test(n), keys: ["darwin-universal"] },
    { match: (n) => /\.dmg$/i.test(n), keys: ["darwin-universal"] },
    { match: (n) => /darwin.*\.app\.tar\.gz$/i.test(n), keys: ["darwin-aarch64", "darwin-x86_64"] },
    { match: (n) => /^Voquill[._]Portable[._]Installer\.exe$/i.test(n), keys: ["windows-x86_64-portable"] },
    { match: (n) => /^Voquill[._](?!GPU).*\.msi$/i.test(n), keys: ["windows-x86_64", "windows-x86_64-msi"] },
    { match: (n) => /^Voquill[._](?!GPU).*setup.*\.exe$/i.test(n), keys: ["windows-x86_64-nsis"] },
  ];

  // ── Platform detection ──

  function detectPlatform() {
    var nav = window.navigator;
    var hint = nav.userAgentData ? (nav.userAgentData.platform || "") : "";
    var ua = [nav.userAgent || "", hint, nav.platform || ""].join(" ").toLowerCase();
    if (ua.includes("win")) return "windows";
    if (ua.includes("mac") || ua.includes("darwin")) return "mac";
    if (ua.includes("linux") && !ua.includes("android")) return "linux";
    return "mac";
  }

  function isMobileDevice() {
    var nav = window.navigator;
    var hint = nav.userAgentData ? (nav.userAgentData.platform || "") : "";
    var ua = [nav.userAgent || "", hint, nav.platform || ""].join(" ").toLowerCase();
    return /iphone|ipad|ipod|android/.test(ua);
  }

  async function detectMacManifestKey() {
    var nav = window.navigator;
    var ua = [nav.userAgent || "", nav.userAgentData ? (nav.userAgentData.platform || "") : "", nav.platform || ""].join(" ").toLowerCase();
    if (ua.includes("arm") || ua.includes("aarch") || ua.includes("apple silicon")) return "darwin-aarch64";

    if (nav.userAgentData && nav.userAgentData.getHighEntropyValues) {
      try {
        var data = await nav.userAgentData.getHighEntropyValues(["architecture"]);
        var arch = (data.architecture || "").toLowerCase();
        if (arch.includes("arm") || arch.includes("aarch")) return "darwin-aarch64";
        if (arch.includes("86") || arch.includes("amd")) return "darwin-x86_64";
      } catch (e) { /* ignore */ }
    }
    return undefined;
  }

  async function buildPlatformPreference(platform) {
    switch (platform) {
      case "mac": {
        var key = await detectMacManifestKey();
        if (key === "darwin-aarch64") return ["darwin-aarch64", "darwin-universal"];
        if (key === "darwin-x86_64") return ["darwin-x86_64", "darwin-universal"];
        return ["darwin-universal", "darwin-aarch64", "darwin-x86_64"];
      }
      case "windows":
        return ["windows-x86_64-portable", "windows-x86_64", "windows-x86_64-msi", "windows-x86_64-nsis"];
      case "linux":
        return ["linux-x86_64", "linux-x86_64-appimage", "linux-x86_64-deb", "linux-x86_64-rpm"];
      default:
        return [];
    }
  }

  // ── GitHub release fetching ──

  function resolveManifestKeys(asset) {
    var name = asset.name.toLowerCase();
    if (name.includes("gpu")) return undefined;
    for (var i = 0; i < ASSET_KEY_MAPPINGS.length; i++) {
      if (ASSET_KEY_MAPPINGS[i].match(name)) return ASSET_KEY_MAPPINGS[i].keys;
    }
    if (name.endsWith(".json")) return undefined;
    if (name.includes("darwin") || name.includes("mac")) return ["darwin-aarch64", "darwin-x86_64"];
    if (name.includes("windows") || name.includes("win")) return ["windows-x86_64"];
    if (name.includes("linux")) return ["linux-x86_64"];
    return undefined;
  }

  function transformGithubRelease(release) {
    var assets = release.assets || [];
    var platforms = {};
    for (var i = 0; i < assets.length; i++) {
      var keys = resolveManifestKeys(assets[i]);
      if (!keys) continue;
      for (var j = 0; j < keys.length; j++) {
        if (!platforms[keys[j]]) {
          platforms[keys[j]] = { url: assets[i].browser_download_url, signature: "" };
        }
      }
    }
    if (Object.keys(platforms).length === 0) return undefined;
    return { platforms: platforms };
  }

  async function fetchReleaseManifest(signal) {
    try {
      var response = await fetch(RELEASES_API_URL, {
        signal: signal,
        headers: { Accept: "application/vnd.github+json" },
      });
      if (!response.ok) return undefined;
      var allReleases = await response.json();
      var releases = allReleases.filter(function (r) {
        return r.tag_name && RELEASE_TAG_PATTERN.test(r.tag_name);
      });
      var latest = releases[0];
      if (!latest) return undefined;
      var manifest = transformGithubRelease(latest);
      if (!manifest) return undefined;
      var fallback = releases[1];
      if (fallback) {
        var fallbackManifest = transformGithubRelease(fallback);
        if (fallbackManifest) {
          for (var key in fallbackManifest.platforms) {
            if (!manifest.platforms[key]) manifest.platforms[key] = fallbackManifest.platforms[key];
          }
        }
      }
      return manifest;
    } catch (e) {
      return undefined;
    }
  }

  async function selectPlatformUrl(manifest, platform) {
    var pref = await buildPlatformPreference(platform);
    for (var i = 0; i < pref.length; i++) {
      var entry = manifest.platforms[pref[i]];
      if (entry && entry.url) return entry.url;
    }
    return undefined;
  }

  // ── Linux install dialog ──

  function showLinuxDialog() {
    if (document.getElementById("linux-install-dialog")) return;

    var overlay = document.createElement("div");
    overlay.id = "linux-install-dialog";
    overlay.className = "dialog-overlay";

    var dialog = document.createElement("div");
    dialog.className = "dialog";
    dialog.setAttribute("role", "dialog");
    dialog.setAttribute("aria-label", "Install Voquill on Linux");

    dialog.innerHTML =
      '<h2 class="dialog-title">Install Voquill on Linux</h2>' +
      '<p class="dialog-description">Run this command in your terminal to install Voquill via APT:</p>' +
      '<div class="linux-code-block"><code>' + LINUX_INSTALL_COMMAND + '</code>' +
      '<button type="button" class="linux-copy-btn">Copy</button></div>' +
      '<p class="dialog-hint">Supports Debian, Ubuntu, and other APT-based distributions. After installing, upgrade anytime with:</p>' +
      '<div class="linux-code-block"><code>sudo apt-get update && sudo apt-get upgrade voquill-desktop</code></div>' +
      '<p class="dialog-hint">Looking for other options? Visit the <a href="/download" class="inline-link">downloads page</a> for AppImage and other downloads.</p>' +
      '<button type="button" class="btn-ghost dialog-close-btn">Close</button>';

    overlay.appendChild(dialog);
    document.body.appendChild(overlay);

    var copyBtn = dialog.querySelector(".linux-copy-btn");
    copyBtn.addEventListener("click", function () {
      navigator.clipboard.writeText(LINUX_INSTALL_COMMAND);
      copyBtn.textContent = "Copied!";
      setTimeout(function () { copyBtn.textContent = "Copy"; }, 2000);
    });

    function close() { overlay.remove(); }
    overlay.addEventListener("click", function (e) { if (e.target === overlay) close(); });
    dialog.querySelector(".dialog-close-btn").addEventListener("click", close);
  }

  // ── Upgrade buttons ──

  async function upgradeButton(el) {
    var mobile = isMobileDevice();
    var platform = detectPlatform();
    var meta = PLATFORM_META[platform];

    // Set platform icon
    var iconSpan = el.querySelector(".download-button-icon");
    if (!iconSpan) {
      iconSpan = document.createElement("span");
      iconSpan.className = "download-button-icon";
      iconSpan.setAttribute("aria-hidden", "true");
      el.prepend(iconSpan);
    }
    iconSpan.style.maskImage = "url(" + meta.icon + ")";
    iconSpan.style.webkitMaskImage = "url(" + meta.icon + ")";

    if (mobile) {
      el.removeAttribute("href");
      el.setAttribute("disabled", "");
      el.classList.add("btn-disabled");
      el.textContent = "iOS/Android coming soon";
      return;
    }

    // Set label
    var label = el.querySelector(".download-button-label");
    if (!label) {
      var text = el.textContent.trim();
      el.textContent = "";
      el.appendChild(iconSpan);
      label = document.createElement("span");
      label.className = "download-button-label";
      label.textContent = text;
      el.appendChild(label);
    }

    if (platform === "linux") {
      el.addEventListener("click", function (e) {
        e.preventDefault();
        showLinuxDialog();
      });
      return;
    }

    // Resolve download URL from GitHub
    try {
      var manifest = await fetchReleaseManifest();
      if (!manifest) return;
      var url = await selectPlatformUrl(manifest, platform);
      if (url) el.href = url;
    } catch (e) {
      // keep default href
    }
  }

  // ── Init ──

  document.addEventListener("DOMContentLoaded", function () {
    var buttons = document.querySelectorAll(".download-button");
    buttons.forEach(function (btn) { upgradeButton(btn); });
  });
})();
