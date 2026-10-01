"""Détoure les illustrations générées sur fond magenta uni et les exporte.

Usage :
  python scripts/care-artwork/process.py <dossier_source>                  # soins 3D (web + mobile)
  python scripts/care-artwork/process.py <dossier_source> --illustrations  # illustrations éditoriales mobile
  python scripts/care-artwork/process.py --repair                          # décontamine les bords des sorties existantes
Chaque fichier source se nomme <clé>.png|jpg.
Sorties soins (clé = careArtworkKey, ex. injection.jpg) :
  frontend/public/images/care/<clé>.webp    (256 px, alpha, qualité 82)
  apps/mobile/src/assets/care-art/<clé>.png (192 px, PNG palette avec alpha)
Sorties illustrations (clé = IllustrationKey de apps/mobile/src/constants/illustrations.ts) :
  apps/mobile/assets/illustrations/<clé>.png (600 px, PNG palette avec alpha)
"""

from __future__ import annotations

import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageFilter

ROOT = Path(__file__).resolve().parents[2]
WEB_DIR = ROOT / "frontend" / "public" / "images" / "care"
MOBILE_DIR = ROOT / "apps" / "mobile" / "src" / "assets" / "care-art"
ILLUSTRATION_DIR = ROOT / "apps" / "mobile" / "assets" / "illustrations"
WEB_SIZE = 256
MOBILE_SIZE = 192
ILLUSTRATION_SIZE = 600
# Seuils de distance au fond calés sur le bruit du fond de chaque image (JPEG) : les rouges et roses,
# proches du magenta, doivent rester opaques.
NOISE_PERCENTILE = 99.7
ALPHA_MARGIN = 6.0
ALPHA_RAMP = 38.0
SHADOW_MIN_SCALE = 0.45
PADDING_RATIO = 0.06
BORDER_BACKGROUND_MAX = 60.0
OPAQUE_ALPHA = 250.0
EDGE_TINT_MIN = 40.0
EDGE_FILL_STEPS = 12
EDGE_TINT_REACH = 2


def border_pixels(rgb: np.ndarray) -> np.ndarray:
    return np.concatenate([rgb[:12].reshape(-1, 3), rgb[-12:].reshape(-1, 3), rgb[:, :12].reshape(-1, 3), rgb[:, -12:].reshape(-1, 3)])


def key_out(image: Image.Image) -> Image.Image:
    rgb = np.asarray(image.convert("RGB"), dtype=np.float32)
    border = border_pixels(rgb)
    bg = np.median(border, axis=0)
    # Magenta (rendu souvent cramoisi, bleu ~70) ; vert pour les sujets rouges (sang), trop proches du cramoisi.
    green = bg[1] > 150 and bg[0] < 110 and bg[2] < 110
    if not green and not (bg[0] > 150 and bg[2] > 60 and bg[1] < 90):
        raise ValueError(f"fond ni magenta ni vert détecté ({bg.round().tolist()})")
    # Un sujet qui touche le bord fausserait l'estimation du bruit : seuls les pixels de fond comptent.
    border = border[np.linalg.norm(border - bg, axis=1) < BORDER_BACKGROUND_MAX]
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

    # Reflet résiduel du fond atténué sans toucher aux couleurs pures : magenta = R et B au-dessus de G,
    # vert = G au-dessus de R et B.
    if green:
        spill = rgb[..., 1] - np.maximum(rgb[..., 0], rgb[..., 2])
        spill = np.clip(spill, 0.0, None) * np.clip(1.2 - alpha, 0.0, 1.0)
        rgb[..., 1] -= spill * 0.6
    else:
        spill = np.minimum(rgb[..., 0], rgb[..., 2]) - rgb[..., 1]
        spill = np.clip(spill, 0.0, None) * np.clip(1.2 - alpha, 0.0, 1.0)
        rgb[..., 0] -= spill * 0.6
        rgb[..., 2] -= spill * 0.6
    rgb = np.clip(rgb, 0, 255)

    alpha_img = Image.fromarray((alpha * 255).astype(np.uint8)).filter(ImageFilter.MedianFilter(3))
    rgb = decontaminate_edges(rgb, np.asarray(alpha_img, dtype=np.float32), green)
    out = Image.fromarray(rgb.astype(np.uint8), "RGB")
    out.putalpha(alpha_img)
    return out


def background_tinted(rgb: np.ndarray, green: bool) -> np.ndarray:
    r, g, b = rgb[..., 0], rgb[..., 1], rgb[..., 2]
    if green:
        return g - np.maximum(r, b) > EDGE_TINT_MIN
    return (r - g > EDGE_TINT_MIN) & (b - g > EDGE_TINT_MIN * 0.6)


def neighbors_any(mask: np.ndarray) -> np.ndarray:
    out = np.zeros_like(mask)
    for dy in (-1, 0, 1):
        for dx in (-1, 0, 1):
            out |= np.roll(np.roll(mask, dy, axis=0), dx, axis=1)
    return out


def decontaminate_edges(rgb: np.ndarray, alpha: np.ndarray, green: bool) -> np.ndarray:
    """Bords semi-transparents encore teintés par le fond (le filtre médian de l'alpha et le tramage
    de la palette les rendent visibles en pointillé) : couleur reprise du pixel opaque le plus proche."""
    rgb = rgb.astype(np.float32).copy()
    near_transparent = alpha < 1
    for _ in range(EDGE_TINT_REACH):
        near_transparent = near_transparent | neighbors_any(near_transparent)
    tinted = background_tinted(rgb, green)
    fringe = tinted & near_transparent
    clean = (alpha >= OPAQUE_ALPHA) & ~fringe
    todo = ~clean & ((alpha < 1) | fringe | ((alpha < OPAQUE_ALPHA) & tinted))
    for _ in range(EDGE_FILL_STEPS):
        if not todo.any():
            break
        total = np.zeros_like(rgb)
        count = np.zeros(alpha.shape, dtype=np.float32)
        for dy in (-1, 0, 1):
            for dx in (-1, 0, 1):
                if dy == 0 and dx == 0:
                    continue
                shifted_clean = np.roll(np.roll(clean, dy, axis=0), dx, axis=1)
                shifted_rgb = np.roll(np.roll(rgb, dy, axis=0), dx, axis=1)
                total += shifted_rgb * shifted_clean[..., None]
                count += shifted_clean
        fill = todo & (count > 0)
        rgb[fill] = total[fill] / count[fill][:, None]
        clean = clean | fill
        todo = todo & ~fill
    return rgb


def square_crop(image: Image.Image) -> Image.Image:
    bbox = image.getchannel("A").point(lambda a: 255 if a > 24 else 0).getbbox()
    if bbox is None:
        raise ValueError("aucun sujet détecté")
    cropped = image.crop(bbox)
    side = int(max(cropped.size) * (1 + 2 * PADDING_RATIO))
    canvas = Image.new("RGBA", (side, side), (0, 0, 0, 0))
    canvas.paste(cropped, ((side - cropped.width) // 2, (side - cropped.height) // 2), cropped)
    return canvas


def save_png(art: Image.Image, size: int, path: Path) -> int:
    resized = art.resize((size, size), Image.LANCZOS)
    resized.quantize(colors=256, method=Image.Quantize.FASTOCTREE, dither=Image.Dither.FLOYDSTEINBERG).save(path, "PNG", optimize=True)
    return path.stat().st_size


def export(source: Path) -> str:
    key = source.stem
    art = square_crop(key_out(Image.open(source)))
    web = art.resize((WEB_SIZE, WEB_SIZE), Image.LANCZOS)
    web_path = WEB_DIR / f"{key}.webp"
    web.save(web_path, "WEBP", quality=82, method=6)
    mobile_bytes = save_png(art, MOBILE_SIZE, MOBILE_DIR / f"{key}.png")
    return f"web {web_path.stat().st_size // 1024} Ko, mobile {mobile_bytes // 1024} Ko"


def export_illustration(source: Path) -> str:
    art = square_crop(key_out(Image.open(source)))
    size = save_png(art, ILLUSTRATION_SIZE, ILLUSTRATION_DIR / f"{source.stem}.png")
    return f"illustration {size // 1024} Ko"


def repair_existing() -> int:
    """Applique `decontaminate_edges` aux sorties déjà livrées (sources générées non versionnées)."""
    targets = [*sorted(ILLUSTRATION_DIR.glob("*.png")), *sorted(MOBILE_DIR.glob("*.png")), *sorted(WEB_DIR.glob("*.webp"))]
    for path in targets:
        image = Image.open(path).convert("RGBA")
        pixels = np.asarray(image, dtype=np.float32)
        alpha = pixels[..., 3]
        rgb = decontaminate_edges(decontaminate_edges(pixels[..., :3], alpha, False), alpha, True)
        out = Image.fromarray(np.clip(rgb, 0, 255).astype(np.uint8), "RGB")
        out.putalpha(Image.fromarray(alpha.astype(np.uint8)))
        if path.suffix == ".webp":
            out.save(path, "WEBP", quality=82, method=6)
        else:
            save_png(out, out.width, path)
        print(f"{path.relative_to(ROOT)}: réparé")
    return 0


def main() -> int:
    args = sys.argv[1:]
    if args == ["--repair"]:
        return repair_existing()
    illustrations = "--illustrations" in args
    paths = [a for a in args if a != "--illustrations"]
    if len(paths) != 1:
        print(__doc__)
        return 1
    source_dir = Path(paths[0])
    if illustrations:
        ILLUSTRATION_DIR.mkdir(parents=True, exist_ok=True)
    else:
        WEB_DIR.mkdir(parents=True, exist_ok=True)
        MOBILE_DIR.mkdir(parents=True, exist_ok=True)
    sources = sorted(p for p in source_dir.iterdir() if p.suffix.lower() in {".png", ".jpg", ".jpeg"})
    if not sources:
        print(f"Aucune image dans {source_dir}")
        return 1
    failures = 0
    for source in sources:
        try:
            summary = export_illustration(source) if illustrations else export(source)
            print(f"{source.stem}: {summary}")
        except ValueError as error:
            failures += 1
            print(f"{source.stem}: ÉCHEC {error}")
    return 1 if failures else 0


if __name__ == "__main__":
    sys.exit(main())
