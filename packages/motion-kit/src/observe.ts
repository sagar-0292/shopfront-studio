// Calls onEnter/onLeave as an element scrolls in and out of view.
export function whenVisible(
  el: Element,
  onEnter: () => void,
  onLeave?: () => void,
  opts: IntersectionObserverInit = { rootMargin: '100px 0px' },
): () => void {
  if (!('IntersectionObserver' in window)) {
    onEnter();
    return () => {};
  }
  const io = new IntersectionObserver((entries) => {
    for (const e of entries) {
      if (e.isIntersecting) onEnter();
      else onLeave?.();
    }
  }, opts);
  io.observe(el);
  return () => io.disconnect();
}

/** Number attribute with a default and limits. */
export function num(el: Element, name: string, fallback: number, min = -Infinity, max = Infinity) {
  const v = parseFloat(el.getAttribute(name) ?? '');
  return Number.isFinite(v) ? Math.min(max, Math.max(min, v)) : fallback;
}

export function colors(el: Element, fallback: string[]): string[] {
  const raw = el.getAttribute('data-sf-colors');
  if (!raw) return fallback;
  const list = raw.split(',').map((s) => s.trim()).filter((s) => /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(s));
  return list.length ? list : fallback;
}
