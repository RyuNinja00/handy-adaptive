// Handy Adaptive — SillyTavern extension (v0.7.3)
//
// The AI describes WHAT is happening (<handy act="blowjob" intensity="0.6"/>),
// and the motion synthesizer improvises HOW the device moves, using a motion
// library learned from your hand-scripted videos plus your personal taste,
// which is learned from live feedback. A simpler HAMP pattern mode remains as
// a fallback (<handy pattern="wave" .../>).

import { synthesize, resolveAct, targetFor, posAt, exploration, reinforce, REWARD, STARTER_LIBRARY } from './synth.js';
import { TRAITS, seedStyle, effect as styleEffect, describe as describeStyle, EMPTY_LEARNED, textHash, aiPrompt, parseAi } from './charstyle.js';

const MODULE = 'handy_adaptive';
const ctx = () => SillyTavern.getContext();

// ---------------------------------------------------------------- settings
const DEFAULTS = {
    enabled: true,
    connectionKey: '',
    apiBase: 'https://www.handyfeeling.com/api/handy/v2',
    transport: 'hdsp',          // 'hdsp' = stream each stroke | 'hssp' = upload script chunks | 'hsp' = buffered streaming (API v3, firmware 4)
    appId: '',                  // Handy API v3 Application ID (buffered streaming only)
    apiV3Base: 'https://www.handyfeeling.com/api/handy-rest/v3',
    calibration: null,          // { base, tip }: device positions (0-100) of your base and your tip
    uploadUrl: 'https://scripts01.handyfeeling.com/api/script/v0/temp/upload',
    minSpeed: 5,
    maxSpeed: 80,               // % cap. Pattern mode: HAMP velocity. Act mode: scales max travel speed.
    strokeFloor: 0,
    strokeCeil: 100,
    tickMs: 700,
    idleStopSec: 600,
    escStops: true,
    injectProfile: true,
    autoReplyOnFeedback: false,
    closeAction: 'pullback',    // "I'm close": 'pullback' = ease off at once, then the AI reacts | 'ai' = leave it to the AI's next reply
    finishAction: 'winddown',   // "Finished": 'winddown' = very gentle for 20 s, then stop | 'stop' = stop at once | 'ai' = leave it to the AI
    sessionCheck: true,         // before the first motion of each session, ask whether the setup (and calibration) is the same
    detectClimax: true,         // notice "I'm close" / "I'm cumming" in your own messages
    safeword: '',               // a word that stops the device whenever it appears in your message
    showPanel: true,
    proseCues: true,            // a reply with no tag still adjusts the motion from what it describes (faster, deeper, pauses…)
    ornaments: true,            // small mouth-and-hand touches between phrases: flutters at the tip, slow drags, deep pulses
    setups: [],                 // saved calibrations: [{ name, base, tip, at }] (lying down, sitting, a mount…)
    setupName: null,            // the saved setup in use, if any
    readWpm: 220,               // several tags in one reply play in order at this reading speed (words/min); 0 = all at once
    arousalMeter: true,         // keep a running arousal estimate and tell the AI
    styleProfile: 'Background', // connection profile that reads character cards for their style ('' = keywords only)
    charStyles: true,           // each character moves the Handy their own way (read from the card, refined by feedback)
    characters: {},             // character key (avatar) -> their style and history with you
    library: null,              // imported motion_library.json (null = starter profiles)
    profile: null,
};
const EMPTY_PROFILE = () => ({
    patterns: {}, speed: { sum: 0, w: 0, sq: 0 }, strokeMin: { sum: 0, w: 0 }, strokeMax: { sum: 0, w: 0 },
    acts: {},       // act -> { rateMul, ampMul, centerShift, variation, score, n, loves, keptSec }
    motifs: {},     // motif id -> score
    trans: {},      // "motifA>motifB" -> score (which phrases you like following which)
    exploreBias: 1, // "try new things": 0 = only what you've liked, 2 = experiment a lot
    favorites: [], log: [], sessions: 0,
    motifStats: {}, // motif id -> { love, nope }
    banned: {},     // motif ids you have firmly rejected
    finishers: {},  // motif id -> how often it was playing when you finished
    arousalK: null, // learned pace: how fast you build (1 / seconds to the edge at full intensity)
});

function S() {
    const es = ctx().extensionSettings;
    if (!es[MODULE]) es[MODULE] = structuredClone(DEFAULTS);
    for (const k of Object.keys(DEFAULTS)) if (es[MODULE][k] === undefined) es[MODULE][k] = structuredClone(DEFAULTS[k]);
    if (!es[MODULE].profile) es[MODULE].profile = EMPTY_PROFILE();
    const pr = es[MODULE].profile, ep = EMPTY_PROFILE();
    for (const k of Object.keys(ep)) if (pr[k] === undefined) pr[k] = ep[k];
    return es[MODULE];
}
const LIB = () => S().library || STARTER_LIBRARY;
const save = () => ctx().saveSettingsDebounced();
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
// Today's date where you are (not UTC: an evening session must not be filed under tomorrow).
const today = (t = Date.now()) => { const d = new Date(t); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
const esc = (t) => $('<div>').text(String(t)).html();
const maxPct = () => clamp(Number.isFinite(+S().maxSpeed) ? +S().maxSpeed : 80, 5, 100);   // a typed 250 is still 100 %
const maxVel = () => 60 + (maxPct() / 100) * 540;   // %/s: 80% cap ≈ 490 %/s

// Models write numbers loosely (“0.6”, 70%, 7/10, "high"). Read what can be read; anything else is
// ignored, so one sloppy tag can never leave the engine holding a NaN.
function num(v) {
    if (typeof v === 'number') return Number.isFinite(v) ? v : undefined;
    if (typeof v !== 'string') return undefined;
    const m = /(-?\d*\.?\d+)\s*(%|\/\s*(\d+))?/.exec(v.replace(/(\d),(\d)/, '$1.$2'));
    if (!m) return undefined;
    let x = parseFloat(m[1]);
    if (m[2] === '%') x /= 100; else if (m[3]) x /= +m[3] || 1;
    return Number.isFinite(x) ? x : undefined;
}
// 0-1 scales: a value above 1 is a model using a 0-10 or 0-100 scale, not a request for maximum.
const unit01 = (v) => { let x = num(v); if (x === undefined) return undefined; if (x > 1) x = x <= 10 ? x / 10 : x / 100; return clamp(x, 0, 1); };
const signed1 = (v) => { const x = num(v); return x === undefined ? undefined : clamp(x, -1, 1); };

// ---------------------------------------------------------------- command sequencing
// Device commands take several network round trips. Two rules keep them from tangling:
//  - everything that starts or changes motion runs one at a time, in the order it was issued (enqueue);
//  - STOP never waits in that line: it goes out immediately, and bumping `epoch` makes any start that
//    is still in progress, or still waiting its turn, abandon itself.
let epoch = 0;
let sessionChecked = false;   // the setup has been confirmed (or calibrated) since SillyTavern loaded
let chain = Promise.resolve();
function enqueue(fn) {
    const my = epoch;
    const p = chain.then(() => (my === epoch ? fn() : undefined));
    chain = p.catch((e) => console.warn('[Handy]', e));
    return p;
}

// ---------------------------------------------------------------- device API (Handy REST v2)
const api = {
    busy: false,
    offset: 0, offsetAt: 0,
    rtt: 150,
    async call(method, path, body, keepalive = false) {
        const s = S();
        if (!s.connectionKey) throw new Error('No connection key set');
        const t0 = performance.now();
        const res = await fetch(s.apiBase.replace(/\/$/, '') + path, {
            method, keepalive,
            signal: AbortSignal.timeout?.(8000),   // a request that never returns must not hold the stream up forever
            headers: { 'X-Connection-Key': s.connectionKey, 'Content-Type': 'application/json', Accept: 'application/json' },
            body: body ? JSON.stringify(body) : undefined,
        });
        api.rtt = api.rtt * 0.8 + (performance.now() - t0) * 0.2;
        let json = {};
        try { json = await res.json(); } catch { /* empty */ }
        if (!res.ok || json.error) throw new Error(json?.error?.message || `HTTP ${res.status}`);
        return json;
    },
    connected: () => api.call('GET', '/connected'),
    mode: (m) => api.call('PUT', '/mode', { mode: m }),             // 0 HAMP, 1 HSSP, 2 HDSP
    // HAMP
    async hampStart() { await api.mode(0); await api.call('PUT', '/hamp/start'); },
    hampStop: (k = false) => api.call('PUT', '/hamp/stop', undefined, k),
    velocity: (v) => api.call('PUT', '/hamp/velocity', { velocity: Math.round(v) }),
    slide: (min, max) => api.call('PUT', '/slide', { min: Math.round(min), max: Math.round(max) }),
    // HDSP
    xpt: (position, duration) => api.call('PUT', '/hdsp/xpt', { position: Math.round(position), duration: Math.round(duration), stopOnTarget: true }),
    // HSSP
    async syncTime() {
        if (Date.now() - api.offsetAt < 10 * 60000) return;
        const samples = [];
        for (let i = 0; i < 6; i++) {
            const t0 = Date.now(); const r = await api.call('GET', '/servertime'); const t1 = Date.now();
            samples.push(r.serverTime + (t1 - t0) / 2 - t1);
        }
        samples.sort((a, b) => a - b);
        api.offset = samples[Math.floor(samples.length / 2)]; api.offsetAt = Date.now();
    },
    async upload(actions) {
        const fd = new FormData();
        fd.append('file', new Blob([JSON.stringify({ version: '1.0', inverted: false, range: 100, actions })], { type: 'application/json' }), 'synth.funscript');
        const r = await fetch(S().uploadUrl, { method: 'POST', body: fd });
        const j = await r.json().catch(() => ({}));
        if (!j.url) throw new Error('script upload failed');
        return j.url;
    },
    hsspSetup: async (url) => { await api.mode(1); return api.call('PUT', '/hssp/setup', { url }); },
    hsspPlay: (startTime = 0) => api.call('PUT', '/hssp/play', { estimatedServerTime: Date.now() + api.offset, startTime }),
    hsspStop: (k = false) => api.call('PUT', '/hssp/stop', undefined, k),
};

// ---------------------------------------------------------------- calibration
// The engine thinks in body positions: 0 = your base, 100 = your tip. Calibration records which device
// positions those are for you, and everything sent to the Handy is mapped through it, so "at the tip"
// really is at your tip. Without a calibration the two scales are the same.
function cal() {
    const c = S().calibration;
    return c && Number.isFinite(+c.base) && Number.isFinite(+c.tip) && Math.abs(c.tip - c.base) >= 10 ? c : null;
}
const span = () => { const c = cal(); return c ? Math.abs(c.tip - c.base) / 100 : 1; };
const toDev = (p) => { const c = cal(); const x = clamp(+p || 0, 0, 100); return c ? c.base + (x / 100) * (c.tip - c.base) : x; };
// The speed cap is a physical limit on the device; in body units it is wider when your range is shorter.
const capBody = () => maxVel() / span();
// Your stroke limits, whichever way round they were typed, within 0-100.
const strokeRange = () => { const s = S(), a = clamp(+s.strokeFloor || 0, 0, 100), b = clamp(Number.isFinite(+s.strokeCeil) && s.strokeCeil !== '' ? +s.strokeCeil : 100, 0, 100); return [Math.min(a, b), Math.max(a, b)]; };

// ---------------------------------------------------------------- device API v3 (firmware 4): buffered streaming
// HSP keeps a few seconds of timed points on the device itself, so motion stays smooth whatever the
// network or the browser tab is doing. Requests carry an Application ID from Handy's developer portal.
const api3 = {
    offset: 0, offsetAt: 0,
    base: () => String(S().apiV3Base || 'https://www.handyfeeling.com/api/handy-rest/v3').replace(/\/$/, ''),
    async call(method, path, body, keepalive = false) {
        const s = S();
        if (!s.connectionKey) throw new Error('No connection key set');
        if (!s.appId) throw new Error('No API v3 Application ID set');
        const t0 = performance.now();
        const res = await fetch(api3.base() + path, {
            method, keepalive,
            signal: AbortSignal.timeout?.(8000),
            headers: { 'X-Connection-Key': s.connectionKey, 'X-Api-Key': s.appId, 'Content-Type': 'application/json', Accept: 'application/json' },
            body: body ? JSON.stringify(body) : undefined,
        });
        api.rtt = api.rtt * 0.8 + (performance.now() - t0) * 0.2;
        let json = {};
        try { json = await res.json(); } catch { /* empty */ }
        if (!res.ok || json.error) throw new Error(json?.error?.message || json?.message || `HTTP ${res.status}`);
        return json.result ?? json;
    },
    async syncTime() {
        if (Date.now() - api3.offsetAt < 5 * 60000) return;
        const samples = [];
        for (let i = 0; i < 5; i++) {
            const t0 = Date.now(); const r = await api3.call('GET', '/servertime'); const t1 = Date.now();
            const st = num(r.server_time ?? r.serverTime); if (st === undefined) throw new Error('bad server time');
            samples.push(st + (t1 - t0) / 2 - t1);
        }
        samples.sort((a, b) => a - b);
        api3.offset = samples[Math.floor(samples.length / 2)]; api3.offsetAt = Date.now();
    },
    connected: () => api3.call('GET', '/connected'),
    async mode(m) { try { return await api3.call('PUT', '/mode2', { mode: m }); } catch { return api3.call('PUT', '/mode', { mode: m }); } },
    xpt: (pos, ms) => api3.call('PUT', '/hdsp/xpt', { xp: Math.round(clamp(pos, 0, 100) * 100) / 10000, t: Math.round(ms), stop_on_target: true, immediate_rsp: false }),
    stroke: (min, max) => api3.call('PUT', '/slider/stroke', { min, max }),
    setup: (id) => api3.call('PUT', '/hsp/setup', { stream_id: id }),
    add: (points, tail, flush) => api3.call('PUT', '/hsp/add', { points, tail_point_stream_index: Math.max(1, tail), flush }),
    play: (start) => api3.call('PUT', '/hsp/play', { start_time: Math.round(start), server_time: Math.round(Date.now() + api3.offset), playback_rate: 1, loop: false, pause_on_starving: true }),
    resume: () => api3.call('PUT', '/hsp/resume', { pick_up: false }),
    stop: (k = false) => api3.call('PUT', '/hsp/stop', undefined, k),
};
// "starving" / "paused" in either of the forms the API has been seen to use (numbers 3/4 or strings).
const hspStalled = (st) => { const p = st?.play_state; return p === 3 || p === 4 || (typeof p === 'string' && /starv|pause/i.test(p)); };

// ---------------------------------------------------------------- act engine (synthesizer)
const actEngine = {
    running: false,
    starting: 0,      // starts in progress (device not moving yet, but about to be)
    mode: 'hdsp',     // transport actually in use on the device
    intent: { act: null, intensity: 0.5, variation: null, depth: 0, blend: {}, speedMul: 1, ampMul: 1, depthOff: 0, varOff: 0 },
    buf: [],          // HDSP plan: [{at (epoch ms), pos}]. buf[0] is the point the device is heading to (or resting at).
    used: [],         // [{from, to, act, motif}] epoch ms
    seg: null,        // the move the device is executing: {p0, t0, p1, t1} (times as they happen on the device)
    rest: 50,         // where the device was left when nothing is moving
    inflight: 0, fails: 0,
    known: false,     // false until the first move of a start has landed: the device may be anywhere
    timer: null, startedAt: 0, keptSince: Date.now(),
    hssp: { playStart: 0, actions: null, refill: null, swapMs: 900, timed: false },
    hsp: { origin: 0, streamId: Math.floor(Math.random() * 1e9), count: 0, sentUntil: 0, lock: Promise.resolve(), sending: false, resync: false },

    async apply(cmd) {
        const s = S(); if (!s.enabled) return;
        if (calib.gate(() => this.apply(cmd))) return;   // first motion of the session: confirm the setup first
        const my = epoch; this.starting++;
        try {
            if (!cmd._climax && climax.active) climax.cancel();   // any other instruction ends a climax push
            const act = resolveAct(LIB(), cmd.act) || this.intent.act || Object.keys(LIB().acts)[0];
            if (act !== this.intent.act) {
                this.recordKept();
                absorb(0.1);   // keep a little of how you steered the previous act
                Object.assign(this.intent, { speedMul: 1, ampMul: 1, depthOff: 0, varOff: 0, blend: {}, depth: 0, variation: null });
                this.intent.act = act;
                this.lastMotif = null;
            }
            if (cmd.preset) Object.assign(this.intent, structuredClone(cmd.preset), { act });
            const iv = unit01(cmd.intensity), vv = unit01(cmd.variation), dv = signed1(cmd.depth);
            if (iv !== undefined) this.intent.intensity = iv;
            if (vv !== undefined) this.intent.variation = vv;
            if (dv !== undefined) this.intent.depth = dv;
            if (!cmd._cue && (cmd.act || iv !== undefined)) chars.noteTag(act, iv);
            if (cmd.blend !== undefined && cmd.blend !== true) this.intent.blend = parseBlend(cmd.blend);
            lastActivity = Date.now();
            clearTimeout(this.durTimer);   // a "for N seconds" from an earlier tag must not fire into this one
            clearTimeout(windTimer);       // and a new instruction ends a wind-down
            if (hamp.running) await hamp.stop();
            if (my !== epoch) return;
            await this.regen(my);
            if (my !== epoch) return;
            const dur = num(cmd.duration);
            if (dur > 0) this.durTimer = setTimeout(() => enqueue(() => this.running && this.apply({ intensity: Math.max(0.2, this.intent.intensity - 0.3) })), dur * 1000);
        } finally { this.starting--; ui.refresh(); updatePrompt(); }
    },

    limits() { const [floor, ceil] = strokeRange(); return { floor, ceil, maxVel: capBody(), minMs: 60 }; },
    gen_(startAt, startPos, ms, prevMotif = this.lastMotif) {
        const cast = chars.cast();   // one character's style, or two taking turns / moving as one
        const r = synthesize({ lib: LIB(), intent: { ...this.intent, ...cast.intent, ornaments: S().ornaments ? 1 : 0, turn: this.turn | 0 }, prefs: S().profile, limits: this.limits(), durationMs: ms, startPos, prevMotif });
        this.lastMotif = r.lastMotif; this.turn = r.turn | 0;
        return { actions: r.actions.map((a) => ({ at: a.at + startAt, pos: a.pos })), used: r.used.map((u) => ({ ...u, who: u.who != null ? cast.keys[u.who] : null, from: u.from + startAt, to: u.to + startAt })) };
    },

    // Where the device is at time t, from the move it was last told to make.
    estPos(t = Date.now()) {
        const g = this.seg; if (!g) return this.rest;
        if (t <= g.t0) return g.p0;
        if (t >= g.t1) return g.p1;
        return g.p0 + (g.p1 - g.p0) * ((t - g.t0) / (g.t1 - g.t0));
    },
    // Slide the plan from buf[i] onward (and the phrases that go with it) later by ms.
    shift(ms, i = 0) {
        const from = i > 0 ? this.buf[i - 1].at : -Infinity;
        for (let k = i; k < this.buf.length; k++) this.buf[k].at += ms;
        for (const u of this.used) { if (u.from >= from) u.from += ms; if (u.to > from) u.to += ms; }
    },

    async regen(my = epoch) {
        const t = S().transport, want = t === 'hssp' || t === 'hsp' ? t : 'hdsp';
        if (this.running && this.mode !== want) await this.stop();   // transport was changed while playing
        if (my !== epoch) return;
        if (want === 'hssp') return this.regenHssp(my);
        if (want === 'hsp') return this.regenHsp(my);
        const now = Date.now();
        settlePhrases();
        if (this.running && this.buf.length) {
            // Keep the stroke that is already on its way (buf[0]) and anything too close to change; replace the rest.
            const keepUntil = now + api.rtt + 150;
            this.buf = this.buf.filter((a, i) => i === 0 || a.at <= keepUntil);
        } else {
            this.buf = [{ at: now + api.rtt / 2 + 60, pos: Math.round(this.estPos(now)) }];
            this.known = false;
        }
        const last = this.buf[this.buf.length - 1];
        // The phrases after the join are being replaced: end them there, so feedback given later is not credited to them.
        this.used = this.used.filter((u) => u.from < last.at && u.to > now - 20000);
        for (const u of this.used) if (u.to > last.at) u.to = last.at;
        this.lastMotif = [...this.used].reverse().find((u) => u.motif && !u.orn && u.act === this.intent.act)?.motif ?? null;
        const g = this.gen_(last.at, last.pos, 20000);
        this.buf.push(...g.actions.slice(1)); this.used.push(...g.used);
        if (!this.running) {
            try { await api.mode(2); } catch (e) { this.buf = []; toast(`Handy start failed: ${e.message}`, 'error'); return; }
            if (my !== epoch) { this.buf = []; return; }   // stopped while the device was switching mode
            const t = Date.now();
            this.shift(Math.max(0, t + api.rtt / 2 + 60 - this.buf[0].at));
            this.running = true; this.mode = 'hdsp'; this.fails = 0; this.startedAt = t; this.keptSince = t;
            clearInterval(this.timer);
            this.timer = setInterval(() => this.pump(), 20);
        }
    },

    // Send each stroke so that it lands just as the device finishes the one before it.
    pump() {
        if (!this.running || this.mode !== 'hdsp') return;
        const now = Date.now();
        if (S().idleStopSec > 0 && now - lastActivity > S().idleStopSec * 1000) return stopAll('idle timeout');
        implicitLearn();
        const tail = this.buf[this.buf.length - 1];
        if (tail && tail.at - now < 8000) {
            const g = this.gen_(tail.at, tail.pos, 20000);
            this.buf.push(...g.actions.slice(1)); this.used.push(...g.used);
            settlePhrases();
            this.used = this.used.filter((u) => u.to > now - 30000);
        }
        if (this.buf.length < 2 || this.inflight >= 2) return;   // at most two commands on the wire
        const lead = api.rtt / 2;                                // one-way trip to the device
        const prev = this.buf[0], next = this.buf[1];
        if (now < prev.at - lead) return;
        // The command lands at `arrive`. Nothing here is synced to a video, so when we are behind
        // (slow network, throttled tab) the plan slides later; strokes are never skipped and never
        // squeezed into less time. A stroke runs at most ~10% faster than planned and never above the cap.
        const arrive = now + lead;
        const from = this.estPos(arrive);
        // On a fresh start the device could be at either end (after power-on, or moved by the Handy app),
        // so the first move is timed for the longest trip it might really make.
        const dev = toDev(next.pos);
        const travel = this.known ? Math.abs(dev - toDev(from)) : Math.max(dev, 100 - dev);   // device %
        const floor = Math.max(50, 0.9 * (next.at - prev.at), (travel / maxVel()) * 1000);
        let dur = next.at - arrive;
        if (dur < floor) { this.shift(floor - dur, 1); dur = floor; }
        this.seg = { p0: from, t0: arrive, p1: next.pos, t1: arrive + dur };
        this.known = true;
        this.buf.shift();
        this.inflight++;
        api.xpt(dev, dur).then(() => { this.fails = 0; }, (e) => this.sendFailed(e)).finally(() => { this.inflight--; });
        ui.live(next.pos);
    },
    sendFailed(e) {
        console.warn('[Handy]', e);
        if (++this.fails >= 6 && this.running) { toast(`Lost contact with the Handy (${e.message}). Stopped.`, 'error'); stopAll(); }
    },

    async regenHssp(my = epoch) {
        const t0 = Date.now(), swapping = this.running && this.mode === 'hssp' && this.hssp.actions;
        // Uploading and loading a script takes a moment, during which the old one keeps playing.
        // Start the new script where the old one will be at the swap, not where it is now.
        const eta = t0 + this.hssp.swapMs;
        const pos = swapping ? posAt(this.hssp.actions, eta - this.hssp.playStart) : this.estPos(t0);
        const cur = this.used.filter((u) => u.from <= eta && u.motif && u.act === this.intent.act).pop();
        const g = this.gen_(0, pos, 120000, cur?.motif ?? null);
        let start;
        try {
            await api.syncTime(); if (my !== epoch) return;
            const url = await api.upload(g.actions.map((a) => ({ at: a.at, pos: Math.round(toDev(a.pos)) }))); if (my !== epoch) return;
            const tSetup = Date.now();
            if (!swapping) await api.mode(1);
            if (my !== epoch) return;
            await api.call('PUT', '/hssp/setup', { url });
            if (my !== epoch) return;
            const tPlay = Date.now();
            await api.hsspPlay(0);
            if (my !== epoch) { try { await api.hsspStop(); } catch { /* best effort */ } return; }   // stopped mid-start: make sure it stays stopped
            // how long "generate → device has the new script" really takes, for placing the next swap
            const took = clamp(tSetup + api.rtt / 2 - t0, 100, 5000);
            this.hssp.swapMs = this.hssp.timed ? 0.6 * this.hssp.swapMs + 0.4 * took : took; this.hssp.timed = true;
            start = tPlay + api.rtt / 2;
        } catch (e) {
            if (my !== epoch) return;
            toast(`Script sync failed (${e.message}); switching to streaming mode`, 'warning');
            S().transport = 'hdsp'; save(); $('#handy_transport').val('hdsp');
            return this.regen(my);
        }
        settlePhrases();
        clearTimeout(this.hssp.refill);   // exactly one refill is ever pending
        this.hssp.playStart = start; this.hssp.actions = g.actions;
        this.used = g.used.map((u) => ({ ...u, from: u.from + start, to: u.to + start }));
        this.mode = 'hssp'; this.buf = []; this.seg = null;
        if (!this.running) { this.running = true; this.startedAt = start; this.keptSince = start; }
        this.hssp.refill = setTimeout(() => enqueue(() => this.running && this.mode === 'hssp' && this.regenHssp()), 110000);
        clearInterval(this.timer);
        this.timer = setInterval(() => {
            if (S().idleStopSec > 0 && Date.now() - lastActivity > S().idleStopSec * 1000) return stopAll('idle timeout');
            implicitLearn(); ui.live(this.currentPos());
        }, 500);
    },

    // ---- buffered streaming (API v3 HSP). The plan in `buf` is kept whole (past points included) and the
    // device holds ~5 s of it. A change replaces the buffer from the next turning point after the change
    // can land, so the motion never reverses mid-stroke or stalls at the hand-over.
    async regenHsp(my = epoch) {
        const now = Date.now(), live = this.running && this.mode === 'hsp';
        const lead = api.rtt + 250;
        settlePhrases();
        if (live && this.buf.length) {
            let k = this.buf.findIndex((a) => a.at > now + lead);
            if (k < 0) k = this.buf.length - 1;
            this.buf = this.buf.slice(0, k + 1);
        } else {
            this.buf = [{ at: now + lead, pos: Math.round(this.estPos(now)) }];
            this.known = false;
        }
        const last = this.buf[this.buf.length - 1];
        this.used = this.used.filter((u) => u.from < last.at && u.to > now - 20000);
        for (const u of this.used) if (u.to > last.at) u.to = last.at;
        this.lastMotif = [...this.used].reverse().find((u) => u.motif && !u.orn && u.act === this.intent.act)?.motif ?? null;
        const g = this.gen_(last.at, last.pos, 20000);
        this.buf.push(...g.actions.slice(1)); this.used.push(...g.used);
        if (live) return this.hspLocked(() => this.hspSend(true));
        // Fresh start: the device could be anywhere, so the first move is timed for the longest possible trip.
        if (this.buf.length > 1) {
            const d = toDev(this.buf[1].pos), need = (Math.max(d, 100 - d) / maxVel()) * 1000;
            const have = this.buf[1].at - this.buf[0].at;
            if (have < need) this.shift(need - have, 1);
        }
        let setup = false;
        try {
            await api3.syncTime(); if (my !== epoch) return;
            await api3.mode(4).catch(() => {});                 // setup also selects HSP; this is belt and braces
            await api3.stroke(0, 1).catch(() => {});            // clear any stroke window another app left: calibration is done here
            if (my !== epoch) return;
            this.hsp.streamId = (this.hsp.streamId % 4294967295) + 1;
            await api3.setup(this.hsp.streamId); setup = true;
            if (my !== epoch) { api3.stop().catch(() => {}); return; }
            const t0 = Date.now();
            this.shift(Math.max(0, t0 + lead - this.buf[0].at));   // starts after the round trips just spent
            this.hsp.origin = t0;
            await this.hspSend(true);
            if (my !== epoch) { api3.stop().catch(() => {}); return; }
            await api3.play(Date.now() - this.hsp.origin);
            if (my !== epoch) { api3.stop().catch(() => {}); return; }
        } catch (e) {
            if (setup) api3.stop().catch(() => {});
            if (my !== epoch) return;
            toast(`Buffered streaming unavailable (${e.message}); switching to Streaming`, 'warning');
            S().transport = 'hdsp'; save(); $('#handy_transport').val('hdsp');
            this.buf = [];
            return this.regen(my);
        }
        this.running = true; this.mode = 'hsp'; this.fails = 0; this.known = true; this.startedAt = Date.now(); this.keptSince = Date.now();
        clearInterval(this.timer);
        this.timer = setInterval(() => this.tickHsp(), 250);
    },
    hspLocked(fn) { const p = this.hsp.lock.then(fn); this.hsp.lock = p.catch(() => {}); return p; },
    // Send the plan up to ~5 s ahead. flush = replace what the device holds, starting from the point it is on.
    async hspSend(flush) {
        if (this.hsp.resync) { flush = true; this.hsp.resync = false; }
        const now = Date.now(), horizon = now + 5200, h = this.hsp;
        let pts;
        if (flush) {
            const devNow = now + api.rtt / 2;
            let i = this.buf.findIndex((a) => a.at > devNow);
            i = i < 0 ? Math.max(0, this.buf.length - 2) : Math.max(0, i - 1);
            pts = this.buf.slice(i).filter((a, j) => j < 2 || a.at <= horizon);
            h.count = 0;
        } else pts = this.buf.filter((a) => a.at > h.sentUntil && a.at <= horizon);
        if (!pts.length) return;
        h.sending = true;
        try {
            let st = null;
            for (let k = 0; k < pts.length; k += 100) {
                const chunk = pts.slice(k, k + 100);
                h.count += chunk.length;
                st = await api3.add(chunk.map((a) => ({ t: Math.max(0, Math.round(a.at - h.origin)), x: Math.round(clamp(toDev(a.pos), 0, 100)) })), h.count - 1, flush && k === 0);
            }
            h.sentUntil = pts[pts.length - 1].at;
            this.fails = 0;
            this.hspObserve(st, now);
        } catch (e) {
            h.resync = true;   // never retry a failed add blindly: next time, replace the whole window
            this.sendFailed(e);
        } finally { h.sending = false; }
    },
    // Keep our timeline in step with the device's. If it paused (buffer ran dry), slide the plan to match.
    hspObserve(st, sentAt) {
        if (!st) return;
        if (hspStalled(st)) api3.resume().catch(() => {});
        const cur = num(st.current_time);
        if (cur === undefined || hspStalled(st)) return;
        const lag = (sentAt + api.rtt / 2 - this.hsp.origin) - cur;
        if (Math.abs(lag) > 300 && Math.abs(lag) < 10000) { this.hsp.origin += lag; this.shift(lag); this.hsp.sentUntil += lag; }
    },
    tickHsp() {
        if (!this.running || this.mode !== 'hsp') return;
        const now = Date.now();
        if (S().idleStopSec > 0 && now - lastActivity > S().idleStopSec * 1000) return stopAll('idle timeout');
        implicitLearn();
        const tail = this.buf[this.buf.length - 1];
        if (tail && tail.at - now < 8000) {
            const g = this.gen_(tail.at, tail.pos, 20000);
            this.buf.push(...g.actions.slice(1)); this.used.push(...g.used);
            settlePhrases();
            this.used = this.used.filter((u) => u.to > now - 30000);
        }
        const old = this.buf.findIndex((a) => a.at > now - 3000);
        if (old > 1) this.buf.splice(0, old - 1);
        if (!this.hsp.sending && (this.hsp.resync || this.hsp.sentUntil - now < 3000)) this.hspLocked(() => this.running && this.mode === 'hsp' && this.hspSend(false));
        ui.live(this.currentPos(now));
    },

    currentPos(t = Date.now()) {
        if (this.running && this.mode === 'hssp' && this.hssp.actions) return posAt(this.hssp.actions, t - this.hssp.playStart);
        if (this.running && this.mode === 'hsp' && this.buf.length) return posAt(this.buf, t);
        return this.estPos(t);
    },

    // Halts the device where it is. Safe to call at any time, including while a start is still in progress.
    async stop(reason = '') {
        clearInterval(this.timer); this.timer = null; clearTimeout(this.hssp.refill); clearTimeout(this.durTimer); clearTimeout(regenTimer);
        settlePhrases();
        this.recordKept();
        const was = this.running, how = was ? this.mode : (['hssp', 'hsp'].includes(S().transport) ? S().transport : 'hdsp');
        const here = Math.round(clamp(this.currentPos(Date.now() + api.rtt / 2), 0, 100));   // where it will be when the halt lands
        this.running = false; this.buf = []; this.seg = null; this.rest = here; this.hssp.actions = null; this.hsp.sentUntil = 0;
        try {
            if (how === 'hsp') await api3.stop();
            else if (how === 'hssp') await api.hsspStop();
            else await api.xpt(toDev(here), 100);
        } catch (e) { if (was) toast(`Stop failed: ${e.message} — use the device button!`, 'error'); }
        if (how !== 'hsp') { try { await api.mode(0); await api.hampStop(); } catch { /* best effort */ } }
        if (reason) toast(`Handy stopped: ${reason}`, 'info');
        ui.refresh(); updatePrompt();
    },

    recordKept() {
        const sec = (Date.now() - this.keptSince) / 1000;
        if (this.running && this.intent.act && sec > 5) {
            const a = actPrefs(this.intent.act);
            a.keptSec = a.keptSec ? a.keptSec * 0.8 + sec * 0.2 : sec; save();
        }
        this.keptSince = Date.now();
    },

    describe() {
        const i = this.intent;
        if (!this.running || !i.act) return 'stopped';
        const tg = targetFor(LIB(), i.act, { ...i, style: chars.effect() }, S().profile);
        const bl = Object.entries(i.blend || {}).map(([k, v]) => `${k} ${v}`).join(', ');
        return `act ${i.act}${bl ? ` (blended with ${bl})` : ''}${i.climax ? ', pushing to climax' : ''}, intensity ${i.intensity.toFixed(2)}, ≈${tg.rate.toFixed(1)} strokes/s, range ${Math.round(tg.center - tg.amp / 2)}-${Math.round(tg.center + tg.amp / 2)}`;
    },
};

function parseBlend(str) {
    const o = {};
    for (const part of String(str).split(/[,;]/)) {
        const [k, v] = part.split(':').map((x) => x?.trim());
        const act = resolveAct(LIB(), k);
        if (act) o[act] = v === undefined ? 0.3 : unit01(v) ?? 0;
    }
    return o;
}

// ---------------------------------------------------------------- pattern engine (HAMP fallback)
const PATTERNS = {
    steady: (t, p) => ({ speed: p.speed, min: p.min, max: p.max }),
    wave:   (t, p) => ({ speed: p.speed + p.depth * Math.sin((2 * Math.PI * t) / p.period), min: p.min, max: p.max }),
    build:  (t, p) => ({ speed: p.speed * (0.35 + 0.65 * Math.min(1, t / p.period)), min: p.min, max: p.max }),
    pulse:  (t, p) => ({ speed: (Math.floor((2 * t) / p.period) % 2) ? p.speed - p.depth : p.speed + p.depth, min: p.min, max: p.max }),
    tease:  (t, p) => ({ speed: p.speed + (p.depth / 2) * Math.sin((2 * Math.PI * t) / p.period), min: p.max - (p.max - p.min) * 0.3, max: p.max }),
    edge:   (t, p) => { const c = t % (p.period * 1.4); return c < p.period ? { speed: p.speed * (0.4 + 0.6 * (c / p.period)), min: p.min, max: p.max } : { speed: Math.max(5, p.speed * 0.15), min: p.min, max: p.max }; },
    deep:   (t, p) => ({ speed: p.speed, min: Math.min(p.min, 5), max: Math.max(p.max, 95) }),
};
// A legacy pattern, played by the act engine instead: speed becomes intensity, the stroke range becomes depth.
function patternAsAct(pattern, params = {}) {
    const p = { ...hamp.params, ...params }, act = actEngine.intent.act || Object.keys(LIB().acts)[0];
    const mid = (clamp(+p.min || 0, 0, 100) + clamp(+p.max || 100, 0, 100)) / 2;
    return { act: pattern === 'tease' ? (resolveAct(LIB(), 'teasing') || act) : act, intensity: clamp((+p.speed || 30) / 100, 0.05, 1), depth: clamp((mid - 50) / 25, -1, 1) };
}
const hamp = {
    running: false, starting: 0, pattern: 'steady', params: { speed: 30, min: 10, max: 90, period: 12, depth: 15 },
    startedAt: 0, sent: { speed: -1, min: -1, max: -1 }, timer: null,
    async play(pattern, params = {}) {
        if (!S().enabled) return;
        if (S().transport === 'hsp') return actEngine.apply(patternAsAct(pattern, params));   // pattern mode uses API v2; firmware 4 streams through v3
        if (calib.gate(() => this.play(pattern, params))) return;
        const my = epoch; this.starting++;
        try {
            if (actEngine.running) await actEngine.stop();
            if (my !== epoch) return;
            if (pattern && PATTERNS[pattern]) this.pattern = pattern;
            Object.assign(this.params, params);
            this.startedAt = Date.now(); lastActivity = Date.now();
            if (!this.running) {
                try { await api.hampStart(); }
                catch (e) { toast(`Handy start failed: ${e.message}`, 'error'); return; }
                if (my !== epoch) { try { await api.hampStop(); } catch { /* best effort */ } return; }   // stopped mid-start
                this.running = true; this.sent = { speed: -1, min: -1, max: -1 };
            }
            if (!this.timer) this.timer = setInterval(() => this.tick(), S().tickMs);
            this.tick();   // apply your speed and stroke limits right away, not one tick later
        } finally { this.starting--; ui.refresh(); updatePrompt(); }
    },
    async stop(reason = '') {
        const was = this.running;
        clearInterval(this.timer); this.timer = null; this.running = false;
        try { await api.hampStop(); } catch (e) { if (was) toast(`Stop failed: ${e.message}`, 'error'); }
        if (reason) toast(`Handy stopped: ${reason}`, 'info');
        ui.refresh(); updatePrompt();
    },
    async tick() {
        const s = S();
        if (!this.running || api.busy) return;
        if (s.idleStopSec > 0 && Date.now() - lastActivity > s.idleStopSec * 1000) return stopAll('idle timeout');
        const r = PATTERNS[this.pattern]((Date.now() - this.startedAt) / 1000, { ...this.params, period: Math.max(2, this.params.period) });
        const [lo, hi] = strokeRange();
        const tg = { speed: clamp(r.speed, Math.min(s.minSpeed, maxPct()), maxPct()), min: clamp(r.min, lo, hi), max: clamp(r.max, lo, hi) };
        api.busy = true;
        try {
            if (Math.abs(tg.min - this.sent.min) >= 3 || Math.abs(tg.max - this.sent.max) >= 3) {
                const a = toDev(tg.min), b = toDev(tg.max);
                await api.slide(Math.min(a, b), Math.max(a, b)); this.sent.min = tg.min; this.sent.max = tg.max;
            }
            if (Math.abs(tg.speed - this.sent.speed) >= 2) { await api.velocity(tg.speed); this.sent.speed = tg.speed; }
        } catch (e) { console.warn('[Handy]', e); } finally { api.busy = false; }
        $('#handy_live').text(`${this.pattern} · ${Math.round(tg.speed)} · ${Math.round(tg.min)}–${Math.round(tg.max)}`);
    },
};

let lastActivity = Date.now();
const anyRunning = () => actEngine.running || hamp.running;
const anyActive = () => anyRunning() || actEngine.starting > 0 || hamp.starting > 0 || calib.active;   // moving, or about to
function stopAll(reason) {
    epoch++;   // cancels every start that is in progress or queued
    clearTimeout(windTimer);
    windUntil = 0;
    if (!inBeat) clearBeats();   // tags still waiting for their moment in the reply are dropped
    climax.cancel();
    const jobs = [];
    if (calib.active) jobs.push(calib.abort());
    if (actEngine.running || actEngine.starting > 0) jobs.push(actEngine.stop(reason));
    if (hamp.running || hamp.starting > 0) jobs.push(hamp.stop(reason));
    const done = Promise.allSettled(jobs);
    chain = Promise.allSettled([chain, done]);   // commands issued after the stop wait until the device has been told
    return done;
}

// ---------------------------------------------------------------- following the prose
// When a reply has no tag, read what it describes and nudge the motion that is already playing. It never
// starts or stops the device: only an explicit tag, a button or your own words do that.
const CUES = [
    [/\b(faster|speeds? up|speeding up|quickens?|quickening|picks? up (the|her|his|their) pace|picking up (the|her|his|their) pace|harder|frantic(ally)?|furious(ly)?|relentless(ly)?|pounding|rougher|urgent(ly)?)\b/, { di: 0.15 }],
    [/\b(slows?( down)?|slowing( down)?|slower|eases? (off|up)|easing (off|up)|gentl(y|er)|languid(ly)?|unhurried|leisurely|lazily|tender(ly)?)\b/, { di: -0.15 }],
    [/\b(deeper|all the way down|to the (base|hilt|root)|takes? (you|him|it|them) (all|deep|whole)|swallows? (you|him|it|them)|deep[- ]?throats?)\b/, { dd: -0.3 }],
    [/\b(just the tip|only the tip|around the (tip|head)|at the (tip|head)|shallow(er)?( strokes)?)\b/, { dd: 0.3 }],
    [/\b(pauses?|pausing|holds? (perfectly )?still|stops? moving|goes still|freezes?|lingers?)\b/, { hold: true }],
];
const CUE_NEG = /(n't|\b(?:not|no|never|without|instead of|refus\w+|won't|before|until|if|when you|wants? (me|her|him|them) to|ask\w* (me|her|him|them) to|begs?|pleads?))\b[^.!?]{0,40}$/i;
function proseCues(text) {
    const out = [], me = String(ctx().name1 || '').trim().toLowerCase();
    let offset = 0;
    for (const sent of String(text).split(/(?<=[.!?…\n])\s+/)) {
        const at = offset; offset += sent.length + 1;
        const low = sent.toLowerCase().trim();
        if (!low || /\?["”'*]?\s*$/.test(low)) continue;                                  // a question decides nothing
        if (/^["“*_\s]*(you|your)\b/.test(low) || (me && low.replace(/^["“*_\s]+/, '').startsWith(me))) continue;   // what YOU do, not the character
        for (const [re, eff] of CUES) {
            const m = re.exec(low);
            if (!m || CUE_NEG.test(low.slice(0, m.index))) continue;
            out.push({ idx: at + m.index, ...eff });
            break;   // one cue per sentence
        }
        if (out.length >= 4) break;
    }
    return out;
}
function runCue(c) {
    if (!S().enabled || !actEngine.running || climax.active || Date.now() < windUntil || calib.active) return;
    const i = actEngine.intent, cmd = { _cue: true };
    if (c.hold) cmd.intensity = clamp(i.intensity * 0.35, 0.05, 1);
    if (c.di) cmd.intensity = clamp(i.intensity + c.di, 0.05, 1);
    if (c.dd) cmd.depth = clamp(i.depth + c.dd, -1, 1);
    return actEngine.apply(cmd);
}

// ---------------------------------------------------------------- setups
// Saved calibrations for the different ways you use the Handy (lying down, sitting, a mount). Switching
// stops any motion first, because the same stroke lands somewhere else on the device.
const setups = {
    list: () => (S().setups ??= []),
    find(name) { const n = String(name || '').trim().toLowerCase(); return this.list().find((x) => x.name.toLowerCase() === n) || null; },
    save(name) {
        const c = cal(); name = String(name || '').trim().slice(0, 30);
        if (!name) return false;
        if (!c) { toast('Calibrate first, then save it as a setup.', 'warning'); return false; }
        const ex = this.find(name), rec = { name: ex?.name || name, base: c.base, tip: c.tip, at: c.at || today() };
        if (ex) Object.assign(ex, rec); else this.list().push(rec);
        S().setupName = rec.name; save(); ui.refresh();
        toast(`Saved setup “${rec.name}”`, 'success');
        return true;
    },
    async use(name) {
        const x = this.find(name); if (!x) return false;
        if (anyRunning() || actEngine.starting > 0 || hamp.starting > 0) await stopAll('setup changed');
        S().calibration = { base: x.base, tip: x.tip, at: x.at }; S().setupName = x.name;
        save(); ui.refresh(); ui.calib(); updatePrompt();
        if (!calib.active) toast(`Setup “${x.name}”: base at ${x.base}, tip at ${x.tip}`, 'info');
        return true;
    },
    remove(name) {
        const x = this.find(name); if (!x) return;
        S().setups = this.list().filter((y) => y !== x);
        if (S().setupName === x.name) S().setupName = null;
        save(); ui.refresh();
    },
};

// ---------------------------------------------------------------- reply pacing
// A reply can hold several tags. Each plays when the reader reaches it: the first at once, the rest after
// the words between them at the reading speed. STOP, a new AI message or a chat change drops what is waiting.
let beats = [], inBeat = false;
function clearBeats() { for (const t of beats) clearTimeout(t); beats = []; }
function runBeat(a) {
    if (a._cue) return void enqueue(() => runCue(a));
    if (isStop(a)) { inBeat = true; try { stopAll(); } finally { inBeat = false; } return; }   // later tags in the same reply still play
    enqueue(() => runCommand(a));
}

// ---------------------------------------------------------------- climax push
// <handy climax="30"/> or the "Finish me" button: build steadily to a peak over that many seconds, on the act
// that has made you finish most (unless one is named or already playing), favouring the phrases that were
// playing when you finished before. It holds the peak for a minute, then eases off if you haven't finished.
const climax = {
    active: false, timer: null, t0: 0, ms: 30000, from: 0.5, sent: 0,
    bestAct() {
        const pr = S().profile, r = chars.current(), lib = LIB();
        const score = (a) => 2 * (pr.acts[a]?.finishes || 0) + (pr.acts[a]?.edges || 0) * 0.5 + Math.max(0, r?.acts?.[a]?.score || 0);
        const best = Object.keys(lib.acts).map((a) => [a, score(a)]).sort((x, y) => y[1] - x[1])[0];
        return best && best[1] > 0 ? best[0] : (actEngine.intent.act || Object.keys(lib.acts)[0]);
    },
    async start(a = {}) {
        if (!S().enabled) return;
        if (calib.gate(() => this.start(a))) return;
        const secs = clamp(num(a.climax) > 0 ? num(a.climax) : num(a.duration) > 0 ? num(a.duration) : 30, 10, 90);
        const act = resolveAct(LIB(), a.act) || (actEngine.running ? actEngine.intent.act : this.bestAct());
        const from = clamp(actEngine.running ? actEngine.intent.intensity : 0.45, 0.45, 0.9);
        this.cancel();
        Object.assign(this, { active: true, t0: Date.now(), ms: secs * 1000, from, sent: from });
        actEngine.intent.climax = true;
        await actEngine.apply({ act, intensity: from, _climax: true });
        if (!this.active) return;                               // stopped while it was starting
        if (!actEngine.running) return this.cancel();
        this.timer = setInterval(() => this.tick(), 1000);
        ui.refresh(); updatePrompt();
    },
    tick() {
        if (!this.active) return;
        if (!actEngine.running) return this.cancel();
        const el = Date.now() - this.t0, k = clamp(el / this.ms, 0, 1);
        if (el > this.ms + 60000) {   // a minute at the peak and no finish: ease off and let the AI decide what next
            this.cancel();
            actEngine.intent.intensity = 0.6;
            logEvent('climax-missed');
            enqueue(() => actEngine.running && actEngine.regen());
            ui.refresh(); return updatePrompt();
        }
        const target = this.from + (1 - this.from) * Math.pow(k, 1.4);
        if (target - this.sent >= 0.08 || (k >= 1 && this.sent < 1)) {   // a handful of steps, each joined at a turning point
            this.sent = k >= 1 ? 1 : target;
            actEngine.intent.intensity = this.sent;
            lastActivity = Date.now();
            enqueue(() => actEngine.running && this.active && actEngine.regen());
            ui.refresh();
        }
    },
    cancel() {
        clearInterval(this.timer); this.timer = null;
        this.active = false; actEngine.intent.climax = false;
    },
};

// ---------------------------------------------------------------- arousal estimate
// A running guess at how close you are, from what is playing, for how long, and your own signals. It is
// only an estimate: without an "I'm close" from you it never claims more than 85%, and it learns your pace
// from when you do signal. The AI is told, so characters can pace, tease and time a finish.
const arousal = {
    level: 0, last: Date.now(), edgeUntil: 0, refractoryUntil: 0, atCap: 0, shown: -1,
    DEFAULT_K: 1 / 240,
    k() { return S().profile.arousalK ?? this.DEFAULT_K; },
    setK(v) { S().profile.arousalK = clamp(v, 1 / 900, 1 / 45); save(); },
    tick(now = Date.now()) {
        const dt = clamp((now - this.last) / 1000, 0, 5); this.last = now;
        if (!dt) return;
        const i = actEngine.running ? clamp(actEngine.intent.intensity, 0, 1) : hamp.running ? clamp(hamp.params.speed / 100, 0, 1) : null;
        if (i === null) this.level -= (this.level * dt) / 90;   // nothing moving: it fades
        else {
            const g = now < this.refractoryUntil ? 0.3 : 1;
            this.level += dt * (this.k() * g * (0.3 + 0.7 * i) - (this.level * (1 - i) * (1 - i)) / 120);
        }
        const cap = now < this.edgeUntil ? 1 : 0.85;
        if (i !== null && this.level >= cap && cap < 1) {
            // sitting at "nearly there" for a minute with no word from you: the guess runs fast for you
            this.atCap += dt;
            if (this.atCap > 60) { this.atCap = 0; this.setK(this.k() * 0.88); this.level = 0.72; }
        } else this.atCap = 0;
        this.level = clamp(this.level, 0, cap);
        if (Math.abs(this.level - this.shown) >= 0.05) { this.shown = this.level; ui.arousal(); updatePrompt(); }
    },
    learn() { if (anyRunning() && this.level < 0.88) this.setK(this.k() * Math.pow(0.9 / Math.max(this.level, 0.25), 0.25)); },   // you got there sooner than guessed
    close() { this.learn(); this.level = Math.max(this.level, 0.92); this.edgeUntil = Date.now() + 45000; this.shown = this.level; ui.arousal(); },
    finish() { this.learn(); this.level = 0.05; this.edgeUntil = 0; this.refractoryUntil = Date.now() + 300000; this.shown = this.level; ui.arousal(); },
    label() {
        if (Date.now() < this.refractoryUntil && this.level < 0.3) return 'just finished: sensitive and recovering';
        const l = this.level;
        return l < 0.15 ? 'not warmed up yet' : l < 0.4 ? 'warming up' : l < 0.65 ? 'building' : l < 0.86 ? 'getting close' : 'on the edge';
    },
    text() {
        if (!S().arousalMeter) return '';
        return `AROUSAL ESTIMATE: about ${Math.round(this.level * 100)}% (${this.label()}). This is a guess from the motion, the time and the user's own signals; use it to pace the scene (tease and build when it is low, back off or hold to edge them when it is high, <handy climax/> to push them over). Trust what the user says over this number.`;
    },
};

// ---------------------------------------------------------------- character styles
// Every character gets their own way of moving the Handy: read from their card, shaped by your feedback
// while they are in control, and remembered. The character in control is whoever wrote the last message
// with a tag (so group chats work), else the chat's character.
const chars = {
    who: null,          // key of the character whose tag is driving the device
    seen: new Set(),    // keys whose card was checked for changes this session
    reading: new Set(), tried: new Set(), warned: false,
    speaker: null,                  // group chats: the character about to write (their style and memory go in the prompt)
    partner: null, duet: 'turns',   // a second character acting together with the one in control
    lastMove: null,                 // the signature move last played: { name, act, t }
    keyOf(msg) {
        const c = ctx();
        if (msg?.original_avatar) return msg.original_avatar;   // group chats tag each message with its character
        if (!c.groupId) { const ch = c.characters?.[c.characterId]; if (ch?.avatar) return ch.avatar; }
        const byName = Array.isArray(c.characters) ? c.characters.find((x) => x?.name && x.name === msg?.name) : null;
        if (byName?.avatar) return byName.avatar;
        return msg?.name ? `name:${msg.name}` : null;
    },
    chatDefault() { const c = ctx(); return c.groupId ? null : (c.characters?.[c.characterId]?.avatar ?? null); },
    activeKey() { return S().charStyles ? (this.who ?? this.chatDefault()) : null; },
    card(key) {
        const list = ctx().characters;
        const ch = Array.isArray(list) ? list.find((x) => x?.avatar === key) : null;
        if (!ch) return null;
        const d = ch.data || {};
        const tags = ch.tags || d.tags || [];
        const text = [ch.description ?? d.description, ch.personality ?? d.personality, ch.scenario ?? d.scenario, Array.isArray(tags) ? tags.join(', ') : '']
            .filter(Boolean).join('\n');
        return { name: ch.name, text };
    },
    // The stored record for a character, created (and read from the card) the first time they are seen.
    get(key) {
        if (!key) return null;
        const all = (S().characters ??= {});
        let r = all[key];
        const card = this.seen.has(key) && r ? null : this.card(key);
        this.seen.add(key);
        if (!r) {
            const seed = seedStyle(card?.text || '');
            r = all[key] = { name: card?.name || key.replace(/^name:/, '').replace(/\.png$/i, ''), traits: seed.traits, hits: seed.hits, custom: false,
                source: 'words', hash: card ? textHash(card.text) : null, learned: EMPTY_LEARNED(), motifs: {}, acts: {},
                minutes: 0, loves: 0, nopes: 0, edges: 0, finishes: 0, intensity: null, since: today() };
            save();
        } else if (card) {
            r.name = card.name || r.name;
            const h = textHash(card.text);
            if (h !== r.hash && !r.custom) {   // the card was edited: read it again (what you taught them is kept)
                const seed = seedStyle(card.text); r.traits = seed.traits; r.hits = seed.hits; r.hash = h; r.source = 'words'; save();
            }
        }
        r.learned = { ...EMPTY_LEARNED(), ...r.learned }; r.motifs ??= {}; r.acts ??= {};
        // A better reading from a language model, once per card (and again if the card changes).
        if (card && !r.custom && r.aiHash !== r.hash && !this.tried.has(key + r.hash)) this.aiRead(key).catch(() => {});
        return r;
    },
    // The connection profile chosen to read cards, if it exists and this SillyTavern can call profiles.
    profileId() {
        const want = String(S().styleProfile || '').trim(); if (!want) return null;
        const c = ctx(), list = c.extensionSettings?.connectionManager?.profiles;
        const p = Array.isArray(list) ? list.find((x) => x?.name === want) : null;
        return p && typeof c.ConnectionManagerRequestService?.sendRequest === 'function' ? p.id : null;
    },
    // Ask the model to rate the seven traits from the card. The keyword reading stays if anything goes wrong.
    async aiRead(key, force = false) {
        const r = S().characters?.[key], card = this.card(key), id = this.profileId();
        if (!r || !card || !card.text.trim() || !id || (r.custom && !force) || this.reading.has(key)) return false;
        const hash = textHash(card.text);
        this.reading.add(key); this.tried.add(key + hash);
        try {
            const res = await ctx().ConnectionManagerRequestService.sendRequest(id, aiPrompt(card.name, card.text), 400);
            const out = parseAi(typeof res === 'string' ? res : res?.content ?? res?.text ?? res?.choices?.[0]?.message?.content ?? '');
            if (!out) throw new Error('the model gave no usable answer');
            const cur = S().characters?.[key];
            if (!cur || (cur.custom && !force)) return false;   // deleted, or you adjusted it meanwhile
            Object.assign(cur, { traits: out.traits, why: out.why, source: 'ai', custom: false, hash, aiHash: hash });
            save();
            if (actEngine.running && this.activeKey() === key) enqueue(() => actEngine.running && actEngine.regen());
            ui.refresh(); updatePrompt();
            return true;
        } catch (e) {
            console.warn('[Handy] reading the card with a model failed', e);
            if (!this.warned) { this.warned = true; toast(`Couldn't read ${card.name}'s card with the "${S().styleProfile}" profile (${e?.message || e}). Using the keyword reading instead.`, 'warning'); }
            return false;
        } finally { this.reading.delete(key); }
    },
    current() { return this.get(this.activeKey()); },
    promptKey() { return !S().charStyles ? null : (ctx().groupId && this.speaker) || this.activeKey(); },
    keyByName(name) {
        const n = String(name || '').trim().toLowerCase(); if (!n) return null;
        const list = ctx().characters, ch = Array.isArray(list) ? list.find((x) => x?.name && x.name.toLowerCase() === n) : null;
        if (ch?.avatar) return ch.avatar;
        const known = Object.entries(S().characters || {}).find(([, r]) => String(r.name).toLowerCase() === n);
        return known ? known[0] : `name:${String(name).trim()}`;
    },
    // with="NAME" on a tag: that character joins in. A tag naming an act without it means one character again.
    setPartner(name, mode) {
        const off = !name || name === true || /^(none|no one|nobody|solo|alone)$/i.test(String(name).trim());
        const key = off || !S().charStyles ? null : this.keyByName(name);
        // only a character SillyTavern knows (or one you already have a style for): a made-up name is ignored
        const real = key && (!key.startsWith('name:') || !!S().characters?.[key]);
        this.partner = real && key !== this.activeKey() ? key : null;
        this.duet = /^(together|both|unison|as one)$/i.test(String(mode || '').trim()) ? 'together' : 'turns';
    },
    partnerRec() { return this.partner && S().charStyles && this.activeKey() ? this.get(this.partner) : null; },
    actives() { return [this.current(), this.partnerRec()].filter(Boolean); },
    // What the synthesizer needs for whoever is acting: { intent: { style } | { styles, duet }, keys }.
    cast() {
        const fx = (r) => ({ ...styleEffect(r.traits, r.learned), motifs: r.motifs });
        const a = this.current(), b = a ? this.partnerRec() : null;
        if (a && b) return { intent: { styles: [fx(a), fx(b)], duet: this.duet }, keys: [this.activeKey(), this.partner] };
        return { intent: { style: a ? fx(a) : null }, keys: [] };
    },
    // ---- session memory: what happened with this character, kept as short recaps the AI can refer back to
    sess(r) {
        const now = Date.now();
        if (!r.now || now - r.now.t > 3 * 3600e3) {   // three quiet hours ends a session
            if (r.now && (r.now.minutes > 0 || r.now.edges || r.now.finishes)) { (r.recaps ??= []).push(r.now); if (r.recaps.length > 5) r.recaps.shift(); }
            r.now = { date: today(now), t: now, minutes: 0, edges: 0, finishes: 0, loves: 0, acts: {}, finishedWith: [] };
        }
        r.now.t = now;
        return r.now;
    },
    recap(x) {
        const acts = Object.entries(x.acts || {}).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([k]) => k);
        return [`${x.date}`, x.minutes ? `${x.minutes} min` : 'a short one', acts.length ? `mostly ${acts.join(', ')}` : '', x.edges ? `edged ${x.edges}×` : '',
            x.finishes ? `finished ${x.finishes}×${x.finishedWith?.length ? ` (${x.finishedWith.slice(-2).join('; ')})` : ''}` : 'did not finish', x.loves ? `${x.loves} ❤` : ''].filter(Boolean).join(', ');
    },
    // What the synthesizer needs: the style's effect on motion, plus the character's own favourite phrases.
    effect() { const r = this.current(); return r ? { ...styleEffect(r.traits, r.learned), motifs: r.motifs } : null; },   // the character in control alone
    act(r, act) { return (r.acts[act] ??= { n: 0, score: 0 }); },
    // A tag (or your choice on the panel) while this character is in control: remember their habits.
    noteTag(act, intensity) {
        const r = this.current(); if (!r || !act) return;
        this.act(r, act).n++;
        const se = this.sess(r); se.acts[act] = (se.acts[act] || 0) + 1;
        if (intensity !== undefined) r.intensity = r.intensity == null ? intensity : r.intensity + 0.2 * (intensity - r.intensity);
        r.updated = Date.now();
    },
    text() {
        const key = this.promptKey(), r = this.get(key); if (!r) return '';
        const mover = key !== this.activeKey() ? this.current() : null;   // someone else's tag is driving the device right now
        const acts = Object.entries(r.acts).filter(([, a]) => a.n > 0).sort((a, b) => (b[1].score + 0.1 * b[1].n) - (a[1].score + 0.1 * a[1].n));
        const fav = acts.filter(([, a]) => a.score > 0.5).slice(0, 3).map(([k]) => k);
        const hist = [r.minutes ? `${r.minutes} min together` : '', r.edges ? `brought them to the edge ${r.edges}×` : '', r.finishes ? `made them finish ${r.finishes}×` : '',
            fav.length ? `the user loves it when ${r.name} does ${fav.join(', ')}` : '', r.intensity != null && acts.length ? `usually goes at intensity ~${r.intensity.toFixed(1)}` : ''].filter(Boolean);
        return `CHARACTER STYLE: ${r.name} moves the device their own way: ${describeStyle(r.traits, r.learned)}. The device already plays it in that style; choose acts and intensity the way ${r.name} would${hist.length ? `. History with the user: ${hist.join('; ')}` : ''}.${this.memory(r)}${mover ? ` Right now ${mover.name} is the one moving the device; a tag from ${r.name} hands it over to ${r.name}'s style.` : this.duetText()}`;
    },
    memory(r) {
        const past = (r.recaps || []).slice(-2).map((x) => this.recap(x));
        const cur = r.now && Date.now() - r.now.t < 3 * 3600e3 && (r.now.minutes > 0 || r.now.edges || r.now.finishes) ? this.recap(r.now) : '';
        if (!past.length && !cur) return '';
        return ` SESSION MEMORY with ${r.name}:${past.length ? ` earlier sessions: ${past.join(' | ')}.` : ''}${cur ? ` This session so far: ${cur}.` : ''} ${r.name} remembers these and may refer back to them naturally.`;
    },
    duetText() {
        const p = this.partnerRec();
        return p ? ` ${p.name} has joined in (${this.duet === 'together' ? 'moving as one' : 'taking turns'}): ${p.name}'s style is ${describeStyle(p.traits, p.learned)}.` : '';
    },
    summary(r) { return r ? `${r.name}: ${describeStyle(r.traits, r.learned)}` : ''; },
};

// ---------------------------------------------------------------- learning
function actPrefs(act) {
    return (S().profile.acts[act] ??= { rateMul: 1, ampMul: 1, centerShift: 0, variation: 0.35, score: 0, n: 0, loves: 0, keptSec: 0 });
}
// Fold the user's live adjustments into the act's long-term preferences.
// With a character in control, half of each adjustment is theirs (how you like it when THEY do it) and half
// is your general taste for the act, so the total change is the same as before.
function absorb(alpha) {
    const i = actEngine.intent; if (!i.act) return;
    const a = actPrefs(i.act), rs = chars.actives(), w = rs.length ? 0.5 : 0, wr = w / (rs.length || 1);   // two characters share the character half
    const k = (m) => Math.pow(m, alpha);
    const sm = k(i.speedMul), am = k(i.ampMul);
    a.rateMul = clamp(a.rateMul * Math.pow(sm, 1 - w), 0.3, 3); i.speedMul /= sm;
    a.ampMul = clamp(a.ampMul * Math.pow(am, 1 - w), 0.3, 2.5); i.ampMul /= am;
    a.centerShift = clamp(a.centerShift + 25 * i.depthOff * alpha * (1 - w), -40, 40);
    const baseVar = i.variation ?? a.variation;
    a.variation = clamp(a.variation + (baseVar + i.varOff * (1 - w) - a.variation) * alpha, 0, 1);
    for (const r of rs) {
        const L = r.learned;
        L.rateMul = clamp(L.rateMul * Math.pow(sm, wr), 0.5, 2);
        L.ampMul = clamp(L.ampMul * Math.pow(am, wr), 0.5, 2);
        L.centerShift = clamp(L.centerShift + 25 * i.depthOff * alpha * wr, -30, 30);
        L.varOff = clamp(L.varOff + i.varOff * alpha * wr, -0.4, 0.4);
    }
    i.depthOff *= 1 - alpha; i.varOff *= 1 - alpha;
}
// Rate the phrases that were playing, and the phrase-to-phrase transitions
// into them, so the engine learns both what you like and what to chain.
function creditMotifs(reward, windowMs = 8000, alpha = 0.3) {
    const pr = S().profile, now = Date.now(), all = chars.actives();
    const seq = actEngine.used.filter((u) => u.motif && u.from < now).sort((a, b) => a.from - b.from);
    const before = (i) => { for (let k = i - 1; k >= 0; k--) if (!seq[k].orn) return seq[k].motif; return null; };   // a detail touch is not a link in the chain
    for (let i = 0; i < seq.length; i++) {
        const u = seq[i];
        if (u.to <= now - windowMs) continue;
        // a phrase you already rated and that has since been replaced keeps that verdict
        if (u.rated && u.to <= now && Math.sign(u.rated) !== Math.sign(reward)) continue;
        reinforce(pr.motifs, u.motif, reward, alpha);
        // and the favourites of whoever was doing it: in a duet, the one whose turn it was
        for (const r of (u.who ? [chars.get(u.who)].filter(Boolean) : all)) reinforce(r.motifs, u.motif, reward, alpha);
        const pv = u.orn ? null : before(i);
        if (pv) reinforce(pr.trans, `${pv}>${u.motif}`, reward, alpha);
        if (!u.rated || Math.sign(u.rated) !== Math.sign(reward)) countRating(u.motif, reward);
        u.rated = reward;
    }
    pruneTrans();
    for (const r of all) { const k = Object.keys(r.motifs); if (k.length > 400) k.sort((x, y) => Math.abs(r.motifs[x]) - Math.abs(r.motifs[y])).slice(0, k.length - 300).forEach((x) => delete r.motifs[x]); }
}
// A phrase you have turned down three times, more than twice as often as you liked it, is retired
// for good (Reset under Learned taste brings it back). Up to then, "Not this" only makes it rarer.
function countRating(id, reward) {
    const pr = S().profile, st = (pr.motifStats[id] ??= { love: 0, nope: 0 });
    if (reward >= 1) st.love++; else if (reward < 0) st.nope++;
    if (st.nope >= 3 && st.nope > 2 * st.love) pr.banned[id] = true;
}
// Phrases that finished with no reaction count as a weak "fine" signal.
function settlePhrases() {
    const pr = S().profile, now = Date.now();
    const seq = actEngine.used.filter((u) => u.motif).sort((a, b) => a.from - b.from);
    for (let i = 0; i < seq.length; i++) {
        const u = seq[i];
        if (u.settled || u.to > now - 2000) continue;
        u.settled = true;
        if (u.rated) continue;
        reinforce(pr.motifs, u.motif, REWARD.neutral, 0.05);
        let pv = null; if (!u.orn) for (let k = i - 1; k >= 0 && !pv; k--) if (!seq[k].orn) pv = seq[k].motif;
        if (pv) reinforce(pr.trans, `${pv}>${u.motif}`, REWARD.neutral, 0.05);
    }
}
function pruneTrans() {
    const t = S().profile.trans, keys = Object.keys(t);
    if (keys.length > 3000) keys.sort((a, b) => Math.abs(t[a]) - Math.abs(t[b])).slice(0, keys.length - 2500).forEach((k) => delete t[k]);
}
let lastImplicit = Date.now();
function implicitLearn() {
    if (Date.now() - lastImplicit < 60000) return;
    lastImplicit = Date.now();
    if (actEngine.running && Date.now() - lastActivity < 180000) {
        absorb(0.05); settlePhrases(); actPrefs(actEngine.intent.act).score += 0.1;
        const r = chars.current();
        if (r) {   // time together: an inexperienced character slowly grows more confident with you
            r.minutes++; chars.sess(r).minutes++;
            if (r.traits.exp + r.learned.expGain < 0.85) r.learned.expGain = Math.min(0.45, r.learned.expGain + 0.008);
        }
        save();
    }
}
function logEvent(kind) {
    const pr = S().profile;
    const e = actEngine.running
        ? { kind, t: Date.now(), act: actEngine.intent.act, intensity: +actEngine.intent.intensity.toFixed(2) }
        : { kind, t: Date.now(), pattern: hamp.pattern, speed: Math.round(hamp.params.speed) };
    pr.log.push(e); if (pr.log.length > 300) pr.log.splice(0, pr.log.length - 300);
    pending.push(e);
}
let pending = [];

const FEEDBACK = {
    faster:  { label: 'Faster',  icon: 'fa-angles-up',     act: (i) => { i.speedMul *= 1.15; }, pat: (p) => { p.speed += 8; } },
    slower:  { label: 'Slower',  icon: 'fa-angles-down',   act: (i) => { i.speedMul /= 1.15; }, pat: (p) => { p.speed -= 8; } },
    longer:  { label: 'Longer',  icon: 'fa-arrows-up-down', act: (i) => { i.ampMul *= 1.15; }, pat: (p) => { p.min -= 8; p.max += 8; } },
    shorter: { label: 'Shorter', icon: 'fa-compress',      act: (i) => { i.ampMul /= 1.15; }, pat: (p) => { p.min += 8; p.max -= 8; } },
    up:      { label: 'Tip',     icon: 'fa-arrow-up',      act: (i) => { i.depthOff += 0.2; }, pat: (p) => { p.min += 6; p.max += 6; } },
    down:    { label: 'Base',    icon: 'fa-arrow-down',    act: (i) => { i.depthOff -= 0.2; }, pat: (p) => { p.min -= 6; p.max -= 6; } },
    more:    { label: 'Wilder',  icon: 'fa-wave-square',   act: (i) => { i.varOff += 0.15; }, pat: (p) => { p.depth += 6; } },
    less:    { label: 'Smoother', icon: 'fa-minus',        act: (i) => { i.varOff -= 0.15; }, pat: (p) => { p.depth -= 6; } },
    love:    { label: 'Love this', icon: 'fa-heart' },
    nope:    { label: 'Not this',  icon: 'fa-thumbs-down' },
    close:   { label: "I'm close", icon: 'fa-fire' },
    climax:  { label: 'Finish me', icon: 'fa-bolt' },
    finish:  { label: 'Finished',  icon: 'fa-champagne-glasses' },
};

// "I'm close": an edging signal, not a rating. By default the device eases off at once (the AI's reply
// takes seconds), and the AI is told so it can pull back further, hold you there, or push you over.
let edges = 0;
function closeSignal(fromText = false) {
    edges++;
    const s = S(), pull = s.closeAction !== 'ai' && !climax.active;   // during a climax push, "close" means keep going
    arousal.close();
    // What brought you to the edge is, by definition, working: a modest positive for the phrases that did it.
    if (actEngine.running) {
        creditMotifs(0.6, 10000, 0.2); const a = actPrefs(actEngine.intent.act); a.edges = (a.edges || 0) + 1;
        const r = chars.current(); if (r) { r.edges++; chars.sess(r).edges++; chars.act(r, actEngine.intent.act).score += 0.6; }
        save();
    }
    if (actEngine.running && pull) {
        actEngine.intent.intensity = clamp(actEngine.intent.intensity * 0.3, 0.05, 1);
        clearTimeout(regenTimer); regenTimer = setTimeout(() => enqueue(() => actEngine.running && actEngine.regen()), 0);
    } else if (hamp.running && pull) {
        hamp.params.speed = Math.max(s.minSpeed, hamp.params.speed * 0.4);
    }
    logEvent('close'); ui.refresh(); updatePrompt();
    if (!fromText && (!pull || s.autoReplyOnFeedback)) debouncedReply(800);
}

// "Finished": the strongest signal there is about what works. The phrases from the last ~20 s are rated up
// firmly, the act's finish count is remembered (and shown to the AI), and the device winds down gently.
let finishes = 0, windTimer = null, windUntil = 0;
function finishSignal(fromText = false) {
    finishes++;
    const s = S();
    if (actEngine.running) {
        creditMotifs(1, 20000, 0.3); const a = actPrefs(actEngine.intent.act); a.finishes = (a.finishes || 0) + 1;
        const r = chars.current();
        if (r) {
            r.finishes++; chars.act(r, actEngine.intent.act).score += 1;
            const se = chars.sess(r), mv = chars.lastMove && chars.lastMove.act === actEngine.intent.act && Date.now() - chars.lastMove.t < 600000 ? chars.lastMove.name : null;
            se.finishes++; se.finishedWith.push(`during ${actEngine.intent.act}${mv ? `, the signature move "${mv}"` : ''}${climax.active ? ', after a climax push' : ''}`);
        }
        // remember exactly which phrases were playing: a later climax push reaches for these first
        const fz = S().profile.finishers, now = Date.now();
        for (const id of new Set(actEngine.used.filter((u) => u.motif && u.from < now && u.to > now - 20000).map((u) => u.motif))) fz[id] = (fz[id] || 0) + 1;
        save();
    }
    arousal.finish();
    climax.cancel();
    logEvent('finished');
    if (s.finishAction === 'stop') stopAll('you finished');
    else if (s.finishAction === 'winddown') {
        if (actEngine.running) {
            Object.assign(actEngine.intent, { intensity: 0.05, speedMul: 0.6, varOff: -0.3 });
            clearTimeout(regenTimer); regenTimer = setTimeout(() => enqueue(() => actEngine.running && actEngine.regen()), 0);
        } else if (hamp.running) hamp.params.speed = s.minSpeed;
        clearTimeout(windTimer);
        windUntil = Date.now() + 20000;
        windTimer = setTimeout(() => anyRunning() && stopAll('wind-down finished'), 20000);
    }
    ui.refresh(); updatePrompt();
    if (!fromText && (s.finishAction === 'ai' || s.autoReplyOnFeedback)) debouncedReply(800);
}

let regenTimer = null;
function feedback(kind) {
    const f = FEEDBACK[kind]; if (!f) return;
    lastActivity = Date.now();
    if (kind === 'close') return closeSignal();
    if (kind === 'finish') return finishSignal();
    if (kind === 'climax') {   // "Finish me": start the push now and tell the AI
        enqueue(() => climax.start({})); logEvent('finish-me'); updatePrompt();
        if (S().autoReplyOnFeedback) debouncedReply(800);
        return;
    }
    if (actEngine.running) {
        const i = actEngine.intent, a = actPrefs(i.act);
        if (f.act) { f.act(i); absorb(0.15); }
        if (kind === 'love') { absorb(0.5); creditMotifs(REWARD.love); a.score = a.score * 0.9 + 1.5; a.loves++; }
        if (kind === 'nope') { creditMotifs(REWARD.nope); a.score = a.score * 0.9 - 1.5; actEngine.recordKept(); }
        const r = chars.current();
        if (r && (kind === 'love' || kind === 'nope')) {
            const ca = chars.act(r, i.act); ca.score = ca.score * 0.9 + (kind === 'love' ? 1 : -1);
            if (kind === 'love') { r.loves++; chars.sess(r).loves++; if (r.traits.exp + r.learned.expGain < 0.85) r.learned.expGain = Math.min(0.45, r.learned.expGain + 0.01); } else r.nopes++;
        }
        a.n++;
        if (f.act || kind === 'nope') { clearTimeout(regenTimer); regenTimer = setTimeout(() => enqueue(() => actEngine.running && actEngine.regen()), S().transport === 'hssp' ? 700 : 150); }
    } else if (hamp.running) {
        const s = S(), p = hamp.params;
        f.pat?.(p);
        p.speed = clamp(p.speed, Math.min(s.minSpeed, maxPct()), maxPct()); p.min = clamp(p.min, 0, 95); p.max = clamp(p.max, p.min + 5, 100); p.depth = clamp(p.depth, 0, 40);
        const P = (S().profile.patterns[hamp.pattern] ??= { score: 0, n: 0 });
        if (kind === 'love') P.score += 1.5; if (kind === 'nope') P.score -= 1.5; P.n++;
    }
    logEvent(kind); save(); ui.refresh(); updatePrompt();
    if (S().autoReplyOnFeedback && (kind === 'love' || kind === 'nope')) debouncedReply();
}

function saveFavorite() {
    const label = actEngine.running ? actEngine.intent.act : hamp.pattern;
    const name = prompt('Name this favorite:', label); if (!name) return;
    const pr = S().profile;
    // Saved while a character is in control, it becomes that character's signature move.
    const owner = actEngine.running ? chars.activeKey() : null;
    pr.favorites = pr.favorites.filter((f) => !(f.name === name && (f.owner ?? null) === owner));
    if (actEngine.running) {
        const i = actEngine.intent;
        pr.favorites.push({ name, kind: 'act', ...(owner ? { owner } : {}), intent: structuredClone({ act: i.act, intensity: i.intensity, variation: i.variation, depth: i.depth, blend: i.blend, speedMul: i.speedMul, ampMul: i.ampMul, depthOff: i.depthOff, varOff: i.varOff }) });
        feedback('love');
    } else pr.favorites.push({ name, kind: 'pattern', pattern: hamp.pattern, params: { ...hamp.params } });
    logEvent('favorite:' + name); save(); ui.refresh(); updatePrompt(); toast(`Saved “${name}”`, 'success');
}
// <handy save="NAME"/>: the character names what is playing now as one of their signature moves.
function saveSignature(raw) {
    const name = String(raw === true ? '' : raw).replace(/["<>]/g, '').trim().slice(0, 40);
    if (!name || !actEngine.running) return;
    const pr = S().profile, owner = chars.activeKey(), i = actEngine.intent, r = chars.current();
    pr.favorites = pr.favorites.filter((f) => !(f.name.toLowerCase() === name.toLowerCase() && (f.owner ?? null) === owner));
    pr.favorites.push({ name, kind: 'act', by: 'ai', ...(owner ? { owner } : {}), intent: structuredClone({ act: i.act, intensity: i.intensity, variation: i.variation, depth: i.depth, blend: i.blend, speedMul: i.speedMul, ampMul: i.ampMul, depthOff: i.depthOff, varOff: i.varOff }) });
    // the AI can keep eight per character; the oldest of its own goes first (yours are never dropped)
    const mine = pr.favorites.filter((f) => f.by === 'ai' && (f.owner ?? null) === owner);
    if (mine.length > 8) pr.favorites.splice(pr.favorites.indexOf(mine[0]), 1);
    save(); ui.refresh(); updatePrompt();
    toast(`${r?.name || 'The AI'} named a signature move: “${name}”`, 'info');
}
// A name belongs first to the character in control, then to you (no owner), then to anyone.
function findFavorite(name) {
    const n = String(name).trim().toLowerCase(), key = chars.activeKey();
    const all = S().profile.favorites.filter((f) => f.name.toLowerCase() === n);
    return all.find((f) => f.owner && f.owner === key) || all.find((f) => !f.owner) || all[0] || null;
}
async function playFavorite(f) {
    if (f.kind === 'act') { if (f.owner) chars.lastMove = { name: f.name, act: f.intent.act, t: Date.now() }; await actEngine.apply({ act: f.intent.act, preset: f.intent }); }
    else await hamp.play(f.pattern, { ...f.params });
}

let replyTimer = null;
function debouncedReply(ms = 4000) {
    clearTimeout(replyTimer);
    replyTimer = setTimeout(async () => { try { await ctx().executeSlashCommandsWithOptions('/trigger'); } catch (e) { console.warn(e); } }, ms);
}

// Typing a stop works at once, without waiting for the AI to write a stop tag. Only a message that is
// nothing but a stop word counts ("don't stop" or "wait for me" in the story never stops the device),
// plus your own safeword anywhere in a message.
const norm = (x) => String(x || '').toLowerCase().replace(/[’`]/g, "'").replace(/[^\p{L}\p{N}\s']/gu, ' ').replace(/\s+/g, ' ').trim();
const STOP_WORDS = new Set(['stop', 'halt', 'pause', 'red', 'safeword', 'freeze']);
const NEGATION = /\b(don'?t|do not|not|never|no|won'?t|can'?t|cannot|without|wouldn'?t)\b/;
// A short message (up to 5 words) with a stop word, no negation and no question: "Stop!", "stop, please",
// "ok stop it now", "please stop". Longer story text never stops the device; neither do "don't stop",
// "can you stop?" or "wait for me". Your safeword stops it anywhere in any message.
function isUserStop(text) {
    const raw = String(text || ''), t = norm(raw);
    if (!t) return false;
    const sw = norm(S().safeword);
    if (sw && ` ${t} `.includes(` ${sw} `)) return true;
    const words = t.split(' ');
    if (words.length > 5 || /\?\s*$/.test(raw.trim())) return false;
    return words.some((w) => STOP_WORDS.has(w)) && !NEGATION.test(t);
}
// "I'm close" / "I'm cumming" written in your own message, for when your hands are busy. Questions and
// negations never count, and "close to the door" or "I came home" don't either.
function climaxCue(text) {
    const raw = String(text || ''), t = norm(raw);
    if (!t || /\?\s*$/.test(raw.trim())) return null;
    const hit = (re) => { const m = re.exec(t); return m && !NEGATION.test(t.slice(Math.max(0, m.index - 20), m.index)); };
    if (hit(/\b(i'?m|i am)\s+(cumming|finishing)\b/) || hit(/\bi\s+(just\s+)?came\s*$/) || hit(/^(cumming|i'?m cumming)\b/)) return 'finish';
    if (hit(/\b(i'?m|i am)\s+(so\s+|really\s+|very\s+|getting\s+|almost\s+)?close\b(?!\s+(to|by|enough|friends?))/) || hit(/\b(about to|gonna|going to)\s+(cum|bust)\b/)) return 'close';
    return null;
}
function handleUserMessage(id) {
    const msg = ctx().chat?.[id];
    if (!msg || !msg.is_user) return;
    lastActivity = Date.now();   // you are here and taking part: the idle timer and the learning both count it
    if (!S().enabled || !(anyActive() || beats.length)) return;
    if (isUserStop(msg.mes)) {
        logEvent('stop');
        stopAll('you said stop');
        return updatePrompt();   // the reply being written now should already know
    }
    const cue = S().detectClimax && !calib.active ? climaxCue(msg.mes) : null;
    if (cue === 'finish') finishSignal(true);
    else if (cue === 'close') closeSignal(true);
}

// ---------------------------------------------------------------- guided calibration
// Wear the Handy, move the sleeve to your tip and then to your base with the buttons, and save. Moves are
// slow (25 %/s) and every stop path works: the STOP button, Esc, a typed stop and the device's own button.
//
// The sleeve is driven one move at a time: each move is timed from where the sleeve really is (it is only
// "known" once a move has had time to finish), and button presses during a move just change the target,
// which the next move goes to. So ▲ and ▼ always go the way they say, and nothing is ever faster than 25 %/s,
// even if you press while the sleeve is still travelling.
const calib = {
    active: false, step: 0, pos: 50, tip: null, base: null, my: 0, pending: null, prev: null,
    at: null,        // where the sleeve is, once its last move has finished (null: not known)
    moving: false,
    SPEED: 25,       // %/s for every calibration move
    v3: () => S().transport === 'hsp',
    // Set where the sleeve should go. It gets there by drive(), one finished move at a time.
    target(p) { this.pos = Math.round(clamp(p, 0, 100)); $('#handy_calib_pos').text(this.pos); return this.drive(); },
    async drive() {
        if (this.moving) return;   // already driving: it will pick up the new target when this move finishes
        const my = this.my;
        this.moving = true; ui.calib();
        try {
            while (this.active && my === epoch && this.at !== this.pos) {
                const p = this.pos;
                // Unknown start: allow the longest possible trip (all 100 % at 25 %/s).
                const ms = Math.round(this.at === null ? (100 / this.SPEED) * 1000 : Math.max((Math.abs(p - this.at) / this.SPEED) * 1000, 200));
                try { await (this.v3() ? api3.xpt(p, ms) : api.xpt(p, ms)); }
                catch (e) { toast(`Calibration move failed: ${e.message}`, 'error'); this.at = null; break; }
                await new Promise((r) => setTimeout(r, ms + 150));   // let it arrive before the next move
                if (!this.active || my !== epoch) break;
                this.at = p;
            }
        } finally { this.moving = false; if (this.active && my === epoch) ui.calib(); }
    },
    // ---- session check: before the first motion after SillyTavern loads, ask whether the setup is the same.
    // Returns true when it has taken the command (it runs later, if you confirm).
    gate(run) {
        if (!S().sessionCheck || sessionChecked || anyRunning()) return false;
        if (this.active && this.step !== -1) return true;   // calibrating: nothing else moves the device
        this.pending = run;                                 // the latest command wins
        if (!this.active) { this.active = true; this.step = -1; ui.calib(); ui.refresh(); }
        return true;
    },
    confirm() {   // "Use it and start" / "Start without calibrating"
        if (this.step !== -1) return;
        sessionChecked = true;
        const run = this.pending; this.pending = null;
        this.active = false; ui.calib(); ui.refresh();
        if (run) enqueue(run);
    },
    recal() { if (this.step === -1) { this.pending = null; this.start(); } },   // the waiting command is dropped
    async start() {
        await stopAll();
        const my = epoch; this.my = my;
        this.active = true; this.step = 0; this.tip = null; this.base = null; this.at = null; this.moving = false;
        // Quick re-check: start from last session's tip, so a small change of height or angle is a few taps.
        this.prev = cal();
        this.pos = this.prev ? this.prev.tip : 50;
        ui.calib(); ui.refresh();
    },
    async begin() {
        if (this.step !== 0 || this.moving) return;
        const my = this.my;
        try { await (this.v3() ? api3.mode(2) : api.mode(2)); }
        catch (e) { toast(`Handy start failed: ${e.message}`, 'error'); return this.abort(); }
        if (!this.active || my !== epoch) return;
        // We can't know where it is resting, so the first move is timed for the longest possible trip, and the
        // buttons only appear once it has had time to arrive.
        this.at = null;
        await this.target(this.pos);
        if (!this.active || my !== epoch || this.at === null) return;
        this.step = 1; ui.calib();
    },
    jog(delta) { if (this.active && this.step >= 1 && this.step <= 2) this.target(this.pos + delta); },
    mark() {
        if (this.moving || this.at !== this.pos) return toast('Wait until the sleeve stops, then press again.', 'info');
        if (this.step === 1) {
            this.tip = this.pos; this.step = 2;
            // Last session's base, shifted by however far the tip moved, then stopped 10% short (toward the tip)
            // so the sleeve never goes deeper than your base did last time. You fine-tune from there.
            const p = this.prev;
            if (p) {
                const shifted = p.base + (this.tip - p.tip), target = Math.round(clamp(shifted + (this.tip - shifted) * 0.1, 0, 100));
                if (Math.abs(target - this.tip) >= 10) this.target(target);
            }
        }
        else if (this.step === 2) {
            if (Math.abs(this.pos - this.tip) < 10) return toast('Tip and base must be at least 10 apart. Move further and try again.', 'warning');
            this.base = this.pos; this.step = 3;
        }
        ui.calib();
    },
    back() { if (this.step > 1 && !this.moving) { this.step--; ui.calib(); } },
    async test() {
        if (this.step !== 3 || this.moving) return;
        const my = this.my;
        for (const p of [this.base, this.tip, this.base, this.tip]) {
            await this.target(p);
            if (!this.active || my !== epoch || this.step !== 3) return;
        }
    },
    finish() {
        if (this.step !== 3) return;
        S().calibration = { base: this.base, tip: this.tip, at: today() };
        sessionChecked = true;
        // Recalibrated while a saved setup was in use: it's your call whether this is that setup, adjusted, or a new position.
        const was = S().setupName ? setups.find(S().setupName) : null;
        const su = was && confirm(`Update the saved setup “${was.name}” with this calibration?\n\nOK: update it.\nCancel: keep “${was.name}” as it was (save this one under a new name in the settings if you want to keep it).`) ? was : null;
        if (su) Object.assign(su, S().calibration); else S().setupName = null;
        save(); toast(`Calibrated: base at ${this.base}, tip at ${this.tip}${su ? ` (setup “${su.name}” updated)` : ''}`, 'success');
        this.close();
    },
    close() { this.active = false; ui.calib(); ui.refresh(); updatePrompt(); try { (this.v3() ? api3.mode(0) : api.mode(0)).catch(() => {}); } catch { /* best effort */ } },
    async abort() {
        if (!this.active) return;
        const asking = this.step === -1;
        this.active = false; this.pending = null; this.at = null; ui.calib(); ui.refresh();
        if (asking) return;   // only the question was open: nothing was sent to the device
        try { await (this.v3() ? api3.mode(0) : api.mode(0)); } catch { /* the device button always works */ }
    },
};

// ---------------------------------------------------------------- prompt
function actLine(name, e) {
    const a = S().profile.acts[name];
    let line = `* ${name}: ${e.motion || ''}`;
    if (e.description) line += ` — ${String(e.description).slice(0, 260)}`;
    const wins = [a?.edges ? `has brought them to the edge ${a.edges} time${a.edges > 1 ? 's' : ''}` : '', a?.finishes ? `has made them finish ${a.finishes} time${a.finishes > 1 ? 's' : ''}` : ''].filter(Boolean).join(', ');
    if (wins && !(a.n > 0)) line += ` | ${wins}`;
    if (a && a.n > 0) {
        const taste = [];
        if (Math.abs(a.rateMul - 1) > 0.08) taste.push(a.rateMul > 1 ? `faster than usual (x${a.rateMul.toFixed(2)})` : `slower than usual (x${a.rateMul.toFixed(2)})`);
        if (Math.abs(a.ampMul - 1) > 0.08) taste.push(a.ampMul > 1 ? 'longer strokes' : 'shorter strokes');
        if (Math.abs(a.centerShift) > 4) taste.push(a.centerShift > 0 ? 'more at the tip' : 'deeper/at the base');
        taste.push(`variation ~${a.variation.toFixed(2)}`);
        line += ` | USER TASTE: ${taste.join(', ')}; rating ${a.score.toFixed(1)}${a.keptSec ? `; enjoys ~${Math.round(a.keptSec)}s before wanting a change` : ''}${wins ? `; ${wins}` : ''}`;
    }
    return line;
}
function profileText() {
    const s = S(), lib = LIB(), pr = s.profile;
    const L = [];
    L.push(`[Device control: you control the user's Handy stroker toy. Write a tag in your reply whenever the physical action in the scene starts, changes or should build. Tags are hidden from the user and executed instantly.`);
    L.push(`<handy act="ACT" intensity="0-1" depth="-1..1" variation="0-1" blend="ACT2:0.3" duration="seconds"/>`);
    L.push(`- act = what is physically being done to the user's character right now. The device improvises realistic motion for that act from real examples, so describe the act — don't micromanage speed.`);
    L.push(`- intensity: 0 = slow and gentle, 1 = frantic. Build it gradually as the scene escalates and drop it for teasing or after a peak.`);
    L.push(`- depth: -1 = deep/at the base, +1 = shallow/at the tip. variation: 0 = mechanical, 1 = wild and unpredictable (omit to use the user's learned taste).`);
    L.push(`- blend mixes in a little of other acts for transitions or creative combinations (e.g. a blowjob with handjob: act="blowjob" blend="handjob:0.4").`);
    L.push(`- <handy stop/> stops. Don't emit a tag if nothing physical changed.`);
    L.push(`- A reply may hold several tags. Put each one right where that moment happens in your text: they play in order as the user reads (e.g. a slow start, a tag mid-reply where it speeds up, another where it eases off).`);
    if (ctx().groupId && s.charStyles) L.push(`- When two characters act on the user together, add with="THE OTHER CHARACTER'S NAME" to the tag (and duet="together" if they move as one; otherwise they take turns). The device then plays both of their styles. Leave it out when one character acts alone.`);
    L.push(`- <handy climax="30"/> pushes the user over the edge: a steady build to a peak over that many seconds (10-90), using what has made them finish before. Use it when the scene calls for the user to cum, not before.`);
    L.push(`- If the user says they are close, you are edging them: in character, pull back (lower intensity or stop), hold them right there, or push them over (raise it), and send the matching tag.`);
    L.push(`Available acts${lib.starter ? ' (starter defaults — not yet trained)' : ` (learned from ${lib.sources} scripted videos)`}:`);
    for (const [k, e] of Object.entries(lib.acts)) L.push(actLine(k, e));
    const loves = pr.log.filter((e) => e.kind === 'love' && e.act).slice(-6);
    if (loves.length) L.push(`Recently loved: ${loves.map((e) => `${e.act} @ intensity ${e.intensity}`).join(', ')}.`);
    const ck = chars.promptKey(), cr = ck ? chars.get(ck) : null;
    const general = pr.favorites.filter((f) => !f.owner), sig = ck ? pr.favorites.filter((f) => f.owner === ck) : [];
    if (general.length) L.push(`Saved favorites (play with <handy favorite="NAME"/>): ${general.map((f) => `"${f.name}"`).join(', ')}.`);
    if (cr) L.push(`${cr.name}'s signature moves${sig.length ? ` (play with <handy favorite="NAME"/>; the user knows them by name, so call back to them): ${sig.map((f) => `"${f.name}"`).join(', ')}` : ': none yet'}. When the user clearly loves what is playing, ${cr.name} may name it as a new signature move with <handy save="A SHORT NAME"/> (rarely; at most a handful).`);
    const cs = S().charStyles ? chars.text() : '';
    if (cs) L.push(cs);
    const ar = arousal.text();
    if (ar) L.push(ar);
    L.push(`CURRENT: ${actEngine.running ? actEngine.describe() : hamp.running ? `pattern ${hamp.pattern}` : 'stopped'}.`);
    if (edges) L.push(`Times the user has been brought to the edge this chat: ${edges}.`);
    const FB = { 'finish-me': 'ASKED TO BE FINISHED (the device is already building to a climax: push them over in character)',
        'climax-missed': 'THE CLIMAX PUSH ENDED WITHOUT A FINISH (the device has eased off: decide in character whether to tease, build again or change approach)',
        close: "I'M CLOSE", stop: 'STOP (the device has already stopped; do not restart it unless the user asks)',
        finished: S().finishAction === 'ai' ? 'FINISHED (climaxed; the device is still going: decide in character what happens now)' : 'FINISHED (climaxed; the device is winding down: be gentle, aftercare; do not restart unless the user asks)' };
    if (pending.length) L.push(`LIVE FEEDBACK since your last message (acknowledge it in character and adapt): ${pending.map((e) => (FB[e.kind] || e.kind) + (e.act ? ` during ${e.act}` : '')).join(', ')}.${pending.some((e) => e.kind === 'close') ? (S().closeAction === 'ai' ? ' The device has NOT eased off: your tag decides.' : climax.active ? ' The device is pushing them over: keep going.' : ' The device has already eased off a little.') : ''}`);
    L.push(']');
    return L.join('\n');
}
function updatePrompt() {
    const c = ctx(), s = S();
    c.setExtensionPrompt?.(MODULE, s.enabled && s.injectProfile ? profileText() : '', 1, 1, false, 0);
}

// ---------------------------------------------------------------- tags
const TAG_RE = /<handy\b([^>]*?)\/?>(?:\s*<\/handy>)?/gi;
function parseAttrs(str) {
    const o = {};
    for (const m of str.matchAll(/(\w+)\s*(?:=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>/]+)))?/g)) o[m[1].toLowerCase()] = m[2] ?? m[3] ?? m[4] ?? true;
    return o;
}
function handleMessage(id) {
    const msg = ctx().chat?.[id];
    if (!msg || msg.is_user || typeof msg.mes !== 'string') return;
    const tags = [...msg.mes.matchAll(TAG_RE)];
    pending = [];
    clearBeats();   // a new reply replaces whatever was still waiting from the last one
    if (!tags.length && S().enabled && S().proseCues && actEngine.running && !climax.active && Date.now() >= windUntil) {
        // No tag: follow what the reply describes, each change when you'd read it.
        const wpm = num(S().readWpm), text = msg.mes;
        let tot = 0;
        for (const c of proseCues(text)) {
            if (c.di) { if (Math.abs(tot + c.di) > 0.31) continue; tot += c.di; }
            const delay = wpm > 0 ? Math.min(180000, ((text.slice(0, c.idx).match(/\S+/g) || []).length / wpm) * 60000) : 0;
            beats.push(setTimeout(() => runBeat({ _cue: true, ...c }), Math.max(delay, 50)));
        }
    }
    if (tags.length) {
        const who = chars.keyOf(msg);
        if (who && who !== chars.who) { chars.who = who; if (chars.partner === who) chars.partner = null; if (actEngine.running) enqueue(() => actEngine.running && actEngine.regen()); }   // a different character takes over
        // In order. The first acts at once; each later one waits for the words between it and the first,
        // at your reading speed, so a reply that builds, peaks and eases off plays out as you read it.
        const text = msg.mes, wpm = num(S().readWpm);
        const wordsTo = (idx) => (text.slice(0, idx).replace(TAG_RE, ' ').match(/\S+/g) || []).length;
        const w0 = wordsTo(tags[0].index);
        for (const t of tags) {
            const a = parseAttrs(t[1]);
            const delay = wpm > 0 ? Math.min(180000, ((wordsTo(t.index) - w0) / wpm) * 60000) : 0;
            if (delay < 500) { if (isStop(a)) stopAll(); else enqueue(() => runCommand(a)); }
            else beats.push(setTimeout(() => runBeat(a), delay));
        }
        msg.mes = msg.mes.replace(TAG_RE, '').replace(/\n{3,}/g, '\n\n').trim();
    }
    chars.speaker = null;
    updatePrompt();
}
// <handy stop/>, and the ways models say the same thing through act/pattern.
const isStop = (a) => !!a.stop || [a.act, a.pattern].some((v) => typeof v === 'string' && /^(stop|stopped|none|off)$/i.test(v.trim()) && !LIB().acts[v.trim().toLowerCase()]);
function runCommand(a) {
    if (!S().enabled || (calib.active && calib.step !== -1)) return;   // nothing else drives the device while you calibrate
    if (isStop(a)) return stopAll();
    if (a.with !== undefined || (a.act && a.act !== true)) chars.setPartner(a.with, a.duet);   // with="NAME": a second character joins; an act without it: one again
    if (a.climax !== undefined) return climax.start(a);
    const fav = a.favorite ?? a.move;
    if (fav && fav !== true) { const f = findFavorite(fav); if (f) return playFavorite(f); }
    if (a.save !== undefined) {   // name what is playing (after applying anything else in the same tag)
        const rest = { ...a }; delete rest.save;
        return Promise.resolve(rest.act || rest.intensity !== undefined || rest.blend ? actEngine.apply(rest) : null).then(() => saveSignature(a.save));
    }
    if (a.act || a.intensity !== undefined || a.blend) return actEngine.apply(a);
    if (a.with !== undefined && actEngine.running) return actEngine.regen();   // <handy with="NAME"/> alone: join what is playing
    if (!a.pattern && actEngine.running && (a.depth !== undefined || a.variation !== undefined)) return actEngine.apply(a);   // e.g. <handy depth="-0.5"/>
    if (a.pattern) {
        const params = {};
        for (const k of ['speed', 'min', 'max', 'period', 'depth']) if (a[k] !== undefined && !isNaN(+a[k])) params[k] = +a[k];
        return hamp.play(String(a.pattern).toLowerCase(), params);
    }
}

// ---------------------------------------------------------------- UI
function toast(msg, type = 'info') { (window.toastr?.[type] || console.log)(msg, 'Handy'); }

const ui = {
    init() {
        const s = S();
        $('#extensions_settings2').append(`
<div class="handy-settings inline-drawer">
  <div class="inline-drawer-toggle inline-drawer-header"><b>Handy Adaptive</b><div class="inline-drawer-icon fa-solid fa-circle-chevron-down down"></div></div>
  <div class="inline-drawer-content">
    <label class="checkbox_label"><input type="checkbox" id="handy_enabled"> Enabled</label>
    <label>Connection key <input type="password" id="handy_key" class="text_pole" placeholder="from the Handy app"></label>
    <div class="flex-container"><div id="handy_test" class="menu_button">Test connection</div><span id="handy_status"></span></div>
    <label>Motion transport
      <select id="handy_transport" class="text_pole">
        <option value="hdsp">Streaming (reacts instantly)</option>
        <option value="hssp">Script sync (smooth, ~1s to react)</option>
        <option value="hsp">Buffered streaming (Handy firmware 4: smoothest, reacts in ~½ s)</option>
      </select></label>
    <label>Max speed % <input type="number" id="handy_maxspeed" class="text_pole" min="5" max="100"></label>
    <label>Min speed % (pattern mode) <input type="number" id="handy_minspeed" class="text_pole" min="0" max="100"></label>
    <label>Stroke limits (floor / ceiling) <span class="flex-container"><input type="number" id="handy_floor" class="text_pole" min="0" max="100"><input type="number" id="handy_ceil" class="text_pole" min="0" max="100"></span></label>
    <label>Auto-stop after idle (sec, 0 = off) <input type="number" id="handy_idle" class="text_pole" min="0"></label>
    <label class="checkbox_label"><input type="checkbox" id="handy_esc"> Esc key stops the device</label>
    <label class="checkbox_label"><input type="checkbox" id="handy_inject"> Send acts, learned taste + controls to the AI</label>
    <label class="checkbox_label"><input type="checkbox" id="handy_auto"> AI replies automatically to ❤/👎</label>
    <label>When I press "I'm close"
      <select id="handy_close" class="text_pole">
        <option value="pullback">Ease off at once, then the AI reacts</option>
        <option value="ai">Let the AI decide (it replies at once)</option>
      </select></label>
    <label>When I press "Finished"
      <select id="handy_finish" class="text_pole">
        <option value="winddown">Wind down gently for 20 s, then stop</option>
        <option value="stop">Stop at once</option>
        <option value="ai">Let the AI decide</option>
      </select></label>
    <label class="checkbox_label"><input type="checkbox" id="handy_session_check"> Ask me to confirm calibration before the first motion of each session</label>
    <label>Reading speed for replies with several tags (words/min, 0 = play all at once) <input type="number" id="handy_wpm" class="text_pole" min="0" max="600"></label>
    <label class="checkbox_label"><input type="checkbox" id="handy_prose"> Follow the story when a reply has no tag (faster, slower, deeper, pauses)</label>
    <label class="checkbox_label"><input type="checkbox" id="handy_ornaments"> Add detail: flutters at the tip, slow drags, deep pulses</label>
    <label class="checkbox_label"><input type="checkbox" id="handy_arousal"> Estimate my arousal and tell the AI</label>
    <label class="checkbox_label"><input type="checkbox" id="handy_detect"> Notice “I'm close” / “I'm cumming” in my messages</label>
    <label>Safeword (stops the device whenever it's in your message) <input type="text" id="handy_safeword" class="text_pole" placeholder="optional, e.g. pineapple"></label>
    <small>A short message such as “stop”, “stop, please” or “ok halt” also stops it (but not “don't stop”).</small>
    <label class="checkbox_label"><input type="checkbox" id="handy_show_panel"> Show control panel</label>
    <hr>
    <label>API v3 Application ID (buffered streaming only) <input type="password" id="handy_appid" class="text_pole" placeholder="from Handy's developer portal"></label>
    <hr>
    <b>Calibration</b>
    <div id="handy_cal_summary" class="handy-lib"></div>
    <div class="flex-container">
      <div id="handy_cal_start" class="menu_button">Calibrate to my body</div>
      <div id="handy_cal_clear" class="menu_button">Clear calibration</div>
    </div>
    <label>Saved setups (lying down, sitting, a mount…)
      <select id="handy_setup_sel" class="text_pole"></select></label>
    <div class="flex-container">
      <div id="handy_setup_save" class="menu_button" title="Save the current calibration under a name">Save current as…</div>
      <div id="handy_setup_del" class="menu_button">Delete setup</div>
    </div>
    <hr>
    <b>Character styles</b>
    <label class="checkbox_label"><input type="checkbox" id="handy_charstyles"> Give each character their own stroking style</label>
    <small>Read from the character card (personality, description, scenario, tags), shaped by your feedback while they're in control, and remembered per character.</small>
    <label>Read character cards with
      <select id="handy_style_profile" class="text_pole"></select></label>
    <small>A connection profile reads each card once and rates the character (more accurate than keywords, and it understands context). Pick your local <code>Background</code> profile so it costs nothing. Keywords are used until it answers, or if it can't.</small>
    <select id="handy_char_sel" class="text_pole"></select>
    <div id="handy_char_desc" class="handy-lib"></div>
    <div id="handy_char_traits" class="handy-traits">${Object.entries(TRAITS).map(([k, t]) => `<label title="${esc(t.low)} ↔ ${esc(t.high)}"><span>${esc(t.label)}</span><small>${esc(t.low)}</small><input type="range" data-trait="${k}" min="${t.min}" max="${t.max}" step="0.05"><small>${esc(t.high)}</small></label>`).join('')}</div>
    <div class="flex-container">
      <div id="handy_char_reread" class="menu_button" title="Read the card again and use that as the starting style (keeps what your feedback taught)">Re-read card</div>
      <div id="handy_char_forget" class="menu_button" title="Forget what your feedback taught this character">Forget learning</div>
      <div id="handy_char_delete" class="menu_button redWarningBG" title="Remove this character's style entirely">Delete</div>
    </div>
    <hr>
    <b>Motion library</b>
    <div id="handy_lib_summary" class="handy-lib"></div>
    <div class="flex-container">
      <div id="handy_lib_import" class="menu_button">Import motion_library.json</div>
      <div id="handy_lib_reset" class="menu_button">Use starter defaults</div>
    </div>
    <hr>
    <b>Learned taste</b>
    <label>Try new things <span class="flex-container"><input type="range" id="handy_explore" min="0" max="2" step="0.1"><span id="handy_explore_v"></span></span></label>
    <small id="handy_profile_summary"></small>
    <div class="flex-container">
      <div id="handy_export" class="menu_button">Export</div>
      <div id="handy_import" class="menu_button">Import</div>
      <div id="handy_reset" class="menu_button redWarningBG">Reset</div>
    </div>
    <details><summary>Advanced</summary>
      <label>API base URL <input type="text" id="handy_api" class="text_pole"></label>
      <label>Script upload URL (script sync) <input type="text" id="handy_upload" class="text_pole"></label>
    </details>
  </div>
</div>`);
        const bind = (id, key, type = 'value') => {
            const el = $(id);
            type === 'checked' ? el.prop('checked', s[key]) : el.val(s[key]);
            el.on('input change', () => {
                s[key] = type === 'checked' ? el.prop('checked') : (el.attr('type') === 'number' ? Number(el.val()) : el.val());
                save(); updatePrompt(); ui.refresh();
            });
        };
        bind('#handy_enabled', 'enabled', 'checked'); bind('#handy_key', 'connectionKey'); bind('#handy_transport', 'transport');
        bind('#handy_minspeed', 'minSpeed'); bind('#handy_maxspeed', 'maxSpeed');
        bind('#handy_floor', 'strokeFloor'); bind('#handy_ceil', 'strokeCeil'); bind('#handy_idle', 'idleStopSec');
        $('#handy_enabled').on('change', () => { if (!S().enabled) stopAll('extension turned off'); });
        // A new speed cap, stroke range or transport takes effect at the next turning point, not after the stored plan runs out.
        let replanT = null;
        $('#handy_maxspeed, #handy_floor, #handy_ceil, #handy_transport').on('change', () => { clearTimeout(replanT); replanT = setTimeout(() => { if (actEngine.running) enqueue(() => actEngine.running && actEngine.regen()); }, 300); });
        bind('#handy_esc', 'escStops', 'checked'); bind('#handy_inject', 'injectProfile', 'checked');
        bind('#handy_auto', 'autoReplyOnFeedback', 'checked'); bind('#handy_show_panel', 'showPanel', 'checked');
        bind('#handy_close', 'closeAction'); bind('#handy_safeword', 'safeword'); bind('#handy_appid', 'appId');
        bind('#handy_finish', 'finishAction'); bind('#handy_detect', 'detectClimax', 'checked'); bind('#handy_session_check', 'sessionCheck', 'checked');
        bind('#handy_charstyles', 'charStyles', 'checked');
        bind('#handy_wpm', 'readWpm'); bind('#handy_arousal', 'arousalMeter', 'checked');
        bind('#handy_prose', 'proseCues', 'checked'); bind('#handy_ornaments', 'ornaments', 'checked');
        $('#handy_style_profile').on('change', function () { S().styleProfile = this.value; chars.tried.clear(); chars.seen.clear(); chars.warned = false; save(); chars.current(); ui.refresh(); });
        const selChar = () => S().characters?.[$('#handy_char_sel').val()];
        const restyle = () => { if (actEngine.running) enqueue(() => actEngine.running && actEngine.regen()); ui.refresh(); updatePrompt(); };
        $('#handy_char_sel').on('change', () => ui.refresh());
        $('#handy_char_traits').on('change', 'input[data-trait]', function () {
            const r = selChar(); if (!r) return;
            r.traits[this.dataset.trait] = +this.value; r.custom = true; save(); restyle();
        });
        $('#handy_char_reread').on('click', () => {
            const key = $('#handy_char_sel').val(), r = selChar(); if (!r) return;
            const card = chars.card(key);
            if (!card) return toast('That character is not loaded in SillyTavern right now.', 'warning');
            const seed = seedStyle(card.text); Object.assign(r, { traits: seed.traits, hits: seed.hits, custom: false, source: 'words', why: '', aiHash: null, hash: textHash(card.text) }); save(); restyle();
            chars.aiRead(key, true).catch(() => {});
        });
        $('#handy_char_forget').on('click', () => { const r = selChar(); if (r && confirm(`Forget what your feedback taught ${r.name}? (Their card-based style stays.)`)) { Object.assign(r, { learned: EMPTY_LEARNED(), motifs: {}, acts: {}, loves: 0, nopes: 0, intensity: null }); save(); restyle(); } });
        $('#handy_char_delete').on('click', () => { const key = $('#handy_char_sel').val(), r = selChar(); if (r && confirm(`Delete ${r.name}'s style and history?`)) { delete S().characters[key]; chars.seen.delete(key); save(); restyle(); } });
        $('#handy_cal_start').on('click', () => calib.start());
        $('#handy_cal_clear').on('click', () => { if (confirm('Clear your calibration and use the full device range?')) { if (anyRunning()) stopAll('calibration cleared'); S().calibration = null; S().setupName = null; save(); ui.refresh(); } });
        $(document).on('change', '#handy_setup_sel, #handy_setup, #handy_calib_setup', function () { if (this.value) setups.use(this.value); });   // the panel and the session question are added below
        $('#handy_setup_save').on('click', () => { const n = prompt('Name this setup (e.g. Lying down):', S().setupName || ''); if (n) setups.save(n); });
        $('#handy_setup_del').on('click', () => { const n = S().setupName; if (n && confirm(`Delete the setup “${n}”? (Your current calibration stays.)`)) setups.remove(n); });
        bind('#handy_api', 'apiBase'); bind('#handy_upload', 'uploadUrl');
        const ex = () => { const v = S().profile.exploreBias ?? 1; $('#handy_explore').val(v); $('#handy_explore_v').text(v < 0.4 ? 'stick to favorites' : v > 1.4 ? 'experiment a lot' : 'balanced'); };
        ex(); $('#handy_explore').on('input', function () { S().profile.exploreBias = +this.value; ex(); save(); });
        $('#handy_test').on('click', async () => {
            $('#handy_status').text('…');
            try { const r = await (S().transport === 'hsp' ? api3.connected() : api.connected()); $('#handy_status').text(r.connected ? `✅ connected · ${Math.round(api.rtt)} ms round trip` : '❌ not connected'); }
            catch (e) { $('#handy_status').text('❌ ' + e.message); }
        });
        const pickFile = (cb) => { const inp = Object.assign(document.createElement('input'), { type: 'file', accept: '.json' }); inp.onchange = async () => { try { cb(JSON.parse(await inp.files[0].text())); } catch (e) { toast(e.message, 'error'); } }; inp.click(); };
        $('#handy_lib_import').on('click', () => pickFile((j) => {
            if (!j.acts || !Object.keys(j.acts).length) throw new Error('Not a motion library');
            S().library = j; save(); ui.refresh(); updatePrompt();
            toast(`Loaded ${Object.keys(j.acts).length} acts`, 'success');
        }));
        $('#handy_lib_reset').on('click', () => { S().library = null; save(); ui.refresh(); updatePrompt(); });
        $('#handy_export').on('click', () => {
            const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(new Blob([JSON.stringify({ ...S().profile, characters: S().characters }, null, 2)], { type: 'application/json' })), download: 'handy-profile.json' }); a.click();
        });
        $('#handy_import').on('click', () => pickFile((j) => {
            const { characters, ...taste } = j || {};
            S().profile = { ...EMPTY_PROFILE(), ...taste };
            if (characters && typeof characters === 'object' && !Array.isArray(characters)) { S().characters = characters; chars.seen.clear(); }
            save(); ui.refresh(); updatePrompt(); toast('Profile imported', 'success'); }));
        $('#handy_reset').on('click', () => { if (confirm('Erase everything the AI has learned about your taste? (The motion library is kept.)')) {
            S().profile = EMPTY_PROFILE();
            if (Object.keys(S().characters || {}).length && confirm('Also erase every character\'s style and history?')) { S().characters = {}; chars.seen.clear(); chars.tried.clear(); }
            save(); ui.refresh(); updatePrompt();
        } });

        const fb = Object.entries(FEEDBACK).map(([k, f]) => `<div class="handy-btn ${k}" data-fb="${k}" title="${f.label}"><i class="fa-solid ${f.icon}"></i><span>${f.label}</span></div>`).join('');
        $('body').append(`
<div id="handy_panel">
  <div class="handy-head"><b>Handy</b><span id="handy_live"></span><i id="handy_collapse" class="fa-solid fa-chevron-down"></i></div>
  <div class="handy-body">
    <div id="handy_stop" class="handy-stop"><i class="fa-solid fa-hand"></i> STOP</div>
    <div class="handy-grid">${fb}</div>
    <div class="handy-row"><select id="handy_act" class="text_pole"></select><div id="handy_play" class="menu_button" title="Play this act"><i class="fa-solid fa-play"></i></div><div id="handy_fav" class="menu_button" title="Save as favorite"><i class="fa-solid fa-star"></i></div><div id="handy_calib_btn" class="menu_button" title="Calibrate tip and base (for when the Handy is set up differently)"><i class="fa-solid fa-ruler-vertical"></i></div></div>
    <div class="handy-row"><span class="handy-small">Intensity</span><input id="handy_intensity" type="range" min="0" max="1" step="0.05" value="0.5"></div>
    <div class="handy-row"><select id="handy_favs" class="text_pole"></select></div>
    <div class="handy-row" id="handy_setup_row"><span class="handy-small">Setup</span><select id="handy_setup" class="text_pole" title="Switch to a saved calibration (stops any motion first)"></select></div>
    <div class="handy-pos" title="Live position: your base on the left, your tip on the right"><span>base</span><div class="handy-pos-track"><div id="handy_pos_dot"></div></div><span>tip</span></div>
    <div class="handy-arousal" title="Arousal estimate (a guess from motion, time and your signals)"><span>arousal</span><div class="handy-arousal-track"><div id="handy_arousal_fill"></div></div><span id="handy_arousal_pct"></span></div>
    <div id="handy_now" class="handy-small"></div>
    <div id="handy_who" class="handy-small handy-who"></div>
  </div>
</div>`);
        $('body').append(`
<div id="handy_calib" class="handy-calib">
  <div class="handy-calib-box">
    <b id="handy_calib_title">Calibrate to your body</b>
    <p id="handy_calib_text"></p>
    <label id="handy_calib_setup_row">Setup <select id="handy_calib_setup" class="text_pole"></select></label>
    <div class="handy-calib-pos">Device position <span id="handy_calib_pos">50</span> <span id="handy_calib_marks" class="handy-small"></span></div>
    <div class="handy-calib-jog">
      <div class="menu_button" data-jog="-10">▼▼ −10</div><div class="menu_button" data-jog="-2">▼ −2</div>
      <div class="menu_button" data-jog="2">▲ +2</div><div class="menu_button" data-jog="10">▲▲ +10</div>
    </div>
    <div class="handy-calib-actions">
      <div id="handy_calib_back" class="menu_button">Back</div>
      <div id="handy_calib_test" class="menu_button">Test</div>
      <div id="handy_calib_next" class="menu_button"></div>
    </div>
    <div id="handy_calib_cancel" class="handy-stop"><i class="fa-solid fa-hand"></i> STOP / cancel</div>
  </div>
</div>`);
        $('#handy_calib').on('click', '[data-jog]', function () { calib.jog(+this.dataset.jog); });
        $('#handy_calib_back').on('click', () => calib.back());
        $('#handy_calib_test').on('click', () => (calib.step === -1 ? calib.recal() : calib.test()));
        $('#handy_calib_next').on('click', () => (calib.step === -1 ? calib.confirm() : calib.step === 0 ? calib.begin() : calib.step === 3 ? calib.finish() : calib.mark()));
        $('#handy_calib_btn').on('click', () => calib.start());
        $('#handy_calib_cancel').on('click', () => stopAll('calibration cancelled'));
        document.addEventListener('keydown', (e) => {
            if (!calib.active || !['ArrowUp', 'ArrowDown'].includes(e.key)) return;
            e.preventDefault(); calib.jog((e.key === 'ArrowUp' ? 1 : -1) * (e.shiftKey ? 10 : 2));
        });
        $('#handy_panel').on('click', '[data-fb]', function () { feedback(this.dataset.fb); });
        $('#handy_stop').on('click', () => stopAll('stop button'));
        $('#handy_play').on('click', () => { const act = $('#handy_act').val(), intensity = +$('#handy_intensity').val(); enqueue(() => actEngine.apply({ act, intensity })); logEvent('chose:' + act); });
        $('#handy_intensity').on('change', function () { const intensity = +this.value; if (actEngine.running) enqueue(() => actEngine.running && actEngine.apply({ intensity })); });
        $('#handy_fav').on('click', saveFavorite);
        $('#handy_favs').on('change', function () { const f = S().profile.favorites[+this.value]; if (this.value !== '' && f) { enqueue(() => playFavorite(f)); logEvent('favorite:' + f.name); } this.value = ''; });
        $('#handy_collapse').on('click', () => $('#handy_panel').toggleClass('collapsed'));
        // Live position, from the motion plan itself: no extra requests to the device.
        const dot = document.getElementById?.('handy_pos_dot');
        if (dot && typeof requestAnimationFrame === 'function') {
            const frame = () => {
                if (actEngine.running) dot.style.left = `${clamp(actEngine.currentPos(), 0, 100)}%`;
                dot.style.opacity = actEngine.running ? 1 : 0.25;
                requestAnimationFrame(frame);
            };
            requestAnimationFrame(frame);
        }
        ui.refresh();
    },
    refresh() {
        const s = S(), pr = s.profile, lib = LIB();
        $('#handy_panel').toggle(!!(s.enabled && s.showPanel)).toggleClass('running', anyRunning());
        const acts = Object.keys(lib.acts);
        const cur = actEngine.intent.act || $('#handy_act').val();
        $('#handy_act').html(acts.map((a) => `<option ${a === cur ? 'selected' : ''}>${esc(a)}</option>`).join(''));
        if (actEngine.running) $('#handy_intensity').val(actEngine.intent.intensity);
        const akFav = chars.activeKey();
        const favs = pr.favorites.map((f, i) => ({ f, i })).sort((x, y) => (y.f.owner === akFav && !!akFav) - (x.f.owner === akFav && !!akFav));   // the character in control first
        $('#handy_favs').html(`<option value="">— favorites and signature moves —</option>` + favs.map(({ f, i }) => `<option value="${i}">${f.owner ? esc(s.characters?.[f.owner]?.name || 'character') + ' · ' : ''}${esc(f.name)}</option>`).join(''));
        $('#handy_now').text(actEngine.running ? actEngine.describe() : hamp.running ? `pattern: ${hamp.pattern}` : '');
        if (!anyRunning()) $('#handy_live').text('stopped');
        const ak = chars.activeKey(), cur_r = ak ? s.characters?.[ak] : null;
        const pRec = cur_r ? chars.partnerRec() : null;
        $('#handy_who').text(cur_r ? `Style · ${chars.summary(cur_r)}${pRec ? ` + ${pRec.name} (${chars.duet === 'together' ? 'as one' : 'taking turns'})` : ''}` : '');
        const sl = setups.list(), opts = (s.setupName ? '' : '<option value="">— not a saved setup —</option>') + sl.map((x) => `<option value="${esc(x.name)}" ${x.name === s.setupName ? 'selected' : ''}>${esc(x.name)}</option>`).join('');
        $('#handy_setup_sel, #handy_setup').html(opts);
        $('#handy_setup_row').toggle(sl.length > 0);
        const keys = Object.keys(s.characters || {}).sort((a, b) => (s.characters[b].updated || 0) - (s.characters[a].updated || 0));
        const sel = keys.includes($('#handy_char_sel').val()) ? $('#handy_char_sel').val() : (ak && keys.includes(ak) ? ak : keys[0]);
        $('#handy_char_sel').html(keys.length ? keys.map((k) => `<option value="${esc(k)}" ${k === sel ? 'selected' : ''}>${esc(s.characters[k].name)}${k === ak ? ' (in control)' : ''}</option>`).join('') : '<option value="">— no characters yet —</option>');
        const sr = sel ? s.characters[sel] : null;
        const profs = ctx().extensionSettings?.connectionManager?.profiles, names = Array.isArray(profs) ? profs.map((x) => x?.name).filter(Boolean) : [];
        const want = String(s.styleProfile || '');
        $('#handy_style_profile').html(`<option value="">Keywords only (no AI)</option>` + names.map((n) => `<option value="${esc(n)}" ${n === want ? 'selected' : ''}>${esc(n)}</option>`).join('') + (want && !names.includes(want) ? `<option value="${esc(want)}" selected>${esc(want)} (not found: using keywords)</option>` : ''));
        $('#handy_arousal_fill, #handy_arousal_pct').closest('.handy-arousal').toggle(!!s.arousalMeter);
        $('#handy_char_desc').text(sr ? `${describeStyle(sr.traits, sr.learned)}.${sr.custom ? ' Adjusted by you.' : sr.source === 'ai' ? ` Read by your ${s.styleProfile} model${sr.why ? `: ${sr.why}` : '.'}` : sr.hits?.length ? ` From the card: ${sr.hits.slice(0, 8).join(', ')}.` : ' Nothing in the card suggested a style, so it starts balanced.'}${sr.minutes ? ` ${sr.minutes} min together.` : ''}${sr.recaps?.length || sr.now ? ` Last session: ${chars.recap(sr.now && (sr.now.minutes || sr.now.finishes || sr.now.edges) ? sr.now : (sr.recaps?.at(-1) || sr.now))}.` : ''}${sr.loves || sr.nopes ? ` ❤ ${sr.loves} · 👎 ${sr.nopes}.` : ''}` : 'Open a chat with a character and they will get a style.');
        for (const k of Object.keys(TRAITS)) $(`#handy_char_traits input[data-trait="${k}"]`).val(sr ? sr.traits[k] : TRAITS[k].neutral);
        $('#handy_char_traits, #handy_char_reread, #handy_char_forget, #handy_char_delete').toggle(!!sr);
        const c = cal();
        $('#handy_cal_summary').text(c ? `Calibrated${c.at ? ` on ${c.at}` : ''}: your base is device position ${c.base}, your tip ${c.tip}. Tip, base and the stroke limits now refer to your body.` : 'Not calibrated: motion uses the full device range (0 = bottom, 100 = top).');
        $('#handy_lib_summary').html(lib.starter
            ? 'Using starter defaults. Train a library from your scripted videos (see TRAINING.md).'
            : `${acts.length} acts from ${lib.sources} videos (${esc(lib.created || '')}):<br>` +
              Object.entries(lib.acts).map(([k, e]) => `<b>${esc(k)}</b> ${Math.round(e.seconds || 0)}s, ${(e.motifs || []).length} motifs`).join(' · '));
        const trained = Object.entries(pr.acts).filter(([, a]) => a.n > 0);
        $('#handy_profile_summary').text(trained.length
            ? trained.map(([k, a]) => { const x = exploration(pr, k); return `${k}: ${x > 0.6 ? 'still exploring' : x > 0.25 ? 'learning your taste' : 'dialed in'} (${a.n} ratings), speed x${a.rateMul.toFixed(2)}, length x${a.ampMul.toFixed(2)}, ${a.centerShift >= 0 ? 'tip' : 'base'} ${Math.abs(a.centerShift).toFixed(0)}, ★${a.score.toFixed(1)}`; }).join(' · ') + ` · ${Object.keys(pr.motifs).length} phrases and ${Object.keys(pr.trans).length} combos rated`
            : 'Nothing learned yet — use ❤ / 👎 and the adjust buttons while playing.');
    },
    arousal() {
        const pct = Math.round(arousal.level * 100);
        $('#handy_arousal_fill').css('width', pct + '%'); $('#handy_arousal_pct').text(pct + '%');
    },
    live(pos) { $('#handy_live').text(`${actEngine.intent.act || ''} · pos ${Math.round(pos)}`); },
    calib() {
        const c = calib, old = c.prev, saved = cal(), steps = [
            [old ? `Wear the Handy and keep still. Press <b>Start</b> and the sleeve moves slowly to where your tip was last time (${old.tip}). It can take a few seconds; the arrow buttons appear when it gets there. STOP, Esc and the button on the device all work at any point.`
                 : 'Wear the Handy and keep still. Press <b>Start</b> and the sleeve moves slowly to the middle. It can take a few seconds; the arrow buttons appear when it gets there. STOP, Esc and the button on the device all work at any point.', 'Start'],
            [(old ? 'This is where your tip was last time. ' : '') + 'Move the sleeve with the buttons (or the ↑ ↓ keys, Shift for bigger steps) until it sits at your <b>tip</b>: as far out as it should ever go.', 'This is my tip'],
            [old ? 'The sleeve has moved to just short of where your base should be now. Move it to your <b>base</b>: as deep as it should ever go.'
                 : 'Now move it to your <b>base</b>: as deep as it should ever go.', 'This is my base'],
            ['Press <b>Test</b> for two slow full strokes between your base and tip. If they feel right, press <b>Save</b>. Use Back to adjust.', 'Save'],
        ];
        $('#handy_calib').toggle(c.active);
        if (!c.active) return;
        const asking = c.step === -1;
        $('#handy_calib_title').text(asking ? 'New session: same setup?' : 'Calibrate to your body');
        if (asking) {
            $('#handy_calib_text').html(saved
                ? `Your Handy is calibrated${saved.at ? ` (${saved.at})` : ''}: base at ${saved.base}, tip at ${saved.tip}. If it is at the same height and angle as last time, start with that. If you have moved it, recalibrate first (it starts from last time's positions, so it only takes a moment). Nothing moves until you choose.`
                : 'Your Handy is not calibrated, so motion will use the full device range. Calibrate now to fit the strokes to your tip and base, or start without it. Nothing moves until you choose.');
            $('#handy_calib_next').text(saved ? 'Use it and start' : 'Start without calibrating');
            $('#handy_calib_test').text(saved ? 'Recalibrate' : 'Calibrate now');
        } else {
            $('#handy_calib_text').html(steps[c.step][0]);
            $('#handy_calib_next').text(steps[c.step][1]);
            $('#handy_calib_test').text('Test');
        }
        $('#handy_calib .handy-calib-pos').toggle(!asking);
        const sl = setups.list(), cur = S().setupName;
        $('#handy_calib_setup_row').toggle(asking && sl.length > 0);
        $('#handy_calib_setup').html((cur ? '' : '<option value="">— current calibration —</option>') + sl.map((x) => `<option value="${esc(x.name)}" ${x.name === cur ? 'selected' : ''}>${esc(x.name)} (base ${x.base}, tip ${x.tip})</option>`).join(''));
        $('#handy_calib .handy-calib-jog').toggle(c.step === 1 || c.step === 2);
        $('#handy_calib_back').toggle(c.step > 1);
        $('#handy_calib_test').toggle(asking || c.step === 3);
        $('#handy_calib_pos').text(c.pos);
        $('#handy_calib_marks').text([c.moving ? 'moving…' : '', c.tip !== null ? `tip ${c.tip}` : '', c.base !== null ? `base ${c.base}` : ''].filter(Boolean).join(' · '));
        $('#handy_calib_next, #handy_calib_back, #handy_calib_test').toggleClass('disabled', !!c.moving && c.step !== -1);
    },
};

// ---------------------------------------------------------------- boot
jQuery(() => {
    const c = ctx();
    S(); ui.init();
    const ev = c.eventTypes || c.event_types;
    c.eventSource.on(ev.MESSAGE_RECEIVED, handleMessage);
    if (ev.MESSAGE_SENT) c.eventSource.on(ev.MESSAGE_SENT, handleUserMessage);
    // Group chats: before each member writes, give the AI THAT character's style, memory and signature moves.
    if (ev.GROUP_MEMBER_DRAFTED) c.eventSource.on(ev.GROUP_MEMBER_DRAFTED, (chId) => {
        const k = ctx().characters?.[chId]?.avatar;
        if (k && S().charStyles) { chars.speaker = k; updatePrompt(); }
    });
    c.eventSource.on(ev.CHAT_CHANGED, () => { stopAll(); pending = []; edges = 0; chars.who = null; chars.speaker = null; chars.partner = null; chars.current(); ui.refresh(); updatePrompt(); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && S().escStops && anyActive()) stopAll('Esc'); });
    window.addEventListener('beforeunload', () => {
        if (!anyActive()) return;
        epoch++;
        api.call('PUT', '/mode', { mode: 0 }, true).catch(() => {});
        api.hampStop(true).catch(() => {}); api.hsspStop(true).catch(() => {});
        if (S().appId) api3.stop(true).catch(() => {});
    });
    S().profile.sessions++; save(); updatePrompt();
    setInterval(() => arousal.tick(), 1000);
    window.handyAdaptive = { actEngine, hamp, calib, chars, climax, arousal, setups, proseCues, feedback, stop: stopAll, active: anyActive, run: (a) => enqueue(() => runCommand(a)), api, api3, profile: () => S().profile, library: LIB };
});
