// Builds the Marinara Engine package from the SillyTavern extension, unmodified.
//
// Marinara runs a full page extension's JavaScript as the body of
// `async (marinara) => { ... }`, so it must be one plain script without
// import/export. The bundle is:
//   1. jQuery (private: never put on the page's globals)
//   2. Marinara's managed timers as setTimeout/setInterval/... (stopped when the extension is disabled)
//   3. marinara/st-compat.js: the slice of SillyTavern that index.js uses, backed by Marinara
//   4. synth.js and charstyle.js as scoped modules, then index.js
// CSS: style.css + marinara/compat.css.
//
//   node scripts/build-marinara.mjs
//   → dist/marinara/Handy Adaptive/{manifest.json, extension.js, extension.css}
//     dist/handy-adaptive-marinara.zip   (import this in Marinara: Settings → Addons → External Extensions)

import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const version = JSON.parse(read('manifest.json')).version;

// `import { a, b as c } from './x.js'` → `const { a, b: c } = __x;`
const rewriteImports = (src, file) => src.replace(/^import\s*\{([^}]*)\}\s*from\s*['"]\.\/([\w-]+)\.js['"];?/gm,
    (_, names, mod) => `const { ${names.split(',').map((n) => n.trim()).filter(Boolean).map((n) => n.replace(/^(\w+)\s+as\s+(\w+)$/, '$1: $2')).join(', ')} } = __${mod.replace(/-/g, '_')};`);

function asModule(file) {
    const exported = [];
    let src = read(file).replace(/^export\s+(async\s+function|function|const|let|class)\s+([A-Za-z_$][\w$]*)/gm, (_, kind, name) => {
        exported.push(name);
        return `${kind} ${name}`;
    });
    src = rewriteImports(src, file);
    if (/^\s*(import|export)\b/m.test(src)) throw new Error(`${file}: unsupported import/export form`);
    return `const __${path.basename(file, '.js').replace(/-/g, '_')} = (() => {\n${src}\nreturn { ${exported.join(', ')} };\n})();\n`;
}

const jquery = read('marinara/vendor/jquery-3.6.1.min.js');
const compat = read('marinara/st-compat.js');
let main = rewriteImports(read('index.js'), 'index.js');
if (/^\s*(import|export)\b/m.test(main) || /^\s*(import|export)\b/m.test(compat)) throw new Error('index.js / st-compat.js: unsupported import/export');

const bundle = [
    `// Handy Adaptive v${version} for Marinara Engine. Built from https://github.com/RyuNinja00/handy-adaptive`,
    `// (index.js, synth.js and charstyle.js unmodified + marinara/st-compat.js). Generated: do not edit.`,
    '',
    '// ---- Marinara-managed timers: disabling the extension clears them all',
    'const { setTimeout, clearTimeout, setInterval, clearInterval } = marinara;',
    '// ---- jQuery (MIT, OpenJS Foundation), kept private to this extension',
    `const jQuery = (function (module) {\n${jquery}\nreturn module.exports;\n})({ exports: {} });`,
    'const $ = jQuery;',
    '',
    '// ---- marinara/st-compat.js',
    compat,
    '',
    '// ---- synth.js, charstyle.js',
    asModule('synth.js'),
    asModule('charstyle.js'),
    '// ---- index.js (the SillyTavern extension)',
    `(() => {\n${main}\n})();`,
].join('\n');

// The bundle must parse as the body of an async function, exactly as Marinara runs it.
const AsyncFunction = Object.getPrototypeOf(async () => {}).constructor;
new AsyncFunction('marinara', bundle);

const css = `/* Handy Adaptive v${version} for Marinara Engine: style.css + marinara/compat.css */\n${read('style.css')}\n\n${read('marinara/compat.css')}`;
const manifest = {
    kind: 'marinara.personal-extension',
    version: 1,
    config: {
        name: 'Handy Adaptive',
        version,
        description: 'Lets the AI control The Handy with motion learned from your scripted videos, and learns your taste from live feedback. Needs Full page access to reach the Handy API and chat replies.',
        runtime: 'client',
        capabilities: ['full_page_access'],
        jsPath: 'extension.js',
        cssPath: 'extension.css',
    },
};

const outDir = path.join(root, 'dist', 'marinara', 'Handy Adaptive');
fs.rmSync(path.join(root, 'dist', 'marinara'), { recursive: true, force: true });
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
fs.writeFileSync(path.join(outDir, 'extension.js'), bundle);
fs.writeFileSync(path.join(outDir, 'extension.css'), css);
execFileSync('python3', [path.join(root, 'scripts', 'package-release.py')], { cwd: root });
console.log(`Built Marinara and SillyTavern archives for v${version}`);
