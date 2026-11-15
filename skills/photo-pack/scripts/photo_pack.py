#!/usr/bin/env python3
"""Одно или несколько фото → пакет форматов для соцсетей и сайта.

  python photo_pack.py IMG [IMG ...] --out pack/ [--formats 1:1,4:5,9:16,16:9]
        [--mode crop|fit] [--focus 0.5,0.4] [--logo logo.png --logo-pos br --logo-width 0.16]
        [--bg "#111111"] [--quality 85] [--zip]

--mode crop  — заполнить кадр, обрезав края (по точке --focus: x,y от 0 до 1)
--mode fit   — фото целиком на размытом фоне из него же (ничего не обрезается)
"""
import argparse, os, sys, zipfile
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from PIL import Image, ImageFilter, ImageOps, ImageEnhance
from media_env import SIZES, hex_rgb

def crop_to(img, W, H, fx, fy):
    s = max(W / img.width, H / img.height)
    im = img.resize((round(img.width * s), round(img.height * s)), Image.LANCZOS)
    x = min(max(0, int(im.width * fx - W / 2)), im.width - W)
    y = min(max(0, int(im.height * fy - H / 2)), im.height - H)
    return im.crop((x, y, x + W, y + H))

def fit_to(img, W, H):
    bg = crop_to(img, W, H, 0.5, 0.5).filter(ImageFilter.GaussianBlur(40))
    bg = ImageEnhance.Brightness(bg).enhance(0.75)
    s = min(W / img.width, H / img.height)
    fg = img.resize((round(img.width * s), round(img.height * s)), Image.LANCZOS)
    bg.paste(fg, ((W - fg.width) // 2, (H - fg.height) // 2))
    return bg

def add_logo(im, logo, pos, wrel):
    lw = int(min(im.width, im.height) * wrel * (1.6 if im.width > im.height else 1))
    lg = logo.resize((lw, int(logo.height * lw / logo.width)), Image.LANCZOS)
    m = int(min(im.width, im.height) * 0.045)
    x = m if pos in ("tl", "bl") else im.width - lg.width - m
    y = m if pos in ("tl", "tr") else im.height - lg.height - m
    base = im.convert("RGBA"); base.alpha_composite(lg, (x, y))
    return base.convert("RGB")

def main():
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument("images", nargs="+")
    p.add_argument("--out", default="photo_pack")
    p.add_argument("--formats", default="1:1,4:5,9:16,16:9")
    p.add_argument("--mode", default="crop", choices=["crop", "fit"])
    p.add_argument("--focus", default="0.5,0.45", help="точка интереса x,y (0..1), напр. 0.5,0.35 — лица выше центра")
    p.add_argument("--logo"); p.add_argument("--logo-pos", default="br", choices=["tl", "tr", "bl", "br"]); p.add_argument("--logo-width", type=float, default=0.16)
    p.add_argument("--quality", type=int, default=85)
    p.add_argument("--zip", action="store_true")
    a = p.parse_args()
    fx, fy = (float(v) for v in a.focus.split(","))
    logo = Image.open(a.logo).convert("RGBA") if a.logo else None
    os.makedirs(a.out, exist_ok=True)
    made = []
    for path in a.images:
        img = ImageOps.exif_transpose(Image.open(path)).convert("RGB")
        stem = os.path.splitext(os.path.basename(path))[0]
        for f in a.formats.split(","):
            W, H = SIZES[f.strip()]
            im = crop_to(img, W, H, fx, fy) if a.mode == "crop" else fit_to(img, W, H)
            if logo:
                im = add_logo(im, logo, a.logo_pos, a.logo_width)
            name = f"{stem}_{f.replace(':', 'x')}_{W}x{H}.jpg"
            out = os.path.join(a.out, name)
            im.save(out, "JPEG", quality=a.quality, optimize=True, progressive=True)
            made.append(out); print(f"{name}  {os.path.getsize(out)//1024} КБ")
    if a.zip:
        z = a.out.rstrip("/") + ".zip"
        with zipfile.ZipFile(z, "w", zipfile.ZIP_DEFLATED) as zf:
            for m in made: zf.write(m, os.path.basename(m))
        print("Архив:", z)

if __name__ == "__main__":
    main()
