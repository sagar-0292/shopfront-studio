import type { Feature } from './types';
import { whenVisible } from '../observe';
import type { SceneHandle } from '../three/scene';

// <div data-sf-3d="ring|gem|knot|blob|cup|orbit|stack|model" data-src="/model.glb"
//      data-sf-3d-color="#f5a524" data-sf-3d-material="metal|glass|matte|ceramic"
//      role="img" aria-label="A gold ring slowly turning">
//   (optional fallback image shown before / instead of 3D)
// </div>
// The 3D engine (Three.js) is only downloaded when a 3D element is about to be
// seen, after the page has finished loading. Low-power phones and reduced-motion
// visitors keep the still image.
export const OBJECTS = ['ring', 'gem', 'knot', 'blob', 'cup', 'orbit', 'stack', 'model'] as const;

let live = 0;
export const liveScenes = () => live;

// On phones the still image shows first and live 3D starts at the visitor's
// first touch, scroll or key press, so the page is quick to use on cheap phones.
let engaged: Promise<void> | null = null;
function firstInteraction(): Promise<void> {
  return (engaged ??= new Promise((resolve) => {
    const events = ['pointerdown', 'touchstart', 'wheel', 'keydown', 'scroll'] as const;
    const go = () => { events.forEach((e) => window.removeEventListener(e, go)); resolve(); };
    events.forEach((e) => window.addEventListener(e, go, { passive: true, once: true }));
  }));
}

function afterLoad(): Promise<void> {
  return new Promise((resolve) => {
    const go = () => {
      const idle = (window as Window & { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => void }).requestIdleCallback;
      if (idle) idle(() => resolve(), { timeout: 2500 });
      else setTimeout(resolve, 300);
    };
    if (document.readyState === 'complete') go();
    else window.addEventListener('load', go, { once: true });
  });
}

export const object3d: Feature = {
  selector: '[data-sf-3d]',
  setup(host, env) {
    const kind = host.getAttribute('data-sf-3d') ?? '';
    host.classList.add('sf-3d');
    if (!(OBJECTS as readonly string[]).includes(kind)) return;
    if (env.tier === 'static' || env.lowPower) {
      host.classList.add('sf-3d-still');
      return;
    }
    let handle: SceneHandle | null = null;
    let cancelled = false;
    let visible = false;
    const stop = whenVisible(
      host,
      async () => {
        visible = true;
        if (handle) return handle.resume();
        await afterLoad();
        if (env.tier === 'lite') await firstInteraction();
        if (cancelled || handle || !visible) return;
        const { createScene } = await import('../three/scene');
        if (cancelled) return;
        try {
          handle = await createScene(host, {
            kind: kind as (typeof OBJECTS)[number],
            color: host.getAttribute('data-sf-3d-color') ?? undefined,
            material: host.getAttribute('data-sf-3d-material') ?? undefined,
            src: host.getAttribute('data-src') ?? undefined,
            env,
          });
          live++;
          host.classList.add('sf-3d-live');
        } catch (e) {
          console.warn('[sf-motion] 3D could not start, keeping the still image.', e);
          host.classList.add('sf-3d-still');
        }
      },
      () => { visible = false; handle?.pause(); },
      { rootMargin: '200px 0px' },
    );
    return () => {
      cancelled = true;
      stop();
      if (handle) { handle.dispose(); live--; }
    };
  },
};
