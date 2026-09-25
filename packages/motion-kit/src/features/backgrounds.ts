import type { Feature } from './types';
import { colors, whenVisible } from '../observe';
import { onTick } from '../loop';
import type { Env } from '../env';

// data-sf-bg="aurora|particles|waves"  data-sf-colors="#1e1b4b,#f5a524,#7c3aed"
// Draws only while on screen; phones get fewer particles and 30fps.
type Painter = (ctx: CanvasRenderingContext2D, w: number, h: number, t: number) => void;

function hexToRgb(hex: string) {
  const h = hex.length === 4 ? hex.replace(/./g, (c, i) => (i ? c + c : '#')) : hex;
  const n = parseInt(h.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255] as const;
}
const rgba = (hex: string, a: number) => `rgba(${hexToRgb(hex).join(',')},${a})`;

function aurora(palette: string[]): Painter {
  const blobs = palette.slice(1).concat(palette.slice(1)).slice(0, 4).map((c, i) => ({ c, s: 0.00008 + i * 0.00003, p: i * 1.7 }));
  return (ctx, w, h, t) => {
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = palette[0];
    ctx.fillRect(0, 0, w, h);
    ctx.globalCompositeOperation = 'lighter';
    for (const b of blobs) {
      const x = w * (0.5 + 0.38 * Math.sin(t * b.s * 7 + b.p));
      const y = h * (0.5 + 0.32 * Math.cos(t * b.s * 5 + b.p * 1.3));
      const r = Math.max(w, h) * 0.55;
      const g = ctx.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, rgba(b.c, 0.55));
      g.addColorStop(1, rgba(b.c, 0));
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
    }
  };
}

function particles(palette: string[], env: Env, host: HTMLElement): Painter {
  type P = { x: number; y: number; vx: number; vy: number };
  let pts: P[] = [];
  let mx = -1e4, my = -1e4;
  if (env.finePointer) {
    host.addEventListener('pointermove', (e) => {
      const r = host.getBoundingClientRect();
      mx = e.clientX - r.left;
      my = e.clientY - r.top;
    });
    host.addEventListener('pointerleave', () => { mx = my = -1e4; });
  }
  return (ctx, w, h) => {
    const target = Math.min(env.tier === 'full' ? 110 : 40, Math.round((w * h) / 9000));
    while (pts.length < target) pts.push({ x: Math.random() * w, y: Math.random() * h, vx: (Math.random() - 0.5) * 0.35, vy: (Math.random() - 0.5) * 0.35 });
    if (pts.length > target) pts = pts.slice(0, target);
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = palette[0];
    ctx.fillRect(0, 0, w, h);
    const dotColor = palette[1] ?? '#ffffff';
    const lineColor = palette[2] ?? dotColor;
    for (const p of pts) {
      const dx = p.x - mx, dy = p.y - my, d2 = dx * dx + dy * dy;
      if (d2 < 12000) { p.vx += dx / 4000; p.vy += dy / 4000; }
      p.vx *= 0.99; p.vy *= 0.99;
      p.x = (p.x + p.vx + 0.15 + w) % w;
      p.y = (p.y + p.vy + h) % h;
    }
    ctx.lineWidth = 1;
    for (let i = 0; i < pts.length; i++) {
      for (let j = i + 1; j < pts.length; j++) {
        const a = pts[i], b = pts[j];
        const d = Math.hypot(a.x - b.x, a.y - b.y);
        if (d < 110) {
          ctx.strokeStyle = rgba(lineColor, (1 - d / 110) * 0.35);
          ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
        }
      }
    }
    ctx.fillStyle = dotColor;
    for (const p of pts) { ctx.beginPath(); ctx.arc(p.x, p.y, 1.8, 0, Math.PI * 2); ctx.fill(); }
  };
}

function waves(palette: string[]): Painter {
  const layers = palette.slice(1).length ? palette.slice(1) : ['#ffffff'];
  return (ctx, w, h, t) => {
    ctx.fillStyle = palette[0];
    ctx.fillRect(0, 0, w, h);
    layers.forEach((c, i) => {
      const amp = h * (0.05 + i * 0.02);
      const base = h * (0.55 + i * 0.12);
      const k = (Math.PI * 2) / (w * (0.9 - i * 0.15));
      ctx.fillStyle = rgba(c, 0.45 + i * 0.15);
      ctx.beginPath();
      ctx.moveTo(0, h);
      for (let x = 0; x <= w; x += 12) ctx.lineTo(x, base + Math.sin(x * k + t * 0.0006 * (i + 1)) * amp);
      ctx.lineTo(w, h);
      ctx.closePath();
      ctx.fill();
    });
  };
}

const DEFAULT = ['#14132e', '#4338ca', '#f5a524', '#7c3aed'];

export const backgrounds: Feature = {
  selector: '[data-sf-bg]',
  setup(host, env) {
    const kind = host.getAttribute('data-sf-bg');
    const palette = colors(host, DEFAULT);
    const canvas = document.createElement('canvas');
    canvas.className = 'sf-bg-canvas';
    canvas.setAttribute('aria-hidden', 'true');
    host.classList.add('sf-bg');
    host.prepend(canvas);
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const paint: Painter = kind === 'particles' ? particles(palette, env, host) : kind === 'waves' ? waves(palette) : aurora(palette);
    const dpr = Math.min(window.devicePixelRatio || 1, env.tier === 'full' ? 2 : 1);
    let w = 0, h = 0;
    const resize = () => {
      w = host.clientWidth; h = host.clientHeight;
      canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      paint(ctx, w, h, 0);
    };
    const ro = new ResizeObserver(resize);
    ro.observe(host);
    resize();
    if (env.tier === 'static') return () => { ro.disconnect(); canvas.remove(); };
    let acc = 0;
    const minFrame = env.tier === 'lite' ? 33 : 0;
    let stopTick: (() => void) | null = null;
    const tick = (t: number, dt: number) => {
      acc += dt;
      if (acc < minFrame) return;
      acc = 0;
      paint(ctx, w, h, t);
      host.dataset.sfFrames = String(Number(host.dataset.sfFrames ?? 0) + 1);
    };
    const stop = whenVisible(host, () => { stopTick ??= onTick(tick); }, () => { stopTick?.(); stopTick = null; }, { rootMargin: '0px' });
    return () => { stop(); stopTick?.(); ro.disconnect(); canvas.remove(); };
  },
};
