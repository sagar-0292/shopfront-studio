import type { BookingRequest, BookingResult, CatalogData, Config, CouponResult, Product, Service, Slot } from './types';
import { applyCoupon } from './pricing';
import { slotsFor } from './slots';

// Where live data comes from. Sites use "supabase" in production; the demo
// pages and tests use "json". Both give the kit the same shape of data.
export interface DataSource {
  products(): Promise<Product[]>;
  coupon(code: string, subtotal_paise: number): Promise<CouponResult>;
  services(): Promise<Service[]>;
  slots(serviceId: string, date: string): Promise<Slot[]>;
  book(req: BookingRequest): Promise<BookingResult>;
}

export function jsonSource(cfg: Extract<Config['source'], { type: 'json' }>, siteId: string): DataSource {
  let cache: Promise<CatalogData> | null = null;
  const data = () =>
    (cache ??= cfg.data
      ? Promise.resolve(cfg.data)
      : fetch(cfg.url!, { credentials: 'omit' }).then((r) => {
          if (!r.ok) throw new Error(`Catalogue could not load (${r.status})`);
          return r.json() as Promise<CatalogData>;
        }));
  // Demo bookings are remembered in this browser so availability updates live.
  const key = `sf-demo-bookings:${siteId}`;
  const localBooked = (): Record<string, Record<string, number>> => {
    try { return JSON.parse(localStorage.getItem(key) ?? '{}'); } catch { return {}; }
  };
  const merged = async () => {
    const d = await data();
    if (!d.bookings) return null;
    const local = localBooked();
    const booked: Record<string, Record<string, number>> = JSON.parse(JSON.stringify(d.bookings.booked ?? {}));
    for (const [day, times] of Object.entries(local)) for (const [t, n] of Object.entries(times)) {
      booked[day] ??= {};
      booked[day][t] = (booked[day][t] ?? 0) + n;
    }
    return { ...d.bookings, booked };
  };
  return {
    products: async () => (await data()).products.filter((p) => p.status !== undefined ? ['active', 'sold_out'].includes(p.status) : true),
    coupon: async (code, subtotal) => applyCoupon((await data()).coupons ?? [], code, subtotal),
    services: async () => (await data()).bookings?.services ?? [],
    slots: async (serviceId, date) => {
      const rules = await merged();
      const svc = rules?.services.find((s) => s.id === serviceId);
      return rules && svc ? slotsFor(rules, date, svc.duration_minutes) : [];
    },
    book: async (req) => {
      const rules = await merged();
      const svc = rules?.services.find((s) => s.id === req.service);
      const slot = rules && svc ? slotsFor(rules, req.date, svc.duration_minutes).find((s) => s.time === req.time) : null;
      if (!slot?.available) return { ok: false, message: 'Sorry, that time was just taken. Please pick another slot.' };
      const all = localBooked();
      all[req.date] ??= {};
      all[req.date][req.time] = (all[req.date][req.time] ?? 0) + 1;
      try { localStorage.setItem(key, JSON.stringify(all)); } catch { /* ignore */ }
      return { ok: true, reference: `BK-${req.date.replace(/-/g, '').slice(2)}-${req.time.replace(':', '')}` };
    },
  };
}

/**
 * Live data from the shop's database (read-only public view of products).
 * Coupons and bookings need the shop's server and switch on in Phase 6;
 * until then they answer politely instead of failing.
 */
export function supabaseSource(cfg: Extract<Config['source'], { type: 'supabase' }>, siteId: string): DataSource {
  const base = cfg.url.replace(/\/$/, '');
  const headers = { apikey: cfg.anonKey, authorization: `Bearer ${cfg.anonKey}` };
  type Row = { id: string; name: string; description: string; price_paise: number; mrp_paise: number | null; status: 'active' | 'sold_out'; featured: boolean; created_at: string; categories: { id: string; name: string } | null; sellers: { id: string; name: string } | null };
  const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  return {
    async products() {
      const q = `select=id,name,description,price_paise,mrp_paise,status,featured,created_at,categories(id,name),sellers(id,name)&site_id=eq.${encodeURIComponent(siteId)}&status=in.(active,sold_out)&order=created_at.desc`;
      const r = await fetch(`${base}/rest/v1/products?${q}`, { headers });
      if (!r.ok) throw new Error(`Products could not load (${r.status})`);
      return ((await r.json()) as Row[]).map((p) => ({
        id: p.id, slug: slug(p.name) || p.id, name: p.name, description: p.description,
        price_paise: Number(p.price_paise), mrp_paise: p.mrp_paise == null ? null : Number(p.mrp_paise),
        status: p.status, featured: p.featured, created_at: p.created_at,
        category: p.categories ? { slug: slug(p.categories.name), name: p.categories.name } : null,
        seller: p.sellers ? { slug: slug(p.sellers.name), name: p.sellers.name } : null,
      }));
    },
    coupon: async () => ({ ok: false, message: 'Coupons will be available soon.' }),
    services: async () => [],
    slots: async () => [],
    book: async () => ({ ok: false, message: 'Online booking isn’t available yet. Please call or WhatsApp us.' }),
  };
}

export function sourceFor(cfg: Config): DataSource {
  return cfg.source.type === 'supabase' ? supabaseSource(cfg.source, cfg.site.id) : jsonSource(cfg.source, cfg.site.id);
}
