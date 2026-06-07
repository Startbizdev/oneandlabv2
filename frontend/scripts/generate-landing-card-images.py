#!/usr/bin/env python3
"""Generate landing card illustrations with Cary primary #1CC7B5."""
from __future__ import annotations

import math
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageFont

W, H = 800, 600
PRIMARY = (28, 199, 181)
PRIMARY_DARK = (20, 158, 144)
PRIMARY_LIGHT = (232, 251, 249)
BG = (244, 250, 250)
WHITE = (255, 255, 255)
INK = (10, 10, 15)
MUTED = (61, 61, 82)
OUT = Path(__file__).resolve().parents[1] / "public" / "images" / "landing"


def lerp(a: int, b: int, t: float) -> int:
    return int(a + (b - a) * t)


def vertical_gradient(size: tuple[int, int], top: tuple[int, int, int], bottom: tuple[int, int, int]) -> Image.Image:
    img = Image.new("RGB", size)
    px = img.load()
    for y in range(size[1]):
        t = y / max(size[1] - 1, 1)
        row = (
            lerp(top[0], bottom[0], t),
            lerp(top[1], bottom[1], t),
            lerp(top[2], bottom[2], t),
        )
        for x in range(size[0]):
            px[x, y] = row
    return img


def radial_glow(base: Image.Image, cx: int, cy: int, radius: int, color: tuple[int, int, int], alpha: int = 90) -> Image.Image:
    glow = Image.new("RGBA", base.size, (0, 0, 0, 0))
    d = ImageDraw.Draw(glow)
    for r in range(radius, 0, -8):
        a = int(alpha * (1 - r / radius) ** 1.6)
        d.ellipse((cx - r, cy - r, cx + r, cy + r), fill=(*color, max(a, 0)))
    return Image.alpha_composite(base.convert("RGBA"), glow)


def rounded_rect(draw: ImageDraw.ImageDraw, xy: tuple, radius: int, fill, outline=None, width: int = 1):
    draw.rounded_rectangle(xy, radius=radius, fill=fill, outline=outline, width=width)


def draw_phone_confirmation(img: Image.Image) -> None:
    draw = ImageDraw.Draw(img)
    rounded_rect(draw, (0, 0, W, H), 0, BG)

    # soft blobs
    overlay = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    od = ImageDraw.Draw(overlay)
    od.ellipse((520, -80, 920, 320), fill=(*PRIMARY_LIGHT, 180))
    od.ellipse((-120, 380, 280, 680), fill=(*PRIMARY, 35))
    img.paste(Image.alpha_composite(img.convert("RGBA"), overlay).convert("RGB"))

    # professional silhouette left
    draw.ellipse((72, 118, 248, 294), fill=(210, 228, 226))
    draw.rounded_rectangle((118, 268, 202, 430), radius=36, fill=WHITE)
    draw.rounded_rectangle((128, 278, 192, 360), radius=20, fill=PRIMARY_LIGHT)
    draw.ellipse((142, 300, 178, 336), fill=PRIMARY)
    draw.ellipse((152, 308, 168, 324), fill=WHITE)

    # phone
    px, py, pw, ph = 380, 110, 250, 430
    rounded_rect(draw, (px, py, px + pw, py + ph), 36, (32, 36, 48))
    rounded_rect(draw, (px + 14, py + 48, px + pw - 14, py + ph - 28), 24, WHITE)

    # app header
    rounded_rect(draw, (px + 28, py + 68, px + pw - 28, py + 118), 16, PRIMARY)
    draw.ellipse((px + 44, py + 86, px + 64, py + 106), fill=WHITE)
    draw.rounded_rectangle((px + 76, py + 90, px + 170, py + 102), radius=6, fill=(255, 255, 255, 160))

    # check card
    rounded_rect(draw, (px + 28, py + 138, px + pw - 28, py + 248), 20, PRIMARY_LIGHT, PRIMARY, 2)
    draw.ellipse((px + 48, py + 168, px + 108, py + 228), fill=PRIMARY)
    draw.line((px + 62, py + 198, px + 78, py + 214, px + 96, py + 178), fill=WHITE, width=8, joint="curve")
    draw.rounded_rectangle((px + 124, py + 168, px + pw - 48, py + 188), radius=6, fill=PRIMARY)
    draw.rounded_rectangle((px + 124, py + 202, px + pw - 72, py + 218), radius=6, fill=(180, 220, 215))

    # SMS + email chips
    for i, (icon_color, label_w) in enumerate([(PRIMARY, 120), ((22, 163, 74), 100)]):
        yy = py + 268 + i * 72
        rounded_rect(draw, (px + 28, yy, px + pw - 28, yy + 56), 14, WHITE, (232, 236, 240), 1)
        draw.ellipse((px + 44, yy + 12, px + 84, yy + 44), fill=icon_color)
        draw.rounded_rectangle((px + 98, yy + 20, px + 98 + label_w, yy + 36), radius=6, fill=(220, 228, 227))

    # notification badge
    draw.ellipse((px + pw - 42, py + 24, px + pw - 8, py + 58), fill=(220, 38, 38))
    draw.text((px + pw - 30, py + 30), "1", fill=WHITE)

    # connection pulse
    pulse = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    pd = ImageDraw.Draw(pulse)
    for r in (90, 120, 150):
        pd.arc((300, 200, 300 + r * 2, 200 + r * 2), 300, 40, fill=(*PRIMARY, 40), width=3)
    img.paste(Image.alpha_composite(img.convert("RGBA"), pulse).convert("RGB"))


def draw_home_care(img: Image.Image) -> None:
    draw = ImageDraw.Draw(img)
    rounded_rect(draw, (0, 0, W, H), 0, (248, 252, 252))

    overlay = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    od = ImageDraw.Draw(overlay)
    od.rectangle((0, 340, W, H), fill=(235, 245, 244))
    od.ellipse((600, 40, 860, 300), fill=(*PRIMARY, 25))
    img.paste(Image.alpha_composite(img.convert("RGBA"), overlay).convert("RGB"))

    # window
    rounded_rect(draw, (48, 48, 280, 220), 12, (220, 235, 234))
    for x in range(68, 260, 56):
        draw.line((x, 58, x, 210), fill=WHITE, width=4)
    draw.line((58, 130, 270, 130), fill=WHITE, width=4)

    # sofa
    rounded_rect(draw, (80, 320, 420, 460), 28, (230, 236, 238))
    rounded_rect(draw, (100, 300, 400, 380), 24, (210, 220, 222))
    rounded_rect(draw, (420, 350, 520, 430), 20, PRIMARY_LIGHT)

    # patient
    draw.ellipse((160, 250, 260, 350), fill=(220, 210, 200))
    draw.rounded_rectangle((150, 330, 270, 420), radius=30, fill=(200, 230, 225))
    draw.arc((190, 280, 230, 310), 0, 180, fill=INK, width=3)

    # nurse
    draw.ellipse((430, 200, 530, 300), fill=(195, 170, 155))
    draw.rounded_rectangle((400, 290, 560, 480), radius=34, fill=WHITE)
    draw.rounded_rectangle((400, 290, 560, 360), radius=20, fill=PRIMARY)
    draw.line((470, 360, 470, 480), fill=PRIMARY_DARK, width=28)
    draw.line((510, 360, 510, 480), fill=PRIMARY_DARK, width=28)

    # medical bag
    rounded_rect(draw, (560, 360, 660, 460), 18, PRIMARY_DARK)
    draw.rectangle((595, 340, 625, 370), fill=PRIMARY_DARK)
    draw.ellipse((580, 390, 610, 420), fill=WHITE)
    draw.rectangle((615, 400, 645, 430), fill=WHITE)

    # BP cuff on arm
    draw.arc((250, 355, 340, 395), 0, 180, fill=PRIMARY, width=14)
    draw.ellipse((330, 368, 350, 388), fill=PRIMARY_DARK)

    # stethoscope hint
    draw.arc((500, 310, 560, 370), 200, 340, fill=INK, width=4)
    draw.ellipse((548, 352, 568, 372), fill=PRIMARY)

    # teal accents plants
    draw.ellipse((680, 400, 740, 500), fill=(120, 180, 160))
    draw.rectangle((708, 480, 712, 540), fill=(90, 130, 110))
    rounded_rect(draw, (620, 500, 700, 540), 8, PRIMARY)


def draw_platform_network(img: Image.Image) -> None:
    base = vertical_gradient((W, H), (232, 251, 249), (244, 250, 250))
    img.paste(base)
    img = radial_glow(img, 400, 280, 320, PRIMARY, 70)
    draw = ImageDraw.Draw(img)

    nodes = [
        (200, 200, "i-lucide-syringe", "Infirmiers", PRIMARY),
        (600, 200, "lab", "Laboratoires", (22, 120, 168)),
        (200, 400, "patient", "Patients", (16, 163, 74)),
        (600, 400, "pro", "Médecins", (99, 102, 241)),
    ]
    center = (400, 300)

    # links
    for nx, ny, _, _, color in nodes:
        steps = 24
        for s in range(steps):
            t = s / steps
            x = int(center[0] + (nx - center[0]) * t)
            y = int(center[1] + (ny - center[1]) * t)
            r = 4 - int(2 * abs(t - 0.5))
            if r > 0:
                draw.ellipse((x - r, y - r, x + r, y + r), fill=(*PRIMARY, 120) if isinstance(color, tuple) else PRIMARY)

    for nx, ny, kind, label, color in nodes:
        draw.ellipse((nx - 58, ny - 58, nx + 58, ny + 58), fill=WHITE, outline=color if isinstance(color, tuple) else PRIMARY, width=4)
        draw.ellipse((nx - 40, ny - 40, nx + 40, ny + 40), fill=PRIMARY_LIGHT if kind != "lab" else (225, 240, 248))
        # simple icons
        if kind == "i-lucide-syringe" or kind == "lab":
            draw.rectangle((nx - 6, ny - 28, nx + 6, ny + 20), fill=color if isinstance(color, tuple) else PRIMARY)
            draw.polygon([(nx - 10, ny - 28), (nx + 10, ny - 28), (nx, ny - 38)], fill=color if isinstance(color, tuple) else PRIMARY)
        elif kind == "patient":
            draw.ellipse((nx - 14, ny - 22, nx + 14, ny + 6), fill=(16, 163, 74))
            draw.arc((nx - 22, ny + 4, nx + 22, ny + 36), 0, 180, fill=(16, 163, 74), width=8)
        else:
            draw.ellipse((nx - 18, ny - 10, nx + 18, ny + 24), fill=(99, 102, 241))
            draw.line((nx - 24, ny + 8, nx + 24, ny + 8), fill=(99, 102, 241), width=6)

    # center hub
    draw.ellipse((center[0] - 72, center[1] - 72, center[0] + 72, center[1] + 72), fill=PRIMARY)
    draw.ellipse((center[0] - 48, center[1] - 48, center[0] + 48, center[1] + 48), fill=WHITE)
    # C monogram
    draw.arc((center[0] - 26, center[1] - 26, center[0] + 26, center[1] + 26), 45, 320, fill=PRIMARY, width=10)

    # decorative grid dots
    for gx in range(40, W, 48):
        for gy in range(40, H, 48):
            draw.ellipse((gx, gy, gx + 2, gy + 2), fill=(28, 199, 181, 40))


def save_jpg(img: Image.Image, path: Path, quality: int = 92) -> None:
    rgb = img.convert("RGB")
    rgb.save(path, "JPEG", quality=quality, optimize=True)


def save_png(img: Image.Image, path: Path) -> None:
    rgb = img.convert("RGB")
    rgb.save(path, "PNG", optimize=True)


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)

    conf = Image.new("RGB", (W, H), BG)
    draw_phone_confirmation(conf)
    save_jpg(conf, OUT / "landing-process-confirmation.jpg")

    home = Image.new("RGB", (W, H), BG)
    draw_home_care(home)
    save_png(home, OUT / "landing-process-home-care.png")

    plat = Image.new("RGB", (W, H), BG)
    draw_platform_network(plat)
    save_jpg(plat, OUT / "landing-platform-network.jpg")

    print("Wrote:", OUT / "landing-process-confirmation.jpg")
    print("Wrote:", OUT / "landing-process-home-care.png")
    print("Wrote:", OUT / "landing-platform-network.jpg")


if __name__ == "__main__":
    main()
