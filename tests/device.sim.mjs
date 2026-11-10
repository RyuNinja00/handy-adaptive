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

console.log(failed ? `\n${failed} check(s) failed` : '\nall device checks passed');
process.exit(failed ? 1 : 0);
