import type { Kit } from './kit';
import { h, announce, trapFocus } from './dom';
import { inr } from './money';
import { resolveLines, totals, type Totals } from './pricing';
import { checkCustomer, indianMobile, type Customer } from './validate';
import { waLink, whatsappOrderText } from './whatsapp';
import { payOnline } from './razorpay';

// The cart drawer. Added to the page automatically; any element with
// data-sf-cart-open opens it, and data-sf-cart-count shows the number of items.
export function mountCart(kit: Kit) {
  const cfg = kit.config;
  let discount = 0;
  let couponMsg: { ok: boolean; text: string } | null = null;
  let lastFocus: HTMLElement | null = null;
  let step: 'cart' | 'details' | 'done' = 'cart';
  let doneMsg = '';

  const panel = h('div', { class: 'sf-drawer-panel', role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'sf-cart-title', tabindex: '-1' });
  const backdrop = h('div', { class: 'sf-drawer-backdrop', onclick: () => close() });
  const drawer = h('div', { class: 'sf-drawer', hidden: true, 'data-sf-cart': '' }, backdrop, panel);
  document.body.append(drawer);
  drawer.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); trapFocus(panel, e); });

  function open() {
    lastFocus = document.activeElement as HTMLElement;
    step = step === 'done' ? 'cart' : step;
    render();
    drawer.hidden = false;
    document.documentElement.classList.add('sf-drawer-open');
    requestAnimationFrame(() => drawer.classList.add('sf-open'));
    panel.focus();
  }
  function close() {
    drawer.classList.remove('sf-open');
    document.documentElement.classList.remove('sf-drawer-open');
    setTimeout(() => (drawer.hidden = true), 250);
    lastFocus?.focus();
  }

  const current = (): Totals => totals(resolveLines(kit.store.state.cart, kit.byId), cfg, discount);

  async function refreshCoupon() {
    const code = kit.store.state.coupon;
    if (!code) { discount = 0; return; }
    const t = totals(resolveLines(kit.store.state.cart, kit.byId), cfg, 0);
    const r = await kit.source.coupon(code, t.subtotal_paise);
    discount = r.ok ? r.discount_paise : 0;
    couponMsg = { ok: r.ok, text: r.message };
    if (!r.ok) kit.store.setCoupon(null);
  }

  function render() {
    const t = current();
    const head = h('div', { class: 'sf-drawer-head' },
      h('h2', { id: 'sf-cart-title' }, step === 'details' ? 'Your details' : step === 'done' ? 'Thank you' : 'Your cart'),
      h('button', { type: 'button', class: 'sf-icon-btn', 'aria-label': 'Close cart', onclick: () => close() }, '✕'));
    if (step === 'done') {
      panel.replaceChildren(head, h('div', { class: 'sf-drawer-body' }, h('p', { class: 'sf-done' }, doneMsg)), h('div', { class: 'sf-drawer-foot' }, h('button', { type: 'button', class: 'sf-btn', onclick: () => close() }, 'Continue shopping')));
      return;
    }
    if (!t.lines.length) {
      panel.replaceChildren(head, h('div', { class: 'sf-drawer-body sf-empty' }, h('p', {}, 'Your cart is empty.'), h('button', { type: 'button', class: 'sf-btn', onclick: () => close() }, 'Start shopping')));
      return;
    }
    const summary = h('dl', { class: 'sf-totals' },
      h('dt', {}, 'Subtotal'), h('dd', {}, inr(t.subtotal_paise)),
      ...(t.discount_paise ? [h('dt', {}, `Discount (${kit.store.state.coupon})`), h('dd', { class: 'sf-save' }, `−${inr(t.discount_paise)}`)] : []),
      ...(cfg.delivery ? [h('dt', {}, 'Delivery'), h('dd', {}, t.delivery_paise ? inr(t.delivery_paise) : 'Free')] : []),
      h('dt', { class: 'sf-grand' }, 'Total'), h('dd', { class: 'sf-grand', 'data-sf-total': '' }, inr(t.total_paise)));
    const freeNote = cfg.delivery?.free_above_paise && t.delivery_paise
      ? h('p', { class: 'sf-note' }, `Add ${inr(cfg.delivery.free_above_paise - (t.subtotal_paise - t.discount_paise))} more for free delivery.`) : null;

    if (step === 'cart') {
      const lines = h('ul', { class: 'sf-lines', 'aria-label': 'Items in your cart' }, ...t.lines.map((l) =>
        h('li', { class: 'sf-line' },
          l.product.image?.src ? h('img', { src: l.product.image.src, alt: '', width: 56, height: 56, loading: 'lazy' }) : h('span', { class: 'sf-line-ph', 'aria-hidden': 'true' }),
          h('div', { class: 'sf-line-info' }, h('p', { class: 'sf-line-name' }, l.name), h('p', { class: 'sf-line-price' }, `${inr(l.unit_paise)} each`)),
          h('div', { class: 'sf-qty', role: 'group', 'aria-label': `Quantity of ${l.name}` },
            h('button', { type: 'button', 'aria-label': `One less ${l.name}`, onclick: () => kit.store.setQty(l.productId, l.variantId, l.qty - 1) }, '−'),
            h('span', { 'aria-live': 'polite' }, String(l.qty)),
            h('button', { type: 'button', 'aria-label': `One more ${l.name}`, disabled: l.max != null && l.qty >= l.max, onclick: () => kit.store.setQty(l.productId, l.variantId, l.qty + 1) }, '+')),
          h('p', { class: 'sf-line-total' }, inr(l.total_paise)))));
      const coupon = h('form', { class: 'sf-coupon', 'data-sf-coupon': '' },
        h('label', { for: 'sf-coupon-code', class: 'sf-sr' }, 'Coupon code'),
        h('input', { id: 'sf-coupon-code', name: 'code', placeholder: 'Coupon code', autocomplete: 'off', value: kit.store.state.coupon ?? '', maxlength: 30 }),
        kit.store.state.coupon
          ? h('button', { type: 'button', class: 'sf-btn sf-btn-ghost', onclick: () => { kit.store.setCoupon(null); discount = 0; couponMsg = null; } }, 'Remove')
          : h('button', { type: 'submit', class: 'sf-btn sf-btn-ghost' }, 'Apply'),
        couponMsg ? h('p', { class: couponMsg.ok ? 'sf-ok' : 'sf-err', role: 'status' }, couponMsg.text) : null);
      coupon.addEventListener('submit', async (e) => {
        e.preventDefault();
        const code = String(new FormData(coupon).get('code') ?? '').trim();
        if (!code) return;
        kit.store.setCoupon(code.toUpperCase());
        await refreshCoupon();
        render();
      });
      panel.replaceChildren(head,
        h('div', { class: 'sf-drawer-body' }, lines, coupon),
        h('div', { class: 'sf-drawer-foot' }, summary, freeNote, h('p', { class: 'sf-note' }, 'Prices include all taxes.'),
          h('button', { type: 'button', class: 'sf-btn sf-btn-wide', 'data-sf-checkout': '', onclick: () => { step = 'details'; render(); } }, 'Checkout')));
      return;
    }

    // details step
    const needAddress = !!cfg.delivery;
    const field = (name: keyof Customer, label: string, attrs: Record<string, string | number | boolean> = {}) =>
      h('div', { class: 'sf-field' }, h('label', { for: `sf-c-${name}` }, label),
        name === 'address' || name === 'notes' ? h('textarea', { id: `sf-c-${name}`, name, rows: 2, ...attrs }) : h('input', { id: `sf-c-${name}`, name, ...attrs }),
        h('p', { class: 'sf-err', id: `sf-c-${name}-err`, 'aria-live': 'polite' }));
    const form = h('form', { class: 'sf-checkout', novalidate: true },
      field('name', 'Your name', { autocomplete: 'name', required: true, maxlength: 80 }),
      field('phone', 'Mobile number', { type: 'tel', inputmode: 'numeric', autocomplete: 'tel', required: true, maxlength: 16 }),
      needAddress ? field('address', 'Delivery address', { autocomplete: 'street-address', required: true, maxlength: 300 }) : null,
      needAddress ? field('pincode', 'PIN code', { inputmode: 'numeric', autocomplete: 'postal-code', required: true, maxlength: 6 }) : null,
      field('notes', 'Anything we should know? (optional)', { maxlength: 300 }),
      h('label', { class: 'sf-check sf-consent' }, h('input', { type: 'checkbox', name: 'consent', required: true }),
        ' I agree that ', cfg.site.name, ' may use these details to process and deliver my order', cfg.site.privacyUrl ? ' (' : '.',
        cfg.site.privacyUrl ? h('a', { href: cfg.site.privacyUrl, target: '_blank', rel: 'noopener' }, 'privacy notice') : null, cfg.site.privacyUrl ? ').' : ''),
      h('p', { class: 'sf-err', 'data-sf-form-error': '', role: 'alert' }));
    const pay = cfg.checkout?.razorpay;
    const read = (): Customer | null => {
      const d = new FormData(form);
      const c: Customer = { name: String(d.get('name') ?? ''), phone: String(d.get('phone') ?? ''), address: String(d.get('address') ?? ''), pincode: String(d.get('pincode') ?? ''), notes: String(d.get('notes') ?? '') };
      const errs = checkCustomer(c, needAddress);
      form.querySelectorAll<HTMLElement>('.sf-field .sf-err').forEach((p) => (p.textContent = ''));
      form.querySelectorAll('[aria-invalid]').forEach((i) => i.removeAttribute('aria-invalid'));
      for (const [k, msg] of Object.entries(errs)) {
        const input = form.querySelector(`[name="${k}"]`);
        input?.setAttribute('aria-invalid', 'true');
        input?.setAttribute('aria-describedby', `sf-c-${k}-err`);
        form.querySelector(`#sf-c-${k}-err`)!.textContent = msg;
      }
      const consent = (form.querySelector('[name="consent"]') as HTMLInputElement).checked;
      const top = form.querySelector<HTMLElement>('[data-sf-form-error]')!;
      top.textContent = Object.keys(errs).length ? 'Please fix the highlighted details.' : !consent ? 'Please tick the box to agree to how we use your details.' : '';
      if (Object.keys(errs).length || !consent) {
        (form.querySelector('[aria-invalid="true"]') as HTMLElement | null)?.focus();
        return null;
      }
      return { ...c, phone: indianMobile(c.phone)! };
    };
    const actions = h('div', { class: 'sf-pay' },
      cfg.whatsapp ? h('button', { type: 'button', class: 'sf-btn sf-btn-wide sf-btn-wa', 'data-sf-order-whatsapp': '', onclick: () => {
        const c = read(); if (!c) return;
        const link = waLink(cfg.whatsapp!, whatsappOrderText(cfg.site.name, current(), c, kit.store.state.coupon ?? undefined));
        window.open(link, '_blank', 'noopener');
        drawer.dataset.lastWhatsapp = link;
        doneMsg = 'Your order is ready in WhatsApp — just press send. The shop will confirm it there.';
        kit.store.clear(); discount = 0; couponMsg = null; step = 'done'; render();
      } }, 'Order on WhatsApp') : null,
      pay ? h('button', { type: 'button', class: 'sf-btn sf-btn-wide', 'data-sf-pay-online': '', onclick: async (e: Event) => {
        const c = read(); if (!c) return;
        const btn = e.currentTarget as HTMLButtonElement;
        btn.disabled = true; btn.textContent = 'Opening payment…';
        try {
          const r = await payOnline(pay, cfg.site.name, current(), c, kit.store.state.coupon);
          if (r.ok) { kit.store.clear(); discount = 0; step = 'done'; doneMsg = `${r.message}${r.orderId ? ` Order ${r.orderId}.` : ''}`; render(); }
          else { form.querySelector('[data-sf-form-error]')!.textContent = r.message; }
        } catch {
          form.querySelector('[data-sf-form-error]')!.textContent = 'We couldn’t reach the payment service. Please check your internet and try again.';
        } finally { btn.disabled = false; btn.textContent = `Pay ${inr(current().total_paise)} online`; }
      } }, `Pay ${inr(t.total_paise)} online`) : null);
    panel.replaceChildren(head,
      h('div', { class: 'sf-drawer-body' }, form),
      h('div', { class: 'sf-drawer-foot' }, summary, actions, h('button', { type: 'button', class: 'sf-link', onclick: () => { step = 'cart'; render(); } }, '← Back to cart')));
  }

  const counters = () => document.querySelectorAll<HTMLElement>('[data-sf-cart-count]');
  const updateCount = () => {
    const n = current().count;
    counters().forEach((c) => { c.textContent = String(n); c.dataset.count = String(n); });
    document.querySelectorAll('[data-sf-cart-open]').forEach((b) => b.setAttribute('aria-label', `Open cart, ${n} ${n === 1 ? 'item' : 'items'}`));
  };
  kit.store.subscribe(async () => {
    if (kit.store.state.coupon) await refreshCoupon();
    updateCount();
    if (!drawer.hidden) render();
  });

  // One click handler for the whole page: add, wishlist, open cart.
  document.addEventListener('click', (e) => {
    const target = e.target as Element;
    const add = target.closest<HTMLElement>('[data-sf-add]');
    if (add) {
      const p = kit.byId.get(add.dataset.sfAdd!);
      if (!p) return;
      const card = add.closest('[data-product-id]');
      const variantSel = card?.querySelector<HTMLSelectElement>('select[data-slot="variant"]');
      const v = p.variants?.find((x) => x.id === variantSel?.value) ?? p.variants?.[0];
      const max = v ? (v.stock ?? null) : (p.stock ?? null);
      if (p.status === 'sold_out' || max === 0) return;
      kit.store.add(p.id, v?.id, 1, max);
      announce(`Added ${p.name} to your cart.`);
      add.classList.add('sf-added');
      setTimeout(() => add.classList.remove('sf-added'), 900);
      if (add.hasAttribute('data-open-cart')) open();
      return;
    }
    const wish = target.closest<HTMLElement>('[data-sf-wish]');
    if (wish) {
      const p = kit.byId.get(wish.dataset.sfWish!);
      const on = kit.store.toggleWish(wish.dataset.sfWish!);
      wish.setAttribute('aria-pressed', String(on));
      if (p) {
        wish.setAttribute('aria-label', on ? `Remove ${p.name} from wishlist` : `Save ${p.name} to wishlist`);
        announce(on ? `Saved ${p.name} to your wishlist.` : `Removed ${p.name} from your wishlist.`);
      }
      return;
    }
    if (target.closest('[data-sf-cart-open]')) { e.preventDefault(); open(); }
  });
  kit.onLoad(async () => { await refreshCoupon(); updateCount(); });
  return { open, close };
}
