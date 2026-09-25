import type { Feature } from './types';
import { num, whenVisible } from '../observe';
import { onTick } from '../loop';

// data-sf-marquee="60" (pixels per second) · data-sf-direction="left|right"
export const marquee: Feature = {
  selector: '[data-sf-marquee]',
  setup(el, env) {
    const inner = document.createElement('div');
    inner.className = 'sf-marquee-inner';
    inner.append(...Array.from(el.childNodes));
    el.append(inner);
    el.classList.add('sf-marquee');
    if (env.tier === 'static') return;
    const clone = inner.cloneNode(true) as HTMLElement;
    clone.setAttribute('aria-hidden', 'true');
    clone.querySelectorAll('a, button, input').forEach((n) => n.setAttribute('tabindex', '-1'));
    el.append(clone);
    const speed = num(el, 'data-sf-marquee', 60, 5, 400) * (el.getAttribute('data-sf-direction') === 'right' ? -1 : 1);
    let x = 0;
    let hover = false;
    let stopTick: (() => void) | null = null;
    const tick = (_t: number, dt: number) => {
      if (hover) return;
      const w = inner.offsetWidth || 1;
      x = (x + (speed * dt) / 1000) % w;
      if (x < 0) x += w;
      const t = `translate3d(${(-x).toFixed(2)}px,0,0)`;
      inner.style.transform = t;
      clone.style.transform = t;
    };
    const enter = () => (hover = true);
    const leave = () => (hover = false);
    el.addEventListener('pointerenter', enter);
    el.addEventListener('pointerleave', leave);
    const stop = whenVisible(el, () => { stopTick ??= onTick(tick); }, () => { stopTick?.(); stopTick = null; });
    return () => {
      stop();
      stopTick?.();
      el.removeEventListener('pointerenter', enter);
      el.removeEventListener('pointerleave', leave);
    };
  },
};
