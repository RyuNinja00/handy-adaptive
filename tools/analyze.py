#!/usr/bin/env python3
"""
analyze.py — pair a hand-scripted .funscript with its video and have a local
vision-language model (e.g. Gemma 4 via Ollama / llama.cpp / LM Studio / vLLM)
describe what is happening in each motion segment.

Output: <video>.analysis.json containing, per segment:
  - motion features computed from the script (strokes/min, range, speed, ...)
  - keyframes (1 s resolution) the extension can replay in HAMP mode
  - the raw script actions (for exact HDSP playback)
  - the VLM's label: act, position, which on-screen motion the script tracks, etc.

Requires: python 3.9+, ffmpeg on PATH. No pip packages needed.
"""
import argparse
import base64
import json
import os
import statistics as st
import subprocess
import sys
import time
import urllib.request

DEFAULT_ACTS = [
    "handjob", "blowjob", "deepthroat", "titjob", "footjob",
    "cowgirl", "reverse cowgirl", "missionary", "doggystyle", "standing",
    "spooning", "riding (other)", "teasing", "edging / pause", "climax", "non-sexual",
]

# ------------------------------------------------------------------ funscript
def load_funscript(path):
    with open(path, encoding="utf-8") as f:
        d = json.load(f)
    inv = bool(d.get("inverted"))
    pts = []
    for a in sorted(d.get("actions", []), key=lambda a: a["at"]):
        pos = max(0.0, min(100.0, float(a["pos"])))
        pts.append((a["at"] / 1000.0, 100.0 - pos if inv else pos))
    out = []
    for t, p in pts:
        if out and abs(out[-1][0] - t) < 1e-6:
            out[-1] = (t, p)
        else:
            out.append((t, p))
    return out


def slice_pts(pts, a, b):
    return [p for p in pts if a <= p[0] <= b]


def _merge_same_direction(ex):
    out = [ex[0]]
    for p in ex[1:]:
        if len(out) >= 2 and (out[-1][1] - out[-2][1]) * (p[1] - out[-1][1]) >= 0:
            out[-1] = p
        else:
            out.append(p)
    return out


def extrema(pts, min_amp=4):
    """Turning points of the script, ignoring wiggles smaller than min_amp."""
    if len(pts) < 3:
        return list(pts)
    ex = _merge_same_direction(list(pts))
    while True:
        n = len(ex)
        filtered = [ex[0]]
        for p in ex[1:]:
            if abs(p[1] - filtered[-1][1]) < min_amp and len(filtered) > 1:
                continue
            filtered.append(p)
        ex = _merge_same_direction(filtered)
        if len(ex) == n:
            return ex


def pct(vals, q):
    if not vals:
        return 0.0
    s = sorted(vals)
    k = (len(s) - 1) * q
    lo, hi = int(k), min(int(k) + 1, len(s) - 1)
    return s[lo] + (s[hi] - s[lo]) * (k - lo)


def features(pts, a, b):
    dur = max(0.001, b - a)
    seg = slice_pts(pts, a, b)
    empty = dict(duration=round(dur, 2), strokes_per_min=0, amp=0, lo=0, hi=0, center=0,
                 speed=0, regularity=0, pause_frac=1.0, trend=1.0)
    if len(seg) < 2:
        return empty
    ex = extrema(seg)
    strokes = [(ex[i], ex[i + 1]) for i in range(len(ex) - 1) if abs(ex[i + 1][1] - ex[i][1]) >= 4]
    if not strokes:
        return empty
    # holds: consecutive script points that barely move for a while
    paused = sum(seg[i + 1][0] - seg[i][0] for i in range(len(seg) - 1)
                 if abs(seg[i + 1][1] - seg[i][1]) < 2 and seg[i + 1][0] - seg[i][0] > 0.4)
    durs = [max(0.01, s[1][0] - s[0][0]) for s in strokes]
    amps = [abs(s[1][1] - s[0][1]) for s in strokes]
    moving = max(0.01, min(sum(durs), dur) - paused)
    travel = sum(amps)
    poss = [p for _, p in ex]

    def speed_of(sub):
        md = sum(max(0.01, s[1][0] - s[0][0]) for s in sub)
        return sum(abs(s[1][1] - s[0][1]) for s in sub) / md if md else 0

    mid = a + dur / 2
    first = [s for s in strokes if s[0][0] < mid]
    second = [s for s in strokes if s[0][0] >= mid]
    v1, v2 = speed_of(first), speed_of(second)
    cv = st.pstdev(durs) / st.mean(durs) if len(durs) > 1 else 0
    lo, hi = pct(poss, 0.1), pct(poss, 0.9)
    return dict(
        duration=round(dur, 2),
        strokes_per_min=round(len(strokes) / 2 / dur * 60, 1),   # full up+down cycles
        amp=round(st.mean(amps), 1),
        lo=round(lo, 1), hi=round(hi, 1), center=round((lo + hi) / 2, 1),
        speed=round(travel / moving, 1),                           # script units per second while moving
        regularity=round(max(0.0, 1 - cv), 2),                     # 1 = metronome, 0 = erratic
        pause_frac=round(max(0.0, min(1.0, 1 - moving / dur)), 2),
        trend=round(v2 / v1, 2) if v1 > 0 and v2 > 0 else 1.0,     # >1 = speeding up
    )


def keyframes(pts, a, b, step=1.0, win=2.0):
    kfs = []
    t = a
    while t < b - 0.01:
        w0, w1 = max(a, t - win / 2), min(b, t + win / 2)
        f = features(pts, w0, w1)
        sub = slice_pts(pts, w0, w1)
        if sub and f["amp"] > 0:
            lo = min(p for _, p in sub)
            hi = max(p for _, p in sub)
        else:
            lo = hi = sub[-1][1] if sub else 50
        kfs.append({"t": round(t - a, 2), "v": f["speed"], "lo": round(lo), "hi": round(max(hi, lo + 5))})
        t += step
    return kfs


def shape(f, kfs):
    vs = [k["v"] for k in kfs if k["v"] > 0]
    vcv = st.pstdev(vs) / st.mean(vs) if len(vs) > 1 and st.mean(vs) else 0
    if f["pause_frac"] > 0.3:
        return "edge"
    if f["amp"] < 35 and f["center"] > 60:
        return "tease"
    if f["trend"] > 1.3:
        return "build"
    if f["amp"] > 75:
        return "deep"
    if vcv > 0.35:
        return "pulse" if f["regularity"] < 0.6 else "wave"
    return "steady"


# ------------------------------------------------------------------ segmentation
def similar(f, g):
    if f["pause_frac"] > 0.7 and g["pause_frac"] > 0.7:
        return True
    c1, c2 = f["strokes_per_min"], g["strokes_per_min"]
    return (abs(c1 - c2) / max(c1, c2, 1) < 0.3 and abs(f["amp"] - g["amp"]) < 20
            and abs(f["center"] - g["center"]) < 20)


def segment(pts, window=4.0, min_seg=6.0, max_seg=40.0):
    if not pts:
        return []
    end = pts[-1][0]
    t, wins = pts[0][0], []
    while t < end:
        wins.append((t, min(end, t + window)))
        t += window
    segs = []
    for w in wins:
        if segs:
            s = segs[-1]
            if w[1] - s[0] <= max_seg and similar(features(pts, *s), features(pts, *w)):
                segs[-1] = (s[0], w[1])
                continue
        segs.append(w)
    # absorb tiny segments into the more similar neighbour
    changed = True
    while changed and len(segs) > 1:
        changed = False
        for i, s in enumerate(segs):
            if s[1] - s[0] < min_seg:
                j = i - 1 if i > 0 else i + 1
                if 0 < i < len(segs) - 1:
                    f = features(pts, *s)
                    left = similar(f, features(pts, *segs[i - 1]))
                    j = i - 1 if left else i + 1
                a, b = min(segs[i][0], segs[j][0]), max(segs[i][1], segs[j][1])
                segs[min(i, j)] = (a, b)
                del segs[max(i, j)]
                changed = True
                break
    return segs


# ------------------------------------------------------------------ frames
def pick_frame_times(pts, a, b, n):
    """Prefer frames at the top and bottom of strokes so the model sees both extremes."""
    ex = [p for p in extrema(slice_pts(pts, a, b)) if a <= p[0] <= b]
    if len(ex) < 2:
        return [(a + (b - a) * (i + 0.5) / n, None) for i in range(n)]
    tops = sorted(ex, key=lambda p: -p[1])[: max(1, len(ex) // 2)]
    bots = sorted(ex, key=lambda p: p[1])[: max(1, len(ex) // 2)]
    tops.sort(); bots.sort()
    chosen = []
    for i in range(n):
        src = tops if i % 2 == 0 else bots
        k = int((i // 2 + 0.5) / max(1, (n + 1) // 2) * len(src))
        chosen.append(src[min(k, len(src) - 1)])
    chosen = sorted(set(chosen))
    return [(t, p) for t, p in chosen]


def grab_frame(video, t, width):
    cmd = ["ffmpeg", "-loglevel", "error", "-ss", f"{t:.3f}", "-i", video, "-frames:v", "1",
           "-vf", f"scale={width}:-2", "-q:v", "4", "-f", "image2pipe", "-vcodec", "mjpeg", "-"]
    r = subprocess.run(cmd, capture_output=True)
    if r.returncode != 0 or not r.stdout:
        raise RuntimeError(f"ffmpeg failed at {t:.2f}s: {r.stderr.decode(errors='ignore')[:200]}")
    return base64.b64encode(r.stdout).decode()


# ------------------------------------------------------------------ VLM
SYSTEM = ("You annotate adult videos so that a hand-made motion script for a stroker device can be "
          "matched to what happens on screen. Be factual, concise and consistent. Reply with JSON only.")


def describe_motion(f):
    pace = "slow" if f["strokes_per_min"] < 40 else "medium" if f["strokes_per_min"] < 90 else "fast"
    return (f"{f['strokes_per_min']} strokes/min ({pace}), average travel {f['amp']} of 100, "
            f"range {f['lo']}-{f['hi']}, speed {f['speed']} units/s, regularity {f['regularity']}, "
            f"pauses {int(f['pause_frac'] * 100)}%, trend x{f['trend']} (above 1 = speeding up)")


def build_prompt(a, b, frame_info, f, acts, context):
    labels = "\n".join(
        f"  frame {i + 1}: t={t:.1f}s" + (f", script position {int(p)}" if p is not None else "")
        for i, (t, p) in enumerate(frame_info))
    return f"""Segment {a:.1f}s-{b:.1f}s of the video.{(' Context: ' + context) if context else ''}
The frames are in time order. Script position: 0 = device fully down (base), 100 = fully up (tip).
{labels}
Script motion in this segment: {describe_motion(f)}.

1. Identify the sexual act and position. Use one of these for "act" if it fits, otherwise a short new name: {', '.join(acts)}.
2. Say which visible movement the script follows (whose body, which motion maps to script up/down), comparing the frames at high and low script positions.
3. Rate how plausibly the script's rhythm and range match the visible motion.

Return exactly this JSON:
{{"act": "", "position": "", "tracked_motion": "", "pace": "slow|medium|fast|varied", "intensity": 1, "label": "3-6 word name", "description": "one sentence", "match_confidence": 0.0}}
If the frames show no sexual activity (intro, talking), use act "non-sexual"."""


def call_vlm(url, model, api_key, prompt, images, timeout):
    content = [{"type": "text", "text": prompt}]
    content += [{"type": "image_url", "image_url": {"url": f"data:image/jpeg;base64,{b}"}} for b in images]
    body = {"model": model, "temperature": 0.2, "max_tokens": 500,
            "messages": [{"role": "system", "content": SYSTEM}, {"role": "user", "content": content}]}
    req = urllib.request.Request(url.rstrip("/") + "/chat/completions", data=json.dumps(body).encode(),
                                 headers={"Content-Type": "application/json",
                                          **({"Authorization": f"Bearer {api_key}"} if api_key else {})})
    with urllib.request.urlopen(req, timeout=timeout) as r:
        text = json.load(r)["choices"][0]["message"]["content"] or ""
    s, e = text.find("{"), text.rfind("}")
    if s < 0 or e < s:
        raise ValueError(f"no JSON in reply: {text[:200]!r}")
    out = json.loads(text[s:e + 1])
    out["act"] = str(out.get("act", "")).strip().lower()
    try:
        out["match_confidence"] = float(out.get("match_confidence", 0))
    except (TypeError, ValueError):
        out["match_confidence"] = 0.0
    return out


# ------------------------------------------------------------------ main
def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("video")
    ap.add_argument("funscript")
    ap.add_argument("--vlm-url", default=os.environ.get("VLM_URL", "http://localhost:11434/v1"),
                    help="OpenAI-compatible base URL (Ollama default shown)")
    ap.add_argument("--model", default=os.environ.get("VLM_MODEL", ""), help="model name, e.g. your Gemma 4 tag")
    ap.add_argument("--api-key", default=os.environ.get("VLM_API_KEY", ""))
    ap.add_argument("--frames", type=int, default=6, help="frames per segment sent to the model")
    ap.add_argument("--width", type=int, default=512, help="frame width in pixels")
    ap.add_argument("--window", type=float, default=4.0)
    ap.add_argument("--min-seg", type=float, default=6.0)
    ap.add_argument("--max-seg", type=float, default=40.0)
    ap.add_argument("--acts", help="text file with one act name per line (replaces the default vocabulary)")
    ap.add_argument("--context", default="", help='free text given to the model, e.g. "POV, female performer on top"')
    ap.add_argument("--timeout", type=int, default=300)
    ap.add_argument("--no-vlm", action="store_true", help="only compute motion segments")
    ap.add_argument("--out")
    args = ap.parse_args()

    acts = DEFAULT_ACTS
    if args.acts:
        acts = [l.strip() for l in open(args.acts, encoding="utf-8") if l.strip()]
    out_path = args.out or os.path.splitext(args.video)[0] + ".analysis.json"
    pts = load_funscript(args.funscript)
    if len(pts) < 10:
        sys.exit("funscript has too few actions")
    if not args.no_vlm and not args.model:
        sys.exit("--model is required (or use --no-vlm)")

    previous = {}
    if os.path.exists(out_path):
        try:
            for s in json.load(open(out_path, encoding="utf-8")).get("segments", []):
                if s.get("vlm"):
                    previous[(s["start"], s["end"])] = s["vlm"]
        except Exception:
            pass

    segs = segment(pts, args.window, args.min_seg, args.max_seg)
    print(f"{len(pts)} actions, {len(segs)} segments")
    result = {"version": 1, "video": os.path.basename(args.video), "funscript": os.path.basename(args.funscript),
              "model": args.model, "created": time.strftime("%Y-%m-%d %H:%M:%S"), "segments": []}

    for i, (a, b) in enumerate(segs):
        a, b = round(a, 2), round(b, 2)
        f = features(pts, a, b)
        kfs = keyframes(pts, a, b)
        seg = {"id": i, "start": a, "end": b, "features": f, "shape": shape(f, kfs), "keyframes": kfs,
               "actions": [[int(round((t - a) * 1000)), int(round(p))] for t, p in slice_pts(pts, a, b)],
               "vlm": previous.get((a, b))}
        line = f"[{i + 1}/{len(segs)}] {a:7.1f}-{b:7.1f}s  {seg['shape']:6}  {describe_motion(f)}"
        if not args.no_vlm and not seg["vlm"] and f["strokes_per_min"] > 0:
            try:
                info = pick_frame_times(pts, a, b, args.frames)
                imgs = [grab_frame(args.video, t, args.width) for t, _ in info]
                seg["vlm"] = call_vlm(args.vlm_url, args.model, args.api_key,
                                      build_prompt(a, b, info, f, acts, args.context), imgs, args.timeout)
            except Exception as e:
                print(f"    VLM error: {e}")
        if seg["vlm"]:
            v = seg["vlm"]
            line += f"\n    -> {v.get('act')} / {v.get('position')} (conf {v.get('match_confidence')}): {v.get('description')}"
        print(line)
        result["segments"].append(seg)
        with open(out_path, "w", encoding="utf-8") as fh:   # save as we go so a crash can resume
            json.dump(result, fh)
    print(f"\nwrote {out_path}")
    print("Review/correct the 'vlm' labels in that file if needed, then run build_library.py.")


if __name__ == "__main__":
    main()
