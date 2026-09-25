// Shopfront motion kit. Generated sites never contain animation code: they add
// data-sf-* attributes to their HTML and load this file. See hooks.ts for the
// full list of hooks (the AI Builder reads the same list).
import { detect, type Env } from './env';
import { loopStats } from './loop';
import type { Cleanup, Feature } from './features/types';
import { reveal } from './features/reveal';
import { split } from './features/split';
import { parallax } from './features/parallax';
import { hscroll } from './features/hscroll';
import { marquee } from './features/marquee';
import { magnetic, tilt } from './features/pointer';
import { cursor } from './features/cursor';
import { progress, header } from './features/chrome';
import { backgrounds } from './features/backgrounds';
import { videoHero } from './features/video';
import { motionToggle, applyPaused, storedPaused } from './features/toggle';
import { object3d, liveScenes } from './features/object3d';
import { smooth } from './features/smooth';
import { HOOKS } from './hooks';

declare const __KIT_VERSION__: string;
export const version = typeof __KIT_VERSION__ === 'string' ? __KIT_VERSION__ : 'dev';

// Order matters: text is split before it is revealed.
const FEATURES: [string, Feature][] = [
  ['split', split],
  ['reveal', reveal],
  ['parallax', parallax],
  ['hscroll', hscroll],
  ['marquee', marquee],
  ['magnetic', magnetic],
  ['tilt', tilt],
  ['cursor', cursor],
  ['progress', progress],
  ['header', header],
  ['bg', backgrounds],
  ['video', videoHero],
  ['toggle', motionToggle],
  ['3d', object3d],
];

let env: Env | null = null;
const cleanups: Cleanup[] = [];
const counts: Record<string, number> = {};

function scan(root: ParentNode) {
  if (!env) return;
  for (const [name, f] of FEATURES) {
    const els: HTMLElement[] = [];
    if (root instanceof HTMLElement && root.matches(f.selector)) els.push(root);
    root.querySelectorAll<HTMLElement>(f.selector).forEach((e) => els.push(e));
    for (const el of els) {
      const flag = `sfDone${name}`;
      if (el.dataset[flag]) continue;
      el.dataset[flag] = '1';
      try {
        const c = f.setup(el, env);
        if (c) cleanups.push(c);
        counts[name] = (counts[name] ?? 0) + 1;
      } catch (e) {
        console.warn(`[sf-motion] "${name}" failed on`, el, e);
      }
    }
  }
}

export function init(root: ParentNode = document) {
  if (env) return scan(root);
  env = detect();
  const html = document.documentElement;
  html.classList.add('sf-js', 'sf-ready', `sf-tier-${env.tier}`);
  scan(root);
  if (storedPaused() && env.tier !== 'static') applyPaused(true);
  smooth(env).then((c) => c && cleanups.push(c)).catch(() => {});
  // Content added later (e.g. product cards from the commerce kit) gets effects too.
  document.addEventListener('sf:rendered', (e) => scan((e as CustomEvent<ParentNode>).detail ?? document));
}

export function destroy() {
  while (cleanups.length) cleanups.pop()!();
  env = null;
}

export const api = {
  version,
  init,
  destroy,
  refresh: (root?: ParentNode) => scan(root ?? document),
  pause: () => applyPaused(true),
  play: () => applyPaused(false),
  env: () => env,
  hooks: HOOKS,
  /** For tests: what is running right now. */
  stats: () => ({ ...loopStats(), features: { ...counts }, scenes: liveScenes(), tier: env?.tier }),
};

declare global {
  interface Window { SFMotion?: typeof api }
}
window.SFMotion = api;

if (!document.documentElement.hasAttribute('data-sf-manual')) {
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => init(), { once: true });
  else init();
}
