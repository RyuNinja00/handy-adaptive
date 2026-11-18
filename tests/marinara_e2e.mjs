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

const state = { storage: {}, lorebooks: [], entries: [], regex: [], chats: {}, handy: [], generations: [], csrfFailures: 0, next: null, ids: 0,
    pictures: [], uploads: [], imageFail: false, venice: [], veniceFail: 0 };
// Venice's POST /image/multi-edit: unknown fields are rejected, the answer is the picture itself
const VENICE_FIELDS = new Set(['modelId', 'prompt', 'images', 'aspect_ratio', 'resolution', 'quality', 'output_format', 'safe_mode', 'enhance_prompt', 'disable_prompt_optimization_thinking', 'transparent_background', 'anon_user_id']);
const PNG = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';
const connectionsDb = [
    { id: 'llm1', provider: 'openai', name: 'Chat model', model: 'x' },
    { id: 'img1', provider: 'image_generation', name: 'SpicyAPI', model: 'minimax/h3-image/text-to-image', defaultForAgents: 'false' },
    { id: 'img2', provider: 'image_generation', name: 'SpicyAPI edit', model: 'minimax/h3-image/edit', defaultForAgents: 'false' },
];
// A Handy that moves: v2 HDSP sleeve position over real time (same model as tests/sim/bench.mjs)
const dev = { mode: null, seg: null, rest: 0, cmds: [], fw: '3.2.3', quirk: null };
const devPos = (t = Date.now()) => { const g = dev.seg; if (!g) return dev.rest; if (t >= g.t1) return g.p1; return g.p0 + (g.p1 - g.p0) * ((t - g.t0) / (g.t1 - g.t0)); };
const halt = () => { dev.rest = devPos(); dev.seg = null; };
function handyCmd(p, body) {
    if (p === '/connected') return { connected: true };
    if (p === '/info') return { fwVersion: dev.fw };
    if (p === '/slider/state') return { position: devPos() };
    if (p === '/servertime') return { serverTime: Date.now() };
    if (p === '/mode') { if (body?.mode !== dev.mode) halt(); dev.mode = body?.mode; return { result: 0 }; }
    if (p === '/hamp/stop' || p === '/hssp/stop') { halt(); return { result: 0 }; }
    if (p === '/hdsp/xpt') {
        if (dev.mode !== 2) return { error: { message: 'device not in HDSP mode' } };
        if (!Number.isFinite(body?.position) || !Number.isFinite(body?.duration)) return { error: { message: 'bad xpt payload' } };
        const goal = dev.quirk === 'stuck' ? 100 : dev.quirk === 'fraction' ? Math.min(1, Math.max(0, body.position)) * 100 : body.position;   // "stuck": firmware 4 misreading API v2 positions
        const p0 = devPos(), t0 = Date.now(), dur = Math.max(body.duration, 1);
        dev.seg = { p0, p1: goal, t0, t1: t0 + dur };
        dev.cmds.push({ t: t0, p0, p1: goal, v: (Math.abs(goal - p0) / dur) * 1000 });
        return { result: 0 };
    }
    return { result: 0 };
}
const newId = (p) => `${p}${++state.ids}`;
const chatsMeta = {
    chat1: { id: 'chat1', name: 'Vex', mode: 'roleplay', characterIds: '["c1"]', personaId: 'p1', metadata: JSON.stringify({ imageGenConnectionId: 'img1' }) },   // stored as text, like Marinara's DB
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
    if (p === '/') { res.writeHead(200, { 'Content-Type': 'text/html', 'Content-Security-Policy': "connect-src 'self' http: https: ws: wss:" }); return res.end(page); }
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
    if (p === '/venice/image/multi-edit' && m === 'POST') {
        state.venice.push({ auth: req.headers.authorization, body });
        if (req.headers.authorization !== 'Bearer VKEY') return json(401, { error: 'Authentication failed' });
        const unknown = Object.keys(body || {}).filter((k) => !VENICE_FIELDS.has(k));
        if (unknown.length) return json(400, { error: 'Invalid request', details: { _errors: [`Unrecognized key(s) in object: ${unknown.join(', ')}`] } });
        if (!body.prompt || !Array.isArray(body.images) || !body.images.length) return json(400, { error: 'Invalid request', details: {} });
        if (state.veniceFail) return json(state.veniceFail, { error: 'Insufficient balance' });
        res.writeHead(200, { 'Content-Type': 'image/png' }); return res.end(Buffer.from(PNG, 'base64'));
    }
    let mm;
    // Marinara's image connections, avatar-generation, chat Gallery and message extras
    if (p === '/api/connections' && m === 'GET') return json(200, connectionsDb);
    if (p === '/api/characters/avatar-generation' && m === 'POST') {
        state.pictures.push(body);
        if (!connectionsDb.some((c) => c.id === body.connectionId && c.provider === 'image_generation')) return json(400, { error: 'Image generation connection not found' });
        if (!body.appearance) return json(400, { error: 'appearance description is required' });
        if (state.imageFail) return json(500, { error: 'SpicyAPI image generation failed: content error' });
        const conn = connectionsDb.find((c) => c.id === body.connectionId);
        if (/\/edit$/.test(conn.model) && !body.referenceImages?.length) return json(500, { error: 'SpicyAPI image generation failed (400): image_urls: is required' });   // like the real thing
        await new Promise((r) => setTimeout(r, 120));
        return json(200, { image: `data:image/png;base64,${PNG}`, prompt: body.promptOverrides?.[0]?.prompt });
    }
    if ((mm = p.match(/^\/api\/gallery\/([^/]+)\/upload$/)) && m === 'POST') {
        const id = newId('g');
        state.uploads.push({ chatId: mm[1], hasFile: /name="file"; filename="handy-picture\.png"/.test(raw), hasPrompt: /name="prompt"/.test(raw), type: req.headers['content-type'] });
        return json(200, { id, chatId: mm[1], url: `/api/gallery/file/${mm[1]}/${id}.png` });
    }
    if (p.startsWith('/api/gallery/file/') && m === 'GET') { res.writeHead(200, { 'Content-Type': 'image/png' }); return res.end(Buffer.from(PNG, 'base64')); }
    if ((mm = p.match(/^\/api\/chats\/([^/]+)\/messages\/([^/]+)$/)) && m === 'PATCH') {
        const msg = (state.chats[mm[1]] || []).find(x => x.id === mm[2]);
        if (!msg) return json(404, {});
        msg.content = body.content; return json(200, msg);
    }
    if ((mm = p.match(/^\/api\/chats\/([^/]+)\/messages\/([^/]+)\/extra$/)) && m === 'PATCH') {
        const msg = (state.chats[mm[1]] || []).find((x) => x.id === mm[2]);
        if (!msg) return json(404, { error: 'Message not found' });
        msg.extra = { ...(msg.extra || {}), ...body }; return json(200, msg);
    }
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
state.storage.settings = { connectionKey: 'KEY123', apiBase: `${base}/handy/v2`, veniceBase: `${base}/venice`, calibration: { base: 10, tip: 90, at: 'x' }, sessionCheck: false, readWpm: 0 };

const browser = await chromium.launch();
const pg = await (await browser.newContext({ viewport: { width: 1280, height: 860 } })).newPage();
const pageErrors = [];
pg.on('pageerror', (e) => pageErrors.push(String(e)));
// Chromium logs failed requests as console errors; the deleted-lorebook check causes an expected 404.
pg.on('console', (msg) => {   // …and the picture-failure check causes one expected 500
    if (msg.type() !== 'error' || /Failed to load resource: .*404/.test(msg.text())) return;
    if (/Failed to load resource: .*500/.test(msg.text()) && state.expected500 > 0) { state.expected500--; return; }
    if (/Failed to load resource: .*40[12]/.test(msg.text()) && state.expectedVenice > 0) { state.expectedVenice--; return; }
    if (/127\.0\.0\.1:38765|ERR_CONNECTION_REFUSED/.test(msg.text()) && state.expectBridgeDown) return;   // no image bridge running here
    pageErrors.push(msg.text());
});
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
    await pg.addInitScript(() => {   // a speech engine and a Bluetooth heart-rate strap, faked
        window.__spoken = []; window.__cancels = 0;
        window.SpeechSynthesisUtterance = function (text) { this.text = text; };
        Object.defineProperty(window, 'speechSynthesis', { value: { speak: (u) => window.__spoken.push(u), cancel: () => { window.__cancels++; }, getVoices: () => [{ name: 'Test Voice', lang: 'en-US' }], addEventListener() {} }, configurable: true });
        const listeners = [];
        const ch = { addEventListener: (ev, fn) => listeners.push(fn), startNotifications: async () => {} };
        window.__beat = (bpm) => { const dv = new DataView(new ArrayBuffer(2)); dv.setUint8(0, 0); dv.setUint8(1, bpm); for (const fn of listeners) fn({ target: { value: dv } }); };
        Object.defineProperty(navigator, 'bluetooth', { value: { requestDevice: async () => ({ name: 'Test Strap', addEventListener() {}, gatt: { connect: async () => ({ getPrimaryService: async () => ({ getCharacteristic: async () => ch }) }), disconnect() {} } }) }, configurable: true });
    });
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
        await waitFor(() => state.regex.length === 2, 'regex');
        const r = state.regex.find((x) => x.name === 'Handy Adaptive: hide device tags');
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
    await step('calibration self-check in Marinara: firmware 4 shown, a Handy that ignores positions is flagged, the wrong-way help and Flip work', async () => {
        dev.fw = '4.0.12';
        await pg.click('#handy_settings_btn');
        await pg.click('#handy_test');
        await waitFor(async () => /firmware 4\.0\.12/.test(await pg.textContent('#handy_status')) && /Buffered streaming/.test(await pg.textContent('#handy_status')), 'firmware + tip shown');
        await pg.click('#handy-st-settings .handy-st-close');
        dev.quirk = 'stuck';
        await pg.click('#handy_calib_btn');
        await pg.waitForSelector('#handy_calib', { state: 'visible', timeout: 3000 });
        if ((await calib()).step === -1) await pg.click('#handy_calib_test');   // "Recalibrate", if it asked about the setup
        await pg.click('#handy_calib_next');                                     // Start
        await waitFor(jogVisible, 'arrows shown', 15000);
        assert.ok(await pg.isVisible('#handy_calib_wrong'), 'the wrong-way link is offered');
        for (let k = 0; k < 3; k++) { await pg.click('#handy_calib [data-jog="-10"]'); await waitFor(async () => !(await calib()).moving, 'move done', 15000); await new Promise((r) => setTimeout(r, 300)); }
        await pg.waitForSelector('#handy_calib_warn', { state: 'visible', timeout: 5000 });
        const w = await pg.textContent('#handy_calib_warn');
        assert.match(w, /isn't moving/); assert.match(w, /firmware 4/); assert.match(w, /Application ID/);
        await pg.click('#handy_calib [data-calfix="close"]');
        dev.quirk = null;
        await pg.click('#handy_calib_wrong');
        await pg.waitForSelector('#handy_calib [data-calfix="flip"]', { state: 'visible' });
        await pg.click('#handy_calib [data-calfix="flip"]');
        await waitFor(() => state.storage.settings?.flipAxis === true, 'flip saved to Marinara storage');
        await pg.click('#handy_calib_wrong');
        await pg.click('#handy_calib [data-calfix="flip"]');
        await waitFor(() => state.storage.settings?.flipAxis === false, 'flip undone');
        await pg.click('#handy_calib_cancel');
        await waitFor(async () => !(await calib()).active, 'calibration closed');
        dev.fw = '3.2.3';
        await pg.evaluate(() => { window.handyAdaptive.api && (window.handyAdaptive.api.fwMajor = null); });
    });
    await step('a firmware 4 Handy that reads 0–1 positions: calibration finds it, "go to 50" stops at 50, ▼ lowers the sleeve', async () => {
        dev.fw = '4.0.12'; dev.quirk = 'fraction';
        await pg.evaluate(() => { const H = window.handyAdaptive; H.api.fwMajor = null; H.api.scale = null; });
        await pg.click('#handy_calib_btn');
        await pg.waitForSelector('#handy_calib', { state: 'visible', timeout: 3000 });
        if ((await calib()).step === -1) await pg.click('#handy_calib_test');
        await pg.click('#handy_calib_next');
        await waitFor(jogVisible, 'arrows shown after the format check', 25000);
        await waitFor(async () => (await pg.$$eval('.handy-toast', (els) => els.some((e) => /0–1 scale/.test(e.textContent)))), 'told it switched', 3000);
        await settle();
        const start = (await calib()).pos;
        assert.ok(Math.abs(devPos() - start) < 1.5, `went to ${devPos().toFixed(1)} for ${start}`);
        const d1 = await clickJog(-10), d2 = await clickJog(-10);
        assert.ok(d1 <= -9 && d2 <= -9, `▼ lowers: ${d1}, ${d2}`);
        assert.equal(state.storage.settings?.posScaleFound, 'fraction');
        await pg.click('#handy_calib_cancel');
        await waitFor(async () => !(await calib()).active, 'closed');
        dev.quirk = null; dev.fw = '3.2.3';
        await pg.evaluate(() => { const H = window.handyAdaptive; H.api.fwMajor = null; H.api.scale = null; });
        await pg.click('#handy_settings_btn'); await pg.selectOption('#handy_pos_scale', 'percent'); await pg.selectOption('#handy_pos_scale', 'auto'); await pg.click('#handy-st-settings .handy-st-close');
        await pg.evaluate(() => { window.handyAdaptive.api.scale = 'percent'; });   // the next steps use a firmware 3 Handy again
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
        await waitFor(() => state.chats.chat1.at(-1).content.includes('(https://www.pornhub.com/video/search?search=red+satin+thong)'), 'video search in saved reply');
        assert.ok(state.chats.chat1.at(-1).content.includes('(https://www.pornpics.com/?q=red+satin+g-string+ass)'));
        assert.equal(await pg.locator('#handy_videos a').count(), 0);
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
    await step('cast, triggers, confessions, story mode, voice and heart rate all work in Marinara', async () => {
        const G = (f, a) => pg.evaluate(f, a);
        const turn = async (content, user = 'go') => {
            state.next = { mode: 'new', content };
            await pg.evaluate((u) => window.sendTurn({ chatId: 'chat1', userMessage: u }), user);
            await new Promise((r) => setTimeout(r, 700));
        };
        if (await G(() => window.handyAdaptive.game.active)) await pg.click('#handy_game_btn');
        // voice: on, read her reply aloud
        await pg.click('#handy_settings_btn');
        await pg.check('#handy_voice_on');
        assert.ok(await pg.isVisible('#handy_voice_name'));
        assert.match(await pg.innerHTML('#handy_voice_name'), /Test Voice/);
        // heart rate: connect the (fake) strap from the settings window
        await pg.click('#handy_hr_connect');
        await waitFor(() => G(() => !!window.handyAdaptive.hr.dev), 'sensor connected');
        await pg.click('#handy-st-settings .handy-st-close');
        // story mode from the panel
        await pg.selectOption('#handy_game_mode', 'story'); await pg.click('#handy_game_btn');
        await waitFor(() => G(() => !!window.handyAdaptive.game.story), 'story started');
        assert.match(await pg.textContent('#handy_game'), /Story · stage 1\/3/);
        await turn('Mm, good boy. <handy act="blowjob" intensity="0.6" her="Dana" about="curvy redhead from accounting" panties="black lace thong" confess="Who do you picture?"/>');
        assert.ok(state.generations.at(-1).entry.content.includes('STORY MODE: stage 1 of 3'), 'story instructions in the lorebook');
        await waitFor(() => G(() => window.__spoken.length > 0 && /good boy/i.test(window.__spoken.at(-1).text) && !/handy/.test(window.__spoken.at(-1).text)), 'reply spoken');
        await waitFor(() => G(() => !!window.handyAdaptive.profile().cast?.dana), 'cast member met');
        // his next message answers her confession question
        await turn('Okay.', 'Dana, bent over in a black lace thong');
        await waitFor(() => G(() => /black lace thong/.test(window.handyAdaptive.profile().confessions?.at(-1)?.a || '')), 'confession kept');
        assert.ok(state.generations.at(-1).entry.content.includes('HE ANSWERED YOUR CONFESSION QUESTION'), 'confession reaches the AI');
        assert.ok(state.generations.at(-1).entry.content.includes('Dana (curvy redhead from accounting'), 'cast reaches the AI');
        assert.ok(state.generations.at(-1).entry.content.includes('YOUR TRIGGER PHRASES'), 'triggers reach the AI');
        // heart rate: resting, then a climb
        for (let k = 0; k < 30; k++) await G(() => window.__beat(68));
        for (let k = 0; k < 6; k++) await G((b) => window.__beat(b), 90 + k);
        await waitFor(async () => /♥ 9\d/.test(await pg.textContent('#handy_hr')), 'heart rate on the panel');
        await turn('Mm.');
        assert.match(state.generations.at(-1).entry.content, /HEART RATE \(live sensor\): 9\d bpm, resting 68/);
        // two edges move the story on
        await pg.click('#handy_panel [data-fb="close"]'); await pg.click('#handy_panel [data-fb="close"]');
        await waitFor(() => G(() => window.handyAdaptive.game.story?.i === 1), 'story stage 2');
        await waitFor(async () => (await pg.$$eval('.handy-toast', (els) => els.some((e) => /Story mode: a new stage begins/.test(e.textContent)))), 'told to send a message', 3000);
        // STOP silences her and stops the device; end the game
        await pg.click('#handy_stop'); await waitFor(async () => !(await running()), 'STOP');
        assert.ok(await G(() => window.__cancels > 0), 'speech cancelled');
        await pg.click('#handy_game_btn');
        await pg.click('#handy_settings_btn'); await pg.uncheck('#handy_voice_on'); await pg.click('#handy_hr_disconnect'); await pg.click('#handy-st-settings .handy-st-close');
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
    await step('pictures: she sends pictures drawn by Marinara\'s image connection, saved and attached to her message', async () => {
        const G = (f, a) => pg.evaluate(f, a);
        const turn = async (content) => {
            state.next = { mode: 'new', content };
            await pg.evaluate(() => window.sendTurn({ chatId: 'chat1', userMessage: 'mm' }));
            await new Promise((r) => setTimeout(r, 700));
        };
        const lastEntry = () => state.generations.at(-1).entry?.content || '';
        const pics = () => state.pictures.length;
        const openSettings = async () => { if (!(await pg.isVisible('#handy-st-settings'))) await pg.click('#handy_settings_btn'); };
        await openSettings();
        await waitFor(async () => (await pg.$$eval('#handy_img_conn option', (o) => o.length)) === 3, 'image connections listed');
        assert.deepEqual(await pg.$$eval('#handy_img_edit option', (o) => o.map((x) => x.value)), ['', 'img1', 'img2', 'venice'], 'only image connections (and Venice directly) are offered');
        assert.equal(await pg.isVisible('#handy_img_none'), false);
        assert.match((await pg.$$eval('#handy_img_conn option', (o) => o.map((x) => x.textContent))).join('|'), /SpicyAPI edit \(minimax\/h3-image\/edit\) · editing model/, 'editing models are labelled');
        await pg.click('#handy_img_test');
        await waitFor(async () => /New pictures work \(SpicyAPI\)[\s\S]*Keeping a woman the same works too \(SpicyAPI edit\)/.test(await pg.textContent('#handy_img_status')), 'test picture').catch(async (e) => { throw new Error(e.message + ': ' + await pg.textContent('#handy_img_status')); });
        assert.equal(state.pictures.at(-2).connectionId, 'img1', 'the chat\'s image model is used');
        assert.equal(state.pictures.at(-1).connectionId, 'img2', 'then the editing model is checked, from that picture');
        assert.equal(state.pictures.at(-1).referenceImages?.length, 1);

        // An editing model picked for new pictures (the "image_urls: is required" mistake): rerouted, not an error
        await pg.selectOption('#handy_img_conn', 'img2');
        await pg.click('#handy_img_reload');
        await waitFor(async () => /is an editing model: it can only change an existing picture/.test(await pg.textContent('#handy_img_status')), 'warning about an editing model', 15000);
        await pg.click('#handy_img_test');
        await waitFor(async () => /New pictures work \(SpicyAPI\)\. SpicyAPI edit is an editing model, so SpicyAPI was used for a new picture/.test(await pg.textContent('#handy_img_status')), 'rerouted to the text-to-image model', 15000);
        assert.ok(!state.pictures.some((x) => x.connectionId === 'img2' && !x.referenceImages), 'never sent to the edit model without a picture');
        // only editing models: a clear explanation instead of SpicyAPI's error
        const saved = connectionsDb.splice(1, 1);
        await pg.click('#handy_img_test');
        await waitFor(async () => /Failed: “SpicyAPI edit” uses an image-editing model \(minimax\/h3-image\/edit\)[\s\S]*text-to-image model/.test(await pg.textContent('#handy_img_status')), 'explained', 15000);
        connectionsDb.splice(1, 0, ...saved);
        await pg.selectOption('#handy_img_conn', '');
        await pg.click('#handy_img_reload');
        await pg.click('#handy-st-settings .handy-st-close');

        if (await G(() => window.handyAdaptive.game.active)) await pg.click('#handy_game_btn');
        await pg.selectOption('#handy_game_mode', 'panties'); await pg.click('#handy_game_btn');
        await turn('Hi. <handy act="handjob" intensity="0.4"/>');
        assert.match(lastEntry(), /PICTURES: you can show him a picture/);
        assert.match(lastEntry(), /In the Panty game, show the pair/);
        // a message element, so the live preview has somewhere to go
        let n = pics();
        await turn('Look at her. <handy act="handjob" her="Dana" look="auburn bob, green eyes, freckles, curvy, 30s" img="bent over a desk, from behind, teen schoolgirl skirt pulled up" panties="red lace thong"/>');
        await waitFor(() => state.uploads.length >= 1 && pics() === n + 1, 'picture drawn and saved').catch(async (e) => { throw new Error(e.message + ' pics=' + (pics() - n) + ' uploads=' + state.uploads.length + ' status=' + await pg.textContent('#handy_pic_status') + ' errors=' + JSON.stringify(pageErrors) + ' all=' + JSON.stringify(state.pictures.map(x=>[x.connectionId,(x.promptOverrides?.[0]?.prompt||'').slice(0,90)])) + ' last=' + JSON.stringify(state.chats.chat1.slice(-2).map(m=>m.content))); });
        const first = state.pictures.at(-1), fp = first.promptOverrides[0];
        assert.equal(first.connectionId, 'img1'); assert.equal(first.referenceImages, undefined);
        assert.match(fp.prompt, /Dana, an adult woman \(25 or older\): auburn bob, green eyes, freckles, curvy, 30s/);
        assert.match(fp.prompt, /red lace thong panties/);
        assert.doesNotMatch(fp.prompt, /teen|schoolgirl/, 'minor-coded words removed');
        assert.match(fp.negativePrompt, /child, minor/);
        assert.equal(fp.id, 'avatar:handy-picture', 'the prompt override reaches Marinara as-is');
        const up = state.uploads.at(-1); assert.ok(up.hasFile && up.hasPrompt && /multipart\/form-data/.test(up.type));
        await waitFor(() => state.chats.chat1.at(-1).extra?.attachments?.length === 1, 'attached to her message');
        const att = state.chats.chat1.at(-1).extra.attachments[0];
        assert.equal(att.type, 'image'); assert.match(att.url, /^\/api\/gallery\/file\/chat1\//);
        await waitFor(async () => (await pg.$$('#handy_pictures .handy-pic')).length === 1, 'thumbnail on the panel');
        assert.equal(await G(() => window.handyAdaptive.cast.all().dana.look), 'auburn bob, green eyes, freckles, curvy, 30s', 'her look is kept on the cast');

        // spaced out: a request inside the gap is not drawn, and she's told why
        n = pics();
        await turn('Another. <handy act="handjob" her="Dana" img="on the bed"/>');
        assert.equal(pics(), n, 'gap respected');
        await turn('Hm. <handy act="handjob"/>');
        assert.match(lastEntry(), /possible in about \d+ s/);

        // ❤ locks her look; later pictures come FROM it, through the edit connection
        await openSettings();
        await pg.fill('#handy_img_gap', '0'); await pg.dispatchEvent('#handy_img_gap', 'change');
        await pg.selectOption('#handy_img_edit', 'img2');
        await pg.click('#handy-st-settings .handy-st-close');
        await pg.click('#handy_pictures .handy-pic [data-pic-rate="love"]');
        await waitFor(async () => (await pg.$$('#handy_pictures .rated-love')).length === 1, 'loved');
        await pg.locator('#handy_panel').screenshot({ path: path.join(root, 'tests', 'marinara_pictures.png') });
        await turn('Mm. <handy act="handjob"/>');
        assert.match(lastEntry(), /HE ❤ THE PICTURE of Dana/);
        assert.match(lastEntry(), /Dana \(look locked to a picture he ❤\), ❤1/);
        n = pics();
        await turn('More of her. <handy act="handjob" her="Dana" img="sitting on the edge of the bed, slipping the thong down"/>');
        await waitFor(() => pics() === n + 1, 'second picture');
        const second = state.pictures.at(-1);
        assert.equal(second.connectionId, 'img2', 'edit connection used for a woman he ❤');
        assert.equal(second.referenceImages?.length, 1); assert.match(second.referenceImages[0], /^data:image\/png;base64,/);
        assert.match(second.promptOverrides[0].prompt, /Keep the woman from the reference picture exactly the same/);
        assert.match(second.promptOverrides[0].prompt, /auburn bob/, 'her fixed look reused without being repeated');

        // Venice directly: the ❤ picture goes to Venice's own editing API (Marinara's Venice service sends none)
        await openSettings();
        assert.equal(await pg.isVisible('#handy_venice_box'), false, 'Venice fields hidden until chosen');
        await pg.selectOption('#handy_img_edit', 'venice');
        assert.equal(await pg.isVisible('#handy_venice_box'), true);
        await pg.click('#handy_venice_test');
        await waitFor(async () => /Failed: no Venice API key/.test(await pg.textContent('#handy_venice_status')), 'missing key reported');
        await pg.fill('#handy_venice_key', 'nope'); state.expectedVenice = 1;
        await pg.click('#handy_venice_test');
        await waitFor(async () => /Failed: Venice rejected the API key/.test(await pg.textContent('#handy_venice_status')), 'bad key reported');
        await pg.fill('#handy_venice_key', 'VKEY');
        await pg.click('#handy_venice_test');
        await waitFor(async () => /Works \(Venice \(qwen-edit-uncensored\)\)/.test(await pg.textContent('#handy_venice_status')), 'Venice test edit')
            .catch(async (e) => { throw new Error(e.message + ': ' + await pg.textContent('#handy_venice_status')); });
        assert.equal(state.venice.at(-1).body.aspect_ratio, '1:1');
        assert.equal(await pg.getAttribute('#handy_venice_key', 'type'), 'password', 'the key is masked');
        await pg.click('#handy-st-settings .handy-st-close');
        await waitFor(() => state.storage.settings?.veniceKey === 'VKEY' && state.storage.settings?.imageEditConnection === 'venice', 'Venice settings saved');
        n = pics(); let v = state.venice.length, u = state.uploads.length;
        await turn('Look. <handy act="handjob" her="Dana" img="kneeling on the bed, looking back over her shoulder"/>');
        await waitFor(() => state.venice.length === v + 1 && state.uploads.length === u + 1, 'Venice edit drawn and saved');
        assert.equal(pics(), n, 'Marinara is not asked for this one');
        const ve = state.venice.at(-1);
        assert.equal(ve.auth, 'Bearer VKEY');
        assert.equal(ve.body.modelId, 'qwen-edit-uncensored'); assert.equal(ve.body.safe_mode, false); assert.equal(ve.body.aspect_ratio, '2:3');
        assert.deepEqual(ve.body.images, [PNG], 'her ❤ picture is the base image, sent as plain base64');
        assert.match(ve.body.prompt, /Keep the woman from the reference picture exactly the same/);
        assert.match(ve.body.prompt, /Do not show: child, minor/, 'the negative prompt is folded in (multi-edit has none)');
        await waitFor(() => state.chats.chat1.at(-1).extra?.attachments?.length === 1, 'Venice picture attached to her message');
        // Venice failing: she still gets a picture, from the usual connection and her look alone
        state.veniceFail = 402; state.expectedVenice = 1; n = pics(); v = state.venice.length;
        await turn('<handy act="handjob" her="Dana" img="in the bath"/>');
        await waitFor(() => state.venice.length === v + 1 && pics() === n + 1, 'fallback picture');
        const fb = state.pictures.at(-1);
        assert.equal(fb.connectionId, 'img1'); assert.equal(fb.referenceImages, undefined);
        assert.doesNotMatch(fb.promptOverrides[0].prompt, /reference picture/, 'no talk of a reference it does not have');
        assert.match(fb.promptOverrides[0].prompt, /auburn bob/);
        await waitFor(async () => /Venice editing failed \(your Venice balance is empty/.test(await pg.textContent('#handy_pic_status')), 'fallback explained');
        state.veniceFail = 0;
        await openSettings(); await pg.selectOption('#handy_img_edit', 'img2'); await pg.click('#handy-st-settings .handy-st-close');

        // never real people
        n = pics();
        await turn('<handy act="handjob" her="Kate" look="looks just like my coworker" img="in the office"/>');
        assert.equal(pics(), n);
        await turn('Hm. <handy act="handjob"/>');
        assert.match(lastEntry(), /only of invented adult women/);

        // the model "shows" with the old picture-search tag and no device tag at all: still drawn, of the woman named
        n = pics();
        await turn('i\'m gonna describe her outfit for you. Claire is gonna wear some pretty pink lace today.\n<pics="princess pink lace cheeky panties ass thighs legs hair messy bun">');
        await waitFor(() => pics() === n + 1, 'picture from pics=');
        const fromPics = state.pictures.at(-1).promptOverrides?.[0]?.prompt || JSON.stringify(state.pictures.at(-1)).slice(0, 400);
        assert.match(fromPics, /Claire, an adult woman/); assert.match(fromPics, /pink lace cheeky panties ass/);
        assert.ok(await G(() => !!window.handyAdaptive.cast.all().claire), 'Claire joins the cast');
        await turn('Mm. <handy act="handjob"/>');
        assert.match(lastEntry(), /You used pics=/);
        assert.match(lastEntry(), /SEND HIM A PICTURE of her in it/);
        assert.match(lastEntry(), /Never write <pics=/);
        // never the character herself, by tag or by the pics= fallback
        n = pics();
        await turn('Look at me. <handy act="handjob" her="Vex" img="me in pink lace"/>');
        await turn('Mm. <handy act="handjob"/>');
        assert.match(lastEntry(), /never of you \(Vex\)/);
        await turn('Vex is wearing pink lace for you. <pics="pink lace panties">');
        assert.equal(pics(), n, 'a reply about herself draws nothing');
        // a failure is reported, not fatal
        state.imageFail = true; state.expected500 = 1; n = pics();
        await turn('<handy act="handjob" her="Dana" img="in the shower"/>');
        await waitFor(() => pics() === n + 1, 'failed attempt');
        await waitFor(async () => /picture failed/.test(await pg.textContent('#handy_pic_status')), 'failure shown');
        state.imageFail = false;

        // a new game session starts fresh, but a cast woman he ❤ comes back looking the same
        await pg.click('#handy_game_btn');
        await pg.selectOption('#handy_game_mode', 'cuckqueen'); await pg.click('#handy_game_btn');
        await waitFor(async () => (await pg.$$('#handy_pictures .handy-pic')).length === 0, 'session reset');
        n = pics();
        await turn('She is for you. <handy act="handjob" her="Dana" img="posing in lingerie for him"/>');
        await waitFor(() => pics() === n + 1, 'cuckqueen picture');
        assert.equal(state.pictures.at(-1).referenceImages?.length, 1, 'her ❤ picture carries over');
        assert.match(lastEntry(), /When you pick the other woman for him, SHOW her/);
        // turned off: no instructions, no pictures
        await openSettings(); await pg.uncheck('#handy_img_on'); await pg.click('#handy-st-settings .handy-st-close');
        n = pics();
        await turn('<handy act="handjob" her="Dana" img="again"/>');
        assert.equal(pics(), n); assert.doesNotMatch(lastEntry(), /PICTURES:/);
        await pg.click('#handy_game_btn');
        await openSettings(); await pg.check('#handy_img_on');   // the next step expects the settings window open

        // the opt-in PornPics bridge (PR #13) still runs next to the drawn pictures, with the full search filter
        state.expectBridgeDown = true;
        await pg.check('#handy-st-auto-images');
        n = pics();
        const bridgeQueries = [];
        pg.on('request', (r) => { if (r.url().startsWith('http://127.0.0.1:38765/image')) bridgeQueries.push(new URL(r.url()).searchParams.get('q')); });
        await pg.evaluate(() => { const d = document.createElement('div'); d.dataset.messageId = 'bridge-msg'; d.style.cssText = 'width:400px;height:40px'; d.textContent = 'her message'; document.getElementById('app').append(d); });
        state.next = { mode: 'new', content: 'Look at this. <pics="sleeping drunk redhead in stockings"/>' };
        await pg.evaluate(() => window.sendTurn({ chatId: 'chat1', userMessage: 'show me' }));
        await waitFor(() => bridgeQueries.length === 1, 'bridge asked', 4000);
        assert.equal(bridgeQueries[0], 'redhead in stockings', 'minor and non-consent words removed before searching');
        await waitFor(async () => /Could not retrieve image/.test(await pg.textContent('figure[data-handy-image-poc]').catch(() => '')), 'bridge failure shown');
        assert.equal(pics(), n, 'a PornPics search never goes to the image model');
        await pg.uncheck('#handy-st-auto-images');
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
