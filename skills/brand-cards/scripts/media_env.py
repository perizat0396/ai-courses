"""Общие помощники: поиск ffmpeg и шрифта с поддержкой казахских букв."""
import glob, os, shutil, subprocess, sys

def ffmpeg_bin() -> str:
    exe = shutil.which("ffmpeg")
    if exe:
        return exe
    try:
        import imageio_ffmpeg
    except ImportError:
        subprocess.run([sys.executable, "-m", "pip", "install", "-q", "imageio-ffmpeg"], check=False)
        try:
            import imageio_ffmpeg
        except ImportError:
            sys.exit("ffmpeg не найден и не удалось установить imageio-ffmpeg")
    return imageio_ffmpeg.get_ffmpeg_exe()

FONT_CANDIDATES = [
    "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
    "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
    "/usr/share/fonts/truetype/noto/NotoSans-Bold.ttf",
    "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf",
    "/Library/Fonts/Arial Bold.ttf",
    "C:/Windows/Fonts/arialbd.ttf",
]

def font_path(user_font: str | None = None, bold: bool = True) -> str:
    """Шрифт пользователя (бренд-бук) или системный с кириллицей и казахскими буквами."""
    if user_font and os.path.exists(user_font):
        return user_font
    cands = list(FONT_CANDIDATES) if bold else [p.replace("-Bold", "") for p in FONT_CANDIDATES]
    for p in cands:
        if os.path.exists(p):
            return p
    try:  # шрифт, который идёт вместе с matplotlib
        import matplotlib
        d = os.path.join(os.path.dirname(matplotlib.__file__), "mpl-data", "fonts", "ttf")
        f = os.path.join(d, "DejaVuSans-Bold.ttf" if bold else "DejaVuSans.ttf")
        if os.path.exists(f):
            return f
    except ImportError:
        pass
    found = glob.glob("/usr/share/fonts/**/*.ttf", recursive=True)
    if found:
        return found[0]
    sys.exit("Не найден шрифт. Загрузите файл .ttf фирменного шрифта и передайте --font путь")

def hex_rgb(h: str):
    h = h.lstrip("#")
    return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4))

SIZES = {"9:16": (1080, 1920), "1:1": (1080, 1080), "4:5": (1080, 1350), "16:9": (1920, 1080)}

def out_dir() -> str:
    """Папка для выдачи файлов пользователю в Claude (если есть)."""
    for d in ("/mnt/user-data/outputs", os.getcwd()):
        if os.path.isdir(d):
            return d
    return os.getcwd()
