import type { Config } from './types';
import type { Totals } from './pricing';
import type { Customer } from './validate';

// Online payment through Razorpay. The shop's server creates the order (it
// re-checks every price, stock and coupon) and verifies the payment afterwards;
// the browser never decides the amount. Server endpoints arrive in Phase 6.
type RazorpayCtor = new (o: Record<string, unknown>) => { open: () => void; on: (e: string, fn: (r: unknown) => void) => void };

function loadScript(): Promise<RazorpayCtor> {
  const w = window as unknown as { Razorpay?: RazorpayCtor };
  if (w.Razorpay) return Promise.resolve(w.Razorpay);
  return new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = 'https://checkout.razorpay.com/v1/checkout.js';
    s.onload = () => (w.Razorpay ? resolve(w.Razorpay) : reject(new Error('Razorpay did not load')));
    s.onerror = () => reject(new Error('Razorpay did not load'));
    document.head.append(s);
  });
}

export async function payOnline(cfg: NonNullable<NonNullable<Config['checkout']>['razorpay']>, shop: string, t: Totals, c: Customer, coupon: string | null): Promise<{ ok: boolean; message: string; orderId?: string }> {
  const res = await fetch(cfg.orderEndpoint, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ items: t.lines.map((l) => ({ productId: l.productId, variantId: l.variantId, qty: l.qty })), coupon, customer: c }),
  });
  const order = (await res.json().catch(() => null)) as { razorpayOrderId?: string; amount_paise?: number; orderId?: string; message?: string } | null;
  if (!res.ok || !order?.razorpayOrderId) return { ok: false, message: order?.message ?? 'We couldn’t start the payment. Please try again, or order on WhatsApp.' };
  const Razorpay = await loadScript();
  return new Promise((resolve) => {
    const rzp = new Razorpay({
      key: cfg.keyId,
      order_id: order.razorpayOrderId,
      amount: order.amount_paise,
      currency: 'INR',
      name: shop,
      prefill: { name: c.name, contact: c.phone },
      handler: async (resp: Record<string, string>) => {
        const v = await fetch(cfg.verifyEndpoint, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ orderId: order.orderId, ...resp }) });
        resolve(v.ok ? { ok: true, message: 'Payment received. Thank you!', orderId: order.orderId } : { ok: false, message: 'Payment went through but we couldn’t confirm it. We’ll contact you shortly.' });
      },
      modal: { ondismiss: () => resolve({ ok: false, message: 'Payment was cancelled. Your cart is still here.' }) },
    });
    rzp.on('payment.failed', () => resolve({ ok: false, message: 'The payment didn’t go through. No money was taken. Please try again.' }));
    rzp.open();
  });
}
