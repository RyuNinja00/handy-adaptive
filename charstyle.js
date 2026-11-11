// Character styles: each character moves the Handy their own way.
//
// A style starts from the character card (personality, description, scenario, tags), is shaped by the
// user's feedback while that character is in control, and is remembered per character. Pure functions
// only; storage, attribution and the UI live in index.js.

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;

/** The seven traits, their range and their neutral value. */
export const TRAITS = {
    tempo: { label: 'Tempo',         min: -1, max: 1, neutral: 0,   low: 'slow',          high: 'fast' },
    reach: { label: 'Stroke length', min: -1, max: 1, neutral: 0,   low: 'short',         high: 'long' },
    focus: { label: 'Focus',         min: -1, max: 1, neutral: 0,   low: 'the base',      high: 'the tip' },
    wild:  { label: 'Wildness',      min: -1, max: 1, neutral: 0,   low: 'smooth',        high: 'unpredictable' },
    tease: { label: 'Teasing',       min: 0,  max: 1, neutral: 0.15, low: 'no pauses',    high: 'lots of pauses' },
    eager: { label: 'Eagerness',     min: -1, max: 1, neutral: 0,   low: 'drags it out',  high: 'quick to build' },
    exp:   { label: 'Experience',    min: 0,  max: 1, neutral: 0.5, low: 'inexperienced', high: 'expert' },
};
export const NEUTRAL = () => Object.fromEntries(Object.entries(TRAITS).map(([k, t]) => [k, t.neutral]));

// Words in a card and what they say about how this character would move. Each hit nudges traits;
// several hits add up (with diminishing returns), so "shy, inexperienced virgin" reads as very green.
const LEXICON = [
    // inexperience
    [/\b(virgin(al)?|inexperienced|innocent|naive|na[iï]ve|sheltered|first[- ]time|never (been touched|done this|had sex))\b/, { exp: -0.35, tempo: -0.2, reach: -0.15, wild: 0.1 }],
    [/\b(shy|timid|nervous|bashful|flustered|awkward|hesitant|meek|introverted|easily embarrassed)\b/, { exp: -0.15, tempo: -0.25, reach: -0.1, eager: -0.2, focus: 0.15 }],
    // experience
    [/\b(experienced|skilled|expert|skillful|talented|masterful|knows (exactly )?what (she|he|they) (is|are)? ?doing)\b/, { exp: 0.35, wild: -0.1, reach: 0.1 }],
    [/\b(seductive|seductress|temptress|succubus|incubus|courtesan|escort|prostitute|harlot|sex worker|porn ?star|sex (goddess|demon|expert))\b/, { exp: 0.4, reach: 0.2, tease: 0.15 }],
    [/\b(promiscuous|slutty|slut|nympho(maniac)?|hypersexual|sexually experienced|insatiable|perverted|lewd|pervert)\b/, { exp: 0.25, eager: 0.3, tempo: 0.2, reach: 0.15 }],
    [/\b(mature|milf|older woman|older man|veteran|seasoned)\b/, { exp: 0.25, wild: -0.1 }],
    // dominance
    [/\b(dominant|domme|dominatrix|bossy|commanding|controlling|authoritative|in control|strict|stern)\b/, { tease: 0.3, eager: -0.25, exp: 0.15, wild: 0.1 }],
    [/\b(sadist(ic)?|cruel|mean|merciless|denial|edging|orgasm control)\b/, { tease: 0.4, eager: -0.35, wild: 0.15 }],
    // submission / devotion
    [/\b(submissive|obedient|docile|servile|eager to please|devoted|worshipful|people[- ]pleaser|maid|servant)\b/, { eager: 0.25, focus: -0.1, tease: -0.1, wild: -0.1 }],
    [/\b(needy|clingy|desperate|yandere|obsessed|obsessive|possessive)\b/, { eager: 0.35, tempo: 0.15, reach: 0.1 }],
    // teasing / playful
    [/\b(teas(e|ing|er)|playful|mischievous|bratty|brat|coy|cheeky|impish|prankster|trickster|flirt(y|atious)?|smug)\b/, { tease: 0.3, focus: 0.25, wild: 0.2, eager: -0.1 }],
    [/\b(tsundere|kuudere)\b/, { tease: 0.2, eager: -0.15, wild: 0.15 }],
    // gentle / loving
    [/\b(gentle|tender|caring|sweet|kind|soft[- ]spoken|loving|affectionate|nurturing|motherly|maternal|romantic|patient)\b/, { tempo: -0.2, wild: -0.2, reach: 0.1, eager: -0.1 }],
    // wild / rough
    [/\b(wild|aggressive|rough|feral|savage|beastly|animalistic|primal|ferocious|violent|brutal)\b/, { tempo: 0.3, reach: 0.25, wild: 0.3, eager: 0.2, tease: -0.1 }],
    [/\b(horny|lustful|passionate|intense|energetic|hyper(active)?|athletic|enthusiastic|frantic|impatient)\b/, { tempo: 0.25, eager: 0.25, reach: 0.1 }],
    // calm / cold / precise
    [/\b(calm|stoic|cold|aloof|reserved|composed|collected|emotionless|methodical|precise|meticulous|disciplined|robot(ic)?|android|machine|clinical)\b/, { wild: -0.3, exp: 0.1, eager: -0.1 }],
    [/\b(lazy|sleepy|drowsy|laid[- ]back|relaxed|lethargic|languid)\b/, { tempo: -0.3, reach: -0.05, wild: -0.05 }],
    [/\b(clumsy|ditzy|airheaded|scatterbrained|klutz)\b/, { exp: -0.1, wild: 0.25 }],
    // where they focus
    [/\b(deep[- ]?throat(ing)?|takes? it all|all the way|to the hilt|throat|gag(s|ging)?)\b/, { focus: -0.35, reach: 0.1 }],
    [/\b(lick(s|ing)?|kiss(es|ing)? the tip|the tip|kitten licks?)\b/, { focus: 0.25 }],
];
const NEGATION = /\b(not|never|no|isn't|isnt|wasn't|hardly|anything but|far from)\s+(\w+\s+){0,2}$/i;

/** Read a style from the card text. Returns { traits, hits } (hits: which words counted). */
export function seedStyle(text) {
    const t = String(text || '').toLowerCase().replace(/\s+/g, ' ');
    const sum = Object.fromEntries(Object.keys(TRAITS).map((k) => [k, 0]));
    const hits = [];
    for (const [re, delta] of LEXICON) {
        const g = new RegExp(re.source, 'gi');
        let n = 0, m;
        while ((m = g.exec(t)) && n < 3) {
            if (NEGATION.test(t.slice(Math.max(0, m.index - 30), m.index))) continue;   // "not shy" says nothing
            n++; if (n === 1) hits.push(m[0]);
        }
        if (!n) continue;
        const w = 1 + 0.35 * (n - 1);   // repeating a word counts, but less
        for (const [k, v] of Object.entries(delta)) sum[k] += v * w;
    }
    // Diminishing returns: many words pushing one way saturate rather than run off the scale.
    const sat = (x) => Math.tanh(x * 1.2) / Math.tanh(1.2);
    const traits = NEUTRAL();
    for (const [k, tr] of Object.entries(TRAITS)) {
        if (k === 'exp') traits.exp = clamp(0.5 + 0.5 * sat(sum.exp), 0, 1);
        else if (k === 'tease') traits.tease = clamp(tr.neutral + 0.85 * sat(sum.tease), 0, 1);
        else traits[k] = clamp(sat(sum[k]), -1, 1);
    }
    for (const k of Object.keys(traits)) traits[k] = +traits[k].toFixed(2);
    return { traits, hits };
}

/** A fresh, empty record of what the user has taught this character. */
export const EMPTY_LEARNED = () => ({ rateMul: 1, ampMul: 1, centerShift: 0, varOff: 0, expGain: 0 });

/**
 * What a style does to the motion. Multipliers and offsets that targetFor() and synthesize() apply on top
 * of the act, the user's learned taste and the live intent. `learned` is what feedback has added.
 */
export function effect(traits, learned = EMPTY_LEARNED()) {
    const T = { ...NEUTRAL(), ...traits }, L = { ...EMPTY_LEARNED(), ...learned };
    const exp = clamp(T.exp + L.expGain, 0, 1);
    return {
        rateMul: clamp(Math.pow(1.45, T.tempo) * L.rateMul, 0.4, 2.5),         // ±45% tempo
        ampMul: clamp(Math.pow(1.3, T.reach) * L.ampMul, 0.4, 2),               // ±30% stroke length
        centerShift: clamp(14 * T.focus + L.centerShift, -35, 35),              // body %, + = toward the tip
        varOff: clamp(0.18 * T.wild + L.varOff, -0.45, 0.45),
        tease: clamp(T.tease, 0, 1),                                             // chance of a held pause between phrases
        intensityBias: 0.12 * T.eager,                                           // nudges how hard a given intensity hits
        jitterMul: lerp(1.6, 0.7, exp),                                          // green = uneven timing; expert = precise
        exp,
    };
}

/** A short plain-words description, for the AI and the panel. */
export function describe(traits, learned) {
    const e = effect(traits, learned), T = { ...NEUTRAL(), ...traits };
    const out = [];
    if (e.exp < 0.3) out.push('inexperienced: a little uneven, still finding a rhythm');
    else if (e.exp < 0.42) out.push('fairly new to this');
    else if (e.exp > 0.75) out.push('experienced and precise');
    else if (e.exp > 0.6) out.push('confident');
    if (e.rateMul < 0.8) out.push('slow and unhurried'); else if (e.rateMul < 0.92) out.push('a little slower than usual');
    else if (e.rateMul > 1.25) out.push('fast'); else if (e.rateMul > 1.08) out.push('a little quicker than usual');
    if (e.ampMul < 0.85) out.push('short strokes'); else if (e.ampMul > 1.15) out.push('long, full strokes');
    if (e.centerShift > 5) out.push('lingers at the tip'); else if (e.centerShift < -5) out.push('takes it deep');
    if (e.varOff > 0.08) out.push('unpredictable'); else if (e.varOff < -0.08) out.push('smooth and steady');
    if (T.tease > 0.45) out.push('teasing, with pauses');
    if (T.eager > 0.3) out.push('eager, quick to build'); else if (T.eager < -0.3) out.push('likes to drag it out');
    return out.length ? out.join(', ') : 'balanced, no strong habits yet';
}

/** Simple, stable hash so a changed card can be noticed. */
export function textHash(s) {
    let h = 2166136261;
    for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
    return (h >>> 0).toString(36);
}
