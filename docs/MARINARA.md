# Using Handy Adaptive with Marinara Engine

Handy Adaptive also runs in [Marinara Engine](https://github.com/Pasta-Devs/Marinara-Engine). It isn't a separate port: the Marinara package contains **the same extension code** as the SillyTavern version, plus a small compatibility layer that connects it to Marinara. Every feature works the same way, including the motion library, taste learning, calibration and setups, character styles, "I'm close" / "Finish me", reply pacing and session memory. A fix or new feature in the SillyTavern version reaches Marinara with the next build.

This page replaces Parts 3–6 of the [User Guide](USER_GUIDE.md) (installing, configuring and connecting the chat side). Everything else is identical: your Handy, training and the motion library, calibration, daily use, teaching it, backups and safety.

## Why it needs "Full page access"

Marinara runs extensions in a locked sandbox by default. That sandbox blocks internet requests and hides chat messages, and Handy Adaptive needs both: it must reach the Handy's API, and it must read the AI's replies to find the `<handy/>` tags. So it uses Marinara's **Full page access** mode, which Marinara only allows for extensions you import yourself and approve by their exact code fingerprint.

Full page access means the code runs with the same access as Marinara's own page. All of the source is in this repository, and Marinara shows you the exact code before you approve it. The extension only talks to:
- the Handy API (`handyfeeling.com`), and
- your own Marinara server: its chat, character, lorebook, regex and extension-storage endpoints, described below.

## Step 1. Allow imported extensions (once)

1. On the computer that runs Marinara, open the `.env` file in Marinara's folder and add or change this line:
   ```
   ENABLE_EXTERNAL_EXTENSIONS=true
   ```
   Save it and **restart Marinara**.
2. In Marinara, open **Settings → Advanced → Danger Zone**. Scroll below the data-deletion controls, read the warning, and turn on **Allow third-party extension imports**.

> Using Marinara from another device, such as a phone or another PC? Managing extensions then needs the admin secret. Set `ADMIN_SECRET=…` in the server's `.env` and enter the same value under **Settings → Advanced → Admin Access**.

## Step 2. Import the extension

1. Download **`dist/handy-adaptive-marinara.zip`** from this repository. (On GitHub, open the file and click the download button.)
2. In Marinara, open **Settings → Addons**. Under **External Extensions**, choose **Import Extension File** and pick the zip.
3. Open the new **Handy Adaptive** draft. It starts disabled. Check:
   - **Requested access** shows **Full page access**, and
   - the code is what you expect. It's built from `index.js`, `synth.js`, `charstyle.js` and `marinara/st-compat.js`, plus a private copy of jQuery 3.6.1.
4. Choose **Review and Run** and confirm, including the extra Full page access acknowledgement.

The **Handy** panel appears at the bottom-right, the same panel as in SillyTavern.

## Step 3. Set it up

1. Click **⚙** in the panel's title bar. The settings window opens. It holds the same settings SillyTavern shows in its Extensions drawer.
2. Paste your **connection key** and click **Test connection**.
3. Set **Max speed %** (start at 40–50) and the stroke limits, then go through the rest of the settings as in Part 4 of the User Guide.
4. Check that the line at the top says **AI instructions: active**.
5. Calibrate (📏 in the panel) and do the hardware test from Part 5 of the User Guide.

To use your trained motion library, use **Import motion_library.json** in the settings window. The file is the same one SillyTavern uses.

## What it adds to Marinara

The first time it runs, the extension creates two things in your Marinara library. Leave them in place.

| Item | Where | What it does |
|---|---|---|
| **Handy Adaptive (managed)** | Lorebooks | A global lorebook with one always-on entry. The extension rewrites that entry before every AI reply with the device instructions, your acts, your learned taste and any feedback you just gave. It sits one message from the end of the chat as a system note, the same place SillyTavern puts it. |
| **Handy Adaptive: hide device tags** | Presets → Regexes | A display-only regex, so `<handy …/>` tags don't show in the chat. The model still sees its earlier tags, which helps it stay consistent. |

If you delete either one, the extension recreates it. Click **Hide device tags in chat** for the regex, or just send a message for the lorebook. When you turn the extension off, the lorebook entry is emptied so the AI stops writing tags.

## How it works in a chat

- **Before each AI reply:** your own message is checked first. A typed "stop", your safeword, and "I'm close" or "I'm cumming" all work. Then the instructions are refreshed.
- **When a reply finishes:** the extension reads it and runs its `<handy …/>` tags, pacing them at your reading speed. If there are no tags, it follows what the text describes. Regenerated replies run their new tags. **Continue** only runs tags in the newly added text.
- **Characters:** the chat's character cards are read for each character's stroking style. In group chats, whoever wrote the tag takes control.
- **Switching chats** stops the device, as it does in SillyTavern. So do **Esc**, **STOP**, the device's own button and the idle timer.
- Requests to impersonate you are left alone.

## Differences from SillyTavern

Marinara doesn't let an extension start an AI reply or call connection profiles, so three things change:

| SillyTavern feature | In Marinara |
|---|---|
| "AI replies automatically to ❤/👎", and the AI reacting right away after **I'm close**, **Finish me** or **Finished** | The device side happens at once, as usual. The AI reacts in its **next** reply, once you send a message. The option is hidden. |
| Reading character cards with a connection profile (more accurate) | The keyword reading of the card is used. The profile option and the **Re-read with model** button are hidden. |
| Group chats: the next speaker's style goes into the prompt before they write | The prompt uses the character currently in control (the one whose tag is playing). |

Also:
- Settings and learned taste are kept in Marinara's private extension storage. A very large motion library is kept in the browser instead, so on a new browser you'll need to re-import `motion_library.json`. Export your taste profile as a backup either way.
- After **you** switch chats in Marinara, the device stops when you send your first message there, not the moment you click the other chat. Use STOP or Esc if you leave a chat mid-scene.

**Games in Marinara.** All ten games work, including their buttons, secrets, learning and the "How big?" rating. Because an extension can't start a reply here:
- After you press **Start**, send a message (anything, even "hi") and she opens the game. A toast reminds you.
- Game buttons (Good girl, Make her wait, the Fucktoy use buttons) act on the device at once. Her spoken reaction comes in her next reply, and a toast tells you once per game.
- Timed events (a roulette spin, a surprise) show a toast. Send a message to hear her side of it.
- If you open another chat, press **Start**, and then say hi, the game comes with you. A game that has already had a reply ends when you change chats.
- Video and picture search links appear on the panel only, not under her message.
- Her voice and the heart-rate sensor work in Marinara as well. The sensor needs Chrome or Edge, with Marinara opened on `localhost` (or https).

## Updating

1. Download the new `dist/handy-adaptive-marinara.zip`.
2. **Settings → Addons → Import Extension File** and pick it. Marinara recognizes the same name and asks to update it.
3. Any code change disables the extension until you approve the new fingerprint. Choose **Review and Run** again.

Settings, calibration, setups, character styles, learned taste and the managed lorebook all carry over.

## Troubleshooting

- **Calibration arrows all raise the sleeve.** Your Handy is most likely on firmware 4. Add an API v3 Application ID in the settings, and calibration will use the newer API automatically. If ▼ raises and ▲ lowers instead, press **Flip direction** on the calibration screen. More in the User Guide, Part 5.

| Problem | Fix |
|---|---|
| No **Import Extension File** button | Do both parts of Step 1, and restart Marinara after editing `.env`. From another device, also set the admin secret. |
| The panel doesn't appear after **Review and Run** | Reload the page. Check the extension shows as enabled in **Settings → Addons**. Open the browser console (F12) and look for messages tagged `[Personal Extension Handy Adaptive]` or `[Handy]`. |
| **AI instructions: ⚠ …** in the settings window | The extension couldn't write its lorebook. From another device, set the admin secret (Step 1). Check that **Handy Adaptive (managed)** isn't locked or disabled. |
| The AI never writes tags | Check the status says *active*. Check the managed lorebook's **Global** and **Enabled** switches are on. Check the chat's lorebook list doesn't switch it off. A larger, instruction-following model helps. |
| Tags show in the chat | Click **Hide device tags in chat** in the settings window, and check the regex is enabled under **Presets → Regexes**. |
| The instructions get cut off | Raise the managed lorebook's **Token Budget** on its Overview tab. The extension sets 8192. |
| The extension stopped after an update | Expected: approve the new code with **Review and Run**. |

## For developers

```
node scripts/build-marinara.mjs      # → dist/marinara/Handy Adaptive/ and dist/handy-adaptive-marinara.zip
node tests/marinara_e2e.mjs          # browser test against Marinara's full page runtime (Playwright)
```
The build bundles, in order: Marinara's managed timers (as `setTimeout`/`setInterval`), a private jQuery, `marinara/st-compat.js`, then `synth.js`, `charstyle.js` and `index.js` unchanged. Keep `index.js` using only the SillyTavern features listed at the top of `st-compat.js`. When it needs a new one, add a matching stand-in there.
