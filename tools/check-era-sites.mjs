#!/usr/bin/env node
/**
 * CHECK ERA SITES — the four period websites (public/sites/) keep their promises. Part of `npm test`.
 *
 *     node tools/check-era-sites.mjs
 *
 * ⚑ WHY (S283). The sites are the piece's public face: they carry sources and links, and a wrong link on a sources
 * page is a lie. So this reads the OUTPUT (not the generator) and fails when:
 *   1. a page is missing, or stale against its data (tools/gen_era_sites.mjs --check — which also REFUSES any link
 *      that is not verbatim in the document its row names);
 *   2. an outside link on a page is not one of the verified rows (data/dossier/links.json, era_links.json), each
 *      re-verified verbatim here too;
 *   3. a page has a script, an external stylesheet/font/frame/import, or any src that leaves the project;
 *   4. a local href/src points at a file that is not there;
 *   5. an era page lacks one of its seven tabs, its h1, or its panels; the hub lacks its four doors;
 *   6. a picture, sound or film is not credited on the page, or its file is not claimed in assets/LICENSES.md or
 *      docs/reinterp/ATTRIBUTIONS.md (check-licences.mjs also fails any shipped file with no claim, and any NC);
 *   7. the docs these pages stand on (every verification doc + docs/reinterp/ERA_SITES_2026-11-01.md) carry STATUS.
 */
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { execFileSync } from 'node:child_process';

const ROOT = new URL('..', import.meta.url).pathname;
const text = (p) => readFileSync(join(ROOT, p), 'utf8');
const json = (p) => JSON.parse(text(p));
const errors = [];
const fail = (m) => errors.push(m);

// 1 — fresh against the data (this runs the generator's own refusal on links)
try {
  execFileSync('node', [join(ROOT, 'tools/gen_era_sites.mjs'), '--check'], { stdio: 'pipe' });
} catch (e) {
  fail(`gen_era_sites.mjs --check failed: ${(e.stderr?.toString() || e.message).trim().split('\n').slice(0, 4).join(' | ')}`);
}

// the verified set, re-verified here from the data
const verified = new Set();
for (const file of ['data/dossier/links.json', 'data/dossier/era_links.json']) {
  const groups = json(file).links;
  for (const [key, arr] of Object.entries(groups)) {
    for (const l of arr) {
      const doc = existsSync(join(ROOT, l.verifiedIn)) ? text(l.verifiedIn) : null;
      if (doc === null) fail(`${file} ${key}: verification doc ${l.verifiedIn} is missing`);
      else if (!doc.includes(l.url)) fail(`${file} ${key}: ${l.url} is not verbatim in ${l.verifiedIn}`);
      verified.add(l.url);
    }
  }
}

const PAGES = ['public/sites/index.html', ...['1997', '2003', '2016', '2026'].map((y) => `public/sites/${y}/index.html`)];
const TABS = ['story', 'practices', 'sources', 'images', 'media', 'words', 'missed'];
const licenceText = text('assets/LICENSES.md') + '\n' + text('docs/reinterp/ATTRIBUTIONS.md');
const decode = (s) => s.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>');

let nExt = 0, nMedia = 0;
for (const page of PAGES) {
  if (!existsSync(join(ROOT, page))) { fail(`${page} does not exist (run: node tools/gen_era_sites.mjs)`); continue; }
  const html = text(page);
  const isHub = page === 'public/sites/index.html';

  // 3 — nothing that runs, nothing that loads from elsewhere
  if (/<script\b/i.test(html)) fail(`${page}: has a <script>`);
  if (/<link\b/i.test(html)) fail(`${page}: has a <link> (no external stylesheet or font)`);
  if (/<(iframe|object|embed|form|input\s+[^>]*type="(text|email|password)")/i.test(html)) fail(`${page}: has a frame, embed or text input`);
  if (/@import|url\(\s*['"]?https?:/i.test(html)) fail(`${page}: CSS imports or loads from outside`);
  if (/\b(fetch|XMLHttpRequest|localStorage|sessionStorage|indexedDB|document\.cookie)\b/.test(html)) fail(`${page}: names a network or storage API`);
  if (/\son[a-z]+\s*=\s*["']/i.test(html)) fail(`${page}: has an inline event handler`);

  // 2 + 4 — every href/src
  for (const m of html.matchAll(/\b(href|src)="([^"]*)"/g)) {
    const [, attr, raw] = m;
    const url = decode(raw);
    if (/^https?:\/\//.test(url)) {
      if (attr === 'src') fail(`${page}: src leaves the project: ${url}`);
      else if (!verified.has(url)) fail(`${page}: outside link is not a verified row: ${url}`);
      else nExt++;
    } else if (url.startsWith('#') || url.startsWith('mailto:')) {
      if (url.length > 1 && url.startsWith('#') && !html.includes(`id="${url.slice(1)}"`)) fail(`${page}: anchor ${url} has no target`);
    } else {
      const file = resolve(dirname(join(ROOT, page)), url.split('#')[0].split('?')[0]);
      // a link to a folder page (sites/1997/) resolves to its index.html
      const target = url.split('#')[0].split('?')[0] === '' ? null : file;
      // the app's own door (`index.html`, one folder above public/ in the repo, the dist root once built) is allowed
      const isApp = target && target === join(ROOT, 'public/index.html') && existsSync(join(ROOT, 'index.html'));
      if (target && !isApp && !existsSync(target)) fail(`${page}: ${attr} ${url} does not exist`);
    }
  }
  // a link that opens a new tab must not hand over the opener
  for (const m of html.matchAll(/<a\b[^>]*target="_blank"[^>]*>/g)) if (!/rel="noopener noreferrer"/.test(m[0])) fail(`${page}: a _blank link without rel="noopener noreferrer"`);

  // 5 — the shape
  if (!/<html lang="en"/.test(html) || !/name="viewport"/.test(html)) fail(`${page}: needs lang and a viewport`);
  if (!/<h1\b/.test(html)) fail(`${page}: no h1`);
  if (isHub) {
    for (const y of ['1997', '2003', '2016', '2026']) if (!html.includes(`href="${y}/index.html"`)) fail(`${page}: the door to ${y} is missing`);
    if (!html.includes('href="../sources/index.html"')) fail(`${page}: the link to the old full sources list is missing`);
  } else {
    for (const t of TABS) {
      if (!html.includes(`id="t-${t}"`)) fail(`${page}: tab radio ${t} missing`);
      if (!html.includes(`id="p-${t}"`)) fail(`${page}: panel ${t} missing`);
      if (!html.includes(`for="t-${t}"`)) fail(`${page}: tab label ${t} missing`);
    }
    if ((html.match(/class="tabr" type="radio" name="tab"/g) || []).length !== TABS.length) fail(`${page}: expected ${TABS.length} tab radios`);
    if (!html.includes('class="tag s-')) fail(`${page}: no status word shown`);
    for (const w of ['documented', 'disputed', 'inferred']) if (!html.includes(w)) fail(`${page}: the public status word "${w}" is not on the page`);
    if (/class="tag s-[a-z]+">(documentary|contested|speculative)</.test(html)) fail(`${page}: an in-house status word reached the page (public words only)`);
  }

  // 6 — credits and claims
  const media = [...html.matchAll(/<(audio|video)\b[^>]*\ssrc="([^"]+)"/g)];
  const imgs = [...html.matchAll(/<img\b[^>]*\ssrc="([^"]+)"/g)];
  nMedia += media.length;
  const credits = (html.match(/class="credit"/g) || []).length;
  if (credits < media.length + imgs.length) fail(`${page}: ${media.length} media + ${imgs.length} images but only ${credits} credit lines`);
  for (const [, , src] of media) {
    const name = src.split('/').pop();
    if (!licenceText.includes(name) && !licenceText.includes(name.replace(/\.[a-z0-9]+$/, ''))) fail(`${page}: ${name} is in no licence ledger`);
  }
  if (/CC[- ]?BY[- ]?NC|non-?commercial licence/i.test(html)) fail(`${page}: mentions a non-commercial licence`);
}

// 7 — STATUS on the docs touched
const STATUS_LINE = /^STATUS:\s*(live|draft|history-only|UNREVIEWED|superseded-by\s+\S+)\s*$/;
const docs = new Set(['docs/reinterp/ERA_SITES_2026-11-01.md']);
for (const file of ['data/dossier/links.json', 'data/dossier/era_links.json']) for (const arr of Object.values(json(file).links)) for (const l of arr) docs.add(l.verifiedIn);
for (const d of docs) {
  if (!existsSync(join(ROOT, d))) { fail(`${d}: doc does not exist`); continue; }
  if (!text(d).split('\n').slice(0, 3).some((l) => STATUS_LINE.test(l.trim()))) fail(`${d}: no STATUS header in its first lines`);
}

if (errors.length) {
  console.error(`ERA SITES FAILED — ${errors.length} problem(s):`);
  for (const e of errors) console.error('  ' + e);
  process.exit(1);
}
console.log(`era sites OK: ${PAGES.length} pages fresh against their data; ${nExt} outside links, all verified; ${nMedia} media files credited and claimed; no scripts, no outside requests; ${docs.size} docs carry STATUS`);
