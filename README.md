# Handy Adaptive (SillyTavern extension) v0.4

The AI describes **what** is happening in the scene, the extension improvises **how** the device moves using motion learned from your hand-scripted videos, and your live feedback tunes it to your taste over time.

📖 **New here? Follow the [complete step-by-step User Guide](docs/USER_GUIDE.md)**: installation, setup, training, daily use, troubleshooting and reference.

## Install
1. Copy the `handy-adaptive` folder into `SillyTavern/data/<your-user>/extensions/` (or `public/scripts/extensions/third-party/`), or push it to a git repo and use **Extensions → Install extension**.
2. Reload. Open **Extensions → Handy Adaptive**, paste your connection key, set your max speed and stroke limits, and click **Test connection**.
3. Train a motion library from your videos. See **[TRAINING.md](TRAINING.md)**. Until you do, it uses rough starter profiles.

## How the AI controls it
The AI writes hidden tags, for example:
```
<handy act="blowjob" intensity="0.4" depth="0.3"/>
<handy act="blowjob" intensity="0.8" blend="handjob:0.4"/>
<handy act="cowgirl" intensity="0.6" variation="0.7"/>
<handy stop/>
```
It doesn't choose speeds or patterns directly. It chooses the act, how intense it is, tip vs base, and optionally a blend with other acts. The engine then builds the motion from phrases learned from your scripted videos. It starts out exploring, then increasingly chains the phrases and phrase combinations you've rated highly for that act, using your learned speed, length and depth settings. See TRAINING.md §7. The old `<handy pattern="wave" .../>` tags still work as a simple fallback.

## Panel
STOP · Faster · Slower · Longer · Shorter · Tip · Base · Wilder · Smoother · ❤ Love this · 👎 Not this · 🔥 I'm close (edging: eases off at once and tells the AI, which decides whether to pull back, hold or push you over) · 🥂 Finished (winds down gently, then stops; the strongest learning signal) · a live position bar (base ↔ tip) · act picker + ▶ · intensity slider · ⭐ save favorite · favorites menu · 📏 calibrate · the style of the character in control.

## Safety
- Big STOP button; **Esc** stops; a short message such as “stop”, “stop, please” or “ok halt” stops at once without waiting for the AI (“don't stop” and questions never do), and so does your optional safeword anywhere in a message; auto-stop when idle (default 10 min), on chat change and on page close. Stop holds the device where it is, and also cancels a start that is still in progress.
- A `<handy stop/>` tag always wins over other tags in the same message that come before it.
- A hard max-speed and stroke range that no generated motion can exceed, including the first stroke of a start, wherever the device happens to be resting.
- In streaming mode each move uses stop-on-target, so the device halts if the connection drops. After several failed commands in a row the extension stops and tells you.
- The physical button on the device always works.

## Notes
- **Buffered streaming (firmware 4, API v3)** keeps ~5 s of motion stored on the device and tops it up, so motion stays smooth on slow networks and in background tabs, and changes still land in ~½ s at a turning point. It needs an API v3 Application ID from Handy's developer portal, and falls back to Streaming if v3 isn't available.
- **Character styles**: every character gets their own way of moving the Handy (tempo, stroke length, focus, wildness, teasing, eagerness, experience), read from their card. It is refined by your feedback while they're in control and remembered per character, and it works in group chats. Inexperienced characters grow more confident over time. View or adjust styles under *Character styles* in the settings.
- **Calibration**: *Calibrate to my body* walks you through moving the sleeve to your tip and your base; all motion is then mapped onto that range, so "tip" means your tip. A ruler button on the panel recalibrates mid-session, starting from last time's positions, and before the first motion of each session it asks whether the setup is the same (nothing moves until you answer).
- *Streaming* needs the SillyTavern tab to stay visible: browsers slow the timers of background tabs to about one per second, which reduces streaming to roughly one stroke per second. If SillyTavern will be hidden behind another tab or a full-screen window, use *Script sync*, where the device plays the script by itself.
- *Streaming* also depends on network delay. **Test connection** shows the round trip in ms. When the network can't keep up with a fast rhythm, the motion slows down smoothly; it never skips strokes or speeds past your limit.
- *Script sync* pauses for a moment each time a new script is loaded: on every change, and about every two minutes.
- Uses Handy REST API v2. *Streaming* mode (HDSP) reacts instantly. *Script sync* (HSSP) uploads 2-minute generated scripts and is smoother but slower to react. If an endpoint has changed for your firmware, the `api` object at the top of `index.js` is the only place to edit.
- Larger instruction-following models use the tags more reliably.

## Project layout
| path | what |
|---|---|
| `manifest.json`, `index.js`, `synth.js`, `charstyle.js`, `style.css` | the SillyTavern extension (repo root, so **Extensions → Install extension** with this repo's URL works) |
| `trainer/trainer.py` | video + funscript → `motion_library.json` (run with no options for guided mode) |
| `Train.bat` / `train.command` | double-click to start the trainer in guided mode (Windows / macOS) |
| `docs/USER_GUIDE.md` | complete step-by-step guide (start here) |
| `TRAINING.md` | how the training and learning work |
| `tests/` | synthesizer checks, learning simulation, the extension run against a simulated Handy (`tests/device.sim.mjs`), trainer end-to-end test with a mock vision model (`npm test`; needs Node, Python 3, ffmpeg) |
| `dist/` | packaged release zip |
| `tools/` | an earlier, separate trainer prototype; its library format is **not** compatible with this extension (kept for reference) |

Your training videos, labels, cache, generated library and exported taste profile are git-ignored so they never get committed.
