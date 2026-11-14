#!/usr/bin/env python3
"""The label review page, in a real browser (Playwright/Chromium).

  - lists trained videos; plays a video next to its labels; clicking a row jumps there;
  - shows 'model unsure' / 'unusual' badges and the parts you rated in the extension (❤ ★ 👎);
  - change an act, add a new act with a description from the page, split a row, merge rows;
  - only checked rows are saved; saving applies your labels to the training at once, cut exactly at
    your label edges (even a 2-second label with 10-second slices);
  - a format the browser can't play falls back to still frames; a deleted video can still be corrected;
  - the next analysis run and the build use the corrections.
Needs python3, ffmpeg and Playwright for Python.
"""
import http.server
import json
import os
import re
import shutil
import subprocess
import sys
import tempfile
import threading
import time

try:
    from playwright.sync_api import sync_playwright
except ImportError:
    print("SKIP review_page: Playwright for Python is not installed"); raise SystemExit(0)

HERE = os.path.dirname(os.path.abspath(__file__))
calls = {"n": 0}


class VLM(http.server.BaseHTTPRequestHandler):
    def do_GET(self):
        self._send({"data": [{"id": "vision-model"}]})

    def do_POST(self):
        b = json.loads(self.rfile.read(int(self.headers["Content-Length"])))
        text = json.dumps(b)
        if "connection test" in text:
            return self._send({"choices": [{"message": {"content": '{"ok": true}'}}]})
        calls["n"] += 1
        m = re.search(r"from (\d+)s to", text)
        start = int(m.group(1)) if m else 0
        conf = 0.45 if 20 <= start < 30 else 0.9          # one unsure stretch
        self._send({"choices": [{"message": {"content": json.dumps(
            {"act": "blowjob", "position": "kneeling", "who_moves": "her", "movement": "bobs", "correspondence": "c", "confidence": conf})}}]})

    def _send(self, o):
        out = json.dumps(o).encode()
        self.send_response(200); self.send_header("Content-Type", "application/json"); self.end_headers(); self.wfile.write(out)

    def log_message(self, *a):
        pass


def check(cond, msg):
    print(("ok   " if cond else "FAIL ") + msg)
    if not cond:
        raise SystemExit(1)


srv = http.server.ThreadingHTTPServer(("127.0.0.1", 0), VLM)
threading.Thread(target=srv.serve_forever, daemon=True).start()
URL = f"http://127.0.0.1:{srv.server_address[1]}/v1"
W = tempfile.mkdtemp()
ROOT = os.path.join(W, "handy-adaptive")
shutil.copytree(os.path.join(HERE, "..", "trainer"), os.path.join(ROOT, "trainer"))
T = os.path.join(ROOT, "trainer", "trainer.py")
CACHE, TRAIN = os.path.join(ROOT, "handy_cache"), os.path.join(ROOT, "training")
ENV = {**os.environ, "PYTHONUNBUFFERED": "1"}
os.makedirs(TRAIN)


def make(name, codec, ext, seconds=60, hold=None):
    args = {"vp9": ["-c:v", "libvpx-vp9", "-b:v", "200k"], "h264": ["-c:v", "libx264", "-pix_fmt", "yuv420p"],
            "mpeg4": ["-c:v", "mpeg4"]}[codec]
    subprocess.run(["ffmpeg", "-loglevel", "error", "-y", "-f", "lavfi", "-i", f"testsrc=s=320x180:d={seconds}:r=15", *args,
                    os.path.join(TRAIN, f"{name}.{ext}")], check=True)
    acts, t, up = [], 0, True
    while t < seconds * 1000:
        if hold and hold[0] * 1000 <= t < (hold[0] + hold[1]) * 1000:
            acts.append({"at": int(t), "pos": 3}); t = (hold[0] + hold[1]) * 1000; acts.append({"at": int(t), "pos": 3}); up = True
            continue
        t += 400 if t < 40000 else 900                 # slower in the last part
        acts.append({"at": int(t), "pos": 92 if up else 12}); up = not up
    json.dump({"version": "1.0", "actions": acts}, open(os.path.join(TRAIN, name + ".funscript"), "w"))


def analysis(sid):
    return json.load(open(os.path.join(CACHE, sid + ".analysis.json")))


try:
    make("webmclip", "vp9", "webm", hold=(44, 2.5))
    make("mp4clip", "h264", "mp4", seconds=30)
    make("aviclip", "mpeg4", "avi", seconds=20)
    r = subprocess.run([sys.executable, T, "analyze", TRAIN, "--vlm-url", URL, "--model", "vision-model"], capture_output=True, text=True, env=ENV)
    check(r.returncode == 0 and os.path.exists(os.path.join(CACHE, "webmclip.analysis.json")), "videos analysed")
    r = subprocess.run([sys.executable, T, "build"], capture_output=True, text=True, env=ENV, check=True)
    lib = json.load(open(os.path.join(ROOT, "motion_library.json")))
    ids = sorted(m["id"] for e in lib["acts"].values() for m in e["motifs"] if m["id"].startswith("webmclip@"))
    loved, finished = ids[0], ids[1]
    rate_plain = lib["acts"]["blowjob"]["rate"]["mean"]
    slow = [i for i in ids if int(i.split("@")[1]) > 41000][:2]            # phrases from the slow last part
    json.dump({"motifs": {loved: 0.9, **{i: 0.9 for i in slow}}, "finishers": {finished: 1}}, open(os.path.join(ROOT, "handy-profile.json"), "w"))
    r = subprocess.run([sys.executable, T, "build"], capture_output=True, text=True, env=ENV, check=True)
    lib = json.load(open(os.path.join(ROOT, "motion_library.json")))
    check(lib["acts"]["blowjob"]["rate"]["mean"] < rate_plain and "lean toward the parts you liked" in r.stdout,
          f"an act's feel leans toward the parts you liked ({rate_plain:.2f} -> {lib['acts']['blowjob']['rate']['mean']:.2f} strokes/s)")

    proc = subprocess.Popen([sys.executable, T, "review"], stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True, env=ENV)
    url = None
    for _ in range(50):
        line = proc.stdout.readline()
        m = re.search(r"Review page: (http://\S+)", line)
        if m:
            url = m.group(1); break
    check(bool(url), f"the review command serves the page ({url})")

    errors = []
    with sync_playwright() as p:
        b = p.chromium.launch()
        pg = b.new_page(viewport={"width": 1400, "height": 900})
        pg.on("pageerror", lambda e: errors.append(str(e)))
        pg.goto(url)
        pg.wait_for_selector(".row")
        names = pg.eval_on_selector_all("#videos option", "os => os.map(o => o.textContent)")
        check(len(names) == 3 and any("webmclip" in n for n in names), f"all videos listed: {names}")
        pg.select_option("#videos", "webmclip")
        pg.wait_for_function("() => document.querySelector('video') && document.querySelector('video').readyState >= 1", timeout=10000)
        check(pg.is_visible("video"), "the WebM video plays in the page")

        # jump by clicking a row's time
        times = pg.eval_on_selector_all(".row .time", "els => els.map(e => e.textContent)")
        pg.click(".row .time >> nth=2")
        pg.wait_for_timeout(500)
        cur = pg.evaluate("() => document.querySelector('video').currentTime")
        first = pg.evaluate("() => rows.filter(r => r.act !== 'idle')[2].start")
        check(abs(cur - first) < 0.6, f"clicking a row jumps the video there ({cur:.1f} s vs {first:.1f} s)")

        body = pg.text_content("#rows")
        check("model unsure" in body, "rows the model was unsure about are flagged")
        check("❤ liked" in body and "★ finished to" in body, "parts you liked / finished to are shown")
        check("you liked" in pg.text_content("#legend"), "and explained in the legend")

        # new act from the page, with a description
        pg.check("#attnfirst")
        sel = pg.locator("select[data-act]").first
        idx = int(sel.get_attribute("data-act"))
        sel.select_option("__new")
        pg.fill("#na_name", "gag hold")
        pg.fill("#na_desc", "Holds it all the way down at the base for a few seconds.")
        pg.click("#na_ok")
        pg.wait_for_function(f"() => rows[{idx}].act === 'gag_hold'")
        check(True, "a new act is added from the page and applied to the row")
        acts = json.load(open(os.path.join(CACHE, "acts.json")))["acts"]
        check(acts["gag_hold"]["description"].startswith("Holds it all the way down"), "its description is saved")
        pg.uncheck("#attnfirst")

        # split a 10-second row into a precise 2-second gag_hold at the hold (44-46.5 s)
        pg.evaluate("() => seek(44.2)"); pg.wait_for_timeout(300)
        n0 = pg.evaluate("() => rows.length")
        pg.keyboard.press("s")
        pg.evaluate("() => seek(46.6)"); pg.wait_for_timeout(300)
        pg.click("#split")
        check(pg.evaluate("() => rows.length") == n0 + 2, "split twice around the hold (S key and button)")
        k = pg.evaluate("() => rows.findIndex(r => r.start <= 45 && r.end > 45)")
        pg.select_option(f"select[data-act='{k}']", "gag_hold")
        # merge two rows near the start
        m = pg.evaluate("() => rows.findIndex((r, i) => r.act !== 'idle' && rows[i+1] && rows[i+1].act !== 'idle')")
        pg.click(f"button[data-merge='{m}']")
        pg.fill(f"input[data-notes='{k - 1}']", "Steady bobbing")       # (after the merge the hold row moved up one)
        pg.click(".row[data-i='0'] .check")                              # un-check a row with its ✓ toggle
        check(pg.evaluate("() => rows[0].checked") is False, "the ✓ toggle un-checks a row")
        checked = pg.evaluate("() => rows.filter(r => r.checked && r.act !== 'idle').length")
        total = pg.evaluate("() => rows.filter(r => r.act !== 'idle').length")
        check(0 < checked < total, f"only edited rows are checked ({checked} of {total})")
        pg.keyboard.press("Control+s")
        pg.wait_for_function("() => /Saved/.test(document.querySelector('#status').textContent)")
        check(True, "saved with Ctrl+S")

        labels = open(os.path.join(CACHE, "webmclip.labels.csv")).read().strip().splitlines()
        check(len(labels) - 1 == checked, f"only checked rows saved as your labels ({len(labels) - 1})")
        a = analysis("webmclip")
        g = [w for w in a["windows"] if w["act"] == "gag_hold"]
        check(g and g[0]["source"] == "manual", "applied to the training straight away")
        check(abs(g[0]["start"] - 44.2) < 0.06 and abs(g[-1]["end"] - 46.6) < 0.06,
              f"cut exactly at your label edges with 10-second slices ({g[0]['start']}-{g[-1]['end']})")
        check(any(w.get("source") == "vlm" for w in a["windows"]), "unchecked rows keep the model's labels")

        # keyboard
        pg.evaluate("() => seek(1)"); pg.keyboard.press("j"); pg.wait_for_timeout(300)
        check(pg.evaluate("() => document.querySelector('video').currentTime") > 1, "J jumps to the next row")
        pg.keyboard.press("Space"); pg.wait_for_timeout(700)
        playing = pg.evaluate("() => !document.querySelector('video').paused")
        pg.keyboard.press("Space")
        check(playing, "Space plays")

        # mp4: plays, or falls back to still frames
        pg.select_option("#videos", "mp4clip")
        pg.wait_for_timeout(2500)
        mode = pg.evaluate("() => mode")
        if mode == "frames":
            pg.wait_for_function("() => document.querySelector('#stage img') && document.querySelector('#stage img').naturalWidth > 0", timeout=8000)
            check("still frames" in pg.text_content("#stage"), "a format the browser can't play falls back to still frames")
        else:
            check(mode == "video", "the MP4 plays")

        pg.select_option("#videos", "aviclip")
        pg.wait_for_function("() => mode === 'frames'", timeout=8000)
        pg.wait_for_function("() => document.querySelector('#stage img') && document.querySelector('#stage img').naturalWidth > 0", timeout=8000)
        f1 = pg.evaluate("() => document.querySelector('#stage img').src")
        box = pg.locator("#timeline").bounding_box()
        pg.mouse.click(box["x"] + box["width"] * 0.6, box["y"] + 30); pg.wait_for_timeout(800)   # click the timeline
        check("still frames" in pg.text_content("#stage") and pg.evaluate("() => document.querySelector('#stage img').src") != f1,
              "a format the browser can't play shows still frames that follow the timeline")

        # deleted video: still correctable
        os.remove(os.path.join(TRAIN, "mp4clip.mp4"))
        pg.reload(); pg.wait_for_selector(".row")
        pg.select_option("#videos", "mp4clip"); pg.wait_for_timeout(500)
        check("has been deleted" in pg.text_content("#stage"), "a deleted video says so")
        s2 = pg.locator("select[data-act]").first
        s2.select_option("handjob")
        pg.click("#save")
        pg.wait_for_function("() => /Saved/.test(document.querySelector('#status').textContent)")
        check(any(w["act"] == "handjob" and w["source"] == "manual" for w in analysis("mp4clip")["windows"]),
              "a deleted video's labels can still be corrected")
        pg.screenshot(path=os.path.join(HERE, "review_page.png"))
        b.close()
    proc.terminate()
    check(not errors, f"no page errors {errors}")

    # the next run and the build use the corrections
    n = calls["n"]
    r = subprocess.run([sys.executable, T, "analyze", TRAIN, "--vlm-url", URL, "--model", "vision-model"], capture_output=True, text=True, env=ENV)
    check("using your labels" in r.stdout, "the next analysis run finds your saved labels")
    a = analysis("webmclip")
    check(any(w["act"] == "gag_hold" and abs(w["start"] - 44.2) < 0.06 for w in a["windows"]), "and keeps them, cut at your edges")
    r = subprocess.run([sys.executable, T, "build"], capture_output=True, text=True, env=ENV)
    lib = json.load(open(os.path.join(ROOT, "motion_library.json")))
    check("gag_hold" in lib["acts"] and lib["acts"]["gag_hold"]["description"].startswith("Holds it all the way down"),
          "the build has your new act with its description")
    print("all review page checks passed")
finally:
    srv.shutdown()
    shutil.rmtree(W, ignore_errors=True)
