import type { Product, Variant } from './types';

export type Query = {
  q?: string;
  categories?: string[];
  sellers?: string[];
  min?: number | null; // paise
  max?: number | null;
  inStock?: boolean;
  featured?: boolean;
  sort?: Sort;
  limit?: number;
};
export const SORTS = {
  featured: 'Featured',
  'price-asc': 'Price: low to high',
  'price-desc': 'Price: high to low',
  newest: 'Newest',
  name: 'Name A–Z',
  discount: 'Biggest discount',
} as const;
export type Sort = keyof typeof SORTS;

export const priceOf = (p: Product, v?: Variant) => v?.price_paise ?? p.price_paise;
export const mrpOf = (p: Product, v?: Variant) => (v ? v.mrp_paise : p.mrp_paise) ?? null;

export function stockOf(p: Product, v?: Variant): number | null {
  if (p.status === 'sold_out') return 0;
  const s = v ? v.stock : p.stock;
  return s === undefined ? null : s;
}
export const inStock = (p: Product, v?: Variant) => {
  if (p.variants?.length && !v) return p.variants.some((x) => stockOf(p, x) !== 0);
  return stockOf(p, v) !== 0;
};

export type StockInfo = { state: 'out' | 'low' | 'in' | 'untracked'; label: string };
export function stockLabel(p: Product, v?: Variant): StockInfo {
  const s = stockOf(p, v);
  if (s === 0 || (!v && p.variants?.length && !inStock(p))) return { state: 'out', label: 'Sold out' };
  if (s === null) return { state: 'untracked', label: 'In stock' };
  if (s <= 5) return { state: 'low', label: `Only ${s} left` };
  return { state: 'in', label: 'In stock' };
}

const norm = (s: string) => s.toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '');

export function search(products: Product[], query: Query): Product[] {
  const words = norm(query.q ?? '').split(/\s+/).filter(Boolean);
  let list = products.filter((p) => {
    if (query.categories?.length && !query.categories.includes(p.category?.slug ?? '')) return false;
    if (query.sellers?.length && !query.sellers.includes(p.seller?.slug ?? '')) return false;
    if (query.min != null && p.price_paise < query.min) return false;
    if (query.max != null && p.price_paise > query.max) return false;
    if (query.inStock && !inStock(p)) return false;
    if (query.featured && !p.featured) return false;
    if (words.length) {
      const hay = norm([p.name, p.description, p.category?.name, p.seller?.name, ...(p.badges ?? [])].join(' '));
      if (!words.every((w) => hay.includes(w))) return false;
    }
    return true;
  });
  const by: Record<Sort, (a: Product, b: Product) => number> = {
    featured: (a, b) => Number(!!b.featured) - Number(!!a.featured) || Number(inStock(b)) - Number(inStock(a)),
    'price-asc': (a, b) => a.price_paise - b.price_paise,
    'price-desc': (a, b) => b.price_paise - a.price_paise,
    newest: (a, b) => (b.created_at ?? '').localeCompare(a.created_at ?? ''),
    name: (a, b) => a.name.localeCompare(b.name, 'en-IN'),
    discount: (a, b) => discount(b) - discount(a),
  };
  list = list.slice().sort(by[query.sort ?? 'featured'] ?? by.featured);
  return query.limit ? list.slice(0, query.limit) : list;
}
const discount = (p: Product) => (p.mrp_paise && p.mrp_paise > p.price_paise ? (p.mrp_paise - p.price_paise) / p.mrp_paise : 0);

export type Facets = {
  categories: { slug: string; name: string; count: number }[];
  sellers: { slug: string; name: string; count: number }[];
  price: { min: number; max: number };
};

/** Works out which filters make sense for these products. */
export function facets(products: Product[]): Facets {
  const cats = new Map<string, { slug: string; name: string; count: number }>();
  const sellers = new Map<string, { slug: string; name: string; count: number }>();
  let min = Infinity, max = 0;
  for (const p of products) {
    if (p.category) {
      const c = cats.get(p.category.slug) ?? { ...p.category, count: 0 };
      c.count++; cats.set(c.slug, c);
    }
    if (p.seller) {
      const s = sellers.get(p.seller.slug) ?? { slug: p.seller.slug, name: p.seller.name, count: 0 };
      s.count++; sellers.set(s.slug, s);
    }
    min = Math.min(min, p.price_paise); max = Math.max(max, p.price_paise);
  }
  const sort = <T extends { name: string }>(m: Map<string, T>) => [...m.values()].sort((a, b) => a.name.localeCompare(b.name, 'en-IN'));
  return { categories: sort(cats), sellers: sort(sellers), price: { min: Number.isFinite(min) ? min : 0, max } };
}
