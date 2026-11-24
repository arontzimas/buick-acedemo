// Build the demo home page (/index.html) from the live buick.com home page.
//
//   NODE_USE_ENV_PROXY=1 node tools/build_home.mjs [cacheDir]
//
// What it does
//  - downloads the page's server HTML and everything it needs to render: the "sky" design-system
//    styles, scripts, fonts and icons (brands-api.ext.gm.com), nav / shop / form fragments,
//    the vehicle-carousel data, disclosure texts and every image
//  - stores them in this repo (buick.com files at their original paths, sky files under
//    /_ext/brands-api.ext.gm.com/, data under /_api/)
//  - writes index.html with analytics, bot sensors, sign-in and vendor chat removed and the
//    ACE chat bar injected
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CACHE = process.argv[2] || path.join(ROOT, '.cache-build');
const ORIGIN = 'https://www.buick.com';
const SKY = 'https://brands-api.ext.gm.com/sky/v1/prod/';
const SKY_LOCAL = '/_ext/brands-api.ext.gm.com/sky/v1/prod/';
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36';
const ACCEPT_IMG = 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8';

/* ---------------- fetching (disk-cached so re-runs are quick) ---------------- */
fs.mkdirSync(CACHE, { recursive: true });
const stats = { fetched: 0, cached: 0, failed: [] };
async function get(url, accept = '*/*') {
  const key = path.join(CACHE, crypto.createHash('sha1').update(accept + ' ' + url).digest('hex'));
  if (fs.existsSync(key)) { stats.cached++; return fs.readFileSync(key); }
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const res = await fetch(url, { headers: { 'user-agent': UA, accept, 'accept-language': 'en-US,en;q=0.9', referer: ORIGIN + '/' }, redirect: 'follow', signal: AbortSignal.timeout(60000) });
      if (res.status === 404 || res.status === 403) break;
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const buf = Buffer.from(await res.arrayBuffer());
      fs.writeFileSync(key, buf);
      stats.fetched++;
      return buf;
    } catch (e) {
      if (attempt === 3) console.warn('  ! failed', url, String(e.message).slice(0, 80));
      else await new Promise((r) => setTimeout(r, 800 * attempt));
    }
  }
  stats.failed.push(url);
  return null;
}
async function pool(items, n, fn) {
  const q = [...items];
  await Promise.all(Array.from({ length: n }, async () => { while (q.length) await fn(q.shift()); }));
}
function put(sitePath, data) {
  const dst = path.join(ROOT, sitePath);
  fs.mkdirSync(path.dirname(dst), { recursive: true });
  fs.writeFileSync(dst, data);
}

/* ---------------- what a text file references ---------------- */
const RX = {
  sky: /https:\/\/brands-api\.ext\.gm\.com\/sky\/v1\/prod\/[^"'\s<>?,)\\&;#]+/g,
  frag: /\/content\/experience-fragments\/[^"'\s<>?,)\\&;#]+?\.frag\.html/g,
  image: /\/content\/dam\/[^"'\s<>?,)\\&;#]+?\.(?:jpe?g|png|webp|gif|svg|ico)(?![A-Za-z0-9])/gi,
  legal: /\/content\/dam\/[^"'\s<>?,)\\&;#]+?\/jcr:content\/data\/master\.json/g,
};
const found = { sky: new Set(), frag: new Set(), image: new Set(), legal: new Set() };
function scan(text) {
  const fresh = { sky: [], frag: [] };
  for (const k of Object.keys(RX)) for (const m of text.match(RX[k]) || []) {
    if (k === 'frag' && isForm(m)) continue;
    if (!found[k].has(m)) { found[k].add(m); if (fresh[k]) fresh[k].push(m); }
  }
  return fresh;
}
// Lead forms (request a quote / test drive / updates) post real sales leads to GM, so the demo never
// loads them: their triggers hand off to the matching buick.com page instead (see ace-bar.js).
const FORM_PAGES = { 'request-a-quote': '/request-quote', 'request-test-drive': '/request-test-drive', 'contact-us/request-information': '/contact-us/request-information' };
const isForm = (p) => /\/form\/master\.frag\.html$/.test(p);
function handoffForms(t) {
  return t.replace(/<(button|a)\b[^<>]*\bdata-panel-type="form-panel"[^<>]*>/g, (tag) => {
    const id = (/data-panel-reveal-id="[^"]*\/index\/([^"]+?)\/form\/master\.frag\.html"/.exec(tag) || [])[1];
    if (!id || !FORM_PAGES[id]) return tag;
    let url = 'https://www.buick.com' + FORM_PAGES[id];
    const data = (/data-panel-data="([^"]*)"/.exec(tag) || [])[1];
    if (data) {
      try {
        const d = JSON.parse(data.replace(/&#34;|&quot;/g, '"'));
        if (d.vehicleSelectorModel) url += `?x-modelyear=${encodeURIComponent(d.vehicleSelectorYear || '')}&amp;x-bodystyle=${encodeURIComponent(d.vehicleSelectorModel)}&amp;x-carline=${encodeURIComponent(d.vehicleSelectorModel)}`;
      } catch {}
    }
    return tag.replace(/\s*data-panel-(?:type|reveal-id|data)="[^"]*"/g, '').replace(/>$/, ` data-ace-handoff="${url}">`);
  });
}
const legalLocal = (p) => '/_api/legal' + p.replace(/^\/content\/dam\/buick\/na\/us\/en/, '').replace('/jcr:content/data/master.json', '.json');

/* ---------------- 1. page + recursive crawl of text assets ---------------- */
console.log('fetching', ORIGIN + '/');
const pageBuf = await get(ORIGIN + '/', 'text/html');
if (!pageBuf) throw new Error('could not fetch the home page');
let page = pageBuf.toString('utf8');
const textAssets = new Map(); // site path -> text (rewritten at the end)

const MODELS_API = (/data-models-api-endpoint="([^"]+)"/.exec(page) || [])[1];
let queue = scan(page);
if (MODELS_API) {
  const buf = await get(ORIGIN + MODELS_API.replace(/&amp;/g, '&'), 'application/json');
  if (buf) { const t = buf.toString('utf8'); textAssets.set('/_api/vehicles/models.json', t); const f = scan(t); queue.sky.push(...f.sky); queue.frag.push(...f.frag); }
}
while (queue.sky.length || queue.frag.length) {
  const next = { sky: [], frag: [] };
  await pool(queue.frag, 4, async (p) => {
    const buf = await get(ORIGIN + p, 'text/html');
    if (!buf) return;
    const t = buf.toString('utf8');
    textAssets.set(p, t);
    const f = scan(t); next.sky.push(...f.sky); next.frag.push(...f.frag);
  });
  await pool(queue.sky, 6, async (u) => {
    const rel = SKY_LOCAL + u.slice(SKY.length);
    const buf = await get(u);
    if (!buf) return;
    if (/\.(css|js|svg)$/.test(u)) {
      const t = buf.toString('utf8');
      if (/\.css$/.test(u)) { const f = scan(t); next.sky.push(...f.sky); }
      textAssets.set(rel, t);
    } else put(rel, buf);
  });
  queue = next;
}

/* ---------------- 2. disclosures (stored without the ":" path segment) ---------------- */
const legalMap = new Map();
await pool([...found.legal], 6, async (p) => {
  const buf = await get(ORIGIN + p, 'application/json');
  if (!buf) return;
  const t = buf.toString('utf8');
  scan(t);
  legalMap.set(p, legalLocal(p));
  textAssets.set(legalLocal(p), t);
});

/* ---------------- 3. images: one full-size rendition per path (every ?imwidth= gets this file) ---------------- */
let imgBytes = 0, imgCount = 0;
await pool([...found.image], 6, async (p) => {
  // photos come as AVIF (what browsers get on buick.com); icons keep their original format
  const buf = await get(ORIGIN + p, /\/site-resources\//.test(p) ? '*/*' : ACCEPT_IMG);
  if (!buf) return;
  put(decodeURIComponent(p), buf); imgBytes += buf.length; imgCount++;
});

/* ---------------- 4. rewrite references and write text assets ---------------- */
function rewrite(t) {
  t = handoffForms(t);
  t = t.split(SKY).join(SKY_LOCAL);
  for (const [from, to] of legalMap) t = t.split(from).join(to);
  return t;
}
for (const [p, t] of textAssets) put(p, rewrite(t));

/* ---------------- 5. the page ---------------- */
const DROP_SRC = /(adobedtm|\/rum\/|sales-force-chat|salesforce|\/nuHqZcowFfPC6\/|\/akam\/|datadog|googletagmanager|onetrust|cookielaw)/i;
const DROP_INLINE = /(RUM_CONFIG|DD_RUM|_satellite\.pageBottom)/;
page = page.replace(/<script\b[^>]*\bsrc="([^"]+)"[^>]*>\s*<\/script>/gi, (m, src) => (DROP_SRC.test(src) ? '' : m));
page = page.replace(/<script\b((?:(?!\bsrc=)[^>])*)>([\s\S]*?)<\/script>/gi, (m, attrs, body) => (DROP_INLINE.test(body) || /gmx-geoip-country-confirmation-panel-data/.test(attrs) ? '' : m));
page = page.replace(/<link\b[^>]*rel="(?:dns-prefetch|preconnect)"[^>]*brands-api\.ext\.gm\.com[^>]*>\s*/gi, '');
page = page.replace(/data-gbpe-script="[^"]*"/g, 'data-gbpe-script="/ace/stubs/sign-in.js"');
page = page.replace(/(data-models-api-endpoint=")\/api\/vehicles\//g, '$1/_api/vehicles/');
page = page.replace(/https?:\/\/www\.buick\.com(\/content\/(?:dam|experience-fragments)\/)/g, '$1');
page = rewrite(page);

const HEAD = fs.readFileSync(path.join(ROOT, 'tools/head-inject.html'), 'utf8');
const BAR = '<form class="ace-bar" action="/chat" method="get" role="search" aria-label="Ask Buick"><div class="ace-bar__row">'
  + '<label class="ace-visually-hidden" for="ace-bar-input">Ask me anything</label>'
  + '<input id="ace-bar-input" class="ace-bar__input" type="text" name="q" placeholder="Ask me anything" autocomplete="off" enterkeyhint="send" maxlength="300">'
  + '<button class="ace-bar__send" type="submit" aria-label="Send" disabled><img src="/ace/icons/arrow-up.svg" alt="" width="16" height="16"></button>'
  + '</div></form>';
const must = (re, label) => { if (!re.test(page)) throw new Error('page structure changed: ' + label); };
must(/<head[^>]*>/i, '<head>'); must(/<body\b[^>]*>/i, '<body>'); must(/<\/body>/i, '</body>');
page = page.replace(/(<head[^>]*>)/i, (m) => m + '\n' + HEAD);
page = page.replace(/(<body\b[^>]*>)/i, (m) => m + BAR);
page = page.replace(/<\/body>/i, '<script src="/ace/ace-bar.js" defer></script>\n</body>');
put('/index.html', page);

console.log(`index.html ${pageBuf.length} -> ${Buffer.byteLength(page)} bytes`);
console.log(`sky files ${found.sky.size} | fragments ${found.frag.size} | disclosures ${legalMap.size}/${found.legal.size} | images ${imgCount}/${found.image.size} (${(imgBytes / 1e6).toFixed(1)} MB)`);
console.log(`network: ${stats.fetched} fetched, ${stats.cached} from cache, ${stats.failed.length} unavailable`);
for (const u of stats.failed) console.log('  -', u);
