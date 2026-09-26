// Abstract artwork that fills image spaces until real photos are added. Each
// direction has its own style; the same name always gives the same picture.
// It is deliberately artwork, never a fake photo of a product or person.
import type { Direction } from './schema';

function rng(seed: string) {
  let h = 2166136261;
  for (const c of seed) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return () => {
    h ^= h << 13; h ^= h >>> 17; h ^= h << 5;
    return ((h >>> 0) % 10000) / 10000;
  };
}
const pick = <T,>(r: () => number, a: readonly T[]) => a[Math.floor(r() * a.length)];
const f = (n: number) => n.toFixed(1);

const PALETTES: Record<Direction, { bg: string[]; ink: string[] }> = {
  editorial: { bg: ['#efe7da', '#e8dfd1', '#f3ede3', '#e2d6c3'], ink: ['#7a5a1e', '#b08d4c', '#1c1917', '#0f3d2e'] },
  bold: { bg: ['#ff9f1c', '#c8135f', '#2b0a3d', '#ffd23f', '#1fb8a6'], ink: ['#fff6e5', '#22061f', '#ff9f1c', '#c8135f', '#ffd23f'] },
  cinematic: { bg: ['#101012', '#16110f', '#0d0f14'], ink: ['#ff5a1f', '#ffb347', '#c2410c', '#f4f1ea'] },
  crafted: { bg: ['#ead9bf', '#e4cfae', '#efe2cc', '#dcc4a0'], ink: ['#a8481f', '#5f6f2f', '#3b2a1e', '#c98b4a', '#f7efe2'] },
};

export function artSvg(direction: Direction, seed: string, w = 800, h = 1000, label = ''): string {
  const r = rng(`${direction}:${seed}`);
  const p = PALETTES[direction];
  const bg = pick(r, p.bg);
  const id = `a${Math.floor(r() * 1e8).toString(36)}`;
  let body = '';
  const cx = w * (0.35 + r() * 0.3), cy = h * (0.35 + r() * 0.3), m = Math.min(w, h);
  if (direction === 'editorial') {
    const c = pick(r, p.ink);
    body += `<defs><linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fbf8f2"/><stop offset="1" stop-color="${bg}"/></linearGradient></defs><rect width="${w}" height="${h}" fill="url(#${id})"/>`;
    body += `<circle cx="${f(cx)}" cy="${f(cy)}" r="${f(m * (0.28 + r() * 0.1))}" fill="none" stroke="${c}" stroke-width="1.2" opacity=".7"/>`;
    body += `<ellipse cx="${f(cx)}" cy="${f(cy + m * 0.05)}" rx="${f(m * 0.16)}" ry="${f(m * 0.05)}" fill="none" stroke="${c}" stroke-width="${f(m * 0.018)}" opacity=".85"/>`;
    body += `<circle cx="${f(cx)}" cy="${f(cy - m * 0.02)}" r="${f(m * 0.035)}" fill="${c}" opacity=".9"/>`;
    body += `<line x1="${f(w * 0.08)}" y1="${f(h * 0.9)}" x2="${f(w * 0.92)}" y2="${f(h * 0.9)}" stroke="${c}" stroke-width="1" opacity=".35"/>`;
  } else if (direction === 'bold') {
    body += `<rect width="${w}" height="${h}" fill="${bg}"/>`;
    const inks = p.ink.filter((x) => x !== bg);
    for (let i = 0; i < 3; i++) {
      const rr = m * (0.18 + r() * 0.22);
      const x = w * r(), y = h * r();
      const k = pick(r, inks);
      body += r() > 0.5
        ? `<circle cx="${f(x)}" cy="${f(y)}" r="${f(rr)}" fill="${k}"/>`
        : `<rect x="${f(x - rr)}" y="${f(y - rr)}" width="${f(rr * 2)}" height="${f(rr * 2)}" rx="${f(rr * 0.5)}" fill="${k}" transform="rotate(${f(r() * 40 - 20)} ${f(x)} ${f(y)})"/>`;
    }
    for (let i = 0; i < 14; i++) body += `<circle cx="${f(w * r())}" cy="${f(h * r())}" r="${f(m * 0.012 + r() * m * 0.012)}" fill="${pick(r, inks)}"/>`;
  } else if (direction === 'cinematic') {
    const glow = pick(r, p.ink.slice(0, 3));
    body += `<defs><radialGradient id="${id}" cx="${f((cx / w) * 100)}%" cy="${f((cy / h) * 100)}%" r="60%"><stop offset="0" stop-color="${glow}" stop-opacity=".75"/><stop offset=".45" stop-color="${glow}" stop-opacity=".12"/><stop offset="1" stop-color="${bg}" stop-opacity="0"/></radialGradient>`;
    body += `<radialGradient id="${id}b"><stop offset="0" stop-color="#ffd8a8" stop-opacity=".55"/><stop offset="1" stop-color="#ffd8a8" stop-opacity="0"/></radialGradient></defs>`;
    body += `<rect width="${w}" height="${h}" fill="${bg}"/><rect width="${w}" height="${h}" fill="url(#${id})"/>`;
    for (let i = 0; i < 9; i++) body += `<circle cx="${f(w * r())}" cy="${f(h * r())}" r="${f(m * (0.02 + r() * 0.07))}" fill="url(#${id}b)"/>`;
  } else {
    body += `<rect width="${w}" height="${h}" fill="${bg}"/>`;
    const blob = (x: number, y: number, s: number, fill: string) => {
      const pts = Array.from({ length: 7 }, (_, i) => {
        const a = (i / 7) * Math.PI * 2, d = s * (0.75 + r() * 0.4);
        return [x + Math.cos(a) * d, y + Math.sin(a) * d];
      });
      let d = `M${f(pts[0][0])} ${f(pts[0][1])}`;
      for (let i = 0; i < pts.length; i++) {
        const [x1, y1] = pts[(i + 1) % pts.length], [x0, y0] = pts[i];
        d += ` Q${f(x0)} ${f(y0)} ${f((x0 + x1) / 2)} ${f((y0 + y1) / 2)}`;
      }
      return `<path d="${d}Z" fill="${fill}"/>`;
    };
    body += blob(cx, cy, m * 0.3, pick(r, p.ink.slice(0, 2)));
    body += blob(cx + m * 0.22, cy + m * 0.18, m * 0.14, pick(r, p.ink.slice(2)));
    for (let i = 0; i < 5; i++) {
      const x = w * r(), y = h * r();
      body += `<path d="M${f(x)} ${f(y)} q ${f(m * 0.03)} ${f(-m * 0.05)} ${f(m * 0.07)} 0" fill="none" stroke="#3b2a1e" stroke-width="2.5" stroke-linecap="round" opacity=".5"/>`;
    }
  }
  const a11y = label ? `role="img" aria-label="${label.replace(/[&<>"']/g, '')}"` : 'aria-hidden="true"';
  return `<svg class="d-art" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" preserveAspectRatio="xMidYMid slice" ${a11y}>${body}</svg>`;
}
