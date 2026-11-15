// End-to-end test of the Marinara Engine build in a real browser (Playwright/Chromium).
//
// It recreates the parts of Marinara the extension touches, copied from
// Marinara's source: the full page runtime loader (window.__marinaraRunFullPageExtension
// + the exact `fullPageExtensionSource` wrapper + managed timers), the extension
// storage API, CSRF rules, and the chats / characters / personas / lorebooks /
// regex / messages / generate endpoints. A mock Handy records device commands.
//
//   node scripts/build-marinara.mjs && node tests/marinara_e2e.mjs

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
let chromium;
try { ({ chromium } = require('playwright')); } catch { console.log('SKIP marinara_e2e: playwright not installed'); process.exit(0); }

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const pkg = path.join(root, 'dist/marinara/Handy Adaptive');
if (!fs.existsSync(path.join(pkg, 'extension.js'))) { console.error('build first: node scripts/build-marinara.mjs'); process.exit(1); }
const bundle = fs.readFileSync(path.join(pkg, 'extension.js'), 'utf8');
const css = fs.readFileSync(path.join(pkg, 'extension.css'), 'utf8');
const EXT = { id: 'ext1', name: 'Handy Adaptive', contentHash: 'sha256:test' };

const state = { storage: {}, lorebooks: [], entries: [], regex: [], chats: {}, handy: [], generations: [], csrfFailures: 0, next: null, ids: 0 };
// A Handy that moves: v2 HDSP sleeve position over real time (same model as tests/sim/bench.mjs)
const dev = { mode: null, seg: null, rest: 0, cmds: [] };
const devPos = (t = Date.now()) => { const g = dev.seg; if (!g) return dev.rest; if (t >= g.t1) return g.p1; return g.p0 + (g.p1 - g.p0) * ((t - g.t0) / (g.t1 - g.t0)); };
const halt = () => { dev.rest = devPos(); dev.seg = null; };
function handyCmd(p, body) {
    if (p === '/connected') return { connected: true };
    if (p === '/servertime') return { serverTime: Date.now() };
    if (p === '/mode') { if (body?.mode !== dev.mode) halt(); dev.mode = body?.mode; return { result: 0 }; }
    if (p === '/hamp/stop' || p === '/hssp/stop') { halt(); return { result: 0 }; }
    if (p === '/hdsp/xpt') {
        if (dev.mode !== 2) return { error: { message: 'device not in HDSP mode' } };
        if (!Number.isFinite(body?.position) || !Number.isFinite(body?.duration)) return { error: { message: 'bad xpt payload' } };
        const p0 = devPos(), t0 = Date.now(), dur = Math.max(body.duration, 1);
        dev.seg = { p0, p1: body.position, t0, t1: t0 + dur };
        dev.cmds.push({ t: t0, p0, p1: body.position, v: (Math.abs(body.position - p0) / dur) * 1000 });
        return { result: 0 };
    }
    return { result: 0 };
}
const newId = (p) => `${p}${++state.ids}`;
const chatsMeta = {
    chat1: { id: 'chat1', name: 'Vex', mode: 'roleplay', characterIds: '["c1"]', personaId: 'p1' },   // stored as text, like Marinara's DB
    chat2: { id: 'chat2', name: 'Group', mode: 'roleplay', characterIds: ['c1', 'c2'], personaId: null },
};
const charsDb = {
    c1: { id: 'c1', data: JSON.stringify({ name: 'Vex', description: 'A dominant, teasing succubus who likes to take her time.' }) },
    c2: { id: 'c2', data: { spec: 'chara_card_v2', data: { name: 'Mira', description: 'Eager and fast.' } } },
};

// Exact wrapper from Marinara: server/src/routes/personal-extensions.routes.ts fullPageExtensionSource()
const pageRuntime = `(() => {
  "use strict";
  const extension = ${JSON.stringify(EXT)};
  const run = window.__marinaraRunFullPageExtension;
  if (typeof run !== "function") {
    throw new Error("Marinara full-page extension host is unavailable");
  }
  run(extension, async (marinara) => {
    "use strict";
${bundle}
  });
})();`;

// Host page: mirrors PersonalExtensionInjector.tsx (createFullPageExtensionApi) and api-client.ts
const page = `<!doctype html><html><head><meta charset="utf-8"><title>mock marinara</title>
<link rel="stylesheet" href="/api/personal-extensions/ext1/page-style.css?hash=x">
<style>:root{--background:#050312;--foreground:#d4d4d4;--card:#141414d9;--primary:#ec4b97;--border:#ec4b9733;--destructive:#ff6b9d;--radius:.75rem}body{background:var(--background);color:var(--foreground);height:100vh;margin:0;font-family:system-ui,sans-serif}</style>
</head><body><div id="app">chat<textarea id="composer"></textarea></div><script>
window.__composerKeys = [];
document.getElementById('composer').addEventListener('keydown', (e) => { if (e.key.startsWith('Arrow')) window.__composerKeys.push(e.key); });
const cleanupFns = [], timeouts = new Set(), intervals = new Set();
window.__originalFetch = window.fetch;
window.confirm = () => true; window.prompt = () => 'x';
function extensionFetch(path, init = {}) {
  const headers = new Headers(init.headers);
  if (["POST","PUT","PATCH","DELETE"].includes((init.method||"GET").toUpperCase())) { headers.set("x-marinara-csrf","1"); if (init.body && !headers.has("Content-Type")) headers.set("Content-Type","application/json"); }
  return fetch("/api/personal-extensions/ext1/" + path, { ...init, headers, cache: "no-store" });
}
window.__marinaraRunFullPageExtension = (identity, main) => {
  const api = {
    version: 1, estimateTextTokens: (t) => Math.ceil(String(t).length / 4), extension: identity,
    log: { debug: console.debug, info: console.info, warn: console.warn, error: console.error },
    storage: {
      async get() { const r = await extensionFetch("storage"); if (!r.ok) throw new Error("Storage read failed"); return (await r.json()).value ?? {}; },
      async patch(v) { const r = await extensionFetch("storage", { method: "PATCH", body: JSON.stringify(v) }); if (!r.ok) throw new Error("Storage update failed (" + r.status + ")"); return (await r.json()).value ?? {}; },
      async clear() {},
    },
    fetch: (input, init) => window.fetch(input, init),
    setTimeout(cb, delay, ...args) { const id = window.setTimeout(() => { timeouts.delete(id); cb(...args); }, delay); timeouts.add(id); return id; },
    clearTimeout(id) { window.clearTimeout(id); timeouts.delete(id); },
    setInterval(cb, delay, ...args) { const id = window.setInterval(cb, delay, ...args); intervals.add(id); return id; },
    clearInterval(id) { window.clearInterval(id); intervals.delete(id); },
    onCleanup: (fn) => cleanupFns.push(fn),
  };
  Promise.resolve().then(() => main(api)).then(() => { window.__extReady = true; })
    .catch((e) => { window.__extError = String(e && e.stack || e); console.error(e); });
};
// Disable: Marinara runs cleanups and cancels the extension's managed timers
window.__disableExt = async () => {
  for (const fn of cleanupFns.splice(0)) await fn();
  for (const id of timeouts) window.clearTimeout(id); for (const id of intervals) window.clearInterval(id);
  window.__timersLeft = timeouts.size + intervals.size; timeouts.clear(); intervals.clear();
};
window.sendTurn = async (body) => {
  const r = await fetch("/api/generate", { method: "POST", headers: { "Content-Type": "application/json", "x-marinara-csrf": "1" }, body: JSON.stringify({ userMessage: null, ...body }), cache: "no-store" });
  const reader = r.body.getReader(); for (;;) { const { done } = await reader.read(); if (done) break; }
};
</script><script src="/api/personal-extensions/ext1/page-runtime.js?hash=x"></script></body></html>`;

const server = http.createServer(async (req, res) => {
    const url = new URL(req.url, 'http://x');
    let raw = ''; for await (const c of req) raw += c;
    const body = raw ? (() => { try { return JSON.parse(raw); } catch { return raw; } })() : null;
    const json = (code, obj) => { res.writeHead(code, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(obj)); };
    const p = url.pathname, m = req.method;
    if (p.startsWith('/api/') && m !== 'GET' && req.headers['x-marinara-csrf'] !== '1') { state.csrfFailures++; return json(403, { error: 'CSRF' }); }
    if (p === '/') { res.writeHead(200, { 'Content-Type': 'text/html' }); return res.end(page); }
    if (p === '/api/personal-extensions/ext1/page-runtime.js') { res.writeHead(200, { 'Content-Type': 'application/javascript' }); return res.end(pageRuntime); }
    if (p === '/api/personal-extensions/ext1/page-style.css') { res.writeHead(200, { 'Content-Type': 'text/css' }); return res.end(css); }
    if (p === '/api/personal-extensions/ext1/storage') { if (m === 'PATCH') Object.assign(state.storage, body); return json(200, { value: state.storage }); }
    if (p.startsWith('/handy/v2/')) {
        const sub = p.slice('/handy/v2'.length);
        state.handy.push({ method: m, path: sub, body, key: req.headers['x-connection-key'] });
        await new Promise((r) => setTimeout(r, 15));   // a little network latency
        const out = handyCmd(sub, body);
        return json(out.error ? 400 : 200, out);
    }
    let mm;
    if ((mm = p.match(/^\/api\/chats\/([^/]+)$/)) && m === 'GET') return chatsMeta[mm[1]] ? json(200, chatsMeta[mm[1]]) : json(404, { error: 'Chat not found' });
    if ((mm = p.match(/^\/api\/characters\/personas\/([^/]+)$/))) return json(200, { id: mm[1], name: 'Ryan' });
    if ((mm = p.match(/^\/api\/characters\/([^/]+)$/))) return charsDb[mm[1]] ? json(200, charsDb[mm[1]]) : json(404, {});
    if (p === '/api/lorebooks' && m === 'GET') return json(200, state.lorebooks);
    if (p === '/api/lorebooks' && m === 'POST') { const lb = { id: newId('lb'), enabled: true, isGlobal: false, ...body }; state.lorebooks.push(lb); return json(200, lb); }
    if ((mm = p.match(/^\/api\/lorebooks\/([^/]+)$/)) && m === 'PATCH') { const lb = state.lorebooks.find((l) => l.id === mm[1]); Object.assign(lb, body); return json(200, lb); }
    if ((mm = p.match(/^\/api\/lorebooks\/([^/]+)\/entries$/))) {
        if (m === 'GET') return json(200, state.entries.filter((e) => e.lorebookId === mm[1]));
        const e = { id: newId('e'), lorebookId: mm[1], enabled: true, constant: false, position: 0, depth: 4, role: 'system', content: '', ...body };
        state.entries.push(e); return json(200, e);
    }
    if ((mm = p.match(/^\/api\/lorebooks\/([^/]+)\/entries\/([^/]+)$/)) && m === 'PATCH') {
        const e = state.entries.find((x) => x.id === mm[2]); if (!e) return json(404, { error: 'Entry not found' });
        Object.assign(e, body); return json(200, e);
    }
    if (p === '/api/regex-scripts' && m === 'GET') return json(200, state.regex);
    if (p === '/api/regex-scripts' && m === 'POST') { const r = { id: newId('rx'), ...body }; state.regex.push(r); return json(200, r); }
    if ((mm = p.match(/^\/api\/chats\/([^/]+)\/messages$/)) && m === 'GET') {
        const list = state.chats[mm[1]] || []; const limit = +url.searchParams.get('limit') || list.length;
        return json(200, list.slice(-limit));
    }
    if (p === '/api/generate' && m === 'POST') {
        const managed = state.entries.find((e) => e.name === 'Device control instructions');
        const lb = state.lorebooks.find((l) => l.id === managed?.lorebookId);
        state.generations.push({ body, entry: managed && { ...managed }, lorebookGlobal: lb?.isGlobal, lorebookEnabled: lb?.enabled });
        const chat = (state.chats[body.chatId] ||= []);
        const nx = state.next || { mode: 'new', content: 'Okay.' }; state.next = null;
        if (body.userMessage) chat.push({ id: newId('m'), role: 'user', content: body.userMessage, characterId: null });
        const lastAi = [...chat].reverse().find((x) => x.role === 'assistant');
        let target;
        if (nx.mode === 'new' || !lastAi) { target = { id: newId('m'), role: 'assistant', content: '', characterId: nx.characterId || 'c1' }; chat.push(target); }
        else target = lastAi;
        const finalContent = nx.mode === 'continue' ? target.content + nx.content : nx.content;
        res.writeHead(200, { 'Content-Type': 'text/event-stream' });
        for (const t of finalContent.match(/.{1,8}/gs) || []) { res.write(`data: ${JSON.stringify({ type: 'token', data: t })}\n\n`); await new Promise((r) => setTimeout(r, 10)); }
        target.content = finalContent;
        res.write('data: {"type":"done"}\n\n'); return res.end();
    }
    json(404, { error: 'not found: ' + m + ' ' + p });
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const base = `http://127.0.0.1:${server.address().port}`;
// a returning user: key set, calibrated, session question off for the scripted part
state.storage.settings = { connectionKey: 'KEY123', apiBase: `${base}/handy/v2`, calibration: { base: 10, tip: 90, at: 'x' }, sessionCheck: false, readWpm: 0 };

const browser = await chromium.launch();
const pg = await (await browser.newContext({ viewport: { width: 1280, height: 860 } })).newPage();
const pageErrors = [];
pg.on('pageerror', (e) => pageErrors.push(String(e)));
// Chromium logs failed requests as console errors; the deleted-lorebook check causes an expected 404.
pg.on('console', (msg) => { if (msg.type() === 'error' && !/Failed to load resource: .*404/.test(msg.text())) pageErrors.push(msg.text()); });
const waitFor = async (fn, what, ms = 6000) => {
    const t0 = Date.now();
    while (Date.now() - t0 < ms) { if (await fn()) return; await new Promise((r) => setTimeout(r, 50)); }
    throw new Error('timed out waiting for: ' + what);
};
const managed = () => state.entries.find((e) => e.name === 'Device control instructions');
const running = () => pg.evaluate(() => window.handyAdaptive.actEngine.running);
const act = () => pg.evaluate(() => window.handyAdaptive.actEngine.intent.act);
const handyAt = () => state.handy.length;
let passed = 0;
const step = async (name, fn) => { await fn(); passed++; console.log('  ok  ' + name); };

try {
    await pg.goto(base + '/');
    await pg.waitForFunction(() => (window.__extReady && document.querySelector('#handy_panel')) || window.__extError, null, { timeout: 10000 });
    assert.equal(await pg.evaluate(() => window.__extError), undefined, 'extension failed to start');

    await step('runs inside Marinara\'s full page runtime and shows the SillyTavern panel', async () => {
        assert.ok(await pg.isVisible('#handy_panel #handy_stop'));
        assert.ok(await pg.isVisible('#handy_settings_btn'));
        assert.equal(await pg.evaluate(() => typeof window.$ === 'undefined' && typeof window.jQuery === 'undefined'), true, 'jQuery stays private');
    });
    await step('creates a global lorebook with a constant system entry at depth 1', async () => {
        await waitFor(() => managed()?.enabled && managed()?.content?.includes('[Device control'), 'managed entry');
        const lb = state.lorebooks.find((l) => l.name === 'Handy Adaptive (managed)');
        assert.ok(lb && lb.isGlobal && lb.enabled);
        const e = managed();
        assert.deepEqual([e.constant, e.position, e.depth, e.role], [true, 2, 1, 'system']);
    });
    await step('adds a display-only regex that hides <handy> tags', async () => {
        await waitFor(() => state.regex.length === 1, 'regex');
        const r = state.regex[0];
        assert.equal(r.applyMode, 'display'); assert.deepEqual(r.placement, ['ai_output']);
        assert.equal('Hi <handy act="x"/> there </handy>'.replace(new RegExp(r.findRegex, r.flags), ''), 'Hi  there ');
    });
    await step('an AI reply tag starts the device (and the request is left untouched)', async () => {
        state.next = { mode: 'new', content: 'She kneels in front of you, smiling. <handy act="blowjob" intensity="0.6"/>' };
        const n = handyAt();
        await pg.evaluate(() => window.sendTurn({ chatId: 'chat1', userMessage: 'hi' }));
        const g = state.generations.at(-1);
        assert.ok(g.entry.enabled && g.entry.content.includes('[Device control') && g.entry.content.includes('CURRENT: stopped'));
        assert.equal(g.body.generationGuide, undefined);
        await waitFor(running, 'device running');
        await waitFor(() => state.handy.slice(n).some((c) => c.path.startsWith('/hdsp/')), 'strokes streamed');
        assert.ok(state.handy.every((c) => c.key === 'KEY123'));
        assert.equal(await act(), 'blowjob');
    });
    await step('the character card is read (per-character style for Vex)', async () => {
        const who = await pg.evaluate(() => window.handyAdaptive.chars.activeKey());
        assert.equal(who, 'marinara:c1');
        assert.equal(await pg.evaluate(() => window.handyAdaptive.chars.current()?.name), 'Vex');
    });
    await step('panel feedback reaches the AI on the next turn', async () => {
        await pg.click('#handy_panel [data-fb="faster"]');
        state.next = { mode: 'new', content: 'Mm, like this? <handy act="handjob" intensity="0.3"/>' };
        await pg.evaluate(() => window.sendTurn({ chatId: 'chat1', userMessage: 'faster' }));
        assert.match(state.generations.at(-1).entry.content, /LIVE FEEDBACK[^\n]*during blowjob/i);
        await waitFor(async () => (await act()) === 'handjob', 'switch to handjob');
        await waitFor(() => !managed().content.includes('LIVE FEEDBACK'), 'feedback cleared after the AI saw it');
    });
    await step('a typed "stop" in your message stops the device before the reply', async () => {
        await pg.evaluate(() => window.sendTurn({ chatId: 'chat1', userMessage: 'stop' }));
        await waitFor(async () => !(await running()), 'stopped by typed stop');
    });
    await step('a regenerated reply runs its new tags', async () => {
        state.next = { mode: 'regen', content: 'She starts again, slowly. <handy act="handjob" intensity="0.4"/>' };
        await pg.evaluate(() => window.sendTurn({ chatId: 'chat1', regenerateMessageId: 'x' }));
        await waitFor(running, 'started by regenerate');
    });
    await step('Continue only runs tags in the new text', async () => {
        state.next = { mode: 'regen', content: 'She pauses. <handy stop/>' };
        await pg.evaluate(() => window.sendTurn({ chatId: 'chat1', regenerateMessageId: 'x' }));
        await waitFor(async () => !(await running()), 'stopped');
        await pg.evaluate(() => window.handyAdaptive.run({ act: 'cowgirl', intensity: 0.5 }));
        await waitFor(running, 'manual start');
        state.next = { mode: 'continue', content: ' She smiles.' };    // the old text still contains <handy stop/>
        await pg.evaluate(() => window.sendTurn({ chatId: 'chat1', continueMessageId: 'x' }));
        await new Promise((r) => setTimeout(r, 900));
        assert.ok(await running(), 'old stop tag must not re-run');
    });
    await step('switching chats stops the device; group chat characters are known', async () => {
        state.next = { mode: 'new', content: 'Hello from the group.', characterId: 'c2' };
        await pg.evaluate(() => window.sendTurn({ chatId: 'chat2', userMessage: 'hey' }));
        await waitFor(async () => !(await running()), 'stopped on chat switch');
        state.next = { mode: 'new', content: 'Mira grins. <handy act="handjob" intensity="0.7"/>', characterId: 'c2' };
        await pg.evaluate(() => window.sendTurn({ chatId: 'chat2', userMessage: 'go' }));
        await waitFor(running, 'group start');
        assert.equal(await pg.evaluate(() => window.handyAdaptive.chars.activeKey()), 'marinara:c2');
    });
    await step('Esc stops the device', async () => {
        await pg.keyboard.press('Escape');
        await waitFor(async () => !(await running()), 'stopped by Esc');
    });
    await step('Esc stops the device even while a Marinara menu is swallowing keys', async () => {
        await pg.evaluate(() => window.handyAdaptive.run({ act: 'handjob', intensity: 0.5 }));
        await waitFor(running, 'start');
        // Marinara's ContextMenu: window keydown, capture phase, stopPropagation on every key
        await pg.evaluate(() => { window.__swallow = (e) => { e.stopPropagation(); e.preventDefault(); }; window.addEventListener('keydown', window.__swallow, true); });
        await pg.keyboard.press('Escape');
        await waitFor(async () => !(await running()), 'stopped by Esc despite the menu');
        await pg.evaluate(() => window.removeEventListener('keydown', window.__swallow, true));
        const toasts = await pg.$$eval('.handy-toast', (els) => els.filter((e) => /Esc/.test(e.textContent)).length);
        assert.equal(toasts, 1, 'one stop, not two');
    });

    // ---- calibration, driven through the dialog exactly as a user would
    const calib = () => pg.evaluate(() => { const c = window.handyAdaptive.calib; return { active: c.active, step: c.step, pos: c.pos, moving: !!c.moving }; });
    const jogVisible = () => pg.isVisible('#handy_calib .handy-calib-jog');
    const settle = async () => { await waitFor(async () => { const c = await calib(); return !c.moving && Math.abs(devPos() - c.pos) < 0.6; }, 'sleeve settled', 15000); await new Promise((r) => setTimeout(r, 150)); };
    const clickJog = async (d) => { const before = devPos(); await pg.click(`#handy_calib [data-jog="${d}"]`); await settle(); return Math.round(devPos() - before); };
    await step('calibration: the dialog opens from the panel and the arrows wait until the sleeve has arrived', async () => {
        dev.cmds.length = 0;   // (the simulated sleeve stays wherever the last act left it, like a real one)
        await pg.click('#handy_calib_btn');
        await pg.waitForSelector('#handy_calib', { state: 'visible', timeout: 3000 });
        assert.equal((await calib()).step, 0);
        await pg.click('#handy_calib_next');                      // Start
        await new Promise((r) => setTimeout(r, 300));
        assert.equal(await jogVisible(), false, 'arrows hidden while travelling to the start position');
        await waitFor(jogVisible, 'arrows appear after arrival', 8000);
        await settle();
        assert.equal((await calib()).step, 1);
    });
    await step('calibration: ▼ lowers and ▲ raises the real sleeve by exactly the amount shown', async () => {
        const moves = [await clickJog(-2), await clickJog(-10), await clickJog(2), await clickJog(10)];
        assert.deepEqual(moves, [-2, -10, 2, 10]);
    });
    await step('calibration: ↑/↓ keys work even with focus in Marinara\'s message box (and don\'t reach it)', async () => {
        await pg.focus('#composer');
        let before = devPos(); await pg.keyboard.press('ArrowDown'); await settle();
        assert.equal(Math.round(devPos() - before), -2);
        before = devPos(); await pg.keyboard.press('Shift+ArrowUp'); await settle();
        assert.equal(Math.round(devPos() - before), 10);
        assert.deepEqual(await pg.evaluate(() => window.__composerKeys), []);
    });
    await step('calibration: quick presses add up and a change of mind mid-move lands where asked', async () => {
        const start = (await calib()).pos;
        for (let i = 0; i < 3; i++) await pg.click('#handy_calib [data-jog="-10"]');
        await pg.click('#handy_calib [data-jog="10"]');
        await settle();
        assert.equal((await calib()).pos, start - 20);
        assert.equal(Math.round(devPos()), start - 20);
    });
    await step('calibration: pressing "This is my tip" while moving answers "wait" instead of marking', async () => {
        await pg.click('#handy_calib [data-jog="10"]');
        await pg.click('#handy_calib_next');
        assert.equal((await calib()).step, 1, 'not marked mid-move');
        await waitFor(async () => (await pg.$$eval('.handy-toast', (els) => els.some((e) => /Wait until the sleeve stops/.test(e.textContent)))), 'wait hint shown', 2000);
        await settle();
    });
    let tipPos, basePos;
    await step('calibration: tip, base (with Back), Test and Save all work, and the result is stored', async () => {
        tipPos = (await calib()).pos;
        await pg.click('#handy_calib_next');                      // This is my tip
        await waitFor(async () => (await calib()).step === 2, 'step 2');
        await settle();
        await pg.click('#handy_calib_back');                      // Back to the tip…
        await waitFor(async () => (await calib()).step === 1, 'back to step 1');
        await settle();
        assert.equal((await calib()).pos, tipPos);
        await pg.click('#handy_calib_next');                      // …and on again
        await waitFor(async () => (await calib()).step === 2, 'step 2 again');
        await settle();
        while ((await calib()).pos > tipPos - 40) await clickJog(-10);
        basePos = (await calib()).pos;
        await pg.click('#handy_calib_next');                      // This is my base
        await waitFor(async () => (await calib()).step === 3, 'step 3');
        const n = dev.cmds.length;
        await pg.click('#handy_calib_test');                      // Test: sweeps between base and tip at 25 %/s
        // (it starts at the base, where the sleeve already is, so three moves: tip, base, tip)
        await waitFor(() => dev.cmds.length >= n + 3, 'test sweeps', 20000);
        await settle();
        const sweeps = dev.cmds.slice(n).map((c) => c.p1);
        assert.deepEqual(sweeps, [tipPos, basePos, tipPos]);
        assert.ok(sweeps.every((p) => p === tipPos || p === basePos), `test goes only between base and tip: ${sweeps}`);
        await pg.click('#handy_calib_next');                      // Save
        await waitFor(async () => !(await calib()).active, 'dialog closed');
        await waitFor(() => state.storage.settings?.calibration?.tip === tipPos && state.storage.settings?.calibration?.base === basePos, 'calibration saved to Marinara storage');
        assert.equal(await pg.isVisible('#handy_calib'), false);
    });
    await step('calibration: no calibration move was ever faster than 25 %/s', async () => {
        const vmax = Math.max(...dev.cmds.filter((c) => Math.abs(c.p1 - c.p0) > 0.5).map((c) => c.v));
        assert.ok(vmax <= 25 * 1.05, `fastest ${Math.round(vmax)} %/s`);
    });
    await step('after calibrating, motion stays between your base and tip', async () => {
        dev.cmds.length = 0;
        await pg.evaluate(() => window.handyAdaptive.run({ act: 'handjob', intensity: 0.8 }));
        await new Promise((r) => setTimeout(r, 4000));
        const ps = dev.cmds.map((c) => c.p1);
        assert.ok(ps.length > 5, 'strokes sent');
        assert.ok(Math.min(...ps) >= basePos - 0.5 && Math.max(...ps) <= tipPos + 0.5, `range ${Math.min(...ps)}-${Math.max(...ps)} vs ${basePos}-${tipPos}`);
        await pg.click('#handy_stop');
        await waitFor(async () => !(await running()), 'STOP');
    });
    await step('calibration: STOP / cancel ends it at once and freezes the sleeve', async () => {
        await pg.click('#handy_calib_btn');
        await pg.waitForSelector('#handy_calib', { state: 'visible' });
        await pg.click('#handy_calib_next');
        await new Promise((r) => setTimeout(r, 400));
        await pg.click('#handy_calib_cancel');
        await waitFor(async () => !(await calib()).active, 'cancelled');
        const p = devPos(); await new Promise((r) => setTimeout(r, 600));
        assert.ok(Math.abs(devPos() - p) < 0.5, 'sleeve stopped');
    });
    await step('every panel button works when clicked', async () => {
        const kinds = { faster: 'faster', slower: 'slower', longer: 'longer', shorter: 'shorter', up: 'up', down: 'down', more: 'more', less: 'less', love: 'love', nope: 'nope', close: 'close', climax: 'finish-me', finish: 'finished' };
        const log = () => pg.evaluate(() => window.handyAdaptive.profile().log.map((e) => e.kind));
        const failed = [];
        for (const [btn, kind] of Object.entries(kinds)) {
            if (!(await running())) { await pg.evaluate(() => window.handyAdaptive.run({ act: 'handjob', intensity: 0.5 })); await waitFor(running, 'running'); }
            const n = (await log()).length;
            await pg.click(`#handy_panel [data-fb="${btn}"]`);
            await new Promise((r) => setTimeout(r, 250));
            const after = await log();
            if (!(after.length > n && after.slice(n).includes(kind))) failed.push(btn);
        }
        assert.deepEqual(failed, [], 'buttons with no effect');
        await pg.click('#handy_stop'); await waitFor(async () => !(await running()), 'STOP');
        await pg.selectOption('#handy_act', 'cowgirl');
        await pg.click('#handy_panel [data-fb="love"]');          // a panel refresh between picking and ▶ must keep the pick
        await pg.click('#handy_play'); await waitFor(running, '▶ plays');
        assert.equal(await act(), 'cowgirl');
        await pg.click('#handy_fav');
        await waitFor(async () => (await pg.evaluate(() => window.handyAdaptive.profile().favorites.length)) > 0, '⭐ saves');
        await pg.click('#handy_stop'); await waitFor(async () => !(await running()), 'STOP');
        await pg.click('#handy_collapse'); assert.equal(await pg.isVisible('#handy_stop'), false);
        await pg.click('#handy_collapse'); assert.ok(await pg.isVisible('#handy_stop'));
    });
    await step('games: pick from the menu, game buttons work when clicked, the load row appears after a finish', async () => {
        const G = (f) => pg.evaluate(f);
        await pg.selectOption('#handy_game_mode', 'fucktoy');
        await pg.click('#handy_game_btn');
        await waitFor(() => G(() => window.handyAdaptive.game.active && window.handyAdaptive.game.mode === 'fucktoy'), 'fucktoy started');
        assert.ok(await pg.isVisible('#handy_game'), 'game status shown');
        assert.equal(await pg.isDisabled('#handy_game_mode'), true, 'menu locked while playing');
        await pg.waitForSelector('#handy_game_actions [data-use="mouth"]', { state: 'visible' });
        await pg.click('#handy_game_actions [data-use="mouth"]');
        await waitFor(async () => (await act()) === 'blowjob' && (await running()), 'mouth → blowjob');
        await pg.click('#handy_game_actions [data-use="hands"]');
        await waitFor(async () => (await act()) === 'handjob', 'hands → handjob');
        assert.match(await pg.textContent('#handy_game'), /Fucktoy · .* 2 uses/);
        await pg.click('#handy_game_btn');
        await waitFor(() => G(() => !window.handyAdaptive.game.active), 'ended');
        assert.equal(await pg.isVisible('#handy_game_actions'), false, 'game buttons hidden after the game');
        await pg.selectOption('#handy_game_mode', 'daddy');
        await pg.click('#handy_game_btn');
        await pg.waitForSelector('#handy_game_actions [data-dg="good"]', { state: 'visible' });
        await pg.click('#handy_game_actions [data-dg="good"]'); await pg.click('#handy_game_actions [data-dg="good"]');
        await waitFor(() => G(() => window.handyAdaptive.game.good === 2), 'good girl counted');
        await G(() => window.handyAdaptive.play.ask());
        await pg.waitForSelector('#handy_game_actions [data-dg="yes"]', { state: 'visible' });
        await pg.click('#handy_game_actions [data-dg="yes"]');
        await waitFor(() => G(() => !window.handyAdaptive.game.active && window.handyAdaptive.climax.active), 'yes → climax push');
        await pg.click('#handy_panel [data-fb="finish"]');
        await pg.waitForSelector('#handy_load', { state: 'visible' });
        await pg.click('#handy_load [data-load="huge"]');
        await waitFor(() => G(() => window.handyAdaptive.profile().log.some((e) => e.kind === 'load-huge')), 'load rated');
        await waitFor(async () => !(await pg.isVisible('#handy_load')), 'load row hidden after rating');
        assert.equal(await pg.isDisabled('#handy_game_mode'), false, 'menu unlocked');
        await pg.click('#handy_stop'); await waitFor(async () => !(await running()), 'STOP');
    });
    await step('every game plays through Marinara: instructions reach the AI, tags drive the device, endings work', async () => {
        const G = (f, a) => pg.evaluate(f, a);
        const turn = async (chatId, user, content, characterId) => {
            state.next = { mode: 'new', content, ...(characterId ? { characterId } : {}) };
            await pg.evaluate(([c, u]) => window.sendTurn({ chatId: c, userMessage: u }), [chatId, user]);
            await new Promise((r) => setTimeout(r, 700));   // the extension reads the finished reply
        };
        const start = async (mode) => {
            if (await G(() => window.handyAdaptive.game.active)) await pg.click('#handy_game_btn');
            await pg.selectOption('#handy_game_mode', mode); await pg.click('#handy_game_btn');
            await waitFor(() => G((m) => window.handyAdaptive.game.active && window.handyAdaptive.game.mode === m, mode), mode + ' started');
            await waitFor(async () => (await pg.$$eval('.handy-toast', (els) => els.some((e) => /Send a message and she will start it/.test(e.textContent)))), 'told to send a message', 3000);
        };
        const lastEntry = () => state.generations.at(-1).entry?.content || '';
        const headers = { edging: 'EDGING GAME — ON', roulette: 'PORN ROULETTE — ON', trance: 'GOON TRANCE — ON', mommy: "MOMMY'S STAMINA TRAINING — ON", fucktoy: 'FUCKTOY — ON',
            daddy: "DADDY'S GIRL — ON", rivalry: 'TWO-GIRL RIVALRY — ON', party: 'WATCH PARTY — ON', cuckqueen: 'CUCKQUEEN — ON', panties: 'PANTY GAME — ON' };
        const failures = [];
        for (const [mode, header] of Object.entries(headers)) {
            const chat = mode === 'rivalry' ? 'chat2' : 'chat1';
            await start(mode);
            await turn(chat, 'start', `Let's play. <handy act="blowjob" intensity="0.5" scene="POV blowjob" watch="her lips" woman="busty redhead" panties="black lace thong" girl="Vex"/>`);
            if (!lastEntry().includes(header)) failures.push(mode + ': instructions missing: ' + ((lastEntry().match(/[A-Z' -]+ — ON/) || ['no game'])[0]) + ' | active=' + (await G(() => window.handyAdaptive.game.active + ':' + window.handyAdaptive.game.mode)) + ' len=' + lastEntry().length);
            await waitFor(running, mode + ': device running');
            if ((await act()) !== 'blowjob') failures.push(mode + ': act not applied');
        }
        assert.deepEqual(failures, [], 'games');
        // a closer look at each game's own mechanics
        await start('edging');
        await turn('chat1', 'go', '<handy act="handjob" intensity="0.6"/>');
        await pg.click('#handy_panel [data-fb="close"]'); await pg.click('#handy_panel [data-fb="climax"]');
        await waitFor(() => G(() => window.handyAdaptive.game.edges === 1 && window.handyAdaptive.game.begs === 1 && !window.handyAdaptive.climax.active), 'edge + beg counted');
        await turn('chat1', 'please', 'No. <handy game="deny"/>');
        await waitFor(async () => !(await G(() => window.handyAdaptive.game.active)) && !(await running()), 'denied: game over, device stopped');
        await start('trance');
        await turn('chat1', 'go', '<handy act="handjob" intensity="0.95"/>');
        await waitFor(() => G(() => window.handyAdaptive.actEngine.intent.intensity <= 0.6), 'trance caps intensity');
        await turn('chat1', 'ok', 'Now. <handy game="allow"/>');
        await waitFor(() => G(() => !window.handyAdaptive.game.active && window.handyAdaptive.climax.active && window.handyAdaptive.climax.ms === 45000), 'trance ends with a 45 s push');
        await pg.click('#handy_stop'); await waitFor(async () => !(await running()), 'STOP');
        await start('daddy');
        await turn('chat1', 'hi', 'Please, daddy? <handy act="blowjob" intensity="0.5"/><handy game="ask"/>');
        await pg.waitForSelector('#handy_game_actions [data-dg="wait"]', { state: 'visible' });
        await pg.click('#handy_game_actions [data-dg="wait"]');
        await waitFor(() => G(() => window.handyAdaptive.game.waits === 1 && !window.handyAdaptive.game.asking), 'made her wait');
        await waitFor(async () => (await pg.$$eval('.handy-toast', (els) => els.some((e) => /Send a message to hear her react/.test(e.textContent)))), 'told once to send a message for her reaction', 4000);
        await pg.click('#handy_game_btn');
        await start('rivalry');
        await turn('chat2', 'go', 'Mine. <handy act="blowjob" intensity="0.6"/>', 'c2');
        await pg.click('#handy_panel [data-fb="close"]');
        await waitFor(() => G(() => window.handyAdaptive.game.scores.Mira === 1), 'the character in control (Mira, in the group chat) scores');
        await pg.click('#handy_game_btn');
        await start('panties');
        await turn('chat1', 'show me', 'Look at these. <handy act="doggy" intensity="0.5" panties="red satin g-string" pics="red satin g-string ass" search="red satin thong"/>');
        await waitFor(() => G(() => Object.keys(window.handyAdaptive.profile().drawer).length >= 2), 'drawer grows');
        await pg.waitForSelector('#handy_videos a[href*="pornpics.com/?q=red+satin+g-string+ass"]', { state: 'visible' });
        await pg.waitForSelector('#handy_videos a[href*="pornhub.com/video/search?search=red+satin+thong"]', { state: 'visible' });
        assert.match(await pg.textContent('#handy_game'), /drawer \d+/);
        await pg.click('#handy_panel [data-fb="finish"]');
        await pg.waitForSelector('#handy_load', { state: 'visible' });
        await pg.click('#handy_load [data-load="good"]');
        await waitFor(() => G(() => !window.handyAdaptive.game.active && window.handyAdaptive.profile().focus.finishes.at(-1)?.load === 'good'), 'finish ends the panty game, load rated');
        await pg.click('#handy_stop'); await waitFor(async () => !(await running()), 'STOP');
        // tags with the new attributes are hidden by the display rule
        const rx = state.regex.find((r) => r.name === 'Handy Adaptive: hide device tags');
        const shown = 'Hi <handy act="blowjob" watch="her lips" panties="black lace thong" pics="a b" search="c" game="ask" girl="Vex"/> there'.replace(new RegExp(rx.findRegex, rx.flags), rx.replaceString);
        assert.equal(shown, 'Hi  there');
        // settings for the games are there and save
        await pg.click('#handy_settings_btn');
        for (const id of ['#handy_game_min', '#handy_roulette_min', '#handy_videos_on', '#handy_pics_on', '#handy_video_site', '#handy_focus_summary', '#handy_secrets_summary', '#handy_focus_reset']) assert.ok(await pg.isVisible(id), id + ' visible');
        await pg.selectOption('#handy_video_site', 'xvideos');
        await waitFor(() => state.storage.settings?.videoSite === 'xvideos', 'site choice saved to Marinara storage');
        assert.match(await pg.textContent('#handy_secrets_summary'), /\/32 secrets found/);
        await pg.click('#handy-st-settings .handy-st-close');
    });
    await step('settings open in a window; Test connection works; ST-only options are hidden', async () => {
        await pg.click('#handy_settings_btn');
        assert.ok(await pg.isVisible('#handy-st-settings #handy_key'));
        assert.equal(await pg.isVisible('#handy_auto'), false);
        assert.equal(await pg.isVisible('#handy_style_profile'), false);
        await pg.click('#handy_test');
        await waitFor(async () => /connected/.test(await pg.textContent('#handy_status')), 'connected');
        assert.match(await pg.textContent('#handy-st-ai'), /active/);
        await pg.click('#handy_cal_start');                       // Calibrate from the settings window: the dialog opens on top
        await pg.waitForSelector('#handy_calib', { state: 'visible', timeout: 3000 });
        await pg.click('#handy_calib_cancel');                    // (a real click: fails if anything covers it)
        await waitFor(async () => !(await pg.isVisible('#handy_calib')), 'calibration closed');
        await pg.screenshot({ path: path.join(root, 'tests', 'marinara_settings.png') });
    });
    await step('turning AI instructions off empties the lorebook entry', async () => {
        await pg.uncheck('#handy_inject');
        await waitFor(() => managed().enabled === false && managed().content === '', 'entry disabled');
        await pg.check('#handy_inject');
        await waitFor(() => managed().enabled === true, 'entry re-enabled');
    });
    await step('settings and learned taste persist to Marinara extension storage', async () => {
        await waitFor(() => state.storage.settings?.profile?.log?.some((e) => e.kind === 'faster'), 'profile saved');
        assert.equal(state.storage.settings.connectionKey, 'KEY123');
        assert.equal(state.storage.settings.autoReplyOnFeedback, false);
    });
    await step('the start-of-session question works in Marinara', async () => {
        await pg.check('#handy_session_check');
        await pg.click('#handy-st-settings .handy-st-close');
        await waitFor(() => state.storage.settings?.sessionCheck === true, 'setting saved');
        await pg.reload();
        await pg.waitForFunction(() => window.__extReady && document.querySelector('#handy_panel'), null, { timeout: 10000 });
        await pg.click('#handy_play');
        await pg.waitForSelector('#handy_calib', { state: 'visible', timeout: 3000 });
        await pg.click('#handy_calib_next');
        await waitFor(running, 'started after the question');
        await pg.click('#handy_stop');
        await waitFor(async () => !(await running()), 'STOP');
    });
    await step('recreates the lorebook if it was deleted', async () => {
        state.lorebooks.length = 0; state.entries.length = 0;
        await pg.evaluate(() => window.sendTurn({ chatId: 'chat1', userMessage: 'again' }));
        assert.ok(state.generations.at(-1).entry?.content.includes('[Device control'));
    });
    await step('disabling restores fetch, removes the UI, clears timers and blanks the instructions', async () => {
        await pg.screenshot({ path: path.join(root, 'tests', 'marinara_panel.png') });
        await pg.evaluate(() => window.__disableExt());
        assert.ok(await pg.evaluate(() => window.fetch === window.__originalFetch));
        assert.equal(await pg.$('#handy_panel'), null);
        assert.equal(await pg.$('#handy-st-settings'), null);
        assert.equal(managed().enabled, false);
        const n = state.handy.length; await new Promise((r) => setTimeout(r, 700));
        assert.equal(state.handy.length, n, 'no device traffic after disabling');
    });
    assert.equal(state.csrfFailures, 0, 'every write carries the CSRF header');
    assert.deepEqual(pageErrors, [], 'page errors');
    console.log(`marinara_e2e: ${passed} checks passed`);
} catch (e) {
    console.error('FAIL', e);
    if (pageErrors.length) console.error('page errors:', pageErrors);
    process.exitCode = 1;
} finally {
    await browser.close();
    server.close();
}
