import type { Env } from '../env';
import { emitScroll } from '../scroll';

// <html data-sf-smooth> — buttery smooth scrolling (Lenis) on computers.
// Phones keep their native scrolling, which already feels right.
export async function smooth(env: Env): Promise<(() => void) | void> {
  if (!document.documentElement.hasAttribute('data-sf-smooth')) return;
  if (env.tier !== 'full' || !env.finePointer) return;
  const { default: Lenis } = await import('lenis');
  const lenis = new Lenis({ autoRaf: true, anchors: true, lerp: 0.1 });
  lenis.on('scroll', (l: { scroll: number }) => emitScroll(l.scroll));
  document.documentElement.classList.add('sf-smooth');
  // "Pause animations" turns smooth scrolling off, back to the browser's own.
  const pauseSmooth = (e: Event) => {
    if ((e as CustomEvent<boolean>).detail) { lenis.destroy(); document.documentElement.classList.remove('sf-smooth'); }
  };
  window.addEventListener('sf:motion-paused', pauseSmooth);
  return () => { window.removeEventListener('sf:motion-paused', pauseSmooth); lenis.destroy(); };
}
