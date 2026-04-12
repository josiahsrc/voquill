#!/usr/bin/env python3
"""Convert white backgrounds in JPEGs to transparency, preserving colors.

Reads lossless originals from ./images/ and writes transparent PNGs into the
script folder. Uses GIMP-style "color to alpha" with white as the target,
then applies a linear alpha floor to cleanly drop near-white background noise
while preserving smooth edge feathering — so the result composites correctly
over light and dark backgrounds without halos or grain.

Tuning:
    --floor (default 25): any pixel less "colorful" than this (min-channel
        within `floor` of 255) becomes fully transparent. Raise if background
        still looks grainy; lower if soft edges disappear too aggressively.

Run:
    .venv/bin/python3 scripts/image-modification/white_to_alpha.py
"""

from __future__ import annotations

import argparse
from pathlib import Path

import numpy as np
from PIL import Image

SCRIPT_DIR = Path(__file__).resolve().parent
INPUT_DIR = SCRIPT_DIR / "images"


def white_to_alpha(image: Image.Image, floor: float) -> Image.Image:
    rgb = np.asarray(image.convert("RGB"), dtype=np.float32)
    r, g, b = rgb[..., 0], rgb[..., 1], rgb[..., 2]

    min_channel = np.minimum(np.minimum(r, g), b)
    raw_alpha = 255.0 - min_channel

    denom = max(255.0 - floor, 1.0)
    alpha = np.clip((raw_alpha - floor) * 255.0 / denom, 0.0, 255.0)

    safe_alpha = np.where(alpha == 0, 1.0, alpha)
    unmixed = ((rgb - (255.0 - alpha[..., None])) / safe_alpha[..., None]) * 255.0
    unmixed = np.clip(unmixed, 0.0, 255.0)

    rgba = np.empty(rgb.shape[:2] + (4,), dtype=np.uint8)
    rgba[..., :3] = unmixed.astype(np.uint8)
    rgba[..., 3] = alpha.astype(np.uint8)

    return Image.fromarray(rgba)


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--floor", type=float, default=25.0)
    args = parser.parse_args()

    if not INPUT_DIR.is_dir():
        raise SystemExit(f"Input folder not found: {INPUT_DIR}")

    jpegs = sorted(
        p for p in INPUT_DIR.iterdir()
        if p.suffix.lower() in {".jpg", ".jpeg"}
    )
    if not jpegs:
        raise SystemExit(f"No JPEGs found in {INPUT_DIR}")

    for src in jpegs:
        dst = SCRIPT_DIR / (src.stem + ".png")
        with Image.open(src) as img:
            result = white_to_alpha(img, args.floor)
        result.save(dst, format="PNG", optimize=True)
        print(f"{src.name} -> {dst.name}")


if __name__ == "__main__":
    main()
