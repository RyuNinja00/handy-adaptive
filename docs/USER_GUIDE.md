# Handy Adaptive — Complete User Guide

This guide takes you from nothing to an AI that has learned how different acts move and how you like them. Follow the parts in order the first time. Later you can jump to whatever you need.

> **Using Marinara Engine instead of SillyTavern?** Follow **[the Marinara guide](MARINARA.md)** in place of Parts 3–6. Every other part, including training and calibration, is the same.

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
| The Handy | Connected to Wi-Fi. Firmware 3 works with Streaming and Script sync (Handy API v2); firmware 4 works best with Buffered streaming (API v3, needs an Application ID, see Part 4) |
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

1. Download `dist/handy-adaptive-v0.15.0.zip` from the repository.
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

1. **Enabled**: leave on. Unticking it stops the device at once.
2. **Connection key**: paste the key from Part 2.
3. Click **Test connection**. You should see ✅ connected and the round-trip time in ms. If you see ❌, check the key and that the Handy is online.
4. **Motion transport**:
   - **Streaming (reacts instantly)**: the default, and the right choice on firmware 3 when the SillyTavern tab stays visible. Every stroke is sent live over the internet, so feedback buttons take effect within a fraction of a second, but smoothness depends on your connection. Each stroke is aimed slightly past its turning point so a late command finds the sleeve still gliding instead of standing still; on a slow or uneven connection (above roughly 300 ms) it can still feel choppy, and the extension tells you once and suggests Script sync.
   - **Script sync (smooth)**: uploads a 2-minute generated script to the device. Changes take about a second, and the device pauses for a moment whenever a new script is loaded (on each change, and about every two minutes). If it fails, the extension switches back to Streaming automatically.
   - **Buffered streaming (Handy firmware 4)**: the recommended choice if your Handy runs firmware 4. The extension keeps about 5 seconds of motion stored on the device and tops it up, using Handy's API v3. Motion stays smooth on a slow network and when SillyTavern is in a background tab, and changes still take effect in about half a second, always at a turning point so nothing jerks. It needs an **API v3 Application ID** (next item). If the Handy servers refuse it, or your firmware is older, the extension tells you and switches to Streaming. If the network drops for more than a few seconds, the extension stops, and the device pauses by itself once its stored motion runs out.
   - **API v3 Application ID**: only for Buffered streaming. Sign in to Handy's developer portal (linked from Handy's developer documentation at handyfeeling.com/api/handy-rest/v3/docs), create an application, and paste its Application ID here. It identifies the app, not you; your connection key is still what grants access to your device.
   - **Which to pick:** Buffered streaming on firmware 4. Otherwise, Streaming if the SillyTavern tab stays visible (browsers slow down background tabs and Streaming then drops to about one stroke per second), or Script sync if it will sit behind another tab or a full-screen video.
5. **Max speed %**: a hard limit on how fast the device may ever move. The default is 80; **start low (40–50)** and raise it once you trust it. Nothing the AI or the engine does can exceed it, values above 100 count as 100, and a change takes effect within a second or two even while it's moving.
6. **Min speed % (pattern mode)**: only matters for the old pattern mode. Leave it as is.
7. **Stroke limits (floor / ceiling)**: the lowest and highest positions the device may use (0 = base, 100 = tip). Narrow these if full-length strokes are uncomfortable. Entered the wrong way round, they're swapped.
8. **Auto-stop after idle**: stops the device if nothing happens for this many seconds. An AI command, a button press and any message you send all count, so the device keeps going while you're chatting and stops if you walk away. The default is 600 (10 minutes). 0 turns it off. Leaving it on is recommended.
9. **Esc key stops the device**: leave on. Esc becomes a panic button.
10. **Send acts, learned taste + controls to the AI**: must be **on** for the AI to control the device. It adds the instructions, your act list and your learned preferences to every prompt. Expect roughly 600 to 1,000 tokens per prompt once styles, memory and the arousal estimate are in play.
11. **AI replies automatically to ❤/👎**: when on, pressing ❤ or 👎 makes the character respond in-story a few seconds later. Optional.
12. **When I press "I'm close"**: *Ease off at once, then the AI reacts* (default) drops the intensity immediately, because an AI reply takes seconds. *Let the AI decide* leaves the motion alone and asks the AI to reply right away, so it can pull back, hold you there or push you over.
13. **When I press "Finished"**: *Wind down gently for 20 s, then stop* (default), *Stop at once*, or *Let the AI decide*.
14. **Notice “I'm close” / “I'm cumming” in my messages** (on by default): for when your hands are busy. Writing "I'm so close" or "gonna cum" acts like the 🔥 button; "I'm cumming" or "I just came" acts like 🥂 Finished. Questions ("are you cumming?"), negations ("I'm not cumming yet") and everyday phrases ("close to the door", "I came home") are ignored.
15. **Safeword**: optional. If this word appears anywhere in a message you send, the device stops at once. Pick something that won't come up in the story. A short message (up to five words) such as “stop”, “stop, please”, “ok halt” or “red” always stops it too; “don't stop” and questions such as “can you stop?” never do.
16. **Reading speed for replies with several tags** (words/min, default 220): when a reply holds more than one tag, the first plays at once and each later one waits until you'd have read up to it. Lower it if the motion runs ahead of your reading, raise it if it lags. 0 plays every tag at once.
17. **Follow the story when a reply has no tag** (on by default): if the AI describes a change but forgets the tag, the motion that's playing is nudged to match. See *Following the story* in Part 13.
18. **Add detail** (on by default): small touches between phrases: flutters at the tip, slow drags, deep pulses. See *Detail touches* in Part 13.
19. **Estimate my arousal and tell the AI** (on by default): see *Arousal estimate* in Part 13.
20. **Ask me to confirm calibration before the first motion of each session** (on by default): before anything moves after SillyTavern loads, it asks whether the Handy is set up as last time, so you can recalibrate first. See *Calibrate to your body* in Part 5.
21. **Show control panel**: shows or hides the floating panel.
22. **Saved setups** (under Calibration): keep a calibration for each way you use the Handy and switch between them. See *Saved setups* in Part 5.
23. **Give each character their own stroking style** (under Character styles, on by default): each character moves the Handy their own way, read from their card and refined by your feedback. See *Character styles* in Part 13.
24. **Read character cards with** (under Character styles): the connection profile that reads each card. Choose your local `Background` profile, or *Keywords only (no AI)*.
25. **Try new things** (under Learned taste): how much it experiments vs. sticks to what you've liked. Leave it in the middle to start.
26. **Advanced** (rarely needed): the API base URL and script upload URL. Only change these if the Handy's API moves.

---

## Part 5 — First test (before any training)

Do this before involving the AI, so you know the hardware side works.

1. Put the Handy somewhere safe (not on you yet).
2. In the **Handy** panel, pick an act from the dropdown (e.g. `handjob`) and press **▶**.
3. The first time in each session, a **New session: same setup?** box appears before anything moves (see *Each new session* below). For this test, press **Start without calibrating** (or **Use it and start** if you've already calibrated).
4. The device should start moving within a second or two. The panel header shows the live position.
5. Move the **Intensity** slider and watch it respond.
6. Try **Faster**, **Slower**, **Longer**, **Shorter**, **Tip**, **Base**.
7. Press **STOP**. It should stop at once. Then try starting it again and pressing **Esc**, and once more sending a chat message that says only `stop`.

### Calibrate to your body (recommended)

Out of the box, "tip" and "base" mean the ends of the device's travel, which rarely match your body. Calibration fixes that: you move the sleeve to your own tip and base, and from then on every act, every *Tip* / *Base* press and every AI depth request lands where it should.

1. Click the **ruler** button on the floating Handy panel (or **Calibrate to my body** in **Extensions → Handy Adaptive**).
2. Wear the Handy and keep still. Press **Start**. The sleeve moves slowly to the middle (or, if you have calibrated before, to where your tip was last time). This can take up to 4 seconds; the arrow buttons appear once it has arrived.
3. Use **▲ +2 / ▲▲ +10 / ▼ −2 / ▼▼ −10** (or the **↑ ↓** keys, Shift for big steps) until the sleeve is at your **tip**, as far out as it should ever go. Each press moves it after the previous one finishes, so quick presses add up and the readout shows where it's heading ("moving…" while it travels). Press **This is my tip** once it has stopped.
4. Move it to your **base**, as deep as it should ever go. Press **This is my base**. (When recalibrating, the sleeve first moves to just short of where your base should be now, worked out from last time and how far your tip moved. It never goes deeper than before; you fine-tune the last bit.)
5. Press **Test** for two slow full strokes. If they feel right, press **Save**. Otherwise use **Back**: the sleeve returns to the mark you're adjusting (base first, then tip), and you fine-tune it up or down from there.

Calibration moves are deliberately slow and one step at a time, so they look stepwise; that's expected and separate from how play feels.

While the calibration is open, nothing else can move the device: Play, Finish me, favorites and the AI's tags are held off until you save or cancel.

The extension uses the device's whole stroke range and applies your calibration and stroke limits itself. A stroke range set in the Handy app or with the device's buttons is reset to full when an act or the calibration starts, because it would otherwise squeeze every stroke and shift your calibration.

**If the arrows move the sleeve the wrong way.** After each move, the extension asks the Handy where it actually is and warns you on the calibration screen if something's off:
- **"The sleeve is moving the opposite way"**: press **Flip direction**. Every position sent to the Handy is then mirrored, for calibration and play alike, and the setting is remembered. You can also use the **Arrows move the sleeve the wrong way?** link at any time, for example if ▼ raises the sleeve and ▲ lowers it (some mounts hold the Handy upside down, and not every Handy reports its position).
- **Every button raises it, or "go to 50" sends it nearly to the top**: some firmware 4 Handys read streamed positions on a 0–1 scale instead of 0–100, so every position looks like "the top". On firmware 4, calibration checks this at the start (two slow test moves) and switches by itself. If your Handy doesn't report its position, press **Try the other position format** on the calibration screen (in the *wrong way?* help). The choice is also under *Position format (Streaming)* in the settings and applies to play as well.
- **"The Handy says the sleeve isn't moving to where the buttons ask"**, or every button raises it: this usually means the Handy runs **firmware 4** and is being driven through the older API. Add an **API v3 Application ID** in the settings (Part 4). Calibration then uses the newer API automatically. For play, choose **Buffered streaming** as the Transport.

**Test connection** shows your Handy's firmware version, with a tip if a firmware 4 Handy isn't on Buffered streaming.

Calibration moves are slow (25%/s at most). STOP, Esc, a typed "stop" and the device's own button all work, and AI tags are ignored until you finish. The **Stroke limits** now apply within your calibrated range (0 = your base, 100 = your tip), and the **Max speed** stays a limit on the device itself. **Clear calibration** returns to the full device range.

#### Each new session

The Handy rarely sits at exactly the same height and angle twice, so before the first motion after SillyTavern loads, a **New session: same setup?** box appears and nothing moves until you answer:

- **Use it and start**: same setup as last time. The waiting command starts with your saved calibration.
- **Recalibrate**: you've moved it. The calibration opens at your old tip and base, so a re-check takes a few taps. The waiting command is dropped; the next one starts normally once you've saved.
- **STOP**: nothing moves, and you'll be asked again next time.

If you have saved setups, the box also has a **Setup** menu: pick the one you're using today and press **Use it and start**.

If you have never calibrated, the choices are **Start without calibrating** and **Calibrate now**. Turn the question off with **Ask me to confirm calibration before the first motion of each session** in the settings. You can recalibrate at any time with the ruler button on the panel.

#### Saved setups

If you use the Handy in more than one way (lying down, sitting, in a mount), save a calibration for each:

1. Calibrate for that position.
2. In the settings under **Calibration**, press **Save current as…** and name it ("Lying down").
3. Repeat for the next position.

Switch with the **Setup** menu on the panel, in the settings, or in the start-of-session box. Switching stops any motion first, because the same stroke would land somewhere else on the device (so does **Clear calibration**). If you recalibrate while a setup is in use, you're asked whether to update that setup or keep it as it was. **Delete setup** removes the one in use and leaves your current calibration alone.

Until you train a library, the acts are rough **starter profiles** (teasing, handjob, blowjob, deepthroat, cowgirl, missionary, doggy). They work, but they're generic. Training is what makes each act feel right.

---

## Part 6 — Set up the chat side

The extension tells the AI how to control the device. Your job is to make sure the model and the character cooperate.

1. **Use a capable model.** Larger models follow the tag instructions much better. Very small models may forget the tags or invent wrong ones.
2. **Check the instructions are reaching the AI.** Send a message, then open the prompt inspector (the "Prompt itemization" / prompt view on a message). Look for a block starting `[Device control:`. If it's missing, check that *Send acts, learned taste + controls to the AI* is on.
3. **Optional: help the character.** Add a line like this to the character card or Author's Note:
   > {{char}} controls {{user}}'s stroker toy using <handy .../> tags as described in the device control instructions, changing it whenever the physical action changes.
4. **Recommended: give each character a clear personality.** Character styles (Part 13) are read from the card's description, personality, scenario and tags. A plain line such as "shy and inexperienced", "dominant and teasing" or "wild and insatiable" gives the character a distinct feel on the device. Check what was picked up under **Extensions → Handy Adaptive → Character styles**.
5. **Optional: hide tags while streaming.** With message streaming on, a tag can flash on screen for a moment before it's removed. To hide it, open the **Regex** extension and add a script with:
   - Find: `/<handy\b[^>]*\/?>/g`
   - Replace with: *(empty)*
   - Only enable **Alter Chat Display** (so the tag still reaches the extension).
6. **Try it.** Start a scene. When something physical happens, the AI's reply should contain a tag (you won't see it), and the device should start. The panel shows the current act and intensity.

What the AI can send (it learns this from the injected instructions):
```
<handy act="blowjob" intensity="0.4"/>                start / change act
<handy act="blowjob" intensity="0.8" depth="0.3"/>    more intense, more at the tip
<handy act="cowgirl" intensity="0.6" blend="handjob:0.3"/>   mix in a second act
<handy favorite="slow tease"/>                       play a saved favorite or signature move
<handy save="Velvet Spiral"/>                        name what's playing as the character's signature move
<handy climax="30"/>                                 build to a peak over 30 s and push you over
<handy act="blowjob" intensity="0.6" with="Mia"/>   a second character joins in (group chats)
<handy stop/>                                         stop
```

A reply can hold several tags. Each one plays when you'd reach it while reading, so a reply that starts slow, speeds up halfway and eases off at the end plays out that way.

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
4. **Answer the questions.** Before analyzing, it sends one test image to check the model can read images, and explains any problem.
   - **Folder:** press Enter to use the `training` folder, or paste another path. It lists which videos have a matching script.
   - **Model:** it finds LM Studio or Ollama on its own and lists your models. Type the number of your **vision** model.
   - **Your own acts (optional):** it shows the act list and asks whether you want to add any. If you do, type each name (for example `gag_hold` or `head_licking`) and a description. See [Your own acts](#your-own-acts) below.
   - **Acts that need a better description:** on later runs it lists acts with few examples, scattered examples, or ones the vision model keeps getting wrong, and asks you for more detail. Press Enter to skip any of them.
   - **Detail:** **Normal** (10-second slices), **Detailed** (5 s) or **Very detailed** (3 s). Finer slices catch short moments, like a few seconds of gagging at the base, but take longer. It remembers your choice.
   - It then analyzes everything. This takes a while. **Press S at any time to stop** (see [Stopping and carrying on](#stopping-and-carrying-on)).
   - **Review page?** Answer **y** to check and correct the labels in your browser (Part 10). Press Enter in the trainer window when you're done.
   - **Build now?** After reviewing, answer **y**.
5. When it finishes, it shows where `motion_library.json` was saved. Import that file (Part 11).

### Your own acts

The trainer comes with a list of common acts, each with a short description. You can add your own, such as `head_licking`, `tip_sucking` or `gag_hold`. Each one becomes its own act, with its own learned motion and your own taste ratings, and the AI can use it in a scene.

**The description is what makes it work.** The vision model doesn't know what you mean by a name, so every question it's asked includes each act's description. Say what you'd see and how it differs from similar acts. For example: *"Holds it all the way down at the base for a few seconds, may pull off coughing. Not regular deepthroat strokes."* The description also goes into the motion library, so the chat AI knows when to use the act.

It also learns from your corrections. Once you've labeled an act yourself a couple of times (Part 10), the vision model is also shown how your examples of it move on the stroker (for example *"holds still at the base for 3 s; usually lasts about 4 s"*). Its first guesses get closer to yours as you train more.

Ways to add acts:
- Guided mode asks (above).
- Type a new name in a label file (Part 10). It's added to the list, and guided mode asks you to describe it next time.
- On the command line, `--labels "head_licking,gag_hold"` adds them.

Your list and descriptions are saved in `handy_cache/acts.json`. To rewrite a description completely, edit that file in any text editor. You can also change the built-in descriptions there.

For short acts, choose **Detailed** or **Very detailed**. With 10-second slices, a 3-second moment is blended into what's around it, and a 3-second label you type in a label file is ignored.

### Stopping and carrying on

**Press S** (or Esc) in the trainer's window at any time. It stops right away, even in the middle of a question to the vision model. Everything done so far is saved after every slice. Run the trainer again and it carries on from where it stopped, without asking the model anything twice. Ctrl+C does the same, though on Windows the window may then ask "Terminate batch job?". Either answer is fine.

If you stop part-way through re-analyzing a video you'd already finished, for example after correcting its labels, the rest of the earlier analysis is kept. A build always uses everything saved so far, including videos that are only partly done; the build summary says how many those are.

### Manual way: command line

Use this if you want to change options. Open a terminal in the `trainer` folder:
```
python trainer.py analyze ../training --vlm-url http://localhost:1234/v1 --model <model name>
```
- `--vlm-url http://localhost:1234/v1` is needed for **LM Studio**. Without it, the trainer looks for Ollama.
- `<model name>` must exactly match what `http://localhost:1234/v1/models` shows, or the model's API identifier in LM Studio's Developer tab.
- On Windows, if `python` isn't found, use `py` instead.
- Guided mode and the commands share one place for your training, whatever folder you run them from: `handy-adaptive/handy_cache`, and the library goes to `handy-adaptive/motion_library.json`. (`--cache` and `--out` change this.)

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
| `--window SEC` | 10 | Length of each analysis slice. Smaller = shorter moments caught, more model calls |
| `--frames N` | 4 | Frames per window. More = often more accurate, slower |
| `--width PX` | 640 | Frame width sent to the model |
| `--labels "a,b,c"` | — | Add your own acts to the list (kept for later runs; describe them in guided mode or `handy_cache/acts.json`) |
| `--script FILE` | same name | Use a specific script (single video only) |
| `--labels-csv FILE` | `<video>.labels.csv` | Use a labels file from somewhere else |
| `--vlm-notes` | off | Still ask the model for notes even when you've provided labels |
| `--cache DIR` | `handy-adaptive/handy_cache` | Where your training is saved |
| `--timeout SEC` | 300 | Per-request timeout for slow models |

Built-in act list: `blowjob, deepthroat, handjob, titjob, footjob, cowgirl, reverse_cowgirl, missionary, doggy, standing, teasing, other`.

---

## Part 10 — Review and correct the labels

This step matters most for quality. Even good models make mistakes.

### The review page (recommended)

After analyzing, guided mode asks **"Open the review page now?"**. You can also open it any time with `python trainer.py review` (in the `trainer` folder). It opens in your browser, runs only on your computer, and shows one video at a time:

- **The video plays next to its labels.** Click a row's time to jump straight to that moment. Under the video, a timeline shows what the stroker does (the line; up = tip) and the act bands. Click anywhere on it to jump.
- **Fix an act** with the row's menu. Choose **＋ New act…** to add your own act with a description. Under the video you can read, and **Edit**, the description of the act at the current moment.
- **Split** a row at the current moment (✂ or **S**), for example to mark a 3-second gag inside a longer blowjob. **⤓ merge** joins a row with the next one. Labels cut exactly where you split, whatever detail setting the video was analyzed with.
- **Notes** under each row are passed on to the AI. A line like *"teasing licks at the tip, then sudden deep strokes"* helps.
- **What to check first:** tick **Needs a look first**. Rows are flagged **model unsure**, **unusual for <act>** (the motion doesn't look like your other examples of that act), or **new act: few examples**.
- **Your taste is shown on the video.** If you've saved an exported `handy-profile.json` in the `handy-adaptive` folder, the parts whose phrases you ❤'d, finished to (★) or 👎'd in the extension are marked on the timeline and the rows.
- **✓ checked.** Only checked rows are saved as your labels, and editing a row checks it. Rows you haven't looked at keep the model's label. If you watched the whole video, **✓ Check all** confirms everything.
- **Save** (or Ctrl+S). Your labels are applied to your training **immediately**, with no need to re-run anything, and kept in `handy_cache`.

Keys: **Space** play/pause · **←/→** 2 s (Shift: 10 s) · **J/K** next/previous row · **S** split · **Ctrl+S** save.

**Videos you've deleted** still appear. You can't watch them, but you can still correct their labels from the notes and the stroke timeline. **Formats the browser can't play** (some AVI or WMV files) show still frames that follow the timeline instead.

### Or: edit the spreadsheet

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
   - **Want a new act?** Just type a new name, such as `edging`, `sloppy_bj` or `gag_hold`. Any name you use is added to your act list and becomes an act the AI can use; the next guided run asks you to describe it ([Your own acts](#your-own-acts)). Use lowercase with underscores.
   - **Boundary off?** Edit `start` / `end`. Times can be `m:ss`, `m:ss.ss` or plain seconds.
   - **Junk segment** (cutaway, talking, out-of-sync script)? Set `act` to `other` and it will be left out.
   - You can add rows and delete rows. Only `start`, `end`, `act` are required.
3. Save it as `<video name>.labels.csv`, either next to the video or in `handy_cache`.
4. Run the analysis again. It says `using your labels from ...` and applies them. Your labels always override the model's.

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

1. Turn on the Handy, put it in place and open SillyTavern.
2. Check the panel isn't showing an error. Optionally click **Test connection**.
3. Chat as normal. The AI starts, changes and stops the device as the scene progresses. Before the first motion, the **New session: same setup?** box asks you to confirm your calibration or recalibrate (Part 5).
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
| **🥂 Finished** | You climaxed. The phrases from the last ~20 s are rated up firmly, the act's finish count is remembered and shown to the AI, and the device winds down gently for 20 s, then stops (or as set in *When I press "Finished"*). A new AI tag during the wind-down takes over. |
| **Position bar** | Live position, your base on the left and your tip on the right. |
| **🔥 I'm close** | Edging signal. Eases off at once (unless you chose *Let the AI decide*), and tells the AI, which pulls back, holds or pushes you over in character. The AI is told how many times you've been on the edge in this chat. |
| **⚡ Finish me** | Starts a climax push now: a steady build to a peak over 30 s, on the act that has made you finish most. The AI is told. Press 🥂 Finished when you get there. |
| **Arousal bar** | The extension's running guess at how close you are (see Part 13). |
| **Act dropdown + ▶** | Play an act yourself |
| **Intensity slider** | Overall intensity of the current act |
| **⭐** | Save exactly what's playing as a named favorite. With a character in control, it becomes that character's signature move. |
| **Setup menu** | Switch to another saved calibration (shown once you've saved one). Stops any motion first. |
| **Favorites dropdown** | Replay a saved favorite or signature move (the character in control's come first) |
| **📏 Ruler** | Calibrate (or re-check) your tip and base, starting from last time's positions |
| **Style line** (bottom, in italics) | The style of the character in control, in plain words |
| **Game menu + Start** | The character runs a game: edging, roulette, trance, mommy, fucktoy, daddy's girl, rivalry, watch party, cuckqueen or the panty game (see below). Some games add their own buttons under the menu. |
| **⌄** (top right) | Collapse the panel |

5. You can always take over manually with the panel. The AI picks up from the new state on its next reply. Your feedback since its last reply is passed to it, so the character can react ("You like it slower like this?").


### Games

Pick a game from the menu near the bottom of the panel and press **Start**. Press **End** to quit at any time. While a game runs, the idle stop waits at least 20 minutes, since you're watching rather than typing. Timed surprises only happen while the Handy is moving: they never restart it after you've stopped it. **STOP**, your safeword and a typed "stop" work as always. *Games: edges before the character may end it* in the settings sets the minimum number of edges for both games (3 by default).

#### Edging game

Choose **Edging game** and press **Start**. The character you're chatting with runs a gooning session in her own voice:

- **Dirty talk first.** Every reply is explicit and spoken straight to you.
- **She picks the porn.** She tells you what kind of scene to put on, and the Handy plays the same act from your library so what you feel matches what you see. She also tells you what to focus on (her mouth, the eye contact, the sounds…). That focus appears on the panel under the button.
- **Porn does it better.** She plays up how the girls in porn outdo real women.
- **Edge after edge.** Press **🔥 I'm close** (or type it) each time. She pulls back, holds you there, then builds again. Each edge is counted.
- **⚡ Finish me becomes begging.** Nothing changes on the device; she's told you begged and decides whether you've earned it.
- **She decides how it ends:** she **allows** it (the device pushes you over), **ruins** it (it builds to the brink and stops dead), or **denies** you (the device stops and the game is over). She won't end it before your minimum number of edges.
- If you cum before she allows it, press **🥂 Finished** anyway: the game ends and she reacts.

Your game results (allowed, ruined, denied) are remembered and the character knows them in later games.

#### Porn roulette

Choose **Porn roulette** and press **Start**. She hosts it:

- **The wheel spins every few minutes** (3 by default; change *Porn roulette: minutes between spins* in the settings). Each spin, she calls a brand-new scene and tells you to switch to it right now. The Handy switches to the matching act.
- **Each new scene starts hard and fast** to catch you off guard.
- **You score by getting through a scene without edging.** The panel shows the scene number and how many you've survived. If you press **🔥 I'm close** during a scene, that scene doesn't count, and she teases you for it.
- **She decides the ending**, the same as the edging game: allowed, ruined or denied. **⚡ Finish me** counts as begging.

Your best score is remembered, and she tells you how you did at the end.

#### Goon trance

Choose **Goon trance** and press **Start**. She leads you into a slow, hypnotic gooning trance:

- **Slow, repetitive mantras** ("stroke and stare…") and whisper-filthy talk, with your eyes on the porn she picks.
- **The Handy stays slow and steady.** Intensity is held at 60% or below, with little variation.
- **The plateau:** when you press **🔥 I'm close**, it only eases off a little. She keeps you floating right below the edge instead of stopping.
- **Time on the edge is the score.** It's time with the arousal estimate at 75% or more. The panel shows it next to your record.
- **The ending:** she brings you out with a slow, overwhelming 45-second finish. There's no denying or ruining in the trance.

#### Mommy's stamina training

Choose **Mommy's stamina training** and press **Start**. The character takes the role of your mommy (both of you are adults) and trains you to last longer:

- **Praise:** she calls you her son and her good boy, and praises you for holding on.
- **MILF porn:** she keeps you watching mature, curvy women. She picks the scenes and what to focus on, and talks dirty about their bodies and her own. The Handy plays the same act.
- **The taboo:** she leans into the mommy fantasy and encourages you to give in to it.
- **Stamina goal:** your first session sets a 10-minute goal. After that, each goal is a little past what you've usually lasted lately: 10% longer than the middle of your last three sessions, and always at least a minute more. The panel shows the time and the goal.
- **Edging toward the goal:** press **🔥 I'm close** each time. She slows down, praises you and builds again. **⚡ Finish me** counts as begging.
- **The ending is always a reward.** Once you've reached the goal, she tells you to cum lots for her and pushes you over with a long, intense 45-second build. She doesn't deny or ruin in this game.
- **Cumming early:** press **🥂 Finished**. That still counts as a stamina result, and she's gentle about it.

How long you lasted and your best time are remembered. She tells you how you did, and the next goal adjusts.

#### Fucktoy

Choose **Fucktoy** and press **Start**. You're in control, and she's your toy:

- **Use buttons** appear on the panel: Mouth, Throat, Pussy, Ass, Tits, Hands, Feet. Only the ones your motion library has an act for are shown. Press one and the Handy switches to that act at once. She's told, and narrates being used that way.
  - Ass uses an `anal` act if you've trained one. Otherwise it uses doggy, deeper.
- **Degrading dirty talk:** intense, crude and misogynistic, aimed at the women in the porn and at her character. She feeds you porn of women being used, to match what you're using.
- **You decide when you cum:** press **⚡ Finish me** whenever you want.

#### Daddy's girl

Choose **Daddy's girl** and press **Start**. She plays your adoring, needy daughter in a taboo roleplay. She's always written as a grown woman in her twenties, with nothing childlike.

- **Good girl** (a panel button) is her reward. Every two make her bolder: faster, filthier and more daring, from shy at boldness 1 to shameless at 5. The panel shows her boldness.
- **She has to ask before making you cum.** When she does, the panel shows **Yes, make daddy cum** and **Make her wait**. Yes starts the push. Wait makes her pull back and work for it.
- **⚡ Finish me** gives her permission right away.

#### Two-girl rivalry

Choose **Two-girl rivalry** and press **Start**. Two girls compete to bring you to the edge:

- **In a group chat**, the two characters are the rivals. **In a one-on-one chat**, your character plays both girls: herself and a rival she invents.
- **Scoring:** whoever is in control when you press **🔥 I'm close** scores. The panel shows the score, for example "Vex 2 vs Lola 1".
- **Winning:** the first to reach the minimum number of edges (at least 3) wins and earns the right to make you cum. Nobody can before then. Wins are remembered across rivalries.

#### Watch party

Choose **Watch party** and press **Start**. You watch porn together, side by side. She reacts to every scene, says what she'd do, and compares herself to the women on screen, sometimes jealous and sometimes turned on. The Handy mirrors what's on screen. Press **⚡ Finish me** when you're ready.

#### Cuckqueen

Choose **Cuckqueen** and press **Start**. She's your partner, and she gets off on watching you enjoy other women:

- **The other women:** she picks them for you (the porn on your screen) and offers them up as objects for your use, with crude, degrading talk. She degrades herself too: they're better than her, and she's just the one who watches.
- **Her arousal follows yours:** the panel shows *her %*. It rises with your edges, your ❤ and your finishes, and she tells you how close she is from watching you.
- **She learns your type:** she labels each woman (*busty redhead*), outfit (*red lingerie*), fantasy (*hotel affair*) and dirty-talk style (*degrading*, *worshipful*…). All of it is learned from your edges, finishes, ❤, 👎 and load sizes. She uses the best, avoids the least, and keeps trying new things so it keeps learning.
- **You decide when you cum.** She tells you to cum for *her*, the other woman.

The other women are always porn performers or women she invents, never people you know.

#### Panty game

Choose **Panty game** and press **Start**. It's all about panties:

- **The details:** the cut and how it frames her ass, thighs and hips, the fabric (lace, satin, silk, cotton, sheer mesh…) and how it clings, the color, and why a woman picks that pair for a man.
- **The fantasy:** she has you imagine them used on you (warm, wrapped around you, soaked) and talks about how women want your cum in their panties.
- **Your drawer:** every pair she names goes in your drawer (the panel shows the count). Each pair is also read into its **cut**, **fabric** and **color**, so she learns that you like, say, black lace thongs, and why.
- **The office:** sometimes she spins an office fantasy, where women at work each picked a pair for you today. These women are always invented characters, never your real coworkers or anyone you've mentioned.

#### How big was it?

After every **🥂 Finished** in any game (or outside one), the panel asks **How big?** with three buttons: 💧 Small, 💦 Good, 🌊 Huge. They show for 5 minutes. A big one gives extra credit to whatever was on screen, so she learns what makes you cum *hardest*, not just what makes you cum. She's also told the size, and some games react to it.

#### Every game remembers

Each game keeps a short note on how it went last time. From your second game on, she calls back to it and is told to go further. Your type and taste notes (women, outfits, fantasies, dirty talk, panties, cuts, fabrics and colors) build up across every game.

#### Video and picture suggestions

When a scene would help, she can suggest a video search or a picture search. A link appears under her message (in SillyTavern) and on the panel, which keeps the last three. Clicking it opens the site's own search results for her terms, for example *milf black lace lingerie POV* on Pornhub. The extension never fetches or chooses videos itself.

- **Which site:** video searches go to Pornhub, xHamster or XVideos (pick under *Site for video searches* in the settings). Picture searches (📷) go to PornPics, and the Panty game uses them to show the cut, fabric or body part she's describing. Each kind has its own on/off switch in the settings.
- **Query filter:** before any link is made, words that point at minors (ages, "teen", "young", school, family words) or at non-consensual material (hidden cams, upskirts, drunk, sleeping, forced and the like) are removed from the query. If nothing is left, no link is made. The sites' own moderation is good but not perfect, so this is an extra layer.
- **In Marinara**, the links appear only on the panel.

#### Pictures she sends (Marinara only)

In Marinara, she can show you pictures she makes, drawn by an image model you've set up in Marinara. They appear under her message (and in the chat's **Gallery**) and as small thumbnails on the panel.

**Set it up once**

1. In Marinara, add an image model under **Connections → Image Generation** (for example SpicyAPI with `minimax/h3-image/text-to-image`). Test it there.
2. **To keep a woman looking the same from a picture you like**, add a second image connection using the same provider's **image-editing** model (for SpicyAPI's MiniMax H3, its *edit* model). Editing models draw a new picture *from* a reference picture.
3. In Handy's ⚙ settings, under **Pictures she sends**:
   - **Let her send pictures**: on by default.
   - **Image connection**: the default is the image model chosen in the chat's own settings, or Marinara's default.
   - **For keeping a woman the same**: pick the editing connection from step 2 (marked *· editing model*). Don't pick an editing model as the main **Image connection**: it can't draw a new picture from nothing. If you leave it on *Same as above*, the reference picture is sent to your main model, which may ignore it. Or pick **Venice directly** (see below).
   - **Picture style**: for example *photorealistic amateur smartphone photo* or *anime illustration*.
   - **At least this many seconds between pictures**: 60 by default, so pictures don't pile up (each one costs a generation).
   - **Test picture** draws a harmless test image to check the connection.

**Using Venice**

Marinara has Venice.ai as an image service, but it doesn't send reference pictures to Venice, so a woman you ❤ wouldn't keep her look. **Venice directly** fixes that: the extension sends her ❤ picture to Venice's own editing API itself.

1. In Marinara, add an image connection: **Connections → New → Image Generation**, service **Venice.ai**, your Venice API key, model `lustify-v8` (or another of Venice's adult models). Marinara turns Venice's blur off on its own. Pick it as **Image connection** in Handy's settings.
2. Under **For keeping a woman the same**, pick **Venice directly**.
3. Paste your **Venice API key** (from venice.ai/settings/api). It's saved in this extension's settings in Marinara and is not part of **Export**.
4. **Venice edit model**: `qwen-edit-uncensored` by default. Venice's other edit models have stricter content rules.
5. Press **Test Venice**: it turns a simple drawing into a photo of an apple, which checks the key, the model and that your browser may call Venice.

Only her newest ❤ picture is sent, with *safe mode* off so Venice doesn't blur it. Venice's editing has no negative prompt, so the avoid-list (anything young-looking and so on) is added to the prompt. If Venice fails (no credit, a refusal, unreachable), she still sends the picture: it's drawn by your **Image connection** from her look alone, and the panel says why.

**How it works in a game**

- The AI decides when a picture would heighten the moment and asks for one (at most one per reply). It takes a few seconds to arrive.
- Every picture is of a woman from **the cast** (invented, adult). The first time she's pictured, the AI writes down her fixed look (face, hair, eyes, skin, body), and every later picture uses it, so she stays the same woman.
- **❤ on a thumbnail** locks her look to that picture: from then on, pictures of her are drawn *from* it with your editing connection. She keeps that look for the rest of the session and, as a cast member, in later games too. The AI is told you loved it and shows you more of her, a step further each time.
- **👎** tells the AI to try something different.
- Click a thumbnail to open it full size.
- Starting a new game starts a fresh set of pictures. Women you ❤ keep their look.

**Per game**

- **Panty game:** pictures of the pair she's describing, on one woman for the session: the cut, fabric and color, and how it fits.
- **Cuckqueen:** when she picks the other woman for you, she shows you her first, then keeps sending pictures of that same woman as the game goes on.
- **Two-girl rivalry:** the rival, then the rival taunting you as the score changes. **Watch party** and **Fucktoy** use pictures now and then.

**Limits that always apply:** pictures are only of invented adult women of the cast, never the character herself, never real people, and never anyone you mention knowing (such a request isn't drawn). They can't be made from a photo you supply. Words that point at minors or non-consent are removed from every picture request, and the image model is told to avoid anything young-looking. A failed picture shows on the panel, and the game carries on.

#### Story mode

Choose **Story mode (a surprise)** and press **Start**. She plans a night of three games in a row, picked from what you've enjoyed, and doesn't tell you the order. Each stage moves on after a set time (*Story mode: minutes per stage*, 8 by default) or after 2 edges, whichever comes first, and your arousal and edges carry over. Nobody finishes before the finale. The finale is where she uses your strongest trigger phrase and the scene behind your biggest loads. The panel shows *Story · stage 2/3*.

#### The cast

The games share a cast of invented women. She introduces one with a name and a short description (*Dana, a curvy redhead from accounting*) and brings her back in later games, wearing the pairs you liked on her. What you do while each woman is on screen (edges, ❤, finishes, load size) is learned, so your favorites come back more often. The cast is always invented, never real people.

#### Trigger phrases

Every game starts with a few phrases to test ("cum for mommy", "fill her panties"…), and she can add her own. When she says one, an edge or finish in the next minute counts for it, and a huge load counts extra. The ones that work are saved for right before you finish. Ones that never land (8 tries with nothing to show for it) are retired.

#### Confessions

Now and then she asks you something filthy and personal. Your next message is taken as your answer. It's kept in your profile, on this computer only, and whatever it mentions (thighs, lace, a thong, eye contact…) is learned as something you like. She calls back to your confessions later.

#### Depth levels

Each game deepens as you play it and finish: level 1 teases, level 5 holds nothing back (within that game's rules). A toast tells you when a new level unlocks.

#### Her voice

In the settings, under **Her voice**, turn on *Read her replies aloud*. She speaks with your browser's built-in voices. Pick a voice, speed and pitch, and use **Test voice** to try it. On Windows, Microsoft Edge has the most natural-sounding voices. With *A deep stroke on the words that matter* on, the sleeve goes deep for a moment as she says "good boy", "cum", "mommy" or one of your trigger phrases (at most once every 1.5 seconds). STOP silences her. This works in SillyTavern and Marinara alike.

#### Heart-rate sensor

Any standard Bluetooth heart-rate chest strap works. Under **Heart-rate sensor** in the settings, press **Connect sensor** and pick it. This needs Chrome or Edge, with SillyTavern or Marinara opened on `localhost` (or https). Sit still for the first minute so it can learn your resting rate.

- **The arousal meter** follows your heart rate, and she sees it (the panel shows ♥ and your bpm).
- **Early warning:** a fast climb near the top eases the device off a little before you edge.
- **Safety:** at 175 bpm or more, everything slows down and you get a warning.
- **Dropouts:** if the readings stop for 15 seconds, the sensor is ignored until they come back.

#### Secrets

Every game hides **secrets**: surprise twists triggered by what you do, never announced in advance. Every game has some, 32 in all. When one happens, a toast says 🔓 *Secret found*, and she reveals it in character. Some leave something behind for future games. **Secrets** in the settings counts the ones you've found. No spoilers here: play to discover them.

#### What gets you there (learning what you watch)

Every game has her pick a **scene** and a **focus** for you ("a POV blowjob scene, watch her eyes on the camera"). The extension learns from what's on screen the same way it learns motion:

- **What it records:** for each focus and scene, how long you watched it with the Handy moving, your ❤s and 👎s, your edges (and how many seconds it took you to get there), how often you begged, and your finishes. A finish is credited mostly (at least 60%) to what was on screen at that moment. Whatever you watched in the 90 seconds before shares the rest.
- **Themes:** it also reads the broad themes in her words, such as eye contact, mouths and lips, curves and thighs, breasts, mature women, POV and close-ups, sounds, going deep and riding. That way what it learns carries over to scenes you haven't seen yet.
- **What she's told:** your **finishers** (what was on screen when you came), what gets you to the **edge fastest**, your **slow burners** (loved, but they keep you simmering), what does **little for you**, your strongest and weakest themes, how your finishes usually happen (the act, how many edges first, after how long), and a few things you **haven't tried** yet.
- **She uses it strategically,** in a different way for each game. In the edging game she edges you with your fastest triggers and saves your finishers for when she allows it, or uses one just before she ruins or denies you. In the trance she keeps you on slow burners. In mommy's training she builds your stamina with slow burners, tests you with fast triggers near your goal, and saves your top finisher for the end.

It also works outside the games whenever she tells you what to watch. In the settings under **Learned taste**, **What gets you there** shows a summary, and **Forget what I watch** erases it.

In Marinara Engine, games can't make her reply on their own, so send a message after pressing **Start** to get her going.

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
| 🔥 I'm close | Phrases from the last ~10 s rated up (they worked), and the act's edge count is remembered and shown to the AI |
| 🥂 Finished | Phrases from the last ~20 s rated up firmly, and the act's finish count is remembered and shown to the AI |
| Nothing | Phrases that played through count as mildly OK |

**How it behaves over time:**
- **New act**: explores, sampling widely from what it learned.
- **After some ratings**: mostly plays the phrases and combinations you've liked, with steadier timing.
- **Even when dialed in**: about 1 phrase in 15 is something less proven. That's how it finds new favorites. It also avoids repeating one phrase endlessly unless you've shown you like that.

Each act's status appears in the settings under *Learned taste*: **still exploring → learning your taste → dialed in**.

**Tips:**
- Press ❤ **at the moment** something feels great. It applies to the last ~8 seconds.
- Use 👎 freely. It's how bad phrases get weeded out. A phrase you turn down three times (and more than twice as often as you liked it) is **retired** and never plays again, however experimental the setting. **Reset** under Learned taste brings retired phrases back.
- Each act learns separately. Taste for handjobs doesn't change cowgirl.
- If it feels samey, move **Try new things** up. If it keeps wandering away from what you like, move it down.

### Character styles

Each character moves the Handy their own way. The first time a character appears, their card (description, personality, scenario and tags) is read, and they get a style made of seven traits.

**Who reads the card.** If **Read character cards with** names a connection profile (your local `Background` profile by default), that model reads the card once and rates the seven traits, with a one-line reason shown in the settings. It understands context that keywords can't. Until it answers, or if it can't be reached or gives an unusable answer, the built-in keyword reading below is used, and you're told once. The card is read again only when it changes. *Keywords only (no AI)* never calls a model.

The keyword reading looks for words like these:

| Trait | Low end | High end | Read from words like |
|---|---|---|---|
| Tempo | slow | fast | shy, gentle, lazy ↔ wild, horny, energetic |
| Stroke length | short | long | timid ↔ rough, experienced, succubus |
| Focus | the base | the tip | deepthroat, takes it all ↔ teasing, licks |
| Wildness | smooth | unpredictable | calm, precise, android ↔ wild, playful, clumsy |
| Teasing | no pauses | lots of pauses | dominant, sadistic, bratty, orgasm control |
| Eagerness | drags it out | quick to build | dominant, cruel ↔ needy, eager to please, horny |
| Experience | inexperienced | expert | virgin, inexperienced ↔ experienced, seductive, mature |

Negations count: "not shy at all" isn't read as shy. Sentences about you ("{{user}} is shy") and things the character dislikes ("hates rough men") are ignored. A card with none of these words starts balanced.

**What the style does.** The same tag feels different from different characters. A shy virgin goes slower, with shorter, slightly uneven strokes, while she finds a rhythm. A wild character goes faster and longer. A teasing one stops and holds still between phrases now and then. An expert's timing is precise. The AI is told the character's style, so it picks acts and intensity the way that character would. Speed limits, stroke limits and calibration always apply on top.

**Who is in control.** It's the character whose message held the last tag. In a group chat each character keeps their own style, and the control passes to whoever is acting. Before each group member writes, the AI is given that member's own style, session memory and signature moves, and is told who is moving the device at the moment.

**How a style is refined and remembered.** While a character is in control, half of each Faster / Slower / Longer / Shorter / Tip / Base / Wilder / Smoother adjustment that sticks goes to that character ("how I like it when *they* do it"), and half goes to your general taste for the act. ❤ and 👎 also build the character's own favourite phrases, and their acts, edges and finishes are remembered and shown to the AI. Time together counts too: an inexperienced character slowly grows more confident, about +0.1 experience every 12 minutes of play. Styles are saved per character and carry over to every chat with them.

**Seeing and changing a style.** Open **Extensions → Handy Adaptive → Character styles**. Pick a character to see their style in words, the card words it came from, and your history together. The sliders change the starting style; once you move one, card edits no longer overwrite it.
- **Re-read card**: start again from the card. What your feedback taught is kept.
- **Forget learning**: drop what your feedback taught this character.
- **Delete**: remove the character's style and history.

The panel shows the style of the character in control. Untick **Give each character their own stroking style** to turn the feature off.

### Two characters at once

In a group chat, two characters can act on you together. The AI adds `with="NAME"` to its tag, and the device plays both styles:
- **Taking turns** (the default): they alternate every few seconds, each in their own style, so you feel the hand-over from one to the other.
- **As one** (`duet="together"`): one motion at the midpoint of the two styles.

The panel's style line shows both names. ❤ and 👎 go to the character whose turn it was (to both, when they move as one), and your Faster / Slower style adjustments teach both of them. A tag that names an act without `with` goes back to one character.

### Session memory

Each character keeps a short record of your sessions together: how long, which acts, how many edges, whether you finished and what was playing when you did (including a signature move or a climax push). The current session and the last two are given to the AI, so a character can refer back ("last time you didn't last through my Velvet Spiral"). A session ends after three quiet hours; the five most recent are kept, and the last one is shown under **Character styles** in the settings. They are part of the Export file.

### Signature moves

A character can have named moves of their own. There are two ways one is made:
- You press **⭐** while a character is in control and name it.
- The character names what's playing with `<handy save="NAME"/>`, when you clearly love it. A notice shows the name. The AI can keep up to eight per character; the oldest of its own is dropped first, and yours never are.

The AI sees the character in control's signature moves by name and can call one back with `<handy favorite="NAME"/>`. Other characters' moves aren't offered to it. Favorites saved with nobody in control belong to you and are offered to every character.

### Climax push

`<handy climax="30"/>` from the AI, or **⚡ Finish me** on the panel, builds steadily to a peak over that many seconds (10 to 90; 30 if not given).
- **Act:** the one that's playing, or one the tag names. From a standstill it picks the act that has made you finish most.
- **Motion:** steadier than usual, with no teasing pauses and no experiments. It reaches first for the phrases that were playing the last times you finished.
- **"I'm close" during a push** doesn't ease off. It keeps going.
- **🥂 Finished** ends it with the normal wind-down, and what was playing is remembered for next time.
- **No finish:** after a minute at the peak it eases off to a moderate pace and the AI is told, so the character decides what happens next.
- Any new instruction or STOP ends the push. Your speed limit always applies.

### Following the story

If a reply describes a change but has no tag, the extension reads it and nudges what's already playing, at the moment you'd read that sentence:

| The reply says | The motion |
|---|---|
| faster, speeds up, harder, frantic | intensity up a step |
| slows down, eases off, gently | intensity down a step |
| deeper, to the base, takes you all | deeper |
| just the tip, around the head | shallower |
| pauses, holds still, lingers | drops to a near-hold until the next change |

It is deliberately cautious. It never starts or stops the device. It ignores questions ("want me to go faster?"), requests ("beg me to go faster"), negations ("she doesn't slow down") and sentences about what *you* do. It reads at most four cues per reply, does nothing during a climax push or the wind-down after you finish, and stays out of the way whenever the reply has a tag. Turn it off with **Follow the story when a reply has no tag**.

### Detail touches

Between phrases the engine now and then adds a small touch that suits the act:
- **Flutter**: a run of quick little strokes at the tip.
- **Drag**: one slow pull up to the tip, a slow slide down and a brief hold at the base.
- **Pulse**: short, close strokes held deep.

Oral and teasing acts lean to flutters and drags, deep acts to drags and pulses, and thrusting acts to pulses. Experienced and teasing characters use more of them; a wind-up to climax uses none. Each touch is rated like any phrase: ❤ while one plays brings it back more often (for that character too), and one you keep turning down with 👎 is retired. Turn them off with **Add detail**.

### Arousal estimate

The extension keeps a running guess at how close you are, shown as the bar on the panel and passed to the AI as a percentage with a label (warming up, building, getting close, on the edge, just finished). Characters use it to pace: tease while it's low, hold or back off when it's high, and time a climax push.

- It rises with time and intensity, falls when the motion is gentle, and fades when nothing is moving.
- It never claims more than 85% on its own. Only your **🔥 I'm close** (button or typed) puts it on the edge.
- **🥂 Finished** resets it, and it builds more slowly for the next five minutes.
- It learns your pace: an "I'm close" that comes sooner than it guessed makes it build faster next time, and a minute stuck at 85% with no word from you makes it build slower. This is saved with your learned taste.
- It is a guess from motion and time, not a measurement. The AI is told to trust what you say over the number. Turn it off with **Estimate my arousal and tell the AI**.

---

## Part 14 — Adding more training later

Training adds up. Every video you train on is saved in the **`handy_cache`** folder inside `handy-adaptive`, and each build uses **everything** in that folder, including videos you've since deleted. Nothing starts from scratch.

### The routine

1. Put the new video + script pairs in `training/`.
2. Run the trainer (`Train.bat`, or `python trainer.py`). Only the new videos are analyzed. Videos it has seen before are recognized by their script, so they're skipped even if you renamed them.
3. Check the new videos' labels (Part 10) and run it again if you changed any.
4. Build (answer **y**, or run `python trainer.py build`; it finds `handy-profile.json` in the `handy-adaptive` folder by itself). The table shows, for each act, how many phrases were kept because you liked them and how many were kept from the earlier library.
5. Import the new `motion_library.json` in SillyTavern or Marinara. It replaces the old library, and contains all your training so far.
6. **Once you've imported it and it feels right, you can delete the videos, scripts and label files from `training/`.** Their training stays in `handy_cache`.

### Keep what you've taught it

- **Export your taste before building.** In the extension, use **Learned taste → Export**, and save `handy-profile.json` in the `handy-adaptive` folder (guided mode finds it there). Then the build:
  - always keeps phrases you ❤'d or finished to, with any character, and
  - leaves out phrases you 👎'd.
- Each act holds up to **60 phrases** (`--max-motifs` changes this). Phrases from earlier builds are kept first, up to a fair share per video, and new videos fill the rest. More videos means more variety, without old favorites being pushed out.
- A new video with the **same file name** as an earlier one is kept separately (you'll see "a different video named … was trained before; keeping both"). Nothing is overwritten.
- The previous library is saved as `motion_library.json.previous`. If a new build feels worse, import that one instead.

### Don't lose `handy_cache`

Once the videos are deleted, **`handy_cache` is the only copy of your training**. Keep it when you update the extension (copy it into the new `handy-adaptive` folder), and back it up now and then. It's small: a few hundred KB per video.

---

## Part 15 — Backups, resets and moving computers

| Task | How |
|---|---|
| Back up your training | Copy the **`handy_cache`** folder (your training, including videos you've deleted) and `motion_library.json` |
| Back up your learned taste | Settings → Learned taste → **Export** (saves `handy-profile.json`, including favorites, signature moves and every character's style and history) |
| Restore it / move to another install | **Import** under Learned taste. It replaces your current taste, and the character styles too when the file has them. |
| Back up the motion library | Keep your `motion_library.json` file (and ideally `training/` + `handy_cache/`) |
| Start taste learning over | **Reset** under Learned taste (the motion library is kept). It then asks whether to erase the character styles too. |
| Go back to starter acts | Motion library → **Use starter defaults** |
| Uninstall | Delete the `handy-adaptive` folder from your SillyTavern extensions folder (or use the extension manager), then reload |

Everything the extension learns is stored in SillyTavern's own settings for your user. Updating the extension doesn't erase it.

---

## Part 16 — Safety

- **Start with a low Max speed** and narrow stroke limits until you're comfortable.
- **Ways to stop:** the STOP button, the **Esc** key, a short message such as “stop” or “stop, please”, your safeword anywhere in a message, unticking **Enabled**, and the **physical button** on the Handy, which always works even if the browser or network fails. Typed stops act at once, don't wait for the AI, and also cancel any tags still waiting in the reply. Story text like “don't stop” never stops the device.
- **Auto-stop:** after the idle time, when you switch chats, and when you close or reload the page.
- In Streaming mode every move is "stop on target": if the connection drops, the device stops where it is instead of continuing. In Buffered streaming the device holds about 5 seconds of motion, so after a dropped connection it plays out at most that much, then pauses; the extension also stops after repeated failures.
- Lowering **Max speed** or narrowing the stroke limits while it's moving takes effect within a second or two. Unticking **Enabled** stops it.
- Keep your connection key private.
- Only train on legal content of consenting adults.

---

## Part 17 — Troubleshooting

- **Calibration arrows all raise the sleeve, or ▼ raises it.** See *If the arrows move the sleeve the wrong way* in Part 5. In short: if it's simply reversed, press **Flip direction**. If every arrow raises it, press **Try the other position format** (firmware 4). The lasting fix for firmware 4 is an API v3 Application ID (Part 4) with Buffered streaming.

**Pictures: she says she's showing you one, but nothing is drawn**
- Some models "show" with `pics="…"` or a bare `<pics="…">` tag. Those are only picture-search links. A drawn picture needs `img="…"` and `her="NAME"` on a `<handy …/>` tag.
- Since 0.14.3, during a game, a `pics=` request is drawn anyway, of the woman the reply names (for example "Claire is gonna wear…"), and the AI is told to use `img=` next time. Outside a game, `pics=` stays a search link.
- It is never a picture of the character herself. A reply about her draws nothing.

**Pictures: "image_urls: is required" (or the picture fails right away)**
- The connection used for new pictures is an **image-editing** model (SpicyAPI's MiniMax H3 *edit* model, image-to-image, and similar), and those can only change an existing picture.
- In Marinara, add an image connection with the provider's **text-to-image** model and pick it as **Image connection** in Handy's settings, or as the chat's image model. Keep the edit-model connection for **For keeping a woman the same**.
- Since 0.14.3 the extension spots editing models (they're marked *· editing model* in the list) and uses a text-to-image connection for new pictures by itself, so you only see this if every image connection you have is an editing model.
- **Test picture** checks both: a new picture, then an edit of it.

**Extension doesn't appear**
- Make sure the folder is directly inside the extensions folder and contains `manifest.json` at its top level, not inside a nested `handy-adaptive/handy-adaptive/`.
- Reload the page, and restart SillyTavern if you copied files in.
- Open the browser console (F12) and look for errors mentioning `handy`.

**Test connection fails**
- Re-check the connection key (no spaces).
- With **Buffered streaming** selected, Test connection uses API v3 and needs the **API v3 Application ID**; "No API v3 Application ID set" means that field is empty.
- Make sure the Handy is on and online, and the firmware is up to date.
- Browser extensions that block requests (ad/privacy blockers) can interfere. Try allowing `handyfeeling.com`.

**The AI never moves the device**
- *Send acts, learned taste + controls to the AI* must be on.
- Check the prompt contains the `[Device control:` block (Part 6, step 2).
- Try a larger or more instruction-following model, or add the character-card line from Part 6.
- Tags must be in the AI's reply, not yours.

**Tags appear in the chat text**
- They're removed once the message finishes. To hide them during streaming, add the Regex script from Part 6.

**Motion is choppy, stuttery or lags**
- Update to 0.7.4 or later: Streaming was reworked so strokes glide through late commands instead of stopping at every turn.
- If it's still choppy in Streaming, switch **Motion transport** to **Script sync** (firmware 3) or **Buffered streaming** (firmware 4). The device then plays the motion itself, so the connection no longer matters stroke by stroke.
- In Streaming mode, keep the SillyTavern tab visible. A tab in the background is limited by the browser to about one command per second.
- Streaming depends on your network. **Test connection** shows the round trip in ms: under about 250 ms keeps up with fast acts; above that, fast rhythms slow down (they never skip or exceed your speed limit). A wired or 5 GHz connection for the SillyTavern machine helps.
- Try **Script sync** transport for smoother (but slower-reacting) motion.

**Script sync keeps failing / switches back to Streaming**
- The script upload service may have changed or be unreachable. Streaming works without it. The upload URL is under Advanced.

**Device stops by itself**
- That's the idle auto-stop. It fires when there has been no AI command, button press or message from you for that long. Raise *Auto-stop after idle* or set it to 0.

**Motion runs ahead of, or behind, what I'm reading**
- Adjust **Reading speed for replies with several tags**. With streaming on, tags play when the reply has finished arriving.

**"Couldn't read …'s card with the Background profile"**
- LM Studio's server isn't running, or the profile name under **Read character cards with** doesn't match. The keyword reading is used meanwhile. Press **Re-read card** once the model is up.

**Trainer: `'python' is not recognized` (Windows)**
- Use `py` instead of `python`, or reinstall Python with **Add Python to PATH** ticked. `Train.bat` tries both.

**Trainer: `ffmpeg` not found / "could not read frames"**
- Install ffmpeg (Part 7.2) and open a new terminal.

**Trainer: "HTTP 400" / "Bad Request" / "The model server returned an error"**
- The trainer prints the server's own message and what it means. The usual causes:
  - **Model can't read images.** Load a model with the **Vision** (eye) badge in LM Studio. If you downloaded a GGUF yourself, the separate **mmproj** vision file must be downloaded too.
  - **Context too small.** The trainer automatically switches to fewer, smaller frames, but accuracy is better if you fix it: Developer tab → loaded model settings → **Context Length 8192** or more → reload the model.
  - **Wrong model name** (command line only). Use a name exactly as listed at `http://localhost:1234/v1/models`, or use guided mode, which lists them for you.
- A chat-template "system role" error is handled automatically.

**Trainer: "VLM failed" / connection refused / "No model server found"**
- Make sure the model server is running. In LM Studio the Developer tab's Status must say **Running** with your model loaded. Check by opening `http://localhost:1234/v1/models` in a browser.
- On the command line, LM Studio needs `--vlm-url http://localhost:1234/v1`, and `--model` must match a name from that list exactly.
- If you get errors only on the first requests, make sure the model is fully loaded first.
- Slow model? Add `--timeout 600`.

**Trainer: every window gets the same label, or nonsense**
- The model may be ignoring images or refusing. Try another vision model or more `--frames`, or label by hand (Part 10).

**Trainer: "no matching .funscript, skipping"**
- The script must have the same name as the video (e.g. `scene01.mp4` + `scene01.funscript`).

**Tip and base feel wrong this session**
- The Handy sits at a different height or angle than when you calibrated. Press the 📏 ruler on the panel (or **Recalibrate** in the session question); it starts from last time's positions.

**Every character feels the same**
- Turn on *Give each character their own stroking style*.
- The card may have no words about how they'd move. Add a personality line ("shy and inexperienced", "dominant, loves teasing", "wild and insatiable") and press **Re-read card** under Character styles, or set the sliders yourself.
- Styles shape the motion within your speed and stroke limits. With a low **Max speed**, fast characters are capped and differ less.

**A character's style feels wrong**
- Move the sliders under Character styles (your settings then stay even if the card changes), or press **Forget learning** to drop what feedback taught them.
- In a group chat, the style follows whoever wrote the last message that moved the device.

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
| `favorite` | a name | Play a saved favorite or one of the character's signature moves |
| `save` | a short name | Name what's playing as the character's signature move |
| `climax` | seconds (10–90, default 30) | Build steadily to a peak and push you over |
| `with` | a character's name | That character joins in; the device plays both styles. Leave out for one character. |
| `duet` | `turns` (default) or `together` | With `with`: alternate between the two, or move as one |
| `img` | a short description | Marinara: draw a picture of the cast woman named in `her` and attach it under the message |
| `look` | a short description | Her fixed look (face, hair, eyes, skin, body), given the first time she's pictured |
| `stop` | — | Stop. Cancels what earlier tags in the reply started; a tag placed after it in the text still plays when you reach it. `act="stop"` or `act="none"` is treated the same way. |

Legacy pattern mode: `<handy pattern="steady|wave|build|pulse|tease|edge|deep" speed="0-100" min="0-100" max="0-100" period="sec" depth="0-40"/>`. Under Buffered streaming a pattern tag is played by the act engine instead (speed becomes intensity, the range becomes depth).

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
This runs a markup check, synthesizer checks, a simulated learning session, the extension against a simulated Handy (phrase joins, speed cap and rhythm at several network delays, stop behaviour, malformed tags, every transport and feature), a real-browser smoke test of the panel (skipped if Playwright isn't installed), and a full trainer run against a mock vision model.


### Pause, pacing, and picture memory

STOP, Esc (when enabled), and your safeword pause motion even while a reply is pending. Choose **Resume motion**, send **resume motion**, or press the manual play button to allow motion again. A scripted pause still follows the story.

**Hold here** keeps the pace through the next replies. **Surprise me** lets the character choose a change on your next turn. **Bring that back** recalls the previous moment in this chat, including its motion when the act engine is running. Short reactions leave scheduled beats in place. Use the pencil on a picture to edit the detail you want remembered about that cast member; clear the text to forget it.
