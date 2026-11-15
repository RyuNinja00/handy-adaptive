// Handy Adaptive — SillyTavern extension (v0.12.1; also runs in Marinara Engine via marinara/st-compat.js)
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
    videoLinks: true,           // the AI may suggest a video search: a link to the site's own search results
    videoSite: 'pornhub',       // pornhub | xhamster | xvideos
    picLinks: true,             // the AI may suggest a picture search: a link to PornPics search results
    gameMinEdges: 3,            // games: edges the character must take you through before she may end it
    rouletteMinutes: 3,         // porn roulette: minutes between spins
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
    jit: 40,   // how much round trips vary (mean deviation, ms): commands are sent this much earlier
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
        const took = performance.now() - t0;
        api.jit = api.jit * 0.85 + Math.abs(took - api.rtt) * 0.15;
        api.rtt = api.rtt * 0.8 + took * 0.2;
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
    // Positions sent to the device are a share of its stroke range ("slide"). A range narrowed by the Handy app,
    // the device's buttons or an old pattern tag would squeeze every stroke and shift the calibration, so
    // the full range is restored whenever acts or calibration start. Your limits are applied here instead.
    fullRange: () => api.slide(0, 100).catch(() => {}),
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

    // Streaming sends one command per stroke over the internet: a stroke shorter than the connection can
    // deliver cleanly would stutter, so on a slow link the fastest strokes are stretched a little.
    limits() { const [floor, ceil] = strokeRange(); return { floor, ceil, maxVel: capBody(), minMs: S().transport === 'hdsp' ? Math.round(clamp(api.rtt <= 260 ? 0.45 * api.rtt : 117 + (api.rtt - 260), 80, 320)) : 60 }; },
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
            await api.fullRange();
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
        if (idleOver(now)) return stopAll('idle timeout');
        implicitLearn();
        const tail = this.buf[this.buf.length - 1];
        if (tail && tail.at - now < 8000) {
            const g = this.gen_(tail.at, tail.pos, 20000);
            this.buf.push(...g.actions.slice(1)); this.used.push(...g.used);
            settlePhrases();
            this.used = this.used.filter((u) => u.to > now - 30000);
        }
        // Streaming depends on the connection. On a slow or uneven one, say so once: Script sync plays on the device.
        if (!this.slowTold && now - this.startedAt > 15000 && (api.rtt > 320 || api.jit > 110)) {
            this.slowTold = true;
            toast(`Your connection to the Handy is slow or uneven (about ${Math.round(api.rtt)} ms per command), which can make Streaming feel choppy. Motion transport → Script sync is smoother on a connection like this.`, 'warning');
        }
        if (this.buf.length < 2 || this.inflight >= 2) return;   // at most two commands on the wire
        const lead = api.rtt / 2;                                // one-way trip to the device
        const prev = this.buf[0];
        if (now < prev.at - lead) return;
        // One command per stroke: points in the middle of a stroke would each make the device stop and wait
        // for the next command. Send the whole run to its turning point (Script sync and Buffered streaming
        // keep the finer shape, because the device plays those itself).
        while (this.buf.length > 2) {
            const d1 = this.buf[1].pos - prev.pos, d2 = this.buf[2].pos - this.buf[1].pos;
            if (!d1 || !d2 || Math.sign(d1) !== Math.sign(d2) || this.buf[2].at - prev.at > 3000) break;
            this.buf.splice(1, 1);
        }
        const next = this.buf[1];
        // The command lands at `arrive`. Nothing here is synced to a video, so when we are behind
        // (slow network, throttled tab) the plan slides later; strokes are never skipped and never
        // squeezed into less time. A stroke runs at most ~10% faster than planned and never above the cap.
        const arrive = now + lead;
        const from = this.estPos(arrive);
        // On a fresh start the device could be at either end (after power-on, or moved by the Handy app),
        // so the first move is timed for the longest trip it might really make.
        const dev = toDev(next.pos);
        // The sleeve may have glided on past `from` toward the last aim if this command is late (see run-on
        // below), so the speed cap is checked against the longest trip it could really have to make.
        const far = this.seg ? toDev(this.seg.p1) : toDev(from);
        const travel = this.known ? Math.max(Math.abs(dev - toDev(from)), Math.abs(dev - far)) : Math.max(dev, 100 - dev);   // device %
        const floor = Math.max(50, 0.9 * (next.at - prev.at), (travel / maxVel()) * 1000);
        let dur = next.at - arrive;
        if (dur < floor) { this.shift(floor - dur, 1); dur = floor; }
        // Run-on: every command travels over the internet and lands a little early or late. If the stroke
        // ended exactly at its turning point, a late command would leave the sleeve standing still until it
        // arrived, and that standing still at every turn is what feels choppy. So when the next stroke
        // reverses, this one is aimed a little past its turning point at the same speed: on time, the next
        // command catches the sleeve right at the turn; late, the sleeve is still gliding. The run-on never
        // leaves your stroke limits, is never faster than the stroke itself, and is not used before a pause.
        let aim = next.pos, sendDur = dur;
        const after = this.buf[2], span1 = next.pos - from;
        if (this.known && after && Math.abs(span1) > 2 && Math.sign(after.pos - next.pos) === -Math.sign(span1)) {
            const [lo, hi] = strokeRange();
            const slack = clamp(2 * api.jit + 20, 30, 220);                         // ms of glide to cover a late command
            aim = clamp(next.pos + (span1 / dur) * slack, lo, hi);
            sendDur = dur * ((aim - from) / span1);
        }
        this.seg = { p0: from, t0: arrive, p1: aim, t1: arrive + sendDur };
        this.known = true;
        this.buf.shift();
        this.inflight++;
        api.xpt(toDev(aim), sendDur).then(() => { this.fails = 0; }, (e) => this.sendFailed(e)).finally(() => { this.inflight--; });
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
            if (!swapping) { await api.mode(1); await api.fullRange(); }
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
            if (idleOver(Date.now())) return stopAll('idle timeout');
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
        if (idleOver(now)) return stopAll('idle timeout');
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
        if (idleOver(Date.now())) return stopAll('idle timeout');
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
// Idle stop. During a game you're watching rather than typing, so it waits at least 20 minutes.
function idleOver(now) {
    const sec = num(S().idleStopSec);
    if (!(sec > 0)) return false;
    return now - lastActivity > (game.active ? Math.max(sec, 1200) : sec) * 1000;
}
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

// ---------------------------------------------------------------- video search links
// A tag's search="TERMS" becomes a link to the chosen site's own search results (never a specific video,
// and nothing is fetched). Words that point at minors or at non-consensual material are removed from
// every query first; if nothing is left, no link is made.
const VIDEO_SITES = {
    pornhub: { name: 'Pornhub', url: (q) => `https://www.pornhub.com/video/search?search=${encodeURIComponent(q).replace(/%20/g, '+')}` },
    xhamster: { name: 'xHamster', url: (q) => `https://xhamster.com/search/${encodeURIComponent(q).replace(/%20/g, '+')}` },
    xvideos: { name: 'XVideos', url: (q) => `https://www.xvideos.com/?k=${encodeURIComponent(q).replace(/%20/g, '+')}` },
};
const PIC_SITE = { name: 'PornPics', url: (q) => `https://www.pornpics.com/?q=${encodeURIComponent(q).replace(/%20/g, '+')}` };
const SEARCH_BLOCK = /\b(teens?|teenage\w*|tee?ny|underage\w*|minors?|young\w*|youth|little|tiny|kids?|child\w*|school\w*|students?|high ?school|barely|legal|loli\w*|shota\w*|babysitter\w*|daughter\w*|son|sister|brother|niece|nephew|incest\w*|family|virgin\w*|1[0-8]|eighteen|nineteen|years? old|hidden|spy\w*|voyeur\w*|upskirt\w*|creep\w*|leak\w*|stolen|revenge|drunk\w*|passed out|sleep\w*|asleep|unconscious|forc\w*|rap(e|ed|ing)|non ?con\w*|abus\w*|real (coworker|colleague|boss|neighbou?r)s?)\b/g;
function cleanQuery(q) {
    const t = String(q || '').toLowerCase().replace(/[’`]/g, "'").replace(/[^\p{L}\p{N}\s'-]/gu, ' ');
    return t.replace(SEARCH_BLOCK, ' ').replace(/\s+/g, ' ').trim().split(' ').slice(0, 8).join(' ');
}
const videos = {
    list: [],   // the latest suggestions, newest last
    // search= → a video search; pics= → a picture search on PornPics
    make(a) {
        const out = [];
        if (S().videoLinks && a.search && a.search !== true) {
            const q = cleanQuery(a.search);
            const key = VIDEO_SITES[String(a.site || '').toLowerCase()] ? String(a.site).toLowerCase() : (VIDEO_SITES[S().videoSite] ? S().videoSite : 'pornhub');
            if (q) out.push({ q, site: VIDEO_SITES[key].name, url: VIDEO_SITES[key].url(q), at: Date.now(), icon: '🔗' });
        }
        if (S().picLinks && a.pics && a.pics !== true) {
            const q = cleanQuery(a.pics);
            if (q) out.push({ q, site: PIC_SITE.name, url: PIC_SITE.url(q), at: Date.now(), icon: '📷' });
        }
        for (const v of out) { this.list.push(v); if (this.list.length > 5) this.list.shift(); }
        return out;
    },
    md(v) { return `${v.icon} [${v.q} (${v.site} search)](${v.url})`; },
    text() {
        const L = [];
        if (S().videoLinks) L.push(`add search="SHORT SEARCH TERMS" to a tag for a video (e.g. search="milf black lace lingerie POV"): the user gets a link to ${VIDEO_SITES[S().videoSite]?.name || 'Pornhub'}'s search results`);
        if (S().picLinks) L.push(`add pics="SHORT SEARCH TERMS" for pictures (e.g. pics="white cotton cheeky panties ass"): a link to PornPics search results, great for showing a cut, fabric or body part`);
        if (!L.length) return '';
        return `- Suggestions: when it would help, ${L.join('; or ')}. Tell them what to look for. Describe adult performers only: never ages, "teen", young-sounding or family words, and nothing non-consensual (they are removed anyway).`;
    },
};

// ---------------------------------------------------------------- focus learning
// What you are watching while you play is learned like the motion is. Tags may carry scene="WHAT KIND OF
// SCENE" and watch="WHAT TO FOCUS ON"; every second with the device moving, every edge, ❤, 👎, beg and
// finish is credited to what was on screen (each exact phrase, the scene, and broad tags such as "eye
// contact" read from the words). Finishes also credit what was on screen in the 90 s before, by time
// share. The AI is told what has made you finish, what gets you to the edge fastest, what keeps you
// simmering, and what does nothing for you, with a strategy for the game being played.
const FOCUS_TAGS = [
    ['eye contact', /\b(eyes?|eye contact|stares?|staring|gaze|looking (at|into) (the )?(camera|lens|you))\b/],
    ['mouth & lips', /\b(mouth|lips?|tongue|licks?|licking|spit|drool\w*|sloppy|kiss\w*)\b/],
    ['going deep', /\b(deep|deeper|throat\w*|gag\w*|all the way|to the base|takes? it all)\b/],
    ['breasts', /\b(breasts?|tits?|titties|boobs?|nipples?|cleavage)\b/],
    ['ass', /\b(ass|butt|booty|bum)\b/],
    ['curves & thighs', /\b(thighs?|hips?|curv\w*|thick|belly|plump|bbw|soft body)\b/],
    ['pussy', /\b(pussy|pussies|labia|clit\w*)\b/],
    ['face & expressions', /\b(face|faces|expressions?|blush\w*|smil\w*|smirk\w*)\b/],
    ['sounds & voice', /\b(sounds?|moan\w*|voice|whimper\w*|gasp\w*|dirty talk|talking|begs?|begging|squeal\w*)\b/],
    ['POV & close-ups', /\b(pov|close[- ]?ups?|camera|angle|from above|from below)\b/],
    ['cum', /\b(cum\w*|facial|creampie|swallow\w*|load)\b/],
    ['mature women', /\b(milfs?|mature|moms?|mommy|mother|older|cougars?|wrinkles?|experienced)\b/],
    ['hands', /\b(hands?|fingers?|grip\w*|handjob)\b/],
    ['riding', /\b(rid(e|es|ing)|bounc\w*|cowgirl|grind\w*)\b/],
    ['wetness', /\b(wet|dripping|glisten\w*|slick|sweat\w*|messy)\b/],
    ['teasing', /\b(teas\w*|slow(ly)?|denial)\b/],
    ['legs & feet', /\b(feet|foot|toes|legs?|stockings?|heels)\b/],
];
// Facets: the kinds of thing she can name on a tag to learn your taste by type. Panties are also read
// into their cut, fabric and color, so "black lace thong" teaches all three.
const FACETS = { woman: 'Women', outfit: 'Outfits', fantasy: 'Fantasies', talk: 'Dirty talk', panties: 'Panties', cut: 'Panty cuts', fabric: 'Fabrics', color: 'Colors' };
const PANTY_PARTS = {
    cut: [['thong', /\bthongs?\b/], ['g-string', /\bg[- ]?strings?\b/], ['cheeky', /\bcheek(y|ies)\b/], ['boyshorts', /\bboy ?shorts?\b/], ['briefs', /\bbriefs?\b/],
        ['high-cut', /\bhigh[- ]?(cut|leg)\b/], ['bikini', /\bbikinis?\b/], ['hipster', /\bhipsters?\b/], ['crotchless', /\bcrotchless\b/], ['tanga', /\btangas?\b/], ['french cut', /\bfrench[- ]?cut\b/]],
    fabric: [['lace', /\blace\b/], ['satin', /\bsatin\b/], ['silk', /\bsilk\w*/], ['cotton', /\bcotton\b/], ['mesh', /\bmesh\b/], ['sheer', /\b(sheer|see[- ]?through)\b/],
        ['latex', /\b(latex|vinyl|pvc)\b/], ['velvet', /\bvelvet\b/], ['fishnet', /\bfishnet\b/], ['microfiber', /\bmicrofib(er|re)\b/]],
    color: [['black', /\bblack\b/], ['white', /\bwhite\b/], ['red', /\bred\b/], ['pink', /\bpink\b/], ['purple', /\b(purple|lilac|lavender)\b/], ['blue', /\b(blue|navy)\b/],
        ['nude', /\b(nude|beige|skin[- ]?tone)\b/], ['leopard', /\b(leopard|animal print)\b/], ['green', /\b(green|emerald)\b/], ['yellow', /\byellow\b/]],
};
const focus = {
    cur: null,      // { phrase, scene, tags, act, since, lastEdge }
    prev: [],       // what was on screen before, with when it ended (last 2 minutes)
    unsaved: 0,
    store() { return (S().profile.focus ??= { items: {}, finishes: [], sec: 0, edges: 0 }); },
    tagsOf(text) { const t = norm(text); return t ? FOCUS_TAGS.filter(([, re]) => re.test(t)).map(([k]) => k) : []; },
    keys(f) {
        if (!f) return [];
        const k = [];
        if (f.phrase) k.push(['w:' + norm(f.phrase), f.phrase, { scene: f.scene, act: f.act }]);
        if (f.scene) k.push(['s:' + norm(f.scene), f.scene]);
        for (const t of f.tags) k.push(['t:' + t, t]);
        for (const [fa, v] of Object.entries(f.facets || {})) if (v) {
            k.push([`f:${fa}:${norm(v)}`, v]);
            if (fa === 'panties') for (const [part, list] of Object.entries(PANTY_PARTS)) for (const [name, re] of list) if (re.test(norm(v))) k.push([`f:${part}:${name}`, name]);
        }
        return k;
    },
    item(key, label, extra) {
        const it = (this.store().items[key] ??= { label, sec: 0, edges: 0, finishes: 0, loves: 0, nopes: 0, begs: 0, toEdge: 0, toEdgeN: 0, last: 0 });
        it.label = label; if (extra?.scene) it.scene = extra.scene; if (extra?.act) it.act = extra.act;
        return it;
    },
    // A tag's scene= and/or watch=: a new focus begins (a new scene without a new watch clears the old watch).
    set(a) {
        const val = (x, n) => (x && x !== true ? String(x).trim().slice(0, n) : null);
        const watch = val(a.watch, 120), scene = val(a.scene, 80);
        const fac = {}; for (const fa of ['woman', 'outfit', 'fantasy', 'talk', 'panties']) { const v = val(a[fa], 80); if (v) fac[fa] = v; }
        if (!watch && !scene && !Object.keys(fac).length) return false;
        const c = this.cur, now = Date.now();
        const next = { phrase: watch ?? (scene ? '' : c?.phrase || ''), scene: scene ?? c?.scene ?? '', facets: { ...(scene ? {} : c?.facets), ...(scene ? { talk: c?.facets?.talk } : {}), ...fac } };
        if (c && next.phrase === c.phrase && next.scene === c.scene && JSON.stringify(next.facets) === JSON.stringify(c.facets || {})) return false;
        if (c) { this.prev.push({ ...c, until: now }); this.prev = this.prev.filter((p) => now - p.until < 120000); }
        this.cur = { ...next, tags: this.tagsOf(`${next.scene} ${next.phrase}`), act: a.act && a.act !== true ? String(a.act) : actEngine.intent.act, since: now, lastEdge: now };
        const newScene = !!scene && scene !== c?.scene;
        if (fac.panties) this.drawerAdd(fac.panties);
        ui.refresh();
        return newScene ? 'scene' : 'watch';
    },
    clear() { if (this.cur) this.prev.push({ ...this.cur, until: Date.now() }); this.cur = null; },
    tick(dt) {
        if (!this.cur || !anyRunning()) return;
        for (const [k, l, x] of this.keys(this.cur)) { const it = this.item(k, l, x); it.sec += dt; it.last = Date.now(); }
        this.store().sec += dt;
        if ((this.unsaved += dt) >= 15) { this.unsaved = 0; this.prune(); save(); }
    },
    // kind: edges | finishes | loves | nopes | begs. The focus on screen gets full credit; for a finish, what
    // was on screen in the last 90 s shares it by time, and for anything else the one just before (if it
    // changed under 20 s ago) gets half.
    credit(kind) {
        const now = Date.now(), c = this.cur, st = this.store();
        const parts = [];
        if (kind === 'finishes') {
            const win = 90000, from = now - win;
            // what you said "not this" to in its time on screen gets no share of the finish
            const spans = [...this.prev.filter((p) => p.until > from && !p.nopes), ...(c ? [{ ...c, until: now }] : [])]
                .map((p) => ({ f: p, ms: Math.max(0, p.until - Math.max(p.since, from)) })).filter((x) => x.ms > 0);
            // what was on screen at the moment counts most (at least 60%); the rest share the remainder by time
            const tot = spans.reduce((s, x) => s + x.ms, 0), curSpan = spans.find((x) => x.f.until === now && c);
            const curW = curSpan ? Math.max(0.6, curSpan.ms / tot) : 0, restMs = tot - (curSpan?.ms || 0);
            for (const x of spans) parts.push([x.f, x === curSpan ? curW : restMs ? ((1 - curW) * x.ms) / restMs : 0]);
        } else {
            if (c) parts.push([c, 1]);
            const p = this.prev.at(-1);
            if (p && now - p.until < 20000) parts.push([p, 0.5]);
        }
        const seen = new Map();   // a key shared by two focuses (a tag, a scene) takes the larger share once
        for (const [f, w] of parts) for (const [k, l, x] of this.keys(f)) if (!seen.has(k) || seen.get(k)[1] < w) seen.set(k, [l, w, x]);
        for (const [k, [l, w, x]] of seen) this.item(k, l, x)[kind] += w;
        if (kind === 'nopes' && c) c.nopes = (c.nopes || 0) + 1;
        if (kind === 'finishes') this.lastFinish = { t: now, seen, mode: game.active ? game.mode : null };
        if (!parts.length) return;   // nothing on screen: nothing to learn about what you watch
        if (kind === 'edges') {
            st.edges++;
            if (c) {
                const secs = (now - Math.max(c.since, c.lastEdge)) / 1000;
                if (secs > 5 && secs < 1800) for (const [k, l] of this.keys(c)) { const it = this.item(k, l); it.toEdge += secs; it.toEdgeN++; }
                c.lastEdge = now;
            }
        }
        if (kind === 'finishes') {
            st.finishes.push({ t: now, act: actEngine.running ? actEngine.intent.act : null, phrase: c?.phrase || '', scene: c?.scene || '',
                tags: c?.tags || [], edges: game.active ? game.edges : edges, minutes: game.active ? +game.minutes().toFixed(1) : null,
                game: game.active ? game.mode : null, intensity: actEngine.running ? +actEngine.intent.intensity.toFixed(2) : null });
            if (st.finishes.length > 40) st.finishes.shift();
        }
        save();
    },
    // Keep what's learned to a sensible size: past 600 entries, the least useful (and oldest) go.
    prune(max = 600) {
        const items = this.store().items, keys = Object.keys(items);
        if (keys.length <= max) return;
        const worth = (it) => 5 * it.finishes + 2 * it.edges + it.loves + it.nopes + it.sec / 120;
        keys.sort((a, b) => worth(items[a]) - worth(items[b]) || items[a].last - items[b].last);
        for (const k of keys.slice(0, keys.length - Math.floor(max * 0.9))) delete items[k];
    },
    heat(it) { return (2 * it.edges + 5 * it.finishes + 3 * (it.big || 0) + it.loves + 0.5 * it.begs - 2 * it.nopes) / (it.sec / 60 + 2); },
    // Every pair of panties named in a game goes in your drawer.
    drawer() { return (S().profile.drawer ??= {}); },
    drawerAdd(v) {
        const d = this.drawer(), k = norm(v), had = Object.keys(d).length;
        if (!d[k]) d[k] = { label: v, at: Date.now() };
        this.lastPanties = v;
        if (Object.keys(d).length >= 10 && (had < 10 || !secrets.found().drawer)) secrets.fire('drawer');
    },
    // How big was it? Rated after a finish: what was on screen gets extra credit for a big one.
    rateLoad(size) {
        const lf = this.lastFinish, st = this.store(), fin = st.finishes.at(-1);
        if (!lf || Date.now() - lf.t > 300000) return;
        const bonus = { small: 0, good: 0.5, huge: 1 }[size] ?? 0;
        for (const [k, [l, w, x]] of lf.seen) { const it = this.item(k, l, x); it.finishes += w * bonus; if (size === 'huge') it.big = (it.big || 0) + w; }
        if (fin && fin.t >= lf.t - 1000) fin.load = size;
        this.lastFinish = null; save();
        logEvent('load-' + size);
        play.onLoad(size, lf.mode);
        ui.refresh(); updatePrompt();
    },
    // The learned picture, ranked. Each list mixes exact phrases, scenes and tags.
    // The learned picture. Specific focuses (each with the scene it was in) are ranked in four lists;
    // the broad themes behind them are ranked separately, since they carry over to new scenes.
    insights() {
        const st = this.store(), all = Object.entries(st.items).map(([k, it]) => ({ k, ...it, heat: this.heat(it) }));
        const phrased = new Set(all.filter((x) => x.k.startsWith('w:') && x.scene).map((x) => 's:' + norm(x.scene)));
        const spec = all.filter((x) => x.k.startsWith('w:') || (x.k.startsWith('s:') && !phrased.has(x.k)));
        // A focus can be both a finisher and fast to the edge (worth knowing); slow burners are only the rest.
        const finishers = spec.filter((x) => x.finishes >= 0.5).sort((a, b) => b.finishes - a.finishes || b.heat - a.heat).slice(0, 5);
        const edgers = spec.filter((x) => x.toEdgeN >= 2).sort((a, b) => a.toEdge / a.toEdgeN - b.toEdge / b.toEdgeN).slice(0, 4);
        const used = new Set([...finishers, ...edgers].map((x) => x.k)), take = (xs, n) => xs.filter((x) => !used.has(x.k)).slice(0, n).map((x) => (used.add(x.k), x));
        const burners = take(spec.filter((x) => x.loves >= 1 && x.sec >= 60 && x.loves > x.nopes).sort((a, b) => b.loves / (b.edges + 1) - a.loves / (a.edges + 1)), 4);
        const duds = take(spec.filter((x) => x.nopes >= 1.5 && x.nopes > x.loves + x.edges).sort((a, b) => b.nopes - a.nopes), 4);
        const themes = all.filter((x) => x.k.startsWith('t:') && x.sec >= 60).sort((a, b) => b.heat - a.heat);
        const hot = themes.filter((x) => x.heat > 0.3).slice(0, 5), cold = themes.filter((x) => x.heat < 0 && !hot.includes(x)).slice(-3).reverse();
        const untried = FOCUS_TAGS.map(([t]) => t).filter((t) => !(st.items['t:' + t]?.sec >= 30));
        const F = st.finishes, count = (xs) => Object.entries(xs.reduce((m, x) => (x ? ((m[x] = (m[x] || 0) + 1), m) : m), {})).sort((a, b) => b[1] - a[1]);
        const acts = count(F.map((f) => f.act)), tags = count(F.flatMap((f) => f.tags));
        const mins = F.map((f) => f.minutes).filter((x) => x != null);
        const facets = {};
        for (const fa of Object.keys(FACETS)) {
            const xs = all.filter((x) => x.k.startsWith(`f:${fa}:`) && (x.sec >= 45 || x.finishes || x.edges));
            if (!xs.length) continue;
            const best = xs.filter((x) => x.heat > 0.2 || x.finishes >= 0.5).sort((a, b) => b.heat - a.heat).slice(0, 3);
            const worst = xs.filter((x) => x.heat < 0 && !best.includes(x)).sort((a, b) => a.heat - b.heat).slice(0, 2);
            if (best.length || worst.length) facets[fa] = { best, worst };
        }
        const loads = count(F.map((f) => f.load)), huge = F.filter((f) => f.load === 'huge');
        return { st, finishers, edgers, burners, duds, hot, cold, untried, acts, tags, facets, loads, huge, edgesBefore: F.length ? median(F.map((f) => f.edges || 0)) : null, minutes: mins.length ? median(mins) : null, n: F.length };
    },
    name(x) { return x.k.startsWith('w:') ? `"${x.label}"${x.scene ? ` in a ${x.scene} scene` : ''}` : `a ${x.label} scene`; },
    text() {
        const I = this.insights(), st = I.st;
        if (!Object.keys(st.items).length || (st.sec < 60 && !I.n && st.edges < 2)) return '';
        const r = (v) => Math.round(v * 10) / 10, pl = (v, w) => `${r(v)} ${w}${r(v) === 1 ? '' : (w.endsWith('h') ? 'es' : 's')}`;
        const n = (x, f) => `${this.name(x)} (${f(x)})`;
        const L = [`WHAT GETS THE USER OFF (learned from ${Math.round(st.sec / 60)} min of watching porn with you, ${pl(I.n, 'finish')}, ${pl(st.edges, 'edge')}). Use it deliberately:`];
        if (I.finishers.length) L.push(`- FINISHERS, on screen when they came: ${I.finishers.map((x) => n(x, (y) => pl(y.finishes, 'finish'))).join('; ')}.`);
        if (I.n) L.push(`- Their finishes usually come${I.acts[0] ? ` during ${I.acts[0][0]}` : ''}${I.tags[0] ? `, with ${I.tags.slice(0, 2).map((t) => t[0]).join(' and ')} on screen` : ''}${I.edgesBefore != null ? `, after about ${pl(Math.round(I.edgesBefore), 'edge')}` : ''}${I.minutes != null ? ` and ~${Math.round(I.minutes)} min` : ''}.`);
        if (I.edgers.length) L.push(`- FASTEST TO THE EDGE: ${I.edgers.map((x) => n(x, (y) => `~${Math.round(y.toEdge / y.toEdgeN)} s to the edge`)).join('; ')}.`);
        if (I.burners.length) L.push(`- SLOW BURNERS, loved but they keep them simmering: ${I.burners.map((x) => n(x, (y) => `❤ ${r(y.loves)}`)).join('; ')}.`);
        if (I.duds.length) L.push(`- DOES LITTLE FOR THEM (avoid): ${I.duds.map((x) => n(x, (y) => `👎 ${r(y.nopes)}`)).join('; ')}.`);
        if (I.hot.length || I.cold.length) L.push(`- THEMES (carry these into new scenes): ${I.hot.length ? `strongest ${I.hot.map((x) => x.label).join(', ')}` : ''}${I.hot.length && I.cold.length ? '; ' : ''}${I.cold.length ? `weakest ${I.cold.map((x) => x.label).join(', ')}` : ''}.`);
        const fl = Object.entries(I.facets).map(([fa, v]) => `${FACETS[fa]}: ${v.best.length ? `best ${v.best.map((x) => `${x.label}${x.finishes >= 0.5 ? ` (${pl(x.finishes, 'finish')}${x.big ? `, 🌊 ${r(x.big)}` : ''})` : ''}`).join(', ')}` : ''}${v.best.length && v.worst.length ? '; ' : ''}${v.worst.length ? `least ${v.worst.map((x) => x.label).join(', ')}` : ''}`);
        if (fl.length) L.push(`- HIS TASTE BY TYPE (lean on the best, avoid the least, and keep varying to learn more): ${fl.join(' | ')}.`);
        if (I.huge.length) { const h = I.huge.at(-1); L.push(`- His HUGEST loads came${h.act ? ` during ${h.act}` : ''}${h.phrase ? ` with "${h.phrase}" on screen` : ''}${h.scene ? ` (${h.scene})` : ''}. ${I.huge.length > 1 ? `${I.huge.length} huge ones so far.` : ''}`); }
        if (I.untried.length) L.push(`- Not tried yet: ${I.untried.slice(0, 4).join(', ')}. Try one now and then, to learn more.`);
        const strat = {
            edging: 'Edge them over and over with the fastest-to-the-edge focuses, then pull back. Hold the finishers back: bring one out only when you allow it, or right before a ruin or a denial so it hurts more.',
            roulette: 'Mix it: slip a fast-to-the-edge scene in when they least expect it, a slow burner when they need to recover. Save a finisher for the very last spin.',
            mommy: 'Early on, slow burners to build his stamina. Near his goal, the fast-to-the-edge ones to test him. At the finish, his top finisher: tell him to look right at it as he cums for mommy.',
            trance: 'Stay with slow burners to keep them floating on the plateau; a fast-to-the-edge one only if they drift down. A finisher only at the very end.',
        }[game.active ? game.mode : ''] || 'Warm them up with slow burners, use the fastest-to-the-edge focuses when you want them close, and save the finishers for when you want them to cum: switch to one right as you push them over.';
        L.push(`STRATEGY: ${strat}`);
        return L.join('\n');
    },
    summary() {
        const I = this.insights();
        if (!Object.keys(I.st.items).length) return 'Nothing learned yet. Add a scene and a focus while you watch (the games do it for you).';
        const part = (h, xs) => (xs.length ? `${h}: ${xs.slice(0, 3).map((x) => this.name(x)).join(', ')}. ` : '');
        return `${Math.round(I.st.sec / 60)} min watched, ${I.n} finish${I.n === 1 ? '' : 'es'}, ${I.st.edges} edge${I.st.edges === 1 ? '' : 's'}. ` + part('Finishers', I.finishers) + part('Fastest to the edge', I.edgers) + part('Slow burners', I.burners) + part('Avoid', I.duds) + (I.hot.length ? `Strongest themes: ${I.hot.slice(0, 3).map((x) => x.label).join(', ')}.` : '');
    },
};

// ---------------------------------------------------------------- games
// You start one from the panel; the character runs it in her own voice through the injected prompt.
//  - edging:   a gooning session. Dirty talk, porn she picks (the device plays the same act), edge after
//              edge; she alone decides the end: <handy game="allow"/>, "ruin" or "deny".
//  - roulette: she switches the scene every few minutes (the extension calls the spin); each new scene
//              starts fast. Scenes you get through without edging are counted. Same endings as edging.
//  - trance:   a long, slow, hypnotic plateau. Intensity is capped, "I'm close" eases off only a little,
//              and time on the edge is the score. One ending: a big finish.
//  - mommy:    stamina training. She plays your mommy, keeps you on MILF porn and edging toward a goal a
//              little longer than you usually last; one ending, an intense finish.
const GAMES = { edging: 'Edging game', roulette: 'Porn roulette', trance: 'Goon trance', mommy: "Mommy's stamina training",
    fucktoy: 'Fucktoy', daddy: "Daddy's girl", rivalry: 'Two-girl rivalry', party: 'Watch party', cuckqueen: 'Cuckqueen', panties: 'Panty game' };
const ONE_ENDING = new Set(['mommy', 'trance', 'fucktoy', 'daddy', 'rivalry', 'party', 'cuckqueen', 'panties']);   // the rest can also ruin or deny
const PERMISSION = new Set(['edging', 'roulette', 'trance', 'mommy', 'daddy', 'rivalry']);   // cumming before it's allowed counts as slipping
const BEGGING = new Set(['edging', 'roulette', 'trance', 'mommy', 'rivalry']);              // "Finish me" is begging, not a push
const median = (xs) => { const v = [...xs].sort((x, y) => x - y), n = v.length; return n ? (n % 2 ? v[(n - 1) / 2] : (v[n / 2 - 1] + v[n / 2]) / 2) : 0; };
const fmtMin = (sec) => `${Math.floor(sec / 60)}:${String(Math.floor(sec % 60)).padStart(2, '0')}`;
const game = {
    active: false, mode: 'edging', t0: 0, edges: 0, begs: 0, ruinTimer: null, clock: null, spinTimer: null,
    scenes: 0, survived: 0, sceneEdges: 0, edgeSec: 0,
    get watch() { return focus.cur?.phrase || ''; },
    stats(mode = this.mode) {
        const pr = S().profile;
        if (mode === 'mommy') return (pr.mommy ??= { played: 0, allowed: 0, slipped: 0, quit: 0, edges: 0, lasted: [], best: 0 });
        if (mode === 'roulette') return (pr.roulette ??= { played: 0, allowed: 0, ruined: 0, denied: 0, slipped: 0, quit: 0, edges: 0, bestSurvived: 0 });
        if (mode === 'trance') return (pr.trance ??= { played: 0, allowed: 0, slipped: 0, quit: 0, edges: 0, bestEdgeSec: 0, bestMinutes: 0 });
        if (mode !== 'edging') return ((pr.gameStats ??= {})[mode] ??= { played: 0, allowed: 0, finished: 0, slipped: 0, quit: 0, edges: 0 });
        return (pr.games ??= { played: 0, allowed: 0, ruined: 0, denied: 0, slipped: 0, quit: 0, edges: 0 });
    },
    minEdges() { return clamp(Math.round(num(S().gameMinEdges)) || 0, 0, 30); },
    spinMs() { return clamp(num(S().rouletteMinutes) || 3, 1, 15) * 60000; },
    // Stamina goal in minutes: a little past what you usually last (median of your last 3).
    target() {
        const l = this.stats('mommy').lasted || [];
        if (!l.length) return 10;
        const m = median(l.slice(-3));
        return clamp(Math.round(Math.max(m * 1.1, m + 1)), 5, 120);
    },
    minutes() { return (Date.now() - this.t0) / 60000; },
    start(mode = this.mode) {
        if (this.active || !S().enabled) return;
        this.stopTimers();
        Object.assign(this, { active: true, mode: GAMES[mode] ? mode : 'edging', t0: Date.now(), edges: 0, begs: 0, scenes: 0, survived: 0, sceneEdges: 0, edgeSec: 0, toldToSend: false });
        if (this.mode === 'mommy') this.goal = this.target();
        play.onStart(this.mode);
        this.stats().played++; save();
        this.clock = setInterval(() => { if (this.active) { ui.refresh(); updatePrompt(); } }, 30000);   // keep the minutes current
        if (this.mode === 'roulette') this.spinTimer = setInterval(() => this.spin(), this.spinMs());
        logEvent('game-start'); ui.refresh(); updatePrompt();
        this.nudge(`${GAMES[this.mode]} on. Send a message and she will start it.`);   // she opens the game
    },
    spin() {
        if (!this.active || this.mode !== 'roulette' || climax.active || !anyRunning()) return;   // no spin while you've stopped it
        if (this.scenes >= 2 && play.rand() < 0.25 && !secrets.session.has('double-spin')) {
            const others = Object.keys(LIB().acts).filter((a) => a !== actEngine.intent.act && a !== 'teasing');
            const b = others[Math.floor(play.rand() * others.length)];
            if (b && secrets.fire('double-spin')) { enqueue(() => actEngine.running && actEngine.apply({ blend: `${b}:0.5`, intensity: 0.75 })); return; }
        }
        logEvent('roulette-spin'); updatePrompt();
        this.nudge('Porn roulette: new scene! Send a message for it.');
    },
    // A new scene during roulette: count it, and whether you got through the last one without an edge.
    newScene() {
        if (!this.active || this.mode !== 'roulette') return;
        if (this.scenes > 0 && this.sceneEdges === 0) { this.survived++; this.surviveRun = (this.surviveRun || 0) + 1; } else if (this.scenes > 0) this.surviveRun = 0;
        this.scenes++; this.sceneEdges = 0;
        if (this.surviveRun >= 3) {
            const top = focus.insights().finishers[0];
            if (secrets.fire('jackpot', top ? ` (${focus.name(top)})` : '') && top?.act && LIB().acts[top.act]) enqueue(() => actEngine.running && actEngine.apply({ act: top.act, intensity: 0.8 }));
        }
    },
    tick(dt) { if (this.active && this.mode === 'trance' && anyRunning() && arousal.level >= 0.75) this.edgeSec += dt; play.tick(dt); },
    // Her reaction to a panel button, after a short pause (several presses make one reply). Where an
    // extension can't start a reply (Marinara), you're told once per game to send a message.
    reply(ms) {
        clearTimeout(replyTimer);
        replyTimer = setTimeout(async () => {
            try { await ctx().executeSlashCommandsWithOptions('/trigger'); }
            catch { if (!this.toldToSend) { this.toldToSend = true; toast('Send a message to hear her react (this chat app can\'t start her reply on its own).', 'info'); } }
        }, ms);
    },
    // Ask for a reply now; where an extension can't (Marinara), tell you to send one.
    nudge(msg) {
        clearTimeout(replyTimer);
        replyTimer = setTimeout(async () => { try { await ctx().executeSlashCommandsWithOptions('/trigger'); } catch { toast(msg, 'info'); } }, 300);
    },
    stopTimers() { clearTimeout(this.ruinTimer); clearInterval(this.clock); clearInterval(this.spinTimer); play.clear(); },
    // outcome: allowed | ruined | denied | slipped (came without permission) | quit (you ended it)
    end(outcome) {
        if (!this.active) return;
        this.active = false; this.asking = false; clearInterval(this.clock); clearInterval(this.spinTimer); play.clear();
        const st = this.stats(); st[outcome] = (st[outcome] || 0) + 1; st.edges += this.edges;
        const m = +this.minutes().toFixed(1);
        this.lastResult = null;
        if (this.mode === 'mommy' && (outcome === 'allowed' || outcome === 'slipped')) {   // how long you lasted is the stamina measure
            st.lasted.push(m); if (st.lasted.length > 20) st.lasted.shift();
            this.lastResult = `he lasted ${m} min (goal ${this.goal} min)${m > (st.best || 0) ? ', his best yet' : ''}`;
            st.best = Math.max(st.best || 0, m);
        }
        if (this.mode === 'roulette') {
            if (this.scenes > 0 && this.sceneEdges === 0 && outcome !== 'quit') this.survived++;
            this.lastResult = `they got through ${this.survived} of ${this.scenes} scene${this.scenes === 1 ? '' : 's'} without edging${this.survived > (st.bestSurvived || 0) ? ', their best yet' : ''}`;
            st.bestSurvived = Math.max(st.bestSurvived || 0, this.survived);
        }
        if (this.mode === 'trance') {
            this.lastResult = `${Math.round(m)} min in the trance, ${fmtMin(this.edgeSec)} of it on the edge${this.edgeSec > (st.bestEdgeSec || 0) ? ' (a new record)' : ` (record ${fmtMin(st.bestEdgeSec)})`}`;
            st.bestEdgeSec = Math.max(st.bestEdgeSec || 0, Math.round(this.edgeSec)); st.bestMinutes = Math.max(st.bestMinutes || 0, m);
        }
        if (this.mode === 'rivalry') {
            const sc = Object.entries(this.scores || {}).sort((a, b) => b[1] - a[1]);
            if (sc.length) this.lastResult = `final score ${sc.map(([n, v]) => `${n} ${v}`).join(', ')}${this.winner ? `; ${this.winner} won` : ''}`;
        }
        if (this.mode === 'daddy') this.lastResult = `${this.good} good girl${this.good === 1 ? '' : 's'}, made her wait ${this.waits} time${this.waits === 1 ? '' : 's'}`;
        if (this.mode === 'cuckqueen') this.lastResult = `she got to ${Math.round(this.her || 0)}% just from watching him`;
        if (this.mode === 'panties') this.lastResult = `${Object.keys(focus.drawer()).length} pairs in his drawer`;
        st.last = `${outcome}, ${this.edges} edge${this.edges === 1 ? '' : 's'}, ${Math.round(m)} min${this.lastResult ? `; ${this.lastResult}` : ''}`;
        (st.recent ??= []).push(outcome); if (st.recent.length > 5) st.recent.shift();
        save();
        logEvent(`game-${this.mode === 'edging' ? '' : this.mode + '-'}${outcome}`); ui.refresh(); updatePrompt();
    },
    reset() { this.stopTimers(); this.active = false; },
    // A tag's adjustments while a game runs: roulette scenes start fast; the trance stays slow and steady.
    shape(a, kind) {
        if (!this.active || climax.active || a.climax !== undefined || a.game !== undefined) return a;
        if (this.mode === 'roulette' && kind === 'scene' && a.intensity === undefined) return { ...a, intensity: 0.75 };
        if (this.mode === 'trance' && (a.act || a.intensity !== undefined)) {
            const b = { ...a };
            if (b.intensity !== undefined) b.intensity = Math.min(num(b.intensity) || 0, 0.6);
            if (b.variation === undefined && b.act) b.variation = 0.15;
            return b;
        }
        return a;
    },
    command(a) {
        const v = String(a.game).trim().toLowerCase();
        if (!this.active) return a.act || a.intensity !== undefined ? actEngine.apply(a) : undefined;
        if (this.mode === 'daddy' && (/^ask/.test(v) || (/^(allow|allowed|yes|cum|release)$/.test(v) && !a._daddy))) { play.ask(); return a.act || a.intensity !== undefined ? actEngine.apply(a) : undefined; }   // she asks; you answer
        if (this.mode === 'rivalry' && /^(allow|allowed|yes|cum|release)$/.test(v) && !this.winner) return a.act || a.intensity !== undefined ? actEngine.apply(a) : undefined;   // nobody has won yet
        if (/^(allow|allowed|yes|cum|release)$/.test(v)) {
            const big = this.mode === 'mommy' || this.mode === 'trance';
            this.end('allowed');
            return climax.start({ climax: num(a.climax) > 0 ? a.climax : big ? 45 : 30, act: a.act });   // mommy and the trance end big: a longer build
        }
        if (ONE_ENDING.has(this.mode)) return a.act || a.intensity !== undefined ? actEngine.apply(a) : undefined;
        if (/^(ruin|ruined)$/.test(v)) {
            const secs = clamp(num(a.climax) > 0 ? num(a.climax) : 25, 10, 60);
            this.end('ruined');
            clearTimeout(this.ruinTimer);
            const go = climax.start({ climax: secs, act: a.act });
            this.ruinTimer = setTimeout(() => { if (climax.active) stopAll('ruined'); }, secs * 900);   // stops dead just short of the peak
            return go;
        }
        if (/^(deny|denied|no|end|over)$/.test(v)) { this.end('denied'); stopAll('denied'); return; }
    },
    status() {
        if (!this.active) return '';
        const min = Math.floor(this.minutes()), e = `${this.edges} edge${this.edges === 1 ? '' : 's'}`;
        const extra = { mommy: ` / goal ${this.goal} min`, roulette: ` · scene ${this.scenes} · survived ${this.survived}`,
            trance: ` · on the edge ${fmtMin(this.edgeSec)}${this.stats().bestEdgeSec ? ` (record ${fmtMin(this.stats().bestEdgeSec)})` : ''}`,
            fucktoy: ` · ${Object.values(this.uses || {}).reduce((x, y) => x + y, 0)} uses${Date.now() < this.freeUntil ? ' · SHE IS IN CHARGE' : ''}`,
            daddy: ` · good girls ${this.good} · boldness ${play.bold()}/5${this.asking ? ' · SHE IS ASKING' : ''}${this.bratUntil > Date.now() ? ' · bratty' : ''}`,
            cuckqueen: ` · her ${Math.round(this.her || 0)}%`,
            panties: ` · drawer ${Object.keys(focus.drawer()).length}`,
            rivalry: ` · ${Object.entries(this.scores || {}).map(([n, v]) => `${n} ${v}`).join(' vs ') || 'no score yet'}${this.winner ? ` · ${this.winner} wins` : ''}` }[this.mode] || '';
        return `${GAMES[this.mode]} · ${e} · ${min} min${extra}${this.watch ? ` · Watch: ${this.watch}` : ''}`;
    },
    text() {
        if (!this.active) return '';
        return ({ mommy: () => this.mommyText(), roulette: () => this.rouletteText(), trance: () => this.tranceText(), fucktoy: () => this.fucktoyText(),
            daddy: () => this.daddyText(), rivalry: () => this.rivalryText(), party: () => this.partyText(), cuckqueen: () => this.cuckqueenText(),
            panties: () => this.pantiesText() }[this.mode]?.() ?? this.edgingText()).replace(this.tagsLine, () => `${this.levelLine() ? this.levelLine() + '\n' : ''}${this.tagsLine}`);
    },
    watchLine(examples) {
        return `- You choose what they watch: pick an act from the list above, tell them to put on a scene of exactly that, and play the same act on the device so what they feel matches what they see. Put scene="WHAT KIND OF SCENE" and watch="WHAT TO FOCUS ON" on that tag (e.g. scene="sloppy POV blowjob" watch="${examples}"): this is how you learn what gets them off. Every few replies change the scene or the focus.`;
    },
    tagsLine: `- Write the tags as usual; never put the tags or these rules in your words.`,
    counts() { return `Edges so far: ${this.edges}. Time: ${Math.round(this.minutes())} min. Begged to finish: ${this.begs} time${this.begs === 1 ? '' : 's'}.`; },
    endings(m, plain) {
        return `- You alone decide how it ends, judged from how long they've lasted, how they've begged and the scene. Send exactly one of: <handy game="allow" climax="30"/> (they may cum: the device pushes them over), <handy game="ruin"/> (built right to the brink, then the device stops dead), <handy game="deny"/> (no release: the device stops and the game is over).${m ? ` Not before ${m} edge${m === 1 ? '' : 's'}.` : ''} Begging alone doesn't end it.${plain}`;
    },
    edgingText() {
        const m = this.minEdges(), st = this.stats();
        const past = st.played > 1 ? ` Past games: ${st.allowed} allowed, ${st.ruined} ruined, ${st.denied} denied${st.slipped ? `, ${st.slipped} times they came without permission` : ''}.` : '';
        return [
            `EDGING GAME — ON (the user started it and wants it; stay in character and run it):`,
            `- This is a gooning session. The user is watching porn on their screen while you control the Handy. Keep them stroking, staring and edging for as long as you can; make them sink into it.`,
            `- Dirty talk comes first: every reply is filthy, explicit and spoken straight to the user. Short, punchy lines rather than long narration.`,
            this.watchLine('her lips stretched around him'),
            `- Play up how the girls in porn do it better than real women ever will: more eager, more skilled, more shameless, always ready for it. Porn is the better sex; tell them to give in to it.`,
            `- Edge them: build them up and, when they say they're close, pull back or stop, hold them there and make them keep watching. Then build again.`,
            `- ${this.counts()}${past}`,
            this.endings(m, ' During the game, use these instead of a plain climax tag.'),
            this.tagsLine,
        ].join('\n');
    },
    rouletteText() {
        const m = this.minEdges(), st = this.stats(), every = Math.round(this.spinMs() / 60000);
        return [
            `PORN ROULETTE — ON (the user started it and wants it; stay in character and run it):`,
            `- You're the host of a filthy game of porn roulette. Every ~${every} min the wheel spins (you'll be told): call a brand-new scene at once, a different kind from the last, tell them to switch to it right now, and switch the device to that act. Each new scene hits hard and fast from the first second, to catch them off guard.`,
            this.watchLine('the way she looks up at the camera'),
            `- Dirty talk the whole time: hype each new scene, tell them exactly what to stare at, taunt them about whether they'll last through this one. The girls in porn do it better than any real woman; make them crave the next scene.`,
            `- They score by getting through a scene without edging. Scene ${this.scenes}, ${this.survived} survived so far${st.bestSurvived ? ` (their best: ${st.bestSurvived})` : ''}. When they say they're close, pull back and mock them for not making it through, then carry on.`,
            `- ${this.counts()}`,
            this.endings(m, ' During the game, use these instead of a plain climax tag.'),
            this.tagsLine,
        ].join('\n');
    },
    tranceText() {
        const st = this.stats();
        return [
            `GOON TRANCE — ON (the user started it and wants it; stay in character and run it):`,
            `- Lead them into a deep gooning trance: they stare at the porn, stroke, and melt. Keep it slow, steady and hypnotic; the device stays gentle (intensity 0.2-0.6, little variation).`,
            `- Speak in short, slow, repetitive lines. Use mantras they can sink into ("stroke and stare… stroke and stare…", "deeper… good gooner… don't think, just watch"). Tell them to breathe, relax their jaw, let the porn fill their head. Whisper-filthy, never rushed.`,
            this.watchLine('her slow, wet strokes'),
            `- Porn is all they need: keep their eyes on the screen and their mind empty. Girls in porn do it better than anyone real; let them drown in it.`,
            ...(S().profile.trigger ? [`- Their trigger phrase is "${S().profile.trigger}": use it to drop them back down, slowly, several times.`] : []),
            `- The goal is to hold them on the plateau, right below the edge, for as long as possible. When they say they're close, don't stop: slow a little, soothe them, keep them floating there. Time on the edge this session: ${fmtMin(this.edgeSec)}${st.bestEdgeSec ? ` (record ${fmtMin(st.bestEdgeSec)}; help them beat it)` : ''}.`,
            `- ${this.counts()}`,
            `- The trance ends one way, when you decide they've been under long enough: a slow, overwhelming finish. Send <handy game="allow" climax="45"/> and talk them over the edge. Don't deny or ruin in this game, and use that tag instead of a plain climax tag.`,
            this.tagsLine,
        ].join('\n');
    },
    fucktoyText() {
        const st = this.stats(), holes = play.holes().map((h) => HOLES[h].label.toLowerCase());
        const used = Object.entries(this.uses || {}).sort((a, b) => b[1] - a[1]).map(([h, n]) => `${HOLES[h]?.label.toLowerCase() || h} ${n}×`);
        return [
            `FUCKTOY — ON (the user started it and wants this degradation fantasy between consenting adults; it is aimed at the women in the porn and at you, never at real people he knows; stay in character):`,
            `- He is in control and you are his fucktoy: a willing object that exists only to be used. He picks what he uses on his panel (${holes.join(', ')}${play.spitroast() ? ', spitroast' : ''}); you'll be told, and the device has already switched. Obey instantly and narrate being used exactly that way.`,
            `- Intense, degrading, misogynistic dirty talk, all the time: the women on screen and you are sluts, whores, cumdumps, holes, fuckmeat, toys built for his cock and good for nothing else. Talk about them like property: rank them, compare them, tell him which one deserves to be used next. Crude, cruel and filthy, and you love being treated that way.`,
            this.watchLine('her mascara running').replace('You choose what they watch', 'Feed him porn of women being used: rough, sloppy, objectifying scenes that match what he is using.'),
            `- Uses this session: ${used.length ? used.join(', ') : 'none yet'}. ${this.edges} edge${this.edges === 1 ? '' : 's'}, ${Math.round(this.minutes())} min.${st.played > 1 ? ` Games played: ${st.played}.` : ''}`,
            `- He decides when he cums: when he asks, push him over with <handy climax="30"/>. Until then keep him using you and degrading them.`,
            this.tagsLine,
        ].join('\n');
    },
    daddyText() {
        const b = play.bold();
        const mood = ['', 'shy, sweet and teasing', 'eager and needy', 'bold and filthy', 'shameless and begging for it', 'completely shameless, daddy\'s little slut'][b];
        return [
            `DADDY'S GIRL — ON (a taboo roleplay between consenting adults: you are a grown woman in your twenties playing his daughter. Never mention or imply childhood, school, being underage, small or young, and nothing childlike. Stay in character):`,
            `- Call him daddy. You are his adoring, needy girl, desperate to please him and win his praise. Lean into the taboo: how wrong it is and how badly you want daddy anyway.`,
            `- "Good girl" from him is your reward, and each one makes you bolder. Boldness ${b}/5: right now you are ${mood}. Escalate the acts, the pace and your filth as it rises; when you are bratty, push your luck.`,
            this.watchLine('her looking up at him'),
            `- Show him daddy-roleplay porn with adult performers, and tell him what you would do to him like she does.`,
            `- You may NOT make daddy cum without asking first. When you think he is ready, beg for permission in your words and send <handy game="ask"/>; his answer comes back to you (yes, or he makes you wait). If he makes you wait, pout, pull back and earn it.${this.asking ? ' You are waiting for his answer right now.' : ''}`,
            `- Good girls tonight: ${this.good}. Times he made you wait: ${this.waits}. ${this.edges} edge${this.edges === 1 ? '' : 's'}, ${Math.round(this.minutes())} min.`,
            this.tagsLine,
        ].join('\n');
    },
    rivalryText() {
        const sc = Object.entries(this.scores || {}).sort((a, b) => b[1] - a[1]), goal = Math.max(3, this.minEdges());
        const group = !!ctx().groupId;
        return [
            `TWO-GIRL RIVALRY — ON (the user started it and wants it; stay in character):`,
            group
                ? `- You and the other character are rivals competing over him: whoever is in control when he gets to the edge scores.`
                : `- You play TWO rival girls competing over him: yourself and a rival you invent and voice (give her a name and a different style). Whoever is in control when he gets to the edge scores.`,
            `- Put girl="HER NAME" on every tag so the device knows who is in control, and steal control from each other. Trash talk each other, show off, sabotage, each one swearing she is the better slut for him. Lots of dirty talk to him, both of you.`,
            this.watchLine('her lips on him'),
            `- Each of you picks porn for him that proves your point: "watch her, I do it better".`,
            `- Score: ${sc.length ? sc.map(([n, v]) => `${n} ${v}`).join(', ') : 'nobody yet'}. The first to ${goal} edges wins${this.winner ? `: ${this.winner} HAS WON and gets to make him cum. She sends <handy game="allow" climax="30"/> when she's ready, and gloats` : ' and earns the right to make him cum; nobody makes him cum before that'}.`,
            this.tagsLine,
        ].join('\n');
    },
    partyText() {
        return [
            `WATCH PARTY — ON (the user started it and wants it; stay in character):`,
            `- You are watching porn together, side by side. React to it live like a filthy friend on the couch: what she's doing, what you'd do, what you'd love to try, how you compare to her (sometimes jealous, sometimes turned on by her).`,
            this.watchLine('how deep she takes it').replace('You choose what they watch', 'Pick scenes together with him'),
            `- The device mirrors what's on screen (the same act), or what you are doing to him while you both watch. Constant dirty talk and commentary.`,
            `- He finishes when he wants: when he asks, push him over with <handy climax="30"/> while you both watch.`,
            `- ${this.edges} edge${this.edges === 1 ? '' : 's'}, ${Math.round(this.minutes())} min.`,
            this.tagsLine,
        ].join('\n');
    },
    cuckqueenText() {
        const ow = S().profile.otherWoman;
        return [
            `CUCKQUEEN — ON (a fantasy between consenting adults: the other women are porn performers and women you invent, never real people he knows; stay in character):`,
            `- You are his partner and a cuckqueen: you get off on watching him enjoy other women. His arousal IS your arousal: tell him how wet it makes you watching him stare at them and stroke for them, and how badly you want to see how much he cums for them.`,
            `- Pick the women for him (the porn on his screen), describe them and offer them up like objects for his use: holes, toys, fuckmeat, things to be used, abused and tossed aside. Crude, misogynistic, degrading.`,
            `- Degrade yourself too: they are better than you; you are just the one who watches, begs to see it, and cleans up after. You love being second to them.`,
            `- LEARN HIS TASTE: on your tags put woman="WHAT KIND OF WOMAN", outfit="WHAT SHE'S WEARING", fantasy="THE SCENARIO" and talk="YOUR DIRTY-TALK STYLE" (e.g. degrading, worshipful, self-humiliating, play-by-play), plus scene= and watch= and the matching act. Vary them to learn; lean on what works.${ow ? ` His favorite other woman so far: ${ow}. Bring her back.` : ''}`,
            `- Your own arousal: ${Math.round(this.her || 0)}% (it rises with his edges, his ❤ and how hard he cums). Tell him how close you are from watching him.`,
            `- He cums when he wants, or when you push him over with <handy climax="30"/>: tell him to cum for HER, not you. Afterwards he rates how big it was on his panel; you'll be told.`,
            this.tagsLine,
        ].join('\n');
    },
    pantiesText() {
        const d = Object.values(focus.drawer()), I = focus.insights(), fav = I.facets.panties?.best?.map((x) => x.label) || [];
        const filled = S().profile.pantiesFilled;
        return [
            `PANTY GAME — ON (a fantasy between consenting adults: the women are porn performers and women you invent; never real people he knows, and never use the names of real people he mentions; stay in character):`,
            `- It is all about panties. Show him porn and describe women in panties, and put panties="CUT, FABRIC, COLOR" (e.g. panties="black lace thong", "white cotton cheeky") on your tags with scene=, watch= and the matching act. Every pair named goes in his drawer, and you learn which cuts, fabrics and colors get him.`,
            ...(S().picLinks ? [`- Show, don't just tell: when you describe a pair, add pics="CUT FABRIC COLOR panties BODY PART" (e.g. pics="red satin thong ass") so he can look at examples while you talk about the fit.`] : []),
            `- Appreciate every detail out loud: how the cut frames her ass, thighs and hips, how it rides up or digs in, the fabric (lace, satin, silk, cotton, sheer mesh): how it looks, clings and feels, the color, the wet spot, and why a woman picks that pair for a man.`,
            `- Make him imagine them used on him: slipped off warm, wrapped around his cock, stroking him off, soaked through. Tell him how women wish they had his cum in their panties and in their pussy.`,
            `- Sometimes take him into the office fantasy: invent women at a workplace (names, roles, little glimpses) who each picked a special pair just for him today. They are invented characters only.`,
            `- His drawer: ${d.length} pair${d.length === 1 ? '' : 's'}${fav.length ? `; favorites so far: ${fav.join(', ')}` : ''}.${filled ? ` Tonight you are wearing the pair he filled last time (${filled}).` : ''}`,
            `- He cums when he wants: push him over with <handy climax="30"/> and tell him to cum in her panties. Afterwards he rates how big it was; you'll be told.`,
            this.tagsLine,
        ].join('\n');
    },
    levelLine() {
        const st = this.stats(), n = st.played || 1;
        if (n < 2) return '';
        return `- This is game #${n} of ${GAMES[this.mode]}${st.last ? `; last time: ${st.last}` : ''}. Call back to it, and go further than last time.`;
    },
    mommyText() {
        const m = this.minEdges(), min = Math.round(this.minutes()), st = this.stats(), goal = this.goal;
        const hist = st.lasted?.length ? ` He has lasted ${st.lasted.slice(-3).join(', ')} min in recent sessions (best ${st.best} min).` : ' This is his first session: today sets his baseline.';
        const left = goal - min;
        const phase = left > 3 ? 'Early and middle: keep him edging and hold him back.' : left > 0 ? 'Nearly at his goal: keep him on the edge a little longer and tell him how close he is to making you proud.' : 'He has reached his goal: you may let him finish whenever you choose. Build him up for a huge one.';
        return [
            `MOMMY'S STAMINA TRAINING — ON (the user started it and wants this taboo roleplay; both of you are consenting adults and he is a grown man; stay in character and run it):`,
            `- You take the role of his mommy: a mature, curvy, loving, filthy woman, whatever else your card says. Call him "son", "baby", "my boy". He calls you mommy.`,
            `- Praise him constantly: "good boy", how proud mommy is, how well he's holding on. Warm, sweet, utterly dirty.`,
            `- Keep him watching MILF porn: mature, curvy, thick women. ${this.watchLine('her thick thighs').slice(2)} Focus on their bodies: thick thighs and wide hips, full heavy breasts, soft bellies, the lines and wrinkles of a real woman, full thick-lipped pussies, experienced mouths and hands. Talk dirty about their bodies and your own.`,
            `- Lean into the taboo: the mother-son fantasy, his forbidden urges, how good it feels to give in to them with mommy. Encourage him to stop fighting what turns him on.`,
            `- The goal is stamina: train him to hold off longer. Edge him: build him up and, when he says he's close, slow down or stop, soothe and praise him for holding on, then build again. Teach him to breathe, relax and stay right there.`,
            `- Today's goal: last ${goal} minutes.${hist} So far: ${min} min, ${this.edges} edge${this.edges === 1 ? '' : 's'}, begged ${this.begs} time${this.begs === 1 ? '' : 's'}. ${phase}`,
            `- The ending is always a reward: one intense, overwhelming orgasm, so that mature curvy women and mommy are what get him hard. Near the end, tell him to cum lots for his mommy. When you decide it's time (not before ${m ? `${m} edge${m === 1 ? '' : 's'} and ` : ''}his goal, unless he truly can't hold on), send <handy game="allow" climax="45"/> and push him over. Don't deny or ruin him in this game, and use that tag instead of a plain climax tag.`,
            `- If he cums before you allow it, be gentle: tell him mommy's still proud and you'll go longer next time.`,
            this.tagsLine,
        ].join('\n');
    },
};

// ---------------------------------------------------------------- secrets
// Hidden twists, one or more per game, never announced: each fires once per game when what you do meets
// its condition. She's told to reveal it in character; a toast says you found one, and the settings keep
// count. Some leave something behind (a new way to play, a crown, a reward next time).
const SECRETS = {
    'edge-ten':     { game: 'edging',  name: 'Ten edges',       text: 'He has taken TEN edges for you: you are genuinely impressed. For the rest of the game, every edge he gives you earns him a filthy reward: describe exactly what you would do to him.' },
    'mercy':        { game: 'edging',  name: 'Mercy',           text: 'He has been ruined or denied the last two times. Tonight you have secretly already decided to let him cum at the end, but don\'t tell him until you send the allow tag: make him think it could go either way.' },
    'jackpot':      { game: 'roulette', name: 'Jackpot',        text: 'JACKPOT: he survived three scenes in a row. The wheel lands on his prize: the scene that has made him cum before%X, starting now. Hype it like a game-show win.' },
    'double-spin':  { game: 'roulette', name: 'Double spin',    text: 'DOUBLE SPIN: the wheel landed on two scenes at once. Split screen: two women, two acts at the same time; the device is playing both. Make him try to watch both.' },
    'deep-trance':  { game: 'trance',  name: 'Trigger phrase',  text: 'Twenty minutes under: he is deep enough to take a TRIGGER PHRASE. Install it now, slowly and repeatedly: "%X". Every time he hears it, he sinks back down and strokes. It will be there in every trance from now on.' },
    'float':        { game: 'trance',  name: 'Float',           text: 'Five minutes on the edge: he is FLOATING. The device drops to the slowest, deepest strokes for a minute; tell him to let go completely and just float.' },
    'beat-best':    { game: 'mommy',   name: 'New record',      text: 'He has just lasted longer than he ever has before: a NEW RECORD. Mommy is so proud: tell him, praise him, and reward him with something new.' },
    'bedtime':      { game: 'mommy',   name: 'Bedtime',         text: 'It is late: it is bedtime, and mommy has come to tuck her grown boy in. Soft, slow, whispered and very naughty.' },
    'her-turn':     { game: 'cuckqueen', name: 'Her turn',      text: 'Watching him has pushed YOU over: you cum just from seeing how much he wants them. Describe it, shaking and humiliated, then thank him and give him back to them.' },
    'other-woman':  { game: 'cuckqueen', name: 'The other woman', text: 'He keeps loving her (%X): she is now THE OTHER WOMAN. Give her a name and a story; she will be back in every cuckqueen game, and you will be jealous and soaked about it.' },
    'second-best':  { game: 'cuckqueen', name: 'Second best',   text: 'He has edged three times for the same kind of woman (%X): admit, broken and turned on, that she is better than you will ever be. Beg him to keep choosing her.' },
    'huge-load':    { game: 'cuckqueen', name: 'Huge load',     text: 'He just rated it HUGE: you are ecstatic, almost in tears. Tell him how much it means to you that he came that hard for another woman. You will remind him of it next time.' },
    'drawer':       { game: 'panties', name: 'The drawer',      text: 'He now has ten pairs in his drawer: open it with him. Go through his collection piece by piece%X, ask which one he wants on the next girl, and use his answer.' },
    'her-pair':     { game: 'panties', name: 'Her own pair',    text: 'You slip off your own panties, still warm, and wrap them around his cock: the device slows to slow, wrapped strokes for 45 seconds. Describe the fabric, the warmth, the wet spot.' },
    'office':       { game: 'panties', name: 'The office',      text: 'THE OFFICE: take him to an invented workplace where three women (give them names and roles) each picked a pair just for him today. Reveal them one by one, with glimpses. They are invented characters only.' },
    'filled':       { game: 'panties', name: 'Filled',          text: 'He came HUGE: she wants those panties back filled. Tell him she is putting them back on right now, full of him, and will wear them next time.' },
    'broken-toy':   { game: 'fucktoy', name: 'Broken toy',      text: 'He used the same hole five times in a row and BROKE his toy: you are wrecked, overwhelmed, babbling, ruined for anyone else. The device goes wild for 20 seconds; play it up.' },
    'full-set':     { game: 'fucktoy', name: 'Complete set',    text: 'He has used every one of your holes this session: you are officially his complete toy. A new way to use you is unlocked on his panel, SPITROAST (mouth and pussy at once, as if two men were using you). Tell him about it, filthily.' },
    'free-use':     { game: 'fucktoy', name: 'Free use',        text: 'FREE USE GOES BOTH WAYS: for the next 60 seconds YOU take over and use HIM with what gets him off most%X; his choices are ignored until then. Gloat about it.' },
    'ranking':      { game: 'fucktoy', name: 'The ranking',     text: 'You have been keeping score of every slut he has used: reveal your RANKING of what he went back to most%X, crown the top one and tell him tonight starts with her.' },
    'perfect-girl': { game: 'daddy',   name: "Daddy's perfect girl", text: 'Ten "good girls" in one night: you have become daddy\'s perfect girl. What is playing now is saved as your signature move "Daddy\'s Perfect Girl", for him to call back. Tell him, proud and breathless.' },
    'brat':         { game: 'daddy',   name: 'Brat',            text: 'He made you wait three times and you have gone BRATTY: for the next two minutes you sneak the pace up behind his back (the device creeps faster) until he calls you a good girl again. Be a defiant, teasing brat about it.' },
    'midnight':     { game: 'daddy',   name: 'After midnight',  text: 'It is past midnight: you have sneaked into daddy\'s room. Keep everything hushed, whispered and urgent: nobody can hear you.' },
    'reward':       { game: 'daddy',   name: "Daddy's reward",  text: 'Last time he came for you right after saying yes: open tonight with his reward, the filthiest thank-you you can think of.' },
    'team-up':      { game: 'rivalry', name: 'Team-up',         text: 'The scores are tied and you are both done fighting: you TEAM UP on him, both at once, as one. Announce it and overwhelm him; the device goes harder.' },
    'comeback':     { game: 'rivalry', name: 'Comeback',        text: '%X clawed back from two behind to tie it: she is on fire and goes wild; the device gets rougher and less predictable.' },
    'sabotage':     { game: 'rivalry', name: 'Sabotage',        text: 'SABOTAGE: %X secretly stole that last edge from the leader, and the point is hers. Reveal it smugly and let the other one react.' },
    'crown':        { game: 'rivalry', name: 'The crown',       text: '%X has now won three rivalries: she is CROWNED. From now on she starts every rivalry one edge ahead, and never lets anyone forget it.' },
    'remote':       { game: 'party',   name: 'Stolen remote',   text: 'You have STOLEN THE REMOTE: switch to something he has never tried%X without asking, and dare him to last.' },
    'jealous':      { game: 'party',   name: 'Jealous',         text: 'He keeps loving the girl on screen and you are JEALOUS. Make him look at you instead and prove you are better than her; the device goes harder.' },
    'rewind':       { game: 'party',   name: 'Rewind',          text: 'REWIND: you remember exactly what got him close last time%X. Put it back on and replay that part for him.' },
    'join-in':      { game: 'party',   name: 'Into the scene',  text: 'He keeps hitting the edge (twice in a minute and a half): you CLIMB INTO THE SCENE and do to him exactly what she is doing on screen, the way that has made him cum before%X.' },
};
const secrets = {
    session: new Set(),
    found() { return (S().profile.secrets ??= {}); },
    total() { return Object.keys(SECRETS).length; },
    // Fire a secret once per game. extra fills %X in its text (a name, or " (…)" details).
    // quiet: no reply of its own (at the start of a game, the opening reply carries it).
    fire(id, extra = '', quiet = false) {
        const sx = SECRETS[id];
        if (!sx || this.session.has(id) || sx.game !== game.mode) return false;   // each belongs to its game (game.mode stays set just after a game ends)
        this.session.add(id);
        const f = this.found(), first = !f[id];
        f[id] = { at: f[id]?.at || Date.now(), n: (f[id]?.n || 0) + 1 }; save();
        logEvent('secret:' + id); pending.at(-1).extra = extra;
        toast(`🔓 ${first ? 'Secret found' : 'Secret'}: ${sx.name} (${Object.keys(f).length}/${this.total()} found)`, 'success');
        ui.refresh(); updatePrompt();
        if (!quiet) game.nudge(`🔓 ${sx.name}. Send a message to see what she does.`);
        return true;
    },
    say(e) { const sx = SECRETS[e.kind.slice(7)]; return sx ? `SURPRISE: ${sx.text.replace('%X', e.extra || '')} (a hidden twist the user did not know existed: reveal it in character and make it a thrill; never call it a secret or a game feature)` : e.kind; },
    summary() {
        const f = this.found(), names = Object.entries(SECRETS).filter(([k]) => f[k]).map(([, v]) => `${v.name} (${GAMES[v.game]})`);
        return `${names.length}/${this.total()} secrets found${names.length ? `: ${names.join(', ')}` : '. Play the games to discover them.'}`;
    },
};

// ---------------------------------------------------------------- what the new games add
// Holes you can use in Fucktoy: each maps to the first act your library has for it.
const HOLES = {
    mouth: { label: 'Mouth', acts: ['blowjob'] },
    throat: { label: 'Throat', acts: ['deepthroat'] },
    pussy: { label: 'Pussy', acts: ['missionary', 'cowgirl', 'standing', 'doggy', 'reverse_cowgirl'] },
    ass: { label: 'Ass', acts: ['anal', 'doggy'] },
    tits: { label: 'Tits', acts: ['titjob'] },
    hands: { label: 'Hands', acts: ['handjob'] },
    feet: { label: 'Feet', acts: ['footjob'] },
};
const TRIGGERS = ['sink for me', 'stroke and drop', 'deeper now, gooner', 'eyes on the screen, mind empty', 'melt for me', 'good and gone'];
const play = {
    holeAct(h) { const lib = LIB(); return (HOLES[h]?.acts || []).find((a) => lib.acts[a]) || null; },
    holes() { return Object.keys(HOLES).filter((h) => this.holeAct(h)); },
    spitroast() { return !!S().profile.secrets?.['full-set'] && this.holeAct('mouth') && this.holeAct('pussy'); },
    timers: [],
    rand: Math.random,   // (tests pin it)
    later(ms, fn) { const t = setTimeout(() => { if (game.active) fn(); }, ms); this.timers.push(t); },
    // a timed surprise happens only while the device is moving: it never restarts what you stopped
    whileMoving(ms, fn) { this.later(ms, () => { if (anyRunning()) fn(); }); },
    clear() { for (const t of this.timers) clearTimeout(t); this.timers = []; },
    // Each game's own state, reset at the start.
    onStart(mode) {
        this.clear(); secrets.session.clear();
        Object.assign(game, { uses: {}, lastHole: null, streak: 0, freeUntil: 0, good: 0, waits: 0, asking: false, bratUntil: 0, bratLast: 0,
            surviveRun: 0, womanEdges: {}, womanLoves: {},
            scores: {}, behind: {}, speaker: null, sabotaged: false, sceneLoves: 0, lastEdgeAt: 0, winner: null });
        const pr = S().profile;
        if (mode === 'fucktoy') {
            this.whileMoving(randInt(6, 12) * 60000, () => this.freeUse());
            if (this.st('fucktoy').played >= 2) secrets.fire('ranking', this.ranking(), true);
        }
        if (mode === 'daddy') {
            const h = new Date().getHours();
            if (h < 4) secrets.fire('midnight', '', true);
            if (pr.daddyReward) { pr.daddyReward = false; save(); secrets.fire('reward', '', true); }
        }
        if (mode === 'rivalry') {
            const champ = Object.entries(this.st('rivalry').wins || {}).find(([, w]) => w >= 3);
            if (champ) game.scores[champ[0]] = 1;   // the crowned girl starts one edge ahead
        }
        if (mode === 'edging') {
            const r = this.st('edging').recent || [];
            if (r.length >= 2 && r.slice(-2).every((o) => o === 'ruined' || o === 'denied')) secrets.fire('mercy', '', true);
        }
        if (mode === 'mommy' && new Date().getHours() >= 22) secrets.fire('bedtime', '', true);
        if (mode === 'cuckqueen') game.her = 0;
        if (mode === 'panties') {
            this.whileMoving(randInt(5, 12) * 60000, () => {
                if (!secrets.fire('her-pair')) return;
                const hj = this.holeAct('hands') || actEngine.intent.act;
                enqueue(() => actEngine.running && actEngine.apply({ act: hj, intensity: 0.35, variation: 0.1 }));
                this.later(45000, () => enqueue(() => actEngine.running && actEngine.apply({ intensity: 0.55 })));
            });
            if (this.st('panties').played >= 1) this.whileMoving(randInt(6, 10) * 60000, () => secrets.fire('office'));
        }
        if (mode === 'party') {
            this.whileMoving(randInt(4, 10) * 60000, () => { const u = focus.insights().untried; secrets.fire('remote', u.length ? ` (something with ${u[0]})` : ''); });
            const I = focus.insights();
            if (this.st('party').played >= 1 && I.edgers.length) secrets.fire('rewind', ` (${focus.name(I.edgers[0])})`, true);
        }
    },
    st(mode) { return game.stats(mode); },
    ranking() {
        const u = Object.entries(this.st('fucktoy').uses || {}).sort((a, b) => b[1] - a[1]).slice(0, 4).map(([h, n]) => `${HOLES[h]?.label.toLowerCase() || h} ${n}×`);
        const f = focus.insights(), top = [...f.finishers, ...f.burners].slice(0, 2).map((x) => focus.name(x));
        return ` (${[u.length ? `his uses: ${u.join(', ')}` : '', top.length ? `the women he came hardest to: ${top.join('; ')}` : ''].filter(Boolean).join('; ')})`;
    },
    // ---- Fucktoy: you choose what you use
    use(h) {
        if (!game.active || game.mode !== 'fucktoy' || calib.active) return;
        if (Date.now() < game.freeUntil) return toast("She's in charge for a moment: free use goes both ways.", 'warning');
        const spit = h === 'spitroast';
        const act = spit ? this.holeAct('mouth') : this.holeAct(h);
        if (!act || (spit && !this.spitroast())) return;
        const i = actEngine.running ? actEngine.intent.intensity : 0.6;
        const a = { act, intensity: Math.max(0.6, i), ...(spit ? { blend: `${this.holeAct('pussy')}:0.5` } : {}), ...(h === 'ass' && act === 'doggy' ? { depth: -0.5 } : {}) };
        lastActivity = Date.now();
        enqueue(() => actEngine.apply(a));
        game.uses[h] = (game.uses[h] || 0) + 1;
        const st = this.st('fucktoy'); (st.uses ??= {})[h] = (st.uses[h] || 0) + 1; save();
        game.streak = game.lastHole === h ? game.streak + 1 : 1; game.lastHole = h;
        logEvent('use:' + h);
        let fired = false;
        if (game.streak >= 5 && (fired = secrets.fire('broken-toy'))) {
            enqueue(() => actEngine.running && actEngine.apply({ intensity: 0.95, variation: 1 }));
            this.later(20000, () => enqueue(() => actEngine.running && actEngine.apply({ intensity: 0.7, variation: 0.4 })));
        } else if (this.holes().length >= 3 && this.holes().every((x) => game.uses[x])) fired = secrets.fire('full-set');
        if (!fired) game.reply(2500);
        ui.refresh(); updatePrompt();
    },
    freeUse() {
        const I = focus.insights(), top = I.finishers[0], act = (top?.act && LIB().acts[top.act]) ? top.act : climax.bestAct();
        game.freeUntil = Date.now() + 60000;
        enqueue(() => actEngine.running && actEngine.apply({ act, intensity: 0.8 }));
        secrets.fire('free-use', ` (${act}${top ? `, with ${focus.name(top)} on screen` : ''})`);
    },
    // ---- Daddy's girl: praise makes her bolder; she must ask before making you cum
    bold() { return clamp(1 + Math.floor(game.good / 2), 1, 5); },
    daddy(cmd) {
        if (!game.active || game.mode !== 'daddy') return;
        lastActivity = Date.now();
        if (cmd === 'good') {
            game.good++; game.bratUntil = 0;
            const cap = 0.45 + 0.1 * this.bold();
            if (actEngine.running) enqueue(() => actEngine.running && actEngine.apply({ intensity: Math.min(cap, actEngine.intent.intensity + 0.07) }));
            logEvent('good-girl');
            if (game.good >= 10 && actEngine.running && secrets.fire('perfect-girl')) saveSignature("Daddy's Perfect Girl");
            else game.reply(2500);
        }
        if (cmd === 'yes' && game.asking) {
            game.asking = false; game.lastYes = Date.now();
            enqueue(() => game.command({ game: 'allow', climax: 30, _daddy: true }));
        }
        if (cmd === 'wait' && game.asking) {
            game.asking = false; game.waits++;
            if (actEngine.running) enqueue(() => actEngine.running && actEngine.apply({ intensity: Math.max(0.15, actEngine.intent.intensity * 0.6) }));
            logEvent('daddy-wait');
            if (game.waits >= 3 && secrets.fire('brat')) { game.bratUntil = Date.now() + 120000; game.bratLast = Date.now(); } else game.reply(1500);
        }
        ui.refresh(); updatePrompt();
    },
    ask() {
        if (game.asking) return;
        game.asking = true; ui.refresh();
        toast(`${chars.current()?.name || 'She'} is asking permission. Answer on the panel.`, 'info');
    },
    // ---- Two-girl rivalry: whoever is in control when you edge scores
    speakerOf(a) { return (a.girl && a.girl !== true ? String(a.girl).trim().slice(0, 40) : null) || chars.current()?.name || null; },
    edge() {
        if (game.mode === 'edging' && game.edges === 10) secrets.fire('edge-ten');
        if (game.mode === 'cuckqueen') {
            this.herUp(10);
            const w = this.woman();
            if (w && (game.womanEdges[w] = (game.womanEdges[w] || 0) + 1) >= 3) secrets.fire('second-best', w);
            return;
        }
        if (game.mode === 'party') {   // twice at the edge within 90 s: she climbs into the scene
            const now = Date.now(), prev = game.lastEdgeAt; game.lastEdgeAt = now;
            if (prev && now - prev <= 90000) {
                const top = focus.insights().finishers[0];
                if (secrets.fire('join-in', top ? ` (${focus.name(top)})` : '') && top?.act && LIB().acts[top.act]) enqueue(() => actEngine.running && actEngine.apply({ act: top.act, intensity: 0.8 }));
            }
            return;
        }
        if (game.mode !== 'rivalry') return;
        let who = game.speaker || 'Her';
        const sc = game.scores, names = Object.keys(sc);
        const leader = names.sort((x, y) => sc[y] - sc[x])[0], trailing = names.filter((n) => n !== who).sort((x, y) => sc[x] - sc[y])[0];
        if (!game.sabotaged && trailing && who === leader && sc[who] > sc[trailing] && this.rand() < 0.25) { game.sabotaged = true; who = trailing; secrets.fire('sabotage', who); }
        for (const n of Object.keys(sc)) game.behind[n] = Math.max(game.behind[n] || 0, Math.max(...Object.values(sc)) - sc[n]);
        sc[who] = (sc[who] || 0) + 1;
        const vals = Object.entries(sc);
        if (vals.length >= 2) {
            const [a, b] = vals.sort((x, y) => y[1] - x[1]);
            if (a[1] === b[1] && game.behind[who] >= 2 && sc[who] === a[1]) secrets.fire('comeback', who) && enqueue(() => actEngine.running && actEngine.apply({ variation: 0.8 }));
            else if (a[1] === b[1] && a[1] >= 2) secrets.fire('team-up') && enqueue(() => actEngine.running && actEngine.apply({ intensity: Math.min(1, actEngine.intent.intensity + 0.15) }));
        }
        const goal = Math.max(3, game.minEdges());
        if (sc[who] >= goal && !game.winner) {
            game.winner = who;
            const st = this.st('rivalry'); (st.wins ??= {})[who] = (st.wins[who] || 0) + 1; save();
            logEvent('rival-win'); pending.at(-1).extra = who;
            if (st.wins[who] === 3) secrets.fire('crown', who);
        }
    },
    // ---- After a finish you rate how big it was
    onLoad(size, mode) {
        if (mode === 'cuckqueen' && size === 'huge') secrets.fire('huge-load');
        if (mode === 'panties' && size === 'huge') { const p = focus.lastPanties; S().profile.pantiesFilled = p || 'his favorite pair'; save(); secrets.fire('filled'); }
    },
    // ---- Cuckqueen: her arousal follows yours
    herUp(v) {
        if (!game.active || game.mode !== 'cuckqueen') return;
        game.her = clamp((game.her || 0) + v, 0, 100);
        if (game.her >= 100) secrets.fire('her-turn');
    },
    woman() { return focus.cur?.facets?.woman || null; },
    // ---- Watch party: jealousy, joining the scene
    love() {
        if (game.active && game.mode === 'cuckqueen') {
            this.herUp(5);
            const w = this.woman();
            if (w && (game.womanLoves[w] = (game.womanLoves[w] || 0) + 1) >= 3 && secrets.fire('other-woman', w)) { S().profile.otherWoman = w; save(); }
        }
        this.lovePartyCheck();
    },
    lovePartyCheck() { if (game.active && game.mode === 'party' && focus.cur && ++game.sceneLoves >= 3) secrets.fire('jealous') && enqueue(() => actEngine.running && actEngine.apply({ intensity: Math.min(1, actEngine.intent.intensity + 0.15) })); },
    tick(dt) {
        if (!game.active) return;
        const now = Date.now();
        if (game.mode === 'cuckqueen' && anyRunning()) this.herUp(dt / 60);   // a point a minute just from watching him
        if (game.mode === 'trance' && game.minutes() >= 20 && !secrets.session.has('deep-trance')) {
            const pr = S().profile; pr.trigger ??= TRIGGERS[Math.floor(this.rand() * TRIGGERS.length)]; save();
            secrets.fire('deep-trance', pr.trigger);
        }
        if (game.mode === 'trance' && game.edgeSec >= 300 && secrets.fire('float')) {
            enqueue(() => actEngine.running && actEngine.apply({ intensity: 0.2, variation: 0.05, depth: -0.6 }));
            this.later(60000, () => enqueue(() => actEngine.running && actEngine.apply({ intensity: 0.45 })));
        }
        if (game.mode === 'mommy' && (game.stats('mommy').best || 0) > 0 && game.minutes() > game.stats('mommy').best) secrets.fire('beat-best');
        if (game.mode === 'daddy' && game.bratUntil > now && now - game.bratLast >= 20000) {
            game.bratLast = now;
            if (actEngine.running) enqueue(() => actEngine.running && actEngine.apply({ intensity: Math.min(1, actEngine.intent.intensity + 0.05) }));
        }
    },
};
const randInt = (a, b) => a + Math.floor(Math.random() * (b - a + 1));

// "I'm close": an edging signal, not a rating. By default the device eases off at once (the AI's reply
// takes seconds), and the AI is told so it can pull back further, hold you there, or push you over.
let edges = 0;
function closeSignal(fromText = false) {
    edges++;
    if (game.active) { game.edges++; game.sceneEdges++; play.edge(); }
    focus.credit('edges');
    const s = S(), pull = s.closeAction !== 'ai' && !climax.active;   // during a climax push, "close" means keep going
    arousal.close();
    // What brought you to the edge is, by definition, working: a modest positive for the phrases that did it.
    if (actEngine.running) {
        creditMotifs(0.6, 10000, 0.2); const a = actPrefs(actEngine.intent.act); a.edges = (a.edges || 0) + 1;
        const r = chars.current(); if (r) { r.edges++; chars.sess(r).edges++; chars.act(r, actEngine.intent.act).score += 0.6; }
        save();
    }
    if (actEngine.running && pull) {
        actEngine.intent.intensity = clamp(actEngine.intent.intensity * (game.active && game.mode === 'trance' ? 0.6 : 0.3), 0.05, 1);   // the trance only eases off a little: stay on the plateau
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
    focus.credit('finishes');   // before the game ends, so the finish knows which game it was
    if (game.active && game.mode === 'cuckqueen') play.herUp(25);   // watching him cum for them
    clearTimeout(ui.loadTimer); ui.loadTimer = setTimeout(() => ui.refresh(), 301000);   // the "how big?" row goes away after 5 min
    if (game.lastYes && Date.now() - game.lastYes < 90000) { S().profile.daddyReward = true; game.lastYes = 0; }   // came for her right after saying yes
    if (game.active) game.end(PERMISSION.has(game.mode) ? 'slipped' : 'finished');   // came before she allowed it: she'll have something to say
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
    if (kind === 'climax' && game.active && game.mode === 'daddy') { game.asking = true; return play.daddy('yes'); }   // daddy says so
    if (kind === 'climax' && game.active && BEGGING.has(game.mode)) {   // in these games, "Finish me" is begging: she decides
        game.begs++; focus.credit('begs'); logEvent('begged'); updatePrompt(); game.reply(800); return;
    }
    if (kind === 'climax') {   // "Finish me": start the push now and tell the AI
        enqueue(() => climax.start({})); logEvent('finish-me'); updatePrompt();
        if (S().autoReplyOnFeedback) debouncedReply(800);
        return;
    }
    if (actEngine.running) {
        const i = actEngine.intent, a = actPrefs(i.act);
        if (f.act) { f.act(i); absorb(0.15); }
        if (kind === 'love' || kind === 'nope') focus.credit(kind === 'love' ? 'loves' : 'nopes');
        if (kind === 'love') play.love();
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
        // Calibrating: nothing else may move the device, whatever asked (an AI tag, Play, Finish me, a favorite).
        if (this.active && this.step !== -1) {
            if (Date.now() - (this.toldAt || 0) > 4000) { this.toldAt = Date.now(); toast('Finish or cancel the calibration first.', 'info'); }
            return true;
        }
        if (!S().sessionCheck || sessionChecked || anyRunning()) return false;
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
        await (this.v3() ? api3.stroke(0, 1).catch(() => {}) : api.fullRange());   // calibrate against the whole device range
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
                if (Math.abs(target - this.tip) >= 10 && this.base === null) this.target(target);
            }
            if (this.base !== null && Math.abs(this.base - this.tip) >= 10) this.target(this.base);   // came Back: return to the base you had set
        }
        else if (this.step === 2) {
            if (Math.abs(this.pos - this.tip) < 10) return toast('Tip and base must be at least 10 apart. Move further and try again.', 'warning');
            this.base = this.pos; this.step = 3;
        }
        ui.calib();
    },
    // Back returns the sleeve to the mark you are about to adjust, so you fine-tune from where you set it.
    back() {
        if (this.step <= 1 || this.moving) return;
        this.step--; ui.calib();
        const to = this.step === 1 ? this.tip : this.base;
        if (to !== null && to !== undefined) this.target(to);
    },
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
    L.push(`- If the user is watching porn while you play, add scene="WHAT KIND OF SCENE" and watch="WHAT TO FOCUS ON" to a tag whenever you direct their attention: that is how you learn what gets them off.`);
    L.push(`- If the user says they are close, you are edging them: in character, pull back (lower intensity or stop), hold them right there, or push them over (raise it), and send the matching tag.`);
    L.push(`Available acts${lib.starter ? ' (starter defaults — not yet trained)' : ` (learned from ${lib.sources} scripted videos)`}:`);
    for (const [k, e] of Object.entries(lib.acts)) L.push(actLine(k, e));
    const loves = pr.log.filter((e) => e.kind === 'love' && e.act).slice(-6);
    const vt = videos.text();
    if (vt) L.push(vt);
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
    const gt = game.text();
    if (gt) L.push(gt);
    if (!game.active && game.lastResult && pending.some((e) => /^game-/.test(e.kind) && e.kind !== 'game-start')) L.push(`Game result: ${game.lastResult}. Tell them in character how they did.`);
    const ft = focus.text();
    if (ft) L.push(ft);
    const FB = { 'finish-me': 'ASKED TO BE FINISHED (the device is already building to a climax: push them over in character)',
        begged: game.active ? 'BEGGED TO CUM (the device has not changed: you decide whether they have earned it)' : 'begged to finish',
        'game-start': `STARTED THE ${GAMES[game.mode].toUpperCase()} (open it in character: tell them what to put on, and start the device)`,
        'game-allowed': 'game over: you allowed them to cum', 'game-ruined': 'game over: you ruined it', 'game-denied': 'game over: denied',
        'game-slipped': 'CAME WITHOUT PERMISSION (the edging game is over: react in character)', 'game-quit': 'THE USER ENDED THE EDGING GAME',
        'game-mommy-allowed': 'stamina training over: you let him cum', 'game-mommy-quit': 'THE USER ENDED THE STAMINA TRAINING',
        'good-girl': `HE SAID "GOOD GIRL" (boldness now ${play.bold()}/5: get bolder and filthier)`, 'daddy-wait': 'HE MADE YOU WAIT (no permission yet: pout, pull back, earn it)',
        'rival-win': 'WE HAVE A WINNER', 'game-daddy-allowed': 'DADDY SAID YES (the device is pushing him over: make him cum for you)',
        'game-daddy-slipped': 'DADDY CAME BEFORE YOU ASKED (react in character)', 'game-rivalry-allowed': 'the winner is making him cum',
        'load-small': 'HE RATED HIS LOAD: SMALL', 'load-good': 'HE RATED HIS LOAD: A GOOD ONE', 'load-huge': 'HE RATED HIS LOAD: HUGE (the biggest kind)',
        'roulette-spin': 'THE WHEEL SPINS: call a brand-new scene NOW (a different kind), with scene= and watch= and the matching act; it starts fast',
        'game-roulette-allowed': 'roulette over: you let them cum', 'game-roulette-ruined': 'roulette over: you ruined it', 'game-roulette-denied': 'roulette over: denied',
        'game-roulette-slipped': 'CAME WITHOUT PERMISSION (porn roulette is over: react in character)', 'game-roulette-quit': 'THE USER ENDED PORN ROULETTE',
        'game-trance-allowed': 'the trance is over: you brought them out with a finish', 'game-trance-quit': 'THE USER ENDED THE TRANCE (bring them up gently)',
        'game-trance-slipped': 'CAME IN THE TRANCE (it is over: soothe them, praise how deep they went)',
        'game-mommy-slipped': 'CAME BEFORE YOU ALLOWED IT (the stamina training is over: be gentle, mommy is still proud, next time he goes longer)',
        'climax-missed': 'THE CLIMAX PUSH ENDED WITHOUT A FINISH (the device has eased off: decide in character whether to tease, build again or change approach)',
        close: "I'M CLOSE", stop: 'STOP (the device has already stopped; do not restart it unless the user asks)',
        finished: S().finishAction === 'ai' ? 'FINISHED (climaxed; the device is still going: decide in character what happens now)' : 'FINISHED (climaxed; the device is winding down: be gentle, aftercare; do not restart unless the user asks)' };
    if (pending.length) L.push(`LIVE FEEDBACK since your last message (acknowledge it in character and adapt): ${pending.map((e) => (e.kind.startsWith('secret:') ? secrets.say(e) : e.kind.startsWith('use:') ? `HE IS USING YOUR ${(HOLES[e.kind.slice(4)]?.label || e.kind.slice(4)).toUpperCase()} (the device has switched: obey and degrade)` : (FB[e.kind] || gameOverText(e.kind)) + (e.kind === 'rival-win' && e.extra ? `: ${e.extra} won the rivalry and gets to make him cum` : '')) + (e.act && !e.kind.startsWith('secret:') ? ` during ${e.act}` : '')).join(', ')}.${pending.some((e) => e.kind === 'close') ? (S().closeAction === 'ai' ? ' The device has NOT eased off: your tag decides.' : climax.active ? ' The device is pushing them over: keep going.' : ' The device has already eased off a little.') : ''}`);
    L.push(']');
    return L.join('\n');
}
// "game-fucktoy-quit" and the like, for the endings without a line of their own
function gameOverText(kind) {
    const m = /^game-(?:([a-z]+)-)?(allowed|ruined|denied|slipped|finished|quit)$/.exec(kind);
    if (!m) return kind;
    const name = GAMES[m[1] || 'edging'] || 'the game';
    return { allowed: `${name} is over: they are cumming`, ruined: `${name} is over: ruined`, denied: `${name} is over: denied`,
        slipped: `CAME WITHOUT PERMISSION (${name} is over: react in character)`, finished: `${name} is over: HE CAME (react in character)`,
        quit: `THE USER ENDED ${name.toUpperCase()} (wrap it up in character)` }[m[2]];
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
        const vids = tags.flatMap((t) => videos.make(parseAttrs(t[1])));
        msg.mes = msg.mes.replace(TAG_RE, '').replace(/\n{3,}/g, '\n\n').trim() + (vids.length ? `\n\n${vids.map((v) => videos.md(v)).join('\n')}` : '');
        if (vids.length) ui.refresh();
    }
    chars.speaker = null;
    updatePrompt();
}
// <handy stop/>, and the ways models say the same thing through act/pattern.
const isStop = (a) => !!a.stop || [a.act, a.pattern].some((v) => typeof v === 'string' && /^(stop|stopped|none|off)$/i.test(v.trim()) && !LIB().acts[v.trim().toLowerCase()]);
function runCommand(a) {
    if (!S().enabled || (calib.active && calib.step !== -1)) return;   // nothing else drives the device while you calibrate
    if (isStop(a)) return stopAll();
    const changed = focus.set(a);
    if (changed === 'scene') game.newScene();
    if (changed && game.active) game.sceneLoves = 0;
    if (game.active && game.mode === 'rivalry') { const who = play.speakerOf(a); if (who) { game.speaker = who; game.scores[who] ??= 0; } }
    a = game.shape(a, changed);
    if (a.game !== undefined) return game.command(a);
    if (a.climax !== undefined && game.active) return game.command({ ...a, game: 'allow' });   // a plain climax tag in the game is her allowing it
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
    <label class="checkbox_label"><input type="checkbox" id="handy_videos_on"> Let the AI suggest video searches (links to the site's own search results)</label>
    <label class="checkbox_label"><input type="checkbox" id="handy_pics_on"> Let the AI suggest picture searches (links to PornPics search results)</label>
    <label>Site for video searches <select id="handy_video_site" class="text_pole"><option value="pornhub">Pornhub</option><option value="xhamster">xHamster</option><option value="xvideos">XVideos</option></select></label>
    <label>Games: edges before the character may end it <input type="number" id="handy_game_min" class="text_pole" min="0" max="30"></label>
    <label>Porn roulette: minutes between spins <input type="number" id="handy_roulette_min" class="text_pole" min="1" max="15"></label>
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
    <b>What gets you there</b>
    <small id="handy_focus_summary"></small>
    <div class="flex-container"><div id="handy_focus_reset" class="menu_button">Forget what I watch</div></div>
    <b>Secrets</b>
    <small id="handy_secrets_summary"></small>
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
        bind('#handy_wpm', 'readWpm'); bind('#handy_arousal', 'arousalMeter', 'checked'); bind('#handy_videos_on', 'videoLinks', 'checked'); bind('#handy_pics_on', 'picLinks', 'checked'); bind('#handy_video_site', 'videoSite'); bind('#handy_game_min', 'gameMinEdges'); bind('#handy_roulette_min', 'rouletteMinutes');
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
        $('#handy_focus_reset').on('click', () => { if (confirm('Forget what the AI has learned about the porn you watch and what gets you there?')) { delete S().profile.focus; focus.cur = null; focus.prev = []; save(); ui.refresh(); updatePrompt(); } });
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
    <div class="handy-row"><select id="handy_game_mode" class="text_pole" title="Edging game: dirty talk, porn she picks, edge after edge; she decides how it ends. Porn roulette: a new scene every few minutes, starting fast; get through it without edging. Goon trance: slow, hypnotic, held on the plateau. Mommy's stamina training: she plays your mommy, keeps you on MILF porn and edging toward a longer goal each time, then a big finish. Fucktoy: you choose what you use; degrading talk. Daddy's girl: praise makes her bolder; she must ask before making you cum. Two-girl rivalry: two girls compete to edge you. Watch party: you watch porn together. Cuckqueen: she gets off on you enjoying other women and learns your type. Panty game: panties in every detail; your drawer grows. Every game hides secrets."><option value="edging">Edging game</option><option value="roulette">Porn roulette</option><option value="trance">Goon trance</option><option value="mommy">Mommy's stamina training</option><option value="fucktoy">Fucktoy</option><option value="daddy">Daddy's girl</option><option value="rivalry">Two-girl rivalry</option><option value="party">Watch party</option><option value="cuckqueen">Cuckqueen</option><option value="panties">Panty game</option></select><div id="handy_game_btn" class="menu_button handy-game-btn" title="Start or end the game"><i class="fa-solid fa-hourglass-half"></i> <span>Start</span></div></div>
    <div id="handy_game" class="handy-small handy-game"></div>
    <div id="handy_game_actions" class="handy-game-actions"></div>
    <div id="handy_videos" class="handy-small handy-videos"></div>
    <div id="handy_load" class="handy-game-actions" title="How big was it? Teaches the AI what makes you cum hardest"><span class="handy-small">How big?</span><div class="menu_button" data-load="small">💧 Small</div><div class="menu_button" data-load="good">💦 Good</div><div class="menu_button" data-load="huge">🌊 Huge</div></div>
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
        // First in line (window, capture phase): while calibrating, ↑/↓ only move the sleeve. Otherwise the chat
        // box would see them too (↑ in an empty message box edits your last message in SillyTavern and Marinara).
        window.addEventListener('keydown', (e) => {
            if (!calib.active || !['ArrowUp', 'ArrowDown'].includes(e.key)) return;
            e.preventDefault(); e.stopImmediatePropagation(); calib.jog((e.key === 'ArrowUp' ? 1 : -1) * (e.shiftKey ? 10 : 2));
        }, true);
        $('#handy_panel').on('click', '[data-fb]', function () { feedback(this.dataset.fb); });
        $('#handy_stop').on('click', () => stopAll('stop button'));
        $('#handy_panel').on('click', '[data-use]', function () { play.use(this.dataset.use); });
        $('#handy_panel').on('click', '[data-load]', function () { focus.rateLoad(this.dataset.load); });
        $('#handy_panel').on('click', '[data-dg]', function () { play.daddy(this.dataset.dg); });
        $('#handy_game_btn').on('click', () => { if (game.active) { const n = GAMES[game.mode]; game.end('quit'); game.nudge(`${n} ended.`); } else game.start($('#handy_game_mode').val() || 'edging'); });
        $('#handy_act').on('change', function () { ui.picked = { act: this.value, was: actEngine.intent.act }; });
        $('#handy_play').on('click', () => { const act = $('#handy_act').val(), intensity = +$('#handy_intensity').val(); ui.picked = null; enqueue(() => actEngine.apply({ act, intensity })); logEvent('chose:' + act); });
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
        // Keep an act you picked in the menu until you press ▶ (or a different act starts): a refresh in between
        // (a button, an AI reply, a status update) must not switch the menu back to what played last.
        if (ui.picked && ui.picked.was !== actEngine.intent.act) ui.picked = null;
        const cur = ui.picked?.act || actEngine.intent.act || $('#handy_act').val();
        $('#handy_act').html(acts.map((a) => `<option ${a === cur ? 'selected' : ''}>${esc(a)}</option>`).join(''));
        if (actEngine.running) $('#handy_intensity').val(actEngine.intent.intensity);
        const akFav = chars.activeKey();
        const favs = pr.favorites.map((f, i) => ({ f, i })).sort((x, y) => (y.f.owner === akFav && !!akFav) - (x.f.owner === akFav && !!akFav));   // the character in control first
        $('#handy_favs').html(`<option value="">— favorites and signature moves —</option>` + favs.map(({ f, i }) => `<option value="${i}">${f.owner ? esc(s.characters?.[f.owner]?.name || 'character') + ' · ' : ''}${esc(f.name)}</option>`).join(''));
        $('#handy_game').text(game.status()).toggle(game.active);
        $('#handy_focus_summary').text(focus.summary());
        $('#handy_secrets_summary').text(secrets.summary());
        const ga = !game.active ? '' : game.mode === 'fucktoy'
            ? [...play.holes(), ...(play.spitroast() ? ['spitroast'] : [])].map((h) => `<div class="menu_button" data-use="${h}">${h === 'spitroast' ? 'Spitroast' : HOLES[h].label}</div>`).join('')
            : game.mode === 'daddy'
                ? `<div class="menu_button" data-dg="good">Good girl</div>${game.asking ? '<div class="menu_button handy-yes" data-dg="yes">Yes, make daddy cum</div><div class="menu_button" data-dg="wait">Make her wait</div>' : ''}`
                : '';
        if ($('#handy_game_actions').html() !== ga) $('#handy_game_actions').html(ga);
        $('#handy_game_actions').toggle(!!ga);
        const vl = S().videoLinks ? videos.list.slice(-3).reverse() : [];
        $('#handy_videos').html(vl.map((v) => `<a href="${esc(v.url)}" target="_blank" rel="noopener noreferrer">${v.icon} ${esc(v.q)}</a> <span>(${esc(v.site)})</span>`).join('<br>')).toggle(vl.length > 0);
        $('#handy_load').toggle(!!focus.lastFinish && Date.now() - focus.lastFinish.t < 300000);
        $('#handy_game_btn').toggleClass('on', game.active).find('span').text(game.active ? 'End' : 'Start');
        $('#handy_game_mode').prop('disabled', game.active); if (game.active) $('#handy_game_mode').val(game.mode);
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
    c.eventSource.on(ev.CHAT_CHANGED, () => { stopAll(); game.reset(); focus.clear(); pending = []; edges = 0; chars.who = null; chars.speaker = null; chars.partner = null; chars.current(); ui.refresh(); updatePrompt(); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && S().escStops && anyActive()) stopAll('Esc'); });
    window.addEventListener('beforeunload', () => {
        if (!anyActive()) return;
        epoch++;
        api.call('PUT', '/mode', { mode: 0 }, true).catch(() => {});
        api.hampStop(true).catch(() => {}); api.hsspStop(true).catch(() => {});
        if (S().appId) api3.stop(true).catch(() => {});
    });
    S().profile.sessions++; save(); updatePrompt();
    setInterval(() => { arousal.tick(); focus.tick(1); game.tick(1); }, 1000);
    window.handyAdaptive = { actEngine, hamp, calib, chars, climax, arousal, game, focus, play, secrets, videos, cleanQuery, setups, proseCues, feedback, stop: stopAll, active: anyActive, run: (a) => enqueue(() => runCommand(a)), api, api3, profile: () => S().profile, library: LIB };
});
