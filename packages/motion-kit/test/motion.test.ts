import { describe, expect, it } from 'vitest';
import { detect } from '../src/env';
import { splitText } from '../src/features/split';
import { HOOKS } from '../src/hooks';

function fakeWindow(opts: { reduce?: boolean; fine?: boolean; width?: number; cores?: number; mem?: number; saveData?: boolean; search?: string }) {
  return {
    innerWidth: opts.width ?? 1280,
    location: { search: opts.search ?? '' },
    navigator: { hardwareConcurrency: opts.cores ?? 8, deviceMemory: opts.mem ?? 8, connection: { saveData: opts.saveData ?? false, effectiveType: '4g' } },
    matchMedia: (q: string) => ({ matches: q.includes('reduced-motion') ? !!opts.reduce : q.includes('pointer: fine') || q.includes('hover: hover') ? opts.fine ?? true : false }),
  } as unknown as Window;
}

describe('device detection', () => {
  it('gives computers the full experience', () => {
    expect(detect(fakeWindow({}))).toMatchObject({ tier: 'full', finePointer: true, lowPower: false });
  });
  it('respects "reduce motion" above everything', () => {
    expect(detect(fakeWindow({ reduce: true })).tier).toBe('static');
    expect(detect(fakeWindow({ search: '?sf-motion=reduce' })).tier).toBe('static');
  });
  it('scales down on phones and low-power devices', () => {
    expect(detect(fakeWindow({ width: 360, fine: false })).tier).toBe('lite');
    expect(detect(fakeWindow({ mem: 2 })).lowPower).toBe(true);
    expect(detect(fakeWindow({ cores: 2 })).lowPower).toBe(true);
    expect(detect(fakeWindow({ saveData: true })).tier).toBe('lite');
    expect(detect(fakeWindow({ search: '?sf-lowpower=1' })).lowPower).toBe(true);
  });
});

describe('split headlines', () => {
  it('splits words but keeps the sentence readable for screen readers', () => {
    const h1 = document.createElement('h1');
    h1.innerHTML = 'Sweets made <em>fresh</em> daily';
    const n = splitText(h1, 'words');
    expect(n).toBe(4);
    expect(h1.querySelector('.sf-sr')!.textContent).toBe('Sweets made fresh daily');
    expect(h1.querySelector('.sf-split-visual')!.getAttribute('aria-hidden')).toBe('true');
    expect(h1.querySelector('em .sf-wi')!.textContent).toBe('fresh');
  });
  it('splits letters', () => {
    const h = document.createElement('h2');
    h.textContent = 'Chai';
    expect(splitText(h, 'chars')).toBe(4);
  });
});

describe('hooks list', () => {
  it('documents every hook the kit reads, with no duplicates', () => {
    const attrs = HOOKS.map((h) => h.attr);
    expect(new Set(attrs).size).toBe(attrs.length);
    for (const a of ['data-sf-reveal', 'data-sf-3d', 'data-sf-motion-toggle', 'data-sf-bg', 'data-sf-hscroll']) expect(attrs).toContain(a);
  });
});
