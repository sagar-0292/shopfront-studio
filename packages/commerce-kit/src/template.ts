import type { Product } from './types';
import { discountPercent, inr } from './money';
import { inStock, mrpOf, priceOf, stockLabel } from './catalog';
import { h } from './dom';

// Fills a site's own card design with a product. The design is a <template>
// whose elements carry data-slot="…" (see hooks.ts for the list).
const DEFAULT_CARD = `
<article class="sf-card">
  <a data-slot="link" class="sf-card-media"><img data-slot="image" alt=""></a>
  <div class="sf-card-body">
    <p class="sf-card-meta"><span data-slot="category"></span></p>
    <h3 data-slot="name"></h3>
    <p class="sf-card-price"><strong data-slot="price"></strong> <s data-slot="mrp"></s> <span data-slot="discount"></span></p>
    <p data-slot="stock"></p>
    <div class="sf-card-actions"><select data-slot="variant"></select><button data-slot="add"></button><button data-slot="wishlist"></button></div>
  </div>
</article>`;

export function templateFor(grid: HTMLElement): HTMLTemplateElement {
  const ref = grid.getAttribute('data-template');
  const t = (ref && document.querySelector<HTMLTemplateElement>(`template${ref.startsWith('#') ? ref : `#${ref}`}`)) || grid.querySelector<HTMLTemplateElement>('template[data-sf-card]');
  if (t) return t;
  const fallback = document.createElement('template');
  fallback.innerHTML = DEFAULT_CARD.trim();
  return fallback;
}

export type CardContext = { wished: boolean };

export function fillCard(tpl: HTMLTemplateElement, p: Product, ctx: CardContext): HTMLElement {
  const frag = tpl.content.cloneNode(true) as DocumentFragment;
  const root = (frag.firstElementChild as HTMLElement) ?? h('div');
  root.dataset.productId = p.id;
  const avail = inStock(p);
  root.classList.toggle('sf-soldout', !avail);
  const slot = (name: string) => Array.from(frag.querySelectorAll<HTMLElement>(`[data-slot="${name}"]`));
  const text = (name: string, value: string | null | undefined) =>
    slot(name).forEach((el) => { if (value) el.textContent = value; else el.hidden = true; });

  text('name', p.name);
  text('description', p.description);
  text('category', p.category?.name);
  text('seller', p.seller?.name);
  const price = priceOf(p);
  const mrp = mrpOf(p);
  const from = p.variants && p.variants.length > 1 && new Set(p.variants.map((v) => v.price_paise)).size > 1;
  text('price', (from ? 'From ' : '') + inr(from ? Math.min(...p.variants!.map((v) => v.price_paise)) : price));
  const off = discountPercent(price, mrp);
  text('mrp', off ? inr(mrp!) : null);
  slot('mrp').forEach((el) => off && el.setAttribute('aria-label', `MRP ${inr(mrp!)}`));
  text('discount', off ? `${off}% off` : null);
  const stock = stockLabel(p);
  slot('stock').forEach((el) => { el.textContent = stock.label; el.dataset.state = stock.state; });
  slot('badges').forEach((el) => {
    if (!p.badges?.length) { el.hidden = true; return; }
    el.replaceChildren(...p.badges.map((b) => h('span', { class: 'sf-badge' }, b)));
  });
  slot('image').forEach((el) => {
    if (!(el instanceof HTMLImageElement)) return;
    if (!p.image?.src) { el.hidden = true; return; }
    el.src = p.image.src;
    el.alt = p.image.alt ?? p.name;
    if (p.image.srcset) el.srcset = p.image.srcset;
    if (p.image.width) el.width = p.image.width;
    if (p.image.height) el.height = p.image.height;
    el.loading = 'lazy';
    el.decoding = 'async';
  });
  slot('link').forEach((el) => {
    if (el instanceof HTMLAnchorElement) {
      el.href = p.url ?? `#${p.slug}`;
      if (!el.textContent?.trim() && !el.querySelector('img')) el.textContent = p.name;
      if (!el.getAttribute('aria-label') && !el.textContent?.trim()) el.setAttribute('aria-label', p.name);
    }
  });
  slot('variant').forEach((el) => {
    if (!(el instanceof HTMLSelectElement) || !p.variants?.length) { el.hidden = true; el.remove(); return; }
    el.setAttribute('aria-label', `Choose ${p.name} option`);
    el.replaceChildren(...p.variants.map((v) => h('option', { value: v.id, disabled: v.stock === 0 }, `${v.label} – ${inr(v.price_paise)}${v.stock === 0 ? ' (sold out)' : ''}`)));
    const firstAvailable = p.variants.find((v) => v.stock !== 0);
    if (firstAvailable) el.value = firstAvailable.id;
  });
  slot('add').forEach((el) => {
    el.dataset.sfAdd = p.id;
    if (el instanceof HTMLButtonElement) el.type = 'button';
    if (!el.textContent?.trim()) el.textContent = avail ? 'Add to cart' : 'Sold out';
    else if (!avail) el.textContent = 'Sold out';
    el.setAttribute('aria-label', avail ? `Add ${p.name} to cart` : `${p.name} is sold out`);
    if (!avail) el.setAttribute('disabled', '');
  });
  slot('wishlist').forEach((el) => {
    el.dataset.sfWish = p.id;
    if (el instanceof HTMLButtonElement) el.type = 'button';
    el.setAttribute('aria-pressed', String(ctx.wished));
    el.setAttribute('aria-label', ctx.wished ? `Remove ${p.name} from wishlist` : `Save ${p.name} to wishlist`);
    if (!el.textContent?.trim()) el.textContent = '♡';
  });
  return root;
}
