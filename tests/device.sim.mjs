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
    check('script sync swaps start near the old script position', pct(jumps, 0.5) <= 12, `median mismatch ${pct(jumps, 0.5).toFixed(0)}%`);
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
async function calibrate(h, tip, base) {
    h.H.calib.start(); await h.advance(500);
    h.H.calib.begin(); await h.advance(5000);
    const jogTo = async (p) => { while (h.H.calib.pos !== p) { h.H.calib.jog(Math.max(-10, Math.min(10, p - h.H.calib.pos))); await h.advance(600); } };
    await jogTo(tip); h.H.calib.mark(); await jogTo(base); h.H.calib.mark(); h.H.calib.finish(); await h.advance(500);
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
    h.H.calib.mark(); await h.advance(4000);
    // last base 20 shifted by +4 = 24, stopped 10% short toward the tip = 30
    const pre = h.H.calib.step === 2 && h.H.calib.pos === 30 && Math.abs(h.devPos() - 30) < 1;
    const deepest = Math.min(...h.dev.traj.filter((x) => x.t > 0).map((x) => x.p ?? 100), h.devPos());
    check('"Recalibrate" drops the waiting command and starts at last time\'s tip', opened && atOldTip, `pos ${h.H.calib.pos}, device ${Math.round(h.devPos())}`);
    check('after the tip, the sleeve waits just short of the shifted base (never deeper than before)', pre && deepest >= 24, `pos ${h.H.calib.pos}, deepest ${Math.round(deepest)}`);
    h.H.calib.jog(-2); await h.advance(400); h.H.calib.jog(-2); await h.advance(400); h.H.calib.jog(-2); await h.advance(400);
    h.H.calib.mark(); h.H.calib.finish(); await h.advance(500);
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

console.log(failed ? `\n${failed} check(s) failed` : '\nall device checks passed');
process.exit(failed ? 1 : 0);
