// Custom colours must stay readable: WCAG AA (4.5:1) for text on its background.
import type { Direction } from './schema';

export type Colours = { bg: string; surface: string; ink: string; muted: string; accent: string; accentInk: string; invertBg: string; invertAccent: string; pop: string; popInk: string };
export const DEFAULTS: Record<Direction, Colours> = {
  editorial: { bg: '#f7f3ec', surface: '#fffdf8', ink: '#1c1917', muted: '#6b635a', accent: '#7a5a1e', accentInk: '#fffdf8', invertBg: '#1c1917', invertAccent: '#d4b26a', pop: '#0f3d2e', popInk: '#f7f3ec' },
  bold: { bg: '#fff6e5', surface: '#ffffff', ink: '#22061f', muted: '#6e4c66', accent: '#c8135f', accentInk: '#ffffff', invertBg: '#2b0a3d', invertAccent: '#ff9f1c', pop: '#ff9f1c', popInk: '#22061f' },
  cinematic: { bg: '#0b0b0c', surface: '#151517', ink: '#f4f1ea', muted: '#a39f97', accent: '#ff5a1f', accentInk: '#0b0b0c', invertBg: '#f4f1ea', invertAccent: '#c2410c', pop: '#ffb347', popInk: '#0b0b0c' },
  crafted: { bg: '#f3e8d6', surface: '#fbf5ea', ink: '#3b2a1e', muted: '#6f5a47', accent: '#a8481f', accentInk: '#fff8ee', invertBg: '#3b2a1e', invertAccent: '#e8a06a', pop: '#5f6f2f', popInk: '#fbf5ea' },
};

function lum(hex: string) {
  const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
}
export function contrast(a: string, b: string) {
  const [x, y] = [lum(a), lum(b)].sort((m, n) => n - m);
  return (x + 0.05) / (y + 0.05);
}

const PAIRS: [fg: 'ink' | 'muted' | 'accentInk' | 'accent', bg: 'bg' | 'surface' | 'accent', what: string][] = [
  ['ink', 'bg', 'Main text on the page background'],
  ['ink', 'surface', 'Main text on cards'],
  ['muted', 'bg', 'Secondary text on the page background'],
  ['muted', 'surface', 'Secondary text on cards'],
  ['accentInk', 'accent', 'Button text on the accent colour'],
];

/** Plain-language problems with a custom palette; empty when it is readable. */
export function checkPalette(dir: Direction, palette: Partial<Record<string, string>> | undefined): string[] {
  if (!palette) return [];
  const p = { ...DEFAULTS[dir], ...Object.fromEntries(Object.entries(palette).filter(([, v]) => v)) } as Colours;
  return PAIRS.filter(([f, b]) => contrast(p[f], p[b]) < 4.5).map(([f, b, what]) =>
    `${what} is too faint to read (${contrast(p[f], p[b]).toFixed(1)}:1, needs at least 4.5:1). Try a darker or lighter ${f === 'accentInk' ? 'button text' : 'text'} colour.`);
}

/** Colours for an animated background: the section's own fill first, then the dots/glows drawn on it. */
export function backgroundColours(dir: Direction, palette: Partial<Record<string, string>> | undefined, tone: string): string {
  const p = { ...DEFAULTS[dir], ...Object.fromEntries(Object.entries(palette ?? {}).filter(([, v]) => v)) } as Colours;
  const set = tone === 'invert' ? [p.invertBg, p.invertAccent, p.pop] : tone === 'accent' ? [p.accent, p.accentInk, p.accentInk] : tone === 'pop' ? [p.pop, p.popInk, p.accent] : [p.bg, p.accent, p.pop];
  return set.join(',');
}
