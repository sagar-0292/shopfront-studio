import type { Feature } from './types';
import { num, whenVisible } from '../observe';
import { onScroll } from '../scroll';

// data-sf-parallax="0.2" — moves at a different speed to the page (-1 to 1).
export const parallax: Feature = {
  selector: '[data-sf-parallax]',
  setup(el, env) {
    if (env.tier === 'static') return;
    const speed = num(el, 'data-sf-parallax', 0.2, -1, 1) * (env.tier === 'lite' ? 0.5 : 1);
    let visible = false;
    let pending = 0;
    const update = () => {
      pending = 0;
      const r = el.getBoundingClientRect();
      const offset = (r.top + r.height / 2 - window.innerHeight / 2) * -speed;
      el.style.transform = `translate3d(0, ${offset.toFixed(1)}px, 0)`;
    };
    const off = onScroll(() => {
      if (visible && !pending) pending = requestAnimationFrame(update);
    });
    const stop = whenVisible(el, () => { visible = true; update(); }, () => { visible = false; });
    el.style.willChange = 'transform';
    return () => {
      off();
      stop();
      cancelAnimationFrame(pending);
      el.style.transform = '';
    };
  },
};
