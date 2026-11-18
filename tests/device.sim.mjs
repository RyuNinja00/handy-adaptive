// Device-level checks: the real extension code driving a simulated Handy (see sim/bench.mjs).
// Each check fails loudly; `npm test` exits non-zero if any does.
import fs from 'fs';
import { boot, sample, pct } from './sim/bench.mjs';
import { synthesize } from '../synth.js';

const lib = JSON.parse(fs.readFileSync(new URL('./fixtures/motion_library.json', import.meta.url)));
const settled = { rateMul: 1, ampMul: 1, centerShift: 0, variation: 0, score: 0, n: 400, loves: 200, keptSec: 0 };
const flat = (rate, amp) => ({ version: 1, sources: 1, acts: { a: { rate: { mean: rate }, amp: { mean: amp }, center: { mean: 50 }, irregularity: 0, asym: 1, pause_frac: 0, amp_std: 0, motion: '', description: '', motifs: [] } } });
const cap = 60 + 0.8 * 540;   // default Max speed 80%
let failed = 0;
const check = (name, ok, detail = '') => { console.log(`${ok ? 'ok  ' : 'FAIL'} ${name}${detail ? '  (' + detail + ')' : ''}`); if (!ok) failed++; };
const moving = (h, ms = 2000) => h.dev.cmds.some((c) => !c.rejected && c.t > h.now() - ms) || !!h.dev.hssp?.playing;

// 1. phrases join without dead beats (the fixture's "doggy" source contains no pauses at all)
{
    const lim = { floor: 0, ceil: 100, maxVel: cap, minMs: 60 };
    const prefs = { acts: { doggy: { ...settled, variation: 0.2 } }, motifs: {}, trans: {}, exploreBias: 1 };
    let joins = 0, dead = 0, over = 0, prev = null, pos = 50;
    for (let k = 0; k < 60; k++) {
        const r = synthesize({ lib, intent: { act: 'doggy', intensity: 0.3 }, prefs, limits: lim, durationMs: 20000, startPos: pos, prevMotif: prev });
        const A = r.actions;
        for (let i = 1; i < A.length; i++) if ((Math.abs(A[i].pos - A[i - 1].pos) / (A[i].at - A[i - 1].at)) * 1000 > cap) over++;
        for (const u of r.used) { const i = A.findIndex((x) => x.at > u.from); if (i < 1) continue; joins++; if (Math.abs(A[i].pos - A[i - 1].pos) < 10) dead++; }
        prev = r.lastMotif; pos = A[A.length - 1].pos;
    }
    check('phrases chain without dead beats', dead === 0, `${dead} of ${joins} joins stalled`);
    check('generated motion never exceeds the speed cap', over === 0, `${over} moves over`);
}

// 2. streaming keeps rhythm and the speed cap on a slow connection
for (const [rtt, rate] of [[150, 3], [250, 3], [400, 2]]) {
    const h = await boot({ rtt, seed: rtt + rate, settings: { library: flat(rate / 1.05, 60) } });
    h.st.extensionSettings.handy_adaptive.profile.acts.a = { ...settled };
    h.H.run({ act: 'a', intensity: 0.5, variation: 0 }); await h.advance(40000);
    const from = h.now() - 30000, cmds = h.dev.cmds.filter((c) => !c.rejected && c.t >= from), s = sample(h, from, h.now());
    let still = 0, run = 0, rev = 0, dir = 0;
    for (let i = 1; i < s.length; i++) {
        const d = Math.sign(s[i] - s[i - 1]);
        if (!d) run += 5; else { if (run >= 60) still += run; run = 0; if (dir && d !== dir) rev++; dir = d; }
    }
    const vmax = Math.max(...cmds.map((c) => c.v));
    check(`streaming @ ${rtt} ms round trip, ${rate} strokes/s: speed cap held`, vmax <= cap * 1.02, `fastest ${Math.round(vmax)} %/s, cap ${cap}`);
    check(`streaming @ ${rtt} ms round trip, ${rate} strokes/s: rhythm held`, rev / 2 / 30 > 0.93 * rate && still / 30000 < 0.06, `${(rev / 60).toFixed(2)} strokes/s, ${((100 * still) / 30000).toFixed(1)}% stalled`);
}

// 3. adjusting mid-stroke continues from where the device really is
{
    const h = await boot({ seed: 5, settings: { library: flat(0.5, 80) } });
    h.st.extensionSettings.handy_adaptive.profile.acts.a = { ...settled };
    const E = h.H.actEngine, orig = E.gen_.bind(E), gens = [];
    E.gen_ = (at, pos, ms, pm) => { gens.push({ at, pos }); return orig(at, pos, ms, pm); };
    h.H.run({ act: 'a', intensity: 0.5, variation: 0 }); await h.advance(12000);
    const errs = [];
    for (let k = 0; k < 30; k++) {
        await h.advance(2300 + (137 * k) % 900);
        const n0 = gens.length; h.H.feedback(k % 2 ? 'faster' : 'slower'); await h.advance(2700);
        const g = gens[n0]; if (g) errs.push(Math.abs(g.pos - sample(h, g.at, g.at)[0]));
    }
    check('adjusting mid-stroke re-plans from the true position', Math.max(...errs) <= 5, `worst error ${Math.max(...errs).toFixed(1)}% over ${errs.length} adjustments`);
}

// 4. stop always wins
{
    let h = await boot({ seed: 21 });
    h.message('He grins. <handy act="handjob" intensity="0.5"/> Then he pulls away. <handy stop/>'); await h.advance(5000);
    check('act tag then stop tag in one message ends stopped', !h.H.active() && !moving(h));

    h = await boot({ seed: 22 });
    h.H.run({ act: 'handjob', intensity: 0.5 }); await h.advance(5000);
    h.message('<handy stop/> She switches. <handy act="blowjob" intensity="0.5"/>'); await h.advance(6000);
    check('stop tag then act tag in one message ends moving', h.H.actEngine.running && h.dev.mode === 2 && moving(h) && !h.dev.cmds.some((c) => c.rejected));

    h = await boot({ seed: 23 });
    h.H.run({ act: 'handjob', intensity: 0.5 }); await h.advance(40);
    const saw = h.H.active(); h.H.stop(); await h.advance(5000);
    check('stop pressed while streaming is still starting', saw && !h.H.active() && !moving(h));

    h = await boot({ seed: 24, settings: { transport: 'hssp' } });
    h.H.run({ act: 'handjob', intensity: 0.5 }); await h.advance(700);
    const saw2 = h.H.active(); h.H.stop(); await h.advance(6000);
    check('stop pressed while script sync is still starting', saw2 && !h.H.active() && !moving(h));

    h = await boot({ seed: 9, settings: { library: flat(0.5, 80) } });
    h.st.extensionSettings.handy_adaptive.profile.acts.a = { ...settled };
    let worst = 0;
    for (let k = 0; k < 10; k++) {
        h.H.run({ act: 'a', intensity: 0.5, depth: k % 2 ? 0.4 : -0.4 }); await h.advance(6000 + k * 333);
        const before = h.devPos(); h.H.stop(); let far = 0;
        for (let ms = 0; ms < 1500; ms += 5) { await h.advance(5); far = Math.max(far, Math.abs(h.devPos() - before)); }
        worst = Math.max(worst, far);
    }
    check('stop holds the device where it is', worst <= 12, `moved at most ${worst.toFixed(0)}% after stop`);
}

// 5. sloppy numbers from the model can't break the engine
for (const [tag, want] of [['<handy act="blowjob" intensity=“0.6”/>', 0.6], ['<handy act="blowjob" intensity="high"/>', 0.3], ['<handy act="blowjob" intensity="70%"/>', 0.7], ['<handy act="blowjob" intensity="7"/>', 0.7], ['<handy act="blowjob" intensity/>', 0.3]]) {
    const h = await boot({ seed: 31 });
    h.H.run({ act: 'blowjob', intensity: 0.3 }); await h.advance(5000);
    h.message(tag); await h.advance(6000);
    const got = h.H.actEngine.intent.intensity;
    check(`tag ${tag}`, Math.abs(got - want) < 1e-9 && moving(h) && !h.dev.cmds.some((c) => c.rejected), `intensity ${got}`);
}

// 6. script sync: one refill pending, and swaps start near where the old script is
{
    const h = await boot({ seed: 41, settings: { transport: 'hssp' } });
    h.H.run({ act: 'handjob', intensity: 0.5 }); await h.advance(8000);
    for (let k = 0; k < 6; k++) { h.H.feedback(k % 2 ? 'faster' : 'slower'); await h.advance(6000); }
    const pending = h.timers().filter((t) => t.delay === 110000).length, u0 = h.dev.uploads;
    await h.advance(240000);
    const jumps = h.dev.hsspEvents.filter((e) => e.type === 'play').slice(2).map((e) => e.jump);
    check('script sync keeps exactly one refill pending', pending === 1 && h.dev.uploads - u0 <= 3, `${pending} pending, ${h.dev.uploads - u0} uploads in 4 idle minutes`);
    // seven swaps is a small sample (the median moves 5-20% with the network's luck), so pool a few runs
    for (const seed of [42, 43, 44]) {
        const g = await boot({ seed, settings: { transport: 'hssp' } });
        g.H.run({ act: 'handjob', intensity: 0.5 }); await g.advance(8000);
        for (let k = 0; k < 6; k++) { g.H.feedback(k % 2 ? 'faster' : 'slower'); await g.advance(6000); }
        await g.advance(240000);
        jumps.push(...g.dev.hsspEvents.filter((e) => e.type === 'play').slice(2).map((e) => e.jump));
    }
    check('script sync swaps start near the old script position', pct(jumps, 0.5) <= 14, `median mismatch ${pct(jumps, 0.5).toFixed(0)}% over ${jumps.length} swaps`);
}

// 7. "Not this" is not undone by a later "Love this" on the replacement
{
    let wrong = 0, n = 0;
    for (let seed = 50; seed < 70; seed++) {
        const h = await boot({ seed, settings: { library: lib } });
        const pr = h.st.extensionSettings.handy_adaptive.profile; pr.acts.doggy = { ...settled };
        h.H.run({ act: 'doggy', intensity: 0.3 }); await h.advance(9000);
        const U = h.H.actEngine.used, cur = U.filter((u) => u.motif && u.from <= h.now() && u.to > h.now()).pop(); if (!cur) continue;
        h.H.feedback('nope'); const after = pr.motifs[cur.motif];
        await h.advance(2500);
        const now = h.H.actEngine.used.filter((u) => u.from <= h.now() && u.to > h.now()).pop();
        if (!now || now.motif === cur.motif) continue;
        h.H.feedback('love'); n++; if (pr.motifs[cur.motif] > after + 1e-9) wrong++;
    }
    check('a rejected phrase gets no credit from a later "Love this"', n > 5 && wrong === 0, `${wrong} of ${n}`);
}

// 8. the first stroke of a start respects the speed cap wherever the device really is
for (const at of [0, 100]) {
    const h = await boot({ seed: 60 + at, startPos: at, settings: { library: flat(2.8, 90) } });
    h.st.extensionSettings.handy_adaptive.profile.acts.a = { ...settled };
    h.H.run({ act: 'a', intensity: 1, variation: 0 }); await h.advance(3000);
    const v = Math.max(...h.dev.cmds.filter((c) => !c.rejected).slice(0, 3).map((c) => c.v));
    check(`first strokes from a device resting at ${at}% stay under the cap`, v <= cap * 1.02, `fastest ${Math.round(v)} %/s`);
}

// 9. stroke limits hold in every mode, including stop
{
    const lim = { strokeFloor: 20, strokeCeil: 70 };
    let h = await boot({ seed: 70, startPos: 0, settings: lim });
    h.H.run({ act: 'doggy', intensity: 1, depth: -1 }); await h.advance(15000); h.H.stop(); await h.advance(2000);
    const outS = h.dev.cmds.filter((c) => !c.rejected && (c.p1 < 20 || c.p1 > 70)).length;
    h = await boot({ seed: 71, settings: { ...lim, transport: 'hssp' } });
    h.H.run({ act: 'teasing', intensity: 1, depth: 1 }); await h.advance(8000);
    const pts = Object.values(h.dev.scripts).flat(), outH = pts.filter((p) => p.pos < 20 || p.pos > 70).length;
    h = await boot({ seed: 72, settings: lim });
    h.message('<handy pattern="deep" min="0" max="100"/>'); await h.advance(3000);
    const outP = h.dev.slides.filter((x) => x.min < 20 || x.max > 70).length;
    check('stroke limits hold in streaming, script sync and pattern modes', outS + outH + outP === 0, `${outS} streaming, ${outH} script, ${outP} pattern points outside 20-70`);
}

// 10. typing stop stops at once; story text that merely contains the word does not
{
    let h = await boot({ seed: 80 });
    h.H.run({ act: 'handjob', intensity: 0.6 }); await h.advance(4000);
    h.say('Stop!'); await h.advance(3000);
    check('a message that is only "Stop!" stops the device', !h.H.active() && !moving(h));
    h = await boot({ seed: 81 });
    h.H.run({ act: 'handjob', intensity: 0.6 }); await h.advance(4000);
    h.say("Don't stop, please. Wait for me."); await h.advance(3000);
    check('"don\'t stop" in a story message keeps it going', h.H.active() && moving(h));
    h = await boot({ seed: 82, settings: { safeword: 'pineapple' } });
    h.H.run({ act: 'handjob', intensity: 0.6 }); await h.advance(4000);
    h.say('Okay... Pineapple. I need a break.'); await h.advance(3000);
    check('the safeword anywhere in a message stops the device', !h.H.active() && !moving(h));
    const p = h.st.prompts.filter(Boolean).pop() || '';
    check('the AI is told the user stopped it', /STOP \(the device has already stopped/.test(p));
}

// 11. "I'm close" eases off at once and tells the AI
{
    let h = await boot({ seed: 90 });
    h.H.run({ act: 'handjob', intensity: 0.8 }); await h.advance(6000);
    const before = h.dev.cmds.filter((c) => !c.rejected && c.t > h.now() - 3000);
    h.H.feedback('close'); await h.advance(4000);
    const after = h.dev.cmds.filter((c) => !c.rejected && c.t > h.now() - 3000);
    const rate = (cs) => cs.length / 3;
    const p = h.st.prompts.filter(Boolean).pop() || '';
    check('"I\'m close" slows the device within a second', h.H.actEngine.intent.intensity < 0.3 && rate(after) < rate(before), `${rate(before).toFixed(1)} → ${rate(after).toFixed(1)} strokes/s`);
    check('"I\'m close" is passed to the AI with the edge count', /I'M CLOSE/.test(p) && /edge this chat: 1/.test(p));
    h = await boot({ seed: 91, settings: { closeAction: 'ai' } });
    h.H.run({ act: 'handjob', intensity: 0.8 }); await h.advance(6000);
    h.H.feedback('close'); await h.advance(2000);
    check('"Let the AI decide" leaves the motion alone and asks for a reply', h.H.actEngine.intent.intensity === 0.8 && h.st.replies === 1);
}

// ---- buffered streaming (API v3 HSP) ----
async function live(h, ms, step = 10) { const out = []; for (let t = 0; t < ms; t += step) { await h.advance(step); out.push(h.devPos()); } return out; }
function motion(s, step = 10) {
    let still = 0, run = 0, rev = 0, dir = 0, vmax = 0;
    for (let i = 1; i < s.length; i++) {
        const d = s[i] - s[i - 1];
        vmax = Math.max(vmax, (Math.abs(d) / step) * 1000);
        if (Math.abs(d) < 1e-6) run += step; else { if (run >= 60) still += run; run = 0; const sg = Math.sign(d); if (dir && sg !== dir) rev++; dir = sg; }
    }
    if (run >= 60) still += run;
    const secs = (s.length * step) / 1000;
    return { rate: rev / 2 / secs, stalled: still / (s.length * step), vmax };
}
const v3 = { transport: 'hsp', appId: 'APP' };
for (const [label, opts] of [['150 ms round trip', { rtt: 150 }], ['400 ms round trip', { rtt: 400 }], ['background tab (timers ~1/s)', { rtt: 150, minTimer: 1000 }]]) {
    const h = await boot({ seed: 100 + label.length, ...opts, settings: { ...v3, library: flat(2 / 1.05, 60) } });
    h.st.extensionSettings.handy_adaptive.profile.acts.a = { ...settled };
    h.H.run({ act: 'a', intensity: 0.5, variation: 0 }); await h.advance(8000);
    const m = motion(await live(h, 30000));
    check(`buffered streaming, ${label}: rhythm held`, h.H.actEngine.mode === 'hsp' && m.rate > 1.9 && m.stalled < 0.02, `${m.rate.toFixed(2)} strokes/s, ${(100 * m.stalled).toFixed(1)}% stalled`);
    check(`buffered streaming, ${label}: speed cap held`, m.vmax <= cap * 1.03, `fastest ${Math.round(m.vmax)} %/s`);
}
{
    const h = await boot({ seed: 120, settings: { ...v3, library: flat(1 / 1.05, 70) } });
    h.st.extensionSettings.handy_adaptive.profile.acts.a = { ...settled };
    h.H.run({ act: 'a', intensity: 0.5, variation: 0 }); await h.advance(8000);
    const reacted = [];
    for (let k = 0; k < 12; k++) {
        await h.advance(1700 + (311 * k) % 900);
        const n0 = h.dev.hspAdds.length, t = h.now();
        h.H.feedback(k % 2 ? 'faster' : 'slower');
        await h.advance(2500);
        const fl = h.dev.hspAdds.slice(n0).find((x) => x.flush);
        if (fl) reacted.push({ ms: fl.t - t, jump: fl.jump });
    }
    const s = await live(h, 20000); const m = motion(s);
    check('buffered streaming: changes swap in without a jump', reacted.length === 12 && Math.max(...reacted.map((r) => r.jump)) <= 2, `largest jump ${Math.max(...reacted.map((r) => r.jump)).toFixed(1)}%`);
    check('buffered streaming: a change reaches the device within ~½ s', Math.max(...reacted.map((r) => r.ms)) <= 600, `slowest ${Math.max(...reacted.map((r) => r.ms))} ms`);
    let stall = 0;
    h.H.feedback('faster'); const s2 = await live(h, 4000);
    for (let i = 1, run = 0; i < s2.length; i++) { if (Math.abs(s2[i] - s2[i - 1]) < 1e-6) { run += 10; stall = Math.max(stall, run); } else run = 0; }
    check('buffered streaming: no stall around a change', stall < 60, `longest pause ${stall} ms`);
    h.H.stop(); await h.advance(1500);
    const p = h.devPos(); await h.advance(3000);
    check('buffered streaming: stop halts the device', !h.H.active() && !h.dev.hsp.playing && Math.abs(h.devPos() - p) < 1e-6);
}
{
    const h = await boot({ seed: 130, settings: { ...v3, library: flat(1.5, 60) } });
    h.st.extensionSettings.handy_adaptive.profile.acts.a = { ...settled };
    h.H.run({ act: 'a', intensity: 0.5, variation: 0 }); await h.advance(8000);
    h.dev.offline3 = true; await h.advance(1000); h.dev.offline3 = false;
    const m = motion(await live(h, 10000));
    check('buffered streaming rides out a 1 s network drop', h.H.active() && m.rate > 1.35 && m.stalled < 0.03, `${m.rate.toFixed(2)} strokes/s afterwards, ${(100 * m.stalled).toFixed(1)}% stalled`);
    h.dev.offline3 = true; await h.advance(15000);
    const p = h.devPos(); await h.advance(3000);
    check('a long network loss stops the extension; the device pauses when its buffer runs out', !h.H.active() && Math.abs(h.devPos() - p) < 1e-6);
}
{
    const h = await boot({ seed: 140, settings: { ...v3 } });
    h.dev.offline3 = true;
    h.H.run({ act: 'handjob', intensity: 0.5 }); await h.advance(8000);
    check('buffered streaming falls back to Streaming when API v3 is unreachable', h.H.actEngine.mode === 'hdsp' && moving(h) && h.toasts.some((t) => /Buffered streaming unavailable/.test(t.m)));
}

// ---- calibration ----
// Wait until a calibration move has finished (the dialog won't take "This is my tip" while it moves).
async function settle(h) { for (let i = 0; i < 200 && h.H.calib.moving; i++) await h.advance(100); }
async function calibrate(h, tip, base) {
    h.H.calib.start(); await h.advance(500);
    h.H.calib.begin(); await h.advance(5000); await settle(h);
    const jogTo = async (p) => { while (h.H.calib.pos !== p) { h.H.calib.jog(Math.max(-10, Math.min(10, p - h.H.calib.pos))); await h.advance(600); } await settle(h); };
    await jogTo(tip); h.H.calib.mark(); await settle(h); await jogTo(base); h.H.calib.mark(); h.H.calib.finish(); await h.advance(500);
}
for (const [tip, base, transport] of [[80, 20, 'hdsp'], [15, 85, 'hdsp'], [75, 25, 'hsp']]) {
    const h = await boot({ seed: 150 + tip, settings: { ...v3, transport } });
    await calibrate(h, tip, base);
    const c = h.st.extensionSettings.handy_adaptive.calibration;
    const s1 = [];
    h.H.run({ act: 'doggy', intensity: 1, depth: -1 }); await h.advance(4000); for (let k = 0; k < 1500; k++) { await h.advance(10); s1.push(h.devPos()); }
    h.H.run({ act: 'teasing', intensity: 0.4, depth: 1 }); await h.advance(5000); const s2 = []; for (let k = 0; k < 1500; k++) { await h.advance(10); s2.push(h.devPos()); }
    h.H.stop(); await h.advance(1000);
    const lo = Math.min(tip, base), hi = Math.max(tip, base), all = [...s1, ...s2];
    const mean = (a) => a.reduce((x, y) => x + y, 0) / a.length;
    const nearTip = Math.abs(mean(s2) - tip) < Math.abs(mean(s2) - base);
    const m = { vmax: Math.max(motion(s1).vmax, motion(s2).vmax) };
    check(`calibration ${base}→${tip} (${transport}): saved, motion stays between base and tip`, c?.tip === tip && c?.base === base && Math.min(...all) >= lo - 0.5 && Math.max(...all) <= hi + 0.5, `device range ${Math.round(Math.min(...all))}-${Math.round(Math.max(...all))}`);
    check(`calibration ${base}→${tip} (${transport}): "tip" teasing happens at your tip`, nearTip, `teasing averages ${Math.round(mean(s2))}`);
    check(`calibration ${base}→${tip} (${transport}): speed cap still holds on the device`, m.vmax <= cap * 1.03, `fastest ${Math.round(m.vmax)} %/s`);
}
{
    const h = await boot({ seed: 170 });
    h.H.calib.start(); await h.advance(300); h.H.calib.begin(); await h.advance(5000);
    h.H.calib.jog(10); await h.advance(200);
    const tagWhile = h.dev.cmds.length; h.message('<handy act="doggy" intensity="1"/>'); await h.advance(2000);
    const ignored = h.dev.cmds.filter((c) => !c.rejected).length - tagWhile <= 1 && !h.H.actEngine.running;
    h.H.stop(); await h.advance(1500);
    check('during calibration AI tags are ignored, and STOP ends it', ignored && !h.H.calib.active && !h.H.active());
    const moves = h.dev.cmds.filter((c) => !c.rejected).map((c) => c.v);
    check('calibration moves are slow (≤ 25 %/s)', Math.max(...moves) <= 26, `fastest ${Math.round(Math.max(...moves))} %/s`);
}

// ---- streaming on an uneven connection: strokes glide through late commands instead of stalling ----
for (const [rtt, jitter, most] of [[250, 0.5, 12], [400, 0.6, 45]]) {
    const h = await boot({ seed: 11, rtt, jitter, settings: { ornaments: false } });
    h.message('<handy act="handjob" intensity="0.6"/>'); await h.advance(8000);
    let last = h.devPos(), run = 0, stalls = 0;
    for (let i = 0; i < 12000; i++) { await h.advance(10); const p = h.devPos(); if (Math.abs(p - last) < 0.02) run += 10; else { if (run >= 60 && run < 1000) stalls++; run = 0; } last = p; }
    // and with narrow limits: the glide past a turn must stop at them
    const h2 = await boot({ seed: 12, rtt, jitter, settings: { ornaments: false, strokeFloor: 10, strokeCeil: 90 } });
    h2.message('<handy act="handjob" intensity="0.9"/>'); await h2.advance(8000);
    let lo = 100, hi = 0;
    for (let i = 0; i < 6000; i++) { await h2.advance(10); const p = h2.devPos(); lo = Math.min(lo, p); hi = Math.max(hi, p); }
    const v = Math.max(...[...h.dev.cmds, ...h2.dev.cmds].filter((c) => !c.rejected).map((c) => c.v));
    check(`streaming, ${rtt} ms round trip varying ±${jitter * 100}%: few stalls at the turns`, stalls / 2 <= most, `${(stalls / 2).toFixed(0)} per minute (was ${rtt === 250 ? 48 : 95})`);
    check(`streaming, ${rtt} ms uneven: run-on stays inside the stroke limits and the speed cap`, lo >= 10 - 0.01 && hi <= 90 + 0.01 && v <= (60 + 0.8 * 540) * 1.03, `range ${lo.toFixed(0)}-${hi.toFixed(0)}, fastest ${Math.round(v)} %/s`);
    if (rtt === 400) check('a slow connection is pointed out once, with the smoother transport named', h.toasts.filter((t) => /Script sync is smoother/.test(t.m)).length === 1);
}

// ---- nothing else moves the device while you calibrate ----
{
    const run = async (what) => {
        const h = await boot({ seed: 176, settings: { calibration: { base: 20, tip: 80 } } });
        h.H.calib.start(); await h.advance(300); h.H.calib.begin(); await h.advance(5000); await settle(h);
        const before = h.dev.cmds.length;
        if (what === 'play') h.H.actEngine.apply({ act: 'handjob', intensity: 0.8 });
        if (what === 'finish me') h.H.feedback('climax');
        if (what === 'pattern') h.H.hamp.play('wave', { speed: 60 });
        if (what === 'AI tag') h.message('<handy act="handjob" intensity="0.7"/>');
        await h.advance(4000);
        return !h.H.actEngine.running && !h.H.hamp.running && h.H.calib.active && h.dev.cmds.length === before;
    };
    const res = {}; for (const w of ['play', 'finish me', 'pattern', 'AI tag']) res[w] = await run(w);
    check('during calibration, Play, Finish me, patterns and AI tags cannot move the device', Object.values(res).every(Boolean), Object.entries(res).filter(([, v]) => !v).map(([k]) => k).join(', '));
    const h = await boot({ seed: 177 });
    h.H.run({ act: 'handjob', intensity: 0.5 }); await h.advance(4000);
    const slide = h.dev.calls.filter((c) => /\/slide/.test(c.path));
    check('starting an act restores the device\'s full stroke range first', slide.length >= 1 && /"min":0/.test(JSON.stringify(slide[0].body)) && /"max":100/.test(JSON.stringify(slide[0].body)), JSON.stringify(slide[0]?.body));
}

// ---- calibration buttons: both directions, whenever they are pressed ----
for (const transport of ['hdsp', 'hsp']) {
    const h = await boot({ seed: 175, startPos: 0, settings: { transport, appId: 'APP', calibration: { base: 20, tip: 80 } } });
    const c = h.H.calib;
    c.start(); await h.advance(300); c.begin(); await h.advance(700);
    for (let i = 0; i < 4; i++) { c.jog(-2); await h.advance(400); }   // pressed while it is still travelling up from the bottom
    const early = c.step === 0;
    await h.advance(4000); await settle(h);
    const press = async (d) => { const a = h.devPos(); c.jog(d); await h.advance(700); await settle(h); return h.devPos() - a; };
    const moves = [await press(-2), await press(-10), await press(2), await press(10)];
    for (let i = 0; i < 5; i++) { c.jog(-2); await h.advance(60); } await settle(h);
    const fast = Math.round(h.devPos());
    c.jog(-10); await h.advance(150); c.jog(10); c.jog(10); await settle(h);
    const v = Math.max(...h.dev.cmds.filter((x) => !x.rejected).map((x) => x.v));
    check(`(${transport}) calibration: the arrow buttons only appear once the sleeve has arrived`, early && c.step === 1);
    check(`(${transport}) calibration: ▼ lowers and ▲ raises the sleeve by the amount shown`, Math.round(moves[0]) === -2 && Math.round(moves[1]) === -10 && Math.round(moves[2]) === 2 && Math.round(moves[3]) === 10, moves.map((m) => Math.round(m)).join(', '));
    check(`(${transport}) calibration: quick presses add up, and a change of mind mid-move lands where you asked`, fast === 70 && Math.round(h.devPos()) === 80 && c.pos === 80, `5×▼ → ${fast}, then ▼10 ▲10 ▲10 → ${Math.round(h.devPos())}`);
    check(`(${transport}) calibration: no move is ever faster than 25 %/s`, v <= 25 * 1.05, `${Math.round(v)} %/s`);
}

// ---- session question and quick re-check ----
for (const transport of ['hdsp', 'hsp']) {
    const h = await boot({ seed: 180, settings: { transport, appId: 'APP', sessionCheck: true, calibration: { base: 20, tip: 80, at: '2026-11-01' } } });
    h.message('<handy act="handjob" intensity="0.6"/>'); await h.advance(1500);
    h.message('<handy act="blowjob" intensity="0.5"/>'); await h.advance(3000);
    const asked = h.H.calib.active && h.H.calib.step === -1 && h.dev.calls.length === 0 && !h.H.actEngine.running;
    check(`(${transport}) first motion of a session waits for "same setup?", nothing is sent to the device`, asked, `calls ${h.dev.calls.length}, step ${h.H.calib.step}`);
    h.H.calib.confirm(); await h.advance(6000);
    check(`(${transport}) "Use it and start" runs the latest waiting command`, !h.H.calib.active && h.H.actEngine.running && h.H.actEngine.intent.act === 'blowjob');
    h.H.stop(); await h.advance(1500);
    h.message('<handy act="handjob" intensity="0.6"/>'); await h.advance(4000);
    check(`(${transport}) it only asks once per session`, !h.H.calib.active && h.H.actEngine.running);
}
{
    const h = await boot({ seed: 181, settings: { sessionCheck: true, calibration: { base: 20, tip: 80 } } });
    h.message('<handy act="handjob" intensity="0.6"/>'); await h.advance(2000);
    h.H.stop(); await h.advance(1500);
    const quiet = !h.H.calib.active && h.dev.calls.length === 0;
    h.message('<handy act="handjob" intensity="0.6"/>'); await h.advance(2000);
    check('STOP while asking: nothing moves, and the next motion asks again', quiet && h.H.calib.step === -1 && h.dev.calls.length === 0);
}
{
    const h = await boot({ seed: 182, settings: { sessionCheck: true, calibration: { base: 20, tip: 80 } } });
    h.message('<handy act="handjob" intensity="0.6"/>'); await h.advance(2000);
    h.H.calib.recal(); await h.advance(500);
    const opened = h.H.calib.active && h.H.calib.step === 0 && h.H.calib.pending === null;
    h.H.calib.begin(); await h.advance(5000);
    const atOldTip = h.H.calib.step === 1 && h.H.calib.pos === 80 && Math.abs(h.devPos() - 80) < 1;
    h.H.calib.jog(2); await h.advance(400); h.H.calib.jog(2); await h.advance(400);   // the Handy sits 4 higher today
    await settle(h); h.H.calib.mark(); await h.advance(4000); await settle(h);
    // last base 20 shifted by +4 = 24, stopped 10% short toward the tip = 30
    const pre = h.H.calib.step === 2 && h.H.calib.pos === 30 && Math.abs(h.devPos() - 30) < 1;
    const deepest = Math.min(...h.dev.traj.filter((x) => x.t > 0).map((x) => x.p ?? 100), h.devPos());
    check('"Recalibrate" drops the waiting command and starts at last time\'s tip', opened && atOldTip, `pos ${h.H.calib.pos}, device ${Math.round(h.devPos())}`);
    check('after the tip, the sleeve waits just short of the shifted base (never deeper than before)', pre && deepest >= 24, `pos ${h.H.calib.pos}, deepest ${Math.round(deepest)}`);
    h.H.calib.jog(-2); await h.advance(400); h.H.calib.jog(-2); await h.advance(400); h.H.calib.jog(-2); await h.advance(400);
    await settle(h); h.H.calib.mark(); h.H.calib.finish(); await h.advance(500);
    const c = h.st.extensionSettings.handy_adaptive.calibration;
    h.message('<handy act="handjob" intensity="0.6"/>'); await h.advance(5000);
    check('a finished recalibration counts as the session check', c.tip === 84 && c.base === 24 && !h.H.calib.active && h.H.actEngine.running, `tip ${c.tip} base ${c.base}`);
}
{
    const h = await boot({ seed: 183, settings: { sessionCheck: true, calibration: null } });
    h.H.run({ act: 'handjob', intensity: 0.5 }); await h.advance(2000);
    const asked = h.H.calib.step === -1 && h.dev.calls.length === 0;
    h.H.calib.confirm(); await h.advance(5000);
    check('not calibrated: it asks, and "Start without calibrating" starts', asked && h.H.actEngine.running);
}

// ---- character styles ----
{
    const { seedStyle } = await import('../charstyle.js');
    const shy = seedStyle('Lily is a shy, inexperienced virgin who gets flustered easily.').traits;
    const dom = seedStyle('Vex is a dominant, sadistic succubus who loves teasing and orgasm control.').traits;
    const calm = seedStyle('Mira is calm and precise. She is not shy at all.').traits;
    check('card reading: a shy virgin is slow, short and inexperienced', shy.tempo < -0.3 && shy.reach < 0 && shy.exp < 0.3, JSON.stringify(shy));
    check('card reading: a dominant succubus teases, holds back and is experienced', dom.tease > 0.6 && dom.eager < -0.3 && dom.exp > 0.75, JSON.stringify(dom));
    check('card reading: "not shy" is not read as shy', calm.tempo === 0 && calm.exp >= 0.5 && calm.wild < 0, JSON.stringify(calm));
}
const CARDS = [
    { name: 'Lily', avatar: 'lily.png', description: 'A shy, inexperienced virgin. Sweet, gentle and easily flustered.', personality: 'timid, nervous' },
    { name: 'Rex', avatar: 'rex.png', description: 'Wild, rough and horny. An athletic brute who is aggressive and energetic.', personality: 'insatiable' },
    { name: 'Vex', avatar: 'vex.png', description: 'A dominant succubus who loves teasing and orgasm control.', personality: 'sadistic, playful' },
];
async function styleRun(card, seed) {
    const h = await boot({ seed });
    Object.assign(h.st, { characters: CARDS, characterId: CARDS.indexOf(card) });
    h.message('<handy act="handjob" intensity="0.6"/>', { name: card.name }); await h.advance(2000);
    const t0 = h.now(); await h.advance(60000);
    const rec = h.st.extensionSettings.handy_adaptive.characters[card.avatar];
    const tg = h.H.actEngine.describe();
    const r = +/≈([\d.]+) strokes/.exec(tg)[1];
    return { h, rec, rate: r, desc: tg, t0 };
}
{
    const lily = await styleRun(CARDS[0], 300), rex = await styleRun(CARDS[1], 301);
    const plain = await boot({ seed: 302 });
    plain.message('<handy act="handjob" intensity="0.6"/>'); await plain.advance(5000);
    const pr = +/≈([\d.]+) strokes/.exec(plain.H.actEngine.describe())[1];
    check('the same tag feels different per character: shy Lily slower, wild Rex faster than no character',
        lily.rate < pr * 0.85 && rex.rate > pr * 1.15, `Lily ${lily.rate}, none ${pr}, Rex ${rex.rate} strokes/s`);
    const cap = 60 + 0.8 * 540;
    const seg = (h) => h.dev.cmds.filter((c) => !c.rejected).map((c) => c.v);
    check('character styles stay within the speed cap', Math.max(...seg(rex.h)) <= cap * 1.03, `fastest ${Math.round(Math.max(...seg(rex.h)))} %/s`);
    check('each character\'s style is created from the card and remembered', lily.rec?.name === 'Lily' && rex.rec?.traits.tempo > 0.3 && lily.rec.acts.handjob?.n >= 1);
    check('the AI is told the character\'s style', /CHARACTER STYLE: Lily .*inexperienced/.test(lily.h.st.prompts.filter(Boolean).pop()));
}
{
    // tease: Vex pauses between phrases; Rex doesn't
    const holds = async (card, seed) => {
        const h = await boot({ seed });
        Object.assign(h.st, { characters: CARDS, characterId: CARDS.indexOf(card) });
        h.message('<handy act="handjob" intensity="0.5"/>'); await h.advance(2000);
        const r = h.H.actEngine.gen_(0, 50, 300000);
        let n = 0; for (let i = 1; i < r.used.length; i++) if (r.used[i].from - r.used[i - 1].to >= 380) n++;   // a still gap between two phrases
        return n;
    };
    const v = await holds(CARDS[2], 310), x = await holds(CARDS[1], 311);
    check('a teasing character holds still between phrases now and then', v >= 5 && v > 3 * x, `Vex ${v} pauses vs Rex ${x} in 5 min`);
}
{
    // group chat: each message is credited to whoever wrote it, and feedback teaches only them
    const h = await boot({ seed: 320, settings: { library: lib } });
    Object.assign(h.st, { characters: CARDS, groupId: 'g1' });
    h.message('<handy act="blowjob" intensity="0.6"/>', { name: 'Lily', original_avatar: 'lily.png' }); await h.advance(6000);
    const who1 = h.H.chars.who;
    for (let k = 0; k < 3; k++) { h.H.feedback('faster'); await h.advance(1500); }
    h.H.feedback('love'); await h.advance(3000);
    const C = h.st.extensionSettings.handy_adaptive.characters;
    const lilyRate = C['lily.png'].learned.rateMul, lilyMotifs = Object.keys(C['lily.png'].motifs).length;
    h.message('<handy act="blowjob" intensity="0.6"/>', { name: 'Rex', original_avatar: 'rex.png' }); await h.advance(4000);
    check('group chat: the character who sent the tag is in control', who1 === 'lily.png' && h.H.chars.who === 'rex.png');
    check('feedback while Lily is in control teaches Lily (and your general taste), not Rex',
        lilyRate > 1.05 && lilyMotifs > 0 && C['rex.png'].learned.rateMul === 1 && Object.keys(C['rex.png'].motifs).length === 0 && h.st.extensionSettings.handy_adaptive.profile.acts.blowjob.rateMul > 1.02,
        `Lily x${lilyRate.toFixed(2)}, Rex x${C['rex.png'].learned.rateMul}, general x${h.st.extensionSettings.handy_adaptive.profile.acts.blowjob.rateMul.toFixed(2)}, Lily rated ${lilyMotifs} phrases`);
}
{
    // time together: inexperienced Lily grows more confident; style persists into the next session
    const h = await boot({ seed: 330 });
    Object.assign(h.st, { characters: CARDS, characterId: 0 });
    h.message('<handy act="handjob" intensity="0.5"/>'); await h.advance(2000);
    for (let m = 0; m < 30; m++) { await h.advance(60000); h.H.feedback('slower'); h.H.feedback('faster'); }   // keep it active
    const rec = h.st.extensionSettings.handy_adaptive.characters['lily.png'];
    const saved = structuredClone(h.st.extensionSettings.handy_adaptive);
    const h2 = await boot({ seed: 331, settings: { characters: saved.characters } });
    Object.assign(h2.st, { characters: CARDS, characterId: 0 });
    const again = h2.H.chars.current();
    check('time together makes an inexperienced character more confident', rec.minutes >= 25 && rec.learned.expGain > 0.15, `${rec.minutes} min, experience +${rec.learned.expGain.toFixed(2)}`);
    check('a character\'s style and history carry over to the next session', again.minutes === rec.minutes && again.learned.expGain === rec.learned.expGain);
    // you can turn it off
    const h3 = await boot({ seed: 332, settings: { charStyles: false } });
    Object.assign(h3.st, { characters: CARDS, characterId: 1 });
    h3.message('<handy act="handjob" intensity="0.6"/>'); await h3.advance(3000);
    check('with character styles off, nothing is styled or stored', h3.H.chars.effect() === null && !Object.keys(h3.st.extensionSettings.handy_adaptive.characters).length);
}

// ---- replies with several tags play at reading pace ----
{
    const words = (n) => Array.from({ length: n }, (_, i) => 'word' + i).join(' ');
    const reply = `She starts slowly. <handy act="handjob" intensity="0.3"/> ${words(110)} <handy intensity="0.9"/> ${words(110)} <handy stop/> ${words(20)}`;
    const h = await boot({ seed: 400 });   // 220 words/min: the second tag is due at 30 s, the stop at 60 s
    h.message(reply); await h.advance(8000);
    const a = h.H.actEngine.intent.intensity, clean = !/<handy/.test(h.st.chat.at(-1).mes);
    await h.advance(27000); const b = h.H.actEngine.intent.intensity, runB = h.H.active();
    await h.advance(30000);
    check('several tags in one reply play in order as you read', a === 0.3 && b === 0.9 && runB && !h.H.active() && clean, `8 s: ${a}, 35 s: ${b}, 65 s: ${h.H.active() ? 'running' : 'stopped'}`);
    const h2 = await boot({ seed: 401 });
    h2.message(reply); await h2.advance(8000); h2.H.stop(); await h2.advance(40000);
    check('STOP drops the tags still waiting in the reply', !h2.H.active());
    const h3 = await boot({ seed: 402 });
    h3.message(reply); await h3.advance(8000);
    h3.message('<handy act="blowjob" intensity="0.5"/> A new reply.'); await h3.advance(60000);
    check('a new reply replaces the tags still waiting from the old one', h3.H.active() && h3.H.actEngine.intent.act === 'blowjob' && h3.H.actEngine.intent.intensity === 0.5);
    const h4 = await boot({ seed: 403, settings: { readWpm: 0 } });
    h4.message(`<handy act="handjob" intensity="0.3"/> ${words(110)} <handy intensity="0.9"/>`); await h4.advance(4000);
    check('reading speed 0 plays every tag at once, as before', h4.H.actEngine.intent.intensity === 0.9);
    const h5 = await boot({ seed: 404 });
    h5.message(`<handy act="handjob" intensity="0.4"/> ${words(60)} <handy stop/> ${words(60)} <handy act="blowjob" intensity="0.6"/>`);
    await h5.advance(20000); const stopped = !h5.H.active(); await h5.advance(20000);
    check('a stop in the middle of a reply stops, and the tag after it still plays', stopped && h5.H.active() && h5.H.actEngine.intent.act === 'blowjob');
}

// ---- idle timer ----
{
    const h = await boot({ seed: 410, settings: { idleStopSec: 600 } });
    h.message('<handy act="handjob" intensity="0.5"/>'); await h.advance(5000);
    for (let i = 0; i < 12; i++) { await h.advance(60000); h.say('mmm, that feels good'); h.message('She keeps going, humming softly.'); }
    const alive = h.H.active();
    await h.advance(11 * 60000);
    check('chatting counts as activity; silence still stops the device', alive && !h.H.active());
}

// ---- climax push ----
for (const transport of ['hdsp', 'hsp']) {
    const h = await boot({ seed: 420, settings: { library: lib, transport, appId: 'APP' } });
    h.message('<handy act="blowjob" intensity="0.4"/>'); await h.advance(8000);
    h.message('Now. <handy climax="20"/>'); await h.advance(1500);
    const seen = [];
    for (let i = 0; i < 22; i++) { seen.push(h.H.actEngine.intent.intensity); await h.advance(1000); }
    const rising = seen.every((v, i) => i === 0 || v >= seen[i - 1] - 1e-9);
    h.H.feedback('close'); await h.advance(3000);
    const held = h.H.actEngine.intent.intensity === 1 && h.H.climax.active;
    const vmax = transport === 'hdsp' ? Math.max(...h.dev.cmds.filter((c) => !c.rejected).map((c) => c.v)) : 0;
    check(`(${transport}) climax push builds steadily to the peak and stays within the speed cap`, rising && seen[0] <= 0.5 && seen.at(-1) === 1 && h.H.actEngine.intent.act === 'blowjob' && vmax <= (60 + 0.8 * 540) * 1.03, `${seen[0].toFixed(2)} → ${seen.at(-1)}, fastest ${Math.round(vmax)} %/s`);
    check(`(${transport}) "I'm close" during a climax push keeps going instead of easing off`, held);
    h.H.feedback('finish'); await h.advance(3000);
    const pr = h.st.extensionSettings.handy_adaptive.profile;
    check(`(${transport}) finishing ends the push, winds down, and remembers what was playing`, !h.H.climax.active && h.H.actEngine.intent.intensity <= 0.05 && pr.acts.blowjob.finishes === 1 && Object.keys(pr.finishers).length > 0 && Object.keys(pr.motifs).length > 0, `${Object.keys(pr.finishers).length} finishing phrases`);
}
{
    const h = await boot({ seed: 430, settings: { library: lib } });
    h.st.extensionSettings.handy_adaptive.profile.acts.doggy = { rateMul: 1, ampMul: 1, centerShift: 0, variation: 0.35, score: 0, n: 0, loves: 0, keptSec: 0, finishes: 3 };
    h.H.feedback('climax'); await h.advance(4000);
    const picked = h.H.actEngine.intent.act, told = /ASKED TO BE FINISHED/.test(h.st.prompts.filter(Boolean).pop());
    check('"Finish me" from a standstill picks the act that has made you finish most, and tells the AI', picked === 'doggy' && h.H.climax.active && told, `picked ${picked}`);
    await h.advance(95000);
    const p = h.st.prompts.filter(Boolean).pop();
    check('a push with no finish eases off after a minute at the peak and tells the AI', !h.H.climax.active && h.H.active() && h.H.actEngine.intent.intensity === 0.6 && /CLIMAX PUSH ENDED WITHOUT A FINISH/.test(p));
    const h2 = await boot({ seed: 431, settings: { library: lib } });
    h2.message('<handy climax="30"/>'); await h2.advance(8000);
    h2.message('<handy act="handjob" intensity="0.3"/>'); await h2.advance(12000);
    check('a new instruction ends a climax push', !h2.H.climax.active && h2.H.actEngine.intent.intensity === 0.3 && !h2.H.actEngine.intent.climax);
    const h3 = await boot({ seed: 432, settings: { library: lib } });
    h3.message('<handy climax="30"/>'); await h3.advance(8000); h3.H.stop(); await h3.advance(40000);
    check('STOP ends a climax push for good', !h3.H.active() && !h3.H.climax.active);
}

// ---- arousal estimate ----
{
    const h = await boot({ seed: 440 });
    h.message('<handy act="handjob" intensity="0.8"/>'); await h.advance(90000);
    const mid = h.H.arousal.level; await h.advance(400000);
    const capped = h.H.arousal.level, told = /AROUSAL ESTIMATE: about \d+%/.test(h.st.prompts.filter(Boolean).pop());
    h.H.feedback('close'); const edge = h.H.arousal.level;
    h.H.feedback('finish'); const after = h.H.arousal.level, label = h.H.arousal.label();
    check('arousal estimate builds with time, never claims the edge without your signal, and follows your signals',
        mid > 0.15 && mid < 0.6 && capped <= 0.85 && capped > 0.6 && edge >= 0.92 && after <= 0.1 && /just finished/.test(label) && told, `90 s: ${mid.toFixed(2)}, long: ${capped.toFixed(2)}, close: ${edge.toFixed(2)}, finished: ${after.toFixed(2)}`);
    const h2 = await boot({ seed: 441 });
    h2.message('<handy act="handjob" intensity="0.8"/>'); await h2.advance(60000);
    const k0 = h2.H.arousal.k(); h2.H.feedback('close'); const k1 = h2.H.arousal.k();
    await h2.advance(2000); h2.H.stop(); await h2.advance(240000);
    check('it learns your pace from "I\'m close", and fades when nothing is moving', k1 > k0 * 1.1 && h2.st.extensionSettings.handy_adaptive.profile.arousalK === k1 && h2.H.arousal.level < 0.15, `pace x${(k1 / k0).toFixed(2)}, 4 min after stopping: ${h2.H.arousal.level.toFixed(2)}`);
    const h3 = await boot({ seed: 442, settings: { arousalMeter: false } });
    h3.message('<handy act="handjob" intensity="0.8"/>'); await h3.advance(30000);
    check('with the estimate off, the AI is not sent one', !/AROUSAL ESTIMATE/.test(h3.st.prompts.filter(Boolean).pop()));
}

// ---- reading a card with a model ----
{
    const prof = { connectionManager: { profiles: [{ id: 'p-bg', name: 'Background' }] } };
    const mk = async (seed, sendRequest, extra = {}) => {
        const h = await boot({ seed, settings: extra });
        Object.assign(h.st.extensionSettings, prof);
        const calls = []; h.st.ConnectionManagerRequestService = { sendRequest: async (...a) => { calls.push(a); return sendRequest(...a); } };
        Object.assign(h.st, { characters: [{ name: 'Mia', avatar: 'mia.png', description: '{{user}} is a shy virgin. Mia hates rough men. She is a calm, experienced courtesan.' }], characterId: 0 });
        return { h, calls };
    };
    const good = await mk(450, async () => ({ content: '<think>…</think>{"tempo": -0.4, "reach": 0.6, "focus": -0.2, "wild": -0.5, "tease": 0.7, "eager": -0.6, "exp": 0.9, "why": "A patient expert."}' }));
    good.h.message('<handy act="handjob" intensity="0.5"/>'); await good.h.advance(3000);
    const r = good.h.st.extensionSettings.handy_adaptive.characters['mia.png'];
    good.h.message('<handy intensity="0.6"/>'); await good.h.advance(3000);
    check('a character card is read once by the chosen connection profile', r.source === 'ai' && r.traits.tease === 0.7 && r.traits.exp === 0.9 && r.why === 'A patient expert.' && good.calls.length === 1 && good.calls[0][0] === 'p-bg' && /Mia/.test(good.calls[0][1][1].content));
    const bad = await mk(451, async () => { throw new Error('server not running'); });
    bad.h.message('<handy act="handjob" intensity="0.5"/>'); await bad.h.advance(3000);
    const rb = bad.h.st.extensionSettings.handy_adaptive.characters['mia.png'];
    check('if the model can\'t be reached, the keyword reading is used and you are told once', rb.source === 'words' && rb.traits.exp > 0.6 && rb.traits.tempo === 0 && bad.h.H.active() && bad.h.toasts.filter((t) => /keyword reading/.test(t.m)).length === 1, JSON.stringify(rb.traits));
    const junk = await mk(452, async () => 'I cannot help with that.');
    junk.h.message('<handy act="handjob" intensity="0.5"/>'); await junk.h.advance(3000);
    check('an unusable answer from the model leaves the keyword reading in place', junk.h.st.extensionSettings.handy_adaptive.characters['mia.png'].source === 'words');
    const off = await mk(453, async () => ({ content: '{}' }), { styleProfile: '' });
    off.h.message('<handy act="handjob" intensity="0.5"/>'); await off.h.advance(3000);
    check('"Keywords only" never calls a model', off.calls.length === 0);
    check('keyword reading ignores sentences about the user and things the character dislikes', rb.hits.join() === 'experienced,courtesan,calm' || (!rb.hits.includes('shy') && !rb.hits.includes('rough')), rb.hits.join(','));
}

// ---- signature moves ----
{
    const h = await boot({ seed: 460, settings: { library: lib } });
    Object.assign(h.st, { characters: CARDS, groupId: 'g' });
    h.message('<handy act="blowjob" intensity="0.7" depth="0.5"/>', { name: 'Vex', original_avatar: 'vex.png' }); await h.advance(5000);
    h.message('I call this one mine. <handy save="Velvet Spiral"/>', { name: 'Vex', original_avatar: 'vex.png' }); await h.advance(2000);
    const fav = h.st.extensionSettings.handy_adaptive.profile.favorites.find((f) => f.name === 'Velvet Spiral');
    const pVex = h.st.prompts.filter(Boolean).pop();
    h.message('<handy act="handjob" intensity="0.2"/>', { name: 'Lily', original_avatar: 'lily.png' }); await h.advance(4000);
    const pLily = h.st.prompts.filter(Boolean).pop();
    h.message('<handy favorite="velvet spiral"/>', { name: 'Vex', original_avatar: 'vex.png' }); await h.advance(5000);
    const i = h.H.actEngine.intent;
    check('a character can name what is playing as their signature move', fav?.owner === 'vex.png' && fav.intent.act === 'blowjob' && /Vex's signature moves[^\n]*"Velvet Spiral"/.test(pVex));
    check('signature moves belong to their character and can be called back by name', /Lily's signature moves: none yet/.test(pLily) && !/"Velvet Spiral"/.test(pLily) && i.act === 'blowjob' && i.intensity === 0.7 && i.depth === 0.5);
    for (let k = 0; k < 12; k++) { h.message(`<handy save="move ${k}"/>`, { name: 'Vex', original_avatar: 'vex.png' }); await h.advance(600); }
    const n = h.st.extensionSettings.handy_adaptive.profile.favorites.filter((f) => f.owner === 'vex.png').length;
    check('the AI can keep at most eight signature moves per character', n === 8, `${n} kept`);
}

// ---- following the prose when a reply has no tag ----
{
    const start = async (seed, settings = {}) => { const h = await boot({ seed, settings }); h.st.name1 = 'Ryan'; h.message('<handy act="handjob" intensity="0.5"/>'); await h.advance(4000); return h; };
    const after = async (text, settings) => { const h = await start(470, settings); h.message(text); await h.advance(6000); return h.H.actEngine.intent; };
    const up = await after('She grins and speeds up, her hand a blur.'), down = await after('She slows down, taking her time.');
    const deep = await after('She takes you deeper with a soft hum.'), hold = await after('She pauses, watching your face.');
    check('a reply with no tag still steers the motion: faster, slower, deeper, pause', up.intensity === 0.65 && down.intensity === 0.35 && deep.depth === -0.3 && Math.abs(hold.intensity - 0.175) < 1e-9,
        `faster ${up.intensity}, slower ${down.intensity}, deeper ${deep.depth}, pause ${hold.intensity.toFixed(2)}`);
    const same = [];
    for (const t of ['"Do you want me to go faster?"', 'You thrust faster into her hand.', 'Ryan moves faster.', "She doesn't slow down.", 'She keeps the same steady rhythm.', '"Beg me to go faster," she whispers.'])
        same.push((await after(t)).intensity === 0.5);
    check('questions, what you do, negations and requests are not read as cues', same.every(Boolean), same.map((x) => (x ? 'ok' : 'CHANGED')).join(' '));
    const off = await after('She speeds up.', { proseCues: false });
    const tagged = await after('She speeds up, faster and faster. <handy intensity="0.6"/>');
    check('the setting turns it off, and a reply with a tag is never second-guessed', off.intensity === 0.5 && tagged.intensity === 0.6);
    const h = await boot({ seed: 471 });
    h.message('She strokes you faster and faster.'); await h.advance(5000);
    const idle = !h.H.active();
    const h2 = await start(472);
    h2.H.feedback('finish'); await h2.advance(2000);
    h2.message('She slows down, gentler now, then speeds up again.'); await h2.advance(30000);
    check('prose never starts the device, and never interrupts the wind-down after you finish', idle && !h2.H.active());
    const words = Array.from({ length: 110 }, (_, i) => 'w' + i).join(' ');
    const h3 = await start(473);
    h3.message(`${words}. She speeds up.`); await h3.advance(15000); const early = h3.H.actEngine.intent.intensity; await h3.advance(20000);
    check('prose cues play when you would read them', early === 0.5 && h3.H.actEngine.intent.intensity === 0.65);
}

// ---- detail touches ----
{
    const h = await boot({ seed: 480, settings: { library: lib } });
    h.message('<handy act="blowjob" intensity="0.5"/>'); await h.advance(3000);
    const g = h.H.actEngine.gen_(0, 50, 600000), orn = g.used.filter((u) => u.orn);
    const kinds = new Set(orn.map((u) => u.motif.split(':')[1]));
    check('detail touches (flutter, drag, pulse) are woven in between phrases', orn.length >= 6 && kinds.size >= 2 && orn.every((u) => /^orn:(flutter|drag|pulse):blowjob$/.test(u.motif)), `${orn.length} in 10 min: ${[...kinds].join(', ')}`);
    const pr = h.st.extensionSettings.handy_adaptive.profile;
    const now = h.now();
    h.H.actEngine.used = [{ from: now - 9000, to: now - 4000, act: 'blowjob', motif: 'm1' }, { from: now - 4000, to: now - 1500, act: 'blowjob', motif: 'orn:flutter:blowjob', orn: true }, { from: now - 1500, to: now + 3000, act: 'blowjob', motif: 'm2' }];
    h.H.feedback('love');
    check('a detail touch is rated like any phrase, without breaking the learned chain of phrases', pr.motifs['orn:flutter:blowjob'] > 0 && pr.trans['m1>m2'] > 0 && !Object.keys(pr.trans).some((k) => k.includes('orn:')), Object.keys(pr.trans).join(' '));
    Object.assign(pr.banned, { 'orn:flutter:blowjob': true, 'orn:drag:blowjob': true });
    const g2 = h.H.actEngine.gen_(0, 50, 600000).used.filter((u) => u.orn);
    check('a detail touch you keep turning down is retired', g2.length > 0 && g2.every((u) => u.motif === 'orn:pulse:blowjob'), [...new Set(g2.map((u) => u.motif))].join(','));
    await h.advance(180000);
    const vmax = Math.max(...h.dev.cmds.filter((c) => !c.rejected).map((c) => c.v));
    const h2 = await boot({ seed: 481, settings: { library: lib, ornaments: false } });
    h2.message('<handy act="blowjob" intensity="0.5"/>'); await h2.advance(3000);
    check('detail touches stay under the speed cap, and the setting turns them off', vmax <= (60 + 0.8 * 540) * 1.03 && h2.H.actEngine.gen_(0, 50, 600000).used.every((u) => !u.orn), `fastest ${Math.round(vmax)} %/s`);
}

// ---- two characters at once ----
{
    const h = await boot({ seed: 490, settings: { library: lib, ornaments: false } });
    Object.assign(h.st, { characters: CARDS, groupId: 'g' });
    h.message('<handy act="blowjob" intensity="0.6" with="Lily"/>', { name: 'Rex', original_avatar: 'rex.png' }); await h.advance(4000);
    const g = h.H.actEngine.gen_(0, 50, 240000);
    const rate = (key) => { let n = 0, ms = 0; for (const u of g.used.filter((x) => x.who === key)) { n += g.actions.filter((a) => a.at > u.from && a.at <= u.to).length; ms += u.to - u.from; } return n / 2 / (ms / 1000); };
    const turns = g.used.every((u, i) => u.who === (i % 2 === 0 ? g.used[0].who : (g.used[0].who === 'rex.png' ? 'lily.png' : 'rex.png')));
    const p = h.st.prompts.filter(Boolean).pop();
    check('two characters take turns, each in their own style', h.H.chars.partner === 'lily.png' && turns && rate('rex.png') > rate('lily.png') * 1.4 && /Lily has joined in \(taking turns\)/.test(p) && /with="THE OTHER CHARACTER'S NAME"/.test(p),
        `Rex ${rate('rex.png').toFixed(1)} vs Lily ${rate('lily.png').toFixed(1)} strokes/s`);
    const C = h.st.extensionSettings.handy_adaptive.characters, now = h.now();
    h.H.actEngine.used = [{ from: now - 7000, to: now - 3000, act: 'blowjob', motif: 'mA', who: 'rex.png' }, { from: now - 3000, to: now + 2000, act: 'blowjob', motif: 'mB', who: 'lily.png' }];
    h.H.feedback('love');
    check('in a duet, ❤ goes to the character whose turn it was', C['rex.png'].motifs.mA > 0 && C['lily.png'].motifs.mB > 0 && C['rex.png'].motifs.mB === undefined && C['lily.png'].motifs.mA === undefined);
    for (let k = 0; k < 4; k++) { h.H.feedback('faster'); await h.advance(1200); }
    check('adjustments in a duet teach both characters and your general taste', C['rex.png'].learned.rateMul > 1.02 && C['lily.png'].learned.rateMul > 1.02 && h.st.extensionSettings.handy_adaptive.profile.acts.blowjob.rateMul > 1.05);
    h.message('<handy act="blowjob" intensity="0.6" with="Lily" duet="together"/>', { name: 'Rex', original_avatar: 'rex.png' }); await h.advance(3000);
    const tog = h.H.actEngine.gen_(0, 50, 60000).used.every((u) => u.who == null) && h.H.chars.duet === 'together';
    h.message('<handy act="doggy" intensity="0.4"/>', { name: 'Lily', original_avatar: 'lily.png' }); await h.advance(3000);
    check('"together" moves as one, and a tag without with= goes back to one character', tog && h.H.chars.partner === null && h.H.chars.who === 'lily.png' && h.H.active());
}

// ---- group chats: the right character's style reaches the AI, and invented partners are ignored ----
{
    const h = await boot({ seed: 495, settings: { library: lib } });
    Object.assign(h.st, { characters: CARDS, groupId: 'g' });
    h.message('<handy act="blowjob" intensity="0.6"/>', { name: 'Vex', original_avatar: 'vex.png' }); await h.advance(4000);
    h.message('<handy save="Velvet Spiral"/>', { name: 'Vex', original_avatar: 'vex.png' }); await h.advance(2000);
    h.handlers.group_member_drafted(0);   // Lily is about to write
    const pL = h.st.prompts.filter(Boolean).pop();
    h.message('Lily watches, blushing.', { name: 'Lily', original_avatar: 'lily.png' }); await h.advance(1000);
    const pAfter = h.st.prompts.filter(Boolean).pop();
    check('group chat: the character about to write gets their own style and moves in the prompt', /CHARACTER STYLE: Lily /.test(pL) && /Right now Vex is the one moving the device/.test(pL) && /Lily's signature moves: none yet/.test(pL) && !/"Velvet Spiral"/.test(pL) && /CHARACTER STYLE: Vex /.test(pAfter) && h.H.chars.who === 'vex.png');
    h.message('<handy act="blowjob" intensity="0.5" with="Zorblax the Unknown"/>', { name: 'Vex', original_avatar: 'vex.png' }); await h.advance(3000);
    check('a partner name that is not a real character is ignored', h.H.chars.partner === null && h.H.active() && !Object.keys(h.st.extensionSettings.handy_adaptive.characters).some((k) => k.startsWith('name:')));
    const d = new Date(h.now()), local = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    check('session records use your local date', h.st.extensionSettings.handy_adaptive.characters['vex.png'].now.date === local);
}

// ---- saved setups ----
{
    const h = await boot({ seed: 500 });
    await calibrate(h, 80, 20); h.H.setups.save('Lying down');
    globalThis.confirm = () => false;   // "is this the same setup, adjusted?" No: a new position
    await calibrate(h, 70, 30);
    globalThis.confirm = () => true;
    const S0 = h.st.extensionSettings.handy_adaptive;
    const kept = S0.setups[0].tip === 80 && S0.setupName === null;   // answered no: the saved setup is left as it was
    h.H.setups.save('Sitting');
    h.message('<handy act="handjob" intensity="0.6"/>'); await h.advance(5000);
    h.H.setups.use('lying down'); await h.advance(2500);
    const switched = !h.H.active() && S0.calibration.tip === 80 && S0.calibration.base === 20 && S0.setupName === 'Lying down';
    await calibrate(h, 84, 24);
    check('saved setups: switching stops the motion and loads that calibration', kept && switched && S0.setups.length === 2, `setups: ${S0.setups.map((x) => `${x.name} ${x.base}-${x.tip}`).join(', ')}`);
    check('recalibrating while a setup is in use updates that setup when you confirm', S0.setups.find((x) => x.name === 'Lying down').tip === 84 && S0.setups.find((x) => x.name === 'Sitting').tip === 70);
    h.H.setups.remove('Sitting');
    check('a setup can be deleted without touching the current calibration', S0.setups.length === 1 && S0.calibration.tip === 84);
}

// ---- session memory per character ----
{
    const h = await boot({ seed: 510, settings: { library: lib } });
    Object.assign(h.st, { characters: CARDS, characterId: 2 });
    h.message('<handy act="blowjob" intensity="0.6"/>'); await h.advance(5000);
    h.message('<handy save="Velvet Spiral"/>'); await h.advance(125000);
    h.H.feedback('close'); await h.advance(20000);
    h.message('<handy favorite="Velvet Spiral"/>'); await h.advance(20000);
    h.H.feedback('finish'); await h.advance(25000);
    const r = h.st.extensionSettings.handy_adaptive.characters['vex.png'];
    const p1 = h.st.prompts.filter(Boolean).pop();
    check('each character remembers the session: time, edges, and what made you finish', r.now.minutes >= 2 && r.now.edges === 1 && r.now.finishes === 1 && /signature move "Velvet Spiral"/.test(r.now.finishedWith[0]) && /SESSION MEMORY with Vex: This session so far: [^\n]*edged 1×, finished 1×/.test(p1), r.now.finishedWith[0]);
    await h.advance(4 * 3600e3);
    h.message('<handy act="handjob" intensity="0.4"/>'); await h.advance(4000);
    const p2 = h.st.prompts.filter(Boolean).pop();
    check('a later session starts fresh, and the last one is passed to the AI as a recap', r.recaps.length === 1 && r.now.finishes === 0 && /earlier sessions: [^\n]*finished 1× \(during blowjob, the signature move "Velvet Spiral"/.test(p2), (p2.match(/SESSION MEMORY[^\n]*/) || [''])[0].slice(0, 200));
}

// ---- second review: limits, stops and fallbacks ----
{
    const h = await boot({ seed: 520, settings: { maxSpeed: 250, library: lib } });
    h.message('<handy act="doggy" intensity="1"/>'); await h.advance(20000);
    const v = Math.max(...h.dev.cmds.filter((c) => !c.rejected).map((c) => c.v));
    check('a max speed typed above 100 is treated as 100 %', v <= 600 * 1.03, `fastest ${Math.round(v)} %/s`);
    const h2 = await boot({ seed: 521, settings: { strokeFloor: 70, strokeCeil: 30 } });
    h2.message('<handy act="handjob" intensity="0.6"/>'); await h2.advance(10000);
    const ps = h2.dev.cmds.filter((c) => !c.rejected).map((c) => c.p1);
    check('stroke limits typed the wrong way round still give a range', Math.min(...ps) >= 30 && Math.max(...ps) <= 70 && Math.max(...ps) - Math.min(...ps) > 15, `${Math.min(...ps)}-${Math.max(...ps)}`);
    const h3 = await boot({ seed: 522 });
    h3.message('<handy act="handjob" intensity="0.6"/>'); await h3.advance(8000);
    h3.st.extensionSettings.handy_adaptive.maxSpeed = 20;   // no new instruction: streaming checks the cap on every stroke
    await h3.advance(3000); const t = h3.now(); await h3.advance(8000);
    const late = h3.dev.cmds.filter((c) => !c.rejected && c.t > t).map((c) => c.v);
    check('a lower max speed takes effect within seconds, mid-play', Math.max(...late) <= (60 + 0.2 * 540) * 1.03, `fastest after ${Math.round(Math.max(...late))} %/s`);
}
{
    const w = (n) => Array.from({ length: n }, (_, i) => 'w' + i).join(' ');
    const h = await boot({ seed: 523 });
    h.message(`<handy stop/> ${w(80)} <handy act="handjob" intensity="0.7"/>`); await h.advance(5000);
    h.say('stop'); await h.advance(30000);
    check('a typed "stop" also cancels tags still waiting in the reply', !h.H.active());
    const h2 = await boot({ seed: 524 });
    Object.assign(h2.st, { characters: [{ name: 'Vex', avatar: 'vex.png', description: 'dominant' }], characterId: 0 });
    h2.message('<handy act="handjob" intensity="0.5"/>'); await h2.advance(4000);
    for (let i = 0; i < 4; i++) { h2.message('She speeds up. Then she slows down.'); await h2.advance(15000); }
    check('story cues are not counted as the character\'s own habits', h2.st.extensionSettings.handy_adaptive.characters['vex.png'].acts.handjob.n === 1);
}
{
    const h = await boot({ seed: 525, settings: { transport: 'hsp', appId: 'APP' } });
    h.message('<handy pattern="wave" speed="60" min="20" max="80"/>'); await h.advance(6000);
    const v2 = h.dev.calls.filter((c) => !c.v3 && /hamp|slide|velocity/.test(c.path));
    check('pattern tags under buffered streaming play through API v3 (the act engine)', h.H.actEngine.running && !v2.length && Math.abs(h.H.actEngine.intent.intensity - 0.6) < 1e-9, `${v2.length} old-API pattern calls`);
}
{
    const h = await boot({ seed: 526, settings: { styleProfile: '' } });
    Object.assign(h.st, { characters: [{ name: 'Vex', avatar: 'vex.png', description: 'A dominant succubus.' }], characterId: 0 });
    h.st.extensionSettings.connectionManager = { profiles: [{ id: 'bg', name: 'Background' }] };
    let n = 0; h.st.ConnectionManagerRequestService = { sendRequest: async () => { n++; return { content: '{"tempo":0,"reach":0,"focus":0,"wild":0,"tease":1,"eager":-1,"exp":1,"why":"x"}' }; } };
    h.message('<handy act="handjob" intensity="0.5"/>'); await h.advance(3000);
    h.st.extensionSettings.handy_adaptive.styleProfile = 'Background'; h.H.chars.tried.clear(); h.H.chars.seen.clear(); h.H.chars.current(); await h.advance(2000);
    check('choosing a card-reading profile reads the character in control right away', n === 1 && h.st.extensionSettings.handy_adaptive.characters['vex.png'].source === 'ai');
}

// ---- learning ----
{
    const h = await boot({ seed: 180, settings: { library: lib } });
    const pr = h.st.extensionSettings.handy_adaptive.profile; pr.acts.doggy = { ...settled };
    h.H.run({ act: 'doggy', intensity: 0.3 }); await h.advance(6000);
    const target = lib.acts.doggy.motifs[0].id;
    for (let k = 0; k < 3; k++) {   // the same phrase is playing each time "Not this" is pressed
        h.H.actEngine.used.push({ from: h.now() - 1000, to: h.now() + 4000, act: 'doggy', motif: target });
        h.H.feedback('nope'); await h.advance(3000);
    }
    const { synthesize } = await import('../synth.js');
    let picked = 0;
    for (let k = 0; k < 30; k++) picked += synthesize({ lib, intent: { act: 'doggy', intensity: 0.3 }, prefs: { ...pr, exploreBias: 2 }, limits: { maxVel: cap }, durationMs: 20000 }).used.filter((u) => u.motif === target).length;
    check('a phrase turned down 3 times is retired, even when experimenting a lot', pr.banned[target] === true && picked === 0, `banned=${!!pr.banned[target]}, picked ${picked} times in 10 min`);
    const one = await boot({ seed: 181, settings: { library: lib } }), pr1 = one.st.extensionSettings.handy_adaptive.profile;
    one.H.run({ act: 'doggy', intensity: 0.3 }); await one.advance(6000);
    one.H.actEngine.used.push({ from: one.now() - 1000, to: one.now() + 4000, act: 'doggy', motif: target }); one.H.feedback('nope'); await one.advance(3000);
    check('a single "Not this" does not retire a phrase', !pr1.banned[target]);
}
{
    const h = await boot({ seed: 190, settings: { library: lib } });
    const pr = h.st.extensionSettings.handy_adaptive.profile;
    h.H.run({ act: 'blowjob', intensity: 0.7 }); await h.advance(9000);
    const cur = h.H.actEngine.used.filter((u) => u.motif && u.from <= h.now() && u.to > h.now()).pop();
    h.H.feedback('close'); await h.advance(1000);
    const p = h.st.prompts.filter(Boolean).pop() || '';
    check('"I\'m close" counts as a win for what was playing and is remembered per act', (!cur || pr.motifs[cur.motif] > 0) && pr.acts.blowjob.edges === 1 && /brought them to the edge 1 time/.test(p));
}

// ---- typed stop variants and climax cues (ideas from StrokeGPT Vanilla / GenericCharacterGPT) ----
for (const [text, shouldStop] of [['Stop, please!', true], ['please stop', true], ['ok halt it now', true], ['STOP STOP', true], ["don't stop!", false], ['Can you stop?', false], ['Wait for me.', false], ['She told me to stop by the store on the way home tonight', false]]) {
    const h = await boot({ seed: 200 + text.length });
    h.H.run({ act: 'handjob', intensity: 0.5 }); await h.advance(4000);
    h.say(text); await h.advance(3000);
    check(`typed "${text}" ${shouldStop ? 'stops' : 'does not stop'} the device`, h.H.active() !== shouldStop);
}
for (const [text, want] of [["I'm so close...", 'close'], ["I'm close to the door", null], ["I'm cumming!", 'finish'], ["I'm not cumming yet", null], ['Are you cumming?', null], ['I came home.', null], ['gonna cum', 'close'], ['I just came', 'finish']]) {
    const h = await boot({ seed: 220 + text.length });
    const pr = h.st.extensionSettings.handy_adaptive.profile;
    h.H.run({ act: 'handjob', intensity: 0.8 }); await h.advance(5000);
    h.say(text); await h.advance(1500);
    const got = (pr.acts.handjob?.finishes ? 'finish' : null) || (pr.acts.handjob?.edges ? 'close' : null);
    check(`"${text}" is read as ${want ?? 'nothing'}`, got === want, `got ${got}`);
}
{
    const h = await boot({ seed: 240 });
    h.H.run({ act: 'handjob', intensity: 0.8 }); await h.advance(6000);
    h.H.feedback('finish'); await h.advance(5000);
    const gentle = h.H.actEngine.intent.intensity <= 0.05 && h.H.active();
    const p = h.st.prompts.filter(Boolean).pop() || '';
    await h.advance(17000);
    check('"Finished" winds down gently, then stops after ~20 s, and tells the AI', gentle && !h.H.active() && /FINISHED/.test(p) && /has made them finish 1 time/.test(p));
    const h2 = await boot({ seed: 241 });
    h2.H.run({ act: 'handjob', intensity: 0.8 }); await h2.advance(6000);
    h2.H.feedback('finish'); await h2.advance(3000);
    h2.message('<handy act="blowjob" intensity="0.4"/>'); await h2.advance(25000);
    check('a new AI tag during the wind-down takes over (no surprise stop)', h2.H.active() && h2.H.actEngine.intent.act === 'blowjob');
    const h3 = await boot({ seed: 242, settings: { finishAction: 'stop' } });
    h3.H.run({ act: 'handjob', intensity: 0.8 }); await h3.advance(6000);
    h3.H.feedback('finish'); await h3.advance(2000);
    check('"Finished" set to "Stop at once" stops at once', !h3.H.active());
}

// edging game: she runs it, edges and begging are counted, and only her tag ends it
{
    const last = (h) => h.st.prompts.filter(Boolean).pop() || '';
    const h = await boot({ seed: 260, settings: { gameMinEdges: 2 } });
    const G = h.H.game, r0 = h.st.replies;
    G.start(); await h.advance(1000);
    check('starting the game asks her to open it and tells her the rules', G.active && h.st.replies === r0 + 1 && /EDGING GAME — ON/.test(last(h)) && /STARTED THE EDGING GAME/.test(last(h)) && /Not before 2 edges/.test(last(h)));
    h.message('<handy act="blowjob" intensity="0.6" watch="her lips stretched around him"/>'); await h.advance(5000);
    check('she picks the act and the focus', h.H.actEngine.intent.act === 'blowjob' && G.watch === 'her lips stretched around him' && /Watch: her lips/.test(G.status()));
    h.H.feedback('close'); await h.advance(2000); h.H.feedback('close'); await h.advance(2000);
    h.H.feedback('climax'); await h.advance(2000);
    check('edges are counted; "Finish me" is begging and does not start a push', G.edges === 2 && G.begs === 1 && !h.H.climax.active && /Edges so far: 2/.test(last(h)) && /BEGGED TO CUM/.test(last(h)));
    h.message('<handy game="allow" climax="20"/>'); await h.advance(3000);
    check('game="allow" ends the game and pushes them over', !G.active && h.H.climax.active && G.stats().allowed === 1 && G.stats().edges === 2);

    const h2 = await boot({ seed: 261 });
    h2.H.game.start(); h2.message('<handy act="handjob" intensity="0.7"/>'); await h2.advance(5000);
    h2.message('<handy game="deny"/>'); await h2.advance(2000);
    check('game="deny" stops the device and ends the game', !h2.H.game.active && !h2.H.active() && h2.H.game.stats().denied === 1);

    const h3 = await boot({ seed: 262 });
    h3.H.game.start(); h3.message('<handy act="handjob" intensity="0.7"/>'); await h3.advance(5000);
    h3.message('<handy game="ruin" climax="20"/>'); await h3.advance(10000);
    const building = h3.H.climax.active; await h3.advance(10000);
    check('game="ruin" builds, then stops dead just short of the peak', building && !h3.H.active() && h3.H.game.stats().ruined === 1);

    const h4 = await boot({ seed: 263 });
    h4.H.game.start(); h4.message('<handy act="handjob" intensity="0.7"/>'); await h4.advance(5000);
    h4.H.feedback('finish'); await h4.advance(1000);
    check('finishing without permission ends the game and she is told', !h4.H.game.active && h4.H.game.stats().slipped === 1 && /CAME WITHOUT PERMISSION/.test(last(h4)));
    const h5 = await boot({ seed: 264 });
    h5.message('<handy game="allow"/>'); await h5.advance(2000);
    check('a game tag outside a game does nothing', !h5.H.climax.active && !h5.H.active() && !/EDGING GAME/.test(last(h5)));

    // mommy's stamina training: a goal a little past what he usually lasts, one ending, results remembered
    const m = await boot({ seed: 270, settings: { gameMinEdges: 1 } });
    const MG = m.H.game;
    MG.start('mommy'); await m.advance(1000);
    check('mommy mode starts with a 10 min baseline goal and her rules', MG.active && MG.mode === 'mommy' && MG.goal === 10 && /MOMMY'S STAMINA TRAINING — ON/.test(last(m)) && /consenting adults/.test(last(m)) && /last 10 minutes/.test(last(m)) && /STARTED THE MOMMY'S STAMINA TRAINING/.test(last(m)));
    m.message('<handy act="blowjob" intensity="0.5" watch="her full heavy breasts"/>'); await m.advance(5000);
    m.H.feedback('close'); await m.advance(3000);
    m.message('<handy game="deny"/>'); await m.advance(2000);
    check('deny and ruin are not part of her game', MG.active && m.H.active());
    await m.advance(11 * 60000);
    check('the prompt follows the clock toward the goal', /reached his goal/.test(last(m)) && /\/ goal 10 min/.test(MG.status()));
    m.message('<handy game="allow"/>'); await m.advance(3000);
    const ms = MG.stats('mommy');
    check('allowing it ends with a long intense build and records how long he lasted', !MG.active && m.H.climax.active && m.H.climax.ms === 45000 && ms.lasted.length === 1 && ms.lasted[0] >= 11 && ms.best === ms.lasted[0] && /Game result: he lasted/.test(last(m)));
    MG.start('mommy');
    check('the next goal is a little longer than he lasted', MG.goal === Math.round(Math.max(ms.lasted[0] * 1.1, ms.lasted[0] + 1)), `goal ${MG.goal} after ${ms.lasted[0]} min`);
    m.H.feedback('finish'); await m.advance(1000);
    check('cumming early ends it gently and still counts toward stamina', !MG.active && ms.slipped === 1 && ms.lasted.length === 2 && /CAME BEFORE YOU ALLOWED IT/.test(last(m)));
    check('edging stats are kept apart from mommy stats', !MG.stats('edging').played);

    // focus learning: what's on screen is credited with exposure, edges, loves, nopes and finishes
    const f = await boot({ seed: 280 });
    const FS = () => f.H.profile().focus, P = () => f.st.prompts.filter(Boolean).pop() || '';
    f.message('<handy act="blowjob" intensity="0.6" scene="POV blowjob" watch="her eyes on the camera"/>'); await f.advance(40000);
    f.H.feedback('close'); await f.advance(40000); f.H.feedback('close'); await f.advance(35000); f.H.feedback('close'); await f.advance(5000);
    const A = FS().items['w:her eyes on the camera'];
    check('a scene and focus are tracked: time watched, edges, time to the edge, tags read from the words', A && A.sec >= 115 && A.edges === 3 && A.toEdgeN === 3 && Math.abs(A.toEdge / A.toEdgeN - 38) < 6 && FS().items['t:eye contact'] && FS().items['s:pov blowjob'], A && `${Math.round(A.sec)} s, ${A.edges} edges, ~${Math.round(A.toEdge / A.toEdgeN)} s to the edge`);
    f.message('<handy act="riding" intensity="0.4" scene="milf riding" watch="her thick thighs"/>'); await f.advance(30000);
    f.H.feedback('love'); await f.advance(60000); f.H.feedback('love'); await f.advance(60000);
    f.message('<handy act="handjob" intensity="0.5" scene="handjob" watch="the sounds she makes"/>'); await f.advance(30000);
    f.H.feedback('nope'); await f.advance(25000); f.H.feedback('nope'); await f.advance(25000);
    f.message('<handy act="blowjob" intensity="0.8" watch="her eyes on the camera" scene="POV blowjob"/>'); await f.advance(50000);
    f.H.feedback('finish'); await f.advance(1000);
    const p = P();
    check('the AI is told what made them finish', /FINISHERS[^\n]*"her eyes on the camera"/.test(p) && /finishes usually come during blowjob/.test(p), (p.match(/FINISHERS[^\n]*/) || [''])[0].slice(0, 160));
    check('…what gets them to the edge fastest', /FASTEST TO THE EDGE[^\n]*"her eyes on the camera" in a POV blowjob scene/.test(p));
    check('…what keeps them simmering', /SLOW BURNERS[^\n]*"her thick thighs"/.test(p));
    check('…and what to avoid', /DOES LITTLE FOR THEM[^\n]*"the sounds she makes"/.test(p));
    check('…which themes carry over, with a strategy and things not yet tried', /THEMES[^\n]*strongest[^\n]*eye contact/.test(p) && /weakest[^\n]*sounds & voice/.test(p) && /STRATEGY: /.test(p) && /Not tried yet: /.test(p));
    const fin = FS().finishes.at(-1), shareA = FS().items['w:her eyes on the camera'].finishes, shareC = FS().items['w:the sounds she makes'].finishes;
    check('a finish goes to what was on screen, and nothing you said "not this" to shares it', fin.act === 'blowjob' && shareA === 1 && shareC === 0, `current ${shareA.toFixed(2)}, rejected before ${shareC.toFixed(2)}`);
    f.H.game.start('trance'); await f.advance(1000);
    check('the strategy follows the game being played', /STRATEGY: Stay with slow burners/.test(P()));
    f.H.game.end('quit');
    {   // time share: two focuses you liked in the last 90 s split it, the one on screen at least 60%
        const ts = await boot({ seed: 282 });
        ts.message('<handy act="blowjob" intensity="0.6" watch="her lips"/>'); await ts.advance(60000);
        ts.message('<handy act="blowjob" intensity="0.7" watch="her hands"/>'); await ts.advance(20000);
        ts.H.feedback('finish'); await ts.advance(1000);
        const it = ts.H.profile().focus.items, a1 = it['w:her hands'].finishes, b1 = it['w:her lips'].finishes;
        check('a finish is shared by time with what you watched in the 90 s before', a1 >= 0.6 && b1 > 0 && Math.abs(a1 + b1 - 1) < 0.01, `on screen ${a1.toFixed(2)}, before ${b1.toFixed(2)}`);
    }
    const f2 = await boot({ seed: 281 });
    f2.H.run({ act: 'handjob', intensity: 0.6 }); await f2.advance(5000); f2.H.feedback('close'); await f2.advance(1000);
    check('nothing is learned about porn when nothing is on screen', !Object.keys(f2.H.profile().focus?.items || {}).length && !/WHAT GETS THE USER OFF/.test(f2.st.prompts.filter(Boolean).pop() || ''));

    // porn roulette: spins on a timer, new scenes start fast, scenes survived without edging are counted
    const r = await boot({ seed: 290, settings: { rouletteMinutes: 1 } });
    const RG = r.H.game; RG.start('roulette'); await r.advance(1000);
    r.message('<handy act="blowjob" scene="sloppy blowjob" watch="her spit dripping"/>'); await r.advance(3000);
    check('roulette: a new scene starts fast and is counted', r.H.actEngine.intent.intensity >= 0.7 && RG.scenes === 1 && /PORN ROULETTE — ON/.test(last(r)));
    const spin0 = r.st.replies; await r.advance(60000);
    check('roulette: the wheel spins on its timer and asks her for a new scene', r.st.replies > spin0 && /THE WHEEL SPINS/.test(last(r)));
    r.message('<handy act="riding" scene="reverse cowgirl" watch="her ass bouncing"/>'); await r.advance(20000);
    r.H.feedback('close'); await r.advance(5000);
    r.message('<handy act="handjob" scene="oiled handjob" watch="her slick hands"/>'); await r.advance(5000);
    check('roulette: getting through a scene without edging counts, edging in one does not', RG.scenes === 3 && RG.survived === 1 && /scene 3 · survived 1/.test(RG.status()));
    r.message('<handy game="allow"/>'); await r.advance(2000);
    check('roulette: the result is reported and the best is kept', !RG.active && r.H.climax.active && RG.stats('roulette').bestSurvived === 2 && /got through 2 of 3 scenes/.test(last(r)));

    // goon trance: slow and capped, a gentle ease-off, time on the edge is the score
    const g = await boot({ seed: 300 });
    const TG = g.H.game; TG.start('trance'); await g.advance(1000);
    g.message('<handy act="handjob" intensity="0.95" watch="her slow wet strokes"/>'); await g.advance(5000);
    check('trance: intensity is held to a slow plateau', g.H.actEngine.intent.intensity <= 0.6 && /GOON TRANCE — ON/.test(last(g)));
    const before = g.H.actEngine.intent.intensity; g.H.feedback('close'); await g.advance(1000);
    check('trance: "I\'m close" only eases off a little', g.H.actEngine.intent.intensity >= before * 0.55, `${before.toFixed(2)} → ${g.H.actEngine.intent.intensity.toFixed(2)}`);
    await g.advance(30000);
    g.message('<handy game="deny"/>'); await g.advance(1000);
    check('trance: time on the edge is counted, and deny is not part of it', TG.active && TG.edgeSec >= 25 && /on the edge 0:[2-9]\d/.test(TG.status()));
    g.message('<handy game="allow"/>'); await g.advance(2000);
    check('trance: it ends with a long finish and a record', !TG.active && g.H.climax.ms === 45000 && TG.stats('trance').bestEdgeSec >= 25 && /of it on the edge/.test(last(g)));

    // ---- fucktoy: you choose what you use; secrets
    const ft = await boot({ seed: 310, settings: { library: { ...lib, acts: { ...lib.acts, handjob: lib.acts.blowjob, missionary: lib.acts.doggy } } } });
    const FT = ft.H.game; FT.start('fucktoy'); await ft.advance(1000);
    check('fucktoy: her rules are in the prompt with the holes he can use', /FUCKTOY — ON/.test(last(ft)) && /consenting adults/.test(last(ft)) && /mouth, pussy, ass, hands/.test(last(ft)));
    ft.H.play.use('mouth'); await ft.advance(3000);
    check('fucktoy: using her mouth switches the device to that act and tells her', ft.H.actEngine.intent.act === 'blowjob' && /HE IS USING YOUR MOUTH/.test(last(ft)) && FT.uses.mouth === 1);
    for (const h of ['pussy', 'ass']) { ft.H.play.use(h); await ft.advance(2000); }
    check('fucktoy: ass falls back to doggy, deeper, when there is no anal act', ft.H.actEngine.intent.act === 'doggy');
    ft.H.play.use('hands'); await ft.advance(2000);
    const sec = () => ft.H.profile().secrets || {};
    check('secret: using every hole unlocks spitroast', !!sec()['full-set'] && ft.H.play.spitroast() && /SURPRISE: He has used every one/.test(last(ft)) && ft.toasts.some((t) => /Secret found: Complete set \(1\/32/.test(t.m)));
    ft.H.play.use('spitroast'); await ft.advance(2000);
    check('spitroast blends mouth and pussy', ft.H.actEngine.intent.act === 'blowjob' && /missionary/.test(JSON.stringify(ft.H.actEngine.intent.blend)));
    for (let k = 0; k < 5; k++) { ft.H.play.use('mouth'); await ft.advance(1500); }
    const wild = ft.H.actEngine.intent.variation >= 0.9 && ft.H.actEngine.intent.intensity >= 0.9;
    await ft.advance(21000);
    check('secret: five uses of one hole in a row breaks the toy (wild, then back)', !!sec()['broken-toy'] && wild && ft.H.actEngine.intent.intensity < 0.9);
    await ft.advance(12 * 60000);
    check('secret: free use (she takes over at a random moment)', !!sec()['free-use'] && Date.now() >= 0);
    ft.H.feedback('finish'); await ft.advance(1000);
    check('fucktoy: finishing is his call, not slipping', !FT.active && FT.stats('fucktoy').finished === 1 && !FT.stats('fucktoy').slipped);
    FT.start('fucktoy'); await ft.advance(2000); FT.end('quit'); FT.start('fucktoy'); await ft.advance(6000);
    check('secret: the ranking appears in his third game', !!sec().ranking && /RANKING[^\n]*mouth \d+×/.test(last(ft)));
    FT.end('quit');

    // ---- daddy's girl: praise makes her bolder; she must ask
    const dg = await boot({ seed: 320 });
    const DG = dg.H.game; DG.start('daddy'); await dg.advance(1000);
    check("daddy's girl: an adults-only roleplay with her rules", /DADDY'S GIRL — ON/.test(last(dg)) && /grown woman in your twenties/.test(last(dg)) && /Never mention or imply childhood/.test(last(dg)) && /Boldness 1\/5/.test(last(dg)));
    dg.message('<handy act="blowjob" intensity="0.4"/>'); await dg.advance(4000);
    for (let k = 0; k < 4; k++) { dg.H.play.daddy('good'); await dg.advance(1500); }
    check('"Good girl" makes her bolder and a little faster', dg.H.play.bold() === 3 && dg.H.actEngine.intent.intensity > 0.45 && /GOOD GIRL/.test(last(dg)) && /Boldness 3\/5/.test(last(dg)), `intensity ${dg.H.actEngine.intent.intensity.toFixed(2)}`);
    dg.message('<handy game="allow"/>'); await dg.advance(1000);
    check('she cannot make daddy cum without asking: an allow becomes a request', DG.active && DG.asking && !dg.H.climax.active && dg.toasts.some((t) => /asking permission/.test(t.m)));
    for (let k = 0; k < 3; k++) { DG.asking = true; dg.H.play.daddy('wait'); await dg.advance(2000); }
    const b0 = dg.H.actEngine.intent.intensity; await dg.advance(61000);
    check('secret: made to wait three times, she turns bratty and sneaks the pace up', !!dg.H.profile().secrets?.brat && dg.H.actEngine.intent.intensity > b0 + 0.1, `${b0.toFixed(2)} → ${dg.H.actEngine.intent.intensity.toFixed(2)}`);
    for (let k = 0; k < 6; k++) { dg.H.play.daddy('good'); await dg.advance(1500); }
    check("secret: ten good girls make her daddy's perfect girl, saved as a move", !!dg.H.profile().secrets?.['perfect-girl'] && dg.H.profile().favorites.some((f) => f.name === "Daddy's Perfect Girl"));
    dg.message('<handy game="ask"/>'); await dg.advance(1000); dg.H.play.daddy('yes'); await dg.advance(5000);
    check('"Yes" pushes him over and ends the game', !DG.active && dg.H.climax.active && /DADDY SAID YES/.test(last(dg)));
    dg.H.feedback('finish'); await dg.advance(2000);
    DG.start('daddy'); await dg.advance(6000);
    check("secret: coming right after saying yes earns daddy's reward next time", !!dg.H.profile().secrets?.reward && /his reward/.test(last(dg)));
    DG.end('quit');

    // ---- two-girl rivalry: whoever is in control when he edges scores
    const rv = await boot({ seed: 330, settings: { gameMinEdges: 3 } });
    const RV = rv.H.game; RV.start('rivalry'); await rv.advance(1000);
    check('rivalry: one character plays two rivals in a one-on-one chat', /TWO-GIRL RIVALRY — ON/.test(last(rv)) && /You play TWO rival girls/.test(last(rv)));
    const said = (girl) => rv.message(`<handy act="blowjob" intensity="0.6" girl="${girl}"/>`);
    rv.H.play.rand = () => 0.9;   // no sabotage for the scoring check
    said('Vex'); await rv.advance(3000); rv.H.feedback('close'); await rv.advance(3000);
    said('Vex'); await rv.advance(3000); rv.H.feedback('close'); await rv.advance(3000);
    said('Lola'); await rv.advance(3000); rv.H.feedback('close'); await rv.advance(3000);
    check('rivalry: edges score for whoever is in control', RV.scores.Vex === 2 && RV.scores.Lola === 1 && /Vex 2 vs Lola 1/.test(RV.status()));
    rv.message('<handy game="allow"/>'); await rv.advance(2000);
    check('rivalry: nobody makes him cum before someone wins', RV.active && !rv.H.climax.active);
    said('Lola'); await rv.advance(3000); rv.H.feedback('close'); await rv.advance(3000);
    check('secret: a comeback from two behind to tie', !!rv.H.profile().secrets?.comeback && /Lola clawed back/.test(last(rv)));
    said('Lola'); await rv.advance(3000); rv.H.feedback('close'); await rv.advance(3000);
    check('rivalry: first to 3 wins and may finish him', RV.winner === 'Lola' && /Lola won the rivalry/.test(last(rv)) && /Lola HAS WON/.test(last(rv)));
    rv.message('<handy game="allow" girl="Lola"/>'); await rv.advance(2000);
    check('rivalry: the winner pushes him over; the result is kept', !RV.active && rv.H.climax.active && RV.stats('rivalry').wins.Lola === 1 && /Lola won/.test(last(rv)));
    const sb = await boot({ seed: 331 }); sb.H.play.rand = () => 0;
    sb.H.game.start('rivalry'); await sb.advance(1000);
    sb.message('<handy act="blowjob" intensity="0.6" girl="Vex"/>'); await sb.advance(2000); sb.H.feedback('close'); await sb.advance(2000);
    sb.message('<handy act="blowjob" intensity="0.6" girl="Lola"/>'); await sb.advance(2000);
    sb.message('<handy act="blowjob" intensity="0.6" girl="Vex"/>'); await sb.advance(2000); sb.H.feedback('close'); await sb.advance(2000);
    check('secret: sabotage (the trailing girl steals the leader\'s edge)', sb.H.game.scores.Vex === 1 && sb.H.game.scores.Lola === 1 && /Lola secretly stole/.test(sb.st.prompts.filter(Boolean).pop()));
    sb.H.game.end('quit');

    // ---- watch party: jealousy and joining the scene
    const wp = await boot({ seed: 340 });
    const WP = wp.H.game; WP.start('party'); await wp.advance(1000);
    check('watch party: her rules', /WATCH PARTY — ON/.test(last(wp)));
    wp.message('<handy act="doggy" intensity="0.5" scene="amateur doggy" watch="her back arching"/>'); await wp.advance(4000);
    for (let k = 0; k < 3; k++) { wp.H.feedback('love'); await wp.advance(3000); }
    check('secret: loving the girl on screen three times makes her jealous', !!wp.H.profile().secrets?.jealous && /JEALOUS/.test(last(wp)));
    wp.H.feedback('close'); await wp.advance(30000); wp.H.feedback('close'); await wp.advance(40000);
    check('secret: hitting the edge twice in 90 s and she climbs into the scene', !!wp.H.profile().secrets?.['join-in']);
    const found = Object.keys(wp.H.profile().secrets || {}).length;
    check('the settings count secrets found', /2\/32 secrets found: Jealous \(Watch party\), Into the scene \(Watch party\)/.test(wp.H.secrets.summary()), wp.H.secrets.summary());

    // ---- taste by type and the load rating
    const cq = await boot({ seed: 350 });
    const CQ = cq.H.game; CQ.start('cuckqueen'); await cq.advance(1000);
    check('cuckqueen: her rules, with type learning', /CUCKQUEEN — ON/.test(last(cq)) && /never real people he knows/.test(last(cq)) && /woman="WHAT KIND OF WOMAN"/.test(last(cq)) && /Your own arousal: 0%/.test(last(cq)));
    cq.message('<handy act="blowjob" intensity="0.6" scene="busty redhead POV" watch="her eyes" woman="busty redhead" outfit="red lingerie" fantasy="hotel affair" talk="degrading"/>'); await cq.advance(30000);
    for (let k = 0; k < 3; k++) { cq.H.feedback('love'); await cq.advance(15000); }
    check('secret: loving one kind of woman three times makes her the other woman', !!cq.H.profile().secrets?.['other-woman'] && cq.H.profile().otherWoman === 'busty redhead');
    for (let k = 0; k < 3; k++) { cq.H.feedback('close'); await cq.advance(25000); }
    check('secret: edging three times for one kind of woman makes her second best', !!cq.H.profile().secrets?.['second-best'] && /better than you will ever be/.test(last(cq)));
    check('cuckqueen: her arousal follows his', CQ.her >= 45 && /her \d+%/.test(CQ.status()), `her ${Math.round(CQ.her)}%`);
    cq.message('<handy act="doggy" intensity="0.5" woman="petite blonde" outfit="schoolgirl skirt" talk="worshipful"/>'); await cq.advance(90000);
    cq.H.feedback('nope'); await cq.advance(20000); cq.H.feedback('nope'); await cq.advance(20000);
    cq.message('<handy act="blowjob" intensity="0.8" woman="busty redhead" outfit="red lingerie" talk="degrading" watch="her eyes" scene="busty redhead POV"/>'); await cq.advance(40000);
    cq.H.feedback('finish'); await cq.advance(1000);
    check('after a finish the panel asks how big', cq.H.focus.lastFinish && !CQ.active && CQ.stats('cuckqueen').finished === 1);
    cq.H.focus.rateLoad('huge'); await cq.advance(1000);
    const cqp = last(cq);
    check('a huge load is learned and told to her', /HE RATED HIS LOAD: HUGE/.test(cqp) && cq.H.profile().focus.finishes.at(-1).load === 'huge' && /HUGEST loads came during blowjob/.test(cqp));
    check('secret: a huge load in cuckqueen', !!cq.H.profile().secrets?.['huge-load']);
    check('her taste notes learn by type: women, outfits, dirty talk', /HIS TASTE BY TYPE[^\n]*Women: best busty redhead[^\n]*least petite blonde/.test(cqp) && /Outfits: best red lingerie/.test(cqp) && /Dirty talk: best degrading/.test(cqp), (cqp.match(/HIS TASTE BY TYPE[^\n]*/) || [''])[0].slice(0, 220));

    // ---- panty game: the drawer, parsed cuts/fabrics/colors
    const pg = await boot({ seed: 360 });
    const PG = pg.H.game; PG.start('panties'); await pg.advance(1000);
    check('panty game: her rules (invented women only)', /PANTY GAME — ON/.test(last(pg)) && /invented characters only/.test(last(pg)) && /panties="CUT, FABRIC, COLOR"/.test(last(pg)));
    const pairs = ['black lace thong', 'white cotton cheeky', 'red satin g-string', 'pink sheer boyshorts', 'purple silk briefs', 'nude mesh high-cut', 'black latex crotchless', 'blue fishnet thong', 'leopard print tanga', 'white lace french cut'];
    for (const [k, pp] of pairs.entries()) { pg.message(`<handy act="${k % 2 ? 'doggy' : 'blowjob'}" intensity="0.5" panties="${pp}"/>`); await pg.advance(k < 2 ? 60000 : 8000); if (k === 0) { pg.H.feedback('love'); pg.H.feedback('close'); await pg.advance(3000); } }
    check('secret: ten pairs in the drawer', !!pg.H.profile().secrets?.drawer && Object.keys(pg.H.profile().drawer).length === 10 && /drawer 10/.test(PG.status()));
    const items = pg.H.profile().focus.items;
    check('panties are read into cut, fabric and color', items['f:cut:thong'] && items['f:fabric:lace'] && items['f:color:black'] && items['f:cut:g-string'] && items['f:fabric:sheer'] && items['f:cut:french cut']);
    pg.message('<handy act="blowjob" intensity="0.6" panties="black lace thong"/>'); await pg.advance(30000);
    pg.H.feedback('finish'); await pg.advance(1000); pg.H.focus.rateLoad('huge'); await pg.advance(1000);
    check('secret: a huge load fills her panties, and she wears them next time', !!pg.H.profile().secrets?.filled && pg.H.profile().pantiesFilled === 'black lace thong');
    PG.start('panties'); await pg.advance(2000);
    check('next panty game: she wears the filled pair, and it calls back to last time', /wearing the pair he filled last time \(black lace thong\)/.test(last(pg)) && /This is game #2 of Panty game; last time: finished/.test(last(pg)));
    pg.message('<handy act="blowjob" intensity="0.5" panties="red satin g-string"/>'); await pg.advance(12 * 60000);
    check('secrets: her own pair and the office happen in a later game', !!pg.H.profile().secrets?.['her-pair'] && !!pg.H.profile().secrets?.office);
    PG.end('quit');

    // ---- secrets in the first four games
    const e10 = await boot({ seed: 370 });
    e10.H.game.start('edging'); e10.H.run({ act: 'blowjob', intensity: 0.6 }); await e10.advance(3000);
    for (let k = 0; k < 10; k++) { e10.H.feedback('close'); await e10.advance(4000); }
    check('secret: ten edges', !!e10.H.profile().secrets?.['edge-ten']);
    e10.message('<handy game="deny"/>'); await e10.advance(1000);
    e10.H.game.start('edging'); e10.message('<handy game="ruin"/>'); await e10.advance(30000);
    e10.H.game.start('edging'); await e10.advance(5000);
    check('secret: mercy after two ruins or denials in a row', !!e10.H.profile().secrets?.mercy && /already decided to let him cum/.test(last(e10)));
    e10.H.game.end('quit');

    const jr = await boot({ seed: 371, settings: { rouletteMinutes: 10 } });
    jr.H.game.start('roulette'); await jr.advance(1000);
    for (const sc of ['a', 'b', 'c', 'd']) { jr.message(`<handy act="blowjob" scene="scene ${sc}"/>`); await jr.advance(20000); }
    check('secret: jackpot after three scenes survived in a row', !!jr.H.profile().secrets?.jackpot);
    jr.H.play.rand = () => 0; jr.H.game.spin(); await jr.advance(2000);
    check('secret: double spin blends two acts', !!jr.H.profile().secrets?.['double-spin'] && !!jr.H.actEngine.intent.blend);
    jr.H.game.end('quit');

    const tr = await boot({ seed: 372 });
    tr.H.game.start('trance'); tr.message('<handy act="handjob" intensity="0.5"/>'); await tr.advance(3000);
    for (let k = 0; k < 8; k++) { tr.H.feedback('close'); await tr.advance(44000); }
    check('secret: float after five minutes on the edge', !!tr.H.profile().secrets?.float);
    await tr.advance(15 * 60000);
    check('secret: a trigger phrase after twenty minutes, kept for later trances', !!tr.H.profile().secrets?.['deep-trance'] && !!tr.H.profile().trigger && /TRIGGER PHRASE/.test(last(tr)));
    tr.H.game.end('quit'); tr.H.game.start('trance'); await tr.advance(1000);
    check('the trigger phrase is used in the next trance', new RegExp(`trigger phrase is "${tr.H.profile().trigger}"`).test(last(tr)));
    tr.H.game.end('quit');

    const mb = await boot({ seed: 373 });
    mb.H.profile().mommy = { played: 1, allowed: 1, slipped: 0, quit: 0, edges: 0, lasted: [2], best: 2 };
    mb.H.game.start('mommy'); mb.H.run({ act: 'handjob', intensity: 0.5 }); await mb.advance(3 * 60000);
    check('secret: a new stamina record', !!mb.H.profile().secrets?.['beat-best'] && /NEW RECORD/.test(last(mb)));
    check('there are 32 secrets', mb.H.secrets.total() === 32);

    // ---- review fixes: timed surprises never restart a stopped device; secrets stay in their game; idle stop waits longer in a game
    const sf = await boot({ seed: 380 });
    sf.H.game.start('fucktoy'); sf.H.play.use('mouth'); await sf.advance(3000);
    sf.H.stop('stop button'); await sf.advance(13 * 60000);
    check('a timed surprise never restarts a device you stopped', !sf.H.active() && !sf.H.profile().secrets?.['free-use']);
    sf.H.game.end('quit');
    const r0b = sf.st.replies; sf.H.game.start('fucktoy'); await sf.advance(2000);
    for (const h of sf.H.play.holes()) { sf.H.play.use(h); await sf.advance(3000); }
    const r1b = sf.st.replies; sf.H.play.use('mouth'); await sf.advance(3000);
    check('after the complete-set secret, each use still gets her reaction', sf.H.play.spitroast() && sf.st.replies > r1b, `${r1b} → ${sf.st.replies}`);
    sf.H.game.end('quit');
    sf.H.game.start('edging'); sf.message('<handy act="blowjob" intensity="0.6" panties="a" />'); 
    check('secrets only fire in their own game', !sf.H.secrets.fire('jealous') && !sf.H.secrets.fire('broken-toy'));
    await sf.advance(11 * 60000);
    check('idle stop waits at least 20 minutes during a game', sf.H.active());
    await sf.advance(10 * 60000);
    check('…and still stops after that', !sf.H.active());
    sf.H.game.end('quit');
    const ro = await boot({ seed: 381, settings: { rouletteMinutes: 1 } });
    ro.H.game.start('roulette'); await ro.advance(2000);
    const rr = ro.st.replies; await ro.advance(70000);
    check('the roulette wheel does not spin while the device is stopped', ro.st.replies === rr && !/THE WHEEL SPINS/.test(last(ro)));
    ro.H.game.end('quit');
    check('an ending without its own line is still explained to her', /THE USER ENDED PORN ROULETTE|ended porn roulette/i.test(last(ro)));
    const go = await boot({ seed: 382 });
    go.H.game.start('fucktoy'); await go.advance(1000); go.H.game.end('quit'); await go.advance(1000);
    check('fucktoy ending is explained in words', /THE USER ENDED FUCKTOY/.test(last(go)));

    // ---- video search links: filtered, to the site's own search results
    const vs = await boot({ seed: 390 });
    const msg = vs.message('<handy act="blowjob" intensity="0.6" search="milf black lace lingerie POV"/>Put this on.'); await vs.advance(2000);
    const m0 = vs.st.chat.at(-1).mes;
    check('a search tag becomes a link to Pornhub search results in the message and on the panel', /\[milf black lace lingerie pov \(Pornhub search\)\]\(https:\/\/www\.pornhub\.com\/video\/search\?search=milf\+black\+lace\+lingerie\+pov\)/.test(m0) && vs.H.videos.list.length === 1 && !/<handy/.test(m0), m0.slice(-140));
    check('the AI is told how to suggest searches, adults only', /Suggestions: when it would help, add search=/.test(last(vs)) && /pics=/.test(last(vs)) && /never ages, "teen"/.test(last(vs)));
    const bad = [['petite teen schoolgirl daddy', 'petite daddy'], ['18 year old babysitter', ''], ['hidden cam office upskirt', 'cam office'], ['drunk sleeping step sister', 'step'], ['young little daughter', ''], ['rough abuse forced', 'rough']];
    const outs = bad.map(([q]) => vs.H.cleanQuery(q));
    check('young-sounding, family and non-consent words are removed from every query', outs.every((o, i) => o === bad[i][1]), JSON.stringify(outs));
    vs.message('<handy search="young teen"/>'); await vs.advance(1000);
    check('a query with nothing left makes no link', vs.H.videos.list.length === 1 && !/🔗/.test(vs.st.chat.at(-1).mes));
    vs.message('<handy search="redhead cowgirl" site="xvideos"/>'); await vs.advance(1000);
    vs.st.extensionSettings.handy_adaptive.videoSite = 'xhamster';
    vs.message('<handy search="big ass thong"/>'); await vs.advance(1000);
    check('the site can be chosen per tag or in settings', vs.H.videos.list.at(-2).url === 'https://www.xvideos.com/?k=redhead+cowgirl' && vs.H.videos.list.at(-1).url === 'https://xhamster.com/search/big+ass+thong');
    vs.st.extensionSettings.handy_adaptive.videoLinks = false;
    vs.message('<handy search="milf"/>Text.'); await vs.advance(1000);
    vs.message('<handy pics="white cotton cheeky panties teen ass"/>Look.'); await vs.advance(1000);
    check('pics= becomes a filtered PornPics search link', /📷 \[white cotton cheeky panties ass \(PornPics search\)\]\(https:\/\/www\.pornpics\.com\/\?q=white\+cotton\+cheeky\+panties\+ass\)/.test(vs.st.chat.at(-1).mes), vs.st.chat.at(-1).mes.slice(-120));
    check('turned off: no video links and no video instructions', !/🔗/.test(vs.st.chat.at(-1).mes) && !/add search=/.test(last(vs)));
    vs.st.extensionSettings.handy_adaptive.picLinks = false;
    vs.message('<handy pics="lace"/>Text.'); await vs.advance(1000);
    check('pictures turned off too: nothing', !/📷/.test(vs.st.chat.at(-1).mes) && !/Suggestions:/.test(last(vs)));

    const pic = await boot({ settings: { imageGapSec: 0 } });
    const draws = [];
    pic.st.handyImages = {
        available: () => true,
        async generate(job) { draws.push(job); return { dataUrl: 'test-image-' + draws.length, usedReferences: job.references.length }; },
    };
    pic.message('<handy her="Ada" panties="navy satin briefs" look="auburn hair"/><handy her="Bea" panties="white cotton"/><handy her="Ada" img="turns toward the mirror" framing="side view"/>');
    await pic.advance(1000);
    check('picture inherits only the named rival’s preceding details', draws.length === 1 && /auburn hair/.test(draws[0].prompt) && /navy satin briefs/.test(draws[0].prompt) && /side view/.test(draws[0].prompt) && !/white cotton/.test(draws[0].prompt));
    pic.H.images.rate(pic.H.images.session.shots[0].id, 'love');
    pic.message('<handy her="Ada"/><handy img="looks up"/>');
    await pic.advance(1000);
    check('same subject keeps her wardrobe and latest hearted likeness', draws[1]?.references.join() === 'test-image-1' && /navy satin briefs/.test(draws[1].prompt));
    pic.H.images.rate(pic.H.images.session.shots[1].id, 'love');
    pic.message('<handy her="Ada" outfit="green dress" img="arrives outside"/>');
    await pic.advance(1000);
    check('new outfit replaces previous pair and newest heart replaces old likeness', draws[2]?.references.join() === 'test-image-2' && /green dress/.test(draws[2].prompt) && !/navy satin/.test(draws[2].prompt));
    pic.H.game.active = true; pic.H.game.mode = 'roulette';
    pic.message('<handy scene="neon rooftop"/>');
    check('a viewing game puts the scene search in the originating reply', pic.st.chat.at(-1).mes.includes('search=neon+rooftop'));
    pic.st.extensionSettings.handy_adaptive.videoLinks = false;
    pic.message('<handy scene="new stage"/>');
    check('scene fallback respects disabled video links', !pic.st.chat.at(-1).mes.includes('https://'));

    // ---- Marinara-style flows
    const mz = await boot({ seed: 400 });
    mz.st.executeSlashCommandsWithOptions = async () => { throw new Error('not available'); };
    mz.H.game.start('edging'); await mz.advance(2000);
    mz.handlers.chat_changed(); await mz.advance(500);
    check('a game with no reply yet survives a chat change (Marinara learns the chat only when you send)', mz.H.game.active);
    mz.message('<handy act="blowjob" intensity="0.5"/>'); await mz.advance(1000);
    mz.handlers.chat_changed(); await mz.advance(500);
    check('…but ends once the game has had a reply', !mz.H.game.active);
    mz.st.extensionSettings.handy_adaptive.injectProfile = false;
    mz.H.game.start('edging'); await mz.advance(500);
    check('games refuse to start without the AI instructions, and say why', !mz.H.game.active && mz.toasts.some((x) => /Games need the AI instructions/.test(x.m)));
    mz.st.extensionSettings.handy_adaptive.injectProfile = true;
    mz.st.extensionSettings.handy_adaptive.closeAction = 'ai';
    mz.H.run({ act: 'handjob', intensity: 0.6 }); await mz.advance(3000);
    mz.H.feedback('close'); await mz.advance(2000); mz.H.feedback('close'); await mz.advance(2000);
    check('where a reply cannot be started, you are told once to send a message', mz.toasts.filter((x) => /Send a message for her reply/.test(x.m)).length === 1);

    // ---- the cast
    const cs = await boot({ seed: 410 });
    cs.H.game.start('panties'); await cs.advance(1000);
    check('the cast is introduced to her in every game', /THE CAST: invented women who come back/.test(last(cs)));
    cs.message('<handy act="blowjob" intensity="0.6" her="Dana" about="curvy redhead from accounting, shy until she isn\'t" panties="red satin thong" watch="her hips"/>'); await cs.advance(60000);
    cs.H.feedback('close'); await cs.advance(20000); cs.H.feedback('love'); await cs.advance(30000);
    const dana = cs.H.profile().cast.dana;
    check('a cast member is remembered with her description, her pairs and her games', dana && /accounting/.test(dana.about) && dana.drawer[0] === 'red satin thong' && dana.games.includes('panties'));
    cs.H.game.end('quit'); cs.H.game.start('cuckqueen'); await cs.advance(1000);
    check('she comes back in the next game, with what he did for her', /Dana \(curvy redhead from accounting[^)]*\), wears red satin thong — [^;]*1 edges/.test(last(cs)), (last(cs).match(/So far, his favorites first:[^\n]*/) || [''])[0].slice(0, 200));
    cs.message('<handy act="doggy" intensity="0.6" girl="Mia" about="tall brunette"/>'); await cs.advance(2000);
    check('girl= in a rivalry or any tag also joins the cast', !!cs.H.profile().cast.mia);
    cs.H.game.end('quit');

    // ---- learned triggers
    const tg = await boot({ seed: 420 });
    tg.H.game.start('mommy'); await tg.advance(1000);
    check('each game starts with trigger phrases to test', /YOUR TRIGGER PHRASES[^\n]*still testing: "cum for mommy"/.test(last(tg)));
    tg.message('<handy act="handjob" intensity="0.6"/>That\'s it, good boy. Cum for mommy.'); await tg.advance(20000);
    tg.H.feedback('finish'); await tg.advance(1000); tg.H.focus.rateLoad('huge'); await tg.advance(1000);
    const T = tg.H.profile().triggers;
    check('a phrase she said right before you came gets the credit (and a huge load counts extra)', T['cum for mommy'].finishes === 1 && T['cum for mommy'].big === 1 && T['good boy'].finishes === 1 && T['not yet'] === undefined);
    tg.H.game.start('mommy'); await tg.advance(1000);
    check('the strongest ones are saved for the finish', /strongest: "cum for mommy" \(1 finishes, 🌊\)/.test(last(tg)) || /strongest: "good boy" \(1 finishes, 🌊\)/.test(last(tg)), (last(tg).match(/strongest:[^\n]*?:/) || [''])[0]);
    tg.message('<handy trigger="look at those thighs" act="handjob"/>'); await tg.advance(1000);
    check('she can add her own trigger phrase', !!tg.H.profile().triggers['look at those thighs']);
    const dud = tg.H.triggers.add('a phrase that never works', 'mommy'); dud.uses = 9;
    tg.H.game.end('quit'); tg.H.game.start('mommy'); await tg.advance(1000);
    check('phrases that never land are retired', dud.retired && !/a phrase that never works/.test(last(tg)));
    tg.H.game.end('quit');

    // ---- confessions
    const cf = await boot({ seed: 430 });
    cf.H.game.start('panties'); await cf.advance(1000);
    check('she is told how to ask for confessions', /CONFESSIONS: now and then ask him/.test(last(cf)));
    cf.message('<handy act="blowjob" intensity="0.5" confess="Which girl at the office do you picture in black lace?"/>Tell me.'); await cf.advance(2000);
    cf.say('The tall one with the thick thighs, in a black lace thong'); await cf.advance(1000);
    const cn = cf.H.profile().confessions.at(-1), cItems = cf.H.profile().focus.items;
    check('his next message is kept as the answer, and what it mentions is learned as liked', cn && /thick thighs/.test(cn.a) && /black lace/.test(cn.q) && cItems['t:curves & thighs']?.loves >= 1 && cItems['f:fabric:lace']?.loves >= 1 && cItems['f:cut:thong']?.loves >= 1);
    check('she hears his answer and keeps it for later', /HE ANSWERED YOUR CONFESSION QUESTION: "The tall one/.test(last(cf)) && /What he has confessed:/.test(last(cf)));
    cf.say('stop'); await cf.advance(500);
    check('a later message is not taken as another answer', cf.H.profile().confessions.length === 1);
    cf.H.game.end('quit');

    // ---- taboo ladder
    const ld = await boot({ seed: 440 });
    check('a new game starts at depth level 1', ld.H.ladder.level('mommy') === 1);
    for (let k = 0; k < 4; k++) { ld.H.game.start('mommy'); ld.H.run({ act: 'handjob', intensity: 0.5 }); await ld.advance(2000); ld.H.feedback('finish'); await ld.advance(25000); }
    ld.H.game.start('mommy'); await ld.advance(1000);
    check('playing and finishing deepens it, with a toast when a level unlocks', ld.H.ladder.level('mommy') >= 3 && /DEPTH LEVEL [3-5]\/5/.test(last(ld)) && ld.toasts.some((x) => /Mommy's stamina training is now level/.test(x.m)));
    ld.H.game.end('quit');

    // ---- story mode
    const sm = await boot({ seed: 450, settings: { storyStageMinutes: 5 } });
    sm.H.play.rand = () => 0.5;
    sm.H.game.start('story'); await sm.advance(1000);
    const st0 = sm.H.game.story;
    check('story mode plans three different games and keeps the order secret', st0 && new Set(st0.stages).size === 3 && /STORY MODE: stage 1 of 3/.test(last(sm)) && /Story · stage 1\/3/.test(sm.H.game.status()));
    sm.message('<handy act="handjob" intensity="0.5"/>'); await sm.advance(3000);
    sm.message('<handy game="allow"/>'); await sm.advance(1000);
    check('nobody finishes before the finale', sm.H.game.active && !sm.H.climax.active);
    sm.H.feedback('close'); await sm.advance(3000); sm.H.feedback('close'); await sm.advance(3000);
    check('two edges move it to the next stage, and edges carry over', sm.H.game.story.i === 1 && sm.H.game.edges === 2 && sm.H.game.mode === st0.stages[1] && /THE NEXT STAGE STARTS NOW/.test(last(sm)));
    await sm.advance(5 * 60000 + 2000);
    check('the stage time moves it on too; the finale is marked', sm.H.game.story.i === 2 && /This is the FINALE/.test(last(sm)));
    sm.H.feedback('climax'); await sm.advance(1000);
    const finMode = st0.stages[2];
    sm.message(finMode === 'daddy' ? '<handy game="ask"/>' : '<handy game="allow"/>'); await sm.advance(1000);
    if (finMode === 'daddy') { sm.H.play.daddy('yes'); await sm.advance(1000); }
    check('the finale can end it', !sm.H.game.active && sm.H.climax.active && sm.H.game.stats('story').allowed === 1, finMode);
    const sm2 = await boot({ seed: 451 });
    sm2.H.game.start('story'); sm2.H.run({ act: 'handjob', intensity: 0.5 }); await sm2.advance(3000);
    sm2.H.feedback('finish'); await sm2.advance(1000);
    check('cumming before the finale counts as slipping', sm2.H.game.stats('story').slipped === 1);

    // ---- her voice
    const vo = await boot({ seed: 460, settings: { voiceOn: true } });
    const spoken = [];
    vo.H.voice.ok = () => true;
    globalThis.window.speechSynthesis = { speak: (u) => spoken.push(u), cancel: () => { spoken.cancel = (spoken.cancel || 0) + 1; }, getVoices: () => [{ name: 'Test Voice', lang: 'en-US' }] };
    globalThis.window.SpeechSynthesisUtterance = function (text) { this.text = text; };
    vo.message('<handy act="handjob" intensity="0.5"/>Mm, *slowly*. Good boy, now cum for me. [x](http://y)'); await vo.advance(3000);
    const u = spoken.at(-1);
    check('her reply is read aloud without tags, markup or links', u && u.text === 'Mm, slowly. Good boy, now cum for me.', u && u.text);
    const d0 = vo.H.actEngine.intent.depthOff;
    u.onboundary({ name: 'word', charIndex: u.text.indexOf('Good') }); await vo.advance(300);
    const deep = vo.H.actEngine.intent.depthOff;
    u.onboundary({ name: 'word', charIndex: u.text.indexOf('now') }); await vo.advance(300);
    check('a deep stroke lands on "good boy", at most every 1.5 s', deep < d0 - 0.3 && vo.H.actEngine.intent.depthOff === deep);
    await vo.advance(1200);
    check('…and it goes back after', Math.abs(vo.H.actEngine.intent.depthOff - d0) < 1e-9);
    vo.H.stop('stop button');
    check('STOP silences her', spoken.cancel >= 1);
    vo.st.extensionSettings.handy_adaptive.voiceOn = false; const n0 = spoken.length;
    vo.message('Hello.'); await vo.advance(500);
    check('voice off: nothing is spoken', spoken.length === n0);

    // ---- heart rate
    const hb = await boot({ seed: 470 });
    hb.H.run({ act: 'handjob', intensity: 0.7 }); await hb.advance(2000);
    for (let k = 0; k < 30; k++) { hb.H.hr.ingest(70); await hb.advance(1000); }
    check('the resting rate is learned from the first readings', hb.H.hr.base === 70 && hb.H.profile().restingHr === 70);
    for (let k = 0; k < 10; k++) { hb.H.hr.ingest(85 + k); await hb.advance(1000); }
    check('a live heart rate drives the arousal meter and she sees it', hb.H.arousal.level > 0.3 && /HEART RATE \(live sensor\): 9[2-4] bpm, resting 70/.test(hb.st.prompts.filter(Boolean).pop()));
    const i0 = hb.H.actEngine.intent.intensity;
    for (const b of [100, 102, 104, 106, 108, 110, 112, 114, 116, 118, 120, 122, 124]) { hb.H.hr.ingest(b); await hb.advance(1000); }
    check('a fast climb near the top eases off before you get there, and she is told', hb.H.actEngine.intent.intensity < i0 && /HEART RATE IS CLIMBING FAST/.test(hb.st.prompts.filter(Boolean).pop()), `${i0.toFixed(2)} → ${hb.H.actEngine.intent.intensity.toFixed(2)}`);
    hb.H.run({ act: 'handjob', intensity: 0.9 }); await hb.advance(2000);
    hb.H.hr.ingest(182); await hb.advance(500);
    check('a very high rate slows everything down, with a warning', hb.H.actEngine.intent.intensity <= 0.3 && hb.toasts.some((x) => /Heart rate 182: slowing down/.test(x.m)));
    await hb.advance(16000);
    check('no readings for 15 s: the sensor is ignored', !hb.H.hr.live() && !/HEART RATE \(live/.test(hb.st.prompts.filter(Boolean).pop() || ''));

    // ---- calibration self-check: a device that moves the wrong way, or ignores where it's told to go
    {
        const run = async (opts) => {
            const h = await boot({ seed: 480, ...opts });
            h.H.calib.start(); await h.advance(300); h.H.calib.begin(); await h.advance(16000);   // (firmware 4: the format check first)
            for (let k = 0; k < 3; k++) { h.H.calib.jog(-10); await h.advance(2500); }
            return h;
        };
        const ok = await run({});
        check('calibration self-check: a normal Handy raises no warning', ok.H.calib.problem === null && ok.H.calib.seen.length >= 3 && Math.abs(ok.devPos() - 20) < 2, `pos ${ok.devPos().toFixed(1)}`);
        const rv = await run({ quirk: 'reversed' });
        check('a Handy that moves the opposite way is spotted', rv.H.calib.problem === 'reversed' && rv.devPos() > 70, `pos ${rv.devPos().toFixed(1)}`);
        rv.H.calib.flip(); await rv.advance(6000);
        for (let k = 0; k < 2; k++) { rv.H.calib.jog(-10); await rv.advance(2500); }
        check('Flip direction fixes it: ▼ now lowers the sleeve, and it is remembered', rv.st.extensionSettings.handy_adaptive.flipAxis === true && rv.H.calib.problem === null && Math.abs(rv.devPos() - rv.H.calib.pos) < 2 && rv.H.calib.pos === 0, `pos ${rv.devPos().toFixed(1)} vs ${rv.H.calib.pos}`);
        // play after flipping: the device ends where the motion wants it (the flip applies to everything)
        rv.H.calib.mark(); await rv.advance(1000); rv.H.calib.jog(10); await rv.advance(2500); rv.H.calib.jog(10); await rv.advance(2500); rv.H.calib.jog(10); await rv.advance(2500);
        rv.H.calib.mark(); await rv.advance(500); rv.H.calib.finish(); await rv.advance(500);
        const cal0 = rv.st.extensionSettings.handy_adaptive.calibration;
        check('…and the calibration saved through it is the real one', cal0 && cal0.tip === 0 && cal0.base === 30, JSON.stringify(cal0));
        const st = await run({ fw: '4.0.12', quirk: 'stuck' });
        check('a Handy that ignores positions is spotted, with the firmware 4 advice', st.H.calib.problem === 'stuck' && st.H.calib.v3() === false);
        const st3 = await run({ fw: '4.0.12', quirk: 'stuck', settings: { appId: 'app-123' } });
        check('firmware 4 with an Application ID: calibration uses API v3 automatically, and works', st3.H.calib.v3() && st3.H.calib.problem === null && Math.abs(st3.devPos() - 20) < 2 && st3.dev.calls.some((c) => c.v3 && c.path === '/hdsp/xpt'), `pos ${st3.devPos().toFixed(1)}`);
        const nr = await run({ quirk: 'reversed', reportsPosition: false });
        check('a Handy that does not report its position: no false alarm (the manual Flip is still offered)', nr.H.calib.problem === null);
    }

    // ---- a firmware 4 Handy that reads streamed positions on a 0-1 scale (50 → all the way up)
    {
        const run = async (opts) => {
            const h = await boot({ seed: 490, fw: '4.0.12', quirk: 'fraction', ...opts });
            h.H.calib.start(); await h.advance(300); h.H.calib.begin(); await h.advance(14000);
            return h;
        };
        const fr = await run({});
        check('the probe finds the 0–1 format, switches, and remembers it', fr.H.api.scale === 'fraction' && fr.st.extensionSettings.handy_adaptive.posScaleFound === 'fraction' && fr.toasts.some((t) => /0–1 scale/.test(t.m)));
        check('…so "go to 50" lands at 50, not near the top', Math.abs(fr.devPos() - fr.H.calib.pos) < 2, `pos ${fr.devPos().toFixed(1)} vs ${fr.H.calib.pos}`);
        for (let k = 0; k < 3; k++) { fr.H.calib.jog(-10); await fr.advance(2500); }
        check('…and ▼ lowers the sleeve', Math.abs(fr.devPos() - fr.H.calib.pos) < 2 && fr.H.calib.pos === 20 && fr.H.calib.problem === null, `pos ${fr.devPos().toFixed(1)}`);
        fr.H.calib.abort(); await fr.advance(500);
        fr.H.run({ act: 'handjob', intensity: 0.6 }); await fr.advance(8000);
        const ps = fr.dev.cmds.filter((c) => c.sent !== undefined).slice(-20).map((c) => c.sent);
        check('play streams in the same format', ps.length > 5 && ps.every((x) => x >= 0 && x <= 1), JSON.stringify(ps.slice(0, 4)));
        // without position reports, the manual button does it
        const nr = await run({ reportsPosition: false });
        check('a Handy without position reports keeps 0–100 (no guessing)', nr.H.api.scale === null && Math.abs(nr.devPos() - 100) < 2);
        nr.H.calib.toggleScale(); await nr.advance(6000);
        for (let k = 0; k < 2; k++) { nr.H.calib.jog(-10); await nr.advance(2500); }
        check('…and "Try the other position format" fixes it by hand, remembered', nr.st.extensionSettings.handy_adaptive.posScale === 'fraction' && Math.abs(nr.devPos() - nr.H.calib.pos) < 2, `pos ${nr.devPos().toFixed(1)} vs ${nr.H.calib.pos}`);
        const f3 = await boot({ seed: 491 });
        f3.H.calib.start(); await f3.advance(300); f3.H.calib.begin(); await f3.advance(6000);
        check('firmware 3: no probe, nothing changes', f3.H.api.scale === null && !f3.dev.cmds.some((c) => c.sent === 35));
    }
}

console.log(failed ? `\n${failed} check(s) failed` : '\nall device checks passed');
process.exit(failed ? 1 : 0);
