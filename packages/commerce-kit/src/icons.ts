// Line icons (drawn as SVG, never emoji or symbol characters), 24px grid, stroke 1.75.
const PATHS = {
  heart: 'M12 20.3s-7.3-4.4-9.2-9A5.1 5.1 0 0 1 12 6.6a5.1 5.1 0 0 1 9.2 4.7c-1.9 4.6-9.2 9-9.2 9z',
  close: 'M6 6l12 12M18 6L6 18',
} as const;
export type IconName = keyof typeof PATHS;

const NS = 'http://www.w3.org/2000/svg';
export function icon(name: IconName, cls = 'sf-icon'): SVGSVGElement {
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('width', '20');
  svg.setAttribute('height', '20');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('focusable', 'false');
  svg.setAttribute('class', `${cls} sf-icon-${name}`);
  const path = document.createElementNS(NS, 'path');
  path.setAttribute('d', PATHS[name]);
  path.setAttribute('fill', 'none');
  path.setAttribute('stroke', 'currentColor');
  path.setAttribute('stroke-width', '1.75');
  path.setAttribute('stroke-linecap', 'round');
  path.setAttribute('stroke-linejoin', 'round');
  svg.append(path);
  return svg;
}
