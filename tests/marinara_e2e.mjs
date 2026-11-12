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
</head><body><div id="app">chat</div><script>
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
        state.handy.push({ method: m, path: p.slice('/handy/v2'.length), body, key: req.headers['x-connection-key'] });
        if (p.endsWith('/connected')) return json(200, { connected: true });
        if (p.endsWith('/servertime')) return json(200, { serverTime: Date.now() });
        return json(200, { result: 0 });
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
    await step('settings open in a window; Test connection works; ST-only options are hidden', async () => {
        await pg.click('#handy_settings_btn');
        assert.ok(await pg.isVisible('#handy-st-settings #handy_key'));
        assert.equal(await pg.isVisible('#handy_auto'), false);
        assert.equal(await pg.isVisible('#handy_style_profile'), false);
        await pg.click('#handy_test');
        await waitFor(async () => /connected/.test(await pg.textContent('#handy_status')), 'connected');
        assert.match(await pg.textContent('#handy-st-ai'), /active/);
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
