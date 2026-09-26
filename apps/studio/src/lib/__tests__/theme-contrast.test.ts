import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

// Every text/background pair the studio uses must be readable (WCAG AA) in both themes.
const css = readFileSync(join(__dirname, '../../app/globals.css'), 'utf8');
function block(start: string) {
  const i = css.indexOf(start);
  return css.slice(i, css.indexOf('}', i));
}
const vars = (b: string) => Object.fromEntries([...b.matchAll(/--([a-z-]+):\s*(#[0-9a-f]{6})/gi)].map((m) => [m[1], m[2]]));
const light = vars(block(':root {'));
const dark = { ...light, ...vars(block(':root[data-theme="dark"] {')) };
const mediaDark = { ...light, ...vars(block(':root:not([data-theme="light"]) {')) };

function lum(hex: string) {
  const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
}
const ratio = (a: string, b: string) => { const [x, y] = [lum(a), lum(b)].sort((m, n) => n - m); return (x + 0.05) / (y + 0.05); };

const PAIRS: [fg: string, bg: string][] = [
  ['ink', 'page'], ['ink', 'card'], ['muted', 'page'], ['muted', 'card'], ['brand', 'card'], ['brand', 'page'],
  ['primary', 'card'], ['primary', 'page'], ['on-primary', 'primary'], ['on-accent', 'accent'], ['on-bad', 'bad'],
  ['good', 'card'], ['bad', 'card'], ['warn', 'accent-soft'],
];

describe('studio colours', () => {
  for (const [name, set] of [['light', light], ['dark', dark]] as const) {
    it(`${name} theme: every pair is readable`, () => {
      for (const [fg, bg] of PAIRS) expect(ratio(set[fg], set[bg]), `${fg} on ${bg}`).toBeGreaterThanOrEqual(4.5);
      expect(ratio('#ffffff', set.chrome), 'menu text').toBeGreaterThanOrEqual(7);
    });
  }
  it('the device-following dark theme matches the chosen dark theme', () => {
    expect(mediaDark).toEqual(dark);
  });
});
