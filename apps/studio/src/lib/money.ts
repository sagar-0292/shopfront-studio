// All money is stored in paise (₹1 = 100 paise) and shown the Indian way:
// ₹1,25,000 not ₹125,000.
const whole = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 });
const exact = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 2, maximumFractionDigits: 2 });

export function formatINR(paise: number | bigint | string, opts: { exact?: boolean } = {}): string {
  const p = typeof paise === 'string' ? Number(paise) : Number(paise);
  if (!Number.isFinite(p)) return '—';
  const rupees = p / 100;
  const showPaise = opts.exact ?? !Number.isInteger(rupees);
  return (showPaise ? exact : whole).format(rupees);
}

/** Parses what a person types ("1,25,000", "₹ 499.50", "499") into paise. */
export function parseINR(input: string): number | null {
  const cleaned = input.replace(/[₹,\s]|rs\.?|inr/gi, '');
  if (!/^\d+(\.\d{1,2})?$/.test(cleaned)) return null;
  return Math.round(Number(cleaned) * 100);
}
