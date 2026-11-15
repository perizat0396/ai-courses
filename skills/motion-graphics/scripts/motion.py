#!/usr/bin/env python3
"""Motion-графика для соцсетей вуза: рендер кадров в Pillow → MP4 (или MOV с прозрачностью) через ffmpeg.

Шаблоны (--template):
  title      — заголовок и подзаголовок выезжают с плашкой-акцентом
  counter    — число растёт от 0 до N + подпись («1 200 абитуриентов»)
  quote      — цитата печатается по словам + автор
  lowerthird — плашка «Имя / должность» для наложения на видео (лучше с --alpha)
  outro      — логотип + дата/место + призыв
  list       — 3–5 пунктов появляются по очереди

Пример:
  python motion.py --template counter --value 1200 --text "абитуриентов пришли в 2025 году" \
      --format 9:16 --bg "#111111" --fg "#FFFFFF" --accent "#FFC21A" --out counter.mp4
"""
import argparse, math, os, subprocess, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from PIL import Image, ImageDraw, ImageFont
from media_env import ffmpeg_bin, font_path, hex_rgb, SIZES

FPS = 30

def ease_out(t):  # 0..1 → 0..1, мягкое торможение
    t = max(0.0, min(1.0, t)); return 1 - (1 - t) ** 3

def ease_in_out(t):
    t = max(0.0, min(1.0, t)); return 3 * t * t - 2 * t * t * t

def seg(t, a, b):  # прогресс отрезка [a,b] секунд
    return 0.0 if t <= a else 1.0 if t >= b else (t - a) / (b - a)

class Canvas:
    def __init__(s, a):
        s.a = a
        s.W, s.H = SIZES[a.format]
        s.unit = min(s.W, s.H) / 1080
        s.fb = font_path(a.font, bold=True)
        s.fr = font_path(a.font_regular or a.font, bold=False)
        s.bg, s.fg, s.ac = hex_rgb(a.bg), hex_rgb(a.fg), hex_rgb(a.accent)
        s.logo = Image.open(a.logo).convert("RGBA") if a.logo else None

    def font(s, px, bold=True):
        return ImageFont.truetype(s.fb if bold else s.fr, int(px * s.unit))

    def new(s):
        if s.a.alpha:
            return Image.new("RGBA", (s.W, s.H), (0, 0, 0, 0))
        return Image.new("RGBA", (s.W, s.H), s.bg + (255,))

def wrap(d, text, font, maxw):
    lines = []
    for para in text.split("\n"):
        cur = ""
        for w in para.split():
            t = (cur + " " + w).strip()
            if d.textlength(t, font=font) <= maxw or not cur:
                cur = t
            else:
                lines.append(cur); cur = w
        lines.append(cur)
    return lines

def fit_font(c, d, text, start_px, maxw, max_lines):
    px = start_px
    while px > 24:
        f = c.font(px)
        if len(wrap(d, text, f, maxw)) <= max_lines:
            return f
        px -= 4
    return c.font(px)

def alpha_text(img, xy, text, font, color, opacity):
    layer = Image.new("RGBA", img.size, (0, 0, 0, 0))
    ImageDraw.Draw(layer).text(xy, text, font=font, fill=color + (int(255 * opacity),))
    img.alpha_composite(layer)

def fade_out(t, dur):
    return 1 - ease_in_out(seg(t, dur - 0.5, dur))

# ---------------------------------------------------------------- шаблоны
def t_title(c, t, dur):
    img = c.new(); d = ImageDraw.Draw(img)
    m = int(90 * c.unit); maxw = c.W - 2 * m
    f1 = fit_font(c, d, c.a.text, 110, maxw, 4)
    lines = wrap(d, c.a.text, f1, maxw)
    lh = int(f1.size * 1.15)
    sub = c.a.subtext or ""
    f2 = c.font(46, bold=False)
    total = lh * len(lines) + (int(lh * 1.1) if sub else 0)
    y0 = (c.H - total) // 2
    p = ease_out(seg(t, 0.1, 0.7))
    d.rectangle([m, y0 - int(40 * c.unit), m + int(160 * c.unit * p), y0 - int(28 * c.unit)], fill=c.ac)
    for i, ln in enumerate(lines):
        pi = ease_out(seg(t, 0.2 + i * 0.12, 0.8 + i * 0.12))
        alpha_text(img, (m - (1 - pi) * 120 * c.unit, y0 + i * lh), ln, f1, c.fg, pi)
    if sub:
        ps = ease_out(seg(t, 0.8, 1.4))
        alpha_text(img, (m, y0 + lh * len(lines) + int(30 * c.unit) + (1 - ps) * 40), sub, f2, c.ac, ps)
    return img, fade_out(t, dur)

def t_counter(c, t, dur):
    img = c.new(); d = ImageDraw.Draw(img)
    target = float(c.a.value)
    p = ease_out(seg(t, 0.2, min(2.2, dur - 1)))
    val = target * p
    s = f"{val:,.0f}".replace(",", " ") if target >= 10 or target == int(target) else f"{val:.1f}"
    s = (c.a.prefix or "") + s + (c.a.suffix or "")
    f = c.font(230)
    while d.textlength(s, font=f) > c.W * 0.9:
        f = c.font(f.size / c.unit - 10)
    tw = d.textlength(s, font=f)
    y = c.H * 0.40
    d.text(((c.W - tw) / 2, y - f.size), s, font=f, fill=c.ac)
    pl = ease_out(seg(t, 1.0, 1.6))
    f2 = fit_font(c, d, c.a.text or "", 56, c.W * 0.8, 3)
    for i, ln in enumerate(wrap(d, c.a.text or "", f2, c.W * 0.8)):
        lw = d.textlength(ln, font=f2)
        alpha_text(img, ((c.W - lw) / 2, y + int(60 * c.unit) + i * f2.size * 1.25 + (1 - pl) * 30), ln, f2, c.fg, pl)
    return img, fade_out(t, dur)

def t_quote(c, t, dur):
    img = c.new(); d = ImageDraw.Draw(img)
    m = int(100 * c.unit); maxw = c.W - 2 * m
    f = fit_font(c, d, c.a.text, 72, maxw, 7)
    lines = wrap(d, c.a.text, f, maxw)
    words_total = sum(len(l.split()) for l in lines)
    shown = int(words_total * ease_in_out(seg(t, 0.4, max(1.0, dur * 0.6))) + 0.999)
    lh = int(f.size * 1.3)
    y0 = (c.H - lh * len(lines)) // 2
    fq = c.font(240)
    alpha_text(img, (m - 10, y0 - int(230 * c.unit)), "«", fq, c.ac, ease_out(seg(t, 0, 0.5)))
    cnt = 0
    for i, ln in enumerate(lines):
        ws = ln.split(); part = []
        for w in ws:
            if cnt < shown: part.append(w)
            cnt += 1
        if part:
            d.text((m, y0 + i * lh), " ".join(part), font=f, fill=c.fg)
    if c.a.subtext:
        pa = ease_out(seg(t, dur * 0.6, dur * 0.6 + 0.6))
        f2 = c.font(44, bold=False)
        alpha_text(img, (m, y0 + lh * len(lines) + int(50 * c.unit)), "— " + c.a.subtext, f2, c.ac, pa)
    return img, fade_out(t, dur)

def t_lowerthird(c, t, dur):
    img = c.new(); d = ImageDraw.Draw(img)
    f1, f2 = c.font(58), c.font(38, bold=False)
    name, role = c.a.text, c.a.subtext or ""
    w = int(max(d.textlength(name, font=f1), d.textlength(role, font=f2)) + 80 * c.unit)
    h = int((58 + 38 + 70) * c.unit)
    x = int(60 * c.unit); y = int(c.H * (0.72 if c.H > c.W else 0.75))
    p_in = ease_out(seg(t, 0.1, 0.6)); p_out = 1 - ease_in_out(seg(t, dur - 0.6, dur - 0.1))
    p = min(p_in, p_out)
    bar = int(14 * c.unit)
    d.rectangle([x, y, x + bar, y + int(h * p)], fill=c.ac)
    box = Image.new("RGBA", img.size, (0, 0, 0, 0)); bd = ImageDraw.Draw(box)
    bd.rectangle([x + bar, y, x + bar + int(w * p), y + h], fill=c.bg + (235,))
    bd.text((x + bar + 30 * c.unit, y + 20 * c.unit), name, font=f1, fill=c.fg + (255,))
    bd.text((x + bar + 30 * c.unit, y + (20 + 70) * c.unit), role, font=f2, fill=c.ac + (255,))
    mask = Image.new("L", img.size, 0)
    ImageDraw.Draw(mask).rectangle([x + bar, y, x + bar + int(w * p), y + h], fill=255)
    img.paste(box, (0, 0), mask)
    return img, 1.0

def t_outro(c, t, dur):
    img = c.new(); d = ImageDraw.Draw(img)
    cy = c.H * 0.40
    if c.logo:
        p = ease_out(seg(t, 0.1, 0.8))
        lw = int(c.W * 0.32 * (0.85 + 0.15 * p))
        lg = c.logo.resize((lw, int(c.logo.height * lw / c.logo.width)))
        if p < 1:
            a = lg.split()[3].point(lambda v: int(v * p)); lg.putalpha(a)
        img.alpha_composite(lg, (int((c.W - lw) / 2), int(cy - lg.height)))
    f1 = fit_font(c, d, c.a.text, 80, c.W * 0.84, 3)
    for i, ln in enumerate(wrap(d, c.a.text, f1, c.W * 0.84)):
        pi = ease_out(seg(t, 0.6 + i * 0.1, 1.2 + i * 0.1))
        tw = d.textlength(ln, font=f1)
        alpha_text(img, ((c.W - tw) / 2, cy + int(60 * c.unit) + i * f1.size * 1.2 + (1 - pi) * 30), ln, f1, c.fg, pi)
    if c.a.subtext:
        pb = ease_out(seg(t, 1.2, 1.8))
        f2 = c.font(48)
        tw = d.textlength(c.a.subtext, font=f2)
        bw, bh = tw + 80 * c.unit, f2.size * 2
        bx, by = (c.W - bw) / 2, c.H * 0.68
        layer = Image.new("RGBA", img.size, (0, 0, 0, 0)); ld = ImageDraw.Draw(layer)
        ld.rounded_rectangle([bx, by, bx + bw, by + bh], radius=int(bh / 2), fill=c.ac + (int(255 * pb),))
        ld.text((bx + 40 * c.unit, by + bh / 2 - f2.size * 0.6), c.a.subtext, font=f2, fill=c.bg + (int(255 * pb),))
        img.alpha_composite(layer)
    return img, fade_out(t, dur) if not c.a.alpha else 1.0

def t_list(c, t, dur):
    img = c.new(); d = ImageDraw.Draw(img)
    items = [x.strip() for x in (c.a.items or "").split("|") if x.strip()]
    m = int(90 * c.unit); maxw = c.W - 2 * m - int(90 * c.unit)
    ft = fit_font(c, d, c.a.text or "", 84, c.W - 2 * m, 2)
    fi = c.font(50)
    y = int(c.H * 0.22)
    if c.a.text:
        for ln in wrap(d, c.a.text, ft, c.W - 2 * m):
            alpha_text(img, (m, y), ln, ft, c.fg, ease_out(seg(t, 0, 0.5))); y += int(ft.size * 1.15)
    y += int(60 * c.unit)
    step = max(0.5, (dur - 2.0) / max(1, len(items)))
    for i, it in enumerate(items):
        p = ease_out(seg(t, 0.6 + i * step, 1.1 + i * step))
        r = int(30 * c.unit)
        layer = Image.new("RGBA", img.size, (0, 0, 0, 0)); ld = ImageDraw.Draw(layer)
        ld.ellipse([m, y, m + 2 * r, y + 2 * r], fill=c.ac + (int(255 * p),))
        num = str(i + 1); nf = c.font(34)
        ld.text((m + r - ld.textlength(num, font=nf) / 2, y + r - nf.size * 0.62), num, font=nf, fill=c.bg + (int(255 * p),))
        img.alpha_composite(layer)
        lines = wrap(d, it, fi, maxw)
        for j, ln in enumerate(lines):
            alpha_text(img, (m + 2 * r + 30 * c.unit + (1 - p) * 60, y + j * fi.size * 1.2), ln, fi, c.fg, p)
        y += int(max(2 * r, len(lines) * fi.size * 1.2) + 45 * c.unit)
    return img, fade_out(t, dur)

TEMPLATES = {"title": t_title, "counter": t_counter, "quote": t_quote, "lowerthird": t_lowerthird, "outro": t_outro, "list": t_list}
DEFAULT_DUR = {"title": 4, "counter": 4, "quote": 7, "lowerthird": 5, "outro": 4, "list": 7}

def main():
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument("--template", required=True, choices=list(TEMPLATES))
    p.add_argument("--text", default="", help="Главный текст (заголовок, цитата, имя, призыв)")
    p.add_argument("--subtext", default="", help="Подзаголовок / автор / должность / дата и место")
    p.add_argument("--items", default="", help="Для list: пункты через |")
    p.add_argument("--value", default="0", help="Для counter: итоговое число")
    p.add_argument("--prefix", default=""); p.add_argument("--suffix", default="")
    p.add_argument("--format", default="9:16", choices=list(SIZES))
    p.add_argument("--duration", type=float)
    p.add_argument("--bg", default="#111111"); p.add_argument("--fg", default="#FFFFFF"); p.add_argument("--accent", default="#FFC21A")
    p.add_argument("--font", help="TTF фирменного шрифта (жирный)"); p.add_argument("--font-regular", dest="font_regular")
    p.add_argument("--logo", help="PNG логотипа (для outro)")
    p.add_argument("--alpha", action="store_true", help="Прозрачный фон → .mov (ProRes 4444) для наложения в CapCut")
    p.add_argument("--preview", action="store_true", help="Сохранить только PNG-кадр из середины")
    p.add_argument("--out", required=True)
    a = p.parse_args()
    dur = a.duration or DEFAULT_DUR[a.template]
    c = Canvas(a)
    fn = TEMPLATES[a.template]

    def frame(t):
        img, vis = fn(c, t, dur)
        if vis < 1:
            if a.alpha:
                al = img.split()[3].point(lambda v: int(v * vis)); img.putalpha(al)
            else:
                bgimg = Image.new("RGBA", img.size, c.bg + (255,))
                img = Image.blend(bgimg, img, vis)
        return img

    if a.preview:
        frame(dur * 0.55).save(a.out); print("Готово:", a.out); return

    ff = ffmpeg_bin()
    if a.alpha:
        out = os.path.splitext(a.out)[0] + ".mov"
        enc = ["-c:v", "prores_ks", "-profile:v", "4444", "-pix_fmt", "yuva444p10le", out]
    else:
        out = a.out
        enc = ["-c:v", "libx264", "-preset", "veryfast", "-crf", "20", "-pix_fmt", "yuv420p", "-movflags", "+faststart", out]
    cmd = [ff, "-hide_banner", "-loglevel", "error", "-y", "-f", "rawvideo", "-pix_fmt", "rgba",
           "-s", f"{c.W}x{c.H}", "-r", str(FPS), "-i", "-"] + enc
    proc = subprocess.Popen(cmd, stdin=subprocess.PIPE)
    n = int(dur * FPS)
    for i in range(n):
        proc.stdin.write(frame(i / FPS).tobytes())
    proc.stdin.close(); proc.wait()
    if proc.returncode:
        sys.exit("Ошибка ffmpeg при кодировании")
    print("Готово:", out, f"({dur:.0f} сек, {c.W}x{c.H})")

if __name__ == "__main__":
    main()
