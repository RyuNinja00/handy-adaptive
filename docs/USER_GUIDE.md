# Handy Adaptive — Complete User Guide

This guide takes you from nothing to an AI that has learned how different acts move and how you like them. Follow the parts in order the first time. Later you can jump to whatever you need.

**Contents**

- [Part 1 — What you need](#part-1--what-you-need)
- [Part 2 — Get your Handy ready](#part-2--get-your-handy-ready)
- [Part 3 — Install the extension in SillyTavern](#part-3--install-the-extension-in-sillytavern)
- [Part 4 — Configure the extension](#part-4--configure-the-extension)
- [Part 5 — First test (before any training)](#part-5--first-test-before-any-training)
- [Part 6 — Set up the chat side](#part-6--set-up-the-chat-side)
- [Part 7 — Prepare your training computer](#part-7--prepare-your-training-computer)
- [Part 8 — Prepare your training videos and scripts](#part-8--prepare-your-training-videos-and-scripts)
- [Part 9 — Run the analysis](#part-9--run-the-analysis)
- [Part 10 — Review and correct the labels](#part-10--review-and-correct-the-labels)
- [Part 11 — Build and import the motion library](#part-11--build-and-import-the-motion-library)
- [Part 12 — Day-to-day use](#part-12--day-to-day-use)
- [Part 13 — Teaching it your taste](#part-13--teaching-it-your-taste)
- [Part 14 — Adding more training later](#part-14--adding-more-training-later)
- [Part 15 — Backups, resets and moving computers](#part-15--backups-resets-and-moving-computers)
- [Part 16 — Safety](#part-16--safety)
- [Part 17 — Troubleshooting](#part-17--troubleshooting)
- [Part 18 — Reference](#part-18--reference)

---

## Part 1 — What you need

**To use it**

| Item | Notes |
|---|---|
| The Handy | Connected to Wi-Fi, with firmware that supports the Handy API v2 (firmware 3 or later) |
| SillyTavern | Recent version, running on a PC/Mac/Linux machine or server |
| A chat model connected to SillyTavern | Any backend works. Larger instruction-following models use the control tags far more reliably than small ones |
| A browser | Wherever you open SillyTavern. The extension runs in the browser tab, so that tab must stay open while playing |

**To train it (optional, but this is what makes it good)**

| Item | Notes |
|---|---|
| A computer | Windows, macOS or Linux. A GPU is strongly recommended for the vision model |
| Python 3.9 or newer | Runs the trainer |
| ffmpeg | Pulls frames out of videos |
| A vision-capable AI model | For example a Gemma vision model, run locally through Ollama, LM Studio, llama.cpp, KoboldCpp or vLLM. Optional: you can label everything by hand instead |
| Videos with matching hand-made `.funscript` files | Your examples. Only legal content of consenting adults |

---

## Part 2 — Get your Handy ready

1. Set up the Handy on Wi-Fi using its official app or website, if you haven't already.
2. Update the firmware if you're offered an update.
3. Find your **connection key**, shown in the Handy's app/web settings after Wi-Fi setup. It's a short code. Keep it private: anyone with it can control the device.
4. Make sure the Handy is switched on and its Wi-Fi LED shows it's online.

---

## Part 3 — Install the extension in SillyTavern

Pick **one** of these methods.

### Method A — Install from GitHub (easiest)

1. Open SillyTavern in your browser.
2. Click the **Extensions** icon (the stacked cubes) in the top bar.
3. Click **Install extension**.
4. Paste: `https://github.com/RyuNinja00/handy-adaptive`
5. Choose whether to install it for your user only or all users, and confirm.
6. Reload the SillyTavern page.

> If the repository is **private**, SillyTavern's server needs git access to your GitHub account. If it can't get it, use Method B.

### Method B — Install from the zip

1. Download `dist/handy-adaptive-v0.3.2.zip` from the repository.
2. Unzip it. You'll get a folder called `handy-adaptive`.
3. Move that folder into one of these locations inside your SillyTavern install:
   - `SillyTavern/data/<your-user>/extensions/` (usually `data/default-user/extensions/`), or
   - `SillyTavern/public/scripts/extensions/third-party/` (older versions / all users)
4. Restart SillyTavern if it was running, then reload the page.

### Method C — git clone (for updating easily later)

```
cd SillyTavern/data/default-user/extensions
git clone https://github.com/RyuNinja00/handy-adaptive
```
Update later with `git pull` inside that folder.

### Check it worked

Open **Extensions**. You should see a **Handy Adaptive** section, and a small **Handy** panel should appear at the bottom-right of the screen. If not, see [Troubleshooting](#part-17--troubleshooting).

---

## Part 4 — Configure the extension

Open **Extensions → Handy Adaptive** and go through each setting:

1. **Enabled**: leave on.
2. **Connection key**: paste the key from Part 2.
3. Click **Test connection**. You should see ✅ connected. If you see ❌, check the key and that the Handy is online.
4. **Motion transport**:
   - **Streaming (reacts instantly)**: the default and recommended. Every stroke is sent live, so feedback buttons take effect within a fraction of a second.
   - **Script sync (smoothest)**: uploads a 2-minute generated script to the device. Motion can be smoother, but changes take about a second. If it fails, the extension switches back to Streaming automatically.
5. **Max speed %**: a hard limit on how fast the device may ever move. **Start low (40–50)** and raise it once you trust it. Nothing the AI or the engine does can exceed it.
6. **Min speed % (pattern mode)**: only matters for the old pattern mode. Leave it as is.
7. **Stroke limits (floor / ceiling)**: the lowest and highest positions the device may use (0 = base, 100 = tip). Narrow these if full-length strokes are uncomfortable.
8. **Auto-stop after idle**: stops the device if no AI command or button press happens for this many seconds (default 600 = 10 min). 0 turns it off. Leaving it on is recommended.
9. **Esc key stops the device**: leave on. Esc becomes a panic button.
10. **Send acts, learned taste + controls to the AI**: must be **on** for the AI to control the device. It adds the instructions, your act list and your learned preferences to every prompt.
11. **AI replies automatically to ❤/👎**: when on, pressing ❤ or 👎 makes the character respond in-story a few seconds later. Optional.
12. **Show control panel**: shows or hides the floating panel.
13. **Try new things** (under Learned taste): how much it experiments vs. sticks to what you've liked. Leave it in the middle to start.
14. **Advanced** (rarely needed): the API base URL and script upload URL. Only change these if the Handy's API moves.

---

## Part 5 — First test (before any training)

Do this before involving the AI, so you know the hardware side works.

1. Put the Handy somewhere safe (not on you yet).
2. In the **Handy** panel, pick an act from the dropdown (e.g. `handjob`) and press **▶**.
3. The device should start moving within a second or two. The panel header shows the live position.
4. Move the **Intensity** slider and watch it respond.
5. Try **Faster**, **Slower**, **Longer**, **Shorter**, **Tip**, **Base**.
6. Press **STOP**. It should stop at once. Then try starting it again and pressing **Esc**.

Until you train a library, the acts are rough **starter profiles** (teasing, handjob, blowjob, deepthroat, cowgirl, missionary, doggy). They work, but they're generic. Training is what makes each act feel right.

---

## Part 6 — Set up the chat side

The extension tells the AI how to control the device. Your job is to make sure the model and the character cooperate.

1. **Use a capable model.** Larger models follow the tag instructions much better. Very small models may forget the tags or invent wrong ones.
2. **Check the instructions are reaching the AI.** Send a message, then open the prompt inspector (the "Prompt itemization" / prompt view on a message). Look for a block starting `[Device control:`. If it's missing, check that *Send acts, learned taste + controls to the AI* is on.
3. **Optional: help the character.** Add a line like this to the character card or Author's Note:
   > {{char}} controls {{user}}'s stroker toy using <handy .../> tags as described in the device control instructions, changing it whenever the physical action changes.
4. **Optional: hide tags while streaming.** With message streaming on, a tag can flash on screen for a moment before it's removed. To hide it, open the **Regex** extension and add a script with:
   - Find: `/<handy\b[^>]*\/?>/g`
   - Replace with: *(empty)*
   - Only enable **Alter Chat Display** (so the tag still reaches the extension).
5. **Try it.** Start a scene. When something physical happens, the AI's reply should contain a tag (you won't see it), and the device should start. The panel shows the current act and intensity.

What the AI can send (it learns this from the injected instructions):
```
<handy act="blowjob" intensity="0.4"/>                start / change act
<handy act="blowjob" intensity="0.8" depth="0.3"/>    more intense, more at the tip
<handy act="cowgirl" intensity="0.6" blend="handjob:0.3"/>   mix in a second act
<handy favorite="slow tease"/>                       play a saved favorite
<handy stop/>                                         stop
```

---

## Part 7 — Prepare your training computer

Do this once on whatever computer will run the trainer. It doesn't have to be the one running SillyTavern.

### 7.1 Install Python

- **Windows:** install from python.org and tick **"Add Python to PATH"** during setup. In the commands below use `python` instead of `python3`.
- **macOS:** `brew install python` (with Homebrew), or the python.org installer.
- **Linux:** usually preinstalled. Otherwise `sudo apt install python3`.

Check with: `python3 --version` (or `python --version` on Windows). It should say 3.9 or higher.

### 7.2 Install ffmpeg

- **Windows:** `winget install Gyan.FFmpeg`, then open a new terminal.
- **macOS:** `brew install ffmpeg`
- **Linux:** `sudo apt install ffmpeg`

Check with: `ffmpeg -version`

### 7.3 Get the trainer

Either clone the repository:
```
git clone https://github.com/RyuNinja00/handy-adaptive
cd handy-adaptive/trainer
```
or download the repository as a zip from GitHub and open a terminal in its `trainer` folder. The trainer is a single file, `trainer.py`, and needs no extra packages.

### 7.4 Set up a vision model (optional but recommended)

The easiest route is **Ollama**:

1. Install Ollama from ollama.com.
2. Find a vision-capable model in the Ollama library (for example a Gemma vision model) and pull it:
   ```
   ollama pull <model-name>
   ```
3. Run `ollama list` and note the exact model name. You'll pass it to the trainer with `--model`.
4. Ollama serves an OpenAI-compatible API at `http://localhost:11434/v1`, which is the trainer's default. Nothing else to configure.

Other servers work too. Pass their address with `--vlm-url`:

| Server | Typical `--vlm-url` |
|---|---|
| Ollama | `http://localhost:11434/v1` (default) |
| LM Studio | `http://localhost:1234/v1` |
| llama.cpp `llama-server` | `http://localhost:8080/v1` |
| KoboldCpp | `http://localhost:5001/v1` |

If your server needs a key, add `--api-key YOURKEY`.

**About refusals:** some models refuse or give vague answers on explicit images. If that happens, try a less filtered variant of the model, or skip the vision model and label by hand (Part 10). The motion learning works the same either way. The vision model mainly saves you labelling time and adds descriptive notes.

**Privacy:** with a local model nothing leaves your computer. If you point `--vlm-url` at a cloud service, video frames are uploaded to it.

---

## Part 8 — Prepare your training videos and scripts

1. Make a folder, e.g. `training`, inside the `handy-adaptive` folder (it's git-ignored so it will never be uploaded).
2. Put each video and its script side by side with **exactly the same name**:
   ```
   training/
     scene01.mp4       scene01.funscript
     scene02.mkv       scene02.funscript
     scene03.webm      scene03.funscript
   ```
   Supported video types: mp4, mkv, webm, mov, avi, m4v, wmv.
3. Choose good examples:
   - **Hand-made, well-synced scripts.** Auto-generated or out-of-sync scripts teach the wrong motion.
   - **Variety over volume.** Several different videos and scripters per act beat one long video.
   - **Target 2–5 minutes of footage per act.** Under 2 minutes, an act will feel repetitive.
   - A video can contain many acts. The trainer splits it up.

---

## Part 9 — Run the analysis

### Easy way: guided mode (recommended)

1. **Start your model server.**
   - **LM Studio:** download your vision model. Then open the **Developer** tab (the green `>_` icon on the left), load the model at the top, and switch **Status** to **Running**. To check, open `http://localhost:1234/v1/models` in a browser. It should list your model.
   - **Ollama:** just make sure Ollama is running.
2. **Put your videos and scripts** in the `training` folder inside `handy-adaptive` (Part 8).
3. **Start the trainer:**
   - **Windows:** double-click **`Train.bat`** in the `handy-adaptive` folder.
   - **macOS:** double-click **`train.command`**. The first time, you may need to right-click it and choose Open.
   - **Any system:** open a terminal in the `trainer` folder and run `python trainer.py` (Windows) or `python3 trainer.py` (Mac/Linux) with **no options**.
4. **Answer the questions:**
   - **Folder:** press Enter to use the `training` folder, or paste another path. It lists which videos have a matching script.
   - **Model:** it finds LM Studio or Ollama on its own and lists your models. Type the number of your **vision** model.
   - It then analyzes everything. This takes a while. You can stop with Ctrl+C and run it again later, and finished parts are kept.
   - **Build now?** The first time, answer **n**, check the labels (Part 10), then run it again and answer **y**.
5. When it finishes, it shows where `motion_library.json` was saved. Import that file (Part 11).

### Manual way: command line

Use this if you want to change options. Open a terminal in the `trainer` folder:
```
python trainer.py analyze ../training --vlm-url http://localhost:1234/v1 --model <model name>
```
- `--vlm-url http://localhost:1234/v1` is needed for **LM Studio**. Without it, the trainer looks for Ollama.
- `<model name>` must exactly match what `http://localhost:1234/v1/models` shows, or the model's API identifier in LM Studio's Developer tab.
- On Windows, if `python` isn't found, use `py` instead.
- The `analysis` and `build` commands save files under the folder you run them from. Guided mode always saves to `handy-adaptive/handy_cache` and `handy-adaptive/motion_library.json`.

For each video you'll see progress like:
```
- scene01.mp4  +  scene01.funscript
  0:00.00-0:10.00  asking VLM (4 frames)... blowjob
  0:10.00-0:20.00  asking VLM (4 frames)... blowjob
  ...
  labelled time: blowjob 240s, handjob 90s, other 30s
  review/correct: handy_cache/scene01.review.csv  ->  save as ../training/scene01.labels.csv
```

What happens in each 10-second window:
- The script is measured: strokes per second, stroke length, where in the range (tip/base), rhythm regularity, up/down asymmetry, pauses, speeding up or slowing down.
- 4 frames are pulled from the video.
- The model is told how the device moves in that window and asked which act it is, the body position, who is moving, how the bodies move, and **how that movement corresponds to the strokes**.

### Useful options

| Option | Default | What it does |
|---|---|---|
| `--model NAME` | `gemma4` | Vision model name as your server lists it |
| `--vlm-url URL` | Ollama | Model server address. `--vlm-url ""` disables the model (manual labels only) |
| `--window SEC` | 10 | Length of each analysis window. Smaller = finer boundaries, more model calls |
| `--frames N` | 4 | Frames per window. More = often more accurate, slower |
| `--width PX` | 640 | Frame width sent to the model |
| `--labels "a,b,c"` | built-in list | Your own act vocabulary for the model to choose from |
| `--script FILE` | same name | Use a specific script (single video only) |
| `--labels-csv FILE` | `<video>.labels.csv` | Use a labels file from somewhere else |
| `--vlm-notes` | off | Still ask the model for notes even when you've provided labels |
| `--cache DIR` | `handy_cache` | Where results go |
| `--timeout SEC` | 300 | Per-request timeout for slow models |

Built-in act list: `blowjob, deepthroat, handjob, titjob, footjob, cowgirl, reverse_cowgirl, missionary, doggy, standing, teasing, other`.

---

## Part 10 — Review and correct the labels

This step matters most for quality. Even good models make mistakes.

1. Open `handy_cache/<video>.review.csv` in Excel, Google Sheets, LibreOffice or any text editor. Columns:

   | column | meaning |
   |---|---|
   | `start`, `end` | segment times (`m:ss.ss`) |
   | `act` | the model's label: **this is what you correct** |
   | `confidence` | the model's confidence (0–1) |
   | `position` | body position the model saw |
   | `notes` | how the bodies move and how it maps to the strokes |
   | `motion` | plain-language description of what the script does there |

2. Go through each row:
   - **Wrong act?** Change `act`.
   - **Want a new act?** Just type a new name, such as `edging`, `sloppy_bj` or `slow_grind`. Any name you use becomes an act the AI can use. Use lowercase with underscores.
   - **Boundary off?** Edit `start` / `end`. Times can be `m:ss`, `m:ss.ss` or plain seconds.
   - **Junk segment** (cutaway, talking, out-of-sync script)? Set `act` to `other` and it will be left out.
   - **Improve the notes.** They're shown to the AI as the description of the act. A line like *"teasing licks at the tip with long pauses, then sudden deep strokes"* helps a lot.
   - You can add rows and delete rows. Only `start`, `end`, `act` are required. `notes` and `position` are optional.
3. Save the file **next to the video** as `<video name>.labels.csv`, e.g. `training/scene01.labels.csv`. Keep it in CSV format.
4. Run the analysis again (guided mode, or the same command as before). It now says `using your labels from ...`, applies them, and reuses the cached model notes. Your labels always override the model's.

### Labelling entirely by hand (no vision model)

Create `training/scene01.labels.csv` yourself:
```
start,end,act,notes
0:00,1:45,teasing,"slow licks at the tip, long pauses"
1:45,4:30,blowjob,"steady bobbing, occasionally takes it deep"
4:30,6:00,handjob,"fast strokes, twisting at the top"
```
Then run:
```
python3 trainer.py analyze ../training --vlm-url ""
```

---

## Part 11 — Build and import the motion library

1. Build: answer **y** to *Build now?* in guided mode, or run:
   ```
   python trainer.py build --out motion_library.json
   ```
2. Read the summary table it prints:
   ```
   act                  time  vids  motifs  motion
   blowjob              310s     4      40  moderate (1.4 strokes/s), medium strokes near the tip ...
   handjob              190s     3      38  moderate (2.1 strokes/s), long strokes around the middle ...
   ```
   - **time / vids**: how much example footage each act has. Under 120 s gets a warning.
   - **motifs**: how many short phrases were learned for the act (max 40 by default).
   - **motion**: sanity-check this. If `blowjob` says *very fast, full-length*, a label is probably wrong. Fix it in Part 10 and rebuild.
3. Build options:

   | Option | Default | What it does |
   |---|---|---|
   | `--out FILE` | `motion_library.json` | Output file |
   | `--min-confidence X` | 0.5 | Skip model labels below this confidence (your manual labels always count) |
   | `--max-motifs N` | 40 | Phrases kept per act |
   | `--ignore "a,b"` | — | Leave extra acts out |
   | `--summary-url URL` | — | An LLM server to condense each act's notes into one clean description |
   | `--summary-model NAME` | same as `--model` | Model for that summary |

4. Import into SillyTavern:
   1. Open **Extensions → Handy Adaptive**.
   2. Under **Motion library**, click **Import motion_library.json** and select the file.
   3. The library summary lists your acts, and the panel's act dropdown now shows them.
5. **Test each act by hand** (as in Part 5) before using it in a scene. This is also your first round of taste training.

---

## Part 12 — Day-to-day use

1. Turn on the Handy and open SillyTavern.
2. Check the panel isn't showing an error. Optionally click **Test connection**.
3. Chat as normal. The AI starts, changes and stops the device as the scene progresses.
4. Use the panel while playing:

| Button | Effect |
|---|---|
| **STOP** | Stops immediately |
| **Faster / Slower** | Changes speed by about 15% |
| **Longer / Shorter** | Changes stroke length |
| **Tip / Base** | Moves the stroke range up or down |
| **Wilder / Smoother** | More organic and varied vs. more steady and mechanical |
| **❤ Love this** | Strong positive rating for what's playing now |
| **👎 Not this** | Negative rating; switches to something else at once |
| **Act dropdown + ▶** | Play an act yourself |
| **Intensity slider** | Overall intensity of the current act |
| **⭐** | Save exactly what's playing as a named favorite |
| **Favorites dropdown** | Replay a saved favorite |
| **⌄** (top right) | Collapse the panel |

5. You can always take over manually with the panel. The AI picks up from the new state on its next reply. Your feedback since its last reply is passed to it, so the character can react ("You like it slower like this?").

---

## Part 13 — Teaching it your taste

There is no fixed script for any act. For each act the engine combines:
- the phrases and statistics learned from your training videos,
- your personal settings for that act (speed, length, depth, variation),
- your ratings of individual phrases and of phrase **combinations** (which phrase you like after which).

**How it learns:**

| You do | It learns |
|---|---|
| Faster / Slower / Longer / Shorter / Tip / Base / Wilder / Smoother | The change applies now, and part of it is kept as your preference for this act |
| ❤ Love this | Current settings strongly kept for this act; phrases and phrase pairs from the last ~8 s rated up |
| 👎 Not this | Phrases and pairs from the last ~8 s rated down; plays something different immediately |
| ⭐ Save favorite | Exact setup stored; you or the AI can recall it by name |
| Nothing | Phrases that played through count as mildly OK |

**How it behaves over time:**
- **New act**: explores, sampling widely from what it learned.
- **After some ratings**: mostly plays the phrases and combinations you've liked, with steadier timing.
- **Even when dialed in**: about 1 phrase in 15 is something less proven. That's how it finds new favorites. It also avoids repeating one phrase endlessly unless you've shown you like that.

Each act's status appears in the settings under *Learned taste*: **still exploring → learning your taste → dialed in**.

**Tips:**
- Press ❤ **at the moment** something feels great. It applies to the last ~8 seconds.
- Use 👎 freely. It's how bad phrases get weeded out.
- Each act learns separately. Taste for handjobs doesn't change cowgirl.
- If it feels samey, move **Try new things** up. If it keeps wandering away from what you like, move it down.

---

## Part 14 — Adding more training later

1. Add new video + script pairs to `training/`.
2. Run `analyze` again. Already-analyzed videos come from cache, so only new ones are processed.
3. Review the new videos' CSVs (Part 10).
4. Run `build` again.
5. Import the new `motion_library.json` in SillyTavern. It replaces the old library.

Your taste profile is separate and is kept. Ratings for phrases that came from videos still in the library carry over.

---

## Part 15 — Backups, resets and moving computers

| Task | How |
|---|---|
| Back up your learned taste | Settings → Learned taste → **Export** (saves `handy-profile.json`) |
| Restore it / move to another install | **Import** under Learned taste |
| Back up the motion library | Keep your `motion_library.json` file (and ideally `training/` + `handy_cache/`) |
| Start taste learning over | **Reset** under Learned taste (the motion library is kept) |
| Go back to starter acts | Motion library → **Use starter defaults** |
| Uninstall | Delete the `handy-adaptive` folder from your SillyTavern extensions folder (or use the extension manager), then reload |

Everything the extension learns is stored in SillyTavern's own settings for your user. Updating the extension doesn't erase it.

---

## Part 16 — Safety

- **Start with a low Max speed** and narrow stroke limits until you're comfortable.
- **Three ways to stop:** the STOP button, the **Esc** key, and the **physical button** on the Handy, which always works even if the browser or network fails.
- **Auto-stop:** after the idle time, when you switch chats, and when you close or reload the page.
- In Streaming mode every move is "stop on target": if the connection drops, the device stops where it is instead of continuing.
- Keep your connection key private.
- Only train on legal content of consenting adults.

---

## Part 17 — Troubleshooting

**Extension doesn't appear**
- Make sure the folder is directly inside the extensions folder and contains `manifest.json` at its top level, not inside a nested `handy-adaptive/handy-adaptive/`.
- Reload the page, and restart SillyTavern if you copied files in.
- Open the browser console (F12) and look for errors mentioning `handy`.

**Test connection fails**
- Re-check the connection key (no spaces).
- Make sure the Handy is on and online, and the firmware is up to date.
- Browser extensions that block requests (ad/privacy blockers) can interfere. Try allowing `handyfeeling.com`.

**The AI never moves the device**
- *Send acts, learned taste + controls to the AI* must be on.
- Check the prompt contains the `[Device control:` block (Part 6, step 2).
- Try a larger or more instruction-following model, or add the character-card line from Part 6.
- Tags must be in the AI's reply, not yours.

**Tags appear in the chat text**
- They're removed once the message finishes. To hide them during streaming, add the Regex script from Part 6.

**Motion is jerky or lags**
- Streaming depends on your network. A wired or 5 GHz connection for the SillyTavern machine helps.
- Try **Script sync** transport for smoother (but slower-reacting) motion.

**Script sync keeps failing / switches back to Streaming**
- The script upload service may have changed or be unreachable. Streaming works without it. The upload URL is under Advanced.

**Device stops by itself**
- That's the idle auto-stop. Raise *Auto-stop after idle* or set it to 0.

**Trainer: `'python' is not recognized` (Windows)**
- Use `py` instead of `python`, or reinstall Python with **Add Python to PATH** ticked. `Train.bat` tries both.

**Trainer: `ffmpeg` not found / "could not read frames"**
- Install ffmpeg (Part 7.2) and open a new terminal.

**Trainer: "VLM failed" / connection refused / "No model server found"**
- Make sure the model server is running. In LM Studio the Developer tab's Status must say **Running** with your model loaded. Check by opening `http://localhost:1234/v1/models` in a browser.
- On the command line, LM Studio needs `--vlm-url http://localhost:1234/v1`, and `--model` must match a name from that list exactly.
- If you get errors only on the first requests, make sure the model is fully loaded first.
- Slow model? Add `--timeout 600`.

**Trainer: every window gets the same label, or nonsense**
- The model may be ignoring images or refusing. Try another vision model or more `--frames`, or label by hand (Part 10).

**Trainer: "no matching .funscript, skipping"**
- The script must have the same name as the video (e.g. `scene01.mp4` + `scene01.funscript`).

**An act feels repetitive or wrong**
- Add more varied examples for it, check its labels, rebuild, re-import.
- Check the `motion` description in the build summary looks right for that act.

---

## Part 18 — Reference

### Control tags

| Attribute | Range | Meaning |
|---|---|---|
| `act` | any act in your library | What is physically happening |
| `intensity` | 0–1 | 0 gentle/slow → 1 frantic |
| `depth` | −1 to 1 | −1 deep/base, +1 shallow/tip |
| `variation` | 0–1 | 0 mechanical → 1 wild (omit to use your learned taste) |
| `blend` | `act:weight,...` | Mix in other acts, e.g. `handjob:0.4` |
| `duration` | seconds | After this time, intensity eases off |
| `favorite` | a favorite's name | Play a saved favorite |
| `stop` | — | Stop |

Legacy pattern mode: `<handy pattern="steady|wave|build|pulse|tease|edge|deep" speed="0-100" min="0-100" max="0-100" period="sec" depth="0-40"/>`

### Files

| File | Where | What |
|---|---|---|
| `<video>.funscript` | `training/` | Your hand-made script (input) |
| `<video>.labels.csv` | `training/` | Your corrected labels (input) |
| `<video>.analysis.json` | `handy_cache/` | Measurements + model results per window |
| `<video>.review.csv` | `handy_cache/` | Editable segment list for review |
| `motion_library.json` | trainer folder | What you import into the extension |
| `handy-profile.json` | wherever you save it | Exported taste profile |

### What the library stores per act

Stroke rate, stroke length, center/top/bottom of range, rhythm irregularity, up/down asymmetry, pause frequency, velocity, a plain-language motion description, the model's notes and description, the body positions seen, and up to 40 short stroke phrases ("motifs") cut from your scripts.

### Running the project's tests (developers)

From the repository root (needs Node.js, Python 3 and ffmpeg):
```
npm test
```
This runs synthesizer checks, a simulated learning session, and a full trainer run against a mock vision model.
