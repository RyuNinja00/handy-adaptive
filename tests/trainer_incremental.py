#!/usr/bin/env python3
"""Incremental training: train a batch, delete its videos, train the next batch, rebuild.

Checks that earlier training is kept and added to:
  - a deleted video's analysis stays in the cache and is still built into the library;
  - a NEW video with the SAME file name as an old one gets its own analysis
    (no overwrite, and the old video's vision-model answers are not reused);
  - re-running on the same files asks the vision model nothing new;
  - analyses saved by older trainer versions (no fingerprint) are still recognised;
  - rebuilding keeps phrases from the previous library (a fair share per video)
    while adding new videos' phrases;
  - phrases rated in an exported taste profile: liked ones always kept, rejected ones left out.
Needs python3 + ffmpeg.
"""
import http.server
import json
import os
import random
import shutil
import subprocess
import sys
import tempfile
import threading

HERE = os.path.dirname(os.path.abspath(__file__))
TRAINER = os.path.join(HERE, "..", "trainer", "trainer.py")
calls = {"n": 0}


class VLM(http.server.BaseHTTPRequestHandler):
    def do_POST(self):
        b = json.loads(self.rfile.read(int(self.headers["Content-Length"])))
        text = json.dumps(b)
        if "connection test" not in text:
            calls["n"] += 1
        # label by the window's time span in the prompt: first half blowjob, second half handjob
        import re
        m = re.search(r"from (\d+)s to", text)
        act = "blowjob" if m and int(m.group(1)) < 30 else "handjob"
        out = json.dumps({"choices": [{"message": {"content": json.dumps(
            {"act": act, "position": "x", "who_moves": "her", "movement": "m", "correspondence": "c", "confidence": 0.9})}}]}).encode()
        self.send_response(200); self.send_header("Content-Type", "application/json"); self.end_headers(); self.wfile.write(out)

    def log_message(self, *a):
        pass


srv = http.server.HTTPServer(("127.0.0.1", 0), VLM)
threading.Thread(target=srv.serve_forever, daemon=True).start()
URL = f"http://127.0.0.1:{srv.server_address[1]}/v1"
W = tempfile.mkdtemp()
CACHE, OUT = os.path.join(W, "handy_cache"), os.path.join(W, "motion_library.json")


def make_pair(folder, name, seed, color):
    os.makedirs(folder, exist_ok=True)
    subprocess.run(["ffmpeg", "-loglevel", "error", "-y", "-f", "lavfi", "-i", f"color=c={color}:s=160x120:d=60",
                    "-pix_fmt", "yuv420p", os.path.join(folder, name + ".mp4")], check=True)
    rnd, t, up, acts = random.Random(seed), 0, True, []
    while t < 60000:
        t += rnd.uniform(200, 600)
        acts.append({"at": int(t), "pos": rnd.uniform(70, 98) if up else rnd.uniform(5, 45)}); up = not up
    with open(os.path.join(folder, name + ".funscript"), "w") as f:
        json.dump({"version": "1.0", "actions": acts}, f)


def trainer(*args):
    r = subprocess.run([sys.executable, TRAINER, *args], capture_output=True, text=True)
    if r.returncode:
        print(r.stdout, r.stderr); raise SystemExit("trainer failed")
    return r.stdout


def analyze(folder):
    before = calls["n"]
    out = trainer("analyze", folder, "--vlm-url", URL, "--model", "m", "--cache", CACHE)
    return calls["n"] - before, out


def lib():
    with open(OUT) as f:
        return json.load(f)


def ids(l, act=None):
    return {m["id"] for a, e in l["acts"].items() if act in (None, a) for m in e["motifs"]}


def check(cond, msg):
    print(("ok   " if cond else "FAIL ") + msg)
    if not cond:
        raise SystemExit(1)


try:
    batch = os.path.join(W, "training")
    # ---- batch 1
    make_pair(batch, "clip", seed=1, color="red")
    n1, _ = analyze(batch)
    check(n1 > 0, f"batch 1 analysed with the vision model ({n1} windows)")
    trainer("build", CACHE, "--out", OUT, "--max-motifs", "6")
    lib1 = lib()
    check(set(lib1["acts"]) >= {"blowjob", "handjob"} and lib1["sources"] == 1, "library 1 built")

    # ---- you delete the batch, then add new videos, one with the same file name
    shutil.rmtree(batch)
    make_pair(batch, "clip", seed=2, color="blue")      # different video, same name
    make_pair(batch, "scene2", seed=3, color="green")
    n2, out2 = analyze(batch)
    files = sorted(os.listdir(CACHE))
    analyses = [f for f in files if f.endswith(".analysis.json")]
    check(len(analyses) == 3, f"old analysis kept + 2 new ones: {analyses}")
    check(any(f.startswith("clip~") for f in analyses), "the new 'clip' got its own file (no overwrite)")
    check("trained before; keeping both" in out2, "you're told about the name clash")
    check(n2 >= 2 * n1 - 2, f"the new 'clip' was really analysed, not given the old video's answers ({n2} calls)")

    n3, _ = analyze(batch)
    check(n3 == 0 and len([f for f in os.listdir(CACHE) if f.endswith('.analysis.json')]) == 3,
          "re-running on the same files asks nothing new and adds no duplicates")

    # ---- an analysis saved by an older trainer (no fingerprint/source id) is still recognised
    legacy = os.path.join(CACHE, "scene2.analysis.json")
    with open(legacy) as f:
        a = json.load(f)
    a.pop("fingerprint"); a.pop("source_id")
    with open(legacy, "w") as f:
        json.dump(a, f)
    n4, _ = analyze(batch)
    check(n4 == 0 and len([f for f in os.listdir(CACHE) if f.endswith('.analysis.json')]) == 3,
          "older analyses are recognised as the same video")

    # ---- rebuild: everything trained so far, earlier phrases kept fairly, new ones added
    trainer("build", CACHE, "--out", OUT, "--max-motifs", "6")
    lib2 = lib()
    check(lib2["sources"] == 3, "library 2 includes the deleted batch-1 video")
    check(os.path.exists(OUT + ".previous"), "the previous library is kept as motion_library.json.previous")
    for act in ("blowjob", "handjob"):
        kept = ids(lib1, act) & ids(lib2, act)
        srcs = {i.split("@")[0] for i in ids(lib2, act)}
        check(len(kept) >= min(2, len(ids(lib1, act))), f"{act}: earlier phrases kept ({len(kept)} of {len(ids(lib1, act))})")
        check(len(srcs) == 3, f"{act}: phrases from all 3 videos ({sorted(srcs)})")
    trainer("build", CACHE, "--out", OUT, "--max-motifs", "6")
    check(ids(lib()) == ids(lib2), "rebuilding with nothing new changes nothing")

    # ---- taste profile: liked always kept, rejected left out
    all_out = os.path.join(W, "all.json")
    trainer("build", CACHE, "--out", all_out, "--max-motifs", "500")
    with open(all_out) as f:
        everything = {m["id"] for e in json.load(f)["acts"].values() for m in e["motifs"]}
    liked = sorted(everything - ids(lib2))[:2]
    rejected = sorted(ids(lib2))[0]
    finished = sorted(everything - ids(lib2) - set(liked))[0]
    prof = os.path.join(W, "handy-profile.json")
    with open(prof, "w") as f:
        # the extension's export: {...profile, characters: {key: {motifs: {...}}}} (liked[1] only via a character)
        json.dump({"motifs": {liked[0]: 0.9, rejected: -0.9}, "finishers": {finished: 2},
                   "characters": {"vex.png": {"name": "Vex", "motifs": {liked[1]: 0.6}}}}, f)
    out = trainer("build", CACHE, "--out", OUT, "--max-motifs", "6", "--taste", prof)
    lib3 = ids(lib())
    check(set(liked) <= lib3, "phrases you liked are kept")
    check(finished in lib3, "phrases you finished to are kept")
    check(rejected not in lib3, "a phrase you rejected is left out")
    check("left out" in out, "the build says rejected phrases were left out")
    print("all incremental training checks passed")
finally:
    srv.shutdown()
    shutil.rmtree(W, ignore_errors=True)
