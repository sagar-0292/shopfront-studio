import type { Feature } from './types';
import { onTick } from '../loop';

// <html data-sf-cursor> — a custom cursor ring that follows the mouse.
// Anything with data-sf-cursor-label="View" shows that word inside the ring.
// Only on computers with a mouse; the normal cursor comes back over text fields.
export const cursor: Feature = {
  selector: '[data-sf-cursor]:is(html, body)',
  setup(host, env) {
    if (!env.finePointer || env.tier === 'static') return;
    const ring = document.createElement('div');
    ring.className = 'sf-cursor';
    ring.setAttribute('aria-hidden', 'true');
    const label = document.createElement('span');
    ring.append(label);
    const dot = document.createElement('div');
    dot.className = 'sf-cursor-dot';
    dot.setAttribute('aria-hidden', 'true');
    document.body.append(ring, dot);
    document.documentElement.classList.add('sf-cursor-on');
    let tx = -100, ty = -100, x = -100, y = -100;
    const move = (e: PointerEvent) => {
      tx = e.clientX;
      ty = e.clientY;
      dot.style.transform = `translate3d(${tx}px, ${ty}px, 0)`;
      const t = (e.target as Element | null)?.closest?.('[data-sf-cursor-label], a, button, [role="button"], label, summary');
      const text = t?.getAttribute('data-sf-cursor-label') ?? '';
      label.textContent = text;
      ring.classList.toggle('sf-cursor-hover', !!t);
      ring.classList.toggle('sf-cursor-label', !!text);
    };
    const hide = () => ring.classList.add('sf-cursor-hidden');
    const show = () => ring.classList.remove('sf-cursor-hidden');
    window.addEventListener('pointermove', move, { passive: true });
    document.addEventListener('pointerleave', hide);
    document.addEventListener('pointerenter', show);
    const stop = onTick(() => {
      x += (tx - x) * 0.18;
      y += (ty - y) * 0.18;
      ring.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0)`;
    });
    return () => {
      stop();
      ring.remove();
      dot.remove();
      document.documentElement.classList.remove('sf-cursor-on');
      window.removeEventListener('pointermove', move);
      document.removeEventListener('pointerleave', hide);
      document.removeEventListener('pointerenter', show);
    };
  },
};
