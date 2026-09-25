import type { Totals } from './pricing';
import type { Customer } from './validate';
import { inr } from './money';

export function whatsappOrderText(shop: string, t: Totals, c: Customer, coupon?: string): string {
  const lines = [
    `Hello ${shop}, I’d like to order:`,
    '',
    ...t.lines.map((l) => `• ${l.name} × ${l.qty} — ${inr(l.total_paise)}`),
    '',
    `Subtotal: ${inr(t.subtotal_paise)}`,
    ...(t.discount_paise ? [`Discount${coupon ? ` (${coupon})` : ''}: −${inr(t.discount_paise)}`] : []),
    ...(t.lines.length ? [`Delivery: ${t.delivery_paise ? inr(t.delivery_paise) : 'Free'}`] : []),
    `Total: ${inr(t.total_paise)}`,
    '',
    `Name: ${c.name.trim()}`,
    `Phone: ${c.phone.trim()}`,
    ...(c.address ? [`Address: ${c.address.trim()}${c.pincode ? ` – ${c.pincode.trim()}` : ''}`] : []),
    ...(c.notes?.trim() ? [`Note: ${c.notes.trim()}`] : []),
  ];
  return lines.join('\n');
}

export function whatsappBookingText(shop: string, service: string, dateLabel: string, time: string, c: Customer): string {
  return [`Hello ${shop}, I’d like to book:`, '', `${service}`, `${dateLabel} at ${time}`, '', `Name: ${c.name.trim()}`, `Phone: ${c.phone.trim()}`, ...(c.notes?.trim() ? [`Note: ${c.notes.trim()}`] : [])].join('\n');
}

export function waLink(number: string, text: string): string {
  const n = number.replace(/[^\d]/g, '');
  return `https://wa.me/${n}?text=${encodeURIComponent(text)}`;
}
