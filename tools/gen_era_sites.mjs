#!/usr/bin/env node
/**
 * THE ERA WEBSITES — four period websites, one per year, generated from the piece's own data.
 *
 *     node tools/gen_era_sites.mjs            # → public/sites/index.html + public/sites/{1997,2003,2016,2026}/index.html
 *     node tools/gen_era_sites.mjs --check    # builds in memory and fails if the files on disk are stale
 *
 * ⚑ WHY (S283, 2026-11-01). The project lead: "all the 'about this' panels … in the menu with the rest of the
 * sources, and … at the close … make them into webpages of the time, and the multiple tabs can contain all the
 * information, this would be great for the website of the project later, where all the information about each
 * era has itself a website … it includes all the ideas, the texts, the information, the sources, images all of
 * it that we wanted to add but got lost." So the "About this" windows left the experience, and what they said
 * (plus everything that sat only in docs and menus) lives here: 1997 a GeoCities home page, 2003 a portal,
 * 2016 a flat platform, 2026 an app-like page of cards. Design: docs/reinterp/DESIGN_S280_GLOW_SITES_VERA_FADES_2026-11-01.md §2.
 *
 * ⚑ THE LAWS THIS FILE KEEPS (and tools/check-era-sites.mjs re-checks on the OUTPUT):
 *   - no script, no external font, no request, no storage: the pages are read, never measured;
 *   - colours come ONLY from the theme files (src/desktop/theme/*.ts) — read from them here, token by token,
 *     never typed; every token used is recorded and printed (see docs/reinterp/ERA_SITES_2026-11-01.md);
 *   - every outside link is a VERIFIED one: data/dossier/links.json and data/dossier/era_links.json, and this
 *     script REFUSES to write anything if a url is not verbatim in the document its row names (the same
 *     refusal as tools/gen_sources_page.mjs);
 *   - every picture, sound and film carries its credit on the page, and is one whose licence is the project's own;
 *   - tabs are CSS-only (radio inputs): the visitor chooses, nothing is stored.
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';

const ROOT = new URL('..', import.meta.url).pathname;
const CHECK = process.argv.includes('--check');
const read = (p) => JSON.parse(readFileSync(join(ROOT, p), 'utf8'));
const text = (p) => readFileSync(join(ROOT, p), 'utf8');

// ── the data (the same files the piece and the sources page read) ──────────────────────────────────────────
const net = read('data/strings/close_network.json');
const practices = read('data/dossier/practices.json').practices;
const words = read('data/strings/status_words.json');
const links = read('data/dossier/links.json').links;
const eraLinks = read('data/dossier/era_links.json').links;
const S = read('data/strings/era_sites.json');
const map = read('data/strings/map.json');
const lex = read('data/strings/lexicon.json');
const about = read('data/strings/about.json');
const updates = read('data/strings/updates.json');
const CARD_FILES = {
  origin_intake_e1: '1997 — the questionnaire and the programme',
  pillow: '1997 — the exercise',
  e3_theday: '2016 — the platform and the group',
  e4_ball: '2026 — the ball',
  e4_offers: '2026 — the offers'
};
const cards = Object.fromEntries(Object.keys(CARD_FILES).map((k) => [k, read(`data/provotypes/${k}.json`)]));
const YEARS = ['1997', '2003', '2016', '2026'];
const ERA_NO = { 1997: 1, 2003: 2, 2016: 3, 2026: 4 };
const MAP_ID = { 1997: 'e1', 2003: 'e2', 2016: 'e3', 2026: 'e4' };
const CARDS_OF = { 1997: ['origin_intake_e1', 'pillow'], 2003: [], 2016: ['e3_theday'], 2026: ['e4_offers', 'e4_ball'] };
const TABS = ['story', 'practices', 'sources', 'images', 'media', 'words', 'missed'];

// ── the refusal: every link verbatim in the document that verifies it ───────────────────────────────────────
const refused = [];
const docCache = new Map();
const docOf = (p) => { if (!docCache.has(p)) docCache.set(p, existsSync(join(ROOT, p)) ? text(p) : null); return docCache.get(p); };
const verifyRow = (where, l) => {
  const doc = docOf(l.verifiedIn);
  if (doc === null) refused.push(`${where}: ${l.url} — the verification doc ${l.verifiedIn} does not exist`);
  else if (!doc.includes(l.url)) refused.push(`${where}: ${l.url} is not in ${l.verifiedIn}`);
  if (!/^https?:\/\//.test(l.url)) refused.push(`${where}: ${l.url} is not an http(s) address`);
};
for (const [key, arr] of Object.entries(links)) for (const l of arr) verifyRow(key, l);
for (const [year, arr] of Object.entries(eraLinks)) for (const l of arr) verifyRow(`era_links ${year}`, l);
if (refused.length) { console.error('REFUSED — links not verified verbatim:\n  ' + refused.join('\n  ')); process.exit(1); }

// ── the colours: read from the theme files, token by token ──────────────────────────────────────────────────
const THEME_FILE = { ERA1: 'era1.ts', WEB97: 'web1997.ts', WEB2003: 'web1997.ts', ERA3: 'era3.ts', ERA4: 'era4.ts', PLACE: 'era4.ts', WALL: 'era4.ts' };
const themeCache = new Map();
const themeTokens = (obj) => {
  if (themeCache.has(obj)) return themeCache.get(obj);
  const file = THEME_FILE[obj];
  if (!file) throw new Error(`no theme file is known for ${obj}`);
  const src = text(`src/desktop/theme/${file}`);
  const start = src.indexOf(`export const ${obj} = {`);
  if (start < 0) throw new Error(`export const ${obj} not found in src/desktop/theme/${file}`);
  const block = src.slice(start, src.indexOf('} as const', start));
  const out = {};
  for (const m of block.matchAll(/(\w+):\s*'(#[0-9a-fA-F]{6})'/g)) out[m[1]] = m[2].toLowerCase();
  themeCache.set(obj, out);
  return out;
};
/** the tokens each page used, for the doc and for the CSS comments */
const used = new Map();
const makePalette = (year, spec) => {
  const c = {};
  const tokens = [];
  for (const [name, path] of Object.entries(spec)) {
    const [obj, tok] = path.split('.');
    const hex = themeTokens(obj)[tok];
    if (!hex) throw new Error(`${path} is not a token in src/desktop/theme/${THEME_FILE[obj]}`);
    c[name] = hex;
    tokens.push(`${name}=${path}`);
  }
  used.set(year, spec);
  return c;
};
const lum = (hex) => {
  const v = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map((s) => (s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4));
  return 0.2126 * v[0] + 0.7152 * v[1] + 0.0722 * v[2];
};
const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
/** every text/background pair a skin uses must read: 4.5:1, or the build refuses */
const mustRead = (year, c, pairs) => {
  const bad = pairs.filter(([f, b]) => ratio(c[f], c[b]) < 4.5).map(([f, b]) => `${f} (${c[f]}) on ${b} (${c[b]}) = ${ratio(c[f], c[b]).toFixed(2)}`);
  if (bad.length) { console.error(`REFUSED — ${year}: text that does not reach 4.5:1:\n  ${bad.join('\n  ')}`); process.exit(1); }
};

// ── small helpers ───────────────────────────────────────────────────────────────────────────────────────────
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
/** a dossier text as the public reads it: the in-house marker made plain, the flag dropped */
const pub = (t) => esc(String(t).split(words._verifyMarker).join(words.verifyPublic)).replace(/⚑ ?/g, '').replace(/\*([^*]+)\*/g, '<em>$1</em>');
const short = (s) => words.short[s] ?? s;
const long = (s) => words.long[s] ?? s;
const tag = (status) => `<span class="tag s-${esc(status)}">${esc(short(status))}</span>`;
const ext = (l) => `<a href="${esc(l.url)}" rel="noopener noreferrer" target="_blank">${esc(l.label)}</a>`;
const linkList = (key) => (links[key] ?? []).map((l) => `<li>${ext(l)}</li>`).join('');
const sourceBlock = (file, index) => {
  const s = cards[file]?.debrief?.sources?.[index];
  if (!s) return '';
  const ls = linkList(`${file}#${index}`);
  return `<div class="src">${tag(s.status)}${s.confidence ? ` <span class="conf">confidence: ${esc(s.confidence)}</span>` : ''}` +
    `<p>${pub(s.text)}</p>${ls ? `<ul class="links">${ls}</ul>` : `<p class="nolink">${esc(S.common.noLink)}</p>`}</div>`;
};
const panelOf = (year) => net.panels.find((p) => p.era === ERA_NO[year]);
const beatsOf = (year) => map.eras.find((e) => e.id === MAP_ID[year]).beats;
const practicesOf = (year) => (panelOf(year).practices ?? []).map((k) => ({ kind: k, ...practices[k] })).filter((p) => p.title);
const refsOf = (year) => net.labels.filter((l) => l.era === ERA_NO[year]);
const wordsOf = (year) => lex.terms.filter((t) => t.eras.includes(Number(year)));
const reasonsOf = (year) => Object.entries(lex.reasons).map(([g, rows]) => [g, rows.filter((r) => {
  const m = /^(\d{4})-(\d{4})$/.exec(r.era);
  return m && Number(m[1]) <= Number(year) && Number(year) <= Number(m[2]);
})]).filter(([, rows]) => rows.length);
/** period references with no group are "pages of the time" (Images tab); grouped ones (a campaign) sit on the Sources tab */
const plainLinksOf = (year) => (eraLinks[year] ?? []).filter((l) => !l.group);
const groupsOf = (year) => {
  const m = new Map();
  for (const l of eraLinks[year] ?? []) if (l.group) m.set(l.group, [...(m.get(l.group) ?? []), l]);
  return [...m];
};
const people = { 1997: 'Daniel', 2003: 'Daniel', 2016: 'Vera', 2026: 'Maya' };
const lyricsOf = (name) => read(`data/dialog/${name}.json`).lines.map((ln) => ln.words.map((w) => w[1]).join(' '));

/**
 * ⚑ S356 — "THE SCRIPT IS REAL" (UiB job 11 Part C.4; data/strings/era_sites.json `eras.2026.script`). The moves the
 * people tag in the stream, each with what the host says, the tag, the status word and its documented ground — the
 * deeper analysis his ruling put here, out of the stream. Only years that carry a `script` block show it.
 */
function scriptHtml(X) {
  if (!X) return '';
  return `<h3 id="h-script">${esc(X.heading)}</h3>
${X.lead.map((p) => `<p>${esc(p)}</p>`).join('\n')}
<h4>${esc(X.movesTitle)}</h4>
${X.moves.map((m) => `<article class="prac"><h4>${esc(m.move)} ${tag(m.status)}</h4>
<p class="did">The host: “${esc(m.says)}” · the stream: ${esc(m.tag)}</p>
<p>${esc(m.ground)}</p></article>`).join('\n')}
<p class="note">${esc(X.close)}</p>`;
}
function scriptModel(X) {
  if (!X) return [];
  return [
    { k: 'h3', t: X.heading },
    ...X.lead.map((t) => ({ k: 'p', t })),
    { k: 'h3', t: X.movesTitle },
    ...X.moves.flatMap((m) => [
      { k: 'h3', t: m.move, status: m.status, tag: short(m.status) },
      { k: 'small', t: `The host: “${m.says}” · the stream: ${m.tag}` },
      { k: 'p', t: m.ground }
    ]),
    { k: 'note', t: X.close }
  ];
}

/**
 * ⚑ S371 (UiB job 17 Part A; his 11 Nov: "make sure all the audios are playable in the close source websites") — one
 * media card, the same on every page and on the hub: a title, what it is and where it plays in the piece, the player
 * (preload none: nothing loads before a press), the words where there are some, and the credit. A row with no file is
 * described, not played. Every file must be one the licence ledger claims as the project's own (check-era-sites §6).
 */
function mediaHtml(m, up, tag = 'article') {
  const C = S.common;
  const credit = `<p class="credit">${esc(C.creditLabel)}: ${esc(m.credit)}</p>`;
  if (!m.file) return `<${tag} class="media nofile"><h3>${esc(m.title)}</h3><p>${esc(m.what)}</p>${credit}</${tag}>`;
  const el = m.type === 'video'
    ? `<video controls preload="none" src="${up}${m.file}">`
    : `<audio controls preload="none" src="${up}${m.file}">`;
  const close = m.type === 'video' ? '</video>' : '</audio>';
  const lyr = m.lyrics ? `<details><summary>${esc(C.lyricsTitle)}</summary><p class="lyrics">${lyricsOf(m.lyrics).map(esc).join('<br>')}</p></details>` : '';
  return `<${tag} class="media"><h3>${esc(m.title)}</h3><p>${esc(m.what)}</p>${el}<a href="${up}${m.file}">${esc(m.title)}</a>${close}${lyr}${credit}</${tag}>`;
}
/** the same card as the in-piece site viewer reads it (data/strings/era_sites_model.json) */
const mediaModel = (m) => ({ k: 'media', title: m.title, what: m.what, file: m.file || '', type: m.type || 'audio', credit: `${S.common.creditLabel}: ${m.credit}`, lyrics: m.lyrics ? lyricsOf(m.lyrics) : [], lyricsTitle: S.common.lyricsTitle });

// ── the seven tab panels (the same content, whatever the skin) ──────────────────────────────────────────────
function panelsFor(year, up) {
  const E = S.eras[year];
  const C = S.common;
  const pn = panelOf(year);
  const out = {};

  // THE STORY
  const changelog = year === '1997' ? updates.u2.changelog : year === '2003' ? updates.u3.changelog : year === '2016' ? updates.u4.changelog : null;
  const ends = changelog
    ? `<h3>${esc(C.endsTitle)}</h3><p>${esc(C.endsLead)}</p><ul class="changelog">${changelog.map((l) => `<li>${esc(l)}</li>`).join('')}</ul>`
    : `<h3>${esc(C.endsTitle)}</h3><p>${esc(C.endsLead)}</p><ul class="changelog"><li>${esc(updates.close.notify.filter(Boolean).join(' '))}</li><li>${esc(updates.close.restarting)}</li></ul>`;
  out.story = `<h2 id="h-story">${esc(S.tabs.story)}</h2>
${E.story.map((p) => `<p>${esc(p)}</p>`).join('\n')}
<p class="note">${esc(E.inventedNote)}</p>
<h3>${esc(C.storyFromPanel)}</h3>
<blockquote class="panelq"><p>${esc(pn.text)}</p><p class="status">${tag(pn.status)} ${esc(long(pn.status))}</p></blockquote>
<h3>${esc(C.whatYouMeet)}</h3><p>${esc(C.whatYouMeetLead)}</p>
<dl class="forms">${E.interfaces.map(([a, b]) => `<dt>${esc(a)}</dt><dd>${esc(b)}</dd>`).join('')}</dl>
${scriptHtml(E.script)}
${ends}`;

  // THE PRACTICES (every former "About this" text for this year, and each practice with its source)
  const shown = new Set();
  const prac = practicesOf(year).map((p) => {
    const key = p.source ? `${p.source.file}#${p.source.index}` : '';
    const srcHtml = !p.source ? `<p class="nolink">${esc(C.noSource)}</p>`
      : shown.has(key) ? `<p class="nolink">${esc(C.sameSource)}</p>` : sourceBlock(p.source.file, p.source.index);
    if (key) shown.add(key);
    return `<article class="prac"><h3>${esc(p.title)} ${tag(p.status)}</h3>
<p class="did">It ${esc(p.did)}.</p>${srcHtml}</article>`;
  }).join('\n');
  const abouts = CARDS_OF[year].map((f) => {
    const d = cards[f].debrief;
    return `<article class="aboutcard"><h4>${esc(CARD_FILES[f])}</h4>${(d.body ?? []).map((l) => `<p>${pub(l)}</p>`).join('')}</article>`;
  }).join('\n');
  out.practices = `<h2 id="h-practices">${esc(S.tabs.practices)}</h2>
<p class="lede">${esc(C.practicesLead)}</p>
<div class="statuskey"><h3>${esc(C.statusKey)}</h3><dl class="key">${['documentary', 'contested', 'speculative'].map((s) => `<dt>${tag(s)}</dt><dd>${esc(long(s))}</dd>`).join('')}</dl></div>
${prac}
${abouts ? `<h3>${esc(C.aboutTitle)}</h3><p>${esc(C.aboutLead)}</p>${abouts}` : ''}`;

  // SOURCES (this year's cards in full; verified links only)
  let src = '';
  if (CARDS_OF[year].length) {
    src += `<h3>${esc(C.everySource)}</h3><p>${esc(C.everySourceLead)}</p>`;
    for (const f of CARDS_OF[year]) {
      src += `<section class="card"><h4>${esc(CARD_FILES[f])}</h4>${cards[f].debrief.sources.map((_, i) => sourceBlock(f, i)).join('\n')}</section>`;
    }
  } else {
    const seen = new Set();
    const blocks = [];
    for (const p of practicesOf(year)) {
      if (!p.source) continue;
      const k = `${p.source.file}#${p.source.index}`;
      if (seen.has(k)) continue;
      seen.add(k);
      blocks.push(sourceBlock(p.source.file, p.source.index));
    }
    src += `<h3>${esc(C.everySource)}</h3><p>${esc(C.sourcesOnOtherCards)}</p>${blocks.join('\n')}`;
  }
  for (const [g, rows] of groupsOf(year)) {
    const G = S.common.groups[g];
    src += `<h3>${esc(G.title)}</h3><p>${esc(G.lead)}</p><ul class="period">${rows.map((l) => `<li>${ext(l)}<br><span class="refnote">${esc(l.note)}</span></li>`).join('')}</ul>`;
  }
  const refs = refsOf(year);
  src += `<h3>${esc(C.refsTitle)}</h3><ul class="refs">${refs.map((r) => `<li>${esc(r.text)}${r.note ? `<br><span class="refnote">${esc(r.note)}${r.src ? ` (${esc(r.src)})` : ''}</span>` : ''}</li>`).join('')}</ul>`;
  out.sources = `<h2 id="h-sources">${esc(S.tabs.sources)}</h2>
<p class="lede">${esc(C.sourcesLead.replace('{verify}', words.verifyPublic))}</p>
${src}
<p class="more"><a href="${up}sources/index.html">${esc(S.hub.oldSources)}</a> — ${esc(S.hub.oldSourcesNote)}</p>`;

  // IMAGES
  const period = plainLinksOf(year);
  out.images = `<h2 id="h-images">${esc(S.tabs.images)}</h2>
<p class="lede">${esc(C.imagesLead)}</p>
<div class="figs">
<figure><img src="${up}library/lib_era-${year}.webp" width="384" height="304" alt="${esc(E.imageAlt.lib)}" loading="lazy"><figcaption>${esc(E.imageCaption.lib)}<span class="credit">${esc(C.creditLabel)}: ${esc(C.creditLib)}</span></figcaption></figure>
<figure><img src="${up}assets/close/era${ERA_NO[year]}.jpg" width="980" height="860" alt="${esc(E.imageAlt.plate)}" loading="lazy"><figcaption>${esc(E.imageCaption.plate)}<span class="credit">${esc(C.creditLabel)}: ${esc(C.creditPlate)}</span></figcaption></figure>
</div>
<h3>${esc(C.periodTitle)}</h3>
${period.length ? `<p>${esc(C.periodLead)}</p><ul class="period">${period.map((l) => `<li>${ext(l)}<br><span class="refnote">${esc(l.note)}</span></li>`).join('')}</ul>` : `<p>${esc(C.periodNone)}</p>`}`;

  // MEDIA
  const items = E.media.map((m) => mediaHtml(m, up)).join('\n');
  out.media = `<h2 id="h-media">${esc(S.tabs.media)}</h2><p class="lede">${esc(C.mediaLead)}</p>${items}`;

  // WORDS
  const terms = wordsOf(year);
  const reasons = reasonsOf(year);
  out.words = `<h2 id="h-words">${esc(S.tabs.words)}</h2>
<p class="lede">${esc(C.wordsLead)}</p>
<p class="arcline">${esc(lex.arc[ERA_NO[year] - 1])}</p>
${terms.length ? `<dl class="terms">${terms.map((t) => `<dt>${esc(t.term)} <span class="lexstat">${esc(lex.statusLabels[t.status] ?? t.status)}</span></dt><dd>${esc(t.close)}</dd>`).join('')}</dl>` : `<p>${esc(C.wordsNone)}</p>`}
${reasons.length ? `<h3>${esc(C.reasonsTitle)}</h3><p>${esc(lex.reasonsIntro)}</p>${reasons.map(([g, rows]) => `<h4>${esc(lex.groups[g] ?? g)}</h4><ul class="reasons">${rows.map((r) => `<li>${esc(r.reason)} <span class="lexstat">${esc(r.status)} · ${esc(r.era)}</span></li>`).join('')}</ul>`).join('')}` : ''}`;

  // MISSED IT?
  out.missed = `<h2 id="h-missed">${esc(S.tabs.missed)}</h2>
<p class="lede">${esc(C.missedLead)}</p>
<ol class="beats">${beatsOf(year).map((b) => `<li><strong>${esc(b.label)}</strong>${b.optional ? ` <span class="opt">(${esc(C.missedOptional)})</span>` : ''} — ${esc(b.hint)} <span class="where">${esc(C.missedWhere)}: ${esc(b.where)}.</span></li>`).join('')}</ol>`;
  return out;
}

// ── the glance (counts, so a visitor sees how much a year holds) ────────────────────────────────────────────
function glance(year) {
  const pn = panelOf(year);
  const nSrc = CARDS_OF[year].reduce((a, f) => a + cards[f].debrief.sources.length, 0);
  return [
    ['In the piece', people[year]],
    ['How well documented', short(pn.status)],
    ['Practices', String(practicesOf(year).length)],
    ['Sources on its cards', String(nSrc || 'on other cards')],
    ['Beats', String(beatsOf(year).length)]
  ];
}

// ── shared CSS (structure; every colour is a var the skin sets from its own palette) ───────────────────────────
const BASE_CSS = `
*{box-sizing:border-box}
html{scroll-behavior:smooth}
body{margin:0;background:var(--bg);color:var(--ink);font:16px/1.65 var(--body)}
img,video,audio{max-width:100%}img{height:auto}
a{color:var(--link)}a:visited{color:var(--visited,var(--link))}
.skip{position:absolute;left:-999px;top:0;background:var(--ink);color:var(--bg);padding:8px 12px;z-index:10}.skip:focus{left:8px;top:8px}
.tabr{position:absolute;opacity:0;width:1px;height:1px;overflow:hidden}
.tp{display:none}
.tp h2{margin:0 0 6px}.tp h3{margin:26px 0 8px}.tp h4{margin:14px 0 6px}
.tp p,.tp li,.tp dd{max-width:72ch}
.lede{font-size:1.06em}
.note{border-left:4px solid var(--rule);padding:6px 12px;margin:14px 0}
.tag{display:inline-block;font-size:.72rem;font-weight:700;letter-spacing:.05em;text-transform:uppercase;padding:1px 8px;border-radius:3px;vertical-align:1px;white-space:nowrap}
.s-documentary{background:var(--t-doc);color:var(--t-doc-ink)}.s-contested{background:var(--t-dis);color:var(--t-dis-ink)}.s-speculative{background:var(--t-inf);color:var(--t-inf-ink)}
.conf{font-size:.8rem;opacity:.85}
.src{background:var(--card);border:1px solid var(--rule);padding:10px 14px;margin:10px 0}
.src p{margin:6px 0}.links{margin:6px 0 0;padding-left:20px}.links li{margin:3px 0}
.nolink,.refnote,.where,.credit{font-size:.88rem;opacity:.9}.credit{display:block;margin-top:6px}
.prac{margin:18px 0}.prac .did{margin:2px 0 6px}
.panelq{margin:10px 0;padding:8px 16px;border-left:5px solid var(--rule);background:var(--card)}
.panelq p{margin:6px 0}
.forms{margin:8px 0}.forms dt{font-weight:700;margin-top:10px}.forms dd{margin:2px 0 0 0}
.key{display:grid;grid-template-columns:auto 1fr;gap:6px 14px;align-items:baseline}.key dt,.key dd{margin:0}
.changelog{list-style:none;margin:8px 0;padding:10px 14px;background:var(--card);border:1px solid var(--rule);font-family:var(--mono)}
.changelog li{margin:2px 0}
.refs{padding-left:20px}.period{padding-left:20px}.period li{margin:10px 0}
.figs{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:16px;align-items:start}
figure{margin:0;background:var(--card);border:1px solid var(--rule);padding:10px}
figure img{display:block;width:100%}figcaption{margin-top:8px;font-size:.92rem}
.media{background:var(--card);border:1px solid var(--rule);padding:12px 16px;margin:14px 0}
.media h3{margin:0 0 4px}.media audio,.media video{display:block;width:100%;margin:10px 0}
.media a{font-size:.85rem}details{margin:8px 0}summary{cursor:pointer;font-weight:700}
.lyrics{line-height:1.8}
.terms dt{font-weight:700;margin-top:14px}.terms dd{margin:2px 0 0}
.lexstat{font-weight:400;font-size:.78rem;border:1px solid var(--rule);padding:0 6px;border-radius:3px}
.reasons li{margin:6px 0}.arcline{font-style:normal;border-left:4px solid var(--rule);padding:4px 12px}
.beats li{margin:10px 0}.opt{opacity:.85}
.card{margin:14px 0}
.more{margin-top:26px}
.glance{display:grid;grid-template-columns:auto 1fr;gap:4px 12px;margin:0;font-size:.9rem}.glance dt{font-weight:700}.glance dd{margin:0}
.statuskey{background:var(--card);border:1px solid var(--rule);padding:6px 16px 14px;margin:14px 0}
:focus-visible{outline:3px solid var(--focus);outline-offset:2px}
@media print{.tp{display:block!important}.tabr{display:none}}
@media (max-width:640px){body{font-size:16px}.key{grid-template-columns:1fr}}
`;

/** the tab-switching rules, written once: `active` is the skin's CSS for the chosen tab's label */
const tabRules = (active, focus) => TABS.map((t) =>
  `#t-${t}:checked ~ .layout #p-${t}{display:block}\n` +
  `#t-${t}:checked ~ .layout label[for="t-${t}"]{${active}}\n` +
  `#t-${t}:focus-visible ~ .layout label[for="t-${t}"]{outline:3px solid ${focus};outline-offset:2px}`).join('\n');

const radios = () => TABS.map((t, i) => `<input class="tabr" type="radio" name="tab" id="t-${t}"${i === 0 ? ' checked' : ''}>`).join('\n');
const tabLabels = (cls = '') => TABS.map((t) => `<label for="t-${t}"${cls ? ` class="${cls}"` : ''}>${esc(S.tabs[t])}</label>`).join('\n');
const panelsHtml = (p) => TABS.map((t) => `<section class="tp" id="p-${t}" aria-labelledby="h-${t}">${p[t]}</section>`).join('\n');
const yearLinks = (year, up, here = '') => YEARS.map((y) => y === year
  ? `<span aria-current="page">${y}</span>`
  : `<a href="${here}${up === '../../' ? '../' + y + '/' : y + '/'}index.html">${y}</a>`).join(' ');
const head = (title, desc, css) => `<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<style>${css}</style></head>`;

const prevNext = (year) => {
  const i = YEARS.indexOf(year);
  return { prev: YEARS[(i + 3) % 4], next: YEARS[(i + 1) % 4] };
};
const eraHref = (y) => `../${y}/index.html`;

// ══ 1997 — a GeoCities-style home page ═════════════════════════════════════════════════════════════════════
function site1997() {
  const year = '1997';
  const c = makePalette(year, {
    page: 'WEB97.page', tile: 'WEB97.counterBg', heading: 'WEB97.heading', headingShade: 'WEB97.headingShade', link: 'WEB97.link', visited: 'WEB97.visited',
    ink: 'WEB97.text', dim: 'WEB97.dim', rule: 'WEB97.rule', ringBar: 'WEB97.ringBar', ringInk: 'WEB97.ringInk', white: 'WEB97.searchBg',
    engine: 'WEB97.engine', join: 'WEB97.join', construction: 'WEB97.construction', black: 'ERA1.black', ok: 'ERA1.ok', olive: 'ERA1.olive', navy: 'ERA1.navy', ink2: 'ERA1.white'
  });
  mustRead(year, c, [['ink', 'white'], ['dim', 'white'], ['heading', 'white'], ['link', 'white'], ['visited', 'white'], ['ink', 'tile'], ['ringInk', 'ringBar'], ['black', 'construction'], ['ink2', 'ok'], ['black', 'olive'], ['ink2', 'navy'], ['ink2', 'engine'], ['ink2', 'heading']]);
  const css = `:root{--bg:${c.page};--ink:${c.ink};--card:${c.white};--rule:${c.rule};--link:${c.link};--visited:${c.visited};--focus:${c.engine};--body:Verdana,Geneva,"DejaVu Sans",Arial,sans-serif;--mono:"Courier New",monospace;--t-doc:${c.ok};--t-doc-ink:${c.ink2};--t-dis:${c.olive};--t-dis-ink:${c.black};--t-inf:${c.navy};--t-inf-ink:${c.ink2}}
body{background-color:${c.page};background-image:radial-gradient(${c.tile} 3px,transparent 3.5px);background-size:14px 14px}
.site{max-width:1000px;margin:0 auto;padding:10px}
.construction{background:repeating-linear-gradient(45deg,${c.construction} 0 12px,${c.black} 12px 24px);color:${c.black};text-align:center;font-weight:700;padding:0;margin:0 0 10px}
.construction span{display:inline-block;background:${c.construction};padding:2px 14px;margin:5px 0}
.mast{background:${c.white};border:4px ridge ${c.heading};padding:10px 18px;text-align:center}
.mast h1{margin:4px 0;font:700 clamp(1.5rem,5vw,2.4rem)/1.15 "Times New Roman",Times,serif;color:${c.heading};text-shadow:1px 1px 0 ${c.headingShade}}
.mast .sub{margin:4px 0;color:${c.dim}}
.new{display:inline-block;background:${c.engine};color:${c.ink2};font-weight:700;padding:0 6px;font-size:.8rem;margin-right:6px}
.layout{display:grid;grid-template-columns:210px 1fr;gap:8px;margin-top:8px}
.frame-nav{background:${c.tile};border:3px outset ${c.white};padding:10px;align-self:start}
.frame-nav h2{margin:0 0 6px;font-size:1rem;color:${c.ink}}
.frame-nav label{display:block;padding:6px 8px;margin:3px 0;background:${c.white};border:2px outset ${c.white};color:${c.link};text-decoration:underline;cursor:pointer}
.frame-nav hr{border:0;border-top:2px dashed ${c.heading};margin:12px 0}
.frame-nav .glance{font-size:.8rem}
.counter{font-family:var(--mono);background:${c.black};color:${c.ink2};text-align:center;padding:4px;margin:6px 0;letter-spacing:.2em}
.frame-main{background:${c.white};border:4px ridge ${c.heading};padding:16px 22px 28px;min-width:0}
.tp h2{font:700 1.7rem/1.2 "Times New Roman",Times,serif;color:${c.heading};text-shadow:1px 1px 0 ${c.headingShade}}
.tp h3{color:${c.heading};border-bottom:2px dotted ${c.heading};padding-bottom:2px}
.tp h4{color:${c.ink}}
.src,.panelq,.changelog,.statuskey,figure,.media{border-style:ridge;border-width:3px;border-color:${c.rule}}
.ringbar{background:${c.ringBar};color:${c.ringInk};border:3px outset ${c.white};margin-top:8px;padding:8px 12px;text-align:center;font-weight:700}
.ringbar a{color:${c.ringInk}}
.foot{margin:10px 0 0;background:${c.white};border:3px ridge ${c.rule};padding:10px 16px;font-size:.88rem;text-align:center;color:${c.dim}}
${tabRules(`background:${c.heading};color:${c.ink2};text-decoration:none;border-style:inset`, c.engine)}
@media (max-width:760px){.layout{grid-template-columns:1fr}.frame-nav{display:grid;grid-template-columns:1fr 1fr;gap:4px}.frame-nav h2,.frame-nav hr,.frame-nav .glance,.frame-nav .counter{grid-column:1/-1}.frame-main{padding:12px 14px}}
${BASE_CSS}`;
  const { prev, next } = prevNext(year);
  const P = panelsFor(year, '../../');
  const body = `<body><a class="skip" href="#main">${esc(S.skipLabel)}</a>
<div class="site">
<p class="construction"><span>⚠ UNDER CONSTRUCTION — this page will be rebuilt as the project's website ⚠</span></p>
<header class="mast"><p class="sub"><span class="new">NEW!</span>${esc(S.siteName)}</p><h1>${esc(S.eras[year].heading)}</h1><p class="sub">${esc(S.eras[year].tagline)}</p></header>
${radios()}
<div class="layout">
<nav class="frame-nav" aria-label="${esc(S.tabsLabel)}"><h2>Contents</h2>
${tabLabels()}
<hr>
<dl class="glance">${glance(year).map(([a, b]) => `<dt>${esc(a)}</dt><dd>${esc(b)}</dd>`).join('')}</dl>
<div class="counter" aria-label="visitor counter">000000</div>
<p style="font-size:.78rem;margin:0">${esc(S.common.counterNote)}</p>
</nav>
<main id="main" class="frame-main">
${panelsHtml(P)}
</main>
</div>
<p class="ringbar">${esc(S.common.ringTitle)}<br><a href="${eraHref(prev)}">${esc(S.common.ringPrev)} (${prev})</a> | <a href="../index.html">${esc(S.common.ringHub)}</a> | <a href="${eraHref(next)}">${esc(S.common.ringNext)} (${next})</a></p>
<p class="foot">${esc(S.common.bestViewed1997)}<br>${esc(S.common.contentNote)}<br>${esc(S.common.records)} · Updated ${esc(S.updated)} · <a href="../../index.html?reinterp=1">${esc(S.playLabel)}</a></p>
</div></body></html>
`;
  return head(`${S.eras[year].heading} | ${S.siteName}`, S.eras[year].tagline, css) + body;
}

// ══ 2003 — a portal with tabs and a left nav ═══════════════════════════════════════════════════════════════
function site2003() {
  const year = '2003';
  const c = makePalette(year, {
    page: 'WEB2003.page', banner: 'WEB2003.banner', bannerInk: 'WEB2003.bannerInk', bannerDim: 'WEB2003.bannerDim', panel: 'WEB2003.panel', panelHead: 'WEB2003.panelHead',
    postHead: 'WEB2003.postHead', ink: 'WEB2003.text', dim: 'WEB2003.dim', link: 'WEB2003.link', check: 'WEB2003.check', pending: 'WEB2003.pending', praying: 'WEB2003.praying',
    filled: 'WEB2003.filled', tab: 'WEB2003.tab', white: 'WEB2003.white', brand: 'ERA1.titleBlue', navy: 'ERA1.navy', rule: 'ERA1.silver'
  });
  mustRead(year, c, [['ink', 'white'], ['dim', 'white'], ['link', 'white'], ['bannerInk', 'banner'], ['bannerDim', 'banner'], ['bannerInk', 'panelHead'], ['ink', 'tab'], ['ink', 'panel'], ['dim', 'panel'], ['ink', 'pending'], ['white', 'check'], ['white', 'filled'], ['white', 'praying'], ['white', 'navy'], ['link', 'page']]);
  const css = `:root{--bg:${c.page};--ink:${c.ink};--card:${c.white};--rule:${c.postHead};--link:${c.link};--focus:${c.brand};--body:Tahoma,Verdana,"DejaVu Sans",Arial,sans-serif;--mono:"Lucida Console",Consolas,monospace;--t-doc:${c.check};--t-doc-ink:${c.white};--t-dis:${c.filled};--t-dis-ink:${c.white};--t-inf:${c.praying};--t-inf-ink:${c.white}}
.banner{background:${c.banner};color:${c.bannerInk};border-bottom:4px solid ${c.brand}}
.banner .in{max-width:1180px;margin:0 auto;padding:12px 16px;display:flex;flex-wrap:wrap;gap:4px 18px;align-items:baseline}
.banner h1{margin:0;font-size:1.5rem}.banner .sub{margin:0;color:${c.bannerDim}}
.banner .years{margin-left:auto;color:${c.bannerDim}}.banner .years a{color:${c.bannerInk}}
.site{max-width:1180px;margin:0 auto;padding:0 16px 40px}
.tabs{display:flex;flex-wrap:wrap;gap:2px;margin:14px 0 0;border-bottom:3px solid ${c.panelHead}}
.tabs label{background:${c.tab};color:${c.ink};padding:8px 16px;border:1px solid ${c.panelHead};border-bottom:0;border-radius:8px 8px 0 0;cursor:pointer;font-weight:700;font-size:.9rem}
.layout{display:grid;grid-template-columns:200px minmax(0,1fr) 220px;gap:16px;margin-top:0;position:relative}
.layout>.tabs{grid-column:1/-1;order:-1}
.side{padding-top:16px}
.box{background:${c.panel};border:1px solid ${c.panelHead};margin-bottom:14px}
.box h2{margin:0;background:${c.panelHead};color:${c.bannerInk};font-size:.9rem;padding:5px 10px}
.box .bd{padding:8px 10px;font-size:.88rem}
.box ul{margin:0;padding-left:18px}.box li{margin:4px 0}
.box .pending{background:${c.pending};color:${c.ink};padding:6px 8px}
main{padding-top:16px;min-width:0}
.tp{background:${c.white};border:1px solid ${c.postHead};padding:8px 22px 28px}
.tp h2{background:${c.postHead};color:${c.ink};margin:0 -22px 12px;padding:8px 22px;font-size:1.3rem}
.tp h3{color:${c.panelHead};border-bottom:1px solid ${c.postHead}}
.foot{margin-top:16px;font-size:.85rem;color:${c.dim};border-top:1px solid ${c.postHead};padding-top:10px}
${tabRules(`background:${c.white};border-bottom:3px solid ${c.white};margin-bottom:-3px;box-shadow:inset 0 3px 0 ${c.brand}`, c.brand)}
@media (max-width:900px){.layout{grid-template-columns:1fr}.side{padding-top:0}.tabs label{padding:8px 10px}.tp{padding:8px 14px 24px}.tp h2{margin:0 -14px 12px;padding:8px 14px}}
${BASE_CSS}`;
  const P = panelsFor(year, '../../');
  const years = YEARS.filter((y) => y !== year);
  const body = `<body><a class="skip" href="#main">${esc(S.skipLabel)}</a>
<header class="banner"><div class="in"><h1>${esc(S.siteName)} · portal</h1><p class="sub">${esc(S.eras[year].heading)} — ${esc(S.eras[year].tagline)}</p><p class="years">${yearLinks(year, '../../')} · <a href="../index.html">${esc(S.hubLabel)}</a></p></div></header>
<div class="site">
${radios()}
<div class="layout">
<nav class="tabs" aria-label="${esc(S.tabsLabel)}">${tabLabels()}</nav>
<aside class="side" aria-label="Around the four years">
<div class="box"><h2>Around the four years</h2><div class="bd"><ul>${years.map((y) => `<li><a href="${eraHref(y)}">${y} — ${esc(people[y])}</a></li>`).join('')}<li><a href="../index.html">${esc(S.hubLabel)}</a></li><li><a href="../../sources/index.html">${esc(S.hub.oldSources)}</a></li><li><a href="../../index.html?reinterp=1">${esc(S.playLabel)}</a></li></ul></div></div>
<div class="box"><h2>Tip of the day</h2><div class="bd pending">${esc(S.common.tip2003)}</div></div>
</aside>
<main id="main">
${panelsHtml(P)}
<p class="foot">${esc(S.common.contentNote)}<br>${esc(S.common.records)} · Updated ${esc(S.updated)}</p>
</main>
<aside class="side" aria-label="This year at a glance">
<div class="box"><h2>This year at a glance</h2><div class="bd"><dl class="glance">${glance(year).map(([a, b]) => `<dt>${esc(a)}</dt><dd>${esc(b)}</dd>`).join('')}</dl></div></div>
<div class="box"><h2>${esc(S.common.statusKey)}</h2><div class="bd">${['documentary', 'contested', 'speculative'].map((s) => `<p>${tag(s)}<br>${esc(long(s))}</p>`).join('')}</div></div>
</aside>
</div>
</div></body></html>
`;
  return head(`${S.eras[year].heading} | ${S.siteName}`, S.eras[year].tagline, css) + body;
}

// ══ 2016 — a flat, responsive platform ═════════════════════════════════════════════════════════════════════
function site2016() {
  const year = '2016';
  const c = makePalette(year, {
    bg: 'ERA3.glass', white: 'ERA3.white', edge: 'ERA3.glassEdge', ink: 'ERA3.ink', dim: 'ERA3.greyDk', bar: 'ERA3.deskMid', barLo: 'ERA3.deskTop', accent: 'ERA3.accent',
    link: 'ERA3.deskLow', good: 'ERA3.good', amber: 'ERA3.amber', bury: 'ERA3.bury', lamb: 'ERA3.lambBand', lambTag: 'ERA3.lambTag', sys: 'ERA3.sysBand', titleText: 'ERA3.titleText', accentHi: 'ERA3.accentHi', pale: 'ERA3.titleA'
  });
  mustRead(year, c, [['ink', 'bg'], ['ink', 'white'], ['dim', 'white'], ['dim', 'bg'], ['link', 'white'], ['link', 'bg'], ['white', 'bar'], ['pale', 'bar'], ['ink', 'good'], ['ink', 'amber'], ['white', 'bury'], ['titleText', 'lamb'], ['ink', 'sys']]);
  const css = `:root{--bg:${c.bg};--ink:${c.ink};--card:${c.white};--rule:${c.edge};--link:${c.link};--focus:${c.accent};--body:"Segoe UI",Roboto,"Helvetica Neue",Arial,sans-serif;--mono:Consolas,"DejaVu Sans Mono",monospace;--t-doc:${c.good};--t-doc-ink:${c.ink};--t-dis:${c.amber};--t-dis-ink:${c.ink};--t-inf:${c.bury};--t-inf-ink:${c.white}}
header.top{background:${c.bar};color:${c.white}}
header.top .in{max-width:820px;margin:0 auto;padding:18px 18px 0}
header.top .brand{margin:0;font-size:.85rem;letter-spacing:.08em;text-transform:uppercase;color:${c.pale}}
header.top h1{margin:2px 0 4px;font-size:clamp(1.5rem,5vw,2.2rem);font-weight:600}
header.top .sub{margin:0 0 12px;color:${c.white};opacity:.92}
.tabs{display:flex;gap:2px;overflow-x:auto;scrollbar-width:thin}
.tabs label{flex:0 0 auto;color:${c.white};padding:10px 16px;cursor:pointer;font-weight:600;font-size:.92rem;border-bottom:4px solid transparent;opacity:.9}
.site{max-width:820px;margin:0 auto;padding:0 18px 56px}
.layout{display:block}.layout>.tabs{margin:0 -18px;padding:0 18px;background:${c.bar}}
.layout>.tabs.dock{max-width:none}
main{padding-top:24px;min-width:0}
.tp{background:${c.white};border:1px solid ${c.edge};border-radius:10px;padding:8px 26px 30px}
.tp h2{font-size:1.6rem;font-weight:600;color:${c.titleText}}
.tp h3{color:${c.titleText};font-size:1.08rem}
.note{background:${c.lamb};border-left-color:${c.lambTag};color:${c.titleText}}
.src,.panelq,.changelog,.statuskey,figure,.media{border-radius:8px}
.pills{display:flex;flex-wrap:wrap;gap:8px;margin:26px 0 0;padding:0;list-style:none}
.pills a,.pills span{display:inline-block;padding:6px 14px;border-radius:999px;background:${c.white};border:1px solid ${c.edge};text-decoration:none;font-size:.9rem}
.pills span{background:${c.bar};color:${c.white}}
.foot{margin-top:22px;font-size:.85rem;color:${c.dim}}
${tabRules(`opacity:1;border-bottom-color:${c.accentHi};background:${c.barLo}`, c.accentHi)}
@media (max-width:640px){.tp{padding:6px 16px 24px}}
${BASE_CSS}`;
  const P = panelsFor(year, '../../');
  const body = `<body><a class="skip" href="#main">${esc(S.skipLabel)}</a>
<header class="top"><div class="in"><p class="brand">${esc(S.siteName)} · ${esc(S.projectLine)}</p><h1>${esc(S.eras[year].heading)}</h1><p class="sub">${esc(S.eras[year].tagline)}</p></div></header>
<div class="site">
${radios()}
<div class="layout">
<nav class="tabs" aria-label="${esc(S.tabsLabel)}">${tabLabels()}</nav>
<main id="main">
${panelsHtml(P)}
<ul class="pills" aria-label="The four years">${YEARS.map((y) => y === year ? `<li><span aria-current="page">${y}</span></li>` : `<li><a href="${eraHref(y)}">${y}</a></li>`).join('')}<li><a href="../index.html">${esc(S.hubLabel)}</a></li><li><a href="../../index.html?reinterp=1">${esc(S.playLabel)}</a></li></ul>
<p class="foot">${esc(S.common.contentNote)}<br>${esc(S.common.records)} · Updated ${esc(S.updated)}</p>
</main>
</div>
</div></body></html>
`;
  return head(`${S.eras[year].heading} | ${S.siteName}`, S.eras[year].tagline, css) + body;
}

// ══ 2026 — an app-like page of cards ═══════════════════════════════════════════════════════════════════════
function site2026() {
  const year = '2026';
  const c = makePalette(year, {
    field: 'ERA4.field', panel: 'ERA4.panel', panelHi: 'ERA4.panelHi', edge: 'ERA4.panelEdge', rule: 'ERA4.rule', text: 'ERA4.text', textHi: 'ERA4.textHi',
    l: 'ERA4.l', lDim: 'ERA4.lDim', sky: 'ERA4.photoSky', warm: 'WALL.accent', meta: 'ERA4.meta'
  });
  mustRead(year, c, [['text', 'field'], ['textHi', 'field'], ['text', 'panel'], ['textHi', 'panel'], ['l', 'panel'], ['l', 'field'], ['field', 'l'], ['field', 'warm'], ['field', 'sky'], ['textHi', 'panelHi'], ['l', 'panelHi']]);
  const css = `:root{--bg:${c.field};--ink:${c.text};--card:${c.panel};--rule:${c.rule};--link:${c.l};--visited:${c.l};--focus:${c.warm};--body:system-ui,-apple-system,"Segoe UI",Roboto,Arial,sans-serif;--mono:ui-monospace,Menlo,Consolas,monospace;--t-doc:${c.l};--t-doc-ink:${c.field};--t-dis:${c.warm};--t-dis-ink:${c.field};--t-inf:${c.sky};--t-inf-ink:${c.field}}
header.app{position:sticky;top:0;z-index:3;background:${c.field};border-bottom:1px solid ${c.edge};margin:0 -16px;padding:12px 16px 0}
header.app .row{display:flex;align-items:center;gap:12px}
header.app .dot{width:12px;height:12px;border-radius:50%;background:${c.l};flex:0 0 auto}
header.app h1{margin:0;font-size:1.05rem;color:${c.textHi};font-weight:600}
header.app .sub{margin:0 0 0 auto;font-size:.82rem}
.tabs{display:flex;gap:8px;overflow-x:auto;padding:12px 0 12px;scrollbar-width:thin}
.tabs label{flex:0 0 auto;padding:7px 16px;border-radius:999px;border:1px solid ${c.edge};background:${c.panel};color:${c.text};cursor:pointer;font-weight:600;font-size:.88rem}
.site{max-width:780px;margin:0 auto;padding:0 16px 80px}
.layout{display:block}
.hero{padding:26px 0 8px}.hero h2{margin:0;font-size:clamp(1.6rem,6vw,2.4rem);color:${c.textHi};line-height:1.15}.hero p{margin:8px 0 0;color:${c.l};font-size:1.05rem}
main{padding-top:6px;min-width:0}
.tp{padding:4px 0 24px}
.tp>h2{font-size:1.25rem;color:${c.textHi};margin:8px 0 8px}
.tp h3{color:${c.textHi};font-size:1rem}
.tp h4{color:${c.textHi}}
.tp>p,.tp>.card,.tp>.src,.tp>.prac,.tp>.aboutcard,.tp>.panelq,.tp>.note{background:${c.panel};border:1px solid ${c.edge};border-radius:16px;padding:14px 18px}
.tp>p.more{background:none;border:0;padding:0}
.tp>p.lede{background:none;border:0;padding:0;color:${c.textHi}}
.tp>.note{border-left:4px solid ${c.warm}}
.src,.panelq,.changelog,.statuskey,figure,.media{border-radius:14px;border-color:${c.edge}}
.src{background:${c.panelHi}}
.media,figure{background:${c.panel}}
.dock{position:fixed;left:0;right:0;bottom:0;z-index:3;background:${c.field};border-top:1px solid ${c.edge}}
.dock .in{max-width:780px;margin:0 auto;padding:8px 16px;display:flex;gap:6px;align-items:center;justify-content:space-between;font-size:.88rem}
.dock a,.dock span{padding:6px 12px;border-radius:999px;text-decoration:none}
.dock span{background:${c.l};color:${c.field};font-weight:700}
.foot{margin-top:18px;font-size:.84rem}
.dock a,.dock span{white-space:nowrap}
@media (max-width:560px){header.app .sub{display:none}header.app h1{white-space:nowrap}.dock .in{gap:0;padding:8px 6px;font-size:.78rem}.dock a,.dock span{padding:6px 8px}}
${tabRules(`background:${c.l};color:${c.field};border-color:${c.l}`, c.warm)}
${BASE_CSS}`;
  const P = panelsFor(year, '../../');
  const body = `<body><a class="skip" href="#main">${esc(S.skipLabel)}</a>
<div class="site">
${radios()}
<div class="layout">
<header class="app"><div class="row"><span class="dot" aria-hidden="true"></span><h1>${esc(S.siteName)}</h1><p class="sub">${esc(S.projectLine)}</p></div>
<nav class="tabs" aria-label="${esc(S.tabsLabel)}">${tabLabels()}</nav></header>
<div class="hero"><h2>${esc(S.eras[year].heading)}</h2><p>${esc(S.eras[year].tagline)}</p></div>
<main id="main">
${panelsHtml(P)}
<p class="foot">${esc(S.common.contentNote)}<br>${esc(S.common.records)} · Updated ${esc(S.updated)}</p>
</main>
</div>
</div>
<nav class="dock" aria-label="The four years"><div class="in"><span>${year}</span>${YEARS.filter((y) => y !== year).map((y) => `<a href="${eraHref(y)}">${y}</a>`).join('')}<a href="../index.html">${esc(S.hubLabel)}</a><a href="../../index.html?reinterp=1">${esc(S.playLabel)}</a></div></nav>
</body></html>
`;
  return head(`${S.eras[year].heading} | ${S.siteName}`, S.eras[year].tagline, css) + body;
}

// ══ the hub — four doors ═══════════════════════════════════════════════════════════════════════════════════
function hub() {
  const c = makePalette('hub', {
    bg: 'PLACE.wallHi', ink: 'PLACE.ink', card: 'WALL.cardHi', rule: 'PLACE.wallLo', accent: 'WALL.accent', white: 'ERA1.white', black: 'ERA1.black',
    d1: 'ERA1.teal', d2: 'WEB2003.banner', d3: 'ERA3.deskMid', d4: 'ERA4.field', d4ink: 'ERA4.textHi', navy: 'ERA1.navy', price: 'WALL.price'
  });
  mustRead('hub', c, [['ink', 'bg'], ['ink', 'card'], ['white', 'd1'], ['white', 'd2'], ['white', 'd3'], ['d4ink', 'd4'], ['price', 'bg'], ['price', 'card'], ['black', 'accent']]);
  const css = `:root{--bg:${c.bg};--ink:${c.ink};--card:${c.card};--rule:${c.rule};--link:${c.price};--focus:${c.price};--body:-apple-system,"Segoe UI",Roboto,Arial,sans-serif;--mono:ui-monospace,Menlo,monospace}
main{max-width:980px;margin:0 auto;padding:36px 18px 64px}
h1{font-size:clamp(1.7rem,6vw,2.6rem);line-height:1.15;margin:0 0 8px}
.lede{font-size:1.1rem;max-width:68ch}
.doors{display:grid;grid-template-columns:repeat(auto-fit,minmax(210px,1fr));gap:14px;margin:22px 0 10px;padding:0;list-style:none}
.door a{display:block;height:100%;padding:18px;border-radius:10px;text-decoration:none;color:${c.white};border:3px solid ${c.ink}}
.door a:hover,.door a:focus-visible{outline:4px solid ${c.accent};outline-offset:2px}
.door .yr{display:block;font-size:2.2rem;font-weight:700;line-height:1}
.door .who{display:block;font-weight:700;margin:4px 0 8px}
.door.d1 a{background:${c.d1}}.door.d2 a{background:${c.d2}}.door.d3 a{background:${c.d3}}.door.d4 a{background:${c.d4};color:${c.d4ink}}
section{margin:36px 0}
h2{font-size:1.3rem;margin:0 0 8px}
.card{background:${c.card};border:1px solid ${c.rule};border-radius:8px;padding:14px 18px;margin:12px 0}
.media video,.media audio{width:100%;display:block;margin:10px 0}
.media h3{margin:0 0 4px}
.credit,.nolink{font-size:.88rem}
ul.l{padding-left:20px}ul.l li{margin:4px 0}
details summary{cursor:pointer;font-weight:700}
.foot{font-size:.85rem;margin-top:36px}
:focus-visible{outline:3px solid ${c.price};outline-offset:2px}
a{color:${c.price}}
*{box-sizing:border-box}body{margin:0;background:${c.bg};color:${c.ink};font:16px/1.65 var(--body)}
.skip{position:absolute;left:-999px}.skip:focus{left:8px;top:8px;background:${c.white};padding:6px}`;
  const H = S.hub;
  const lexLinks = (links['lexicon#sources'] ?? []).map((l) => `<li>${ext(l)}</li>`).join('');
  const body = `<body><a class="skip" href="#main">${esc(S.skipLabel)}</a>
<main id="main">
<p>${esc(S.siteName)} · ${esc(S.projectLine)}</p>
<h1>${esc(H.title)}</h1>
<p class="lede">${esc(H.lede)}</p>
<section aria-labelledby="doors"><h2 id="doors">${esc(H.choose)}</h2>
<ul class="doors">${YEARS.map((y) => `<li class="door d${ERA_NO[y]}"><a href="${y}/index.html" aria-label="${esc(H.doorAria.replace('{year}', y))}"><span class="yr">${y}</span><span class="who">${esc(people[y])}</span>${esc(H.doors[y])}</a></li>`).join('')}</ul></section>
<section aria-labelledby="also"><h2 id="also">${esc(H.alsoTitle)}</h2>
<div class="card"><p><a href="../sources/index.html">${esc(H.oldSources)}</a><br>${esc(H.oldSourcesNote)}</p></div>
<div class="card"><p><a href="../index.html?reinterp=1">${esc(S.playLabel)}</a><br>${esc(H.playNote)}</p></div>
<div class="card"><details><summary>${esc(H.lexiconTitle)}</summary><p>${esc(H.lexiconLead)}</p><ul class="l">${lexLinks}</ul></details></div>
</section>
<section aria-labelledby="sound"><h2 id="sound">${esc(H.soundTitle)}</h2><p>${esc(H.soundLead)}</p>
${[H.film, ...H.sound].map((m) => mediaHtml(m, '../', 'div').replace('<div class="media', '<div class="card media')).join('\n')}
</section>
<section aria-labelledby="about"><h2 id="about">${esc(H.aboutTitle)}</h2>${about.paragraphs.map((p) => `<p>${esc(p)}</p>`).join('')}</section>
<section aria-labelledby="how"><h2 id="how">${esc(H.howTitle)}</h2><ul class="l">${H.how.map((p) => `<li>${esc(p)}</li>`).join('')}</ul></section>
<p class="foot">${esc(S.common.contentNote)}<br>${esc(S.common.records)} · Updated ${esc(S.updated)}</p>
</main></body></html>
`;
  return head(`${H.title} | ${S.siteName}`, H.lede, css) + body;
}

// ══ the VIEWER MODEL — the same content as the pages, as data, for the in-piece site viewer ═══════════════════
// ⚑ S291 (2026-11-01, his: "open the website page inside of the VR headset and the experience on the browser").
// A headset cannot show DOM, and an iframe is no answer inside the piece, so src/frame/siteViewer/ DRAWS these sites on a
// canvas. It reads THIS file (data/strings/era_sites_model.json), built here from the very same data the HTML pages are
// built from, so the page and the in-piece window cannot disagree. Text only: plain strings, no markup; the viewer owns
// the look. Every link in it is a row of links.json / era_links.json that already passed the verbatim refusal above.
const plain = (t) => String(t).split(words._verifyMarker).join(words.verifyPublic).replace(/⚑ ?/g, '').replace(/\*([^*]+)\*/g, '$1');
const linkRows = (key) => (links[key] ?? []).map((l) => ({ label: l.label, url: l.url }));
const srcModel = (file, index) => {
  const s = cards[file]?.debrief?.sources?.[index];
  if (!s) return null;
  const ls = linkRows(`${file}#${index}`);
  return { k: 'src', status: s.status, tag: short(s.status), conf: s.confidence || '', t: plain(s.text), links: ls, nolink: ls.length ? '' : S.common.noLink };
};
function panelsModel(year) {
  const E = S.eras[year];
  const C = S.common;
  const pn = panelOf(year);
  const out = {};
  const changelog = year === '1997' ? updates.u2.changelog : year === '2003' ? updates.u3.changelog : year === '2016' ? updates.u4.changelog : null;
  const endLines = changelog ?? [updates.close.notify.filter(Boolean).join(' '), updates.close.restarting];
  out.story = [
    { k: 'h2', t: S.tabs.story },
    ...E.story.map((t) => ({ k: 'p', t })),
    { k: 'note', t: E.inventedNote },
    { k: 'h3', t: C.storyFromPanel },
    { k: 'quote', t: pn.text, status: pn.status, tag: short(pn.status), long: long(pn.status) },
    { k: 'h3', t: C.whatYouMeet }, { k: 'p', t: C.whatYouMeetLead },
    { k: 'dl', rows: E.interfaces },
    ...scriptModel(E.script),
    { k: 'h3', t: C.endsTitle }, { k: 'p', t: C.endsLead }, { k: 'mono', lines: endLines }
  ];
  const shown = new Set();
  const prac = [];
  for (const p of practicesOf(year)) {
    const key = p.source ? `${p.source.file}#${p.source.index}` : '';
    prac.push({ k: 'h3', t: p.title, status: p.status, tag: short(p.status) }, { k: 'p', t: `It ${p.did}.` });
    if (!p.source) prac.push({ k: 'small', t: C.noSource });
    else if (shown.has(key)) prac.push({ k: 'small', t: C.sameSource });
    else prac.push(srcModel(p.source.file, p.source.index));
    if (key) shown.add(key);
  }
  const abouts = CARDS_OF[year].flatMap((f) => [{ k: 'h4', t: CARD_FILES[f] }, ...(cards[f].debrief.body ?? []).map((l) => ({ k: 'p', t: plain(l) }))]);
  out.practices = [
    { k: 'h2', t: S.tabs.practices }, { k: 'lede', t: C.practicesLead },
    { k: 'key', t: C.statusKey, rows: ['documentary', 'contested', 'speculative'].map((s) => ({ status: s, tag: short(s), long: long(s) })) },
    ...prac,
    ...(abouts.length ? [{ k: 'h3', t: C.aboutTitle }, { k: 'p', t: C.aboutLead }, ...abouts] : [])
  ];
  const src = [{ k: 'h2', t: S.tabs.sources }, { k: 'lede', t: C.sourcesLead.replace('{verify}', words.verifyPublic) }, { k: 'h3', t: C.everySource }];
  if (CARDS_OF[year].length) {
    src.push({ k: 'p', t: C.everySourceLead });
    for (const f of CARDS_OF[year]) src.push({ k: 'h4', t: CARD_FILES[f] }, ...cards[f].debrief.sources.map((_, i) => srcModel(f, i)));
  } else {
    src.push({ k: 'p', t: C.sourcesOnOtherCards });
    const seen = new Set();
    for (const p of practicesOf(year)) {
      if (!p.source) continue;
      const k = `${p.source.file}#${p.source.index}`;
      if (seen.has(k)) continue;
      seen.add(k);
      src.push(srcModel(p.source.file, p.source.index));
    }
  }
  for (const [g, rows] of groupsOf(year)) {
    src.push({ k: 'h3', t: C.groups[g].title }, { k: 'p', t: C.groups[g].lead }, { k: 'links', items: rows.map((l) => ({ label: l.label, url: l.url, note: l.note })) });
  }
  src.push({ k: 'h3', t: C.refsTitle }, { k: 'ul', items: refsOf(year).map((r) => ({ t: r.text, sub: r.note ? `${r.note}${r.src ? ` (${r.src})` : ''}` : '' })) });
  src.push({ k: 'pagelink', label: S.hub.oldSources, note: S.hub.oldSourcesNote, href: 'sources/index.html' });
  out.sources = src;
  const period = plainLinksOf(year);
  out.images = [
    { k: 'h2', t: S.tabs.images }, { k: 'lede', t: C.imagesLead },
    { k: 'fig', img: `library/lib_era-${year}.webp`, w: 384, h: 304, alt: E.imageAlt.lib, caption: E.imageCaption.lib, credit: `${C.creditLabel}: ${C.creditLib}` },
    { k: 'fig', img: `assets/close/era${ERA_NO[year]}.jpg`, w: 980, h: 860, alt: E.imageAlt.plate, caption: E.imageCaption.plate, credit: `${C.creditLabel}: ${C.creditPlate}` },
    { k: 'h3', t: C.periodTitle },
    ...(period.length ? [{ k: 'p', t: C.periodLead }, { k: 'links', items: period.map((l) => ({ label: l.label, url: l.url, note: l.note })) }] : [{ k: 'p', t: C.periodNone }])
  ];
  out.media = [
    { k: 'h2', t: S.tabs.media }, { k: 'lede', t: C.mediaLead },
    ...E.media.map(mediaModel)
  ];
  const terms = wordsOf(year);
  const reasons = reasonsOf(year);
  out.words = [
    { k: 'h2', t: S.tabs.words }, { k: 'lede', t: C.wordsLead }, { k: 'note', t: lex.arc[ERA_NO[year] - 1] },
    ...(terms.length ? [{ k: 'terms', rows: terms.map((t) => ({ term: t.term, status: lex.statusLabels[t.status] ?? t.status, def: t.close })) }] : [{ k: 'p', t: C.wordsNone }]),
    ...(reasons.length ? [{ k: 'h3', t: C.reasonsTitle }, { k: 'p', t: lex.reasonsIntro }, ...reasons.flatMap(([g, rows]) => [{ k: 'h4', t: lex.groups[g] ?? g }, { k: 'ul', items: rows.map((r) => ({ t: r.reason, sub: `${r.status} · ${r.era}` })) }])] : [])
  ];
  out.missed = [
    { k: 'h2', t: S.tabs.missed }, { k: 'lede', t: C.missedLead },
    { k: 'beats', items: beatsOf(year).map((b) => ({ label: b.label, opt: b.optional ? C.missedOptional : '', hint: b.hint, where: `${C.missedWhere}: ${b.where}.` })) }
  ];
  return out;
}
function viewerModel() {
  const eras = {};
  for (const y of YEARS) {
    eras[y] = {
      heading: S.eras[y].heading, tagline: S.eras[y].tagline, who: people[y],
      glance: glance(y), tabs: panelsModel(y)
    };
  }
  const H = S.hub;
  return {
    _doc: 'GENERATED by tools/gen_era_sites.mjs from the same data as public/sites/ — do not edit. Read by src/frame/siteViewer/ (the in-piece site viewer, browser and headset).',
    siteName: S.siteName, projectLine: S.projectLine, updated: S.updated, tabIds: TABS,
    tabs: S.tabs, tabsLabel: S.tabsLabel, contentNote: S.common.contentNote, records: S.common.records,
    hub: {
      title: H.title, lede: H.lede, choose: H.choose, doors: YEARS.map((y) => ({ year: y, who: people[y], text: H.doors[y] })),
      alsoTitle: H.alsoTitle, oldSources: H.oldSources, oldSourcesNote: H.oldSourcesNote,
      soundTitle: H.soundTitle, soundLead: H.soundLead, film: mediaModel(H.film), sound: H.sound.map(mediaModel),
      lexiconTitle: H.lexiconTitle, lexiconLead: H.lexiconLead, lexiconLinks: (links['lexicon#sources'] ?? []).map((l) => ({ label: l.label, url: l.url })),
      aboutTitle: H.aboutTitle, about: about.paragraphs, howTitle: H.howTitle, how: H.how
    },
    eras
  };
}

// ── build, write or check ───────────────────────────────────────────────────────────────────────────────────
const files = new Map([
  ['public/sites/index.html', hub()],
  ['public/sites/1997/index.html', site1997()],
  ['public/sites/2003/index.html', site2003()],
  ['public/sites/2016/index.html', site2016()],
  ['public/sites/2026/index.html', site2026()],
  ['data/strings/era_sites_model.json', JSON.stringify(viewerModel(), null, 1) + '\n']
]);

if (CHECK) {
  const stale = [...files].filter(([p, html]) => !existsSync(join(ROOT, p)) || text(p) !== html).map(([p]) => p);
  if (stale.length) { console.error(`era sites are STALE (run: node tools/gen_era_sites.mjs):\n  ${stale.join('\n  ')}`); process.exit(1); }
  console.log(`era sites up to date: ${files.size} pages match their data`);
} else {
  for (const [p, html] of files) {
    mkdirSync(dirname(join(ROOT, p)), { recursive: true });
    writeFileSync(join(ROOT, p), html);
  }
  const nLinks = Object.values(links).reduce((a, l) => a + l.length, 0) + Object.values(eraLinks).reduce((a, l) => a + l.length, 0);
  console.log(`wrote ${files.size} files (5 pages under public/sites/ + the viewer model) — ${nLinks} verified links on file`);
  for (const [year, spec] of used) console.log(`  ${year}: ${Object.entries(spec).map(([k, v]) => `${k}=${v}`).join(' ')}`);
}
