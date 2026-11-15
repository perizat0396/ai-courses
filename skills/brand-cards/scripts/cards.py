#!/usr/bin/env python3
"""Карточки и карусели в фирменном стиле: PNG по JSON-описанию.

  python cards.py spec.json --out cards/ [--zip]

spec.json:
{
  "format": "4:5",                      // 1:1 | 4:5 | 9:16 | 16:9
  "colors": {"bg": "#FFFFFF", "fg": "#111111", "accent": "#FFC21A", "dark": "#111111"},
  "font": "Brand-Bold.ttf",              // необязательно: TTF из бренд-бука
  "font_regular": "Brand-Regular.ttf",   // необязательно
  "logo": "logo.png",                    // необязательно
  "footer": "@vku_official",             // необязательно: подпись внизу каждой карточки
  "photo_overlay": 0.55,                 // затемнение фото-фона (0..1)
  "cards": [
    {"type": "cover",   "title": "5 причин прийти на День открытых дверей", "subtitle": "23 ноября · 10:00", "photo": "bg.jpg"},
    {"type": "text",    "kicker": "01", "title": "Лаборатории", "text": "Покажем, где студенты собирают роботов и ставят опыты."},
    {"type": "quote",   "text": "Приходите с вопросами — ответим на все.", "author": "Декан факультета"},
    {"type": "number",  "number": "1 200", "text": "абитуриентов пришли в прошлом году"},
    {"type": "cta",     "title": "Ждём вас!", "text": "Главный корпус, ул. Шәкәрім, 148", "button": "Регистрация в профиле"}
  ]
}
"""
import argparse, json, os, sys, zipfile
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from PIL import Image, ImageDraw, ImageFont, ImageOps
from media_env import font_path, hex_rgb, SIZES

class Style:
    def __init__(s, spec, base):
        s.W, s.H = SIZES[spec.get("format", "4:5")]
        s.u = min(s.W, s.H) / 1080
        c = spec.get("colors", {})
        s.bg, s.fg = hex_rgb(c.get("bg", "#FFFFFF")), hex_rgb(c.get("fg", "#111111"))
        s.ac, s.dark = hex_rgb(c.get("accent", "#FFC21A")), hex_rgb(c.get("dark", "#111111"))
        rp = lambda k: os.path.join(base, spec[k]) if spec.get(k) else None
        s.fb = font_path(rp("font"), True); s.fr = font_path(rp("font_regular") or rp("font"), False)
        s.logo = Image.open(rp("logo")).convert("RGBA") if spec.get("logo") else None
        s.footer = spec.get("footer", ""); s.overlay = float(spec.get("photo_overlay", 0.55)); s.base = base
        s.m = int(80 * s.u)
    def f(s, px, bold=True): return ImageFont.truetype(s.fb if bold else s.fr, max(12, int(px * s.u)))

def wrap(d, text, font, maxw):
    out = []
    for para in str(text).split("\n"):
        cur = ""
        for w in para.split():
            t = (cur + " " + w).strip()
            if d.textlength(t, font=font) <= maxw or not cur: cur = t
            else: out.append(cur); cur = w
        out.append(cur)
    return out

def fit(st, d, text, px, maxw, max_lines, bold=True):
    while px > 22:
        f = st.f(px, bold)
        lines = wrap(d, text, f, maxw)
        if len(lines) <= max_lines: return f, lines
        px -= 4
    f = st.f(px, bold); return f, wrap(d, text, f, maxw)

def block(d, x, y, lines, font, color, lh=1.18):
    for ln in lines:
        d.text((x, y), ln, font=font, fill=color); y += int(font.size * lh)
    return y

def chrome(st, img, d, idx, total, on_dark):
    col = (255, 255, 255) if on_dark else st.fg
    if st.footer:
        ff = st.f(30, False); d.text((st.m, st.H - st.m - ff.size), st.footer, font=ff, fill=col)
    if total > 1:
        ff = st.f(30); s = f"{idx}/{total}"
        d.text((st.W - st.m - d.textlength(s, font=ff), st.H - st.m - ff.size), s, font=ff, fill=col)
    if st.logo:
        lw = int(150 * st.u); lg = st.logo.resize((lw, int(st.logo.height * lw / st.logo.width)), Image.LANCZOS)
        img.alpha_composite(lg, (st.W - st.m - lw, st.m))

def photo_bg(st, path):
    im = ImageOps.exif_transpose(Image.open(os.path.join(st.base, path))).convert("RGB")
    im = ImageOps.fit(im, (st.W, st.H), Image.LANCZOS).convert("RGBA")
    shade = Image.new("RGBA", im.size, (0, 0, 0, int(255 * st.overlay)))
    im.alpha_composite(shade); return im

def card(st, c, idx, total):
    t = c.get("type", "text")
    dark = t in ("cover", "number", "cta") or bool(c.get("photo"))
    if c.get("photo"): img = photo_bg(st, c["photo"])
    else: img = Image.new("RGBA", (st.W, st.H), (st.dark if dark else st.bg) + (255,))
    d = ImageDraw.Draw(img); col = (255, 255, 255) if dark else st.fg
    maxw = st.W - 2 * st.m
    if t == "cover":
        f, lines = fit(st, d, c.get("title", ""), 104, maxw, 5)
        h = len(lines) * int(f.size * 1.18)
        y = st.H - st.m - int(120 * st.u) - h
        d.rectangle([st.m, y - int(50 * st.u), st.m + int(140 * st.u), y - int(36 * st.u)], fill=st.ac)
        y = block(d, st.m, y, lines, f, col)
        if c.get("subtitle"):
            fs = st.f(44, False); d.text((st.m, y + int(20 * st.u)), c["subtitle"], font=fs, fill=st.ac)
    elif t == "text":
        y = int(st.H * 0.22)
        if c.get("kicker"):
            fk = st.f(120); d.text((st.m, y - int(150 * st.u)), c["kicker"], font=fk, fill=st.ac)
        f, lines = fit(st, d, c.get("title", ""), 78, maxw, 3)
        y = block(d, st.m, y, lines, f, col) + int(30 * st.u)
        ft, tl = fit(st, d, c.get("text", ""), 46, maxw, 9, bold=False)
        block(d, st.m, y, tl, ft, col, 1.35)
    elif t == "quote":
        fq = st.f(260); d.text((st.m - 10, int(st.H * 0.12)), "«", font=fq, fill=st.ac)
        f, lines = fit(st, d, c.get("text", ""), 68, maxw, 7)
        y = int(st.H * 0.12 + 260 * st.u)
        y = block(d, st.m, y, lines, f, col, 1.3)
        if c.get("author"): d.text((st.m, y + int(30 * st.u)), "— " + c["author"], font=st.f(40, False), fill=st.ac)
    elif t == "number":
        fn = st.f(240); n = str(c.get("number", ""))
        while d.textlength(n, font=fn) > maxw: fn = st.f(fn.size / st.u - 10)
        y = int(st.H * 0.30); d.text((st.m, y), n, font=fn, fill=st.ac)
        ft, tl = fit(st, d, c.get("text", ""), 56, maxw, 4)
        block(d, st.m, y + int(fn.size * 1.15), tl, ft, col, 1.25)
    elif t == "cta":
        f, lines = fit(st, d, c.get("title", ""), 110, maxw, 3)
        y = block(d, st.m, int(st.H * 0.28), lines, f, col) + int(30 * st.u)
        ft, tl = fit(st, d, c.get("text", ""), 46, maxw, 4, bold=False)
        y = block(d, st.m, y, tl, ft, col, 1.35) + int(60 * st.u)
        if c.get("button"):
            fb = st.f(44); bw = d.textlength(c["button"], font=fb) + 90 * st.u; bh = fb.size * 2.1
            d.rounded_rectangle([st.m, y, st.m + bw, y + bh], radius=int(bh / 2), fill=st.ac)
            d.text((st.m + 45 * st.u, y + bh / 2 - fb.size * 0.62), c["button"], font=fb, fill=st.dark)
    chrome(st, img, d, idx, total, dark)
    return img.convert("RGB")

def main():
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument("spec"); p.add_argument("--out", default="cards"); p.add_argument("--zip", action="store_true")
    a = p.parse_args()
    spec = json.load(open(a.spec, encoding="utf-8"))
    st = Style(spec, os.path.dirname(os.path.abspath(a.spec)))
    os.makedirs(a.out, exist_ok=True)
    cards = spec["cards"]; made = []
    for i, c in enumerate(cards, 1):
        out = os.path.join(a.out, f"card_{i:02d}.png")
        card(st, c, i, len(cards)).save(out, optimize=True); made.append(out); print("Готово:", out)
    if a.zip:
        z = a.out.rstrip("/") + ".zip"
        with zipfile.ZipFile(z, "w", zipfile.ZIP_DEFLATED) as zf:
            for m in made: zf.write(m, os.path.basename(m))
        print("Архив:", z)

if __name__ == "__main__":
    main()
