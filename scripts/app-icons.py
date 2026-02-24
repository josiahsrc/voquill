"""
Fetch iOS app icons from Apple's iTunes Search API and RSS feeds.
Returns app name, bundle ID, and icon URLs.
"""

import json
import os
import re
import urllib.parse
import urllib.request
from pathlib import Path
from typing import Optional

ICONS_DIR = Path(__file__).parent / "icons"


def search_apps(term: str, limit: int = 50) -> list[dict]:
    """Search the iTunes API for apps matching a term."""
    encoded_term = urllib.parse.quote(term)
    url = f"https://itunes.apple.com/search?term={encoded_term}&entity=software&limit={limit}&country=us"
    with urllib.request.urlopen(url) as resp:
        data = json.loads(resp.read())
    return [
        {
            "name": r["trackName"],
            "bundle_id": r["bundleId"],
            "icon_60": r.get("artworkUrl60", ""),
            "icon_100": r.get("artworkUrl100", ""),
            "icon_512": r.get("artworkUrl512", ""),
            "icon_1024": r.get("artworkUrl512", "").replace("512x512", "1024x1024"),
        }
        for r in data.get("results", [])
    ]


def top_free_apps(limit: int = 50, country: str = "us") -> list[dict]:
    """Fetch top free apps from Apple's RSS feed."""
    url = f"https://rss.applemarketingtools.com/api/v2/{country}/apps/top-free/{limit}/apps.json"
    with urllib.request.urlopen(url) as resp:
        data = json.loads(resp.read())
    return [
        {
            "name": app["name"],
            "id": app["id"],
            "icon": app.get("artworkUrl100", ""),
            "url": app.get("url", ""),
        }
        for app in data.get("feed", {}).get("results", [])
    ]


def top_paid_apps(limit: int = 50, country: str = "us") -> list[dict]:
    """Fetch top paid apps from Apple's RSS feed."""
    url = f"https://rss.applemarketingtools.com/api/v2/{country}/apps/top-paid/{limit}/apps.json"
    with urllib.request.urlopen(url) as resp:
        data = json.loads(resp.read())
    return [
        {
            "name": app["name"],
            "id": app["id"],
            "icon": app.get("artworkUrl100", ""),
            "url": app.get("url", ""),
        }
        for app in data.get("feed", {}).get("results", [])
    ]


def lookup_by_bundle_id(bundle_id: str) -> Optional[dict]:
    """Look up a specific app by bundle ID."""
    url = f"https://itunes.apple.com/lookup?bundleId={bundle_id}"
    with urllib.request.urlopen(url) as resp:
        data = json.loads(resp.read())
    results = data.get("results", [])
    if not results:
        return None
    r = results[0]
    return {
        "name": r["trackName"],
        "bundle_id": r["bundleId"],
        "icon_60": r.get("artworkUrl60", ""),
        "icon_100": r.get("artworkUrl100", ""),
        "icon_512": r.get("artworkUrl512", ""),
        "icon_1024": r.get("artworkUrl512", "").replace("512x512", "1024x1024"),
    }


def _sanitize_filename(name: str) -> str:
    return re.sub(r"[^\w\-.]", "_", name).strip("_")


def _resize_icon_url(url: str, size: int) -> str:
    """Rewrite an Apple CDN icon URL to request a specific pixel size."""
    return re.sub(r"\d+x\d+(bb|bb\.)", f"{size}x{size}\\1", url)


def download_icon(icon_url: str, name: str, size: int = 512) -> Path:
    """Download an icon and save it to the icons directory."""
    ICONS_DIR.mkdir(exist_ok=True)
    resized_url = _resize_icon_url(icon_url, size)
    ext = os.path.splitext(urllib.parse.urlparse(resized_url).path)[1] or ".png"
    filename = f"{_sanitize_filename(name)}_{size}{ext}"
    dest = ICONS_DIR / filename
    urllib.request.urlretrieve(resized_url, dest)
    return dest


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description="Fetch iOS app icons")
    parser.add_argument("--search", type=str, help="Search term")
    parser.add_argument("--bundle-id", type=str, help="Look up by bundle ID")
    parser.add_argument("--top-free", action="store_true", help="Fetch top free apps")
    parser.add_argument("--limit", type=int, default=20)
    parser.add_argument("--size", type=int, default=512, help="Icon size in pixels")
    args = parser.parse_args()

    if not any([args.search, args.bundle_id, args.top_free]):
        parser.print_help()
        raise SystemExit(1)

    apps_to_download: list[tuple[str, str]] = []

    if args.top_free:
        for app in top_free_apps(limit=args.limit):
            apps_to_download.append((app["name"], app["icon"]))

    if args.search:
        for app in search_apps(args.search, limit=args.limit):
            apps_to_download.append((app["name"], app["icon_512"]))

    if args.bundle_id:
        app = lookup_by_bundle_id(args.bundle_id)
        if app:
            apps_to_download.append((app["name"], app["icon_512"]))
        else:
            print(f"No app found for bundle ID: {args.bundle_id}")

    for name, url in apps_to_download:
        if not url:
            print(f"  Skipped {name} (no icon URL)")
            continue
        dest = download_icon(url, name, args.size)
        print(f"  {name} -> {dest}")