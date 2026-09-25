import type { Feature } from './types';
import { onScroll } from '../scroll';

// <section data-sf-hscroll><div data-sf-hscroll-track> …panels… </div></section>
// Pins the section and scrolls its panels sideways as you scroll down.
// On phones and with reduced motion it becomes a normal swipeable row.
export const hscroll: Feature = {
  selector: '[data-sf-hscroll]',
  setup(section, env) {
    const track = section.querySelector<HTMLElement>('[data-sf-hscroll-track]');
    if (!track) return;
    if (env.tier === 'static' || env.small) {
      section.classList.add('sf-hs-native');
      return () => section.classList.remove('sf-hs-native');
    }
    const sticky = document.createElement('div');
    sticky.className = 'sf-hs-sticky';
    track.replaceWith(sticky);
    sticky.append(track);
    section.classList.add('sf-hs-pinned');
    let distance = 0;
    const measure = () => {
      distance = Math.max(0, track.scrollWidth - sticky.clientWidth);
      section.style.height = `${distance + window.innerHeight}px`;
    };
    const update = () => {
      const top = section.getBoundingClientRect().top;
      const p = distance ? Math.min(1, Math.max(0, -top / distance)) : 0;
      track.style.transform = `translate3d(${(-p * distance).toFixed(1)}px, 0, 0)`;
      section.style.setProperty('--sf-progress', p.toFixed(3));
    };
    measure();
    const ro = new ResizeObserver(() => { measure(); update(); });
    ro.observe(track);
    const off = onScroll(update);
    window.addEventListener('resize', measure);
    return () => {
      ro.disconnect();
      off();
      window.removeEventListener('resize', measure);
      sticky.replaceWith(track);
      track.style.transform = '';
      section.style.height = '';
      section.classList.remove('sf-hs-pinned');
    };
  },
};
