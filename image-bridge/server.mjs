// Local-only image search bridge. Node.js 20+; no npm dependencies.
// Searches PornPics pages, downloads a candidate, and serves the bytes locally.
import http from 'node:http';
import { lookup } from 'node:dns/promises';
import { URL } from 'node:url';
import net from 'node:net';

const HOST = '127.0.0.1';
const PORT = Number(process.env.HANDY_IMAGE_PORT || 38765);
const ALLOWED_ORIGINS = (process.env.HANDY_IMAGE_ORIGINS || 'http://localhost:3000,http://127.0.0.1:3000')
  .split(',').map(x => x.trim()).filter(Boolean);
const CACHE_MS = 15 * 60 * 1000;
const MAX_BYTES = 8 * 1024 * 1024;
const cache = new Map();
const blocked = /\b(?:teen|underage|minor|child|kid|schoolgirl|rape|incest|voyeur|hidden|leaked)\b/i;

function safeQuery(value) {
  const query = String(value || '').replace(/[^\p{L}\p{N}\s'-]/gu, ' ').replace(/\s+/g, ' ').trim().slice(0, 90);
  if (!query || blocked.test(query)) throw new Error('Search terms are empty or disallowed');
  return query;
}
function isPublicIp(ip) {
  if (net.isIP(ip) === 4) {
    const p = ip.split('.').map(Number);
    return !(p[0] === 0 || p[0] === 10 || p[0] === 127 || p[0] >= 224 ||
      (p[0] === 169 && p[1] === 254) || (p[0] === 172 && p[1] >= 16 && p[1] <= 31) ||
      (p[0] === 192 && p[1] === 168) || (p[0] === 100 && p[1] >= 64 && p[1] <= 127));
  }
  if (net.isIP(ip) === 6) return !(/^(::1|::|fc|fd|fe8|fe9|fea|feb)/i.test(ip));
  return false;
}
async function validateUrl(raw, siteOnly = false) {
  const url = new URL(raw);
  if (url.protocol !== 'https:' || url.username || url.password || url.port) throw new Error('Invalid remote URL');
  if (siteOnly && !['pornpics.com', 'www.pornpics.com'].includes(url.hostname)) throw new Error('Unexpected search host');
  const addresses = await lookup(url.hostname, { all: true, verbatim: true });
  if (!addresses.length || addresses.some(x => !isPublicIp(x.address))) throw new Error('Private network address blocked');
  return url;
}
async function fetchLimited(raw, { siteOnly = false, accept = 'text/html' } = {}) {
  let url = raw;
  for (let i = 0; i < 3; i++) {
    const parsed = await validateUrl(url, siteOnly);
    const response = await fetch(parsed, {
      redirect: 'manual',
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; HandyAdaptiveImageBridge/1.0)', Accept: accept },
      signal: AbortSignal.timeout(12000),
    });
    if ([301, 302, 303, 307, 308].includes(response.status)) {
      const next = response.headers.get('location');
      if (!next) throw new Error('Invalid redirect');
      url = new URL(next, parsed).href;
      await response.body?.cancel();
      continue;
    }
    if (!response.ok) throw new Error('Remote server HTTP ' + response.status);
    const declared = Number(response.headers.get('content-length') || 0);
    if (declared > MAX_BYTES) throw new Error('Image too large');
    const chunks = [];
    let size = 0;
    for await (const chunk of response.body) {
      size += chunk.length;
      if (size > MAX_BYTES) throw new Error('Response too large');
      chunks.push(chunk);
    }
    return { bytes: Buffer.concat(chunks), type: response.headers.get('content-type') || '', url: parsed.href };
  }
  throw new Error('Too many redirects');
}
function candidates(html, base) {
  const urls = [];
  const pattern = /<(?:img|source)\b[^>]*(?:data-src|data-original|data-lazy-src|src|srcset)\s*=\s*["']([^"']+)["'][^>]*>/gi;
  for (const match of html.matchAll(pattern)) {
    let value = match[1].split(',')[0].trim().split(/\s+/)[0];
    value = value.replace(/&amp;/g, '&');
    try {
      const u = new URL(value, base);
      if (u.protocol !== 'https:' || !/\.(?:jpg|jpeg|png|webp)(?:$|\?)/i.test(u.href)) continue;
      if (/logo|avatar|icon|sprite|pixel|banner|tracking/i.test(u.href)) continue;
      if (!urls.includes(u.href)) urls.push(u.href);
    } catch {}
  }
  return urls.slice(0, 40);
}
async function searchImage(query) {
  const key = query.toLowerCase();
  const saved = cache.get(key);
  if (saved && saved.expires > Date.now()) return saved;
  const searchUrl = 'https://www.pornpics.com/?q=' + encodeURIComponent(query);
  const page = await fetchLimited(searchUrl, { siteOnly: true });
  if (!/html/i.test(page.type)) throw new Error('Search did not return HTML');
  const images = candidates(page.bytes.toString('utf8'), page.url);
  if (!images.length) throw new Error('No image candidates found (site markup may have changed)');
  for (const candidate of images.slice(0, 15)) {
    try {
      const image = await fetchLimited(candidate, { accept: 'image/avif,image/webp,image/jpeg,image/png' });
      const type = image.type.split(';')[0].trim().toLowerCase();
      if (!['image/jpeg', 'image/png', 'image/webp'].includes(type) || image.bytes.length < 3000) continue;
      const result = { bytes: image.bytes, type, source: image.url, searchUrl, expires: Date.now() + CACHE_MS };
      cache.set(key, result);
      if (cache.size > 40) cache.delete(cache.keys().next().value);
      return result;
    } catch (error) { console.warn('[image bridge] candidate skipped:', error.message); }
  }
  throw new Error('No downloadable image found');
}
function cors(res, origin) {
  if (origin && ALLOWED_ORIGINS.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  }
}
const server = http.createServer(async (req, res) => {
  const origin = req.headers.origin;
  cors(res, origin);
  res.setHeader('Cache-Control', 'no-store');
  if (origin && !ALLOWED_ORIGINS.includes(origin)) { res.writeHead(403); return res.end('Origin not allowed'); }
  if (req.method === 'OPTIONS') { res.writeHead(204); return res.end(); }
  if (req.method !== 'GET') { res.writeHead(405); return res.end(); }
  const url = new URL(req.url, 'http://localhost');
  if (url.pathname === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ ok: true, service: 'handy-image-bridge' }));
  }
  if (url.pathname !== '/image') { res.writeHead(404); return res.end('Not found'); }
  try {
    const query = safeQuery(url.searchParams.get('q'));
    const image = await searchImage(query);
    res.writeHead(200, { 'Content-Type': image.type, 'X-Image-Source': image.source, 'X-Search-URL': image.searchUrl });
    res.end(image.bytes);
  } catch (e) {
    console.error('[image bridge]', e.message);
    res.writeHead(502, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: e.message }));
  }
});
server.listen(PORT, HOST, () => console.log('Handy image bridge: http://' + HOST + ':' + PORT));
