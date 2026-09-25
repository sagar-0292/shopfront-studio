import { describe, expect, it } from 'vitest';
import { products } from './fixtures';
import { facets, inStock, search, stockLabel } from '../src/catalog';
import { applyCoupon, resolveLines, totals } from '../src/pricing';
import { discountPercent, inr } from '../src/money';
import { addDays, label12, slotsFor, todayIST } from '../src/slots';
import { checkCustomer, indianMobile, pincode } from '../src/validate';
import { waLink, whatsappOrderText } from '../src/whatsapp';
import type { BookingRules } from '../src/types';

const byId = new Map(products.map((p) => [p.id, p]));

describe('rupees', () => {
  it('uses Indian grouping', () => {
    expect(inr(12500000)).toBe('₹1,25,000');
    expect(inr(49950)).toBe('₹499.50');
    expect(discountPercent(49900, 59900)).toBe(17);
    expect(discountPercent(100, null)).toBe(0);
  });
});

describe('search, filters and sorting', () => {
  it('searches name, description, category and seller, ignoring case', () => {
    expect(search(products, { q: 'CRISPY' }).map((p) => p.id)).toEqual(['p2']);
    expect(search(products, { q: 'joshi' }).map((p) => p.id).sort()).toEqual(['p1', 'p3']);
  });
  it('filters by category, seller, price and stock', () => {
    expect(search(products, { categories: ['sweets'] }).map((p) => p.id).sort()).toEqual(['p1', 'p4']);
    expect(search(products, { sellers: ['rival'] }).map((p) => p.id)).toEqual(['p2']);
    expect(search(products, { max: 30000 }).map((p) => p.id).sort()).toEqual(['p2', 'p4']);
    expect(search(products, { inStock: true }).map((p) => p.id)).not.toContain('p3');
  });
  it('sorts', () => {
    expect(search(products, { sort: 'price-asc' })[0].id).toBe('p2');
    expect(search(products, { sort: 'price-desc' })[0].id).toBe('p3');
    expect(search(products, { sort: 'newest' })[0].id).toBe('p4');
    expect(search(products, { sort: 'featured' })[0].id).toBe('p1');
    // 16.69% (₹599 → ₹499) beats 16.67% (₹1,50,000 → ₹1,25,000)
    expect(search(products, { sort: 'discount' }).map((p) => p.id).slice(0, 2)).toEqual(['p1', 'p3']);
  });
  it('builds filters only from what exists', () => {
    const f = facets(products);
    expect(f.categories.map((c) => `${c.name}:${c.count}`)).toEqual(['Gifts:1', 'Namkeen:1', 'Sweets:2']);
    expect(f.sellers.map((s) => s.slug)).toEqual(['joshi', 'rival']);
    expect(f.price).toEqual({ min: 12000, max: 12500000 });
  });
  it('explains stock', () => {
    expect(stockLabel(products[1]).label).toBe('Only 3 left');
    expect(stockLabel(products[2]).label).toBe('Sold out');
    expect(stockLabel({ ...products[0], stock: null }).label).toBe('In stock');
    expect(inStock(products[3])).toBe(true); // one variant left
  });
});

describe('cart totals', () => {
  it('adds lines, caps at stock and skips sold-out or removed items', () => {
    const lines = resolveLines([{ productId: 'p1', qty: 2 }, { productId: 'p2', qty: 10 }, { productId: 'p3', qty: 1 }, { productId: 'gone', qty: 1 }], byId);
    expect(lines.map((l) => [l.productId, l.qty])).toEqual([['p1', 2], ['p2', 3]]);
    const t = totals(lines, { delivery: { fee_paise: 4900, free_above_paise: 99900 } });
    expect(t).toMatchObject({ count: 5, subtotal_paise: 135800, delivery_paise: 0, total_paise: 135800 }); // over ₹999: free delivery
    const small = totals(resolveLines([{ productId: 'p2', qty: 1 }], byId), { delivery: { fee_paise: 4900, free_above_paise: 99900 } });
    expect(small).toMatchObject({ subtotal_paise: 12000, delivery_paise: 4900, total_paise: 16900 });
  });
  it('checks the free-delivery threshold after the discount', () => {
    const lines = resolveLines([{ productId: 'p1', qty: 2 }], byId); // ₹998
    expect(totals(lines, { delivery: { fee_paise: 4900, free_above_paise: 99800 } }).delivery_paise).toBe(0);
    expect(totals(lines, { delivery: { fee_paise: 4900, free_above_paise: 99800 } }, 100).delivery_paise).toBe(4900);
  });
  it('uses the chosen variant price and refuses sold-out variants', () => {
    const lines = resolveLines([{ productId: 'p4', variantId: 'v2', qty: 1 }, { productId: 'p4', variantId: 'v1', qty: 1 }], byId);
    expect(lines.map((l) => [l.name, l.unit_paise])).toEqual([['Motichoor Ladoo (500g)', 30000]]);
  });
});

describe('coupons', () => {
  const coupons = [
    { code: 'DIWALI10', type: 'percent' as const, value: 10, max_discount_paise: 50000 },
    { code: 'FLAT100', type: 'flat' as const, value: 10000, min_subtotal_paise: 50000 },
  ];
  it('applies percent with a cap, case-insensitively', () => {
    expect(applyCoupon(coupons, 'diwali10', 100000)).toMatchObject({ ok: true, discount_paise: 10000 });
    expect(applyCoupon(coupons, 'DIWALI10', 10000000)).toMatchObject({ ok: true, discount_paise: 50000 });
  });
  it('explains why a coupon does not apply', () => {
    expect(applyCoupon(coupons, 'FLAT100', 30000)).toEqual({ ok: false, message: 'Add items worth ₹200 more to use FLAT100.' });
    expect(applyCoupon(coupons, 'NOPE', 30000)).toEqual({ ok: false, message: 'That coupon code isn’t valid.' });
  });
  it('never discounts more than the cart', () => {
    const t = totals(resolveLines([{ productId: 'p2', qty: 1 }], byId), {}, 99999);
    expect(t.total_paise).toBe(0);
  });
});

describe('booking slots', () => {
  const rules: BookingRules = {
    services: [{ id: 'c', name: 'Consultation', duration_minutes: 30 }],
    hours: { mon: [['10:00', '12:00']], tue: [['10:00', '11:00'], ['17:00', '18:00']] },
    slot_minutes: 30, capacity: 2,
    blocked_dates: ['2030-01-08'],
    booked: { '2030-01-07': { '10:30': 2, '11:00': 1 } },
  };
  const now = new Date('2029-12-31T04:30:00Z'); // 10:00 IST, a Monday
  it('lists slots from opening hours, marking full ones', () => {
    const s = slotsFor(rules, '2030-01-07', 30, now); // Monday
    expect(s.map((x) => `${x.time}:${x.available}`)).toEqual(['10:00:true', '10:30:false', '11:00:true', '11:30:true']);
    expect(s[2].left).toBe(1);
  });
  it('handles split hours, closed days and blocked dates', () => {
    expect(slotsFor(rules, '2030-01-01', 30, now).map((x) => x.time)).toEqual(['10:00', '10:30', '17:00', '17:30']);
    expect(slotsFor(rules, '2030-01-02', 30, now)).toEqual([]); // Wednesday closed
    expect(slotsFor(rules, '2030-01-08', 30, now)).toEqual([]); // blocked
  });
  it('does not offer times that have passed or start within 30 minutes', () => {
    const s = slotsFor(rules, '2029-12-31', 30, now);
    expect(s.find((x) => x.time === '10:00')?.available).toBe(false);
    expect(s.find((x) => x.time === '10:30')?.available).toBe(false);
    expect(s.find((x) => x.time === '11:00')?.available).toBe(true);
    expect(slotsFor(rules, '2029-12-30', 30, now)).toEqual([]);
  });
  it('formats days and times the Indian way', () => {
    expect(label12('17:30')).toBe('5:30 pm');
    expect(label12('00:15')).toBe('12:15 am');
    expect(todayIST(new Date('2026-09-25T20:00:00Z'))).toBe('2026-09-26');
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
  });
});

describe('shopper details', () => {
  it('accepts Indian mobile numbers in any common format', () => {
    for (const n of ['98200 12345', '+91 98200-12345', '098200 12345', '919820012345']) expect(indianMobile(n)).toBe('+919820012345');
    expect(indianMobile('12345')).toBeNull();
    expect(pincode('400028')).toBe(true);
    expect(pincode('040028')).toBe(false);
  });
  it('gives plain-language errors', () => {
    expect(checkCustomer({ name: 'A', phone: '1', address: '', pincode: '1' }, true)).toEqual({
      name: 'Please enter your name.',
      phone: 'Please enter a 10-digit mobile number, e.g. 98200 12345.',
      address: 'Please enter your full delivery address.',
      pincode: 'Please enter a 6-digit PIN code.',
    });
  });
});

describe('WhatsApp order', () => {
  it('writes a clear order message and link', () => {
    const t = totals(resolveLines([{ productId: 'p1', qty: 2 }], byId), { delivery: { fee_paise: 4900 } }, 10000);
    const text = whatsappOrderText('Mithai Market', t, { name: 'Ravi', phone: '+919820012345', address: '12 Ranade Road, Dadar', pincode: '400028' }, 'DIWALI10');
    expect(text).toBe([
      'Hello Mithai Market, I’d like to order:', '',
      '• Kaju Katli 500g × 2 — ₹998', '',
      'Subtotal: ₹998', 'Discount (DIWALI10): −₹100', 'Delivery: ₹49', 'Total: ₹947', '',
      'Name: Ravi', 'Phone: +919820012345', 'Address: 12 Ranade Road, Dadar – 400028',
    ].join('\n'));
    expect(waLink('+91 98200 12345', 'Hi & bye')).toBe('https://wa.me/919820012345?text=Hi%20%26%20bye');
  });
});

import { orderRef, upiLink, validUtr } from '../src/upi';
describe('UPI', () => {
  it('builds a UPI app link with the exact amount in rupees', () => {
    expect(upiLink('mithaimarket@okicici', 'Mithai Market', 124150, 'Order MM-AB12C')).toBe(
      'upi://pay?pa=mithaimarket%40okicici&pn=Mithai%20Market&am=1241.50&cu=INR&tn=Order%20MM-AB12C');
    expect(() => upiLink('not a vpa', 'x', 100, 'y')).toThrow();
  });
  it('makes short, unambiguous order references', () => {
    const r = orderRef('Mithai Market');
    expect(r).toMatch(/^MM-[A-HJ-NP-Z2-9]{5}$/);
    expect(orderRef('Mithai Market')).not.toBe(r);
  });
  it('checks the 12-digit UPI transaction ID', () => {
    expect(validUtr('4123 4567 8901')).toBe(true);
    expect(validUtr('12345')).toBe(false);
    expect(validUtr('abcdefghijkl')).toBe(false);
  });
  it('adds the payment line to the WhatsApp order', () => {
    const t = totals(resolveLines([{ productId: 'p2', qty: 1 }], byId), {});
    expect(whatsappOrderText('Shop', t, { name: 'A B', phone: '+919820012345' }, undefined, 'Cash on delivery (₹120)')).toMatch(/\n\nPayment: Cash on delivery \(₹120\)$/);
  });
});
