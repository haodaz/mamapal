"""Assemble the MamaPal demo: the Playwright recording + the PayPal popup + narration + burned-in subtitles.

    cd ~/Documents/hioffer && uv run python ~/Documents/mamaagent/docs/video/v2/assemble.py

Inputs: out/app.webm, out/paypal.webm, out/beats.json (record.py); tts/*.wav + durations.json (tts.mjs).
Output: out/mamapal-demo.mp4, 1920x1080, under 3:00. Each narration segment owns one stretch of the recording,
played at whatever speed makes it last exactly as long as the narration: waiting for the model speeds up,
static pages slow down. Nothing is pasted in; every frame is the app or PayPal's own window.
"""
import json
import re
import subprocess
from pathlib import Path

import imageio_ffmpeg

F = imageio_ffmpeg.get_ffmpeg_exe()
D = Path(__file__).parent
OUT = D / "out"
b = {x["name"]: x["t"] for x in json.loads((OUT / "beats.json").read_text())}
dur = {d["id"]: d["dur"] for d in json.loads((D / "tts" / "durations.json").read_text())}
narr = {n["id"]: n["text"] for n in json.loads((D / "narration.json").read_text())}
PAD = 0.25
ENC = ["-c:v", "libx264", "-preset", "fast", "-crf", "18", "-an"]


def length_of(path: Path) -> float:
    r = subprocess.run([F, "-i", str(path)], capture_output=True, text=True)
    m = re.search(r"Duration: (\d+):(\d+):([\d.]+)", r.stderr)
    return int(m[1]) * 3600 + int(m[2]) * 60 + float(m[3])


POPUP = length_of(OUT / "paypal.webm")
segments = [
    ("01", "clip", b["intro hero"], 6.0),
    ("02", "clip", 6.0, b["login"] - 0.2),
    ("03", "clip", b["login"], b["ask cut"]),
    ("04", "clip", b["ask cut"], b["cut pane"]),
    ("05", "clip", b["cut pane"], b["paypal popup"] - 0.2),
    ("06", "popup", b["paypal popup"], b["run start"] - 0.3),
    ("07", "clip", b["run start"], b["run plan 0 done"] + 1.5),
    ("08", "clip", b["run plan 0 done"] + 1.5, b["run done"] + 2.5),
    ("09", "clip", b["run done"] + 2.5, b["claims"] - 0.3),
    ("10", "clip", b["claims"], b["budget"] - 0.3),
    ("11", "clip", b["budget"], b["ledger"] - 0.3),
    ("12", "clip", b["ledger"], b["end"]),
]

parts, starts, cursor = [], [], 0.0
for nid, kind, s, e in segments:
    length = dur[nid] + PAD
    src = max(e - s, 0.5)
    speed = src / length
    part = OUT / f"part_{nid}.mp4"
    tail = f"setpts=PTS/{speed:.4f},scale=1920:1080:flags=lanczos,fps=30,format=yuv420p"
    if kind == "clip":
        subprocess.run([F, "-loglevel", "error", "-y", "-ss", f"{s:.2f}", "-t", f"{src:.2f}", "-i", str(OUT / "app.webm"),
                        "-vf", tail, "-t", f"{length:.2f}", *ENC, str(part)], check=True)
    else:
        # PayPal's own window (recorded as its own page, 568x752 in the corner) shown centered over the app, as it was.
        fc = (f"[1:v]crop=568:752:0:0,scale=-2:820[pp];"
              f"[0:v][pp]overlay=(W-w)/2:(H-h)/2:enable='lt(t,{POPUP:.2f})':eof_action=pass,{tail}[v]")
        subprocess.run([F, "-loglevel", "error", "-y", "-ss", f"{s:.2f}", "-t", f"{src:.2f}", "-i", str(OUT / "app.webm"),
                        "-i", str(OUT / "paypal.webm"), "-filter_complex", fc, "-map", "[v]", "-t", f"{length:.2f}", *ENC, str(part)], check=True)
    print(f"{nid}: {kind} {src:.1f}s -> {length:.1f}s (x{speed:.2f})")
    parts.append(part)
    starts.append((nid, cursor))
    cursor += length

lst = OUT / "list_all.txt"
lst.write_text("".join(f"file '{p.name}'\n" for p in parts))
subprocess.run([F, "-loglevel", "error", "-y", "-f", "concat", "-safe", "0", "-i", str(lst), "-c", "copy", str(OUT / "video_only.mp4")], check=True)


def ts(x: float) -> str:
    h = int(x // 3600); m = int(x % 3600 // 60); s = x % 60
    return f"{h:02d}:{m:02d}:{s:06.3f}".replace(".", ",")


def wrap(t: str, n: int = 58) -> str:
    words, lines, cur = t.split(), [], ""
    for w in words:
        if len(cur) + len(w) + 1 > n and cur:
            lines.append(cur); cur = w
        else:
            cur = (cur + " " + w).strip()
    if cur:
        lines.append(cur)
    if len(lines) <= 2:
        return "\n".join(lines)
    half = len(lines) // 2
    return " ".join(lines[:half]) + "\n" + " ".join(lines[half:])


# subtitles: one cue per sentence, timed by its share of the segment's characters
cues, k = [], 1
for nid, s in starts:
    sents = [x.strip() for x in re.split(r"(?<=[.!?;:])\s+", narr[nid]) if x.strip()]
    merged: list[str] = []
    for x in sents:
        if merged and len(x) < 30:
            merged[-1] += " " + x
        else:
            merged.append(x)
    total = sum(len(x) for x in merged); t = s
    for x in merged:
        d = dur[nid] * len(x) / total
        cues.append(f"{k}\n{ts(t)} --> {ts(t + d - 0.05)}\n{wrap(x)}\n"); k += 1; t += d
(OUT / "subs.srt").write_text("\n".join(cues))

inputs = ["-i", str(OUT / "video_only.mp4")]
fl, mix = [], ""
for i, (nid, s) in enumerate(starts):
    inputs += ["-i", str(D / "tts" / f"{nid}.wav")]
    fl.append(f"[{i + 1}:a]aresample=48000,adelay={int(s * 1000)}|{int(s * 1000)}[a{i}]"); mix += f"[a{i}]"
style = "FontName=Helvetica,FontSize=15,PrimaryColour=&H00FFFFFF,OutlineColour=&H66000000,BackColour=&H66000000,BorderStyle=4,Outline=0,Shadow=0,MarginV=22,Alignment=2"
fc = ";".join(fl) + f";{mix}amix=inputs={len(starts)}:normalize=0,alimiter=limit=0.9[aout];[0:v]subtitles={OUT / 'subs.srt'}:force_style='{style}'[vout]"
subprocess.run([F, "-loglevel", "error", "-y", *inputs, "-filter_complex", fc, "-map", "[vout]", "-map", "[aout]",
                "-c:v", "libx264", "-preset", "medium", "-crf", "20", "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "160k",
                "-t", f"{cursor:.2f}", str(OUT / "mamapal-demo.mp4")], check=True)
print("segments:", [(n, round(s, 1)) for n, s in starts])
print("total length:", round(cursor, 1), "s")
