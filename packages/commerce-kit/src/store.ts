import type { CartLine } from './types';

// The cart, wishlist and applied coupon, remembered in this browser per shop.
type State = { cart: CartLine[]; wishlist: string[]; coupon: string | null };
type Listener = (s: State) => void;

export class Store {
  private s: State = { cart: [], wishlist: [], coupon: null };
  private listeners = new Set<Listener>();
  constructor(private key: string) {
    try {
      const raw = JSON.parse(localStorage.getItem(key) ?? 'null');
      if (raw && Array.isArray(raw.cart)) {
        this.s = {
          cart: raw.cart.filter((l: CartLine) => typeof l?.productId === 'string' && Number.isInteger(l.qty) && l.qty > 0).slice(0, 100),
          wishlist: Array.isArray(raw.wishlist) ? raw.wishlist.filter((x: unknown) => typeof x === 'string').slice(0, 200) : [],
          coupon: typeof raw.coupon === 'string' ? raw.coupon : null,
        };
      }
    } catch { /* private mode or bad data: start empty */ }
    window.addEventListener('storage', (e) => {
      if (e.key === key && e.newValue) { try { this.s = JSON.parse(e.newValue); this.emit(); } catch { /* ignore */ } }
    });
  }
  get state() { return this.s; }
  subscribe(fn: Listener) { this.listeners.add(fn); return () => this.listeners.delete(fn); }
  private save() {
    try { localStorage.setItem(this.key, JSON.stringify(this.s)); } catch { /* ignore */ }
    this.emit();
  }
  private emit() { this.listeners.forEach((fn) => fn(this.s)); }
  private same = (a: CartLine, id: string, v?: string) => a.productId === id && (a.variantId ?? '') === (v ?? '');

  add(productId: string, variantId?: string, qty = 1, max: number | null = null) {
    const line = this.s.cart.find((l) => this.same(l, productId, variantId));
    const next = Math.min((line?.qty ?? 0) + qty, max ?? 99);
    this.s = { ...this.s, cart: line ? this.s.cart.map((l) => (l === line ? { ...l, qty: next } : l)) : [...this.s.cart, { productId, variantId, qty: next }] };
    this.save();
  }
  setQty(productId: string, variantId: string | undefined, qty: number) {
    this.s = { ...this.s, cart: qty <= 0 ? this.s.cart.filter((l) => !this.same(l, productId, variantId)) : this.s.cart.map((l) => (this.same(l, productId, variantId) ? { ...l, qty: Math.min(qty, 99) } : l)) };
    this.save();
  }
  clear() { this.s = { ...this.s, cart: [], coupon: null }; this.save(); }
  toggleWish(productId: string) {
    const has = this.s.wishlist.includes(productId);
    this.s = { ...this.s, wishlist: has ? this.s.wishlist.filter((x) => x !== productId) : [...this.s.wishlist, productId] };
    this.save();
    return !has;
  }
  setCoupon(code: string | null) { this.s = { ...this.s, coupon: code }; this.save(); }
}
