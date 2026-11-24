// Capture a live buick.com page: render it in headless Chromium while every request is
// fetched from Node (Akamai refuses headless Chromium's own requests), mirror each response
// to disk, and take reference screenshots.
//
//   NODE_USE_ENV_PROXY=1 [NO_VIDEO=1] node tools/capture.mjs <outDir> <path> [slug]
//   e.g. node tools/capture.mjs /tmp/cap / home
//
// Output: <outDir>/mirror/<original url path>   (other hosts under mirror/_ext/<host>/…)
//         <outDir>/<slug>.server.html, <slug>.dom.html, <slug>.requests.json, <slug>_<w>.png
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');

const [OUT, PAGE = '/', SLUG = 'home'] = process.argv.slice(2);
if (!OUT) { console.error('usage: capture.mjs <outDir> <path> [slug]'); process.exit(1); }
const MIRROR = path.join(OUT, 'mirror');
const ORIGIN = 'https://www.buick.com';
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36';

// analytics, ad pixels, bot sensors and vendor chat never reach the demo, so don't fetch them
export const BLOCK = /(adobedtm|demdex|omtrdc|adobedc|doubleclick|googletagmanager|google-analytics|googleadservices|googlesyndication|facebook|tiktok|bing\.com|pinterest|snapchat|sc-static|linkedin|licdn|decibelinsight|quantummetric|iperceptions|acxiom|agkn|adsrvr|rkdms|tvpixel|clarity\.ms|hotjar|salesforce|force\.com|msg\.ext\.gm\.com|my\.site\.com|sales-force-chat|criteo|yahoo|teads|innovid|flashtalking|cookielaw|onetrust|datadog|browser-intake|\/rum\/|\/nuHqZcowFfPC6\/|\/akam\/|go-mpulse|medallia|kampyle|qualtrics|contentsquare|trustarc|truste)/i;

export function localPath(u) {
  let p = u.hostname === 'www.buick.com' ? u.pathname : `/_ext/${u.hostname}${u.pathname}`;
  try { p = decodeURIComponent(p); } catch {}
  if (p.endsWith('/')) p += 'index.html';
  return p;
}

const NO_VIDEO = !!process.env.NO_VIDEO; // poster frames only, for like-for-like screenshot comparison
const log = [];
const saved = new Map(); // local path -> bytes kept
async function serve(route) {
  const req = route.request();
  const url = req.url();
  if (url.startsWith('data:') || url.startsWith('blob:')) return route.continue();
  const u = new URL(url);
  const entry = { url, method: req.method(), type: req.resourceType() };
  log.push(entry);
  if (BLOCK.test(url) || (NO_VIDEO && /(players|edge\.api)\.brightcove|boltdns|video2\.marketing/.test(url))) { entry.blocked = true; return route.abort(); }
  if (req.method() !== 'GET') { entry.skipped = 'method'; return route.abort(); }
  try {
    const headers = { 'user-agent': UA, accept: req.headers().accept || '*/*', 'accept-language': 'en-US,en;q=0.9' };
    if (req.resourceType() !== 'document') headers.referer = ORIGIN + '/';
    const res = await fetch(url, { headers, redirect: 'follow', signal: AbortSignal.timeout(45000) });
    const body = Buffer.from(await res.arrayBuffer());
    entry.status = res.status; entry.ctype = res.headers.get('content-type') || ''; entry.bytes = body.length;
    if (res.url !== url) entry.final = res.url;
    if (res.status === 200 && body.length) {
      const lp = localPath(u);
      entry.local = lp;
      // one file per path: keep the largest rendition (?imwidth=…) seen
      if (!saved.has(lp) || saved.get(lp) < body.length) {
        const dst = path.join(MIRROR, lp);
        fs.mkdirSync(path.dirname(dst), { recursive: true });
        fs.writeFileSync(dst, body);
        saved.set(lp, body.length);
      }
    }
    const h = {};
    for (const [k, v] of res.headers) if (!/^(content-encoding|content-length|transfer-encoding|connection|set-cookie|content-security-policy|strict-transport-security)$/i.test(k)) h[k] = v;
    h['access-control-allow-origin'] = '*';
    return route.fulfill({ status: res.status, headers: h, body });
  } catch (e) {
    entry.error = String(e.cause?.message || e.message).slice(0, 120);
    return route.abort();
  }
}

async function settle(page, ms = 1500) { await page.waitForLoadState('networkidle', { timeout: 20000 }).catch(() => {}); await page.waitForTimeout(ms); }
async function scrollThrough(page) {
  const h = await page.evaluate(() => document.documentElement.scrollHeight);
  for (let y = 0; y < h; y += 400) { await page.evaluate((yy) => window.scrollTo(0, yy), y); await page.waitForTimeout(250); }
  await page.evaluate(() => window.scrollTo(0, 0));
  await settle(page, 1200);
}

const browser = await chromium.launch();
for (const [w, h, mobile] of [[1440, 900, false], [390, 844, true]]) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, userAgent: UA, deviceScaleFactor: 1, isMobile: mobile, hasTouch: mobile, locale: 'en-US' });
  await ctx.route('**/*', serve);
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', (e) => errs.push(e.message.slice(0, 200)));
  await page.goto(ORIGIN + PAGE, { waitUntil: 'domcontentloaded', timeout: 90000 });
  await settle(page, 3000);
  await scrollThrough(page);
  await page.screenshot({ path: path.join(OUT, `${SLUG}_${w}.png`), fullPage: true });
  await page.screenshot({ path: path.join(OUT, `${SLUG}_${w}_top.png`) });
  if (!mobile) fs.writeFileSync(path.join(OUT, `${SLUG}.dom.html`), await page.content());
  console.log(w, 'height', await page.evaluate(() => document.documentElement.scrollHeight), 'page errors', errs.length, errs.slice(0, 4));
  fs.writeFileSync(path.join(OUT, `${SLUG}_${w}.errors.json`), JSON.stringify(errs, null, 1));
  await ctx.close();
}
await browser.close();

// the untouched server HTML is what the demo page is built from
const res = await fetch(ORIGIN + PAGE, { headers: { 'user-agent': UA, accept: 'text/html', 'accept-language': 'en-US,en;q=0.9' } });
fs.writeFileSync(path.join(OUT, `${SLUG}.server.html`), await res.text());
fs.writeFileSync(path.join(OUT, `${SLUG}.requests.json`), JSON.stringify(log, null, 1));
const ok = log.filter((e) => e.local).length, blocked = log.filter((e) => e.blocked).length, bad = log.filter((e) => !e.blocked && !e.local);
console.log('requests', log.length, '| mirrored', ok, '| blocked', blocked, '| other', bad.length);
for (const e of bad.slice(0, 40)) console.log('  ', e.method, e.status || e.error || e.skipped, e.url.slice(0, 150));
