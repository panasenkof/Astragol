#!/usr/bin/env python3
"""Generate Nebula Arena PWA icons (cosmic orb on #04030d)."""

from __future__ import annotations

import math
import struct
import zlib
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "public"


def lerp(a: float, b: float, t: float) -> float:
    return a + (b - a) * t


def mix(c0: tuple[float, float, float], c1: tuple[float, float, float], t: float):
    return tuple(lerp(a, b, t) for a, b in zip(c0, c1))


def clamp(v: float, lo: float = 0.0, hi: float = 1.0) -> float:
    return lo if v < lo else hi if v > hi else v


def write_png(path: Path, width: int, height: int, rgba: bytes) -> None:
    def chunk(tag: bytes, data: bytes) -> bytes:
        crc = zlib.crc32(tag + data) & 0xFFFFFFFF
        return struct.pack(">I", len(data)) + tag + data + struct.pack(">I", crc)

    raw = bytearray()
    row = width * 4
    for y in range(height):
        raw.append(0)
        raw.extend(rgba[y * row : (y + 1) * row])
    ihdr = struct.pack(">IIBBBBB", width, height, 8, 6, 0, 0, 0)
    path.write_bytes(
        b"\x89PNG\r\n\x1a\n"
        + chunk(b"IHDR", ihdr)
        + chunk(b"IDAT", zlib.compress(bytes(raw), 9))
        + chunk(b"IEND", b"")
    )


def render(size: int, *, maskable: bool) -> bytes:
    bg = (0.0157, 0.0118, 0.051)  # #04030d
    # Maskable icons need ~20% padding so Android adaptive crop keeps the orb.
    radius = size * (0.31 if maskable else 0.38)
    cx = cy = (size - 1) / 2
    pixels = bytearray(size * size * 4)

    for y in range(size):
        for x in range(size):
            dx = x - cx
            dy = y - cy
            dist = math.hypot(dx, dy)
            nx = dx / radius
            ny = dy / radius
            r2 = nx * nx + ny * ny

            col = list(bg)
            alpha = 1.0

            # faint star flecks
            h = (math.sin(x * 12.9898 + y * 78.233) * 43758.5453) % 1.0
            if h > 0.992:
                tw = (h - 0.992) / 0.008
                col = list(mix(tuple(col), (0.7, 0.85, 1.0), tw * 0.7))

            # outer cyan glow
            glow = clamp((1.6 - dist / radius) / 1.6)
            glow = glow * glow
            col = list(mix(tuple(col), (0.22, 0.72, 1.0), glow * 0.22))

            # violet ring
            ring = abs(dist - radius * 1.22)
            ring_a = clamp(1.0 - ring / (size * 0.018))
            col = list(mix(tuple(col), (0.55, 0.4, 0.95), ring_a * 0.55))

            if r2 <= 1.15:
                edge = clamp((1.15 - r2) / 0.15)
                shade = clamp(1.0 - r2)
                # sphere lighting from top-left
                lx, ly, lz = -0.45, -0.55, 0.7
                ln = math.sqrt(lx * lx + ly * ly + lz * lz)
                lx, ly, lz = lx / ln, ly / ln, lz / ln
                nz = math.sqrt(max(0.0, 1.0 - min(r2, 1.0)))
                ndot = max(0.0, nx * lx + ny * ly + nz * lz) if r2 <= 1.0 else 0.0

                metal = mix((0.18, 0.22, 0.32), (0.92, 0.96, 1.0), ndot**0.65)
                metal = mix(metal, (0.35, 0.78, 1.0), 0.18 + 0.25 * ndot)
                spec = ndot**18
                metal = mix(metal, (1.0, 1.0, 1.0), spec * 0.85)

                # equatorial glint like the start-screen logo
                band = math.exp(-((ny - 0.08) ** 2) / 0.018) * (1.0 - abs(nx) * 0.3)
                metal = mix(metal, (1.0, 1.0, 1.0), band * 0.22 * shade)

                if r2 > 1.0:
                    col = list(mix(tuple(col), metal, edge * 0.9))
                else:
                    col = list(metal)

            # highlight blob
            hx, hy = nx + 0.32, ny + 0.38
            highlight = math.exp(-(hx * hx + hy * hy) / 0.06)
            col = list(mix(tuple(col), (1.0, 1.0, 1.0), highlight * 0.55))

            i = (y * size + x) * 4
            pixels[i] = int(clamp(col[0]) * 255)
            pixels[i + 1] = int(clamp(col[1]) * 255)
            pixels[i + 2] = int(clamp(col[2]) * 255)
            pixels[i + 3] = int(alpha * 255)

    return bytes(pixels)


def main() -> None:
    OUT.mkdir(exist_ok=True)
    jobs = [
        ("favicon-32.png", 32, False),
        ("apple-touch-icon.png", 180, False),
        ("pwa-192x192.png", 192, False),
        ("pwa-512x512.png", 512, False),
        ("pwa-512x512-maskable.png", 512, True),
    ]
    for name, size, maskable in jobs:
        path = OUT / name
        write_png(path, size, size, render(size, maskable=maskable))
        print(f"wrote {path.relative_to(ROOT)} ({path.stat().st_size} bytes)")


if __name__ == "__main__":
    main()
