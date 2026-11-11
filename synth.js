// Motion synthesizer: turns a high-level intent ("blowjob, intensity 0.6, a bit
// tip-focused, blend in some handjob") into a fresh funscript-style stream of
// actions. It improvises from the learned motion library: short motifs cut from
// your hand-made scripts are re-timed, re-scaled and jittered, and mixed with
// procedural phrases generated from each act's measured statistics. It starts
// out exploring the library, then settles on the phrases (and the order of
// phrases) you've rated highly, while staying responsive to the scene.

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const rnd = (a = 0, b = 1) => a + Math.random() * (b - a);
// Numbers arrive from saved settings, imported files and model-written tags; never let a bad one through.
const fin = (v, d) => (v !== null && v !== '' && typeof v !== 'boolean' && Number.isFinite(+v) ? +v : d);
const validMotif = (m) => m && m.rate > 0 && Number.isFinite(+m.center) && Array.isArray(m.strokes) && m.strokes.length >= 2
    && m.strokes.every((x) => Array.isArray(x) && x[0] > 0 && Number.isFinite(+x[1]));
function gauss() { let u = 0, v = 0; while (!u) u = Math.random(); while (!v) v = Math.random(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }

const s = (mean, std) => ({ mean, std });
// Starter profiles so things work before you train. Replaced/extended by your library.
export const STARTER_LIBRARY = {
    version: 1, starter: true, acts: {
        teasing:   { rate: s(0.9, 0.3), amp: s(25, 8),  center: s(78, 8),  irregularity: 0.35, asym: 1.2, pause_frac: 0.15, amp_std: 8,  motion: 'slow, short strokes near the tip, lots of pauses', description: '', motifs: [] },
        handjob:   { rate: s(2.0, 0.6), amp: s(55, 12), center: s(58, 10), irregularity: 0.18, asym: 1.0, pause_frac: 0.03, amp_std: 10, motion: 'moderate, medium strokes, steady rhythm', description: '', motifs: [] },
        blowjob:   { rate: s(1.4, 0.5), amp: s(45, 15), center: s(66, 10), irregularity: 0.32, asym: 1.15, pause_frac: 0.08, amp_std: 14, motion: 'moderate, medium strokes biased to the tip, organic rhythm, varying depth', description: '', motifs: [] },
        deepthroat:{ rate: s(0.8, 0.3), amp: s(80, 10), center: s(48, 8),  irregularity: 0.3, asym: 1.3, pause_frac: 0.2, amp_std: 10, motion: 'slow, full-length strokes with holds at the base', description: '', motifs: [] },
        cowgirl:   { rate: s(1.7, 0.6), amp: s(50, 15), center: s(45, 12), irregularity: 0.22, asym: 0.9, pause_frac: 0.04, amp_std: 12, motion: 'moderate, medium strokes lower in the range', description: '', motifs: [] },
        missionary:{ rate: s(1.8, 0.6), amp: s(65, 12), center: s(50, 10), irregularity: 0.15, asym: 1.0, pause_frac: 0.03, amp_std: 10, motion: 'moderate, long, steady strokes', description: '', motifs: [] },
        doggy:     { rate: s(2.4, 0.7), amp: s(60, 12), center: s(50, 10), irregularity: 0.15, asym: 0.9, pause_frac: 0.02, amp_std: 10, motion: 'fast, long, steady strokes', description: '', motifs: [] },
    },
};

export function resolveAct(lib, name) {
    if (!lib?.acts || !name) return null;
    const n = String(name).toLowerCase().trim().replace(/[\s-]+/g, '_');
    if (lib.acts[n]) return n;
    for (const k of Object.keys(lib.acts)) if (k.includes(n) || n.includes(k)) return k;
    return null;
}

function pickWeighted(items, weightFn) {
    const w = items.map(weightFn), tot = w.reduce((a, b) => a + b, 0);
    let r = Math.random() * tot;
    for (let i = 0; i < items.length; i++) if ((r -= w[i]) <= 0) return items[i];
    return items[items.length - 1];
}

/**
 * How much the engine still experiments for an act: 1 = brand new, falls towards
 * a small floor as your ratings for that act accumulate. Scaled by the user's
 * "try new things" setting (prefs.exploreBias, default 1).
 */
export function exploration(prefs, act) {
    const a = prefs?.acts?.[act];
    const evidence = (a?.n ?? 0) + 2 * (a?.loves ?? 0);
    return clamp((1 / (1 + evidence / 20)) * (prefs?.exploreBias ?? 1), 0.1 * Math.min(1, prefs?.exploreBias ?? 1), 1);
}

/** Target movement for one act right now, combining library stats, the user's learned taste and the live intent. */
export function targetFor(lib, actName, intent, prefs, tMs = 0, drift = null) {
    const prof = lib?.acts?.[actName] || STARTER_LIBRARY.acts.handjob;
    const ap = prefs?.acts?.[actName] || {};
    const st = intent.style || {};   // the character in control (charstyle.js effect()), if any
    const intensity = clamp(fin(intent.intensity, 0.5), 0, 1);
    const felt = clamp(intensity + fin(st.intensityBias, 0), 0, 1);
    const variation = clamp(fin(intent.variation, fin(ap.variation, 0.35)) + fin(intent.varOff, 0) + fin(st.varOff, 0), 0, 1);
    const explore = exploration(prefs, actName);
    const d = drift ? 1 + 0.15 * variation * Math.sin((2 * Math.PI * tMs) / drift.period + drift.phase) : 1;
    const rate = clamp(fin(prof.rate?.mean, 1.5) * lerp(0.6, 1.5, felt) * fin(ap.rateMul, 1) * fin(intent.speedMul, 1) * fin(st.rateMul, 1) * d, 0.15, 6);
    const amp = clamp(fin(prof.amp?.mean, 50) * fin(ap.ampMul, 1) * fin(intent.ampMul, 1) * fin(st.ampMul, 1) * lerp(0.9, 1.1, felt), 8, 100);
    const center = clamp(fin(prof.center?.mean, 50) + 25 * (fin(intent.depth, 0) + fin(intent.depthOff, 0)) + fin(ap.centerShift, 0) + fin(st.centerShift, 0), amp / 2, 100 - amp / 2);
    // jitter = the organic feel you like (variation) + whatever experimenting is still going on (explore),
    // made more uneven for an inexperienced character and more precise for an expert one
    const jitter = clamp(variation * (0.35 + 0.65 * explore) * fin(st.jitterMul, 1) + (fin(st.jitterMul, 1) > 1 ? 0.15 * (st.jitterMul - 1) : 0), 0, 1.5);
    return { rate, amp, center, variation, intensity, explore, jitter, prof };
}

/**
 * Learning rule shared by the extension: each phrase / phrase-pair keeps a
 * running average of how you reacted to it (-1 = "not this", 0 = meh, 1 = loved).
 * Averages (rather than running totals) let "loved nearly every time" stand out
 * from "loved once", instead of everything that's played often looking great.
 */
export const REWARD = { love: 1, nope: -1, neutral: 0.15 };
export function reinforce(map, key, reward, alpha = 0.3) {
    const s = map[key];
    map[key] = s === undefined ? reward * 0.6 : s + alpha * (reward - s);
}

/**
 * Choose the next phrase. Early on: wide sampling, untried phrases get a bonus.
 * With experience: strongly prefers phrases you rated highly AND phrases you've
 * liked coming right after the previous one (learned combinations).
 */
export function pickMotif(motifs, prefs, act, prev, rate, explore, recent = {}, curious = false, own = null) {
    const scores = prefs?.motifs || {}, trans = prefs?.trans || {};
    const beta = curious ? 0.3 : lerp(3.0, 0.8, explore);  // how greedy the choice is
    return pickWeighted(motifs, (m) => {
        const sc = scores[m.id];
        const tk = prev ? trans[`${prev}>${m.id}`] : undefined;
        let value = sc === undefined ? 0.5 * explore : 2 * sc;
        if (prev) {
            value += tk !== undefined ? 2 * tk
                // curiosity: an untried pairing of two phrases you like is worth a try
                : (sc ?? 0) > 0.3 && (scores[prev] ?? 0) > 0.3 ? 0.6 : 0;
        }
        // don't wear one phrase out, unless you've liked it repeating
        if (!(tk > 0.4)) value -= 0.5 * (recent[m.id] ?? 0);
        // the character in control has favourite phrases of their own (what you loved when they did it)
        if (own && own[m.id] !== undefined) value += 1.5 * own[m.id];
        const fit = Math.exp(-1.5 * Math.abs(Math.log(m.rate / rate)));
        return Math.exp(beta * clamp(value, -6, 6)) * fit;
    });
}

// Re-time and re-scale a motif to the target. Jitter shrinks as the engine settles.
// `lastPos` is where the previous phrase left the device. Motifs are cut from scripts at arbitrary
// turning points, so one may begin (or, when repeated, begin again) at the end of the stroke the
// device has just finished; played as-is that is a dead beat. Each pass therefore starts on the first
// stroke that actually travels, and that joining stroke is timed by its distance, not by the source.
function fromMotif(m, tg, phraseMs, lastPos) {
    const strokes = [];
    let t = 0, cur = lastPos;
    const j = tg.jitter;
    const speed = Math.max(20, 2 * tg.amp * tg.rate);   // typical travel speed of this phrase, %/s
    const near = 0.3 * tg.amp;                          // closer than this reads as a stall, not a stroke
    while (t < phraseMs) {
        const ts = (m.rate / tg.rate) * (1 + gauss() * 0.08 * j);
        const as = (tg.amp / Math.max(5, m.amp)) * (1 + gauss() * 0.1 * j);
        const shift = gauss() * 4 * j;
        const at = (pos) => tg.center + (pos - m.center) * as + shift;
        let k = 0;
        while (k < m.strokes.length - 1 && k < 3 && Math.abs(at(m.strokes[k][1]) - cur) < near) k++;
        for (let i = k; i < m.strokes.length; i++) {
            const [dur, pos] = m.strokes[i];
            const p = at(pos);
            let d = Math.max(60, dur * ts * (1 + gauss() * 0.05 * j));
            if (i === k) d = clamp((Math.abs(p - cur) / speed) * 1000, 60, d * 2.5);
            strokes.push([d, p]);
            cur = p; t += d;
            if (t >= phraseMs) break;
        }
    }
    return { strokes, motif: m.id };
}

// Generate a phrase directly from the act's statistics (used when there are no
// learned phrases, or occasionally while still exploring).
function procedural(tg, phraseMs, lastPos) {
    const p = tg.prof, strokes = [];
    const half = 1000 / (2 * tg.rate);
    const cv = clamp((p.irregularity ?? 0.2) * (0.5 + tg.jitter), 0.02, 0.8);
    const asym = clamp(p.asym ?? 1, 0.5, 2);
    const upF = (2 * asym) / (1 + asym), downF = 2 / (1 + asym);
    const phraseAmp = tg.amp * (1 + gauss() * 0.12 * tg.jitter);
    const phraseCenter = tg.center + gauss() * 6 * tg.jitter;
    let up = lastPos < phraseCenter, t = 0, first = true;
    while (t < phraseMs) {
        if (Math.random() < (p.pause_frac ?? 0.05) * 0.6) {
            const d = rnd(250, 1100); strokes.push([d, null]); t += d; // hold
        }
        const a = Math.max(6, phraseAmp + gauss() * (p.amp_std ?? 8) * 0.6 * (0.5 + tg.jitter));
        const target = up ? phraseCenter + a / 2 : phraseCenter - a / 2;
        let d = Math.max(60, half * (up ? upF : downF) * Math.exp(gauss() * cv));
        // the first stroke starts wherever the last phrase ended, so time it by the distance it really covers
        if (first) { d = clamp((d * Math.abs(target - lastPos)) / a, 60, d * 2.5); first = false; }
        strokes.push([d, target]);
        t += d; up = !up;
    }
    return { strokes, motif: null };
}

/**
 * Build `durationMs` of motion starting at time 0 from `startPos`, continuing
 * after phrase `prevMotif` (so learned transitions carry across chunks).
 * Returns { actions:[{at,pos}], used:[{from,to,act,motif}], lastMotif }.
 */
export function synthesize({ lib, intent, prefs, limits, durationMs, startPos = 50, prevMotif = null }) {
    const actions = [{ at: 0, pos: Math.round(startPos) }];
    const used = [];
    const mix = [[intent.act, 1], ...Object.entries(intent.blend || {}).filter(([a, w]) => lib?.acts?.[a] && w > 0)];
    const drift = { period: rnd(18000, 40000), phase: rnd(0, 2 * Math.PI) };
    let t = 0, pos = startPos, prev = prevMotif;
    const recent = {};

    let first = true;
    while (t < durationMs) {
        // A teasing character now and then stops between phrases and holds still for a moment.
        const tease = fin(intent.style?.tease, 0);
        if (!first && tease > 0.05 && Math.random() < 0.35 * tease) {
            t += rnd(400, 1000) * (0.6 + tease);
            actions.push({ at: Math.round(t), pos: Math.round(clamp(pos, 0, 100)) });
        }
        first = false;
        const act = pickWeighted(mix, ([, w]) => w)[0];
        const tg = targetFor(lib, act, intent, prefs, t, drift);
        // phrase length: your learned "how long before I want a change", else 4-12 s
        const kept = prefs?.acts?.[act]?.keptSec;
        const phraseMs = kept && tg.explore < 0.6 ? clamp(kept * 1000 * rnd(0.6, 1.1), 3000, 30000) : rnd(4000, 12000);
        const motifs = (tg.prof.motifs || []).filter((m) => validMotif(m) && !prefs?.banned?.[m.id]);   // phrases you firmly rejected never come back
        const useProcedural = !motifs.length || Math.random() < 0.3 * tg.explore + 0.1 * tg.variation;
        const phrase = useProcedural
            ? procedural(tg, phraseMs, clamp(pos, 0, 100))
            // now and then, even when dialed in, try a less-proven phrase (that's how new favorites and combos get found)
            : fromMotif(pickMotif(motifs, prefs, act, prev, tg.rate, tg.explore, recent,
                Math.random() < Math.max(0.07 * Math.min(1, prefs?.exploreBias ?? 1), 0.5 * tg.explore), intent.style?.motifs), tg, phraseMs, clamp(pos, 0, 100));
        const i0 = actions.length - 1;
        for (const [dur, p] of phrase.strokes) {
            t += dur;
            if (p !== null) pos = p;
            actions.push({ at: Math.round(t), pos: Math.round(clamp(pos, 0, 100)) });
            if (t >= durationMs) break;
        }
        if (actions.length - 1 === i0) { t += 250; actions.push({ at: Math.round(t), pos: Math.round(clamp(pos, 0, 100)) }); }   // never spin without advancing
        used.push({ i0, i1: actions.length - 1, act, motif: phrase.motif });
        if (phrase.motif) {
            prev = phrase.motif;
            for (const k in recent) recent[k] *= 0.6;
            recent[prev] = (recent[prev] ?? 0) + 1;
        }
    }
    // Speed limiting stretches time, so report each phrase's span on the final timeline (feedback is credited by time).
    const out = enforceLimits(actions, limits);
    return { actions: out, used: used.map((u) => ({ from: out[u.i0].at, to: out[u.i1].at, act: u.act, motif: u.motif })), lastMotif: prev };
}

/** Clamp positions and slow down any move faster than the user's limit. */
export function enforceLimits(actions, { floor = 0, ceil = 100, maxVel = 400, minMs = 60 } = {}) {
    const out = [];
    let at = 0;
    for (let i = 0; i < actions.length; i++) {
        const pos = Math.round(clamp(actions[i].pos, floor, ceil));
        if (i === 0) { out.push({ at: actions[0].at, pos }); at = actions[0].at; continue; }
        const dt = actions[i].at - actions[i - 1].at;
        const dp = Math.abs(pos - out[out.length - 1].pos);
        at += Math.ceil(Math.max(dt, dp > 0 ? minMs : 0, (dp / maxVel) * 1000));   // whole ms, rounded up: never faster than the cap
        out.push({ at, pos: Math.round(pos) });
    }
    return out;
}

/** Position at time t (ms) within an action list. */
export function posAt(actions, t) {
    if (!actions?.length) return 50;
    if (t <= actions[0].at) return actions[0].pos;
    for (let i = 1; i < actions.length; i++) {
        if (actions[i].at >= t) {
            const a = actions[i - 1], b = actions[i];
            return a.pos + (b.pos - a.pos) * ((t - a.at) / Math.max(1, b.at - a.at));
        }
    }
    return actions[actions.length - 1].pos;
}
