// Runs the extension in a real Chromium page (real jQuery, real DOM) with a stand-in SillyTavern and a
// simulated Handy, and clicks through the panel. Skips itself when Playwright or a local jQuery is missing.
const fs = require('fs'), path = require('path'), http = require('http');
let chromium; try { ({ chromium } = require('playwright')); } catch { console.log('skip browser smoke test: playwright not installed'); process.exit(0); }
const JQ = ['/usr/share/javascript/jquery/jquery.min.js', path.join(__dirname, 'vendor', 'jquery.min.js')].find((f) => fs.existsSync(f));
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
    const errs = await p.evaluate(() => errors);
    check('no page errors', !errs.length, errs.join(' | '));
    await b.close(); server.close();
    console.log(failed ? `\n${failed} browser check(s) failed` : '\nall browser checks passed');
    process.exit(failed ? 1 : 0);
});
