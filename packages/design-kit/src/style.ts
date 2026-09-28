// Art direction for one site: which type pairing it uses and how the look is tuned (scale, case,
// corners, spacing, buttons, photo grading). Each look (direction) sets the structure and motion;
// the style makes two sites in the same look feel like different brands.
import type { Direction } from './schema';

type Kind = 'serif' | 'sans' | 'mono';
type Face = { family: string; kind: Kind };
export type Pairing = {
  name: string;
  /** What it feels like, and what it suits (shown to Claude when it chooses). */
  mood: string;
  display: Face;
  body: Face;
  /** Small labels, eyebrows and numbers. */
  accent?: Face;
  weight: number;
  tracking: string;
  leading: number;
  upper?: boolean;
  /** How a *highlighted* word looks: in italics (fonts with a true italic) or in the accent colour. */
  em: 'italic' | 'colour';
  /** The headline font file, requested first so big type never jumps. */
  preload: string;
};

const serif = (family: string): Face => ({ family, kind: 'serif' });
const sans = (family: string): Face => ({ family, kind: 'sans' });
const mono = (family: string): Face => ({ family, kind: 'mono' });

export const PAIRINGS = {
  couture: { name: 'Couture', mood: 'whisper-thin luxury serif with airy sans; fashion, jewellery, bridal', display: serif('Cormorant Garamond'), body: sans('Jost'), weight: 300, tracking: '-0.02em', leading: 0.92, em: 'italic', preload: 'cormorant-garamond-normal.woff2' },
  vogue: { name: 'Vogue', mood: 'high-contrast Didone, like a fashion cover; boutiques, salons, perfume, designers', display: serif('Bodoni Moda'), body: sans('Hanken Grotesk'), weight: 500, tracking: '-0.03em', leading: 0.9, em: 'italic', preload: 'bodoni-moda-normal.woff2' },
  playfair: { name: 'Heritage', mood: 'warm classic serif; heritage brands, restaurants, law and CA firms, schools', display: serif('Playfair Display'), body: sans('Source Sans 3'), weight: 600, tracking: '-0.02em', leading: 0.98, em: 'italic', preload: 'playfair-display-normal.woff2' },
  caslon: { name: 'Bookish', mood: 'all-serif, like a well-set book; bookshops, tea houses, heritage hotels, authors', display: serif('Libre Caslon Display'), body: serif('Libre Caslon Text'), weight: 400, tracking: '-0.01em', leading: 1, em: 'colour', preload: 'libre-caslon-display-normal.woff2' },
  newsprint: { name: 'Newsprint', mood: 'editorial newspaper serif with typewriter labels; cafés, journals, architects, NGOs', display: serif('Newsreader'), body: serif('Newsreader'), accent: mono('IBM Plex Mono'), weight: 500, tracking: '-0.025em', leading: 0.98, em: 'italic', preload: 'newsreader-normal.woff2' },
  soft: { name: 'Handmade', mood: 'soft friendly serif with a warm sans; bakeries, organic food, crafts, home', display: serif('Fraunces'), body: sans('Karla'), weight: 600, tracking: '-0.02em', leading: 0.95, em: 'italic', preload: 'fraunces-normal.woff2' },
  gallery: { name: 'Gallery', mood: 'fine modern serif with a crisp sans; villas, spas, interiors, skincare', display: serif('Instrument Serif'), body: sans('Inter Tight'), weight: 400, tracking: '-0.02em', leading: 0.95, em: 'italic', preload: 'instrument-serif-normal.woff2' },
  gloock: { name: 'Statement', mood: 'chunky high-contrast serif; bold restaurants, patisseries, fashion labels', display: serif('Gloock'), body: sans('Figtree'), weight: 400, tracking: '-0.015em', leading: 0.98, em: 'colour', preload: 'gloock-normal.woff2' },
  young: { name: 'Neighbourly', mood: 'rounded friendly serif; clinics, pre-schools, pet care, family businesses', display: serif('Young Serif'), body: sans('Onest'), weight: 400, tracking: '-0.02em', leading: 1.02, em: 'colour', preload: 'young-serif-normal.woff2' },
  dmserif: { name: 'Modern classic', mood: 'confident serif with a clean sans; real estate, consultancies, hotels', display: serif('DM Serif Display'), body: sans('DM Sans'), weight: 400, tracking: '-0.015em', leading: 0.96, em: 'italic', preload: 'dm-serif-display-normal.woff2' },
  italiana: { name: 'Salon', mood: 'thin elegant capitals; salons, spas, wedding planners, florists', display: serif('Italiana'), body: sans('Hanken Grotesk'), weight: 400, tracking: '0.04em', leading: 1.02, upper: true, em: 'colour', preload: 'italiana-normal.woff2' },
  bricolage: { name: 'Festival', mood: 'chunky playful grotesque; sweets, snacks, cafés, kids, D2C', display: sans('Bricolage Grotesque'), body: sans('DM Sans'), weight: 800, tracking: '-0.045em', leading: 0.9, em: 'colour', preload: 'bricolage-grotesque-normal.woff2' },
  syne: { name: 'Nightlife', mood: 'wide dramatic capitals; restaurants, bars, gyms, studios', display: sans('Syne'), body: sans('Manrope'), weight: 700, tracking: '-0.01em', leading: 0.95, upper: true, em: 'colour', preload: 'syne-normal.woff2' },
  anton: { name: 'Poster', mood: 'towering condensed capitals; street food, streetwear, events, music', display: sans('Anton'), body: sans('Archivo'), weight: 400, tracking: '0', leading: 0.92, upper: true, em: 'colour', preload: 'anton-normal.woff2' },
  mona: { name: 'Stretch', mood: 'stretchy extra-wide grotesque; ice cream, juice bars, toys, creative studios', display: sans('Mona Sans'), body: sans('Mona Sans'), weight: 850, tracking: '-0.035em', leading: 0.9, em: 'colour', preload: 'mona-sans-normal.woff2' },
  grotesk: { name: 'Studio', mood: 'techy grotesque with typewriter details; agencies, tech, coworking, electronics', display: sans('Space Grotesk'), body: sans('Space Grotesk'), accent: mono('Space Mono'), weight: 600, tracking: '-0.035em', leading: 0.95, em: 'colour', preload: 'space-grotesk-normal.woff2' },
  unbounded: { name: 'Future', mood: 'wide rounded futuristic type; gaming, events, youth brands, fitness apps', display: sans('Unbounded'), body: sans('Onest'), weight: 700, tracking: '-0.03em', leading: 1, em: 'colour', preload: 'unbounded-normal.woff2' },
  bebas: { name: 'Sport', mood: 'tall athletic capitals; gyms, sports academies, auto, outdoor', display: sans('Bebas Neue'), body: sans('Libre Franklin'), weight: 400, tracking: '0.01em', leading: 0.9, upper: true, em: 'colour', preload: 'bebas-neue-normal.woff2' },
  swiss: { name: 'Swiss', mood: 'tight modernist grotesque with mono details; architects, furniture, galleries, design', display: sans('Epilogue'), body: sans('Epilogue'), accent: mono('IBM Plex Mono'), weight: 700, tracking: '-0.045em', leading: 0.92, em: 'colour', preload: 'epilogue-normal.woff2' },
  outfit: { name: 'Friendly', mood: 'clean geometric sans; clinics, schools, services, apps', display: sans('Outfit'), body: sans('Outfit'), weight: 600, tracking: '-0.03em', leading: 1, em: 'colour', preload: 'outfit-normal.woff2' },
  industrial: { name: 'Industrial', mood: 'bold condensed capitals; hardware, manufacturing, logistics, breweries', display: sans('Big Shoulders Display'), body: sans('Hanken Grotesk'), weight: 800, tracking: '0.005em', leading: 0.9, upper: true, em: 'colour', preload: 'big-shoulders-display-normal.woff2' },
} satisfies Record<string, Pairing>;
export type PairingId = keyof typeof PAIRINGS;
export const PAIRING_IDS = Object.keys(PAIRINGS) as [PairingId, ...PairingId[]];

/** The pairing each look uses unless the site chooses another. */
export const DEFAULT_PAIRING: Record<Direction, PairingId> = {
  editorial: 'couture', bold: 'bricolage', cinematic: 'syne', crafted: 'soft', poster: 'anton', quiet: 'gallery', block: 'mona',
};

const GENERIC: Record<Kind, string> = { serif: "'Times New Roman', serif", sans: 'system-ui, sans-serif', mono: 'ui-monospace, monospace' };
const stack = (f: Face) => `'${f.family}', '${f.family} Fallback', ${GENERIC[f.kind]}`;

export const SCALES = ['calm', 'bold', 'huge'] as const;
export const SHAPES = ['sharp', 'soft', 'round'] as const;
export const SPACES = ['airy', 'balanced', 'compact'] as const;
export const BUTTONS = ['solid', 'outline', 'pill', 'underline'] as const;
export const PHOTO_TONES = ['natural', 'warm', 'cool', 'soft', 'vivid', 'mono', 'duotone'] as const;

export type Style = {
  type?: PairingId;
  scale?: (typeof SCALES)[number];
  headlineCase?: 'auto' | 'upper' | 'normal';
  shape?: (typeof SHAPES)[number];
  space?: (typeof SPACES)[number];
  buttons?: (typeof BUTTONS)[number];
  photos?: (typeof PHOTO_TONES)[number];
};

const RADIUS = { sharp: ['0px', '0px', '0px'], soft: ['12px', '10px', '12px'], round: ['26px', '999px', '24px'] } as const;
const SPACE = { airy: 'clamp(104px, 14vw, 210px)', compact: 'clamp(56px, 7.5vw, 104px)' } as const;

/** CSS custom properties for a site's style (added after the look's own, so they win). */
export function styleDeclarations(s: Style | undefined): string[] {
  if (!s) return [];
  const out: string[] = [];
  if (s.type) {
    const p: Pairing = PAIRINGS[s.type];
    out.push(`--f-display:${stack(p.display)}`, `--f-body:${stack(p.body)}`, `--f-accent:${stack(p.accent ?? p.body)}`,
      `--accent-weight:${p.accent ? 400 : 600}`, `--display-weight:${p.weight}`, `--display-tracking:${p.tracking}`,
      `--display-leading:${p.leading}`, `--display-case:${p.upper ? 'uppercase' : 'none'}`, `--em-style:${p.em === 'italic' ? 'italic' : 'normal'}`);
  }
  if (s.headlineCase === 'upper') out.push('--display-case:uppercase');
  if (s.headlineCase === 'normal') out.push('--display-case:none');
  if (s.scale === 'calm') out.push('--scale:0.82');
  if (s.scale === 'huge') out.push('--scale:1.22');
  if (s.shape) { const [card, btn, media] = RADIUS[s.shape]; out.push(`--radius-card:${card}`, `--radius-btn:${btn}`, `--radius-media:${media}`); }
  if (s.space && s.space !== 'balanced') out.push(`--section-pad:${SPACE[s.space]}`);
  return out;
}

/** Attributes on <html> that switch on style rules (buttons, photo grading, highlighted words). */
export function styleAttributes(s: Style | undefined): Record<string, string> {
  const a: Record<string, string> = {};
  if (s?.type) a['data-type'] = s.type;
  if (s?.buttons) a['data-buttons'] = s.buttons;
  if (s?.photos && s.photos !== 'natural') a['data-photos'] = s.photos;
  return a;
}
