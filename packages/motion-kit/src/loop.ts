// One shared animation clock for the whole page. It only runs while at least
// one effect needs it, stops when the tab is hidden, and can be paused by the
// visitor ("Pause animations" button).
type Tick = (time: number, delta: number) => void;

const ticks = new Set<Tick>();
let raf = 0;
let last = 0;
let paused = false;
let frames = 0;

function frame(t: number) {
  raf = 0;
  const delta = last ? Math.min(t - last, 100) : 16;
  last = t;
  frames++;
  ticks.forEach((fn) => fn(t, delta));
  schedule();
}

function schedule() {
  if (!raf && ticks.size && !paused && !document.hidden) raf = requestAnimationFrame(frame);
}

export function onTick(fn: Tick): () => void {
  ticks.add(fn);
  schedule();
  return () => {
    ticks.delete(fn);
    if (!ticks.size && raf) {
      cancelAnimationFrame(raf);
      raf = 0;
      last = 0;
    }
  };
}

export function setPaused(p: boolean) {
  paused = p;
  if (p && raf) {
    cancelAnimationFrame(raf);
    raf = 0;
  }
  last = 0;
  schedule();
}

export const isPaused = () => paused;

document.addEventListener('visibilitychange', () => {
  last = 0;
  schedule();
});

/** For tests and debugging: how many effects are running and frames drawn. */
export const loopStats = () => ({ active: ticks.size, frames, running: raf !== 0 });
