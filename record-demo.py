"""Render an honest, silent CLI demo from commands executed at recording time.

This is a rendered terminal walkthrough, not a screen capture or a live
authenticated Gibwork lookup. It only uses the checked-in synthetic fixture.
Requires Pillow and imageio-ffmpeg for media generation, not for the product.
"""

import json
import os
from pathlib import Path
import subprocess
import sys
import tempfile

from PIL import Image, ImageDraw, ImageFont
import imageio_ffmpeg


ROOT = Path(__file__).resolve().parent
OUTPUT = ROOT / "media" / "demo.mp4"
FONT = "C:/Windows/Fonts/consola.ttf"
TITLE_FONT = "C:/Windows/Fonts/arialbd.ttf"
SIZE = (1280, 720)
FPS = 6


def run(args):
    result = subprocess.run(args, cwd=ROOT, capture_output=True, text=True,
                            encoding="utf-8", errors="replace", timeout=90,
                            check=True)
    return result.stdout.strip()


def frame(title, command, output, footer):
    image = Image.new("RGB", SIZE, (15, 22, 29))
    draw = ImageDraw.Draw(image)
    title_font = ImageFont.truetype(TITLE_FONT, 32)
    mono = ImageFont.truetype(FONT, 21)
    small = ImageFont.truetype(FONT, 17)
    draw.rounded_rectangle((30, 30, 1250, 690), radius=18,
                           fill=(24, 34, 44), outline=(67, 91, 106), width=2)
    draw.text((65, 63), title, font=title_font, fill=(193, 247, 188))
    draw.text((65, 125), "> " + command, font=mono, fill=(108, 203, 232))
    y = 180
    for line in output.splitlines()[:15]:
        draw.text((65, y), line[:91], font=mono, fill=(230, 236, 232))
        y += 27
    draw.line((65, 626, 1215, 626), fill=(67, 91, 106), width=2)
    draw.text((65, 643), footer, font=small, fill=(255, 206, 129))
    return image


def main():
    if OUTPUT.exists():
        raise SystemExit("Refusing to overwrite existing video: " + str(OUTPUT))
    with tempfile.TemporaryDirectory(prefix="gibwork-demo-") as temp:
        report_dir = Path(temp) / "report"
        version = run(["node", "--version"])
        tests = run(["node", "--test"])
        check = run(["node", "cli.mjs", "check", "examples/manifest.json",
                     "--out", str(report_dir)])
        parsed = json.loads(check)
        if parsed["gate"] != "HUMAN_REVIEW_REQUIRED":
            raise RuntimeError("Unexpected demo gate")
        report = (report_dir / "report.md").read_text(encoding="utf-8")
        demo_sections = [
            ("Gibwork Evidence Ledger", "node --version", version,
             "Rendered from actual CLI output · synthetic fixture · no wallet accessed", 5),
            ("Automated verification", "node --test", "\n".join(tests.splitlines()[-11:]),
             "Tests run during this recording", 7),
            ("Generate evidence report", "node cli.mjs check examples/manifest.json --out TEMP/report",
             json.dumps({"gate": parsed["gate"], "requirements": parsed["requirements"]},
                        indent=2),
             "Real execution; TEMP is an isolated temporary directory", 9),
            ("Inspect generated report", "report.md (actual output)",
             "\n".join(report.splitlines()[:19]),
             "FILES_PRESENT means hashes exist, not that submission is approved", 9),
            ("Human eligibility is NOT asserted", "report.md (actual output)",
             "\n".join(report.splitlines()[19:]),
             "Discord sessions, originality and live auth remain unverified", 9),
            ("Integration boundary", "@gibwork/cli task get TASK_UUID",
             "capture.mjs invokes the official CLI for authenticated task lookup.\n"
             "The adapter is mock-tested; no live wallet-authenticated call\n"
             "is shown or claimed in this recording.",
             "No private key, wallet signing, payment or submission performed", 7),
        ]
        OUTPUT.parent.mkdir(exist_ok=True)
        ffmpeg = imageio_ffmpeg.get_ffmpeg_exe()
        proc = subprocess.Popen([ffmpeg, "-y", "-f", "rawvideo", "-vcodec", "rawvideo",
                                 "-s", "1280x720", "-pix_fmt", "rgb24", "-r", str(FPS),
                                 "-i", "-", "-an", "-c:v", "libx264", "-pix_fmt", "yuv420p",
                                 "-movflags", "+faststart", str(OUTPUT)],
                                stdin=subprocess.PIPE, stdout=subprocess.DEVNULL,
                                stderr=subprocess.PIPE)
        try:
            for title, command, output, footer, seconds in demo_sections:
                pixels = frame(title, command, output, footer).tobytes()
                for _ in range(seconds * FPS):
                    proc.stdin.write(pixels)
            proc.stdin.close()
            error = proc.stderr.read().decode("utf-8", errors="replace")
            if proc.wait() != 0:
                raise RuntimeError("ffmpeg failed: " + error[-1000:])
        finally:
            if proc.poll() is None:
                proc.kill()
        print(OUTPUT)


if __name__ == "__main__":
    main()
