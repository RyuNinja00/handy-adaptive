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
export async function boot({ repo = ROOT, rtt = 150, jitter = 0.25, devMax = 1e9, seed = 1, settings = {}, minTimer = 0, startPos = 50, fw = '3.2.3', quirk = null, reportsPosition = true } = {}) {
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
    const dev = { fw, quirk, mode: 0, seg: null, restPos: startPos, hamp: false, cmds: [], traj: [], calls: [], slides: [], scripts: {}, hssp: null, hsspEvents: [], uploads: 0 };
    const hsspPos = (t) => {
        const h = dev.hssp; if (!h || !h.playing) return null;
        const st = t - h.playAt + h.startTime, A = h.actions;
        if (st <= A[0].at) return A[0].pos;
        for (let i = 1; i < A.length; i++) if (A[i].at >= st) return A[i - 1].pos + (A[i].pos - A[i - 1].pos) * ((st - A[i - 1].at) / Math.max(1, A[i].at - A[i - 1].at));
        return A[A.length - 1].pos;
    };
    // API v3 HSP: a point buffer played against a stream clock. With pause_on_starving the clock freezes
    // at the last point and resumes when points arrive (as the v3 documentation describes).
    dev.hsp = null; dev.hspAdds = [];
    const hspClock = (t) => {
        const h = dev.hsp; if (!h || !h.playing) return null;
        let st = h.base + (t - h.anchor);
        const last = h.points.length ? h.points[h.points.length - 1].t : -Infinity;
        if (h.pauseOnStarving && st > last) st = last;
        return st;
    };
    const hspPos = (t) => {
        const st = hspClock(t); if (st === null) return null;
        const P = dev.hsp.points, h = dev.hsp;
        if (!P.length) return h.pos0;
        if (st <= P[0].t) {   // before the first point: ease from where it was toward it
            const span = Math.max(1, P[0].t - h.st0);
            return h.pos0 + (P[0].x - h.pos0) * clampN((st - h.st0) / span, 0, 1);
        }
        for (let i = 1; i < P.length; i++) if (P[i].t >= st) return P[i - 1].x + (P[i].x - P[i - 1].x) * ((st - P[i - 1].t) / Math.max(1, P[i].t - P[i - 1].t));
        return P[P.length - 1].x;
    };
    const clampN = (v, a, b) => Math.max(a, Math.min(b, v));
    const hspState = (t = vnow) => {
        const h = dev.hsp, st = hspClock(t), P = h?.points || [];
        const starving = h?.playing && P.length && h.base + (t - h.anchor) > P[P.length - 1].t;
        return { play_state: !h ? 0 : !h.playing ? 2 : starving ? 4 : 1, current_time: st ?? 0, points: P.length, max_points: 400, stream_id: h?.streamId ?? 0 };
    };
    const devPos = (t = vnow) => {
        const sp = hspPos(t); if (sp !== null) return sp;
        const hp = hsspPos(t); if (hp !== null) return hp;
        const s = dev.seg; if (!s) return dev.restPos;
        if (t >= s.t1) return s.p1;
        return s.p0 + (s.p1 - s.p0) * ((t - s.t0) / (s.t1 - s.t0));
    };
    const halt = () => { dev.restPos = devPos(); dev.seg = null; if (dev.hssp) dev.hssp.playing = false; if (dev.hsp) dev.hsp.playing = false; dev.traj.push({ t: vnow, p: dev.restPos, halt: true }); };
    function handle3(method, path, body, headers) {
        dev.calls.push({ t: vnow, method, path, body, v3: true });
        if (path === '/servertime') return { server_time: vnow };
        if (!headers['X-Api-Key']) return { error: { message: 'Unauthorized' }, status: 401 };
        if (path === '/connected') return { result: { connected: true } };
        if (path === '/mode2') { if (body.mode !== dev.mode) halt(); dev.mode = body.mode; return { result: { mode: dev.mode } }; }
        if (path === '/slider/stroke') { dev.stroke = body; return { result: body }; }
        if (path === '/slider/state') return { result: { position: devPos() } };
        if (path === '/hdsp/xpt') {
            if (dev.mode !== 2) { dev.cmds.push({ t: vnow, rejected: true, body }); return { error: { message: 'device not in HDSP mode' } }; }
            return handle('PUT', '/hdsp/xpt', { position: body.xp * 100, duration: body.t, viaV3: true });
        }
        if (path === '/hsp/setup') { halt(); dev.mode = 4; dev.hsp = { streamId: body.stream_id, points: [], playing: false, pauseOnStarving: false, base: 0, anchor: vnow, pos0: devPos(), st0: 0 }; return { result: hspState() }; }
        if (path === '/hsp/add') {
            const h = dev.hsp; if (!h || dev.mode !== 4) return { error: { message: 'HSP not set up' } };
            if (!Array.isArray(body.points) || body.points.length > 100 || body.points.some((p) => !Number.isInteger(p.t) || !Number.isInteger(p.x) || p.x < 0 || p.x > 100)) return { error: { message: 'bad points' } };
            if (h.playing) {   // starved: freeze the clock at the last point, then carry on from there
                const st = hspClock(vnow); h.base = st; h.anchor = vnow;
                if (body.flush) { h.pos0 = devPos(); h.st0 = st; }
            }
            const before = devPos();
            if (body.flush) h.points = [];
            h.points.push(...body.points.map((p) => ({ t: p.t, x: p.x })));
            h.points.sort((a, b) => a.t - b.t);
            dev.hspAdds.push({ t: vnow, flush: !!body.flush, n: body.points.length, tail: body.tail_point_stream_index, jump: Math.abs(devPos() - before), first: body.points[0].t, last: body.points[body.points.length - 1].t, clock: hspClock(vnow) });
            return { result: hspState() };
        }
        if (path === '/hsp/play') {
            const h = dev.hsp; if (!h) return { error: { message: 'HSP not set up' } };
            h.pos0 = devPos(); h.playing = true; h.pauseOnStarving = !!body.pause_on_starving;
            h.base = body.start_time + (vnow - body.server_time); h.anchor = vnow; h.st0 = h.base;
            return { result: hspState() };
        }
        if (path === '/hsp/resume') return { result: hspState() };
        if (path === '/hsp/stop') { halt(); return { result: hspState() }; }
        if (path === '/hsp/state') return { result: hspState() };
        return { error: { message: 'unknown v3 ' + path } };
    }
    function handle(method, path, body) {
        dev.calls.push({ t: vnow, method, path, body });
        if (path === '/connected') return { connected: true };
        if (path === '/info') return { fwVersion: dev.fw, model: 'H01' };
        if (path === '/slider/state') return reportsPosition ? { position: devPos(), positionAbsolute: devPos() * 1.1 } : { error: { message: 'unknown /slider/state' } };
        if (path === '/servertime') return { serverTime: vnow };
        if (path === '/mode') { if (body.mode !== dev.mode) halt(); dev.mode = body.mode; dev.hamp = false; return { result: 0 }; }
        if (path === '/hamp/start') { dev.hamp = true; return { result: 0 }; }
        if (path === '/hamp/stop') { dev.hamp = false; halt(); return { result: 0 }; }
        if (path === '/hamp/velocity') { dev.velocity = body.velocity; return { result: 0 }; }
        if (path === '/slide') { dev.slides.push({ t: vnow, ...body }); return { result: 0 }; }
        if (path === '/hdsp/xpt') {
            if (dev.mode !== 2) { dev.cmds.push({ t: vnow, rejected: true, body }); return { error: { message: 'device not in HDSP mode' } }; }
            if (!Number.isFinite(body.position) || !Number.isFinite(body.duration)) { dev.cmds.push({ t: vnow, rejected: true, body }); return { error: { message: 'bad xpt payload' } }; }
            // quirks of a misbehaving device: moves the opposite way, or pins to the top whatever it's told
            const goal = dev.quirk === 'reversed' ? 100 - body.position : dev.quirk === 'stuck' && !body.viaV3 ? 100 : dev.quirk === 'fraction' && !body.viaV3 ? Math.min(1, Math.max(0, body.position)) * 100 : body.position;   // "stuck" models firmware 4 misreading API v2 positions
            const p0 = devPos(), dist = Math.abs(goal - p0);
            const dur = Math.max(body.duration, (dist / devMax) * 1000, 1);
            dev.seg = { p0, p1: goal, t0: vnow, t1: vnow + dur };
            dev.cmds.push({ t: vnow, p0, p1: goal, sent: body.position, duration: body.duration, v: (dist / Math.max(1, body.duration)) * 1000 });
            dev.traj.push({ t: vnow, p: p0 }, { t: vnow + dur, p: goal, end: true });
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
    globalThis.fetch = (url, opts = {}) => new Promise((resolve, reject) => {
        if (String(url).includes('upload')) {
            opts.body.get('file').text().then((txt) => {
                const u = 'sim://script/' + (++dev.uploads); dev.scripts[u] = JSON.parse(txt).actions;
                net(() => resolve({ ok: true, json: async () => ({ url: u }) }), lat() * 2 + 300);
            });
            return;
        }
        const v3 = String(url).includes('/handy-rest/v3');
        const path = v3 ? String(url).split('/handy-rest/v3')[1] : String(url).split('/v2')[1];
        const body = opts.body ? JSON.parse(opts.body) : undefined;
        net(() => {
            if (v3 && dev.offline3) return net(() => reject(new TypeError('Failed to fetch')), 0);
            const out = v3 ? handle3(opts.method, path, body, opts.headers || {}) : handle(opts.method, path, body);
            net(() => resolve({ ok: !out.error, status: out.error ? (out.status || 400) : 200, json: async () => out }), lat());
        }, lat());
    });

    // ---- SillyTavern + jQuery stubs
    const handlers = {};
    const st = {
        extensionSettings: { handy_adaptive: undefined }, chat: [], prompts: [],
        saveSettingsDebounced() {}, setExtensionPrompt(_m, text) { st.prompts.push(text); },
        eventSource: { on(ev, fn) { handlers[ev] = fn; } },
        eventTypes: { MESSAGE_RECEIVED: 'message_received', MESSAGE_SENT: 'message_sent', CHAT_CHANGED: 'chat_changed', GROUP_MEMBER_DRAFTED: 'group_member_drafted' },
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
    Object.assign(st.extensionSettings.handy_adaptive, { connectionKey: 'KEY', sessionCheck: false, ...settings });   // the start-of-session question has its own checks
    return { H, st, dev, devPos, hspState, advance, flush, now: () => vnow, toasts, errors, handlers, timers: () => timers, mod,
        message(text, extra = {}) { st.chat.push({ mes: text, is_user: false, ...extra }); return handlers.message_received(st.chat.length - 1); },
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
