import type { Feature } from './types';
import { whenVisible } from '../observe';
import { onScroll } from '../scroll';

// data-sf-reveal="up|down|left|right|fade|scale|blur|mask"
// data-sf-delay="200" (ms)   · parent data-sf-stagger="80" staggers children
export const reveal: Feature = {
  selector: '[data-sf-reveal], [data-sf-split]',
  setup(el, env) {
    const delay = el.getAttribute('data-sf-delay');
    if (delay && /^\d+$/.test(delay)) el.style.setProperty('--sf-delay', `${delay}ms`);
    const parent = el.parentElement?.closest<HTMLElement>('[data-sf-stagger]');
    if (parent) {
      const items = Array.from(parent.querySelectorAll(':scope > [data-sf-reveal], :scope > * > [data-sf-reveal]'));
      el.style.setProperty('--i', String(Math.max(0, items.indexOf(el))));
      const step = parent.getAttribute('data-sf-stagger');
      if (step && /^\d+$/.test(step)) el.style.setProperty('--sf-stagger', `${step}ms`);
    }
    if (env.tier === 'static') {
      el.classList.add('sf-in');
      return;
    }
    // A masked element is fully clipped, which browsers treat as "not visible",
    // so for masks we check its position while scrolling instead.
    if (el.getAttribute('data-sf-reveal') === 'mask') {
      const check = () => {
        const r = el.getBoundingClientRect();
        if (r.top < window.innerHeight * 0.92 && r.bottom > 0) { el.classList.add('sf-in'); off(); }
      };
      const off = onScroll(check);
      requestAnimationFrame(check);
      return off;
    }
    const stop = whenVisible(
      el,
      () => {
        el.classList.add('sf-in');
        stop();
      },
      undefined,
      { rootMargin: '0px 0px -8% 0px', threshold: 0.12 },
    );
    return stop;
  },
};
