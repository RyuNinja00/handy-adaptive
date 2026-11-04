#!/usr/bin/env python3
"""
build_library.py — merge one or more *.analysis.json files into a motion library
(handy-library.json) that the Handy Adaptive extension imports.

Each act (cowgirl, blowjob, ...) gets typical motion stats plus its best example
clips (keyframes for HAMP playback and, optionally, raw actions for exact playback).

  python build_library.py videos/*.analysis.json -o handy-library.json
"""
import argparse
import glob
import json
import statistics as st
import time
from collections import Counter, defaultdict

ALIASES = {"bj": "blowjob", "hj": "handjob", "doggy": "doggystyle", "doggy style": "doggystyle",
           "reverse cowgirl position": "reverse cowgirl", "cowgirl position": "cowgirl"}


def norm_act(a):
    a = " ".join(str(a or "").lower().replace("_", " ").split())
    return ALIASES.get(a, a)


def med(vals):
    vals = [v for v in vals if v is not None]
    return round(st.median(vals), 1) if vals else 0


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("analyses", nargs="+")
    ap.add_argument("-o", "--out", default="handy-library.json")
    ap.add_argument("--clips-per-act", type=int, default=5)
    ap.add_argument("--min-confidence", type=float, default=0.4, help="drop segments the model was unsure about")
    ap.add_argument("--min-duration", type=float, default=6.0)
    ap.add_argument("--max-actions", type=int, default=400, help="raw actions kept per clip (0 = none)")
    ap.add_argument("--merge", help="existing library to add to")
    args = ap.parse_args()

    files = [f for pat in args.analyses for f in (glob.glob(pat) or [pat])]
    groups = defaultdict(list)
    sources = []
    for path in files:
        d = json.load(open(path, encoding="utf-8"))
        sources.append(d.get("video", path))
        for s in d.get("segments", []):
            v = s.get("vlm") or {}
            act = norm_act(v.get("act"))
            if not act or act == "non-sexual":
                continue
            if v.get("match_confidence", 0) < args.min_confidence or s["features"]["duration"] < args.min_duration:
                continue
            if s["features"]["strokes_per_min"] <= 0:
                continue
            s["_src"] = d.get("video", path)
            groups[act].append(s)

    lib = {"version": 1, "created": time.strftime("%Y-%m-%d %H:%M:%S"), "sources": sources, "acts": {}}
    if args.merge:
        old = json.load(open(args.merge, encoding="utf-8"))
        lib["acts"] = old.get("acts", {})
        lib["sources"] = sorted(set(old.get("sources", [])) | set(sources))

    for act, segs in groups.items():
        F = [s["features"] for s in segs]
        V = [s["vlm"] for s in segs]
        clips = []
        for s in segs:
            v, f = s["vlm"], s["features"]
            score = v.get("match_confidence", 0) * min(f["duration"], 30) / 30
            acts_raw = s.get("actions", [])
            if args.max_actions == 0:
                acts_raw = []
            elif len(acts_raw) > args.max_actions:
                acts_raw = acts_raw[: args.max_actions]
            clips.append({
                "id": f"{s['_src']}#{s['start']}",
                "source": s["_src"], "start": s["start"], "end": s["end"],
                "duration": round(acts_raw[-1][0] / 1000, 2) if acts_raw else f["duration"],
                "label": v.get("label", ""), "description": v.get("description", ""),
                "position": v.get("position", ""), "tracked_motion": v.get("tracked_motion", ""),
                "intensity": v.get("intensity"), "shape": s.get("shape"), "features": f,
                "keyframes": s["keyframes"], "actions": acts_raw, "_score": score,
            })
        clips.sort(key=lambda c: -c["_score"])
        for c in clips:
            c.pop("_score")
        entry = lib["acts"].setdefault(act, {"clips": []})
        existing = {c["id"] for c in entry["clips"]}
        entry["clips"] = (entry["clips"] + [c for c in clips if c["id"] not in existing])[: args.clips_per_act]
        entry["count"] = entry.get("count", 0) + len(segs)
        entry["total_sec"] = round(entry.get("total_sec", 0) + sum(f["duration"] for f in F), 1)
        entry["stats"] = {k: med([f[k] for f in F]) for k in
                          ("strokes_per_min", "amp", "lo", "hi", "speed", "regularity", "pause_frac")}
        entry["stats"]["intensity"] = med([v.get("intensity") for v in V if isinstance(v.get("intensity"), (int, float))])
        entry["positions"] = [p for p, _ in Counter(v.get("position", "") for v in V if v.get("position")).most_common(3)]
        entry["shapes"] = [p for p, _ in Counter(s.get("shape") for s in segs).most_common(2)]

    with open(args.out, "w", encoding="utf-8") as fh:
        json.dump(lib, fh)
    print(f"{'act':22} {'segs':>4} {'sec':>6} {'str/min':>7} {'range':>9} {'speed':>6}  shapes")
    for act, e in sorted(lib["acts"].items(), key=lambda kv: -kv[1]["count"]):
        s = e["stats"]
        print(f"{act[:22]:22} {e['count']:>4} {e['total_sec']:>6} {s['strokes_per_min']:>7} "
              f"{int(s['lo']):>3}-{int(s['hi']):<5} {s['speed']:>6}  {', '.join(e['shapes'])}")
    print(f"\nwrote {args.out} — import it in SillyTavern: Extensions → Handy Adaptive → Import motion library")


if __name__ == "__main__":
    main()
