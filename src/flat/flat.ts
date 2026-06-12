/**
 * ?flat=1 — the universal fallback (AGENTS.md invariant; Codex review Gap C).
 * Renders the desktop canvas alone, no WebGL, no room: classrooms, archival
 * use, low-end machines, debugging. Same OS, same ledger, same flip grammar
 * (F2/⟲ swaps to the witness record; ESC returns) — only the body is gone.
 */
import { DesktopOS } from '../desktop/os';
import { WitnessCanvas } from '../witness/intake';
import { ledger } from '../state/ledger';
import { ERA1_CANVAS } from '../desktop/theme/era1';

export function startFlat(canvasEl: HTMLCanvasElement): void {
  const ctx = canvasEl.getContext('2d');
  if (!ctx) throw new Error('2D context unavailable');

  const os = new DesktopOS();
  const witness = new WitnessCanvas();
  let facingBack = false;
  let flipCount = 0;

  function resize(): void {
    canvasEl.width = window.innerWidth * devicePixelRatio;
    canvasEl.height = window.innerHeight * devicePixelRatio;
    canvasEl.style.width = '100vw';
    canvasEl.style.height = '100vh';
  }
  resize();
  window.addEventListener('resize', resize);

  /** letterboxed destination rect of the desktop on the window */
  function destRect(): { x: number; y: number; w: number; h: number } {
    const scale = Math.min(canvasEl.width / ERA1_CANVAS.width, canvasEl.height / ERA1_CANVAS.height);
    const w = ERA1_CANVAS.width * scale;
    const h = ERA1_CANVAS.height * scale;
    return { x: (canvasEl.width - w) / 2, y: (canvasEl.height - h) / 2, w, h };
  }

  function toLogical(e: MouseEvent): { x: number; y: number } | null {
    const r = destRect();
    const px = e.clientX * devicePixelRatio;
    const py = e.clientY * devicePixelRatio;
    const u = (px - r.x) / r.w;
    const v = (py - r.y) / r.h;
    if (u < 0 || u > 1 || v < 0 || v > 1) return null;
    return { x: u * ERA1_CANVAS.width, y: v * ERA1_CANVAS.height };
  }

  const flipBtn = document.createElement('button');
  flipBtn.id = 'flip';
  flipBtn.textContent = '⟲';
  flipBtn.title = 'turn around (F2)';
  flipBtn.setAttribute('aria-label', 'turn around (F2)');
  Object.assign(flipBtn.style, {
    position: 'fixed', right: '14px', bottom: '14px', zIndex: '10',
    width: '36px', height: '36px', borderRadius: '18px',
    background: 'rgba(20,20,28,0.85)', color: '#667', border: '1px solid #334',
    font: '16px monospace', cursor: 'pointer', display: 'none',
    transition: 'color 0.3s, border-color 0.3s'
  } as CSSStyleDeclaration);
  document.body.appendChild(flipBtn);

  os.onFlipReady = () => {
    flipBtn.style.color = '#ffd';
    flipBtn.style.borderColor = '#ffd';
  };
  os.onLeave = () => { flipBtn.style.display = 'none'; };

  function doFlip(): void {
    if (!os.inDesktop || os.paused) return;
    facingBack = !facingBack;
    canvasEl.style.cursor = facingBack ? 'not-allowed' : 'default';
    flipBtn.style.color = '#667';
    flipBtn.style.borderColor = '#334';
    if (facingBack) {
      flipCount++;
      ledger.flips = flipCount;
      if (!ledger.records.includes('ministry-index-card')) {
        ledger.records.push('ministry-index-card');
      }
      witness.messagesOnFile = os.irc ? os.irc.userMessageCount : 0;
    } else if (flipCount > 0) {
      os.unlockDossier();
    }
  }
  flipBtn.addEventListener('click', doFlip);

  canvasEl.addEventListener('pointerdown', (e) => {
    if (facingBack) return;
    const p = toLogical(e);
    if (p) os.handleClick(p.x, p.y);
  });
  canvasEl.addEventListener('pointermove', (e) => {
    if (facingBack) return;
    const p = toLogical(e);
    if (p) os.handleMove(p.x, p.y);
  });
  window.addEventListener('keydown', (e) => {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    if (e.key === 'F2' && os.inDesktop && !os.paused) {
      doFlip();
      e.preventDefault();
      return;
    }
    if (facingBack) {
      if (e.key === 'Escape') doFlip();
      e.preventDefault();
      return;
    }
    if (os.handleKey(e.key)) e.preventDefault();
  });

  let last = performance.now();
  function frame(now: number): void {
    const dt = Math.min(0.1, (now - last) / 1000);
    last = now;
    os.update(dt);
    witness.update(dt);
    ctx!.imageSmoothingEnabled = false;
    ctx!.fillStyle = '#000';
    ctx!.fillRect(0, 0, canvasEl.width, canvasEl.height);
    const r = destRect();
    ctx!.drawImage(facingBack ? witness.canvas : os.canvas, r.x, r.y, r.w, r.h);
    if (os.inDesktop) flipBtn.style.display = 'block';
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}
