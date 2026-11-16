// Handy Adaptive — Marinara Engine compatibility layer
//
// Marinara runs a full page extension as the body of `async (marinara) => { ... }`.
// scripts/build-marinara.mjs puts this file first in that body, then the
// unmodified SillyTavern extension (index.js with synth.js and charstyle.js).
// This file gives index.js the small slice of SillyTavern it uses, backed by
// Marinara:
//
//   SillyTavern.getContext()     settings, chat mirror, characters, user name
//   setExtensionPrompt()         → a constant lorebook entry at depth 1 (system),
//                                  rewritten before every reply
//   MESSAGE_SENT / RECEIVED      → watched from Marinara's own POST /api/generate
//   CHAT_CHANGED                 → when a reply is requested for a different chat
//   saveSettingsDebounced()      → Marinara's private extension storage
//   toastr, #extensions_settings2, the icon font → small stand-ins
//   handyImages (Marinara only)  → pictures drawn by Marinara's own image connections (or, for a
//                                  woman he ❤, by Venice's editing API directly), saved to the
//                                  chat's Gallery and attached under her message
//
// jQuery and the managed timers ($, jQuery, setTimeout, setInterval, ...) are
// declared by the build just above this file, so nothing leaks onto the page
// and disabling the extension really stops every timer.

const MODULE = 'handy_adaptive';
const LORE_NAME = 'Handy Adaptive (managed)';
const LORE_ENTRY = 'Device control instructions';
const REGEX_NAME = 'Handy Adaptive: hide device tags';
const PICS_REGEX_NAME = 'Handy Adaptive: hide picture request tags';
const LIB_KEY = 'handy-adaptive-library';
const nativeFetch = window.fetch;

// ---------------------------------------------------------------- settings in Marinara extension storage
const stored = (await marinara.storage.get()) || {};
const extensionSettings = { [MODULE]: stored.settings && typeof stored.settings === 'object' ? stored.settings : {} };
{
    const s = extensionSettings[MODULE];
    if (s.library === '__localStorage__') {
        try { s.library = JSON.parse(localStorage.getItem(LIB_KEY)); } catch { s.library = null; }
    }
    // SillyTavern-only features: replies can't be started by an extension here, and there are no connection profiles
    s.autoReplyOnFeedback = false;
    s.styleProfile = '';
}
let saveTimer = null;
const saveSettingsDebounced = () => { clearTimeout(saveTimer); saveTimer = setTimeout(persist, 800); };
async function persist() {
    const copy = { ...extensionSettings[MODULE] };
    try {
        await marinara.storage.patch({ settings: copy });
    } catch (e) {
        // private storage is capped (~1 MB): a big motion library is kept in this browser instead
        if (!copy.library) return compatToast(`Could not save Handy settings: ${e.message}`, 'error');
        try {
            localStorage.setItem(LIB_KEY, JSON.stringify(copy.library));
            await marinara.storage.patch({ settings: { ...copy, library: '__localStorage__' } });
        } catch (e2) { compatToast(`Could not save Handy settings: ${e2.message}`, 'error'); }
    }
}

// ---------------------------------------------------------------- Marinara API
function adminHeaders() {
    try { const s = localStorage.getItem('marinara_admin_secret')?.trim(); return s ? { 'X-Admin-Secret': s } : {}; } catch { return {}; }
}
async function mapi(method, path, body) {
    const headers = { Accept: 'application/json', ...adminHeaders() };
    if (method !== 'GET') { headers['x-marinara-csrf'] = '1'; headers['Content-Type'] = 'application/json'; }
    const r = await nativeFetch.call(window, '/api' + path, { method, headers, body: body ? JSON.stringify(body) : undefined, cache: 'no-store' });
    if (!r.ok) {
        let msg = ''; try { msg = (await r.json()).error || ''; } catch { /* not json */ }
        throw new Error(`${method} ${path} → HTTP ${r.status}${msg ? `: ${msg}` : ''}`);
    }
    return r.status === 204 ? null : r.json();
}
const enc = encodeURIComponent;
const asList = (x) => (Array.isArray(x) ? x : x?.items || x?.data || []);
const parseMaybe = (v, fb) => { if (typeof v !== 'string') return v ?? fb; try { return JSON.parse(v); } catch { return fb; } };

// ---------------------------------------------------------------- SillyTavern context stand-in
const handlers = {};
const eventSource = {
    on(ev, fn) { (handlers[ev] ||= []).push(fn); },
    removeListener(ev, fn) { handlers[ev] = (handlers[ev] || []).filter((f) => f !== fn); },
    emit(ev, ...args) { for (const fn of handlers[ev] || []) { try { fn(...args); } catch (e) { console.warn('[Handy]', e); } } },
};
const eventTypes = { MESSAGE_RECEIVED: 'message_received', MESSAGE_SENT: 'message_sent', CHAT_CHANGED: 'chat_id_changed' };
const scene = { chatId: null, chat: [], characters: [], characterId: undefined, groupId: null, name1: 'User', name2: '' };
let promptText = '';

const SillyTavern = {
    getContext: () => ({
        extensionSettings, saveSettingsDebounced, eventSource, eventTypes, event_types: eventTypes,
        chat: scene.chat, chatId: scene.chatId, characters: scene.characters, characterId: scene.characterId,
        groupId: scene.groupId, name1: scene.name1, name2: scene.name2,
        setExtensionPrompt(key, value) { if (key === MODULE) { promptText = String(value || ''); schedulePromptSync(); } },
        executeSlashCommandsWithOptions: async () => { throw new Error('starting a reply from an extension is not available in Marinara'); },
        handyImages: imageHost,
    }),
};

// Characters and persona of a chat, shaped like SillyTavern's (avatar = a stable key for per-character styles)
async function loadScene(chatId) {
    const chat = await mapi('GET', `/chats/${enc(chatId)}`).catch(() => ({}));
    const ids = (parseMaybe(chat.characterIds, []) || []).filter((x) => typeof x === 'string');
    const list = [];
    for (const id of ids) {
        try {
            const c = await mapi('GET', `/characters/${enc(id)}`);
            let d = parseMaybe(c.data, {}) || {};
            if (d.data && typeof d.data === 'object') d = { ...d, ...d.data };
            list.push({ id, name: d.name || c.name || 'Character', avatar: `marinara:${id}`, description: d.description || '',
                personality: d.personality || '', scenario: d.scenario || '', tags: Array.isArray(d.tags) ? d.tags : [], data: d });
        } catch { /* a missing card just means keyword-free defaults */ }
    }
    let name1 = 'User';
    if (chat.personaId) { try { name1 = (await mapi('GET', `/characters/personas/${enc(chat.personaId)}`))?.name || name1; } catch { /* default */ } }
    scene.chatId = chatId;
    scene.characters.splice(0, scene.characters.length, ...list);
    scene.characterId = list.length === 1 ? 0 : undefined;
    scene.groupId = list.length > 1 ? chatId : null;
    scene.name1 = name1; scene.name2 = list[0]?.name || '';
    scene.chat.length = 0;
}
function mirror(msg) {
    if (scene.chat.length > 200) scene.chat.splice(0, scene.chat.length - 100);
    scene.chat.push(msg);
    return scene.chat.length - 1;
}

// ---------------------------------------------------------------- AI instructions → managed lorebook entry
const lore = { id: null, entryId: null, last: null, ok: null, error: '' };
let syncChain = Promise.resolve(), syncTimer = null;
async function ensureLorebook() {
    if (lore.id && lore.entryId) return;
    let lb = asList(await mapi('GET', '/lorebooks')).find((l) => l.name === LORE_NAME);
    if (!lb) {
        lb = await mapi('POST', '/lorebooks', {
            name: LORE_NAME,
            description: 'Created and kept up to date by the Handy Adaptive extension: it tells the AI how to control your Handy. It is emptied automatically when the extension is off.',
            isGlobal: true, enabled: true, tokenBudget: 8192, scanDepth: 1,
        });
    } else if (!lb.isGlobal || !lb.enabled) {
        await mapi('PATCH', `/lorebooks/${enc(lb.id)}`, { isGlobal: true, enabled: true });
    }
    let entry = asList(await mapi('GET', `/lorebooks/${enc(lb.id)}/entries`)).find((e) => e.name === LORE_ENTRY);
    if (!entry) {
        entry = await mapi('POST', `/lorebooks/${enc(lb.id)}/entries`, {
            name: LORE_ENTRY, content: '', constant: true, enabled: false, position: 2, depth: 1, role: 'system', order: 1,
            preventRecursion: true, excludeFromVectorization: true,
        });
    }
    lore.id = lb.id; lore.entryId = entry.id; lore.last = entry.enabled ? entry.content : '';
}
function syncPrompt({ force = false } = {}) {
    syncChain = syncChain.then(async () => {
        const text = promptText;
        const write = async () => {
            await ensureLorebook();
            if (force || text !== lore.last) {
                await mapi('PATCH', `/lorebooks/${enc(lore.id)}/entries/${enc(lore.entryId)}`,
                    { content: text, enabled: !!text, constant: true, position: 2, depth: 1, role: 'system' });
                lore.last = text;
            }
        };
        try {
            try { await write(); } catch {
                lore.id = lore.entryId = lore.last = null;   // deleted or edited elsewhere: find or recreate it, once
                await write();
            }
            if (lore.ok === false) compatToast('Handy: AI link restored', 'success');
            lore.ok = true; lore.error = '';
        } catch (e) {
            lore.id = lore.entryId = lore.last = null;
            if (lore.ok !== false) compatToast(`Handy couldn't update the AI instructions: ${e.message}`, 'error');
            lore.ok = false; lore.error = e.message;
        }
        refreshCompatStatus();
    });
    return syncChain;
}
function schedulePromptSync() { clearTimeout(syncTimer); syncTimer = setTimeout(syncPrompt, 400); }

async function ensureHideRegex({ quiet = true } = {}) {
    try {
        const existing = asList(await mapi('GET', '/regex-scripts'));
        const rules = [
            { name: REGEX_NAME, findRegex: "</?handy\\b[^>]*>" },
            { name: PICS_REGEX_NAME, findRegex: "<pics\\s*=\\s*(?:\"[^\"]*\"|'[^']*')\\s*\\/?\\s*>" },
        ];
        for (const rule of rules) {
            if (existing.some((r) => r.name === rule.name)) continue;
            await mapi('POST', '/regex-scripts', {
                ...rule, enabled: true, replaceString: '',
                placement: ['ai_output'], flags: 'gi', applyMode: 'display',
            });
        }
        if (!quiet) compatToast('Device and picture request tags are hidden in chat', 'success');
        return true;
    } catch (e) {
        if (!quiet) compatToast(`Couldn't add the hide-tags rules: ${e.message}`, 'error');
        return false;
    }
}

// ---------------------------------------------------------------- watch Marinara's reply requests
const handled = new Map();   // message id -> content already given to the extension
function isGenerateRequest(input, init) {
    try {
        const url = new URL(typeof input === 'string' ? input : input?.url ?? String(input), location.href);
        return url.origin === location.origin && /\/api\/generate\/?$/.test(url.pathname)
            && String(init?.method || 'GET').toUpperCase() === 'POST' && typeof init?.body === 'string';
    } catch { return false; }
}
async function recent(chatId) {
    const list = await mapi('GET', `/chats/${enc(chatId)}/messages?limit=8`);
    return Array.isArray(list) ? list : [];
}
async function afterReply(res, chatId, before) {
    try {   // wait for the streamed reply to finish
        const reader = res?.body?.getReader();
        if (reader) for (;;) { const { done } = await reader.read(); if (done) break; }
    } catch { /* aborted or disconnected: the reply may still have been saved */ }
    await new Promise((r) => setTimeout(r, 400));
    if (chatId !== scene.chatId) return;
    let msgs;
    try { msgs = await recent(chatId); } catch (e) { return console.warn('[Handy] could not read the reply', e); }
    for (const m of msgs) {
        if (!m || m.role === 'user' || m.role === 'system' || typeof m.content !== 'string') continue;
        const old = handled.has(m.id) ? handled.get(m.id) : before.get(m.id);
        if (old === m.content) continue;
        handled.set(m.id, m.content);
        const text = old && m.content.startsWith(old) ? m.content.slice(old.length) : m.content;   // Continue: only the new part
        const ch = scene.characters.find((c) => c.id === m.characterId);
        const idx = mirror({ name: ch?.name || scene.name2 || 'Character', is_user: false, is_system: false, mes: text,
            original_avatar: ch?.avatar, send_date: Date.now(), extra: { marinara: { chatId, messageId: m.id } } });
        eventSource.emit(eventTypes.MESSAGE_RECEIVED, idx);
    }
    while (handled.size > 500) handled.delete(handled.keys().next().value);
}
async function hookedFetch(input, init) {
    if (!isGenerateRequest(input, init)) return nativeFetch.apply(window, arguments);
    let body;
    try { body = JSON.parse(init.body); } catch { return nativeFetch.apply(window, arguments); }
    const chatId = typeof body.chatId === 'string' ? body.chatId : null;
    if (!chatId || body.impersonate || body.turnGameBots) return nativeFetch.apply(window, arguments);
    let before = new Map();
    try {
        if (chatId !== scene.chatId) { previews.clear(); await loadScene(chatId); eventSource.emit(eventTypes.CHAT_CHANGED, chatId); }
        if (typeof body.userMessage === 'string' && body.userMessage.trim()) {
            const idx = mirror({ name: scene.name1, is_user: true, is_system: false, mes: body.userMessage, send_date: Date.now(), extra: {} });
            eventSource.emit(eventTypes.MESSAGE_SENT, idx);
        }
        // the AI must see this turn's instructions (don't hold the reply up for long)
        await Promise.race([syncPrompt({ force: true }), new Promise((r) => setTimeout(r, 3000))]);
        before = new Map((await recent(chatId)).map((m) => [m.id, m.content]));
    } catch (e) { console.warn('[Handy]', e); }
    const res = await nativeFetch.call(window, input, init);
    if (res.ok) {
        let copy = null;
        try { copy = res.clone(); } catch { /* not cloneable */ }
        afterReply(copy, chatId, before);
    }
    return res;
}
window.fetch = hookedFetch;

// ---------------------------------------------------------------- toasts, settings window, icons
let toastBox = null;
function compatToast(msg, type = 'info') {
    if (!toastBox) { toastBox = document.createElement('div'); toastBox.id = 'handy-toasts'; document.body.append(toastBox); }
    const t = document.createElement('div');
    t.className = `handy-toast ${type}`; t.textContent = String(msg);
    toastBox.append(t);
    window.setTimeout(() => t.remove(), type === 'error' ? 8000 : 4500);
}
const ownToastr = !window.toastr;
if (ownToastr) window.toastr = Object.fromEntries(['info', 'success', 'warning', 'error'].map((k) => [k, (m) => compatToast(m, k)]));

// index.js puts its settings into #extensions_settings2 (SillyTavern's Extensions drawer): host it in a window
const settingsWin = $(`
<div id="handy-st-settings" hidden>
  <div class="handy-st-head"><b>Handy Adaptive</b><span class="handy-st-close" title="Close">✕</span></div>
  <div class="handy-st-compat">
    <div id="handy-st-ai" class="handy-st-small"></div>
    <div class="menu_button" id="handy-st-hide-tags">Hide device tags in chat</div>
  </div>
  <div id="extensions_settings2"></div>
</div>`).appendTo(document.body);
settingsWin.find('.handy-st-close').on('click', () => settingsWin.prop('hidden', true));
settingsWin.find('#handy-st-hide-tags').on('click', () => ensureHideRegex({ quiet: false }));

// ---------------------------------------------------------------- generated pictures (Marinara's image connections)
// index.js asks for a picture; it is drawn by one of the image connections set up in Marinara (Connections →
// Image Generation), using Marinara's avatar-generation endpoint, the only one that takes a full prompt and
// reference images. The picture is saved to the chat's Gallery and attached under the AI message that asked
// for it, so it stays after a reload. Until Marinara next reloads the messages, a preview is shown in place.
const IMG_EXT = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp', 'image/gif': 'gif', 'image/avif': 'avif' };
async function imageConnections() {
    return asList(await mapi('GET', '/connections')).filter((c) => c && c.provider === 'image_generation')
        .map((c) => ({ id: c.id, name: c.name || c.model || 'Image connection', model: c.model || '', agentDefault: String(c.defaultForAgents) === 'true' }));
}
async function resolveImageConnection(wantId, chatId) {
    const list = await imageConnections();
    if (!list.length) throw new Error('no image connection in Marinara yet: add one under Connections (Image Generation)');
    if (wantId) { const c = list.find((x) => x.id === wantId); if (c) return c; }
    if (chatId) {   // the image model chosen in this chat's settings
        try {
            const chat = await mapi('GET', `/chats/${enc(chatId)}`);
            const meta = parseMaybe(chat.metadata, {}) || {};
            const c = list.find((x) => x.id === String(meta.imageGenConnectionId || '').trim());
            if (c) return c;
        } catch { /* fall through */ }
    }
    return list.find((x) => x.agentDefault) || list[0];
}
const blobToDataUrl = (blob) => new Promise((ok, bad) => { const fr = new FileReader(); fr.onload = () => ok(fr.result); fr.onerror = () => bad(fr.error); fr.readAsDataURL(blob); });
async function toDataUrl(src) {
    if (/^data:image\//.test(src)) return src;
    const r = await nativeFetch.call(window, src, { headers: adminHeaders(), cache: 'force-cache' });
    if (!r.ok) throw new Error(`could not read ${src} (HTTP ${r.status})`);
    return blobToDataUrl(await r.blob());
}

// Venice directly, for pictures drawn FROM a picture he ❤. Marinara's Venice image service sends no reference
// pictures, so this calls Venice's own /image/multi-edit with the key set in the extension's settings. The
// newest ❤ picture is the base image; the prompt says what changes. safe_mode is off (Venice blurs adult
// pictures otherwise). Only pictures this extension drew and he ❤ are ever sent: never a photo of a real person.
const VENICE_EDIT = 'venice';
const venice = {
    base: () => String(extensionSettings[MODULE].veniceBase || 'https://api.venice.ai/api/v1').trim().replace(/\/+$/, ''),
    key: () => String(extensionSettings[MODULE].veniceKey || '').trim(),
    model: () => String(extensionSettings[MODULE].veniceEditModel || '').trim() || 'qwen-edit-uncensored',
    aspect(w, h) {
        const r = w / h;
        return [['1:1', 1], ['2:3', 2 / 3], ['3:4', 3 / 4], ['9:16', 9 / 16], ['3:2', 3 / 2], ['4:3', 4 / 3], ['16:9', 16 / 9]]
            .reduce((a, b) => (Math.abs(b[1] - r) < Math.abs(a[1] - r) ? b : a))[0];
    },
    why(status, msg) {
        const m = msg ? `: ${msg}` : '';
        return ({
            400: `Venice rejected the request${m}`,
            401: 'Venice rejected the API key (check it in the settings)',
            402: 'your Venice balance is empty: add credit at venice.ai',
            403: 'Venice refused this key from here (is the key IP-restricted?)',
            422: `Venice's edit model refused this picture (its content policy)${m}`,
            429: 'Venice rate limit reached: try again in a moment',
            503: 'Venice\'s edit model is busy: try again in a moment',
        })[status] || `Venice answered HTTP ${status}${m}`;
    },
    // image: a data URL. → { dataUrl, connection, usedReferences }
    async edit({ prompt, image, width = 832, height = 1216 }) {
        const key = this.key();
        if (!key) throw new Error('no Venice API key in the settings (Pictures → Venice API key)');
        const body = { modelId: this.model(), prompt: String(prompt).slice(0, 4000), images: [String(image).replace(/^data:[^,]*,/, '')],
            aspect_ratio: this.aspect(width, height), safe_mode: false };
        let r;
        try {
            r = await nativeFetch.call(window, `${this.base()}/image/multi-edit`, { method: 'POST', cache: 'no-store',
                headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json', Accept: 'image/*, application/json' }, body: JSON.stringify(body) });
        } catch (e) { throw new Error(`couldn't reach Venice from this page (${e.message}): the network or the browser blocked it`); }
        if (!r.ok) {
            let m = ''; try { const j = await r.json(); m = [j.error, j.details && JSON.stringify(j.details)].filter(Boolean).join(' ').slice(0, 200); } catch { /* not json */ }
            throw new Error(this.why(r.status, m));
        }
        if (String(r.headers.get('x-venice-is-content-violation')) === 'true') throw new Error('Venice refused this edit (its content policy)');
        const blob = await r.blob();
        if (!/^image\//.test(blob.type)) throw new Error('Venice returned no picture');
        return { dataUrl: await blobToDataUrl(blob), connection: `Venice (${this.model()})`, usedReferences: 1 };
    },
    // A cheap check of the key, the model and that this page may call Venice: a drawn shape becomes a photo.
    async test() {
        const cv = Object.assign(document.createElement('canvas'), { width: 512, height: 512 });
        const g = cv.getContext('2d');
        g.fillStyle = '#f2efe8'; g.fillRect(0, 0, 512, 512);
        g.fillStyle = '#c0392b'; g.beginPath(); g.arc(256, 280, 130, 0, Math.PI * 2); g.fill();
        g.fillStyle = '#6b4226'; g.fillRect(250, 120, 12, 50);
        return this.edit({ prompt: 'Turn this simple drawing into a realistic photo of a red apple on a wooden table, soft daylight.', image: cv.toDataURL('image/png'), width: 512, height: 512 });
    },
};
const REF_LINE = /^Keep the woman from the reference pictures?[^.]*\.[^.]*as described\.\s*/;
// Live previews under a message, until Marinara renders the saved attachment itself.
const previews = {
    list: new Map(),   // url -> element
    show(messageId, url, title) {
        const el = document.querySelector(`[data-message-id="${CSS.escape(messageId)}"]`);
        if (!el || this.list.has(url)) return;
        const fig = document.createElement('figure');
        fig.className = 'handy-pic-preview'; fig.dataset.handyPic = url;
        const img = document.createElement('img'); img.src = url; img.alt = title || 'picture';
        img.addEventListener('click', () => window.open(url, '_blank', 'noopener'));
        fig.append(img);
        el.append(fig);
        this.list.set(url, fig);
        this.watch();
    },
    timer: null,
    watch() {
        if (this.timer) return;
        this.timer = setInterval(() => {
            for (const [url, fig] of this.list) {
                const host = fig.parentElement;
                const native = host && [...host.querySelectorAll('img')].some((i) => i !== fig.firstChild && (i.getAttribute('src') || '').includes(url.split('/').pop()));
                if (!host || !fig.isConnected || native) { fig.remove(); this.list.delete(url); }
            }
            if (!this.list.size) { clearInterval(this.timer); this.timer = null; }
        }, 1500);
    },
    clear() { for (const fig of this.list.values()) fig.remove(); this.list.clear(); },
};
const imageHost = {
    available: () => true,
    connections: imageConnections,
    toDataUrl,
    veniceTest: () => venice.test(),
    // → { dataUrl, connection, usedReferences, warning? }. references: picture URLs or data URLs of the same
    // woman (pictures he liked), oldest first.
    async generate({ prompt, negativePrompt = '', references = [], width = 832, height = 1216, chatId = scene.chatId }) {
        const s = extensionSettings[MODULE];
        if (references.length > 0 && s.imageEditConnection === VENICE_EDIT) {
            try {
                const image = await toDataUrl(references[references.length - 1]);
                const text = [prompt, negativePrompt ? `Do not show: ${negativePrompt}.` : ''].filter(Boolean).join(' ');   // multi-edit has no negative prompt
                return await venice.edit({ prompt: text, image, width, height });
            } catch (e) {
                // she still gets a picture: drawn by the usual connection, from her look alone
                console.warn('[Handy] Venice edit failed, drawing without the reference', e);
                const out = await this.generate({ prompt: String(prompt).replace(REF_LINE, ''), negativePrompt, references: [], width, height, chatId });
                return { ...out, warning: `Venice editing failed (${e.message}), so this one was drawn without her ❤ picture.` };
            }
        }
        const useEdit = references.length > 0 && s.imageEditConnection && s.imageEditConnection !== VENICE_EDIT;
        const conn = await resolveImageConnection(useEdit ? s.imageEditConnection : s.imageConnection, chatId);
        const refs = [];
        for (const r of references.slice(0, 4)) { try { refs.push(await toDataUrl(r)); } catch (e) { console.warn('[Handy] reference skipped', e); } }
        const name = 'handy-picture';
        const out = await mapi('POST', '/characters/avatar-generation', {
            connectionId: conn.id, name, appearance: String(prompt).slice(0, 2000), purpose: 'avatar',
            width: Math.round(width), height: Math.round(height),
            ...(refs.length ? { referenceImages: refs } : {}),
            promptOverrides: [{ id: `avatar:${name}`, prompt: String(prompt), negativePrompt: String(negativePrompt || '') }],
        });
        if (!out || typeof out.image !== 'string' || !out.image.startsWith('data:image/')) throw new Error('the image connection returned no picture');
        return { dataUrl: out.image, connection: conn.name, usedReferences: refs.length };
    },
    // Save to the chat's Gallery and attach under the message. → { url, galleryId }
    async attach({ chatId, messageId, dataUrl, prompt = '', title = '' }) {
        const mime = /^data:([^;,]+)/.exec(dataUrl)?.[1] || 'image/png';
        const blob = await (await nativeFetch.call(window, dataUrl)).blob();
        const fd = new FormData();
        fd.append('prompt', String(prompt).slice(0, 4000));
        fd.append('provider', 'image_generation'); fd.append('model', 'Handy Adaptive');
        fd.append('file', blob, `handy-picture.${IMG_EXT[mime] || 'png'}`);
        const r = await nativeFetch.call(window, `/api/gallery/${enc(chatId)}/upload`, { method: 'POST', body: fd, headers: { 'x-marinara-csrf': '1', ...adminHeaders() }, cache: 'no-store' });
        if (!r.ok) { let m = ''; try { m = (await r.json()).error || ''; } catch { /* not json */ } throw new Error(`saving to the Gallery failed (HTTP ${r.status}${m ? `: ${m}` : ''})`); }
        const saved = await r.json();
        if (messageId) {
            try {
                const msgs = await mapi('GET', `/chats/${enc(chatId)}/messages?limit=30`);
                const msg = (Array.isArray(msgs) ? msgs : []).find((x) => x.id === messageId);
                const extra = parseMaybe(msg?.extra, {}) || {};
                const attachments = [...(Array.isArray(extra.attachments) ? extra.attachments : []),
                    { type: 'image', url: saved.url, prompt: String(prompt).slice(0, 2000), galleryId: saved.id, name: title || 'picture', filename: title || 'picture' }];
                await mapi('PATCH', `/chats/${enc(chatId)}/messages/${enc(messageId)}/extra`, { attachments });
                previews.show(messageId, saved.url, title);
            } catch (e) { console.warn('[Handy] picture saved to the Gallery, but not attached to the message', e); }
        }
        return { url: saved.url, galleryId: saved.id };
    },
};

function refreshCompatStatus() {
    const s = extensionSettings[MODULE];
    $('#handy-st-ai').text(!s.enabled || s.injectProfile === false || !promptText ? 'AI instructions: off'
        : lore.ok === true ? `AI instructions: active (lorebook “${LORE_NAME}”)`
        : lore.ok === false ? `AI instructions: ⚠ ${lore.error}` : 'AI instructions: connecting…');
}
// once the extension has built its panel: a ⚙ that opens the settings window
jQuery(() => setTimeout(() => {
    if (!$('#handy_settings_btn').length) {
        $('<i id="handy_settings_btn" class="fa-solid fa-gear" title="Settings"></i>').insertBefore('#handy_collapse')
            .on('click', () => { settingsWin.prop('hidden', !settingsWin.prop('hidden')); refreshCompatStatus(); });
    }
    refreshCompatStatus();
}, 0));

// Esc. index.js listens on `document`, but Marinara's context menus and overlays catch keys on `window` in
// the capture phase and stop them. So Esc is caught first here: it stops the device even while a Marinara
// menu is open, and Marinara still gets the key afterwards. (index.js handles the calibration arrows the
// same way itself.)
const onKeyCapture = (e) => {
    const h = window.handyAdaptive, s = extensionSettings[MODULE];
    if (h && e.key === 'Escape' && s.escStops !== false && h.active?.()) h.stop('Esc');
};
window.addEventListener('keydown', onKeyCapture, true);

syncPrompt();
ensureHideRegex();
marinara.log.info('Handy Adaptive loaded (SillyTavern compatibility layer)');

marinara.onCleanup(async () => {
    if (window.fetch === hookedFetch) window.fetch = nativeFetch;
    window.removeEventListener('keydown', onKeyCapture, true);
    try { await window.handyAdaptive?.stop?.('extension disabled'); } catch { /* best effort */ }
    clearTimeout(saveTimer); await persist();
    try {   // leave the AI instructions empty so the model stops writing tags
        await ensureLorebook();
        await mapi('PATCH', `/lorebooks/${enc(lore.id)}/entries/${enc(lore.entryId)}`, { content: '', enabled: false });
    } catch { /* best effort */ }
    previews.clear(); clearInterval(previews.timer);
    $('#handy_panel, #handy_calib, #handy-st-settings, #handy-toasts').remove();
    if (ownToastr) delete window.toastr;
    delete window.handyAdaptive;
});
