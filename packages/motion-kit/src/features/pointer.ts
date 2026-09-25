import type { Feature } from './types';
import { num } from '../observe';

// data-sf-magnetic="0.35" — buttons lean towards the mouse.
export const magnetic: Feature = {
  selector: '[data-sf-magnetic]',
  setup(el, env) {
    if (!env.finePointer || env.tier === 'static') return;
    const strength = num(el, 'data-sf-magnetic', 0.35, 0, 1);
    el.classList.add('sf-magnetic');
    const move = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      const dx = e.clientX - (r.left + r.width / 2);
      const dy = e.clientY - (r.top + r.height / 2);
      el.style.transform = `translate3d(${(dx * strength).toFixed(1)}px, ${(dy * strength).toFixed(1)}px, 0)`;
    };
    const leave = () => (el.style.transform = '');
    el.addEventListener('pointermove', move);
    el.addEventListener('pointerleave', leave);
    return () => {
      el.removeEventListener('pointermove', move);
      el.removeEventListener('pointerleave', leave);
    };
  },
};

// data-sf-tilt="10" (max degrees) — cards tilt in 3D under the mouse, with a soft shine.
export const tilt: Feature = {
  selector: '[data-sf-tilt]',
  setup(el, env) {
    if (!env.finePointer || env.tier === 'static') return;
    const max = num(el, 'data-sf-tilt', 8, 0, 25);
    el.classList.add('sf-tilt');
    const glare = document.createElement('span');
    glare.className = 'sf-glare';
    glare.setAttribute('aria-hidden', 'true');
    el.append(glare);
    const move = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width;
      const py = (e.clientY - r.top) / r.height;
      el.style.transform = `perspective(900px) rotateX(${((0.5 - py) * max).toFixed(2)}deg) rotateY(${((px - 0.5) * max).toFixed(2)}deg)`;
      glare.style.setProperty('--gx', `${(px * 100).toFixed(0)}%`);
      glare.style.setProperty('--gy', `${(py * 100).toFixed(0)}%`);
    };
    const leave = () => (el.style.transform = '');
    el.addEventListener('pointermove', move);
    el.addEventListener('pointerleave', leave);
    return () => {
      glare.remove();
      el.removeEventListener('pointermove', move);
      el.removeEventListener('pointerleave', leave);
    };
  },
};
