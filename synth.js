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
    const intensity = clamp(intent.intensity ?? 0.5, 0, 1);
    const variation = clamp((intent.variation ?? ap.variation ?? 0.35) + (intent.varOff ?? 0), 0, 1);
    const explore = exploration(prefs, actName);
    const d = drift ? 1 + 0.15 * variation * Math.sin((2 * Math.PI * tMs) / drift.period + drift.phase) : 1;
    const rate = clamp(prof.rate.mean * lerp(0.6, 1.5, intensity) * (ap.rateMul ?? 1) * (intent.speedMul ?? 1) * d, 0.15, 6);
    const amp = clamp(prof.amp.mean * (ap.ampMul ?? 1) * (intent.ampMul ?? 1) * lerp(0.9, 1.1, intensity), 8, 100);
    const center = clamp(prof.center.mean + 25 * ((intent.depth ?? 0) + (intent.depthOff ?? 0)) + (ap.centerShift ?? 0), amp / 2, 100 - amp / 2);
    // jitter = the organic feel you like (variation) + whatever experimenting is still going on (explore)
    const jitter = variation * (0.35 + 0.65 * explore);
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
export function pickMotif(motifs, prefs, act, prev, rate, explore, recent = {}, curious = false) {
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
        const fit = Math.exp(-1.5 * Math.abs(Math.log(m.rate / rate)));
        return Math.exp(beta * clamp(value, -6, 6)) * fit;
    });
}

// Re-time and re-scale a motif to the target. Jitter shrinks as the engine settles.
function fromMotif(m, tg, phraseMs) {
    const strokes = [];
    let t = 0;
    const j = tg.jitter;
    while (t < phraseMs) {
        const ts = (m.rate / tg.rate) * (1 + gauss() * 0.08 * j);
        const as = (tg.amp / Math.max(5, m.amp)) * (1 + gauss() * 0.1 * j);
        const shift = gauss() * 4 * j;
        for (const [dur, pos] of m.strokes) {
            const d = Math.max(60, dur * ts * (1 + gauss() * 0.05 * j));
            strokes.push([d, tg.center + (pos - m.center) * as + shift]);
            t += d;
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
    let up = lastPos < tg.center, t = 0;
    const phraseAmp = tg.amp * (1 + gauss() * 0.12 * tg.jitter);
    const phraseCenter = tg.center + gauss() * 6 * tg.jitter;
    while (t < phraseMs) {
        if (Math.random() < (p.pause_frac ?? 0.05) * 0.6) {
            const d = rnd(250, 1100); strokes.push([d, null]); t += d; // hold
        }
        const a = Math.max(6, phraseAmp + gauss() * (p.amp_std ?? 8) * 0.6 * (0.5 + tg.jitter));
        const target = up ? phraseCenter + a / 2 : phraseCenter - a / 2;
        const d = Math.max(60, half * (up ? upF : downF) * Math.exp(gauss() * cv));
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

    while (t < durationMs) {
        const act = pickWeighted(mix, ([, w]) => w)[0];
        const tg = targetFor(lib, act, intent, prefs, t, drift);
        // phrase length: your learned "how long before I want a change", else 4-12 s
        const kept = prefs?.acts?.[act]?.keptSec;
        const phraseMs = kept && tg.explore < 0.6 ? clamp(kept * 1000 * rnd(0.6, 1.1), 3000, 30000) : rnd(4000, 12000);
        const motifs = tg.prof.motifs || [];
        const useProcedural = !motifs.length || Math.random() < 0.3 * tg.explore + 0.1 * tg.variation;
        const phrase = useProcedural
            ? procedural(tg, phraseMs, pos)
            // now and then, even when dialed in, try a less-proven phrase (that's how new favorites and combos get found)
            : fromMotif(pickMotif(motifs, prefs, act, prev, tg.rate, tg.explore, recent,
                Math.random() < Math.max(0.07 * Math.min(1, prefs?.exploreBias ?? 1), 0.5 * tg.explore)), tg, phraseMs);
        const start = t;
        for (const [dur, p] of phrase.strokes) {
            t += dur;
            if (p !== null) pos = p;
            actions.push({ at: Math.round(t), pos: Math.round(clamp(pos, 0, 100)) });
            if (t >= durationMs) break;
        }
        used.push({ from: start, to: t, act, motif: phrase.motif });
        if (phrase.motif) {
            prev = phrase.motif;
            for (const k in recent) recent[k] *= 0.6;
            recent[prev] = (recent[prev] ?? 0) + 1;
        }
    }
    return { actions: enforceLimits(actions, limits), used, lastMotif: prev };
}

/** Clamp positions and slow down any move faster than the user's limit. */
export function enforceLimits(actions, { floor = 0, ceil = 100, maxVel = 400, minMs = 60 } = {}) {
    const out = [];
    let at = 0;
    for (let i = 0; i < actions.length; i++) {
        const pos = clamp(actions[i].pos, floor, ceil);
        if (i === 0) { out.push({ at: actions[0].at, pos }); at = actions[0].at; continue; }
        const dt = actions[i].at - actions[i - 1].at;
        const dp = Math.abs(pos - out[out.length - 1].pos);
        at += Math.max(dt, dp > 0 ? minMs : 0, (dp / maxVel) * 1000);
        out.push({ at: Math.round(at), pos: Math.round(pos) });
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
