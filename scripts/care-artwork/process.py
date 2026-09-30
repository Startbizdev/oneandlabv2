"""Détoure les illustrations 3D des soins générées sur fond magenta uni et les exporte pour le web et le mobile.

Usage : python scripts/care-artwork/process.py <dossier_source>
Chaque fichier source se nomme <clé>.png|jpg (clé = careArtworkKey, ex. injection.jpg).
Sorties :
  frontend/public/images/care/<clé>.webp   (256 px, alpha, qualité 82)
  apps/mobile/src/assets/care-art/<clé>.png (192 px, PNG palette avec alpha)
"""

from __future__ import annotations

import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageFilter

ROOT = Path(__file__).resolve().parents[2]
WEB_DIR = ROOT / "frontend" / "public" / "images" / "care"
MOBILE_DIR = ROOT / "apps" / "mobile" / "src" / "assets" / "care-art"
WEB_SIZE = 256
MOBILE_SIZE = 192
# Seuils de distance au fond calés sur le bruit du fond de chaque image (JPEG) : les rouges et roses,
# proches du magenta, doivent rester opaques.
NOISE_PERCENTILE = 99.7
ALPHA_MARGIN = 6.0
ALPHA_RAMP = 38.0
SHADOW_MIN_SCALE = 0.45
PADDING_RATIO = 0.06


def border_pixels(rgb: np.ndarray) -> np.ndarray:
    return np.concatenate([rgb[:12].reshape(-1, 3), rgb[-12:].reshape(-1, 3), rgb[:, :12].reshape(-1, 3), rgb[:, -12:].reshape(-1, 3)])


def key_out(image: Image.Image) -> Image.Image:
    rgb = np.asarray(image.convert("RGB"), dtype=np.float32)
    border = border_pixels(rgb)
    bg = np.median(border, axis=0)
    if not (bg[0] > 150 and bg[2] > 80 and bg[1] < 90):
        raise ValueError(f"fond non magenta détecté ({bg.round().tolist()})")
    alpha_low = float(np.percentile(np.linalg.norm(border - bg, axis=1), NOISE_PERCENTILE)) + ALPHA_MARGIN
    distance = np.linalg.norm(rgb - bg, axis=2)
    alpha = np.clip((distance - alpha_low) / ALPHA_RAMP, 0.0, 1.0)

    # Ombres portées dessinées par le générateur = fond assombri (même teinte) : rendues transparentes.
    # Les objets sombres (facteur d'assombrissement < SHADOW_MIN_SCALE) gardent le seuil ci-dessus.
    scale = (rgb @ bg) / float(bg @ bg)
    residual = np.linalg.norm(rgb - scale[..., None] * bg, axis=2)
    border_scale = (border @ bg) / float(bg @ bg)
    border_residual = np.linalg.norm(border - border_scale[..., None] * bg, axis=1)
    residual_low = float(np.percentile(border_residual, NOISE_PERCENTILE)) + ALPHA_MARGIN
    alpha_hue = np.clip((residual - residual_low) / ALPHA_RAMP, 0.0, 1.0)
    alpha = np.where(scale > SHADOW_MIN_SCALE, np.minimum(alpha, alpha_hue), alpha)

    # Retire la contribution du fond sur les bords semi-transparents.
    safe = np.maximum(alpha, 1e-3)[..., None]
    unmixed = (rgb - (1.0 - alpha[..., None]) * bg) / safe
    rgb = np.where(alpha[..., None] < 1.0, unmixed, rgb)

    # Reflet magenta résiduel (R et B au-dessus de G) atténué sans toucher aux rouges/bleus purs.
    spill = np.minimum(rgb[..., 0], rgb[..., 2]) - rgb[..., 1]
    spill = np.clip(spill, 0.0, None) * np.clip(1.2 - alpha, 0.0, 1.0)
    rgb[..., 0] -= spill * 0.6
    rgb[..., 2] -= spill * 0.6
    rgb = np.clip(rgb, 0, 255)

    alpha_img = Image.fromarray((alpha * 255).astype(np.uint8)).filter(ImageFilter.MedianFilter(3))
    out = Image.fromarray(rgb.astype(np.uint8), "RGB")
    out.putalpha(alpha_img)
    return out


def square_crop(image: Image.Image) -> Image.Image:
    bbox = image.getchannel("A").point(lambda a: 255 if a > 24 else 0).getbbox()
    if bbox is None:
        raise ValueError("aucun sujet détecté")
    cropped = image.crop(bbox)
    side = int(max(cropped.size) * (1 + 2 * PADDING_RATIO))
    canvas = Image.new("RGBA", (side, side), (0, 0, 0, 0))
    canvas.paste(cropped, ((side - cropped.width) // 2, (side - cropped.height) // 2), cropped)
    return canvas


def export(source: Path) -> tuple[int, int]:
    key = source.stem
    art = square_crop(key_out(Image.open(source)))
    web = art.resize((WEB_SIZE, WEB_SIZE), Image.LANCZOS)
    web_path = WEB_DIR / f"{key}.webp"
    web.save(web_path, "WEBP", quality=82, method=6)
    mobile = art.resize((MOBILE_SIZE, MOBILE_SIZE), Image.LANCZOS)
    mobile_path = MOBILE_DIR / f"{key}.png"
    mobile.quantize(colors=256, method=Image.Quantize.FASTOCTREE, dither=Image.Dither.FLOYDSTEINBERG).save(mobile_path, "PNG", optimize=True)
    return web_path.stat().st_size, mobile_path.stat().st_size


def main() -> int:
    if len(sys.argv) != 2:
        print(__doc__)
        return 1
    source_dir = Path(sys.argv[1])
    WEB_DIR.mkdir(parents=True, exist_ok=True)
    MOBILE_DIR.mkdir(parents=True, exist_ok=True)
    sources = sorted(p for p in source_dir.iterdir() if p.suffix.lower() in {".png", ".jpg", ".jpeg"})
    if not sources:
        print(f"Aucune image dans {source_dir}")
        return 1
    failures = 0
    for source in sources:
        try:
            web_bytes, mobile_bytes = export(source)
            print(f"{source.stem}: web {web_bytes // 1024} Ko, mobile {mobile_bytes // 1024} Ko")
        except ValueError as error:
            failures += 1
            print(f"{source.stem}: ÉCHEC {error}")
    return 1 if failures else 0


if __name__ == "__main__":
    sys.exit(main())
