import type { Product } from './types';
import { facets, search, SORTS, type Query, type Sort } from './catalog';
import { fillCard, templateFor } from './template';
import { h, rendered } from './dom';
import { inr } from './money';
import type { Kit } from './kit';

// <div data-sf-products id="shop" data-category="sweets" data-seller="@url" data-limit="8" data-sort="price-asc" data-sync-url>
//   <template data-sf-card> …site's own card design with data-slot="…" … </template>
// </div>
export type Grid = { el: HTMLElement; query: Query; base: Query; render: () => void; all: () => Product[] };

const fromUrl = (v: string | null, param: string) => (v === '@url' ? new URLSearchParams(location.search).get(param) : v);

export function mountGrid(el: HTMLElement, kit: Kit): Grid {
  const tpl = templateFor(el);
  const list = h('div', { class: 'sf-grid-list' });
  const status = h('p', { class: 'sf-grid-status', 'aria-live': 'polite' });
  el.append(list, status);
  const cat = fromUrl(el.getAttribute('data-category'), 'category');
  const seller = fromUrl(el.getAttribute('data-seller'), 'seller');
  const base: Query = {
    categories: cat ? [cat] : undefined,
    sellers: seller ? [seller] : undefined,
    featured: el.hasAttribute('data-featured') || undefined,
    limit: Number(el.getAttribute('data-limit')) || undefined,
    sort: (el.getAttribute('data-sort') as Sort) || undefined,
  };
  const grid: Grid = { el, base, query: { ...base }, all: () => kit.products, render };
  if (el.hasAttribute('data-sync-url')) {
    const p = new URLSearchParams(location.search);
    grid.query = {
      ...grid.query,
      q: p.get('q') ?? undefined,
      categories: p.getAll('cat').length ? p.getAll('cat') : grid.query.categories,
      sellers: p.getAll('seller').length && !seller ? p.getAll('seller') : grid.query.sellers,
      sort: (p.get('sort') as Sort) ?? grid.query.sort,
      inStock: p.get('stock') === '1' || undefined,
    };
  }
  // Placeholder cards the size of real ones, so the page doesn't jump when products arrive.
  const skeletons = () => {
    const n = Math.min(Number(el.getAttribute('data-limit')) || 8, 12);
    const dummy: Product = { id: 'skeleton', slug: '', name: '\u00a0', price_paise: 0, category: { slug: '', name: '\u00a0' }, seller: { slug: '', name: '\u00a0' }, stock: 10, image: { src: 'data:image/gif;base64,R0lGODlhAQABAAAAACw=', alt: '' } };
    list.replaceChildren(...Array.from({ length: n }, () => {
      const c = fillCard(tpl, dummy, { wished: false });
      c.classList.add('sf-skeleton');
      c.setAttribute('aria-hidden', 'true');
      c.removeAttribute('role');
      c.removeAttribute('data-sf-reveal');
      c.querySelectorAll('[data-sf-reveal]').forEach((x) => x.removeAttribute('data-sf-reveal'));
      c.querySelectorAll<HTMLElement>('button, a, select').forEach((x) => x.setAttribute('tabindex', '-1'));
      return c;
    }));
  };
  function render() {
    if (kit.error) {
      list.replaceChildren();
      status.textContent = 'Sorry, products couldn’t load. Please refresh the page.';
      el.dataset.state = 'error';
      return;
    }
    if (!kit.loaded) {
      if (el.dataset.state !== 'loading') skeletons();
      el.dataset.state = 'loading';
      status.textContent = 'Loading products…';
      return;
    }
    const items = search(kit.products, grid.query);
    const wish = new Set(kit.store.state.wishlist);
    list.replaceChildren(...items.map((p) => {
      const card = fillCard(tpl, p, { wished: wish.has(p.id) });
      card.setAttribute('role', 'listitem');
      return card;
    }));
    if (items.length) list.setAttribute('role', 'list'); else list.removeAttribute('role');
    el.dataset.state = items.length ? 'ready' : 'empty';
    el.dataset.count = String(items.length);
    status.textContent = items.length ? `${items.length} ${items.length === 1 ? 'product' : 'products'}` : (el.getAttribute('data-empty') ?? 'No products match. Try clearing the filters.');
    if (el.hasAttribute('data-sync-url')) syncUrl(grid.query);
    rendered(list);
  }
  return grid;
}

function syncUrl(q: Query) {
  const p = new URLSearchParams(location.search);
  ['q', 'cat', 'seller', 'sort', 'stock'].forEach((k) => p.delete(k));
  if (q.q) p.set('q', q.q);
  q.categories?.forEach((c) => p.append('cat', c));
  q.sellers?.forEach((s) => p.append('seller', s));
  if (q.sort && q.sort !== 'featured') p.set('sort', q.sort);
  if (q.inStock) p.set('stock', '1');
  const s = p.toString();
  history.replaceState(history.state, '', `${location.pathname}${s ? `?${s}` : ''}${location.hash}`);
}

// <form data-sf-filters data-for="shop"> — builds category, seller, price and stock filters from the products.
// <input data-sf-search data-for="shop">  ·  <select data-sf-sort data-for="shop">
export function mountFilters(el: HTMLElement, grid: Grid, kit: Kit) {
  el.classList.add('sf-filters');
  // On phones the filters fold away behind a "Filters" button.
  const box = h('details', { class: 'sf-filters-box', open: window.matchMedia('(min-width: 900px)').matches });
  const body = h('div', { class: 'sf-filters-body' });
  box.append(h('summary', {}, 'Filters'), body);
  el.replaceChildren(box);
  const build = () => {
    if (!kit.loaded) return;
    const f = facets(grid.all().filter((p) => !grid.base.categories || grid.base.categories.includes(p.category?.slug ?? '')));
    const group = (legend: string, name: string, items: { slug: string; name: string; count: number }[], selected: string[] = []) =>
      items.length > 1
        ? h('fieldset', { class: 'sf-filter-group' }, h('legend', {}, legend),
            ...items.map((i) => h('label', { class: 'sf-check' },
              h('input', { type: 'checkbox', name, value: i.slug, checked: selected.includes(i.slug) }),
              ` ${i.name} `, h('span', { class: 'sf-count' }, `(${i.count})`))))
        : null;
    const price = f.price.max > f.price.min
      ? h('fieldset', { class: 'sf-filter-group' }, h('legend', {}, 'Price'),
          h('label', { class: 'sf-price' }, 'Up to ', h('output', { name: 'maxOut' }, inr(grid.query.max ?? f.price.max))),
          h('input', { type: 'range', name: 'max', min: f.price.min, max: f.price.max, step: 'any', value: grid.query.max ?? f.price.max, 'aria-label': 'Maximum price' }))
      : null;
    body.replaceChildren(
      ...[
        grid.base.categories ? null : group('Category', 'cat', f.categories, grid.query.categories),
        grid.base.sellers ? null : group('Seller', 'seller', f.sellers, grid.query.sellers),
        price,
        h('label', { class: 'sf-check' }, h('input', { type: 'checkbox', name: 'stock', checked: !!grid.query.inStock }), ' In stock only'),
        h('button', { type: 'reset', class: 'sf-link' }, 'Clear filters'),
      ].filter(Boolean) as HTMLElement[],
    );
  };
  const apply = () => {
    const data = new FormData(el as HTMLFormElement);
    const cats = data.getAll('cat').map(String);
    const sellers = data.getAll('seller').map(String);
    // Round the slider to whole rupees; the far right end always means "no limit".
    const raw = Number(data.get('max'));
    const max = Math.round(raw / 100) * 100;
    const out = el.querySelector('output');
    if (out && Number.isFinite(max)) out.textContent = inr(max);
    const f = facets(grid.all());
    grid.query = {
      ...grid.query,
      categories: grid.base.categories ?? (cats.length ? cats : undefined),
      sellers: grid.base.sellers ?? (sellers.length ? sellers : undefined),
      max: Number.isFinite(raw) && raw < f.price.max ? max : null,
      inStock: data.get('stock') === 'on' || undefined,
    };
    grid.render();
  };
  el.addEventListener('input', apply);
  el.addEventListener('change', apply);
  el.addEventListener('submit', (e) => e.preventDefault());
  el.addEventListener('reset', () => setTimeout(() => { grid.query = { ...grid.base, q: grid.query.q, sort: grid.query.sort }; build(); grid.render(); }));
  kit.onLoad(build);
}

export function mountSearch(el: HTMLInputElement, grid: Grid) {
  if (!el.getAttribute('aria-label') && !el.labels?.length) el.setAttribute('aria-label', 'Search products');
  el.type = 'search';
  el.value = grid.query.q ?? '';
  let t = 0;
  el.addEventListener('input', () => {
    clearTimeout(t);
    t = window.setTimeout(() => { grid.query = { ...grid.query, q: el.value.trim() || undefined }; grid.render(); }, 150);
  });
}

export function mountSort(el: HTMLSelectElement, grid: Grid) {
  if (!el.options.length) el.append(...Object.entries(SORTS).map(([v, l]) => h('option', { value: v }, l)));
  if (!el.getAttribute('aria-label') && !el.labels?.length) el.setAttribute('aria-label', 'Sort products');
  el.value = grid.query.sort ?? 'featured';
  el.addEventListener('change', () => { grid.query = { ...grid.query, sort: el.value as Sort }; grid.render(); });
}
