import type { Feature } from './types';
import { setPaused } from '../loop';

const KEY = 'sf-motion-paused';

export function applyPaused(p: boolean) {
  document.documentElement.classList.toggle('sf-paused', p);
  setPaused(p);
  document.querySelectorAll<HTMLVideoElement>('.sf-video video').forEach((v) => (p ? v.pause() : v.play().catch(() => {})));
  document.querySelectorAll('[data-sf-motion-toggle]').forEach((b) => {
    b.setAttribute('aria-pressed', String(p));
    const text = b.querySelector('[data-sf-motion-toggle-text]') ?? b;
    text.textContent = p ? 'Play animations' : 'Pause animations';
  });
  window.dispatchEvent(new CustomEvent('sf:motion-paused', { detail: p }));
}

export function storedPaused() {
  try { return localStorage.getItem(KEY) === '1'; } catch { return false; }
}

// <button data-sf-motion-toggle> — lets visitors stop all movement (accessibility).
export const motionToggle: Feature = {
  selector: '[data-sf-motion-toggle]',
  setup(btn) {
    const click = () => {
      const p = !document.documentElement.classList.contains('sf-paused');
      try { localStorage.setItem(KEY, p ? '1' : '0'); } catch { /* private mode */ }
      applyPaused(p);
    };
    btn.addEventListener('click', click);
    btn.setAttribute('aria-pressed', String(document.documentElement.classList.contains('sf-paused')));
    return () => btn.removeEventListener('click', click);
  },
};
