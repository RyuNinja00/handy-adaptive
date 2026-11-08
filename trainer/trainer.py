#!/usr/bin/env python3
"""
Handy Adaptive trainer — turns (video, .funscript) pairs into a motion library
the SillyTavern extension uses to improvise act-appropriate movement.

Pipeline
  1. analyze : split the script into windows, measure how the stroker moves in
               each one, grab frames from the video, and ask a local vision
               model what act is happening and how the performers' movement
               maps onto the strokes. Writes a cache + an editable review CSV.
  2. (you)   : correct the review CSV and save it as <video>.labels.csv
  3. build   : merge all analyses into motion_library.json (per-act statistics,
               plain-language descriptions and short motion "motifs").
  4. import motion_library.json in the extension settings.

Only needs Python 3.9+ and ffmpeg. The vision model is any OpenAI-compatible
endpoint (Ollama, LM Studio, llama.cpp server, vLLM, ...). Everything runs
locally unless you point --vlm-url at a cloud service.
"""
import argparse
import base64
import csv
import glob
import json
import math
import os
import random
import re
import shutil
import statistics as st
import subprocess
import sys
import time
import urllib.error
import urllib.request

DEFAULT_LABELS = [
    "blowjob", "deepthroat", "handjob", "titjob", "footjob",
    "cowgirl", "reverse_cowgirl", "missionary", "doggy", "standing",
    "teasing", "other",
]
IGNORE_DEFAULT = {"other", "none", "idle", "unknown", ""}
VIDEO_EXT = (".mp4", ".mkv", ".webm", ".mov", ".avi", ".m4v", ".wmv")


# ----------------------------------------------------------------- funscript
def load_funscript(path):
    with open(path, encoding="utf-8") as f:
        data = json.load(f)
    acts = sorted(
        ({"at": int(a["at"]), "pos": float(a["pos"])} for a in data.get("actions", [])),
        key=lambda a: a["at"],
    )
    rng = float(data.get("range", 100) or 100)
    inv = bool(data.get("inverted", False))
    out, last_at = [], None
    for a in acts:
        p = max(0.0, min(100.0, a["pos"] * 100.0 / rng))
        if inv:
            p = 100.0 - p
        if a["at"] == last_at:
            out[-1] = (a["at"], p)
        else:
            out.append((a["at"], p))
        last_at = a["at"]
    return out


def extrema(points):
    """Reduce a script to turning points (stroke ends) and hold endpoints."""
    if len(points) < 3:
        return list(points)
    out, prev_dir = [points[0]], None
    for i in range(1, len(points)):
        d = points[i][1] - points[i - 1][1]
        dirn = (d > 0.5) - (d < -0.5)
        if prev_dir is not None and dirn != prev_dir and out[-1] != points[i - 1]:
            out.append(points[i - 1])
        prev_dir = dirn
    if out[-1] != points[-1]:
        out.append(points[-1])
    return out


def slice_points(ext, start_ms, end_ms):
    return [p for p in ext if start_ms <= p[0] <= end_ms]


# ----------------------------------------------------------------- features
def features(ext, start_ms, end_ms):
    """Describe how the device moves over a span of turning points."""
    total = max(1.0, (end_ms - start_ms) / 1000.0)
    moves, ups, downs, pause_ms = [], [], [], 0.0
    for (t0, p0), (t1, p1) in zip(ext, ext[1:]):
        dt, dp = t1 - t0, p1 - p0
        if dt <= 0:
            continue
        if abs(dp) < 5:
            if dt > 250:
                pause_ms += dt
            continue
        moves.append((dt, abs(dp), (p0 + p1) / 2, max(p0, p1), min(p0, p1)))
        (ups if dp > 0 else downs).append(dt)
    if len(moves) < 2:
        return None
    durs = [m[0] for m in moves]
    amps = [m[1] for m in moves]
    move_s = sum(durs) / 1000.0
    w = sum(durs)
    center = sum(m[2] * m[0] for m in moves) / w
    half = len(moves) // 2
    r1 = (half / 2) / max(0.001, sum(durs[:half]) / 1000.0) if half else 0
    r2 = ((len(moves) - half) / 2) / max(0.001, sum(durs[half:]) / 1000.0)
    return {
        "seconds": round(total, 2),
        "rate": round((len(moves) / 2) / max(0.001, move_s), 3),         # full strokes / s while moving
        "amp": round(st.mean(amps), 2),
        "amp_std": round(st.pstdev(amps), 2),
        "center": round(center, 2),                                        # 100 = tip/top, 0 = base
        "top": round(st.mean(m[3] for m in moves), 2),
        "bottom": round(st.mean(m[4] for m in moves), 2),
        "irregularity": round(st.pstdev(durs) / max(1.0, st.mean(durs)), 3),
        "asym": round((st.mean(ups) / st.mean(downs)) if ups and downs else 1.0, 3),  # up-stroke time / down-stroke time
        "velocity": round(st.mean(a / (d / 1000.0) for d, a, *_ in moves), 1),  # %/s
        "pause_frac": round(min(1.0, pause_ms / 1000.0 / total), 3),
        "trend": round((r2 - r1) / max(0.1, (r1 + r2) / 2), 3) if half else 0.0,
    }


def describe(f):
    """Plain-language description of a feature dict (for prompts and humans)."""
    if not f:
        return "almost no movement"
    speed = ("very slow" if f["rate"] < 0.7 else "slow" if f["rate"] < 1.3 else
             "moderate" if f["rate"] < 2.2 else "fast" if f["rate"] < 3.2 else "very fast")
    length = ("tiny" if f["amp"] < 20 else "short" if f["amp"] < 40 else
              "medium" if f["amp"] < 65 else "long" if f["amp"] < 85 else "full-length")
    zone = ("near the tip" if f["center"] > 65 else "near the base" if f["center"] < 35 else "around the middle")
    bits = [f"{speed} ({f['rate']:.1f} strokes/s), {length} strokes {zone} (range ~{f['bottom']:.0f}-{f['top']:.0f})"]
    bits.append("irregular, organic rhythm" if f["irregularity"] > 0.35 else
                "somewhat varied rhythm" if f["irregularity"] > 0.18 else "very steady rhythm")
    if f["asym"] > 1.3:
        bits.append("slow on the way up, quick on the way down")
    elif f["asym"] < 0.77:
        bits.append("quick on the way up, slow on the way down")
    if f["pause_frac"] > 0.15:
        bits.append("frequent pauses/holds")
    if f["amp_std"] > 15:
        bits.append("stroke length changes a lot")
    if f["trend"] > 0.25:
        bits.append("speeding up")
    elif f["trend"] < -0.25:
        bits.append("slowing down")
    return "; ".join(bits)


# ----------------------------------------------------------------- video + VLM
def grab_frame(video, t_sec, width):
    cmd = ["ffmpeg", "-loglevel", "error", "-ss", f"{t_sec:.2f}", "-i", video,
           "-frames:v", "1", "-vf", f"scale={width}:-2", "-q:v", "5",
           "-f", "image2pipe", "-vcodec", "mjpeg", "-"]
    try:
        r = subprocess.run(cmd, capture_output=True, timeout=60)
        return r.stdout if r.returncode == 0 and r.stdout else None
    except (OSError, subprocess.TimeoutExpired):
        return None


def vlm_query(args, frames, start, end, feat, labels):
    prompt = (
        f"These {len(frames)} frames are in time order from {start:.0f}s to {end:.0f}s of an adult video "
        f"between consenting adult performers. A hand-made script drives a male stroker toy in sync with it. "
        f"During this exact span the toy moves like this: {describe(feat)}.\n\n"
        f"Allowed act labels: {', '.join(labels)}.\n"
        "Look at how the performers' bodies move and relate it to that stroke pattern. "
        "Reply with ONLY a JSON object, no prose:\n"
        '{"act": "<one allowed label>", "position": "<short body position>", '
        '"who_moves": "<who is doing the moving>", '
        '"movement": "<1-2 sentences: how the bodies/head/hands/hips move>", '
        '"correspondence": "<1-2 sentences: how that motion maps onto the stroke pattern, e.g. what a deep stroke, '
        'a short flick, a pause or a speed change corresponds to>", '
        '"confidence": <0.0-1.0>}\n'
        'Use "other" if nothing in the list fits or nothing sexual is happening.'
    )
    content = [{"type": "text", "text": prompt}] + [
        {"type": "image_url", "image_url": {"url": "data:image/jpeg;base64," + base64.b64encode(fr).decode()}}
        for fr in frames
    ]
    system = ("You label adult video segments to train motion software for an adult toy. "
              "Be factual and concise. Output valid JSON only.")
    return parse_vlm(chat(args, system, content), labels)


class VLMError(Exception):
    def __init__(self, status, message):
        super().__init__(f"HTTP {status}: {message}" if status else message)
        self.status, self.message = status, message


def chat(args, system, content, max_tokens=500):
    """POST one chat request. Raises VLMError carrying the server's own error text."""
    if getattr(args, "no_system", False):          # some chat templates reject a system message
        messages = [{"role": "user", "content": [{"type": "text", "text": system}] + content}]
    else:
        messages = [{"role": "system", "content": system}, {"role": "user", "content": content}]
    body = {"model": args.model, "messages": messages, "temperature": 0.2, "max_tokens": max_tokens}
    req = urllib.request.Request(
        args.vlm_url.rstrip("/") + "/chat/completions", data=json.dumps(body).encode(),
        headers={"Content-Type": "application/json",
                 **({"Authorization": f"Bearer {args.api_key}"} if args.api_key else {})})
    for attempt in range(3):
        try:
            with urllib.request.urlopen(req, timeout=args.timeout) as r:
                return json.load(r)["choices"][0]["message"]["content"] or ""
        except urllib.error.HTTPError as e:
            raw = e.read().decode("utf-8", "replace")
            try:
                j = json.loads(raw)
                err = j.get("error")
                msg = err.get("message") if isinstance(err, dict) else (err or j.get("message") or raw)
            except ValueError:
                msg = raw
            msg = str(msg).strip()[:500] or e.reason
            if 400 <= e.code < 500 or attempt == 2:       # a bad request won't fix itself by retrying
                raise VLMError(e.code, msg) from None
        except (urllib.error.URLError, OSError, ValueError, KeyError, IndexError) as e:
            if attempt == 2:
                raise VLMError(0, str(getattr(e, "reason", e))) from None
        time.sleep(2 * (attempt + 1))


def explain(err):
    """Plain-language diagnosis of a model server error."""
    m = (err.message if isinstance(err, VLMError) else str(err)).lower()
    if any(k in m for k in ("image", "vision", "multimodal", "mmproj", "multi-modal", "clip")):
        return ("The loaded model can't read images. In LM Studio, load a model with the yellow eye /\n"
                "    'Vision' badge (e.g. a Qwen3-VL or Gemma vision build). Some downloads need the\n"
                "    separate mmproj (vision) file too: on the model's download page, get the variant\n"
                "    marked Vision, or download the mmproj file next to the model.")
    if any(k in m for k in ("context", "n_ctx", "too long", "exceed", "tokens to keep", "overflow")):
        return ("The request is bigger than the model's context length. In LM Studio's Developer tab,\n"
                "    open the loaded model's settings, set Context Length to 8192 (or 16384), and reload it.")
    if any(k in m for k in ("template", "jinja", "role", "system")):
        return "The model's chat template rejected the message format (the trainer adjusts for this automatically)."
    if any(k in m for k in ("not found", "no model", "not loaded", "model")):
        return ("The model name doesn't match a loaded model. Load the model in LM Studio and pick it\n"
                "    from the list (guided mode), or copy its exact API identifier for --model.")
    if isinstance(err, VLMError) and err.status == 0:
        return "Can't reach the model server. Is LM Studio's server Status set to Running?"
    return "See the server message above. LM Studio's Developer tab log shows more detail."


TEST_JPEG = base64.b64decode(  # 64x64 grey JPEG, so the self-test needs no ffmpeg
    "/9j/4AAQSkZJRgABAgAAAQABAAD//gAQTGF2YzYwLjMxLjEwMgD/2wBDAAgKCgsKCw0NDQ0NDRAPEBAQEBAQEBAQEBASEhIVFRUS"
    "EhIQEBISFBQVFRcXFxUVFRUXFxkZGR4eHBwjIyQrKzP/xABKAAEAAAAAAAAAAAAAAAAAAAAAAQEAAAAAAAAAAAAAAAAAAAAAEAEA"
    "AAAAAAAAAAAAAAAAAAAAEQEAAAAAAAAAAAAAAAAAAAAA/8AAEQgAQABAAwEiAAIRAAMRAP/aAAwDAQACEQMRAD8AAAAAAAAAAAAA"
    "AAAAAAAAAAAAAAAAAAAA/9k=")


def self_test(args):
    """One small request to check the server + model accept images. Returns None if OK, else the error."""
    content = [{"type": "text", "text": 'This is a connection test. Reply with exactly: {"ok": true}'},
               {"type": "image_url", "image_url": {"url": "data:image/jpeg;base64," + base64.b64encode(TEST_JPEG).decode()}}]
    for _ in range(2):
        try:
            chat(args, "You are a helpful assistant.", content, max_tokens=20)
            return None
        except VLMError as e:
            m = e.message.lower()
            if not getattr(args, "no_system", False) and any(k in m for k in ("template", "jinja", "role", "system")):
                args.no_system = True
                continue
            return e
    return None


def report(err):
    print(f"\n! The model server returned an error:\n    {err}", file=sys.stderr)
    print(f"  What it means:\n    {explain(err)}\n", file=sys.stderr)


def norm_label(s, labels):
    s = re.sub(r"[\s\-]+", "_", str(s or "").strip().lower())
    if s in labels:
        return s
    for l in labels:
        if l in s or s in l:
            return l
    return "other"


def parse_vlm(text, labels):
    m = re.search(r"\{.*\}", text or "", re.S)
    if not m:
        return {"act": "other", "confidence": 0.0, "notes": (text or "")[:300], "position": "", "who_moves": ""}
    try:
        d = json.loads(m.group(0))
    except json.JSONDecodeError:
        d = {}
        for k in ("act", "position", "who_moves", "movement", "correspondence"):
            mm = re.search(rf'"{k}"\s*:\s*"([^"]*)"', m.group(0))
            if mm:
                d[k] = mm.group(1)
        mm = re.search(r'"confidence"\s*:\s*([0-9.]+)', m.group(0))
        d["confidence"] = float(mm.group(1)) if mm else 0.3
    notes = " ".join(x for x in (d.get("movement", ""), d.get("correspondence", "")) if x).strip()
    try:
        conf = float(d.get("confidence", 0.5))
    except (TypeError, ValueError):
        conf = 0.5
    return {
        "act": norm_label(d.get("act"), labels),
        "confidence": max(0.0, min(1.0, conf)),
        "position": str(d.get("position", ""))[:80],
        "who_moves": str(d.get("who_moves", ""))[:80],
        "notes": notes[:600],
    }


# ----------------------------------------------------------------- labels csv
def parse_time(s):
    s = str(s).strip()
    if ":" in s:
        sec = 0.0
        for part in s.split(":"):
            sec = sec * 60 + float(part)
        return sec
    return float(s)


def fmt_time(sec):
    m, s = divmod(sec, 60)
    return f"{int(m)}:{s:05.2f}"


def load_labels_csv(path, labels):
    rows = []
    with open(path, newline="", encoding="utf-8") as f:
        for r in csv.DictReader(f):
            try:
                rows.append({
                    "start": parse_time(r["start"]), "end": parse_time(r["end"]),
                    # your labels are authoritative: new act names are allowed
                    "act": re.sub(r"[\s\-]+", "_", str(r.get("act") or "").strip().lower()) or "other",
                    "notes": (r.get("notes") or "").strip(),
                    "position": (r.get("position") or "").strip(),
                })
            except (KeyError, ValueError):
                continue
    return rows


def best_row(rows, s, e):
    best, ov = None, 0.0
    for r in rows:
        o = min(e, r["end"]) - max(s, r["start"])
        if o > ov:
            best, ov = r, o
    return best if ov >= (e - s) * 0.4 else None


# ----------------------------------------------------------------- analyze
def find_script(video):
    stem = os.path.splitext(video)[0]
    for cand in (stem + ".funscript", stem + ".Funscript"):
        if os.path.exists(cand):
            return cand
    hits = glob.glob(glob.escape(stem) + "*.funscript")
    return hits[0] if hits else None


def query_window(args, video, s, e, feat, labels):
    """Ask the model about one window. If the server rejects the request as too big,
    step down to fewer/smaller frames and remember what works for later windows."""
    ladder = [(args.frames, args.width), (min(args.frames, 3), 512), (2, 448), (1, 384)]
    ladder = [x for i, x in enumerate(ladder) if x not in ladder[:i]]
    level = getattr(args, "vlm_level", 0)
    while level < len(ladder):
        n, width = ladder[level]
        times = [s + (e - s) * (i + 0.5) / n for i in range(n)]
        frames = [fr for fr in (grab_frame(video, x, width) for x in times) if fr]
        if not frames:
            print(f"  ! could not read frames at {fmt_time(s)} (is ffmpeg installed? is the video readable?)")
            return None
        print(f"  {fmt_time(s)}-{fmt_time(e)}  asking VLM ({len(frames)} frame{'s' if len(frames) > 1 else ''})...",
              end="", flush=True)
        try:
            vlm = vlm_query(args, frames, s, e, feat, labels)
            print(f" {vlm['act']}")
            return vlm
        except VLMError as err:
            print(" failed")
            m = err.message.lower()
            too_big = err.status in (400, 413) and not any(
                k in m for k in ("image", "vision", "multimodal", "mmproj", "not found", "no model", "not loaded"))
            if too_big and level + 1 < len(ladder):
                level += 1
                args.vlm_level = level
                print(f"    server rejected it ({err.message[:120]}); retrying with "
                      f"{ladder[level][0]} smaller frame(s)")
                if not getattr(args, "ctx_tip", False):
                    args.ctx_tip = True
                    print("    Tip: for better accuracy, raise Context Length to 8192+ in LM Studio's model\n"
                          "    settings (Developer tab), reload the model, and run this again.")
                continue
            report(err)
            raise SystemExit(1)
    return None


def analyze(args, video, script):
    labels = [norm_label(l, [l]) for l in (args.labels.split(",") if args.labels else DEFAULT_LABELS)]
    if "other" not in labels:
        labels.append("other")
    stem = os.path.splitext(os.path.basename(video))[0]
    os.makedirs(args.cache, exist_ok=True)
    cache_path = os.path.join(args.cache, stem + ".analysis.json")
    cached = {}
    if os.path.exists(cache_path):
        with open(cache_path, encoding="utf-8") as f:
            for w in json.load(f).get("windows", []):
                if w.get("vlm"):
                    cached[round(w["start"], 2)] = w["vlm"]

    pts = load_funscript(script)
    if len(pts) < 4:
        print(f"  ! {script} has too few actions, skipping")
        return None
    ext = extrema(pts)
    labels_path = args.labels_csv or os.path.splitext(video)[0] + ".labels.csv"
    manual = load_labels_csv(labels_path, labels) if os.path.exists(labels_path) else None
    if manual:
        print(f"  using your labels from {labels_path}")
    elif not args.vlm_url:
        print("  ! no --vlm-url and no labels csv; nothing to label with")
        return None

    first, last = ext[0][0] / 1000.0, ext[-1][0] / 1000.0
    windows, t = [], first
    while t < last:
        s, e = t, min(t + args.window, last)
        t += args.window
        span = slice_points(ext, s * 1000, e * 1000)
        feat = features(span, s * 1000, e * 1000)
        w = {"start": round(s, 2), "end": round(e, 2), "features": feat,
             "strokes": [[int(a), round(p, 1)] for a, p in span]}
        if feat is None:
            w.update(act="idle", confidence=1.0, notes="", source="auto")
            windows.append(w)
            continue
        vlm = cached.get(round(s, 2))
        need_vlm = args.vlm_url and not vlm and (not manual or args.vlm_notes)
        if need_vlm:
            vlm = query_window(args, video, s, e, feat, labels)
        w["vlm"] = vlm
        row = best_row(manual, s, e) if manual else None
        if row:
            w.update(act=row["act"], confidence=1.0, source="manual",
                     notes=row["notes"] or (vlm or {}).get("notes", ""),
                     position=row["position"] or (vlm or {}).get("position", ""))
        elif vlm:
            w.update(act=vlm["act"], confidence=vlm["confidence"], source="vlm",
                     notes=vlm["notes"], position=vlm.get("position", ""))
        else:
            w.update(act="unknown", confidence=0.0, notes="", source="none")
        windows.append(w)

    result = {"video": os.path.abspath(video), "script": os.path.abspath(script),
              "window": args.window, "labels": labels, "windows": windows}
    with open(cache_path, "w", encoding="utf-8") as f:
        json.dump(result, f, indent=1)

    review = os.path.join(args.cache, stem + ".review.csv")
    with open(review, "w", newline="", encoding="utf-8") as f:
        wr = csv.writer(f)
        wr.writerow(["start", "end", "act", "confidence", "position", "notes", "motion"])
        for w in merge_windows(windows, ignore=set()):
            wr.writerow([fmt_time(w["start"]), fmt_time(w["end"]), w["act"], f"{w['confidence']:.2f}",
                         w.get("position", ""), w.get("notes", ""), describe(w.get("features"))])
    counts = {}
    for w in windows:
        counts[w["act"]] = counts.get(w["act"], 0) + (w["end"] - w["start"])
    print("  labelled time: " + ", ".join(f"{k} {v:.0f}s" for k, v in sorted(counts.items(), key=lambda x: -x[1])))
    print(f"  review/correct: {review}  ->  save as {os.path.splitext(video)[0]}.labels.csv")
    return cache_path


def merge_windows(windows, ignore):
    """Join consecutive windows with the same act into segments."""
    segs = []
    for w in windows:
        if w["act"] in ignore:
            continue
        if segs and segs[-1]["act"] == w["act"] and abs(segs[-1]["end"] - w["start"]) < 0.05:
            s = segs[-1]
            s["end"] = w["end"]
            s["strokes"] = s["strokes"] + [p for p in w["strokes"] if not s["strokes"] or p[0] > s["strokes"][-1][0]]
            s["confidence"] = min(s["confidence"], w["confidence"])
            if w.get("notes") and w["notes"] not in s["notes_all"]:
                s["notes_all"].append(w["notes"])
        else:
            segs.append({**w, "strokes": list(w["strokes"]), "notes_all": [w["notes"]] if w.get("notes") else []})
    for s in segs:
        s["features"] = features([tuple(p) for p in s["strokes"]], s["start"] * 1000, s["end"] * 1000)
        s["notes"] = " / ".join(s["notes_all"][:2])
    return segs


# ----------------------------------------------------------------- build
def cut_motifs(seg, src_id, rng):
    """Chop a segment into short stroke phrases (3-8 s) that start/end on turning points."""
    pts = [tuple(p) for p in seg["strokes"]]
    motifs, i = [], 0
    while i < len(pts) - 3:
        target = rng.uniform(3000, 8000)
        j = i + 1
        while j < len(pts) and pts[j][0] - pts[i][0] < target:
            j += 1
        if j >= len(pts):
            break
        chunk = pts[i:j + 1]
        f = features(chunk, chunk[0][0], chunk[-1][0])
        if f and len(chunk) >= 4:
            motifs.append({
                "id": f"{src_id}@{chunk[0][0]}",
                "rate": f["rate"], "amp": f["amp"], "center": f["center"],
                "start": round(chunk[0][1], 1),
                "strokes": [[int(b[0] - a[0]), round(b[1], 1)] for a, b in zip(chunk, chunk[1:])],
            })
        i = j
    return motifs


def wstat(vals, weights):
    tw = sum(weights) or 1.0
    m = sum(v * w for v, w in zip(vals, weights)) / tw
    sd = math.sqrt(sum(w * (v - m) ** 2 for v, w in zip(vals, weights)) / tw)
    return {"mean": round(m, 3), "std": round(sd, 3)}


def summarize_notes(args, act, notes, motion):
    if not args.summary_url or not notes:
        return None
    body = {"model": args.summary_model or args.model, "temperature": 0.3, "max_tokens": 220, "messages": [
        {"role": "system", "content": "You write compact movement notes for software that drives an adult stroker toy."},
        {"role": "user", "content":
            f"Act: {act}. Measured toy motion: {motion}.\nObservations from many video clips:\n- " +
            "\n- ".join(notes[:40]) +
            "\n\nIn 2-3 sentences, describe how this act typically moves (rhythm, depth, speed changes, pauses) and "
            "how that should translate into stroker motion. No preamble."}]}
    req = urllib.request.Request(args.summary_url.rstrip("/") + "/chat/completions", data=json.dumps(body).encode(),
                                 headers={"Content-Type": "application/json",
                                          **({"Authorization": f"Bearer {args.api_key}"} if args.api_key else {})})
    try:
        with urllib.request.urlopen(req, timeout=args.timeout) as r:
            return json.load(r)["choices"][0]["message"]["content"].strip()[:700]
    except Exception as e:  # noqa: BLE001
        print(f"  ! summary for {act} failed: {e}", file=sys.stderr)
        return None


def build(args):
    rng = random.Random(42)
    ignore = IGNORE_DEFAULT | set(x.strip().lower() for x in (args.ignore or "").split(",") if x.strip())
    files = []
    for p in args.analyses:
        files += glob.glob(os.path.join(p, "*.analysis.json")) if os.path.isdir(p) else glob.glob(p)
    if not files:
        sys.exit("no *.analysis.json files given")
    per_act = {}
    for path in files:
        with open(path, encoding="utf-8") as f:
            a = json.load(f)
        src = os.path.splitext(os.path.basename(a["video"]))[0]
        for seg in merge_windows(a["windows"], ignore):
            if seg["confidence"] < args.min_confidence or not seg["features"] or seg["features"]["seconds"] < 4:
                continue
            per_act.setdefault(seg["act"], []).append((src, seg))

    lib = {"version": 1, "created": time.strftime("%Y-%m-%d %H:%M"), "sources": len(files), "acts": {}}
    for act, segs in sorted(per_act.items()):
        fs = [s["features"] for _, s in segs]
        wts = [f["seconds"] for f in fs]
        entry = {k: wstat([f[k] for f in fs], wts) for k in ("rate", "amp", "center", "top", "bottom", "velocity")}
        for k in ("irregularity", "asym", "pause_frac", "amp_std"):
            entry[k] = wstat([f[k] for f in fs], wts)["mean"]
        entry["seconds"] = round(sum(wts), 1)
        entry["segments"] = len(segs)
        entry["videos"] = len({src for src, _ in segs})
        entry["positions"] = sorted({s.get("position", "") for _, s in segs if s.get("position")})[:6]
        mean_feat = {k: (v["mean"] if isinstance(v, dict) else v) for k, v in entry.items()
                     if k in ("rate", "amp", "center", "top", "bottom", "irregularity", "asym", "pause_frac", "amp_std")}
        mean_feat.update(trend=0, seconds=entry["seconds"], velocity=entry["velocity"]["mean"])
        entry["motion"] = describe(mean_feat)
        notes = [n for _, s in sorted(segs, key=lambda x: -x[1]["confidence"]) for n in s["notes_all"] if n]
        entry["notes"] = notes[:5]
        entry["description"] = summarize_notes(args, act, notes, entry["motion"]) or (notes[0] if notes else "")
        # motifs, round-robin across sources for diversity
        pools = {}
        for src, s in segs:
            # seeded per source segment so phrase IDs (and your ratings of them)
            # stay stable when other videos are added to the library later
            seg_rng = random.Random(f"{src}@{s['start']}")
            pools.setdefault(src, []).extend(cut_motifs(s, src, seg_rng))
        for p in pools.values():
            rng.shuffle(p)
        motifs, keys = [], list(pools)
        while len(motifs) < args.max_motifs and any(pools.values()):
            for k in keys:
                if pools[k] and len(motifs) < args.max_motifs:
                    motifs.append(pools[k].pop())
        entry["motifs"] = motifs
        lib["acts"][act] = entry

    with open(args.out, "w", encoding="utf-8") as f:
        json.dump(lib, f, separators=(",", ":"))
    print(f"\nWrote {args.out} ({os.path.getsize(args.out) / 1024:.0f} KB) from {len(files)} video(s)\n")
    print(f"{'act':<18}{'time':>7}{'vids':>6}{'motifs':>8}  motion")
    for act, e in lib["acts"].items():
        print(f"{act:<18}{e['seconds']:>6.0f}s{e['videos']:>6}{len(e['motifs']):>8}  {e['motion']}")
    thin = [a for a, e in lib["acts"].items() if e["seconds"] < 120]
    if thin:
        print(f"\nTip: {', '.join(thin)} have under 2 minutes of examples; add more for better variety.")



# ----------------------------------------------------------------- guided mode
SERVERS = [("LM Studio", "http://localhost:1234/v1"), ("Ollama", "http://localhost:11434/v1"),
           ("llama.cpp", "http://localhost:8080/v1"), ("KoboldCpp", "http://localhost:5001/v1")]


def list_models(url, api_key=""):
    req = urllib.request.Request(url.rstrip("/") + "/models",
                                 headers={"Authorization": f"Bearer {api_key}"} if api_key else {})
    with urllib.request.urlopen(req, timeout=3) as r:
        return [m.get("id") for m in json.load(r).get("data", []) if m.get("id")]


def ask(prompt, default=""):
    try:
        v = input(f"{prompt}{f' [{default}]' if default else ''}: ").strip().strip('"')
    except EOFError:
        v = ""
    return v or default


def run_analyze(args, inputs):
    vids = []
    for p in inputs:
        if os.path.isdir(p):
            vids += sorted(f for f in glob.glob(os.path.join(p, "*")) if f.lower().endswith(VIDEO_EXT))
        else:
            vids.append(p)
    done = 0
    for v in vids:
        s = args.script if getattr(args, "script", None) and len(vids) == 1 else find_script(v)
        if not s:
            print(f"- {os.path.basename(v)}: no matching .funscript (needs the same name), skipping")
            continue
        print(f"- {os.path.basename(v)}  +  {os.path.basename(s)}")
        if analyze(args, v, s):
            done += 1
    return done


def wizard():
    root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    print("=" * 64)
    print(" Handy Adaptive trainer: guided mode")
    print(" (advanced users: run  python trainer.py --help  for options)")
    print("=" * 64)

    if not shutil.which("ffmpeg"):
        print("\n! ffmpeg was not found. Install it first:")
        print("    Windows:  winget install Gyan.FFmpeg   (then open a NEW window)")
        print("    macOS:    brew install ffmpeg")
        print("    Linux:    sudo apt install ffmpeg")
        return

    # 1. training folder
    default_dir = os.path.join(root, "training")
    print("\nStep 1/4  Training folder")
    print("  Put each video next to its .funscript with the SAME name, e.g.")
    print("  scene01.mp4 + scene01.funscript")
    while True:
        folder = os.path.abspath(ask("  Folder with your videos", default_dir))
        if not os.path.isdir(folder):
            if folder == default_dir and ask(f"  {folder} doesn't exist. Create it? (y/n)", "y").lower().startswith("y"):
                os.makedirs(folder)
                print(f"  Created. Copy your videos + funscripts into it, then run this again.")
                return
            print("  That folder doesn't exist, try again.")
            continue
        vids = [f for f in sorted(os.listdir(folder)) if f.lower().endswith(VIDEO_EXT)]
        pairs = [v for v in vids if find_script(os.path.join(folder, v))]
        print(f"  Found {len(vids)} video(s), {len(pairs)} with a matching .funscript.")
        for v in vids:
            print(f"    {'OK ' if v in pairs else '-- no script:'} {v}")
        if pairs:
            break
        print("  No usable pairs. Check the names match, then try again.")

    # 2. model server
    print("\nStep 2/4  Vision model")
    url, models = None, []
    for name, u in SERVERS:
        try:
            models = list_models(u)
            url = u
            print(f"  Found {name} at {u}")
            break
        except Exception:  # noqa: BLE001
            continue
    if not url:
        print("  No model server found. In LM Studio: open the Developer tab (green >_ icon),")
        print("  load your vision model, and switch the server Status to Running.")
        u = ask("  Server URL (or press Enter to skip the vision model and use only your own labels)", "")
        if u:
            url = u.rstrip("/") + ("" if u.rstrip("/").endswith("/v1") else "/v1")
            try:
                models = list_models(url)
            except Exception as e:  # noqa: BLE001
                print(f"  ! Couldn't reach {url}: {e}")
                return
    model = ""
    if url:
        models = [m for m in models if "embed" not in m.lower()]
        if not models:
            print("  The server has no models available. Load your vision model and run this again.")
            return
        print("  Models:")
        for i, m in enumerate(models, 1):
            print(f"    {i}. {m}")
        while not model:
            c = ask("  Pick your VISION model (number)", "1" if len(models) == 1 else "")
            if c.isdigit() and 1 <= int(c) <= len(models):
                model = models[int(c) - 1]
        print(f"  Using {model}")

    # 3. analyze
    cache = os.path.join(root, "handy_cache")
    args = argparse.Namespace(
        script=None, labels_csv=None, labels=None, window=10.0, frames=4, width=640, vlm_notes=False,
        cache=cache, vlm_url=url or "", model=model, api_key="", timeout=300)
    if url:
        print("  Testing that the model accepts images...", end="", flush=True)
        err = self_test(args)
        if err:
            print(" problem")
            report(err)
            return
        print(" OK")

    print("\nStep 3/4  Analyzing")
    print("  This asks the model about every 10 s of video, so it can take a while.")
    print("  You can stop with Ctrl+C and run this again later: finished parts are saved.\n")
    if not run_analyze(args, [folder]):
        print("\nNothing was analyzed. If you skipped the vision model, every video needs a")
        print("<video>.labels.csv first (see docs/USER_GUIDE.md, Part 10).")
        return
    print("\n" + "-" * 64)
    print("  Now CHECK the labels before building:")
    print(f"  1. Open the .review.csv files in {cache}")
    print("  2. Fix any wrong 'act' values (use 'other' to leave a part out)")
    print(f"  3. Save each as <video name>.labels.csv inside {folder}")
    print("  4. Run this again: it will use your corrections.")
    print("-" * 64)
    if not ask("\nBuild the motion library now anyway? (y/n)", "n").lower().startswith("y"):
        print("\nOK. Run this again after checking the labels.")
        return

    # 4. build
    print("\nStep 4/4  Building")
    out = os.path.join(root, "motion_library.json")
    build(argparse.Namespace(analyses=[cache], out=out, min_confidence=0.5, max_motifs=40, ignore=None,
                             summary_url="", summary_model="", model=model, api_key="", timeout=300))
    print(f"\nDone! Import this file in SillyTavern (Extensions > Handy Adaptive >")
    print(f"Import motion_library.json):\n  {out}")


# ----------------------------------------------------------------- cli
def main():
    if len(sys.argv) == 1:
        try:
            wizard()
        except KeyboardInterrupt:
            print("\nStopped. Run again to continue where you left off.")
        return
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = ap.add_subparsers(dest="cmd", required=True)

    def vlm_opts(p):
        p.add_argument("--vlm-url", default=os.environ.get("VLM_URL", "http://localhost:11434/v1"),
                       help="OpenAI-compatible base URL (default: Ollama). Use '' to disable.")
        p.add_argument("--model", default=os.environ.get("VLM_MODEL", "gemma4"), help="vision model name as your server lists it (e.g. `ollama list`)")
        p.add_argument("--api-key", default=os.environ.get("VLM_API_KEY", ""))
        p.add_argument("--timeout", type=int, default=300)

    a = sub.add_parser("analyze", help="analyze video(s) + funscript(s)")
    a.add_argument("inputs", nargs="+", help="video files or folders (script found by same name)")
    a.add_argument("--script", help="funscript path (single video only)")
    a.add_argument("--labels-csv", help="your corrected labels (default: <video>.labels.csv)")
    a.add_argument("--labels", help="comma-separated act vocabulary (default: built-in list)")
    a.add_argument("--window", type=float, default=10.0, help="seconds per analysis window")
    a.add_argument("--frames", type=int, default=4, help="frames sent to the VLM per window")
    a.add_argument("--width", type=int, default=640, help="frame width sent to the VLM")
    a.add_argument("--vlm-notes", action="store_true", help="still query the VLM for notes when labels csv exists")
    a.add_argument("--cache", default="handy_cache")
    vlm_opts(a)

    b = sub.add_parser("build", help="merge analyses into motion_library.json")
    b.add_argument("analyses", nargs="*", default=["handy_cache"])
    b.add_argument("--out", default="motion_library.json")
    b.add_argument("--min-confidence", type=float, default=0.5)
    b.add_argument("--max-motifs", type=int, default=40, help="per act")
    b.add_argument("--ignore", help="extra acts to leave out")
    b.add_argument("--summary-url", default="", help="OpenAI-compatible URL for condensing notes (optional)")
    b.add_argument("--summary-model", default="")
    vlm_opts(b)

    args = ap.parse_args()
    if args.cmd == "analyze":
        if args.vlm_url:
            print(f"Checking the model server at {args.vlm_url} (model: {args.model})...")
            err = self_test(args)
            if err:
                report(err)
                try:
                    names = list_models(args.vlm_url, args.api_key)
                    if names:
                        print("  Models this server offers: " + ", ".join(names))
                except Exception:  # noqa: BLE001
                    pass
                sys.exit(1)
            print("  OK\n")
        run_analyze(args, args.inputs)
        print("\nNext: fix the review CSVs, then run:  python trainer.py build")
    else:
        build(args)


if __name__ == "__main__":
    main()
