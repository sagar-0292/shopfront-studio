// Works out how much motion this device should get.
//   full   – everything on
//   lite   – phones and low-power devices: no smooth-scroll hijack, 3D swapped
//            for a still image on low-power, fewer particles, 30fps canvases
//   static – the visitor asked for reduced motion: nothing moves, all content shows
export type Tier = 'full' | 'lite' | 'static';

type NavigatorExtra = Navigator & {
  deviceMemory?: number;
  connection?: { saveData?: boolean; effectiveType?: string };
};

export type Env = {
  tier: Tier;
  reducedMotion: boolean;
  lowPower: boolean;
  small: boolean;
  finePointer: boolean;
};

export function detect(win: Window = window): Env {
  const nav = win.navigator as NavigatorExtra;
  const q = new URLSearchParams(win.location.search);
  const mq = (s: string) => (win.matchMedia ? win.matchMedia(s).matches : false);
  const reducedMotion = q.get('sf-motion') === 'reduce' || mq('(prefers-reduced-motion: reduce)');
  const conn = nav.connection;
  const lowPower =
    q.get('sf-lowpower') === '1' ||
    !!conn?.saveData ||
    /(^|-)2g$/.test(conn?.effectiveType ?? '') ||
    (nav.deviceMemory !== undefined && nav.deviceMemory <= 2) ||
    (nav.hardwareConcurrency !== undefined && nav.hardwareConcurrency <= 2);
  const small = win.innerWidth < 768;
  const finePointer = mq('(pointer: fine)') && mq('(hover: hover)');
  const tier: Tier = reducedMotion ? 'static' : lowPower || small ? 'lite' : 'full';
  return { tier, reducedMotion, lowPower, small, finePointer };
}
