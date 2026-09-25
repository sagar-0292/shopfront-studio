import type { Kit } from './kit';
import { facets } from './catalog';
import { h, rendered } from './dom';
import { fillCard, templateFor } from './template';

// <nav data-sf-categories data-href="/shop?category={slug}"> — links to every category.
export function mountCategories(el: HTMLElement, kit: Kit) {
  kit.onLoad(() => {
    const pattern = el.getAttribute('data-href') ?? '?category={slug}';
    const current = new URLSearchParams(location.search).get('category');
    const list = h('ul', { class: 'sf-cat-list' }, ...facets(kit.products).categories.map((c) =>
      h('li', {}, h('a', { href: pattern.replace('{slug}', encodeURIComponent(c.slug)), 'aria-current': c.slug === current ? 'page' : null }, c.name, ' ', h('span', { class: 'sf-count' }, `(${c.count})`)))));
    el.replaceChildren(list);
  });
}

// <div data-sf-seller-info data-seller="@url"> — the seller's name and product count on a seller page.
export function mountSellerInfo(el: HTMLElement, kit: Kit) {
  kit.onLoad(() => {
    const attr = el.getAttribute('data-seller');
    const slug = attr === '@url' || !attr ? new URLSearchParams(location.search).get('seller') : attr;
    const s = facets(kit.products).sellers.find((x) => x.slug === slug);
    const seller = kit.products.find((p) => p.seller?.slug === slug)?.seller;
    el.replaceChildren(s
      ? h('div', { class: 'sf-seller' }, h('h1', {}, s.name), seller?.description ? h('p', {}, seller.description) : null, h('p', { class: 'sf-note' }, `${s.count} ${s.count === 1 ? 'product' : 'products'}`))
      : h('p', {}, 'This seller could not be found.'));
  });
}

// <div data-sf-wishlist> (+ optional <template data-sf-card>) — the saved products.
export function mountWishlist(el: HTMLElement, kit: Kit) {
  const tpl = templateFor(el);
  const list = h('div', { class: 'sf-grid-list', role: 'list' });
  el.append(list);
  const draw = () => {
    if (!kit.loaded) return;
    const items = kit.store.state.wishlist.map((id) => kit.byId.get(id)).filter(Boolean);
    list.replaceChildren(...(items.length ? items.map((p) => { const c = fillCard(tpl, p!, { wished: true }); c.setAttribute('role', 'listitem'); return c; }) : [h('p', { class: 'sf-note' }, 'Nothing saved yet. Tap ♡ on a product to save it here.')]));
    el.dataset.count = String(items.length);
    rendered(list);
  };
  kit.onLoad(draw);
  kit.store.subscribe(draw);
}

export function mountWishCount(kit: Kit) {
  const draw = () => document.querySelectorAll<HTMLElement>('[data-sf-wishlist-count]').forEach((e) => (e.textContent = String(kit.store.state.wishlist.length)));
  kit.store.subscribe(draw);
  draw();
}
