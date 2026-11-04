# Handy Adaptive (SillyTavern extension) v0.3

The AI describes **what** is happening in the scene, the extension improvises **how** the device moves using motion learned from your hand-scripted videos, and your live feedback tunes it to your taste over time.

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
STOP · Faster · Slower · Longer · Shorter · Tip · Base · Wilder · Smoother · ❤ Love this · 👎 Not this · act picker + ▶ · intensity slider · ⭐ save favorite · favorites menu.

## Safety
- Big STOP button; **Esc** stops; auto-stop when idle (default 10 min), on chat change and on page close.
- A hard max-speed and stroke range that no generated motion can exceed.
- In streaming mode each move uses stop-on-target, so the device halts if the connection drops.
- The physical button on the device always works.

## Notes
- Uses Handy REST API v2. *Streaming* mode (HDSP) reacts instantly. *Script sync* (HSSP) uploads 2-minute generated scripts and is smoother but slower to react. If an endpoint has changed for your firmware, the `api` object at the top of `index.js` is the only place to edit.
- Larger instruction-following models use the tags more reliably.

## Project layout
| path | what |
|---|---|
| `manifest.json`, `index.js`, `synth.js`, `style.css` | the SillyTavern extension (repo root, so **Extensions → Install extension** with this repo's URL works) |
| `trainer/trainer.py` | video + funscript → `motion_library.json` |
| `TRAINING.md` | step-by-step training guide |
| `tests/` | synthesizer checks, learning simulation, trainer end-to-end test with a mock vision model (`npm test`; needs Node, Python 3, ffmpeg) |
| `dist/` | packaged release zip |
| `tools/` | an earlier, separate trainer prototype; its library format is **not** compatible with this extension (kept for reference) |

Your training videos, labels, cache, generated library and exported taste profile are git-ignored so they never get committed.
