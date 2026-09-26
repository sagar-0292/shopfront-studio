// Safe HTML building: every value is escaped unless it is already trusted HTML.
export class Raw {
  constructor(public readonly value: string) {}
  toString() { return this.value; }
}
export const raw = (s: string) => new Raw(s);

export function esc(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
}

type Val = Raw | string | number | boolean | null | undefined | Val[];
function out(v: Val): string {
  if (v == null || v === false || v === true) return '';
  if (v instanceof Raw) return v.value;
  if (Array.isArray(v)) return v.map(out).join('');
  return esc(String(v));
}

export function html(strings: TemplateStringsArray, ...vals: Val[]): Raw {
  let s = strings[0];
  for (let i = 0; i < vals.length; i++) s += out(vals[i]) + strings[i + 1];
  return raw(s);
}

/** Headlines may mark emphasis with *asterisks*: "Sweets made *fresh*". */
export function emph(text: string): Raw {
  return raw(esc(text).replace(/\*([^*]{1,80})\*/g, '<em>$1</em>'));
}

/** Only safe link targets: on-site paths, anchors, https, tel, mailto. */
export function safeHref(href: string): string {
  const h = href.trim();
  if (/^(\/(?!\/)|#|\?)/.test(h)) return h;
  if (/^https:\/\/[^\s]+$/i.test(h)) return h;
  if (/^(tel:\+?[\d\s-]{6,20}|mailto:[^\s@]+@[^\s@]+)$/i.test(h)) return h;
  return '#';
}

export const cls = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(' ');
