/**
 * R28-4 — THE GAME MENU (CLAUDE.md REINTERP AMENDMENTS §4; docs/
 * REINTERP_RESTRUCTURE_R28_2026-07-10.md §4 layer 2).
 *
 * A plain, non-diegetic DOM overlay — reinterp-only, mounted ONCE, before
 * either engine (3D or flat) even starts (see src/main.ts), so Esc and the
 * corner glyph work from the very first frame: the pre-fiction orienting
 * card, every opening beat, mid-ritual, every era. It sits OUTSIDE the
 * fiction — the desktop canvas (textured onto the monitor mesh) is the
 * fiction's UI; this is plain DOM chrome, same idiom as the existing
 * frame-voice elements (src/engine/app.ts's moveHint/tapeCaption/
 * tapeMuteBtn) — never drawn on the monitor texture.
 *
 * FRAME VOICE (CLAUDE.md "the frame never plays"): plain type, no
 * decoration, no sound, no animation beyond a simple fade. Functional and
 * undecorated — it never charms, never scores, never glitters.
 *
 * THE FRAME NEVER PLAYS, asserted in code, not just claimed: this file never
 * calls any witness-filing function, and it never appends to any of the
 * ledger's RECORD fields. Opening/closing the menu, and reading Controls or
 * Credits, are all invisible to the ledger and the witness record —
 * verified in 01_SESSION_LOG.md Session 36 by probing __ledger() before and
 * after driving every menu interaction. There are two deliberate exceptions,
 * and neither is the frame playing:
 *   · Restart/Leave WIPE the ledger via `wipeLedger()` — the opposite of
 *     filing, emptying it rather than adding to it, and exactly the
 *     in-memory-only invariant's own escape hatch (state/ledger.ts);
 *   · ⚑ S77 reads and writes ONE field, `ledger.view.unvoicedName`. The header
 *     used to say this file never imports `ledger` at all; that is now false
 *     and is corrected here rather than quietly. `view` is the ledger's
 *     documented home for the FRAME's own state — src/witness/ never reads it,
 *     nothing files from it, and it exists there only because this piece is
 *     allowed no other store at all — every browser-persistent one is
 *     forbidden outright by the hard invariants. Setting an accessibility
 *     preference is not filing, and this row never touches anything the record
 *     can see.
 *
 * ⚑ S87 — CREDITS NOW ALSO SURFACES THE E4 DOSSIER CARDS' SOURCED APPARATUS
 * (two new rows, two new views: `ballSources`/`offersSources`). This is
 * reference material — citations, confidence ratings, further reading — read
 * the same way the licensed-asset and cultural-influence rows already are; it
 * is not gameplay and files nothing, so it does not touch the "frame never
 * plays" assertion above. See the import comment below for what these two
 * files are and why only their `debrief` half is ever read here.
 */
import { ledger, wipeLedger } from '../state/ledger';
import { gameMenuBus } from '../state/gameMenuBus';
import copy from '../../data/strings/gameMenu.json';
import attributions from '../../data/strings/attributions.json';
// ⚑ S87 — THE TWO STRANDED E4 DOSSIER CARDS. `data/provotypes/e4_ball.json`
// (6 sourced entries + the credit paragraph) and `data/provotypes/e4_offers.json`
// (4 sourced entries) were never imported anywhere — each appeared exactly once,
// inside a comment (the old `src/desktop/apps/ball.ts:49` / `offers.ts:29`).
// Both files' own `states`/`invitation`/`frame` are explicitly "a record of the
// built beat, not a vignette to play" (their own `_doc`s) — E4 has no desktop
// and no provotype surface (THE_SPACE §6), so this file only ever reads their
// `debrief` (the sourced apparatus: citations, the contested Paris Is Burning /
// bell hooks entry, the housing-precarity finding, further reading). This is
// the same surface that already renders `attributions.json`'s named ballroom
// credit (below) — the credit obligation was always met; this is what was
// stranded on top of it. `e4_ball.json`'s own `_doc` says its reading surface
// "is the Close", which does not exist yet (see BUILD_QUEUE_LIVE.md S87 §3) —
// this attaches it to a surface that exists today instead.
import e4Ball from '../../data/provotypes/e4_ball.json';
import e4Offers from '../../data/provotypes/e4_offers.json';

type View = 'main' | 'controls' | 'credits' | 'ballSources' | 'offersSources' | 'restartConfirm';

interface DossierSource { status: string; confidence: string; text: string }
interface DossierCard { debrief: { body: string[]; sources: DossierSource[] } }

export interface GameMenu {
  destroy(): void;
}

/** above every other frame-chrome layer (flip button z=10, blink overlay
 *  z=8, moveHint/tapeCaption/tapeMuteBtn z=9) — the menu must win over all
 *  of them, including the pre-fiction orienting card (z=900, below this). */
const MENU_Z = 1000;
const GLYPH_Z = 999;

export function mountGameMenu(): GameMenu {
  let view: View = 'main';
  let destroyed = false;
  const canFullscreen = (): boolean =>
    document.fullscreenEnabled && typeof document.documentElement.requestFullscreen === 'function';

  // ── the persistent pause glyph (VR/no-keyboard parity, per CLAUDE.md's
  // "input" amendment: click/tap + the movement press + Esc/pause — this is
  // the click/tap route to the same law). Bottom-LEFT: the existing flip
  // control (⟲, "turn around") already owns bottom-right. ──
  const glyph = document.createElement('button');
  glyph.id = 'reinterp-menu-glyph';
  glyph.textContent = copy.pauseGlyphSymbol;
  glyph.title = copy.pauseGlyphLabel;
  glyph.setAttribute('aria-label', copy.pauseGlyphLabel);
  Object.assign(glyph.style, {
    position: 'fixed', left: '14px', bottom: '14px', zIndex: String(GLYPH_Z),
    width: '34px', height: '34px', borderRadius: '3px',
    background: 'rgba(10,10,14,0.78)', color: '#cdd3df', border: '1px solid #444',
    font: '13px monospace', letterSpacing: '1px', cursor: 'pointer'
  } as CSSStyleDeclaration);
  glyph.addEventListener('click', () => gameMenuBus.toggle());
  document.body.appendChild(glyph);

  // ── the overlay itself ──
  const root = document.createElement('div');
  root.id = 'reinterp-game-menu';
  Object.assign(root.style, {
    position: 'fixed', inset: '0', zIndex: String(MENU_Z),
    display: 'none', alignItems: 'center', justifyContent: 'center',
    background: 'rgba(6,6,9,0.82)',
    font: '13px "Courier New", monospace', color: '#dfe3ea',
    opacity: '0', transition: 'opacity 0.18s'
  } as CSSStyleDeclaration);

  const panel = document.createElement('div');
  Object.assign(panel.style, {
    width: 'min(420px, 90vw)', maxHeight: '82vh', overflowY: 'auto',
    boxSizing: 'border-box', padding: '22px 26px',
    background: '#101014', border: '1px solid #383840', borderRadius: '2px'
  } as CSSStyleDeclaration);
  root.appendChild(panel);
  document.body.appendChild(root);

  function clear(): void {
    panel.innerHTML = '';
  }

  function heading(text: string): void {
    const h = document.createElement('div');
    Object.assign(h.style, {
      fontSize: '15px', fontWeight: '700', letterSpacing: '1px',
      marginBottom: '16px', color: '#f2f4f8'
    } as CSSStyleDeclaration);
    h.textContent = text;
    panel.appendChild(h);
  }

  function paragraph(text: string): void {
    const p = document.createElement('div');
    Object.assign(p.style, {
      fontSize: '12px', lineHeight: '1.6', color: '#b7bcc6', margin: '0 0 14px'
    } as CSSStyleDeclaration);
    p.textContent = text;
    panel.appendChild(p);
  }

  function row(label: string, onClick: () => void, emphasis = false): void {
    const b = document.createElement('button');
    b.textContent = label;
    Object.assign(b.style, {
      display: 'block', width: '100%', textAlign: 'left', font: 'inherit',
      color: emphasis ? '#ffffff' : '#dfe3ea',
      background: 'transparent', border: '1px solid #303038',
      padding: '10px 12px', margin: '0 0 8px', cursor: 'pointer', borderRadius: '2px'
    } as CSSStyleDeclaration);
    b.addEventListener('mouseenter', () => { b.style.borderColor = '#5a5a66'; });
    b.addEventListener('mouseleave', () => { b.style.borderColor = '#303038'; });
    b.addEventListener('click', onClick);
    panel.appendChild(b);
  }

  function backRow(target: View = 'main'): void {
    row(copy.back, () => { view = target; render(); });
  }

  /** ⚑ S87 — one line per source, same status/confidence/text grouping
   *  `src/desktop/apps/provotype.ts`'s canvas debrief already uses, in this
   *  file's own plain-paragraph idiom (no color coding here — frame voice is
   *  undecorated). Only `debrief` is ever read; see the import comment above
   *  for why the rest of these files' schema-shaped content is not.
   *
   *  ⚑ `confidence` is NOT appended with the word "confidence" the way
   *  `provotype.ts`'s canvas debrief does it (`"high confidence"`) — that
   *  reads fine for `e4_ball.json`'s bare labels ("high", "medium") but
   *  breaks for `e4_offers.json`'s, which are full phrases ("none — this is
   *  our extrapolation", "medium — sourced once, not yet its own pass") and
   *  would render as "…extrapolation confidence". Bracketing status and
   *  confidence together instead reads correctly for both files without
   *  editing either's already-authored copy. */
  function sourcesView(card: DossierCard, title: string): void {
    heading(title);
    for (const line of card.debrief.body) paragraph(line);
    for (const s of card.debrief.sources) {
      paragraph(`[${s.status} · ${s.confidence}] ${s.text}`);
    }
    backRow('credits');
  }

  function render(): void {
    clear();
    if (view === 'main') {
      heading(copy.title);
      row(copy.resume, () => gameMenuBus.close(), true);
      // ⚑ S80 — RECENTRE, and it belongs here rather than in the fiction for
      // the same reason the caption chrome does: it is the frame telling the
      // player where the room's front is. Only drawn when an engine with a
      // camera has offered one (flat mode and the pre-fiction card have none).
      // It is load-bearing, not plumbing: iOS gives no reliable absolute
      // heading, so device-look yaw is relative to a zero and drifts — and
      // this piece's one bodily ask is the turn, which makes *where forward is*
      // part of the work.
      if (gameMenuBus.recentreView) {
        row(copy.recentre, () => { gameMenuBus.recentreView?.(); gameMenuBus.close(); });
      }
      // S84 — frame-level display control. iPad Safari exposes the standard
      // API; iPhone Safari may not. Absence is a fact, so the row is omitted
      // rather than presented as a dead promise. Add to Home Screen remains
      // the more complete iOS exhibition path via index.html + the manifest.
      if (canFullscreen()) {
        row(document.fullscreenElement ? copy.fullscreenExit : copy.fullscreenEnter, () => {
          const request = document.fullscreenElement
            ? document.exitFullscreen()
            : document.documentElement.requestFullscreen();
          void request.catch(() => { /* browser kept its current display mode */ });
          gameMenuBus.close();
        });
      }
      // ⚑ S77 — THE UNVOICED OPT-OUT, and it lives HERE for the reason the
      // whole beat depends on: an opt-out the apparatus offers you is not an
      // opt-out. Accessibility belongs to the frame (Sérgio, 2026-08-06: "if it
      // is in the menu setting, then it's okay"). It is always shown, in every
      // era and from the pre-fiction panel on — a setting that only appeared
      // once the beat was imminent would be the piece announcing the beat, and
      // a warning you can only find after you needed it is not one.
      // ⚑ IT NEVER REMOVES THE MEANING: with it on, the subtitle still says the
      // system used a name Maya does not use. Only the audio is withheld. The
      // advisory that tells the player this exists is on the pre-fiction panel
      // (src/desktop/orientingCard.ts), which is the last surface before the
      // fiction starts and the only place an advisory can honestly go.
      row(
        ledger.view.unvoicedName ? copy.unvoicedNameOn : copy.unvoicedNameOff,
        () => { ledger.view.unvoicedName = !ledger.view.unvoicedName; render(); }
      );
      paragraph(copy.unvoicedNameNote);
      row(copy.restart, () => { view = 'restartConfirm'; render(); });
      row(copy.controls, () => { view = 'controls'; render(); });
      row(copy.credits, () => { view = 'credits'; render(); });
      row(copy.leave, () => doLeave());
      return;
    }
    if (view === 'restartConfirm') {
      heading(copy.restartConfirmTitle);
      paragraph(copy.restartConfirmBody);
      row(copy.restartConfirmYes, () => doRestart());
      row(copy.restartConfirmNo, () => { view = 'main'; render(); });
      return;
    }
    if (view === 'controls') {
      heading(copy.controlsTitle);
      for (const line of copy.controlsLines) paragraph(line);
      backRow();
      return;
    }
    if (view === 'credits') {
      heading(copy.creditsTitle);
      paragraph(attributions.projectLine);
      if (attributions.entries.length === 0) {
        paragraph(copy.creditsNone);
      } else {
        for (const e of attributions.entries) {
          paragraph(`${e.asset} — ${e.creator}. ${e.license}. Used as: ${e.usedAs}.`);
        }
      }
      // ⚑ S79 — CULTURAL INFLUENCE, below the licensed assets and in the same
      // undecorated type. A licence covers a model file; it does not cover an
      // homage to a living culture, and the provenance pass
      // (docs/research/BALLROOM_PROVENANCE_2026-08-06.md §5) is explicit that
      // crediting such a culture in the abstract repeats the extraction pattern
      // rather than correcting it — so this paragraph names the lineage. Source
      // of truth is docs/reinterp/ATTRIBUTIONS.md, baked by gen_attributions.
      for (const line of attributions.influences ?? []) paragraph(line);
      // ⚑ S87 — THE SOURCED APPARATUS, below the named credit above. The row
      // above names Crystal and Lottie LaBeija and the House of LaBeija — the
      // credit obligation was always met. These two rows are the citations
      // that back it: the contested Paris Is Burning / bell hooks entry, the
      // housing-precarity finding, further reading, and (offers) the four
      // sources behind Era 4's most speculative and most documented beats.
      row(copy.creditsBallSources, () => { view = 'ballSources'; render(); });
      row(copy.creditsOffersSources, () => { view = 'offersSources'; render(); });
      backRow();
      return;
    }
    if (view === 'ballSources') {
      sourcesView(e4Ball as unknown as DossierCard, copy.ballSourcesTitle);
      return;
    }
    if (view === 'offersSources') {
      sourcesView(e4Offers as unknown as DossierCard, copy.offersSourcesTitle);
    }
  }

  /** wipes the ledger (the invariant's own reset — see state/ledger.ts) and
   *  reloads: the simplest guarantee of "returns to the orienting card" with
   *  genuinely nothing left in memory, correct from ANY state the menu can
   *  be opened from (pre-fiction card, any era, mid-ritual). A judgment call
   *  flagged in 01_SESSION_LOG.md Session 36 rather than an in-place engine
   *  teardown/rebuild, which would be far riskier to get right this session. */
  function doRestart(): void {
    wipeLedger();
    window.location.reload();
  }

  /** the existing leave flow (DesktopOS.leaveNow — wipes the ledger, shows
   *  the pre-existing "You left." canvas screen, hides the flip control) via
   *  gameMenuBus.leaveEngine, wired once the real engine exists. Before that
   *  (still on the pre-fiction orienting card) there is nothing to hand off
   *  to yet, so a reload is the only clean "leave" available at that stage. */
  function doLeave(): void {
    wipeLedger();
    if (gameMenuBus.leaveEngine) {
      gameMenuBus.leaveEngine();
      gameMenuBus.close();
    } else {
      window.location.reload();
    }
  }

  function setOpenVisual(open: boolean): void {
    if (open) {
      view = 'main';
      render();
      root.style.display = 'flex';
      requestAnimationFrame(() => { root.style.opacity = '1'; });
    } else {
      root.style.opacity = '0';
      window.setTimeout(() => {
        if (!gameMenuBus.isOpen) root.style.display = 'none';
      }, 200);
    }
  }

  const unsubscribe = gameMenuBus.onChange(setOpenVisual);
  const onFullscreenChange = (): void => {
    if (gameMenuBus.isOpen && view === 'main') render();
  };
  document.addEventListener('fullscreenchange', onFullscreenChange);

  // ── Esc, from EVERY state (CLAUDE.md REINTERP AMENDMENTS §3/§4) ──
  // Registered on `window` with `capture: true`: capture-phase listeners on
  // window always run before any bubble-phase listener on the same target,
  // regardless of registration order — so this always wins over the 3D
  // engine's / flat mode's own `window.addEventListener('keydown', ...)`
  // (both bubble-phase, unconditional). `stopImmediatePropagation()` then
  // stops those listeners from ever seeing the Escape keydown at all, so the
  // pre-existing shipped-build behaviours they carry for Escape (DesktopOS's
  // own on-canvas pause screen; flipping back from the witness side) are
  // fully and safely superseded for reinterp — this menu is Esc's only
  // owner whenever it exists, which is only ever under ?reinterp=1.
  const onKeydown = (e: KeyboardEvent): void => {
    if (e.key !== 'Escape') return;
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    gameMenuBus.toggle();
    e.preventDefault();
    e.stopImmediatePropagation();
  };
  window.addEventListener('keydown', onKeydown, { capture: true });

  return {
    destroy(): void {
      if (destroyed) return;
      destroyed = true;
      unsubscribe();
      document.removeEventListener('fullscreenchange', onFullscreenChange);
      window.removeEventListener('keydown', onKeydown, { capture: true });
      glyph.remove();
      root.remove();
    }
  };
}
