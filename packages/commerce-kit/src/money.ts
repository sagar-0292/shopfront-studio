// Rupees the Indian way: ₹1,25,000. Amounts are whole paise.
const whole = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 });
const exact = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 2, maximumFractionDigits: 2 });

export function inr(paise: number): string {
  if (!Number.isFinite(paise)) return '—';
  const r = paise / 100;
  return (Number.isInteger(r) ? whole : exact).format(r);
}

export function discountPercent(price: number, mrp?: number | null): number {
  if (!mrp || mrp <= price) return 0;
  return Math.round(((mrp - price) / mrp) * 100);
}
