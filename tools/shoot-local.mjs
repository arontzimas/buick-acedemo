// Screenshot a page of the local demo the same way tools/capture.mjs shoots the live site,
// so the two can be compared side by side.
//   node tools/shoot-local.mjs <outDir> <path> [slug] [baseUrl]      (NO_VIDEO=1 for poster frames only)
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');

const [OUT, PAGE = '/', SLUG = 'home', BASE = 'http://localhost:4173'] = process.argv.slice(2);
const NO_VIDEO = !!process.env.NO_VIDEO;
fs.mkdirSync(OUT, { recursive: true });
const proxy = process.env.HTTPS_PROXY ? (() => { const u = new URL(process.env.HTTPS_PROXY); return { server: `${u.protocol}//${u.host}`, bypass: 'localhost,127.0.0.1', username: decodeURIComponent(u.username), password: decodeURIComponent(u.password) }; })() : undefined;
const browser = await chromium.launch({ proxy });
for (const [w, h, mobile] of [[1440, 900, false], [390, 844, true]]) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1, isMobile: mobile, hasTouch: mobile, locale: 'en-US', ignoreHTTPSErrors: true });
  const page = await ctx.newPage();
  const errs = [], missing = [], external = new Set();
  await ctx.route('**/*', (route) => {
    const url = route.request().url();
    if (url.startsWith(BASE) || url.startsWith('data:') || url.startsWith('blob:')) return route.continue();
    external.add(new URL(url).hostname);
    if (NO_VIDEO && /(players|edge\.api)\.brightcove|boltdns|video2\.marketing/.test(url)) return route.abort();
    return route.continue();
  });
  page.on('pageerror', (e) => errs.push(e.message.slice(0, 200)));
  page.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errs.push('console: ' + m.text().slice(0, 200)); });
  page.on('response', (r) => { if (r.status() >= 400 && r.url().startsWith(BASE)) missing.push(r.status() + ' ' + r.url().replace(BASE, '')); });
  await page.goto(BASE + PAGE, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForLoadState('networkidle', { timeout: 20000 }).catch(() => {});
  await page.waitForTimeout(3000);
  const height = await page.evaluate(() => document.documentElement.scrollHeight);
  for (let y = 0; y < height; y += 400) { await page.evaluate((yy) => window.scrollTo(0, yy), y); await page.waitForTimeout(250); }
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForLoadState('networkidle', { timeout: 20000 }).catch(() => {});
  await page.waitForTimeout(1200);
  await page.screenshot({ path: path.join(OUT, `${SLUG}_${w}.png`), fullPage: true });
  await page.screenshot({ path: path.join(OUT, `${SLUG}_${w}_top.png`) });
  console.log(w, 'height', await page.evaluate(() => document.documentElement.scrollHeight), '| errors', errs.length, errs.slice(0, 5), '| missing', missing.length, missing.slice(0, 12), '| external hosts', [...external].join(', '));
  await ctx.close();
}
await browser.close();
