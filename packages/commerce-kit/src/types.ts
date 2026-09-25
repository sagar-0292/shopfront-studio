export type Image = { src: string; alt?: string; srcset?: string; width?: number; height?: number };
export type Variant = { id: string; label: string; price_paise: number; mrp_paise?: number | null; stock?: number | null };
export type Ref = { slug: string; name: string; description?: string; image?: string };

export type Product = {
  id: string;
  slug: string;
  name: string;
  description?: string;
  price_paise: number;
  mrp_paise?: number | null;
  image?: Image | null;
  category?: Ref | null;
  seller?: Ref | null;
  badges?: string[];
  /** null / undefined = not tracked (always available) */
  stock?: number | null;
  status?: 'active' | 'sold_out';
  featured?: boolean;
  variants?: Variant[];
  url?: string;
  created_at?: string;
};

export type Coupon = {
  code: string;
  type: 'percent' | 'flat';
  value: number; // percent (e.g. 10) or paise
  min_subtotal_paise?: number;
  max_discount_paise?: number;
  label?: string;
};

export type CouponResult = { ok: true; code: string; discount_paise: number; message: string } | { ok: false; message: string };

export type Slot = { time: string; label: string; available: boolean; left?: number };
export type Service = { id: string; name: string; duration_minutes: number; price_paise?: number };
export type BookingRequest = { service: string; date: string; time: string; name: string; phone: string; notes?: string };
export type BookingResult = { ok: true; reference: string } | { ok: false; message: string };

export type CartLine = { productId: string; variantId?: string; qty: number };

export type Config = {
  site: { id: string; name: string; privacyUrl?: string };
  whatsapp?: string;
  delivery?: { fee_paise: number; free_above_paise?: number; note?: string };
  checkout?: { razorpay?: { keyId: string; orderEndpoint: string; verifyEndpoint: string } };
  source:
    | { type: 'json'; url?: string; data?: CatalogData }
    | { type: 'supabase'; url: string; anonKey: string };
};

export type CatalogData = {
  products: Product[];
  coupons?: Coupon[];
  bookings?: BookingRules;
};

export type BookingRules = {
  services: Service[];
  /** keys sun..sat, each a list of [open, close] in 24h "HH:MM" */
  hours: Partial<Record<'sun' | 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat', [string, string][]>>;
  slot_minutes: number;
  capacity: number;
  blocked_dates?: string[];
  booked?: Record<string, Record<string, number>>;
  timezone?: string;
};
