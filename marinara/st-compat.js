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
        handyImages: imageHost, onCleanup: fn => marinara.onCleanup(fn),
    }),
};

// Characters and persona of a chat, shaped like SillyTavern's (avatar = a stable key for per-character styles)
async function loadScene(chatId, ticket) {
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
    if (ticket !== navigation) return;
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
const lore = { ok: null, error: '' };
let syncChain = Promise.resolve(), syncTimer = null;
const books = new Map();
let legacyChecked = false;
async function syncBook(chatId, text) {
    let book = books.get(chatId);
    if (book && book.last === text) return;
    if (!book) {
        const list = asList(await mapi('GET', '/lorebooks'));
        if (!legacyChecked) {
            const old = list.find(l => l.name === LORE_NAME && l.isGlobal);
            if (old) await mapi('PATCH', `/lorebooks/${enc(old.id)}`, { enabled: false, isGlobal: false });
            legacyChecked = true;
        }
        if (!chatId) return;
        const name = `${LORE_NAME} · ${chatId}`;
        const lb = list.find(l => l.name === name && l.chatId === chatId) || await mapi('POST', '/lorebooks', {
            name, chatId, isGlobal: false, scope: { mode: 'specific', chatIds: [chatId] }, enabled: true, tokenBudget: 8192,
        });
        const path = `/lorebooks/${enc(lb.id)}/entries`;
        const entry = asList(await mapi('GET', path)).find(e => e.name === LORE_ENTRY) || await mapi('POST', path, {
            name: LORE_ENTRY, constant: true, enabled: false, content: '', position: 2, depth: 1, role: 'system', order: 1,
            preventRecursion: true, excludeFromVectorization: true,
        });
        book = { path: path + '/' + enc(entry.id), last: entry.enabled ? entry.content : '' };
        books.set(chatId, book);
    }
    if (book.last !== text) {
        await mapi('PATCH', book.path, { content: text, enabled: !!text });
        book.last = text;
    }
}
function syncPrompt(chatId = scene.chatId, text = promptText) {
    syncChain = syncChain.then(async () => {
        try {
            try { await syncBook(chatId, text); }
            catch { books.delete(chatId); await syncBook(chatId, text); }
            lore.ok = true; lore.error = '';
        } catch (e) {
            books.delete(chatId); lore.ok = false; lore.error = e.message;
            compatToast(`Could not sync Handy instructions: ${e.message}`, 'warning');
        }
        refreshCompatStatus();
    });
    return syncChain;
}
function schedulePromptSync() { clearTimeout(syncTimer); syncTimer = setTimeout(() => syncPrompt(), 400); }

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
    if (!Array.isArray(list)) throw new Error('Unreadable chat history');
    return list;
}
// Viewing links are presentation metadata. Never replace an authored message to attach one.
const viewingRows = new Map();
function rememberLinks(chatId, row) {
    const data = parseMaybe(row.extra, {})?.handyViewing;
    if (Array.isArray(data?.links) && data.tags === tagSignature(row.content)) viewingRows.set(row.id, { chatId, links: data.links });
    else viewingRows.delete(row.id);
}
function tagSignature(content) { return (String(content || '').match(/<handy\b[^>]*>/gi) || []).join(''); }
function renderLinks() {
    for (const host of document.querySelectorAll('[data-message-id]')) {
        const entry = viewingRows.get(host.dataset.messageId);
        const links = entry?.chatId === scene.chatId ? entry.links : [];
        for (const line of host.querySelectorAll('[data-handy-viewing]')) {
            if (!links.some(l => l.url === line.dataset.handyViewing)) line.remove();
        }
        for (const link of links) {
            if (!/^https:\/\/(www\.pornhub\.com|xhamster\.com|www\.xvideos\.com|www\.pornpics\.com)\//.test(link.url)) continue;
            if ([...host.querySelectorAll('a')].some(a => a.href === link.url)) continue;
            const a = document.createElement('a');
            a.href = link.url; a.target = '_blank'; a.rel = 'noopener noreferrer';
            a.textContent = `${link.q} (${link.site} search)`;
            const line = document.createElement('div');
            line.dataset.handyViewing = link.url; line.append(a); host.append(line);
        }
    }
}
async function appendViewingLinks(chatId, message, links) {
    if (!links?.length) return;
    const data = { tags: tagSignature(message.content), links };
    const swipe = Number.isInteger(message.activeSwipeIndex) ? '?swipeIndex=' + message.activeSwipeIndex : '';
    await mapi('PATCH', `/chats/${enc(chatId)}/messages/${enc(message.id)}/extra${swipe}`, { handyViewing: data });
    if (chatId === scene.chatId) { viewingRows.set(message.id, { chatId, links }); renderLinks(); }
}
let navigation = 0, turn = 0, selected = null, loading = Promise.resolve();
function selectChat(chatId) {
    if (selected === chatId) return loading;
    const old = selected;
    selected = chatId; scene.chatId = null;
    const ticket = ++navigation;
    if (old) syncPrompt(old, '');
    eventSource.emit(eventTypes.CHAT_CHANGED, chatId);
    previews.clear(); viewingRows.clear(); imagePreviewSeen.clear(); lastImagePreviewAt = 0;
    document.querySelectorAll('[data-handy-image-poc], [data-handy-viewing]').forEach(el => el.remove());
    loading = chatId ? loadScene(chatId, ticket).then(() => {
        if (ticket !== navigation) return;
        window.handyAdaptive?.refreshPrompt();
        recent(chatId).then(rows => {
            if (ticket !== navigation) return;
            rows.forEach(row => rememberLinks(chatId, row));
            renderLinks();
        }).catch(() => {});
    }) : Promise.resolve();
    return loading;
}
const composerSelector = '[data-chat-composer][data-chat-id]';
let hadComposer = false, seenComposer = false;
function observeChat() {
    const composer = document.querySelector(composerSelector);
    if (composer || hadComposer) selectChat(composer?.dataset.chatId || null);
    hadComposer = !!composer;
    if (composer) seenComposer = true;
}
async function afterReply(res, chatId, before, current) {
    const saved = new Map();
    let completed = false;
    try {
        const reader = res.body.getReader(), decoder = new TextDecoder();
        let pending = '';
        for (;;) {
            const { done, value } = await reader.read();
            if (done) break;
            pending += decoder.decode(value, { stream: true });
            const lines = pending.split('\n'); pending = lines.pop();
            for (const line of lines) {
                if (!line.startsWith('data:')) continue;
                const event = JSON.parse(line.slice(5));
                if (event.type === 'done') completed = true;
                const row = event.data;
                if (event.type === 'message_saved' && row?.role === 'assistant' && (!row.chatId || row.chatId === chatId))
                    saved.set(row.id, row.content);
            }
        }
    } catch { return; }
    if (!completed || !saved.size || !current()) return;
    await new Promise((r) => setTimeout(r, 400));
    if (!current()) return;
    let msgs;
    try { msgs = await recent(chatId); } catch (e) { return console.warn('[Handy] could not read the reply', e); }
    for (const m of msgs) {
        if (!current()) return;
        if (!m || !saved.has(m.id) || m.role !== 'assistant' || typeof m.content !== 'string' || (saved.get(m.id) && saved.get(m.id) !== m.content)) continue;
        const old = handled.has(m.id) ? handled.get(m.id) : before.get(m.id);
        if (old === m.content) continue;
        handled.set(m.id, m.content);
        scheduleImagePreview(m.id, m.content);
        const text = old && m.content.startsWith(old) ? m.content.slice(old.length) : m.content;   // Continue: only the new part
        const ch = scene.characters.find((c) => c.id === m.characterId);
        const idx = mirror({ name: ch?.name || scene.name2 || 'Character', is_user: false, is_system: false, mes: text,
            original_avatar: ch?.avatar, send_date: Date.now(), extra: { marinara: { chatId, messageId: m.id, swipeIndex: m.activeSwipeIndex } } });
        eventSource.emit(eventTypes.MESSAGE_RECEIVED, idx);
        try { await appendViewingLinks(chatId, m, scene.chat[idx]?.extra?.marinara?.links); }
        catch (e) { compatToast(`Could not add the viewing link to this reply: ${e.message}`, 'warning'); }
    }
    while (handled.size > 500) handled.delete(handled.keys().next().value);
}
async function hookedFetch(input, init) {
    if (!isGenerateRequest(input, init)) {
        const url = new URL(typeof input === 'string' ? input : input?.url || String(input), location.href);
        const path = url.origin === location.origin && /^\/api\/chats\/([^/]+)\/messages(?:\/([^/]+))?$/.exec(url.pathname);
        const res = await nativeFetch.apply(window, arguments);
        if (path && res.ok) {
            const chatId = decodeURIComponent(path[1]);
            res.clone().json().then(result => {
                if (chatId !== selected) return;
                for (const row of Array.isArray(result) ? result : [result]) if (row?.id) rememberLinks(chatId, row);
                renderLinks();
            }).catch(() => {});
        }
        return res;
    }
    let body;
    try { body = JSON.parse(init.body); } catch { return nativeFetch.apply(window, arguments); }
    const chatId = typeof body.chatId === 'string' ? body.chatId : null;
    if (!chatId || body.impersonate || body.turnGameBots) return nativeFetch.apply(window, arguments);
    const composer = document.querySelector(composerSelector);
    if ((!composer && (seenComposer || body.autonomous)) || (composer && composer.dataset.chatId !== chatId)) return nativeFetch.apply(window, arguments);
    const generation = ++turn;
    const loadingScene = selectChat(chatId), ticket = navigation;
    let stopTicket = window.handyAdaptive?.stopGeneration();
    const current = () => ticket === navigation && generation === turn && scene.chatId === chatId && stopTicket === window.handyAdaptive?.stopGeneration();
    let before = null;
    try {
        await loadingScene;
        if (ticket !== navigation) return nativeFetch.apply(window, arguments);
        if (typeof body.userMessage === 'string' && body.userMessage.trim()) {
            const idx = mirror({ name: scene.name1, is_user: true, is_system: false, mes: body.userMessage, send_date: Date.now(), extra: {} });
            eventSource.emit(eventTypes.MESSAGE_SENT, idx);
            if (/^resume(?: motion)?[.!]?$/i.test(body.userMessage.trim())) stopTicket = window.handyAdaptive?.stopGeneration();
        }
        // the AI must see this turn's instructions (don't hold the reply up for long)
        await syncPrompt();
        before = new Map((await recent(chatId)).map((m) => [m.id, m.content]));
    } catch (e) { console.warn('[Handy]', e); }
    const res = await nativeFetch.call(window, input, init);
    if (res.ok && before && current()) {
        let copy = null;
        try { copy = res.clone(); } catch { /* not cloneable */ }
        if (copy) afterReply(copy, chatId, before, current);
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
    <div class="menu_button" id="handy-st-test-image" role="button" tabindex="0">🖼 Test inline image (POC)</div>
    <label class="handy-st-small"><input type="checkbox" id="handy-st-auto-images"> Show real images for AI picture requests (including games)</label>
    <div class="handy-st-small">Requires local image bridge: <code>node image-bridge/server.mjs</code> (port 38765).</div>
    <div id="handy-st-image-status" class="handy-st-small" aria-live="polite"></div>
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
// Editing models (SpicyAPI's ".../edit", image-to-image, …) only work FROM a picture: asked for a new picture
// with none, SpicyAPI answers "image_urls: is required". So new pictures go to a text-to-image connection, and
// pictures drawn from one he ❤ go to an editing connection when there is one.
const EDIT_MODEL = /(^|[\/_:.-])(edit|edits|multi-edit|image-to-image|img2img|i2i|inpaint(ing)?|kontext)([\/_:.-]|$)/i;
const isEditModel = (model) => EDIT_MODEL.test(String(model || ''));
const NEEDS_PICTURE = /image_urls?[^.]*required|requires? (an? )?(input |reference |source )?image|no (input|source) image/i;
async function imageConnections() {
    return asList(await mapi('GET', '/connections')).filter((c) => c && c.provider === 'image_generation')
        .map((c) => ({ id: c.id, name: c.name || c.model || 'Image connection', model: c.model || '', agentDefault: String(c.defaultForAgents) === 'true', edit: isEditModel(c.model) }));
}
const editHelp = (c) => `“${c.name}” uses an image-editing model (${c.model}), which can only change an existing picture. In Marinara add a second image connection with the same provider's text-to-image model (for SpicyAPI's MiniMax H3, its text-to-image model) and pick it as the Image connection; keep “${c.name}” for keeping a woman the same.`;
// → { conn, note }. withRefs: the picture is drawn from pictures he ❤.
async function resolveImageConnection(wantId, chatId, withRefs = false) {
    const list = await imageConnections();
    if (!list.length) throw new Error('no image connection in Marinara yet: add one under Connections (Image Generation)');
    let pick = wantId ? list.find((x) => x.id === wantId) : null;
    if (!pick && chatId) {   // the image model chosen in this chat's settings
        try {
            const chat = await mapi('GET', `/chats/${enc(chatId)}`);
            const meta = parseMaybe(chat.metadata, {}) || {};
            pick = list.find((x) => x.id === String(meta.imageGenConnectionId || '').trim()) || null;
        } catch { /* fall through */ }
    }
    pick ||= list.find((x) => x.agentDefault) || list[0];
    if (withRefs) {
        if (!pick.edit) { const e = list.find((x) => x.edit); if (e) return { conn: e, note: `drawn from her ❤ picture with ${e.name}` }; }
        return { conn: pick, note: '' };
    }
    if (!pick.edit) return { conn: pick, note: '' };
    const alt = list.find((x) => !x.edit && x.agentDefault) || list.find((x) => !x.edit);
    if (alt) return { conn: alt, note: `${pick.name} is an editing model, so ${alt.name} was used for a new picture` };
    throw new Error(editHelp(pick));
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
        const refs = [];
        for (const r of references.slice(0, 4)) { try { refs.push(await toDataUrl(r)); } catch (e) { console.warn('[Handy] reference skipped', e); } }
        const warning = references.length && !refs.length ? 'Her saved reference could not be read. This picture uses her written look.' : '';
        if (warning) prompt = String(prompt).replace(REF_LINE, '');
        const useEdit = refs.length > 0 && s.imageEditConnection && s.imageEditConnection !== VENICE_EDIT;
        const { conn, note } = await resolveImageConnection(useEdit ? s.imageEditConnection : s.imageConnection, chatId, refs.length > 0);
        const name = 'handy-picture';
        let out;
        try {
            out = await mapi('POST', '/characters/avatar-generation', {
                connectionId: conn.id, name, appearance: String(prompt).slice(0, 2000), purpose: 'avatar',
                width: Math.round(width), height: Math.round(height),
                ...(refs.length ? { referenceImages: refs } : {}),
                promptOverrides: [{ id: `avatar:${name}`, prompt: String(prompt), negativePrompt: String(negativePrompt || '') }],
            });
        } catch (e) {
            // an editing model that the name didn't give away
            if (!refs.length && NEEDS_PICTURE.test(String(e.message))) throw new Error(editHelp({ ...conn, model: conn.model || 'an editing model' }));
            throw e;
        }
        if (!out || typeof out.image !== 'string' || !out.image.startsWith('data:image/')) throw new Error('the image connection returned no picture');
        return { dataUrl: out.image, connection: conn.name, usedReferences: refs.length, warning, ...(note ? { note } : {}) };
    },
    // Save to the chat's Gallery and attach under the message. → { url, galleryId }
    async attach({ chatId, messageId, swipeIndex, dataUrl, prompt = '', title = '' }) {
        // Marinara permits data: in img-src, but its connect-src blocks fetch(dataUrl).
        const comma = dataUrl.indexOf(',');
        const match = /^data:(image\/[\w.+-]+);base64$/i.exec(dataUrl.slice(0, comma));
        if (comma < 0 || !match) throw new Error('Expected a base64-encoded image');
        const mime = match[1].toLowerCase();
        const bytes = Uint8Array.from(atob(dataUrl.slice(comma + 1)), (c) => c.charCodeAt(0));
        const blob = new Blob([bytes], { type: mime });
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
                if (!msg) throw new Error('The original message is no longer among the recent messages');
                if (Number.isInteger(swipeIndex) && msg.activeSwipeIndex !== swipeIndex) throw new Error('The active reply changed while drawing');
                const extra = parseMaybe(msg.extra, {}) || {};
                const attachments = [...(Array.isArray(extra.attachments) ? extra.attachments : []),
                    { type: 'image', url: saved.url, prompt: String(prompt).slice(0, 2000), galleryId: saved.id, name: title || 'picture', filename: title || 'picture' }];
                const swipe = Number.isInteger(swipeIndex) ? '?swipeIndex=' + swipeIndex : '';
                await mapi('PATCH', `/chats/${enc(chatId)}/messages/${enc(messageId)}/extra${swipe}`, { attachments });
                if (chatId === scene.chatId) previews.show(messageId, saved.url, title);
            } catch (e) { return { url: saved.url, galleryId: saved.id, warning: `Picture saved in the Gallery but could not be attached to the reply (${e.message}).` }; }
        }
        return { url: saved.url, galleryId: saved.id };
    },
};

// ---------------------------------------------------------------- real pictures from PornPics (opt-in, local bridge)
// <pics="query"/> or <handy pics="query"/> in a reply: the local image bridge (node image-bridge/server.mjs)
// finds a matching PornPics picture, shown under the message for this browser session only. This is separate
// from the pictures she draws: these are never saved, never sent to an image model and never used as a reference.
const TEST_IMAGE_URL = 'https://placehold.co/640x360/png?text=Handy+Adaptive+Image+Test';
const imagePreviewSeen = new Set();
let lastImagePreviewAt = 0;
const IMAGE_PREVIEW_COOLDOWN = 45000;
// same words the extension strips from picture/video search links: anything pointing at minors or non-consent
const PICS_BLOCK = /\b(teens?|teenage\w*|tee?ny|underage\w*|minors?|young\w*|youth|little|tiny|kids?|child\w*|school\w*|students?|high ?school|barely|legal|loli\w*|shota\w*|babysitter\w*|daughter\w*|son|sister|brother|niece|nephew|incest\w*|family|virgin\w*|1[0-8]|eighteen|nineteen|years? old|hidden|spy\w*|voyeur\w*|upskirt\w*|creep\w*|leak\w*|stolen|revenge|drunk\w*|passed out|sleep\w*|asleep|unconscious|forc\w*|rap(e|ed|ing)|non ?con\w*|abus\w*|real (coworker|colleague|boss|neighbou?r)s?)\b/g;
const pictureQuery = (content) => {
    // Models sometimes emit <pics="query"/> instead of <handy pics="query"/>. Accept both.
    const source = String(content || '');
    const patterns = [
        /<handy\b([^>]*?)\/?>(?:\s*<\/handy>)?/gi,
        /<pics\s*=\s*(["'])(.*?)\1\s*\/?\s*>/gi,
    ];
    for (const pattern of patterns) {
        for (const match of source.matchAll(pattern)) {
            const raw = pattern === patterns[1] ? match[2] : [...match[1].matchAll(/\bpics\s*=\s*(["'])(.*?)\1/gi)][0]?.[2] || '';
            const cleaned = raw.toLowerCase().replace(/[^\p{L}\p{N}\s-]/gu, ' ').replace(PICS_BLOCK, ' ').replace(/\s+/g, ' ').trim().slice(0, 90);
            if (cleaned) return cleaned;
        }
    }
    return null;
};

async function testInlineImage(query = null, messageId = null) {
    const status = settingsWin.find('#handy-st-image-status');
    const candidates = [
        '[data-message-id]', '[data-testid="message"]', '[data-testid="chat-message"]',
        '.chat-message', '.message', '[role="article"]',
    ];
    let target = messageId ? document.querySelector(`[data-message-id="${CSS.escape(messageId)}"]`) : null;
    for (const selector of messageId ? [] : candidates) {
        const matches = [...document.querySelectorAll(selector)].filter((el) =>
            !el.closest('#handy-st-settings, #handy_panel, #handy-toasts') &&
            el.getBoundingClientRect().width > 100 && el.getBoundingClientRect().height > 10);
        if (matches.length) { target = matches[matches.length - 1]; break; }
    }
    if (!target) {
        status.text('No recognizable chat message found. Open a conversation with at least one message, then retry.');
        compatToast('Image POC: no chat message container found', 'warning');
        return;
    }
    if (!query) document.querySelectorAll('[data-handy-image-poc]').forEach((el) => el.remove());
    const preview = document.createElement('figure');
    preview.dataset.handyImagePoc = 'true';
    preview.style.cssText = 'margin:12px 0;padding:10px;border:1px dashed #888;border-radius:8px;max-width:660px;';
    const img = document.createElement('img');
    if (!query) img.src = TEST_IMAGE_URL;
    img.alt = 'Handy Adaptive test image';
    img.style.cssText = 'display:block;width:100%;max-width:640px;height:auto;border-radius:5px;';
    img.onload = () => { status.text(query ? 'Matching image loaded from local bridge.' : 'Test placeholder loaded in chat.'); };
    img.onerror = () => { status.text('Image request failed: check browser network/CSP restrictions.'); };
    const caption = document.createElement('figcaption');
    caption.textContent = query ? `Picture search: ${query}` : 'Handy Adaptive image POC — temporary browser preview, not saved to chat';
    if (query) {
        const link = document.createElement('a');
        link.href = `https://www.pornpics.com/?q=${encodeURIComponent(query)}`;
        link.target = '_blank'; link.rel = 'noopener noreferrer';
        link.textContent = 'Open matching picture search';
        caption.append(' · ', link);
    }
    caption.style.cssText = 'font-size:12px;opacity:.8;margin-top:6px;';
    preview.append(img, caption);
    target.append(preview);
    status.text(query ? 'Searching for matching image through local bridge…' : 'Preview inserted. Waiting for image to load…');
    if (query) {
        try {
            const response = await nativeFetch('http://127.0.0.1:38765/image?q=' + encodeURIComponent(query), { signal: AbortSignal.timeout(25000) });
            if (!response.ok) throw new Error((await response.text()).slice(0, 200));
            const blob = await response.blob();
            if (!blob.type.startsWith('image/')) throw new Error('Bridge returned non-image data');
            const objectUrl = URL.createObjectURL(blob);
            img.onload = () => { URL.revokeObjectURL(objectUrl); status.text('Matching image loaded from PornPics search.'); };
            img.onerror = () => { URL.revokeObjectURL(objectUrl); status.text('Downloaded image could not be displayed.'); };
            img.src = objectUrl;
            const source = response.headers.get('X-Image-Source');
            if (source) {
                const link = document.createElement('a');
                link.href = source; link.target = '_blank'; link.rel = 'noopener noreferrer';
                link.textContent = 'Image source'; caption.append(' · ', link);
            }
        } catch (error) {
            img.remove();
            status.text('Local image bridge unavailable or search failed: ' + error.message);
            caption.prepend('Could not retrieve image. ');
        }
    }
}
settingsWin.find('#handy-st-test-image').on('click', () => testInlineImage());
settingsWin.find('#handy-st-auto-images').prop('checked', !!extensionSettings[MODULE].imagePreviewPoc).on('change', function () {
    extensionSettings[MODULE].imagePreviewPoc = this.checked;
    saveSettingsDebounced();
});
function scheduleImagePreview(messageId, content) {
    if (!extensionSettings[MODULE].imagePreviewPoc) return;
    const query = pictureQuery(content);
    if (!query || imagePreviewSeen.has(messageId) || Date.now() - lastImagePreviewAt < IMAGE_PREVIEW_COOLDOWN) return;
    imagePreviewSeen.add(messageId);
    lastImagePreviewAt = Date.now();
    const ticket = navigation;
    setTimeout(() => { if (ticket === navigation && extensionSettings[MODULE].imagePreviewPoc) void testInlineImage(query, messageId); }, 700);
}


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
    if (h && e.key === 'Escape' && s.enabled !== false && s.escStops !== false) h.userPause('Esc');
};
window.addEventListener('keydown', onKeyCapture, true);

let renderTimer = null;
const observer = new MutationObserver(() => {
    observeChat();
    if (!renderTimer && viewingRows.size) renderTimer = setTimeout(() => { renderTimer = null; renderLinks(); }, 50);
});
observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['data-chat-id','data-message-id'] });
observeChat();
syncPrompt();
ensureHideRegex();
marinara.log.info('Handy Adaptive loaded (SillyTavern compatibility layer)');

marinara.onCleanup(async () => {
    if (window.fetch === hookedFetch) window.fetch = nativeFetch;
    window.removeEventListener('keydown', onKeyCapture, true);
    navigation++; observer.disconnect(); clearTimeout(syncTimer); clearTimeout(renderTimer);
    try { await window.handyAdaptive?.stop?.('extension disabled'); } catch { /* best effort */ }
    clearTimeout(saveTimer); await persist();
    clearTimeout(syncTimer);
    if (selected) await syncPrompt(selected, '');
    previews.clear(); clearInterval(previews.timer);
    $('[data-handy-image-poc], [data-handy-viewing]').remove();
    $('#handy_panel, #handy_calib, #handy-st-settings, #handy-toasts').remove();
    if (ownToastr) delete window.toastr;
    delete window.handyAdaptive;
});
