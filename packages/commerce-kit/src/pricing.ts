import type { CartLine, Config, Coupon, CouponResult, Product } from './types';
import { priceOf, stockOf } from './catalog';
import { inr } from './money';

export type Line = CartLine & { product: Product; name: string; unit_paise: number; total_paise: number; max: number | null };
export type Totals = { lines: Line[]; count: number; subtotal_paise: number; discount_paise: number; delivery_paise: number; total_paise: number };

export function resolveLines(lines: CartLine[], products: Map<string, Product>): Line[] {
  const out: Line[] = [];
  for (const l of lines) {
    const product = products.get(l.productId);
    if (!product) continue; // product removed from the shop since it was added
    const v = product.variants?.find((x) => x.id === l.variantId);
    if (product.variants?.length && !v) continue;
    const max = stockOf(product, v);
    if (max === 0) continue;
    const qty = Math.max(1, Math.min(l.qty, max ?? 99));
    const unit = priceOf(product, v);
    out.push({ ...l, qty, product, name: v ? `${product.name} (${v.label})` : product.name, unit_paise: unit, total_paise: unit * qty, max });
  }
  return out;
}

export function totals(lines: Line[], cfg: Pick<Config, 'delivery'>, discount_paise = 0): Totals {
  const subtotal = lines.reduce((s, l) => s + l.total_paise, 0);
  const discount = Math.min(discount_paise, subtotal);
  const afterDiscount = subtotal - discount;
  const d = cfg.delivery;
  const delivery = !lines.length || !d ? 0 : d.free_above_paise != null && afterDiscount >= d.free_above_paise ? 0 : d.fee_paise;
  return {
    lines,
    count: lines.reduce((s, l) => s + l.qty, 0),
    subtotal_paise: subtotal,
    discount_paise: discount,
    delivery_paise: delivery,
    total_paise: afterDiscount + delivery,
  };
}

/** Checks a coupon against the cart. (The shop's server checks again before payment.) */
export function applyCoupon(coupons: Coupon[], code: string, subtotal: number): CouponResult {
  const c = coupons.find((x) => x.code.toUpperCase() === code.trim().toUpperCase());
  if (!c) return { ok: false, message: 'That coupon code isn’t valid.' };
  if (c.min_subtotal_paise && subtotal < c.min_subtotal_paise) {
    return { ok: false, message: `Add items worth ${inr(c.min_subtotal_paise - subtotal)} more to use ${c.code}.` };
  }
  let d = c.type === 'percent' ? Math.round((subtotal * c.value) / 100) : c.value;
  if (c.max_discount_paise) d = Math.min(d, c.max_discount_paise);
  d = Math.min(d, subtotal);
  return { ok: true, code: c.code.toUpperCase(), discount_paise: d, message: c.label ?? `${c.code.toUpperCase()} applied: you save ${inr(d)}.` };
}
