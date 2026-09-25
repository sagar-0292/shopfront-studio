type Attrs = Record<string, string | number | boolean | null | undefined | EventListener>;

/** Tiny element builder. Text is always set as text (never as HTML). */
export function h<K extends keyof HTMLElementTagNameMap>(tag: K, attrs: Attrs = {}, ...kids: (Node | string | null | false | undefined)[]) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v == null || v === false) continue;
    if (typeof v === 'function') el.addEventListener(k.replace(/^on/, '').toLowerCase(), v);
    else if (k === 'class') el.className = String(v);
    else el.setAttribute(k, v === true ? '' : String(v));
  }
  for (const k of kids) if (k != null && k !== false) el.append(k);
  return el;
}

let live: HTMLElement | null = null;
/** Speaks a short message to screen-reader users (e.g. "Added to cart"). */
export function announce(msg: string) {
  if (!live) {
    live = h('div', { class: 'sf-sr', 'aria-live': 'polite', role: 'status' });
    document.body.append(live);
  }
  live.textContent = '';
  setTimeout(() => (live!.textContent = msg), 50);
}

export function rendered(root: ParentNode) {
  document.dispatchEvent(new CustomEvent('sf:rendered', { detail: root }));
}

/** Keeps keyboard focus inside an open dialog. */
export function trapFocus(container: HTMLElement, e: KeyboardEvent) {
  if (e.key !== 'Tab') return;
  const f = Array.from(container.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])')).filter((x) => x.offsetParent !== null);
  if (!f.length) return;
  const first = f[0], last = f[f.length - 1];
  if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
  else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
}
