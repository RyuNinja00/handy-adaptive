# Handy Adaptive (SillyTavern + Marinara Engine) v0.8

The AI describes **what** is happening in the scene, the extension improvises **how** the device moves using motion learned from your hand-scripted videos, and your live feedback tunes it to your taste over time.

📖 **New here? Follow the [complete step-by-step User Guide](docs/USER_GUIDE.md)**: installation, setup, training, daily use, troubleshooting and reference.

🍝 **Using [Marinara Engine](https://github.com/Pasta-Devs/Marinara-Engine)?** Import `dist/handy-adaptive-marinara.zip` as an External Extension. It's the same extension with a small compatibility layer. See **[docs/MARINARA.md](docs/MARINARA.md)**.

## Install (SillyTavern)
1. Copy the `handy-adaptive` folder into `SillyTavern/data/<your-user>/extensions/` (or `public/scripts/extensions/third-party/`), or push it to a git repo and use **Extensions → Install extension**.
2. Reload. Open **Extensions → Handy Adaptive**, paste your connection key, set your max speed and stroke limits, and click **Test connection**.
3. Train a motion library from your videos. See **[TRAINING.md](TRAINING.md)**. Until you do, it uses rough starter profiles.

## How the AI controls it
The AI writes hidden tags, for example:
```
<handy act="blowjob" intensity="0.4" depth="0.3"/>
<handy act="blowjob" intensity="0.8" blend="handjob:0.4"/>
<handy act="cowgirl" intensity="0.6" variation="0.7"/>
<handy climax="30"/>
<handy save="Velvet Spiral"/>
<handy stop/>
```
Several tags in one reply play in order at reading pace, so a reply's build and release happen as you read them. `climax` builds steadily to a peak using what has made you finish before; `save` lets a character name a signature move it can call back with `favorite`.
It doesn't choose speeds or patterns directly. It chooses the act, how intense it is, tip vs base, and optionally a blend with other acts. The engine then builds the motion from phrases learned from your scripted videos. It starts out exploring, then increasingly chains the phrases and phrase combinations you've rated highly for that act, using your learned speed, length and depth settings. See TRAINING.md §7. The old `<handy pattern="wave" .../>` tags still work as a simple fallback (under Buffered streaming they are played by the act engine).

## Panel
STOP · Faster · Slower · Longer · Shorter · Tip · Base · Wilder · Smoother · ❤ Love this · 👎 Not this · 🔥 I'm close (edging: eases off at once and tells the AI, which decides whether to pull back, hold or push you over) · ⚡ Finish me (climax push) · 🥂 Finished (winds down gently, then stops; the strongest learning signal) · arousal bar · a live position bar (base ↔ tip) · act picker + ▶ · intensity slider · ⭐ save favorite · favorites menu · 📏 calibrate · the style of the character in control.

## Safety
- Big STOP button; **Esc** stops; a short message such as “stop”, “stop, please” or “ok halt” stops at once without waiting for the AI (“don't stop” and questions never do), and so does your optional safeword anywhere in a message; auto-stop when idle (default 10 min), on chat change and on page close. Stop holds the device where it is, and also cancels a start that is still in progress.
- A `<handy stop/>` tag cancels what earlier tags in the same reply started; a tag placed after it in the text still plays when you reach it. A typed stop cancels those waiting tags too.
- A hard max-speed (capped at 100% whatever is typed) and stroke range that no generated motion can exceed, including the first stroke of a start, wherever the device happens to be resting. Lowering either while the device is moving takes effect at the next turning point. Unticking **Enabled** stops the device.
- In streaming mode each move uses stop-on-target, so the device halts if the connection drops. After several failed commands in a row the extension stops and tells you.
- The physical button on the device always works.

## Notes
- **Buffered streaming (firmware 4, API v3)** keeps ~5 s of motion stored on the device and tops it up, so motion stays smooth on slow networks and in background tabs, and changes still land in ~½ s at a turning point. It needs an API v3 Application ID from Handy's developer portal, and falls back to Streaming if v3 isn't available.
- **Following the story**: a reply with no tag still nudges the motion from what it describes (faster, slower, deeper, pauses). It never starts or stops the device.
- **Detail touches**: flutters at the tip, slow drags and deep pulses between phrases, chosen per act and character and rated like any phrase.
- **Two characters at once**: `with="NAME"` on a tag makes two characters take turns in their own styles, or move as one.
- **Saved setups**: a calibration per position (lying down, sitting, a mount), switched from the panel.
- **Session memory**: each character keeps short recaps of your sessions and can refer back to them.
- **Games**: the *edging game* is a gooning session run by the character: dirty talk, porn scenes she picks (the Handy plays the same act), edge after edge, and she decides whether you're allowed, ruined or denied. *Porn roulette* switches to a new scene every few minutes, and you score by getting through each one without edging. *Goon trance* is a slow, hypnotic plateau where time on the edge is the score. *Mommy's stamina training* is a mommy roleplay with MILF porn and praise, working toward a stamina goal that grows with how long you last, and ending with a long, intense finish.
- **Learns what gets you there**: every scene and focus she has you watch is credited with your edges, finishes, ❤ and 👎. She's told your finishers, your fastest triggers, your slow burners and your strongest themes, and uses them strategically in each game.
- **Arousal estimate**: a running guess at how close you are, from motion, time and your own signals. It is shown on the panel and given to the AI for pacing. It never claims the edge without your "I'm close", and it learns your pace.
- **Character styles**: every character gets their own way of moving the Handy (tempo, stroke length, focus, wildness, teasing, eagerness, experience), read from their card. It is refined by your feedback while they're in control and remembered per character, and it works in group chats. Inexperienced characters grow more confident over time. Cards are read by a connection profile of your choice (e.g. a local model), with a keyword reading as the fallback. View or adjust styles under *Character styles* in the settings.
- **Calibration**: *Calibrate to my body* walks you through moving the sleeve to your tip and your base; all motion is then mapped onto that range, so "tip" means your tip. A ruler button on the panel recalibrates mid-session, starting from last time's positions, and before the first motion of each session it asks whether the setup is the same (nothing moves until you answer).
- *Streaming* needs the SillyTavern tab to stay visible: browsers slow the timers of background tabs to about one per second, which reduces streaming to roughly one stroke per second. If SillyTavern will be hidden behind another tab or a full-screen window, use *Script sync*, where the device plays the script by itself.
- *Streaming* also depends on network delay. **Test connection** shows the round trip in ms. When the network can't keep up with a fast rhythm, the motion slows down smoothly; it never skips strokes or speeds past your limit.
- *Script sync* pauses for a moment each time a new script is loaded: on every change, and about every two minutes.
- *Streaming* (HDSP) and *Script sync* (HSSP) use Handy REST API v2 (firmware 3); *Buffered streaming* uses API v3 (firmware 4). Streaming reacts instantly; Script sync uploads 2-minute generated scripts and is smoother but slower to react. If an endpoint changes, the `api` and `api3` objects near the top of `index.js` are the only places to edit.
- Larger instruction-following models use the tags more reliably.

## Project layout
| path | what |
|---|---|
| `manifest.json`, `index.js`, `synth.js`, `charstyle.js`, `style.css` | the SillyTavern extension (repo root, so **Extensions → Install extension** with this repo's URL works) |
| `marinara/` | Marinara Engine support: `st-compat.js` (the slice of SillyTavern the extension uses, backed by Marinara), `compat.css`, a vendored jQuery |
| `scripts/build-marinara.mjs` | builds `dist/handy-adaptive-marinara.zip` from the unmodified extension (`npm run build:marinara`) |
| `docs/MARINARA.md` | Marinara install and usage guide |
| `trainer/trainer.py` | video + funscript → `motion_library.json` (run with no options for guided mode) |
| `Train.bat` / `train.command` | double-click to start the trainer in guided mode (Windows / macOS) |
| `docs/USER_GUIDE.md` | complete step-by-step guide (start here) |
| `TRAINING.md` | how the training and learning work |
| `tests/` | markup check, synthesizer checks, learning simulation, the extension run against a simulated Handy (`tests/device.sim.mjs`), a real-browser smoke test of the panel (`tests/browser.smoke.cjs`; skipped without Playwright), trainer end-to-end test with a mock vision model, the Marinara build in a browser against Marinara's extension runtime (`tests/marinara_e2e.mjs`) (`npm test`; needs Node, Python 3, ffmpeg) |
| `dist/` | packaged release zips: SillyTavern (`handy-adaptive-v*.zip`) and Marinara (`handy-adaptive-marinara.zip`, `marinara/`) |
| `tools/` | an earlier, separate trainer prototype; its library format is **not** compatible with this extension (kept for reference) |

Your training videos, labels, cache, generated library and exported taste profile are git-ignored so they never get committed.
