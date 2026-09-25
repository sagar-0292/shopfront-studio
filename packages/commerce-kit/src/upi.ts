// UPI "intent" links (open any UPI app with the amount filled in) and QR codes.

const VPA = /^[a-zA-Z0-9._-]{2,255}@[a-zA-Z][a-zA-Z0-9.-]{1,63}$/;

export function upiLink(vpa: string, name: string, amount_paise: number, note: string): string {
  if (!VPA.test(vpa)) throw new Error('Invalid UPI ID');
  const p = new URLSearchParams({
    pa: vpa,
    pn: name.slice(0, 50),
    am: (amount_paise / 100).toFixed(2),
    cu: 'INR',
    tn: note.slice(0, 50),
  });
  return `upi://pay?${p.toString().replace(/\+/g, '%20')}`;
}

/** Short order reference the shop can match against the payment, e.g. MM-4K7Q2. */
export function orderRef(shop: string): string {
  const initials = shop.split(/\s+/).map((w) => w[0]).join('').replace(/[^A-Za-z]/g, '').slice(0, 3).toUpperCase() || 'OR';
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const bytes = crypto.getRandomValues(new Uint8Array(5));
  return `${initials}-${Array.from(bytes, (b) => alphabet[b % alphabet.length]).join('')}`;
}

/** UPI transaction reference (UTR / RRN): 12 digits. */
export const validUtr = (s: string) => /^\d{12}$/.test(s.replace(/\s/g, ''));

/** Draws a QR code as an SVG element (loaded only when UPI is chosen). */
export async function qrSvg(text: string, size = 220): Promise<SVGSVGElement> {
  const { default: qrcode } = await import('qrcode-generator');
  const qr = qrcode(0, 'M');
  qr.addData(text);
  qr.make();
  const n = qr.getModuleCount();
  let d = '';
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (qr.isDark(r, c)) d += `M${c + 4} ${r + 4}h1v1h-1z`;
  const ns = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(ns, 'svg');
  svg.setAttribute('viewBox', `0 0 ${n + 8} ${n + 8}`);
  svg.setAttribute('width', String(size));
  svg.setAttribute('height', String(size));
  svg.setAttribute('role', 'img');
  svg.setAttribute('aria-label', 'UPI QR code for this payment');
  const bg = document.createElementNS(ns, 'rect');
  bg.setAttribute('width', '100%'); bg.setAttribute('height', '100%'); bg.setAttribute('fill', '#fff');
  const path = document.createElementNS(ns, 'path');
  path.setAttribute('d', d); path.setAttribute('fill', '#000');
  svg.append(bg, path);
  return svg;
}
