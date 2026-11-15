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
            { name: REGEX_NAME, findRegex: '</?handy\\\\b[^>]*>' },
            { name: PICS_REGEX_NAME, findRegex: '<pics\\\\s*=\\\\s*(?:"[^"]*"|\\'[^\\']*\\')\\\\s*\\\\/?\\\\s*>' },
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
        scheduleImagePreview(m.id, m.content);
        const text = old && m.content.startsWith(old) ? m.content.slice(old.length) : m.content;   // Continue: only the new part
        const ch = scene.characters.find((c) => c.id === m.characterId);
        const idx = mirror({ name: ch?.name || scene.name2 || 'Character', is_user: false, is_system: false, mes: text,
            original_avatar: ch?.avatar, send_date: Date.now(), extra: {} });
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
        if (chatId !== scene.chatId) { imagePreviewSeen.clear(); lastImagePreviewAt = 0; document.querySelectorAll('[data-handy-image-poc]').forEach((el) => el.remove()); await loadScene(chatId); eventSource.emit(eventTypes.CHAT_CHANGED, chatId); }
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
    <div class="menu_button" id="handy-st-test-image" role="button" tabindex="0">🖼 Test inline image (POC)</div>
    <label class="handy-st-small"><input type="checkbox" id="handy-st-auto-images"> Show image previews for AI picture requests (including games)</label>
    <div id="handy-st-image-status" class="handy-st-small" aria-live="polite"></div>
  </div>
  <div id="extensions_settings2"></div>
</div>`).appendTo(document.body);
settingsWin.find('.handy-st-close').on('click', () => settingsWin.prop('hidden', true));
settingsWin.find('#handy-st-hide-tags').on('click', () => ensureHideRegex({ quiet: false }));

 // Image POC: browser-only preview. Does not mutate persisted messages or device state.
const TEST_IMAGE_URL = 'https://placehold.co/640x360/png?text=Handy+Adaptive+Image+Test';
const imagePreviewSeen = new Set();
let lastImagePreviewAt = 0;
const IMAGE_PREVIEW_COOLDOWN = 45000;
const pictureQuery = (content) => {
    // Models sometimes emit <pics="query"/> instead of <handy pics="query"/>.
    // Accept both while keeping the same query filtering for the preview.
    const source = String(content || '');
    const patterns = [
        /<handy\b([^>]*?)\/?>(?:\s*<\/handy>)?/gi,
        /<pics\s*=\s*(["'])(.*?)\1\s*\/?\s*>/gi,
    ];
    for (const pattern of patterns) {
        for (const match of source.matchAll(pattern)) {
            let raw = '';
            if (pattern === patterns[1]) raw = match[2];
            else raw = [...match[1].matchAll(/\bpics\s*=\s*(["'])(.*?)\1/gi)][0]?.[2] || '';
            const cleaned = raw.toLowerCase().replace(/[^\p{L}\p{N}\s-]/gu, ' ').replace(/\s+/g, ' ').trim().slice(0, 90);
            if (cleaned && !/\b(teen|underage|minor|child|kid|schoolgirl)\b/i.test(cleaned)) return cleaned;
        }
    }
    return null;
};

function testInlineImage(query = null) {
    const status = settingsWin.find('#handy-st-image-status');
    const candidates = [
        '[data-message-id]', '[data-testid="message"]', '[data-testid="chat-message"]',
        '.chat-message', '.message', '[role="article"]',
    ];
    let target = null;
    for (const selector of candidates) {
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
    img.src = TEST_IMAGE_URL;
    img.alt = 'Handy Adaptive test image';
    img.style.cssText = 'display:block;width:100%;max-width:640px;height:auto;border-radius:5px;';
    img.onload = () => { status.text('Image loaded in chat DOM. Refresh to confirm this preview is temporary.'); };
    img.onerror = () => { status.text('Image request failed: check browser network/CSP restrictions.'); };
    const caption = document.createElement('figcaption');
    caption.textContent = query ? `Picture request: ${query} (placeholder preview; not a matching image)` : 'Handy Adaptive image POC — temporary browser preview, not saved to chat';
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
    status.text('Preview inserted. Waiting for image to load…');
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
    setTimeout(() => { if (extensionSettings[MODULE].imagePreviewPoc) testInlineImage(query); }, 700);
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
    $('[data-handy-image-poc]').remove();
    $('#handy_panel, #handy_calib, #handy-st-settings, #handy-toasts').remove();
    if (ownToastr) delete window.toastr;
    delete window.handyAdaptive;
});
