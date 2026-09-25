import type { Env } from '../env';
export type Cleanup = () => void;
export type Feature = {
  /** CSS selector of the HTML hook this feature brings to life. */
  selector: string;
  setup: (el: HTMLElement, env: Env) => Cleanup | void;
};

/** Marks an element as done so a second scan doesn't set it up twice. */
export function claim(el: HTMLElement, key: string) {
  const flag = `sf${key}`;
  if (el.dataset[flag]) return false;
  el.dataset[flag] = '1';
  return true;
}
