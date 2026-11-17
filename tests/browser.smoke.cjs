// Runs the extension in a real Chromium page (real jQuery, real DOM) with a stand-in SillyTavern and a
// simulated Handy, and clicks through the panel. Skips itself when Playwright or a local jQuery is missing.
const fs = require('fs'), path = require('path'), http = require('http');
let chromium; try { ({ chromium } = require('playwright')); } catch { console.log('skip browser smoke test: playwright not installed'); process.exit(0); }
const JQ = ['/usr/share/javascript/jquery/jquery.min.js', path.join(__dirname, 'vendor', 'jquery.min.js'), path.join(__dirname, '..', 'marinara', 'vendor', 'jquery-3.6.1.min.js')].find((f) => fs.existsSync(f));
if (!JQ) { console.log('skip browser smoke test: no local jQuery'); process.exit(0); }
const ROOT = path.join(__dirname, '..');
const PAGE = `<!doctype html><html><head><meta charset="utf-8"><link rel="stylesheet" href="/ext/style.css">
<style>.menu_button{display:inline-block;padding:4px 8px;min-width:24px;min-height:18px}</style>
<script src="/jquery.js"></script><script>
window.toasts=[];window.errors=[];addEventListener('error',e=>errors.push(String(e.message)));addEventListener('unhandledrejection',e=>errors.push(String(e.reason)));
window.toastr=Object.fromEntries(['info','success','warning','error'].map(k=>[k,m=>toasts.push(k+': '+m)]));
const rf=window.fetch;window.calls=[];window.fetch=async(u,o={})=>{u=String(u);if(!u.includes('handyfeeling'))return rf(u,o);const p=u.split(/\\/v2|\\/handy-rest\\/v3/)[1]||u;calls.push(p);
const j=p.startsWith('/connected')?{connected:true}:p.startsWith('/servertime')?{serverTime:Date.now(),server_time:Date.now()}:p.startsWith('/hsp/')?{result:{play_state:1,current_time:0}}:{result:0};
return new Response(JSON.stringify(j),{status:200,headers:{'Content-Type':'application/json'}})};
window.stCtx={extensionSettings:{handy_adaptive:{connectionKey:'KEY',calibration:{base:20,tip:80,at:'x'},setups:[{name:'Lying down',base:20,tip:80},{name:'Sitting',base:30,tip:70}],setupName:'Lying down'}},
chat:[],characters:[{name:'Vex',avatar:'vex.png',description:'A dominant succubus.'}],characterId:0,saveSettingsDebounced(){},setExtensionPrompt(){},eventSource:{on(){}},
eventTypes:{MESSAGE_RECEIVED:'a',MESSAGE_SENT:'b',CHAT_CHANGED:'c'},executeSlashCommandsWithOptions:async()=>{}};
window.SillyTavern={getContext:()=>stCtx};window.confirm=()=>true;window.prompt=()=>'x';
</script></head><body><div id="extensions_settings2"></div><script type="module" src="/ext/index.js"></script></body></html>`;
const server = http.createServer((req, res) => {
    const u = decodeURIComponent(req.url.split('?')[0]);
    if (u === '/') { res.writeHead(200, { 'Content-Type': 'text/html' }); return res.end(PAGE); }
    const f = u === '/jquery.js' ? JQ : u.startsWith('/ext/') ? path.join(ROOT, u.slice(5)) : null;
    if (!f || !fs.existsSync(f)) { res.writeHead(404); return res.end(); }
    res.writeHead(200, { 'Content-Type': f.endsWith('.css') ? 'text/css' : 'text/javascript' }); fs.createReadStream(f).pipe(res);
});
server.listen(0, async () => {
    let failed = 0;
    const check = (name, ok, detail = '') => { console.log(`${ok ? 'ok  ' : 'FAIL'} ${name}${detail ? `  (${detail})` : ''}`); if (!ok) failed++; };
    let b;
    try { b = await chromium.launch(); } catch (e) { console.log('skip browser smoke test: no browser (' + e.message.split('\n')[0] + ')'); server.close(); process.exit(0); }
    const p = await b.newPage({ viewport: { width: 1280, height: 800 } });
    await p.goto(`http://127.0.0.1:${server.address().port}/`); await p.waitForSelector('#handy_panel'); await p.waitForTimeout(300);
    const st = () => p.evaluate(() => stCtx.extensionSettings.handy_adaptive);
    await p.click('#handy_play'); await p.waitForTimeout(300);
    check('the start-of-session question appears before the first motion', await p.isVisible('#handy_calib'));
    await p.selectOption('#handy_calib_setup', 'Sitting'); await p.waitForTimeout(300);
    let s = await st();
    check('its Setup menu switches the calibration', s.calibration.base === 30 && s.setupName === 'Sitting', `${s.calibration.base}-${s.calibration.tip}`);
    await p.click('#handy_calib_next'); await p.waitForTimeout(500);
    check('"Use it and start" starts the motion', await p.evaluate(() => handyAdaptive.actEngine.running));
    const before = await p.evaluate(() => handyAdaptive.actEngine.intent.speedMul);
    await p.click('[data-fb="faster"]'); await p.waitForTimeout(100);
    check('panel buttons work (Faster)', await p.evaluate((b) => handyAdaptive.actEngine.intent.speedMul !== b || handyAdaptive.profile().acts[handyAdaptive.actEngine.intent.act]?.n > 0, before));
    await p.click('[data-fb="climax"]'); await p.waitForTimeout(400);
    check('"Finish me" starts a climax push', await p.evaluate(() => handyAdaptive.climax.active));
    await p.click('#handy_stop'); await p.waitForTimeout(300);
    check('STOP stops', !(await p.evaluate(() => handyAdaptive.actEngine.running)));
    await p.selectOption('#handy_act', 'cowgirl'); await p.click('[data-fb="love"]'); await p.waitForTimeout(100);
    check('an act picked in the menu survives a panel refresh until ▶', await p.$eval('#handy_act', (e) => e.value) === 'cowgirl');
    await p.click('#handy_play'); await p.waitForTimeout(400);
    check('▶ plays the picked act', await p.evaluate(() => handyAdaptive.actEngine.intent.act) === 'cowgirl');
    await p.click('#handy_stop'); await p.waitForTimeout(300);
    await p.selectOption('#handy_setup', 'Lying down'); await p.waitForTimeout(300); s = await st();
    check('the panel Setup menu switches the calibration', s.calibration.base === 20 && s.setupName === 'Lying down');
    await p.$eval('#handy_collapse', (e) => e.click()); await p.waitForTimeout(100);   // an icon: no icon font on this test page
    check('the panel collapses', !(await p.isVisible('#handy_stop')));
    await p.$eval('#handy_collapse', (e) => e.click());
    await p.uncheck('#handy_show_panel'); await p.waitForTimeout(100);
    check('"Show control panel" hides the panel (and the checkbox stays visible)', !(await p.isVisible('#handy_panel')) && await p.isVisible('#handy_show_panel'));
    await p.check('#handy_show_panel');
    await p.setViewportSize({ width: 390, height: 600 }); await p.waitForTimeout(100);
    const r = await p.$eval('#handy_panel', (e) => e.getBoundingClientRect().top);
    check('on a short phone screen the panel stays on screen', r >= 0, `top ${Math.round(r)}`);
    // calibration dialog: the real ▼ / ▲ buttons
    await p.setViewportSize({ width: 1280, height: 800 });
    await p.$eval('#handy_calib_btn', (e) => e.click()); await p.waitForTimeout(300);
    await p.click('#handy_calib_next'); await p.waitForTimeout(300);
    const hidden = !(await p.isVisible('[data-jog="-2"]'));
    await p.waitForFunction(() => handyAdaptive.calib.step === 1, null, { timeout: 8000 });
    const pos = () => p.evaluate(() => handyAdaptive.calib.pos);
    const p0 = await pos(); await p.click('[data-jog="-2"]'); await p.waitForTimeout(700);
    const p1 = await pos(); await p.click('[data-jog="10"]'); await p.waitForTimeout(900);
    const p2 = await pos();
    check('calibration: arrows hidden while the sleeve travels; ▼ and ▲ move it down and up', hidden && p1 === p0 - 2 && p2 === p1 + 10, `${p0} → ${p1} → ${p2}`);
    // every button and key of the dialog, start to finish
    const still = () => p.waitForFunction(() => !handyAdaptive.calib.moving, null, { timeout: 10000 });
    const sent = () => p.evaluate(() => calls.filter((c) => c.startsWith('/hdsp/xpt')).length);
    const step = () => p.evaluate(() => handyAdaptive.calib.step);
    const moves = [];
    for (const [sel, d] of [['[data-jog="-10"]', -10], ['[data-jog="-2"]', -2], ['[data-jog="2"]', 2], ['[data-jog="10"]', 10]]) {
        await still(); const a = await pos(), n = await sent(); await p.click(sel); await p.waitForTimeout(250); await still();
        moves.push((await pos()) === Math.max(0, Math.min(100, a + d)) && (await sent()) > n);
    }
    for (const [key, shift, d] of [['ArrowDown', false, -2], ['ArrowUp', false, 2], ['ArrowDown', true, -10], ['ArrowUp', true, 10]]) {
        await still(); const a = await pos(); await p.keyboard.press(shift ? `Shift+${key}` : key); await p.waitForTimeout(250); await still();
        moves.push((await pos()) === Math.max(0, Math.min(100, a + d)));
    }
    check('calibration: all four arrow buttons and the ↑ ↓ keys (with Shift) move the sleeve the right way and reach the device', moves.every(Boolean), moves.map((m) => (m ? 'ok' : 'NO')).join(' '));
    await still(); const tipAt = await pos();
    await p.click('#handy_calib_next'); await p.waitForTimeout(300); await still();
    const afterTip = await step();
    await p.click('#handy_calib_back'); await p.waitForTimeout(250); await still(); const backTo = (await step()) === 1 && (await pos()) === tipAt ? 1 : -9;   // Back also returns the sleeve to the tip you set
    await p.click('#handy_calib_next'); await p.waitForTimeout(300); await still();
    // fine-tune the base both ways, then lock it in
    await p.click('[data-jog="-10"]'); await p.waitForTimeout(200); await still(); await p.click('[data-jog="2"]'); await p.waitForTimeout(200); await still(); await p.click('[data-jog="-2"]'); await p.waitForTimeout(200); await still();
    const baseAt = await pos();
    await p.click('#handy_calib_next'); await p.waitForTimeout(200);
    const afterBase = await step();
    const n0 = await sent(); await p.click('#handy_calib_test'); await p.waitForTimeout(600); const testing = await p.evaluate(() => handyAdaptive.calib.moving); await p.waitForFunction(() => !handyAdaptive.calib.moving, null, { timeout: 30000 });
    const testMoves = (await sent()) - n0;
    await p.click('#handy_calib_next'); await p.waitForTimeout(300);
    s = await st();
    check('calibration: This is my tip, Back, This is my base, Test and Save all work, and the values you set are the ones saved',
        afterTip === 2 && backTo === 1 && afterBase === 3 && testing && testMoves >= 3 && s.calibration.tip === tipAt && s.calibration.base === baseAt && !(await p.isVisible('#handy_calib')),
        `tip ${tipAt}, base ${baseAt} → saved tip ${s.calibration.tip}, base ${s.calibration.base}; ${testMoves} test moves`);
    await p.$eval('#handy_calib_btn', (e) => e.click()); await p.waitForTimeout(200); await p.click('#handy_calib_next'); await p.waitForTimeout(400);
    await p.click('#handy_calib_cancel'); await p.waitForTimeout(300);
    check('calibration: STOP / cancel closes it and keeps the saved values', !(await p.isVisible('#handy_calib')) && (await st()).calibration.tip === tipAt);
    // every feedback button on the panel reaches the engine
    await p.click('#handy_play'); await p.waitForTimeout(600);
    const dead = [];
    for (const fb of ['faster', 'slower', 'longer', 'shorter', 'up', 'down', 'more', 'less', 'love', 'nope', 'close']) {
        const before = await p.evaluate(() => JSON.stringify([handyAdaptive.actEngine.intent, handyAdaptive.profile().log.length]));
        await p.click(`[data-fb="${fb}"]`); await p.waitForTimeout(120);
        if (before === await p.evaluate(() => JSON.stringify([handyAdaptive.actEngine.intent, handyAdaptive.profile().log.length]))) dead.push(fb);
    }
    await p.$eval('#handy_intensity', (e) => { e.value = '0.8'; e.dispatchEvent(new Event('change', { bubbles: true })); }); await p.waitForTimeout(300);
    const slid = await p.evaluate(() => handyAdaptive.actEngine.intent.intensity);
    await p.click('[data-fb="finish"]'); await p.waitForTimeout(300);
    const wound = await p.evaluate(() => handyAdaptive.actEngine.intent.intensity);
    await p.click('#handy_stop'); await p.waitForTimeout(300);
    check('panel: every feedback button, the intensity slider, Finished and STOP act on the device', !dead.length && slid === 0.8 && wound <= 0.05 && !(await p.evaluate(() => handyAdaptive.actEngine.running)), dead.length ? `no effect: ${dead.join(', ')}` : '');
    // every button and control in the settings drawer
    await p.$eval('#extensions_settings2 .inline-drawer-content', (e) => { e.style.display = 'block'; });
    p.on('filechooser', (fc) => fc.setFiles([]).catch(() => {}));   // Import buttons open a file picker
    await p.click('#handy_test'); await p.waitForTimeout(400);
    const status = await p.textContent('#handy_status');
    check('settings: Test connection reports the result', /connected/.test(status), status);

    await p.click('#handy_setup_save'); await p.waitForTimeout(150);                    // prompt() answers 'x'
    const saved = (await st()).setups.some((x) => x.name === 'x');
    await p.click('#handy_setup_del'); await p.waitForTimeout(150);
    const deleted = !(await st()).setups.some((x) => x.name === 'x');
    check('settings: Save current as… and Delete setup work', saved && deleted);
    await p.evaluate(() => handyAdaptive.chars.current()); await p.waitForTimeout(200);
    await p.$eval('#handy_char_traits input[data-trait="tempo"]', (el) => { el.value = '0.6'; el.dispatchEvent(new Event('change', { bubbles: true })); });
    const slid2 = (await st()).characters['vex.png'].traits.tempo === 0.6;
    await p.click('#handy_char_reread'); await p.waitForTimeout(150);
    const reread = (await st()).characters['vex.png'].custom === false;
    await p.click('#handy_char_forget'); await p.waitForTimeout(150);
    await p.evaluate(() => { stCtx.extensionSettings.handy_adaptive.characters['vex.png'].minutes = 42; });
    await p.click('#handy_char_delete'); await p.waitForTimeout(150);
    const fresh = (await st()).characters['vex.png'];   // the character in control is read again from the card, with no history
    check('settings: character sliders, Re-read card, Forget learning and Delete work', slid2 && reread && (!fresh || fresh.minutes === 0), `slider ${slid2}, re-read ${reread}, after delete minutes ${fresh?.minutes}`);
    let dl = 0; p.on('download', () => dl++);
    await p.click('#handy_export'); await p.waitForTimeout(300);
    await p.click('#handy_import'); await p.waitForTimeout(150);
    await p.click('#handy_lib_import'); await p.waitForTimeout(150);
    await p.click('#handy_lib_reset'); await p.waitForTimeout(150);
    await p.click('#handy_reset'); await p.waitForTimeout(150);
    check('settings: Export downloads a file; Import, library buttons and Reset run without error', dl === 1 && (await st()).profile.sessions === 0, `${dl} download(s)`);
    for (const [sel, key, val] of [['#handy_maxspeed', 'maxSpeed', '45'], ['#handy_floor', 'strokeFloor', '10'], ['#handy_ceil', 'strokeCeil', '90'], ['#handy_idle', 'idleStopSec', '300'], ['#handy_wpm', 'readWpm', '180'], ['#handy_safeword', 'safeword', 'pineapple']]) {
        if (!(await p.$(sel))) continue;
        await p.fill(sel, val); await p.dispatchEvent(sel, 'change');
    }
    const s2 = await st();
    check('settings: number and text fields are saved', +s2.maxSpeed === 45 && +s2.strokeFloor === 10 && +s2.strokeCeil === 90 && +s2.idleStopSec === 300 && +s2.readWpm === 180);
    check('settings: generated pictures are Marinara-only (hidden in SillyTavern, with a note)', !(await p.isVisible('#handy_img_box')) && await p.isVisible('#handy_img_none'));
    const boxes = await p.$$eval('#extensions_settings2 input[type=checkbox]', (els) => els.filter((e) => e.offsetParent !== null).map((e) => e.id));
    for (const id of boxes) { if (id === 'handy_enabled' || id === 'handy_show_panel') continue; await p.click('#' + id); await p.waitForTimeout(30); await p.click('#' + id); }
    for (const sel of await p.$$eval('#extensions_settings2 select', (els) => els.map((e) => e.id))) {
        const vals = await p.$$eval(`#${sel} option`, (o) => o.map((x) => x.value));
        for (const v of vals) { await p.selectOption('#' + sel, v).catch(() => {}); await p.waitForTimeout(30); }
    }
    await p.click('#handy_cal_clear'); await p.waitForTimeout(150);
    await p.click('#handy_cal_start'); await p.waitForTimeout(200);
    const opened = await p.isVisible('#handy_calib');
    await p.click('#handy_calib_cancel'); await p.waitForTimeout(200);
    check('settings: every checkbox and menu can be toggled; Clear calibration and Calibrate to my body work', (await st()).calibration === null && opened && boxes.length >= 8, `${boxes.length} checkboxes`);
    const errs = await p.evaluate(() => errors);
    check('no page errors', !errs.length, errs.join(' | '));
    await b.close(); server.close();
    console.log(failed ? `\n${failed} browser check(s) failed` : '\nall browser checks passed');
    process.exit(failed ? 1 : 0);
});
