// The four design directions, as the studio describes them to people.
// The looks themselves live in the design kit (packages/design-kit).
export const DIRECTIONS = ['editorial', 'bold', 'cinematic', 'crafted'] as const;
export type Direction = (typeof DIRECTIONS)[number];

export type DirectionInfo = {
  key: Direction;
  name: string;
  feel: string;
  bestFor: string;
  fonts: string;
  swatches: string[];
  sample: { id: string; name: string; kind: string };
};

export const DESIGNS: Record<Direction, DirectionInfo> = {
  editorial: {
    key: 'editorial', name: 'Editorial luxury', feel: 'Like a fashion magazine: thin elegant serif headlines, ivory and ink, dark-gold details, lots of air.',
    bestFor: 'Jewellers, boutiques, designers, architects, premium salons', fonts: 'Cormorant Garamond & Jost',
    swatches: ['#f7f3ec', '#1c1917', '#7a5a1e', '#0f3d2e'], sample: { id: 'aranya', name: 'Aranya', kind: 'Jeweller, Kala Ghoda' },
  },
  bold: {
    key: 'bold', name: 'Bold & vibrant', feel: 'Like a festival poster: huge chunky type, bright colour blocks, stickers and playful shadows.',
    bestFor: 'Sweet shops, snacks, cafés, kids’ brands, events, D2C products', fonts: 'Bricolage Grotesque & DM Sans',
    swatches: ['#fff6e5', '#22061f', '#c8135f', '#ff9f1c'], sample: { id: 'mithai-market', name: 'Mithai Market', kind: 'Sweet shop, Dadar' },
  },
  cinematic: {
    key: 'cinematic', name: 'Dark & cinematic', feel: 'Like a film title sequence: near-black, glowing ember accents, wide capitals, slow dramatic reveals.',
    bestFor: 'Restaurants, bars, gyms, studios, tech and automotive', fonts: 'Syne & Manrope',
    swatches: ['#0b0b0c', '#f4f1ea', '#ff5a1f', '#ffb347'], sample: { id: 'ember', name: 'Ember', kind: 'Restaurant & bar, Lower Parel' },
  },
  crafted: {
    key: 'crafted', name: 'Warm & crafted', feel: 'Like a handmade label: kraft-paper tones, soft serif with hand-drawn underlines, friendly shapes.',
    bestFor: 'Bakeries, organic stores, home décor, handicrafts, clinics, schools', fonts: 'Fraunces & Work Sans',
    swatches: ['#f3e8d6', '#3b2a1e', '#a8481f', '#5f6f2f'], sample: { id: 'bandra-bake-house', name: 'Bandra Bake House', kind: 'Bakery, Bandra' },
  },
};

export const isDirection = (v: unknown): v is Direction => typeof v === 'string' && (DIRECTIONS as readonly string[]).includes(v);
export const sampleSiteUrl = (d: Direction) => `/kits/sites/${DESIGNS[d].sample.id}`;
