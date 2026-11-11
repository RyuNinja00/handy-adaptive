// Static check of the extension's HTML: every element id must be unique. A checkbox once shared its id with
// the floating panel, so jQuery found the checkbox and none of the panel's buttons worked in a real browser.
import fs from 'node:fs';
const src = fs.readFileSync(new URL('../index.js', import.meta.url), 'utf8');
const ids = [...src.matchAll(/\bid="([a-z0-9_]+)"/gi)].map((m) => m[1]);
const dup = ids.filter((id, i) => ids.indexOf(id) !== i);
const used = [...new Set([...src.matchAll(/#(handy_[a-z0-9_]+)/g)].map((m) => m[1]))];
const missing = used.filter((id) => !ids.includes(id));
let failed = 0;
const check = (name, ok, detail = '') => { console.log(`${ok ? 'ok  ' : 'FAIL'} ${name}${detail ? `  (${detail})` : ''}`); if (!ok) failed++; };
check('every element id in the extension markup is unique', !dup.length, dup.join(', '));
check('every #id the code looks up exists in the markup', !missing.length, missing.join(', '));
process.exit(failed ? 1 : 0);
