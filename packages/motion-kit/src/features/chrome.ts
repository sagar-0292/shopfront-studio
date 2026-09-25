import type { Feature } from './types';
import { onScroll } from '../scroll';

// data-sf-progress — a bar that fills as the visitor scrolls down the page.
export const progress: Feature = {
  selector: '[data-sf-progress]',
  setup(el) {
    el.setAttribute('aria-hidden', 'true');
    el.classList.add('sf-progress');
    return onScroll((y) => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      el.style.transform = `scaleX(${max > 0 ? Math.min(1, y / max).toFixed(4) : 0})`;
    });
  },
};

// data-sf-header="autohide|solid" — header hides while scrolling down and
// comes back when scrolling up. Always gets class "sf-scrolled" after the top.
export const header: Feature = {
  selector: '[data-sf-header]',
  setup(el, env) {
    const autohide = el.getAttribute('data-sf-header') !== 'solid' && env.tier !== 'static';
    el.classList.add('sf-header');
    let last = window.scrollY;
    return onScroll((y) => {
      el.classList.toggle('sf-scrolled', y > 10);
      if (autohide) {
        const down = y > last + 4;
        const up = y < last - 4;
        const focusInside = el.contains(document.activeElement);
        if (down && y > 120 && !focusInside) el.classList.add('sf-hidden');
        else if (up || y < 120) el.classList.remove('sf-hidden');
      }
      last = y;
    });
  },
};
