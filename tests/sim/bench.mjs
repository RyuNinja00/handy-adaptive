// Test bench: runs the real index.js against a simulated Handy, with no browser and no device.
//  - a virtual clock (timers and Date.now), so a minute of motion runs in a moment and is repeatable
//  - stubs for the bits of SillyTavern and jQuery the extension touches
//  - a fake Handy cloud API (REST v2) with adjustable network latency and jitter, which records every
//    command and can say where the device is at any instant
// Usage: const h = await boot({ rtt, jitter, seed, settings });  h.H is window.handyAdaptive.
const realImmediate = setImmediate;
let bootN = 0; const realWarn = console.warn; export const warns = [];
console.warn = (...a) => { warns.push(a.map(String).join(' ').split('\n')[0]); };
const flush = () => new Promise((r) => realImmediate(r));

const ROOT = new URL('../../', import.meta.url).href.replace(/\/$/, '');
export async function boot({ repo = ROOT, rtt = 150, jitter = 0.25, devMax = 1e9, seed = 1, settings = {}, minTimer = 0, startPos = 50 } = {}) {
    // ---- deterministic randomness
    let a = seed >>> 0;
    Math.random = () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
    let r2 = (seed * 7919 + 13) >>> 0;
    const netRand = () => { r2 = (Math.imul(r2, 1664525) + 1013904223) >>> 0; return r2 / 4294967296; };

    // ---- virtual clock
    let vnow = 1_700_000_000_000; const t0 = vnow;
    let timers = [], seq = 0;
    // minTimer imitates a browser tab in the background, where timers fire about once a second at best
    const net = (fn, d) => { timers.push({ id: ++seq, at: vnow + Math.max(0, d), fn }); };   // the network is not throttled
    globalThis.setTimeout = (fn, d = 0, ...args) => { const id = ++seq; timers.push({ id, at: vnow + Math.max(minTimer, +d || 0), fn: () => fn(...args), delay: +d || 0 }); return id; };
    globalThis.setInterval = (fn, d = 0, ...args) => { const id = ++seq, every = Math.max(1, minTimer, +d || 0); timers.push({ id, at: vnow + every, fn: () => fn(...args), repeat: every, every: +d || 0, delay: +d || 0 }); return id; };
    globalThis.clearTimeout = globalThis.clearInterval = (id) => { timers = timers.filter((t) => t.id !== id); };
    Date.now = () => vnow;
    globalThis.performance = { now: () => vnow - t0 };
    async function advance(ms) {
        const end = vnow + ms;
        for (;;) {
            await flush();   // let queued promise work schedule its timers before looking for the next one
            let best = null;
            for (const t of timers) if (t.at <= end && (!best || t.at < best.at || (t.at === best.at && t.id < best.id))) best = t;
            if (!best) break;
            vnow = Math.max(vnow, best.at);
            if (best.repeat) best.at += best.repeat; else timers = timers.filter((t) => t !== best);
            try { best.fn(); } catch (e) { errors.push(String(e?.stack || e)); }
            await flush();
        }
        vnow = end; await flush();
    }

    // ---- simulated device
    const errors = [], toasts = [];
    const dev = { mode: 0, seg: null, restPos: startPos, hamp: false, cmds: [], traj: [], calls: [], slides: [], scripts: {}, hssp: null, hsspEvents: [], uploads: 0 };
    const hsspPos = (t) => {
        const h = dev.hssp; if (!h || !h.playing) return null;
        const st = t - h.playAt + h.startTime, A = h.actions;
        if (st <= A[0].at) return A[0].pos;
        for (let i = 1; i < A.length; i++) if (A[i].at >= st) return A[i - 1].pos + (A[i].pos - A[i - 1].pos) * ((st - A[i - 1].at) / Math.max(1, A[i].at - A[i - 1].at));
        return A[A.length - 1].pos;
    };
    const devPos = (t = vnow) => {
        const hp = hsspPos(t); if (hp !== null) return hp;
        const s = dev.seg; if (!s) return dev.restPos;
        if (t >= s.t1) return s.p1;
        return s.p0 + (s.p1 - s.p0) * ((t - s.t0) / (s.t1 - s.t0));
    };
    const halt = () => { dev.restPos = devPos(); dev.seg = null; if (dev.hssp) dev.hssp.playing = false; dev.traj.push({ t: vnow, p: dev.restPos, halt: true }); };
    function handle(method, path, body) {
        dev.calls.push({ t: vnow, method, path, body });
        if (path === '/connected') return { connected: true };
        if (path === '/servertime') return { serverTime: vnow };
        if (path === '/mode') { if (body.mode !== dev.mode) halt(); dev.mode = body.mode; dev.hamp = false; return { result: 0 }; }
        if (path === '/hamp/start') { dev.hamp = true; return { result: 0 }; }
        if (path === '/hamp/stop') { dev.hamp = false; halt(); return { result: 0 }; }
        if (path === '/hamp/velocity') { dev.velocity = body.velocity; return { result: 0 }; }
        if (path === '/slide') { dev.slides.push({ t: vnow, ...body }); return { result: 0 }; }
        if (path === '/hdsp/xpt') {
            if (dev.mode !== 2) { dev.cmds.push({ t: vnow, rejected: true, body }); return { error: { message: 'device not in HDSP mode' } }; }
            if (!Number.isFinite(body.position) || !Number.isFinite(body.duration)) { dev.cmds.push({ t: vnow, rejected: true, body }); return { error: { message: 'bad xpt payload' } }; }
            const p0 = devPos(), dist = Math.abs(body.position - p0);
            const dur = Math.max(body.duration, (dist / devMax) * 1000, 1);
            dev.seg = { p0, p1: body.position, t0: vnow, t1: vnow + dur };
            dev.cmds.push({ t: vnow, p0, p1: body.position, duration: body.duration, v: (dist / Math.max(1, body.duration)) * 1000 });
            dev.traj.push({ t: vnow, p: p0 }, { t: vnow + dur, p: body.position, end: true });
            return { result: 0 };
        }
        if (path === '/hssp/setup') { halt(); dev.hssp = { actions: dev.scripts[body.url], playing: false }; dev.hsspEvents.push({ t: vnow, type: 'setup' }); return { result: 0 }; }
        if (path === '/hssp/play') {
            const before = devPos();
            dev.hssp.playing = true; dev.hssp.playAt = vnow; dev.hssp.startTime = body.startTime || 0;
            dev.hsspEvents.push({ t: vnow, type: 'play', devWas: before, scriptStarts: dev.hssp.actions[0].pos, jump: Math.abs(before - dev.hssp.actions[0].pos) });
            return { result: 0 };
        }
        if (path === '/hssp/stop') { halt(); return { result: 0 }; }
        return { error: { message: 'unknown ' + path } };
    }
    const lat = () => (rtt / 2) * (1 + jitter * (2 * netRand() - 1));
    globalThis.fetch = (url, opts = {}) => new Promise((resolve) => {
        if (String(url).includes('upload')) {
            opts.body.get('file').text().then((txt) => {
                const u = 'sim://script/' + (++dev.uploads); dev.scripts[u] = JSON.parse(txt).actions;
                net(() => resolve({ ok: true, json: async () => ({ url: u }) }), lat() * 2 + 300);
            });
            return;
        }
        const path = String(url).split('/v2')[1];
        const body = opts.body ? JSON.parse(opts.body) : undefined;
        net(() => {
            const out = handle(opts.method, path, body);
            net(() => resolve({ ok: !out.error, status: out.error ? 400 : 200, json: async () => out }), lat());
        }, lat());
    });

    // ---- SillyTavern + jQuery stubs
    const handlers = {};
    const st = {
        extensionSettings: { handy_adaptive: undefined }, chat: [], prompts: [],
        saveSettingsDebounced() {}, setExtensionPrompt(_m, text) { st.prompts.push(text); },
        eventSource: { on(ev, fn) { handlers[ev] = fn; } },
        eventTypes: { MESSAGE_RECEIVED: 'message_received', MESSAGE_SENT: 'message_sent', CHAT_CHANGED: 'chat_changed' },
        replies: 0,
        executeSlashCommandsWithOptions: async () => { st.replies++; },
    };
    globalThis.SillyTavern = { getContext: () => st };
    const mk = () => { let text = ''; const o = new Proxy(function () {}, { get(_t, k) {
        if (k === 'text' || k === 'html') return (v) => (v === undefined ? text : (text = String(v), o));
        if (k === 'val') return (v) => (v === undefined ? '' : o);
        if (k === Symbol.toPrimitive) return () => text;
        if (k === 'then') return undefined;
        return () => o;
    } }); return o; };
    globalThis.$ = globalThis.jQuery = (x) => { if (typeof x === 'function') { x(); return mk(); } return mk(); };
    globalThis.window = { toastr: Object.fromEntries(['info', 'error', 'warning', 'success'].map((k) => [k, (m) => toasts.push({ t: vnow, k, m })])), addEventListener() {} };
    globalThis.document = { addEventListener() {}, createElement: () => ({ click() {} }) };
    globalThis.confirm = () => true; globalThis.prompt = () => 'fav';

    const mod = await import(`${repo}/index.js?boot=${++bootN}`);
    const H = globalThis.window.handyAdaptive;
    Object.assign(st.extensionSettings.handy_adaptive, { connectionKey: 'KEY', ...settings });
    return { H, st, dev, devPos, advance, flush, now: () => vnow, toasts, errors, handlers, timers: () => timers, mod,
        message(text) { st.chat.push({ mes: text, is_user: false }); return handlers.message_received(st.chat.length - 1); },
        say(text) { st.chat.push({ mes: text, is_user: true }); return handlers.message_sent?.(st.chat.length - 1); } };
}

// position samples of the simulated device between two times
export function sample(h, from, to, step = 5) {
    const pts = h.dev.traj.slice().sort((a, b) => a.t - b.t); const out = [];
    // rebuild piecewise-linear path from command log (authoritative)
    const cmds = h.dev.cmds.filter((c) => !c.rejected);
    for (let t = from; t <= to; t += step) {
        let c = null; for (const k of cmds) { if (k.t <= t) c = k; else break; }
        if (!c) { out.push(null); continue; }
        const dur = Math.max(c.duration, 1);
        out.push(t >= c.t + dur ? c.p1 : c.p0 + (c.p1 - c.p0) * ((t - c.t) / dur));
    }
    return out;
}
export const pct = (arr, p) => { const s = arr.slice().sort((a, b) => a - b); return s.length ? s[Math.min(s.length - 1, Math.floor(p * s.length))] : NaN; };
