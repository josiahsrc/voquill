/**
 * Populates the apps carousel rows with icon cards from Simple Icons CDN.
 * Duplicates each set for seamless infinite scroll.
 */
(function () {
  var topRowApps = [
    { name: "Chromatic", slug: "chromatic" },
    { name: "Discord", slug: "discord" },
    { name: "Notion", slug: "notion" },
    { name: "Google Docs", slug: "googledocs" },
    { name: "Obsidian", slug: "obsidian" },
    { name: "WhatsApp", slug: "whatsapp" },
    { name: "Telegram", slug: "telegram" },
    { name: "Signal", slug: "signal" },
    { name: "Linear", slug: "linear" },
    { name: "Figma", slug: "figma" },
    { name: "Trello", slug: "trello" },
    { name: "Asana", slug: "asana" },
    { name: "Jira", slug: "jira" },
    { name: "Todoist", slug: "todoist" },
    { name: "Evernote", slug: "evernote" },
  ];

  var bottomRowApps = [
    { name: "GitHub", slug: "github" },
    { name: "GitLab", slug: "gitlab" },
    { name: "Chrome", slug: "googlechrome" },
    { name: "Firefox", slug: "firefox" },
    { name: "Safari", slug: "safari" },
    { name: "Gmail", slug: "gmail" },
    { name: "YouTube", slug: "youtube" },
    { name: "Spotify", slug: "spotify" },
    { name: "Zoom", slug: "zoom" },
    { name: "Sketch", slug: "sketch" },
    { name: "Dribbble", slug: "dribbble" },
    { name: "Dropbox", slug: "dropbox" },
    { name: "Google Drive", slug: "googledrive" },
    { name: "iCloud", slug: "icloud" },
    { name: "WhatsApp", slug: "whatsapp" },
  ];

  function buildCards(apps) {
    var fragment = document.createDocumentFragment();
    // Duplicate for seamless loop
    var all = apps.concat(apps);
    all.forEach(function (app) {
      var card = document.createElement("div");
      card.className = "apps-icon-card";
      var img = document.createElement("img");
      img.src = "https://cdn.simpleicons.org/" + app.slug;
      img.alt = app.name;
      img.width = 32;
      img.height = 32;
      img.className = "apps-icon-image";
      img.loading = "lazy";
      img.decoding = "async";
      card.appendChild(img);
      fragment.appendChild(card);
    });
    return fragment;
  }

  document.addEventListener("DOMContentLoaded", function () {
    var topRow = document.querySelector(".apps-carousel-top .apps-row");
    var bottomRow = document.querySelector(".apps-carousel-bottom .apps-row");
    if (topRow) topRow.appendChild(buildCards(topRowApps));
    if (bottomRow) bottomRow.appendChild(buildCards(bottomRowApps));
  });
})();
