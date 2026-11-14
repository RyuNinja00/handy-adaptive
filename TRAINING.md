# Teaching the AI how acts *move*

The goal: when a scene turns into, say, a blowjob, the device should move like one, with the uneven rhythm, the tip focus and the occasional deep stroke or pause. It shouldn't run a canned loop. You teach this with videos you already have good hand-made scripts for.

## How the pieces fit

```
your video + .funscript ──► trainer.py analyze ──► review CSV (you fix labels)
                                 │  (vision model watches the frames and
                                 │   relates the performers' movement to
                                 │   the stroke pattern)
                                 ▼
                         trainer.py build ──► motion_library.json ──► import in SillyTavern
                                                                         │
 AI writes <handy act="blowjob" intensity="0.6"/>  ──►  synthesizer ─────┘
                                                        improvises new motion from the
                                                        library + your learned taste
```

What gets learned per act:
- **Statistics**: stroke rate, stroke length, where in the range it happens (tip vs base), how irregular the rhythm is, up/down asymmetry, how often it pauses.
- **Motifs**: dozens of short 3–8 s stroke phrases cut from your scripts. During play they're re-timed, re-scaled and jittered, and mixed with phrases generated from the statistics, so motion resembles the examples without repeating them.
- **Descriptions**: the vision model's notes on how the bodies move and what each kind of stroke corresponds to. These go into the AI's prompt so it understands the act's character.

Then **your feedback** layers on top, per act. If you keep pressing *Slower* and *Tip* during blowjobs, that act shifts permanently for you. ❤ and 👎 also rate the specific motifs that were playing, so liked phrases come up more often.

## 1. Install the tools (once)

- **Python 3.9+** and **ffmpeg**. Check both with `python3 --version` and `ffmpeg -version`.
- **A local vision model** behind an OpenAI-compatible API. The easiest route is [Ollama](https://ollama.com):
  ```
  ollama pull <your gemma 4 vision tag>     # check the exact name on ollama.com
  ollama list                                # note the model name
  ```
  LM Studio, llama.cpp `llama-server`, KoboldCpp and vLLM all work too. Just pass their URL with `--vlm-url`.

> **If the model refuses or gives vague labels** (some instruction-tuned models avoid explicit imagery): try a less filtered community variant, or skip the vision step entirely and label by hand (step 3). Your manual labels always win over the model's, and the motion learning itself only needs the labels plus the script.

## 2. Prepare example pairs

Put each video next to its script with the **same name**:
```
training/
  scene01.mp4      scene01.funscript
  scene02.mkv      scene02.funscript
```
Tips for good examples:
- Use **well-synced, hand-made** scripts. Auto-generated or offset scripts teach the wrong thing.
- Aim for **2–5 minutes of footage per act**, spread across **several different videos and scripters**. Variety beats volume.
- Clips can contain several acts. The trainer splits them up.
- Only use legal content of consenting adults.

## 3. Analyze

```
cd trainer
python3 trainer.py analyze ../training --model <model name>
```
For each 10 s window the trainer:
1. measures how the script moves (speed, length, depth, rhythm, pauses),
2. grabs 4 frames from the video,
3. tells the vision model what the stroker is doing in that window and asks it to identify the act, describe how the performers move and **explain how that motion maps onto the strokes** (for example: "deep strokes are her taking him fully, the short flicks are her tongue at the tip").

Output goes to `handy_cache/`. That folder holds `<video>.analysis.json` (the full data) and `<video>.review.csv`, which you'll check next.

Useful options:
| option | what it does |
|---|---|
| `--window 6` | finer segmentation (default 10 s) |
| `--frames 6` | more frames per window (slower, often more accurate) |
| `--labels "blowjob,handjob,riding,..."` | your own act vocabulary |
| `--vlm-url http://localhost:1234/v1` | LM Studio / other servers |

Vision results are cached, so re-running is fast.

## 4. Review and correct (important)

Open `handy_cache/<video>.review.csv` in any spreadsheet app. Each row is a segment with the model's guess, confidence, notes and a plain-language description of the script's motion.

- Fix any wrong `act` values. You can invent new act names too, such as `slow_sensual_bj` or `edging`. Anything you name becomes an act the AI can use.
- Adjust `start` / `end` times if a boundary is off (`m:ss` or seconds).
- Edit or add `notes`. They end up in the AI's prompt, so a line like "teasing licks with long pauses, then sudden deep strokes" is very useful.
- Set a row's act to `other` to exclude it.

Save it **next to the video** as `<video>.labels.csv` (e.g. `training/scene01.labels.csv`), then run `analyze` again. It will use your labels and keep the cached vision notes.

You can also skip the vision model completely: write `scene01.labels.csv` by hand (`start,end,act,notes`) and run `analyze --vlm-url ""`.

## 5. Build the library

```
python3 trainer.py build --out motion_library.json
```
It prints a table per act showing how much time it saw, how many videos, how many motifs and a motion summary. Sanity-check the summaries. If "blowjob" says *very fast, full-length*, a label is probably wrong.

Optional: `--summary-url http://localhost:11434/v1 --summary-model <text model>` has an LLM condense all the notes for each act into one clean description.

## 6. Load it in SillyTavern

Extensions → **Handy Adaptive** → **Import motion_library.json**. The control panel's act menu now lists your acts, and the AI's prompt includes their descriptions.

**Test each act by hand first.** Pick it in the panel, press ▶, move the intensity slider and steer with the buttons. That's also your first round of taste training.

## 7. Keep teaching it

There's no fixed script for any act. When the scene turns into a blowjob, the engine builds the motion from phrases it learned from your examples, adjusted to your settings for that act. Over time it learns three things:

1. **Settings per act**: speed, stroke length, tip vs. base, and how organic vs. mechanical. The adjust buttons change these immediately, and part of each change is kept for next time.
2. **Which phrases you like**: every learned phrase keeps a running average of how you reacted while it played. ❤ counts +1, 👎 counts −1, and finishing with no reaction counts as a weak "fine".
3. **Which phrases you like together**: the same averaging is applied to phrase *pairs* (phrase A followed by phrase B). That's how it learns, for example, that a teasing tip phrase followed by a slow deep phrase works for you.

**At first it explores**, sampling widely from the library. **As your ratings for an act build up, it settles**, mostly chaining the phrases and combinations you've liked, with less randomness in the timing and depth. It still tries something less proven about 1 phrase in 15, which is how new favorites and combinations get found. It also avoids grinding one phrase over and over, unless you've rated it repeating itself.

The settings show each act's status: *still exploring* → *learning your taste* → *dialed in*. **Try new things** sets the balance: low sticks to proven favorites, high experiments more.

In a simulated test with a user who mostly said nothing and only occasionally rated, about 95% of the phrases played were ones that user liked after roughly 5 minutes. Within about 20 minutes, the engine had also picked up which specific combination they preferred.

| you do | it learns |
|---|---|
| Faster / Slower / Longer / Shorter / Tip / Base / Wilder / Smoother | changes the motion immediately, and part of the change is kept for this act |
| ❤ Love this | the current settings are pulled strongly into this act; phrases and phrase pairs from the last ~8 s are rated up |
| 👎 Not this | phrases and pairs from the last ~8 s are rated down; the next motion is regenerated straight away |
| ⭐ Save favorite | stores the exact setup; the AI can recall it by name |
| nothing | phrases that played through count as mildly OK |

**Tip:** press ❤ at the moment something feels great, not afterwards. Feedback applies to the last ~8 seconds.

The extension also learns from 🔥 I'm close and 🥂 Finished, keeps a separate style and history for each character, and remembers which phrases were playing when you finished. See Part 13 of the [User Guide](docs/USER_GUIDE.md#part-13--teaching-it-your-taste).

**Your own acts.** Besides the built-in acts, you can add your own (`head_licking`, `gag_hold`, …), each with a description. The vision model is given every act's description, plus how your own labelled examples of it move on the stroker, so it labels by your meaning rather than guessing from the name. Guided mode asks if you want to add any, and on later runs it asks for more detail about acts with few, scattered or often-mislabelled examples. Choose **Detailed** or **Very detailed** analysis for short moments: brief holds, such as a gag at the base, are recognized and kept as their own phrases. Press **S** at any time to stop; progress is saved after every slice, and the next run carries on. See [User Guide Part 9](docs/USER_GUIDE.md#your-own-acts).

Training adds up: every analyzed video is saved in `handy_cache`, and each build combines everything there, including videos you've deleted since. To add more, put new pairs in `training/`, run the trainer, build and re-import. Once the library is imported you can delete the videos and scripts. Keep `handy_cache`, though: it's now the only copy of that training.

Videos are recognized by their script, not their file name: a renamed video isn't analyzed twice, and a new video that reuses an old name is kept separately. When rebuilding, each act keeps phrases from the previous library (a fair share per video, up to `--max-motifs`, default 60) and adds the new videos' phrases. Save your exported taste profile as `handy-profile.json` in the `handy-adaptive` folder (or pass `--taste`): phrases you ❤'d or finished to are always kept, and phrases you 👎'd are left out. See [User Guide Part 14](docs/USER_GUIDE.md#part-14--adding-more-training-later).

## Troubleshooting

- **Labels are all one act**: the model may be ignoring the images. Try another model, more `--frames`, or label manually.
- **Motion feels robotic**: add more varied examples for that act, or press *Wilder*.
- **Motion lags behind feedback**: use *Streaming* transport (the default). *Script sync* is smoother but takes about a second to react.
- **Script sync errors**: the upload server may have changed. The extension falls back to streaming automatically. You can change the upload URL under Advanced.
