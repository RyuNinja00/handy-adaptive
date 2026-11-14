#!/usr/bin/env python3
"""Your own acts, short moments, and stop-and-save.

  - guided mode: add your own act with a description; the vision model is given the description;
  - a 3-second hold at the base (fine detail) is labelled as a hold, not "idle", and becomes a phrase;
  - a new act name in your label file is added to your act list; later runs give the model your
    descriptions and how your labelled examples move, and flag acts that need a better description;
  - pressing S (in a terminal) stops at once, even in the middle of a slow model request, and saves;
    Ctrl+C does the same; running again carries on from there without asking anything twice;
  - stopping part-way through re-running an analysed video keeps the rest of the earlier run.
Needs python3 + ffmpeg. The terminal checks need a POSIX pty (skipped elsewhere).
"""
import http.server
import json
import os
import re
import shutil
import signal
import subprocess
import sys
import tempfile
import threading
import time

HERE = os.path.dirname(os.path.abspath(__file__))
TRAINER = os.path.abspath(os.path.join(HERE, "..", "trainer", "trainer.py"))
state = {"prompts": [], "delay": 0.0, "calls": 0}


class VLM(http.server.BaseHTTPRequestHandler):
    def do_GET(self):
        self._send({"data": [{"id": "vision-model"}]})

    def do_POST(self):
        b = json.loads(self.rfile.read(int(self.headers["Content-Length"])))
        text = "".join(c.get("text", "") for m in b["messages"] for c in (m["content"] if isinstance(m["content"], list) else [{"text": m["content"]}]))
        if "connection test" in text:
            return self._send({"choices": [{"message": {"content": '{"ok": true}'}}]})
        state["prompts"].append(text)
        time.sleep(state["delay"])
        state["calls"] += 1
        act = "gag_hold" if re.search(r"holds still at the base for [2-9]", text) else "blowjob"
        self._send({"choices": [{"message": {"content": json.dumps(
            {"act": act, "position": "kneeling", "who_moves": "her", "movement": "m", "correspondence": "c", "confidence": 0.9})}}]})

    def _send(self, o):
        out = json.dumps(o).encode()
        try:
            self.send_response(200); self.send_header("Content-Type", "application/json"); self.end_headers(); self.wfile.write(out)
        except (BrokenPipeError, ConnectionResetError):
            pass

    def log_message(self, *a):
        pass


srv = http.server.ThreadingHTTPServer(("127.0.0.1", 0), VLM)
threading.Thread(target=srv.serve_forever, daemon=True).start()
URL = f"http://127.0.0.1:{srv.server_address[1]}/v1"
W = tempfile.mkdtemp()
ROOT = os.path.join(W, "handy-adaptive")
shutil.copytree(os.path.join(HERE, "..", "trainer"), os.path.join(ROOT, "trainer"))
T = os.path.join(ROOT, "trainer", "trainer.py")
CACHE = os.path.join(ROOT, "handy_cache")
ENV = {**os.environ, "VLM_URL": URL, "PYTHONUNBUFFERED": "1"}


def check(cond, msg):
    print(("ok   " if cond else "FAIL ") + msg)
    if not cond:
        raise SystemExit(1)


def make_pair(folder, name, seconds=40, hold=None, color="red"):
    """A script of steady strokes; hold=(start_s, length_s) holds still at the base."""
    os.makedirs(folder, exist_ok=True)
    subprocess.run(["ffmpeg", "-loglevel", "error", "-y", "-f", "lavfi", "-i", f"color=c={color}:s=160x120:d={seconds}",
                    "-pix_fmt", "yuv420p", os.path.join(folder, name + ".mp4")], check=True)
    acts, t, up = [], 0, True
    while t < seconds * 1000:
        if hold and hold[0] * 1000 <= t < (hold[0] + hold[1]) * 1000:
            acts.append({"at": int(t), "pos": 3}); t = (hold[0] + hold[1]) * 1000
            acts.append({"at": int(t), "pos": 3}); up = True
            continue
        t += 420
        acts.append({"at": int(t), "pos": 92 if up else 15}); up = not up
    with open(os.path.join(folder, name + ".funscript"), "w") as f:
        json.dump({"version": "1.0", "actions": acts}, f)


def analyses():
    return {f: json.load(open(os.path.join(CACHE, f))) for f in os.listdir(CACHE) if f.endswith(".analysis.json")}


try:
    train = os.path.join(ROOT, "training")
    make_pair(train, "scene1", seconds=40, hold=(20, 3))

    # ---- guided mode: add an act with a description, very detailed slices, build
    answers = "\n".join([
        "",                       # training folder: default
        "",                       # model: the only one
        "y",                      # add acts of your own?
        "gag hold",               # name (normalised to gag_hold)
        "Holds it all the way down at the base for a few seconds, may pull off coughing.",
        "",                       # done adding
        "n",                      # go through flagged acts now?
        "3",                      # very detailed (3 s)
        "n",                      # open the review page? (not here)
        "y",                      # build now
    ]) + "\n"
    r = subprocess.run([sys.executable, T], input=answers, capture_output=True, text=True, env=ENV, timeout=300)
    out = r.stdout
    if r.returncode:
        print(out, r.stderr)
    acts = json.load(open(os.path.join(CACHE, "acts.json")))
    check(acts["acts"].get("gag_hold", {}).get("description", "").startswith("Holds it all the way down"),
          "guided mode saved your act and its description")
    check(acts["settings"].get("window") == 3.0, "the detail choice is remembered")
    check(any("- gag_hold: Holds it all the way down" in p for p in state["prompts"]), "the vision model is given your description")
    check(all("- blowjob: Oral sex" in p for p in state["prompts"]), "built-in acts come with descriptions too")
    check(any(re.search(r"holds still at the base for [2-9]", p) for p in state["prompts"]), "the 3-second hold is described to the model as a hold, not skipped")
    a = next(iter(analyses().values()))
    check(a["window"] == 3.0 and a["complete"] is True, "analysed in 3-second slices, complete")
    check(any(w["act"] == "gag_hold" for w in a["windows"]), "the hold was labelled with your act")
    lib = json.load(open(os.path.join(ROOT, "motion_library.json")))
    g = lib["acts"].get("gag_hold")
    check(g is not None and g["motifs"], "the library has a gag_hold act with a phrase")
    longest = max(d for m in g["motifs"] for d, _ in m["strokes"])
    check(longest >= 2000, f"the phrase contains the hold (longest step {longest} ms)")
    check(g["description"].startswith("Holds it all the way down"), "the chat AI gets your definition in the library")
    check("Step 3/5  Acts and detail" in out and "no examples yet" in out, "acts with no examples yet are flagged")

    # ---- a new act from your label file; later runs give the model hints from your labelled examples
    shutil.rmtree(train)
    make_pair(train, "scene2", seconds=40, color="blue")
    with open(os.path.join(train, "scene2.labels.csv"), "w") as f:
        f.write("start,end,act,notes\n0:00,0:20,slow_lick,licks\n0:20,0:40,blowjob,\n")
    r = subprocess.run([sys.executable, T, "analyze", train, "--vlm-url", URL, "--model", "vision-model", "--window", "5"],
                       capture_output=True, text=True, env=ENV, timeout=300)
    check("new act(s) from your labels: slow_lick" in r.stdout, "a new act name in your labels is picked up")
    acts = json.load(open(os.path.join(CACHE, "acts.json")))["acts"]
    check("slow_lick" in acts and acts["slow_lick"]["description"] == "", "it's added to your act list (no description yet)")
    check("slow_lick: it has no description yet" in r.stdout, "and flagged for a description")
    check("limited examples" in r.stdout, "acts with limited examples are flagged")
    shutil.rmtree(train)
    make_pair(train, "scene3", seconds=20, color="green")
    n = len(state["prompts"])
    subprocess.run([sys.executable, T, "analyze", train, "--vlm-url", URL, "--model", "vision-model", "--window", "5"],
                   capture_output=True, text=True, env=ENV, timeout=300)
    later = state["prompts"][n:]
    check(later and all("- slow_lick: slow lick (in the user's own labelled examples the toy moves:" in p for p in later),
          "later runs show the model how your labelled examples move")

    # ---- the description questions: answering adds to the description
    sys.path.insert(0, os.path.dirname(T))
    import trainer as tr                                   # which acts will be flagged, in order
    tr_flags = list(tr.act_health(CACHE, tr.load_acts(CACHE)[0]))
    check("slow_lick" in tr_flags, f"flagged acts: {tr_flags}")
    detail = ["Slow, broad licks along the shaft and head, no mouth around it." if n == "slow_lick" else "" for n in tr_flags]
    r = subprocess.run([sys.executable, T], input="\n".join(["", "", "n", "y", *detail, "1", "n", "n"]) + "\n",
                       capture_output=True, text=True, env=ENV, timeout=300)
    acts = json.load(open(os.path.join(CACHE, "acts.json")))["acts"]
    check(acts["slow_lick"]["description"].startswith("Slow, broad licks"), "your added detail is saved")

    # ---- stop and save
    if os.name != "posix":
        print("skip terminal checks (needs a POSIX pty)")
    else:
        import pty
        shutil.rmtree(train)
        make_pair(train, "long", seconds=60, color="yellow")
        state["delay"] = 1.5

        def run_pty(after_calls, key=None, sig=None):
            pid, fd = pty.fork()
            if pid == 0:
                os.execve(sys.executable, [sys.executable, T, "analyze", train, "--vlm-url", URL, "--model", "vision-model",
                                           "--window", "5"], ENV)
            start, buf, sent = state["calls"], b"", None
            while True:
                try:
                    import select
                    if select.select([fd], [], [], 0.05)[0]:
                        buf += os.read(fd, 4096)
                except OSError:
                    break
                if sent is None and state["calls"] - start >= after_calls:
                    time.sleep(0.3)                       # now in the middle of the next (slow) request
                    sent = time.time()
                    if key:
                        os.write(fd, key)
                    else:
                        os.kill(pid, sig)
                done, status = os.waitpid(pid, os.WNOHANG)
                if done:
                    break
            took = time.time() - sent if sent else None
            time.sleep(state["delay"] + 0.3)          # let the model server finish the request that was cut off
            try:
                while True:
                    chunk = os.read(fd, 4096)
                    if not chunk:
                        break
                    buf += chunk
            except OSError:
                pass
            return buf.decode("utf-8", "ignore"), took

        out, took = run_pty(2, key=b"s")
        check("Press S at any time to stop" in out, "you're told about the S key")
        check(took is not None and took < 1.2, f"S stops at once, even mid-request ({took:.2f} s)")
        part = analyses()["long.analysis.json"]
        n_saved = len(part["windows"])
        check(part["complete"] is False and n_saved >= 2 and "Stopped. Saved" in out, f"progress saved ({n_saved} slices)")

        out, took = run_pty(1, sig=signal.SIGINT)
        check(took is not None and took < 1.2, "Ctrl+C stops at once too")
        n2 = len(analyses()["long.analysis.json"]["windows"])
        check(n2 > n_saved, f"and saves ({n2} slices)")

        state["delay"] = 0.0
        before = state["calls"]
        subprocess.run([sys.executable, T, "analyze", train, "--vlm-url", URL, "--model", "vision-model", "--window", "5"],
                       capture_output=True, text=True, env=ENV, timeout=300)
        full = analyses()["long.analysis.json"]
        asked = state["calls"] - before
        check(full["complete"] is True and asked == len([w for w in full["windows"] if w.get("vlm")]) - n2,
              f"running again carries on: {asked} new questions, none repeated")

        state["delay"] = 1.5
        out, _ = run_pty(1, key=b"s")
        again = analyses()["long.analysis.json"]
        check(again["complete"] is True and len(again["windows"]) == len(full["windows"]),
              "stopping a re-run keeps the earlier full analysis")
        state["delay"] = 0.0
    print("all act and stop checks passed")
finally:
    srv.shutdown()
    shutil.rmtree(W, ignore_errors=True)
