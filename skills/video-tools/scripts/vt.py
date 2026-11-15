#!/usr/bin/env python3
"""Видеоинструменты пресс-службы на ffmpeg.

Команды:
  info IN
  vertical IN OUT [--mode blur|crop] [--size 9:16|1:1|4:5|16:9]
  trim IN OUT --start 00:00:05 --end 00:00:20
  compress IN OUT [--for telegram|instagram|web]
  concat OUT IN1 IN2 ... [--size 9:16]
  logo IN LOGO OUT [--pos tr|tl|br|bl] [--width 0.18]
  subs IN SRT OUT [--font F] [--size 54]
  audio IN OUT.mp3
  gif IN OUT.gif [--start 0] [--dur 4] [--width 540]
  thumb IN OUT.jpg [--time 00:00:01]
  loud IN OUT
"""
import argparse, json, os, re, subprocess, sys, tempfile
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from media_env import ffmpeg_bin, font_path, SIZES

FF = ffmpeg_bin()
ENC = ["-c:v", "libx264", "-preset", "veryfast", "-crf", "23", "-pix_fmt", "yuv420p",
       "-c:a", "aac", "-b:a", "128k", "-movflags", "+faststart"]

def run(args):
    cmd = [FF, "-hide_banner", "-loglevel", "error", "-y"] + args
    r = subprocess.run(cmd, capture_output=True, text=True)
    if r.returncode != 0:
        sys.exit("ffmpeg ошибка:\n" + r.stderr[-1500:])

def has_audio(path):
    r = subprocess.run([FF, "-hide_banner", "-i", path], capture_output=True, text=True)
    return "Audio:" in r.stderr

def info(a):
    r = subprocess.run([FF, "-hide_banner", "-i", a.input], capture_output=True, text=True)
    lines = [l.strip() for l in r.stderr.splitlines() if any(k in l for k in ("Duration", "Video:", "Audio:"))]
    print("\n".join(lines))

def fit_filter(w, h, mode):
    if mode == "crop":
        return f"scale={w}:{h}:force_original_aspect_ratio=increase,crop={w}:{h},setsar=1"
    # размытый фон из того же видео + исходник по центру
    return (f"split[a][b];[a]scale={w}:{h}:force_original_aspect_ratio=increase,crop={w}:{h},boxblur=25:5[bg];"
            f"[b]scale={w}:{h}:force_original_aspect_ratio=decrease[fg];[bg][fg]overlay=(W-w)/2:(H-h)/2,setsar=1")

def vertical(a):
    w, h = SIZES[a.size]
    run(["-i", a.input, "-filter_complex", fit_filter(w, h, a.mode), "-r", "30"] + ENC + [a.output])

def trim(a):
    args = ["-ss", a.start, "-i", a.input]
    if a.end:
        args += ["-to", str(tsec(a.end) - tsec(a.start))]
    run(args + ENC + [a.output])

def tsec(t):
    p = [float(x) for x in str(t).split(":")]
    s = 0
    for x in p:
        s = s * 60 + x
    return s

def compress(a):
    crf = {"telegram": "26", "instagram": "22", "web": "24"}[a.target]
    vf = "scale='min(1080,iw)':-2" if a.target != "web" else "scale='min(1920,iw)':-2"
    enc = ENC.copy(); enc[enc.index("-crf") + 1] = crf
    run(["-i", a.input, "-vf", vf] + enc + [a.output])
    print(f"{os.path.getsize(a.input)/1e6:.1f} МБ → {os.path.getsize(a.output)/1e6:.1f} МБ")

def concat(a):
    w, h = SIZES[a.size]
    tmp = tempfile.mkdtemp()
    parts = []
    for i, f in enumerate(a.inputs):
        p = os.path.join(tmp, f"p{i}.mp4")
        audio = [] if has_audio(f) else ["-f", "lavfi", "-i", "anullsrc=r=44100:cl=stereo", "-shortest"]
        run(["-i", f] + audio + ["-filter_complex", fit_filter(w, h, "blur"), "-r", "30", "-ar", "44100", "-ac", "2"] + ENC + [p])
        parts.append(p)
    lst = os.path.join(tmp, "list.txt")
    with open(lst, "w") as fh:
        fh.writelines(f"file '{p}'\n" for p in parts)
    run(["-f", "concat", "-safe", "0", "-i", lst, "-c", "copy", "-movflags", "+faststart", a.output])

def logo(a):
    pos = {"tr": "W-w-40:40", "tl": "40:40", "br": "W-w-40:H-h-40", "bl": "40:H-h-40"}[a.pos]
    fc = f"[1:v][0:v]scale2ref=w=iw*{a.width}:h=ow/mdar[lg][v];[v][lg]overlay={pos}"
    run(["-i", a.input, "-i", a.logo, "-filter_complex", fc] + ENC + [a.output])

def parse_srt(path):
    txt = open(path, encoding="utf-8-sig").read().replace("\r", "")
    cues = []
    for block in re.split(r"\n\s*\n", txt.strip()):
        ls = block.split("\n")
        m = next((re.match(r"(\S+)\s*-->\s*(\S+)", l) for l in ls if "-->" in l), None)
        if not m:
            continue
        i = next(k for k, l in enumerate(ls) if "-->" in l)
        cues.append((tsec(m.group(1).replace(",", ".")), tsec(m.group(2).replace(",", ".")), "\n".join(ls[i + 1:]).strip()))
    return cues

def subs(a):
    """Вшивает субтитры. Рисуем их сами через Pillow (работает без libass и с казахскими буквами)."""
    from PIL import Image, ImageDraw, ImageFont
    import shutil as sh
    r = subprocess.run([FF, "-hide_banner", "-i", a.input], capture_output=True, text=True)
    m = re.search(r"Video:.*?(\d{2,5})x(\d{2,5})", r.stderr)
    W, H = int(m.group(1)), int(m.group(2))
    font = ImageFont.truetype(font_path(a.font), a.size)
    tmp = tempfile.mkdtemp()
    inputs, chain, last = ["-i", a.input], "", "0:v"
    cues = parse_srt(a.srt)
    for k, (s, e, text) in enumerate(cues):
        img = Image.new("RGBA", (W, H), (0, 0, 0, 0))
        d = ImageDraw.Draw(img)
        lines = wrap(text, font, W * 0.86, d)
        lh = int(a.size * 1.25)
        y0 = int(H * 0.78) - lh * len(lines) // 2
        for j, ln in enumerate(lines):
            tw = d.textlength(ln, font=font)
            x, y = (W - tw) / 2, y0 + j * lh
            pad = a.size * 0.25
            d.rounded_rectangle([x - pad, y - pad * 0.4, x + tw + pad, y + lh - pad * 0.2], radius=int(pad), fill=(0, 0, 0, 165))
            d.text((x, y), ln, font=font, fill=(255, 255, 255, 255))
        p = os.path.join(tmp, f"s{k}.png"); img.save(p)
        inputs += ["-i", p]
        chain += f"[{last}][{k+1}:v]overlay=0:0:enable='between(t,{s:.3f},{e:.3f})'[v{k}];"
        last = f"v{k}"
    if not cues:
        sys.exit("В .srt не найдено ни одного субтитра")
    run(inputs + ["-filter_complex", chain.rstrip(";"), "-map", f"[{last}]", "-map", "0:a?"] + ENC + [a.output])
    sh.rmtree(tmp, ignore_errors=True)

def wrap(text, font, maxw, d):
    out = []
    for para in text.split("\n"):
        cur = ""
        for w in para.split():
            t = (cur + " " + w).strip()
            if d.textlength(t, font=font) <= maxw or not cur:
                cur = t
            else:
                out.append(cur); cur = w
        out.append(cur)
    return out

def audio(a):
    run(["-i", a.input, "-vn", "-ac", "1", "-ar", "16000", "-b:a", "64k", a.output])

def gif(a):
    vf = f"fps=12,scale={a.width}:-1:flags=lanczos,split[s0][s1];[s0]palettegen[p];[s1][p]paletteuse"
    run(["-ss", str(a.start), "-t", str(a.dur), "-i", a.input, "-vf", vf, a.output])

def thumb(a):
    run(["-ss", a.time, "-i", a.input, "-frames:v", "1", "-q:v", "2", a.output])

def loud(a):
    run(["-i", a.input, "-af", "loudnorm=I=-14:TP=-1.5:LRA=11", "-c:v", "copy", "-c:a", "aac", "-b:a", "160k", a.output])

def main():
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sp = p.add_subparsers(dest="cmd", required=True)
    s = sp.add_parser("info"); s.add_argument("input"); s.set_defaults(f=info)
    s = sp.add_parser("vertical"); s.add_argument("input"); s.add_argument("output"); s.add_argument("--mode", default="blur", choices=["blur", "crop"]); s.add_argument("--size", default="9:16", choices=list(SIZES)); s.set_defaults(f=vertical)
    s = sp.add_parser("trim"); s.add_argument("input"); s.add_argument("output"); s.add_argument("--start", default="0"); s.add_argument("--end"); s.set_defaults(f=trim)
    s = sp.add_parser("compress"); s.add_argument("input"); s.add_argument("output"); s.add_argument("--for", dest="target", default="instagram", choices=["telegram", "instagram", "web"]); s.set_defaults(f=compress)
    s = sp.add_parser("concat"); s.add_argument("output"); s.add_argument("inputs", nargs="+"); s.add_argument("--size", default="9:16", choices=list(SIZES)); s.set_defaults(f=concat)
    s = sp.add_parser("logo"); s.add_argument("input"); s.add_argument("logo"); s.add_argument("output"); s.add_argument("--pos", default="tr", choices=["tr", "tl", "br", "bl"]); s.add_argument("--width", type=float, default=0.18); s.set_defaults(f=logo)
    s = sp.add_parser("subs"); s.add_argument("input"); s.add_argument("srt"); s.add_argument("output"); s.add_argument("--font"); s.add_argument("--size", type=int, default=54); s.set_defaults(f=subs)
    s = sp.add_parser("audio"); s.add_argument("input"); s.add_argument("output"); s.set_defaults(f=audio)
    s = sp.add_parser("gif"); s.add_argument("input"); s.add_argument("output"); s.add_argument("--start", default=0); s.add_argument("--dur", default=4); s.add_argument("--width", default=540); s.set_defaults(f=gif)
    s = sp.add_parser("thumb"); s.add_argument("input"); s.add_argument("output"); s.add_argument("--time", default="00:00:01"); s.set_defaults(f=thumb)
    s = sp.add_parser("loud"); s.add_argument("input"); s.add_argument("output"); s.set_defaults(f=loud)
    a = p.parse_args(); a.f(a)
    if getattr(a, "output", None) and os.path.exists(a.output):
        print("Готово:", a.output)

if __name__ == "__main__":
    main()
