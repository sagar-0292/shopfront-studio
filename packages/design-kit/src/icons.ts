// Line icons drawn as SVG (never emoji or symbol characters). 24px grid, 1.75 stroke,
// coloured by the text around them.
import { raw, type Raw } from './html';

const PATHS = {
  arrowRight: 'M5 12h14M13 6l6 6-6 6',
  arrowUpRight: 'M7 17L17 7M8 7h9v9',
  arrowDown: 'M12 5v14M6 13l6 6 6-6',
  heart: 'M12 20.3s-7.3-4.4-9.2-9A5.1 5.1 0 0 1 12 6.6a5.1 5.1 0 0 1 9.2 4.7c-1.9 4.6-9.2 9-9.2 9z',
  bag: 'M5 8h14l-1.2 11.1a2 2 0 0 1-2 1.9H8.2a2 2 0 0 1-2-1.9L5 8zM9 8V7a3 3 0 0 1 6 0v1',
  menu: 'M4 7h16M4 12h16M4 17h16',
  pin: 'M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21zM12 12a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z',
  phone: 'M5 4h3.5l1.7 4.3-2.2 1.4a11 11 0 0 0 5.3 5.3l1.4-2.2L19 14.5V18a2 2 0 0 1-2.2 2A15.9 15.9 0 0 1 3 6.2 2 2 0 0 1 5 4z',
  clock: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 7v5l3 2',
} as const;
export type IconName = keyof typeof PATHS;

export function icon(name: IconName, size = 18): Raw {
  return raw(`<svg class="d-icon d-icon-${name}" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="${PATHS[name]}"/></svg>`);
}
