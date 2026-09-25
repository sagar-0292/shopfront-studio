// Scroll position shared by all scroll-linked effects. Uses Lenis when smooth
// scrolling is on, otherwise the browser's own scroll.
type Listener = (y: number) => void;
const listeners = new Set<Listener>();
let y = typeof window !== 'undefined' ? window.scrollY : 0;
let bound = false;

export function emitScroll(v: number) {
  y = v;
  listeners.forEach((fn) => fn(v));
}

export function onScroll(fn: Listener): () => void {
  if (!bound) {
    bound = true;
    window.addEventListener('scroll', () => emitScroll(window.scrollY), { passive: true });
  }
  listeners.add(fn);
  fn(y);
  return () => listeners.delete(fn);
}

export const scrollY = () => y;
