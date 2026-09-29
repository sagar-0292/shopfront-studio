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
  // Promises and actions (trust strip, phone action bar).
  truck: 'M2 6h11v10H2zM13 9h4.5l3.5 3.5V16h-8M6 19a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM17 19a2 2 0 1 0 0-4 2 2 0 0 0 0 4z',
  cash: 'M3 7h18v10H3zM12 14.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5zM6.5 10v4M17.5 10v4',
  returns: 'M4 9h11a5 5 0 0 1 0 10H9M4 9l4-4M4 9l4 4',
  shield: 'M12 3l7.5 3v5.5c0 4.6-3.2 8.3-7.5 9.5-4.3-1.2-7.5-4.9-7.5-9.5V6L12 3zM8.8 12l2.2 2.2 4.3-4.4',
  leaf: 'M5 19c0-8 5-14 15-14 0 10-6 15-14 15M5 19c3-5 6-8 10-10',
  star: 'M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8-5.2-2.7-5.2 2.7 1-5.8-4.3-4.1 5.9-.9L12 3.5z',
  gift: 'M4 11h16v9H4zM3 7h18v4H3zM12 7v13M12 7c-1.5-3.5-6-3.5-5 0M12 7c1.5-3.5 6-3.5 5 0',
  check: 'M5 12.5l4.5 4.5L19 7.5',
  chat: 'M4 5h16v11H9l-5 4V5zM8 10h8M8 13h5',
  calendar: 'M4 6h16v14H4zM4 10h16M8 3v5M16 3v5',
  hand: 'M8 13V5.5a1.5 1.5 0 0 1 3 0V11M11 10V4.5a1.5 1.5 0 0 1 3 0V11M14 10.5V6a1.5 1.5 0 0 1 3 0v7c0 4-2.5 7-6.5 7-2.8 0-4.3-1.3-5.6-3.4L3.3 13.8a1.5 1.5 0 0 1 2.4-1.8L8 14.5',
} as const;
export type IconName = keyof typeof PATHS;
/** Icons a trust strip or action bar can use. */
export const PROMISE_ICONS = ['truck', 'cash', 'returns', 'shield', 'leaf', 'star', 'gift', 'check', 'clock', 'pin', 'phone', 'chat', 'calendar', 'hand', 'heart', 'bag'] as const;

export function icon(name: IconName, size = 18): Raw {
  return raw(`<svg class="d-icon d-icon-${name}" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="${PATHS[name]}"/></svg>`);
}
