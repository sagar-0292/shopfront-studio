// Shopfront commerce kit. Sites add data-sf-* hooks and a JSON config; this
// file does the rest. No cart, checkout or booking logic is ever generated.
import type { Config } from './types';
import { Kit } from './kit';
import { mountFilters, mountGrid, mountSearch, mountSort, type Grid } from './ui-grid';
import { mountCart } from './ui-cart';
import { mountBooking } from './ui-booking';
import { mountCategories, mountSellerInfo, mountWishCount, mountWishlist } from './ui-nav';
import { HOOKS } from './hooks';
import { inr } from './money';

declare const __KIT_VERSION__: string;
export const version = typeof __KIT_VERSION__ === 'string' ? __KIT_VERSION__ : 'dev';

let kit: Kit | null = null;
const grids = new Map<string, Grid>();
let cart: ReturnType<typeof mountCart> | null = null;

function readConfig(): Config | null {
  const el = document.getElementById('sf-config');
  if (!el) return null;
  try {
    const c = JSON.parse(el.textContent ?? '') as Config;
    if (!c?.site?.id || !c.source) throw new Error('site.id and source are required');
    return c;
  } catch (e) {
    console.error('[sf-commerce] The shop settings (#sf-config) are not valid JSON.', e);
    return null;
  }
}

export function init(config?: Config) {
  if (kit) return kit;
  const cfg = config ?? readConfig();
  if (!cfg) return null;
  kit = new Kit(cfg);
  const k = kit;
  document.querySelectorAll<HTMLElement>('[data-sf-products]').forEach((el, i) => {
    const g = mountGrid(el, k);
    grids.set(el.id || `grid-${i}`, g);
    k.onLoad(g.render);
    k.store.subscribe(() => {
      // keep wishlist hearts in sync without re-rendering the whole grid
      el.querySelectorAll<HTMLElement>('[data-sf-wish]').forEach((b) => b.setAttribute('aria-pressed', String(k.store.state.wishlist.includes(b.dataset.sfWish!))));
    });
    g.render();
  });
  const gridFor = (el: Element) => grids.get(el.getAttribute('data-for') ?? '') ?? grids.values().next().value;
  document.querySelectorAll<HTMLElement>('[data-sf-filters]').forEach((el) => { const g = gridFor(el); if (g) mountFilters(el, g, k); });
  document.querySelectorAll<HTMLInputElement>('input[data-sf-search]').forEach((el) => { const g = gridFor(el); if (g) mountSearch(el, g); });
  document.querySelectorAll<HTMLSelectElement>('select[data-sf-sort]').forEach((el) => { const g = gridFor(el); if (g) mountSort(el, g); });
  document.querySelectorAll<HTMLElement>('[data-sf-categories]').forEach((el) => mountCategories(el, k));
  document.querySelectorAll<HTMLElement>('[data-sf-seller-info]').forEach((el) => mountSellerInfo(el, k));
  document.querySelectorAll<HTMLElement>('[data-sf-wishlist]').forEach((el) => mountWishlist(el, k));
  document.querySelectorAll<HTMLElement>('[data-sf-booking]').forEach((el) => mountBooking(el, k));
  mountWishCount(k);
  cart = mountCart(k);
  document.documentElement.classList.add('sf-commerce-ready');
  k.load();
  return k;
}

export const api = {
  version,
  init,
  hooks: HOOKS,
  inr,
  openCart: () => cart?.open(),
  closeCart: () => cart?.close(),
  state: () => kit?.store.state,
  products: () => kit?.products ?? [],
};

declare global {
  interface Window { SFCommerce?: typeof api }
}
window.SFCommerce = api;

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => init(), { once: true });
else init();
