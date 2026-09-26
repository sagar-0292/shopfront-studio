# Designs: four looks, one page builder

Every client website is built from a **page description** (a small, checked JSON file) by the
**design kit** (`packages/design-kit`). The AI Builder (Phase 3) will write these descriptions; a person can
edit them too. The kit turns a description into finished pages that already meet our quality bar.

## The four design directions

| Direction | Feels like | Type | Colours | Sample |
|---|---|---|---|---|
| Editorial luxury | A fashion magazine | Cormorant Garamond + Jost | Ivory, ink, dark gold | Aranya (jeweller) — `/kits/sites/aranya` |
| Bold & vibrant | A festival poster | Bricolage Grotesque + DM Sans | Cream, magenta, saffron | Mithai Market (sweet shop) — `/kits/sites/mithai-market` |
| Dark & cinematic | A film title sequence | Syne + Manrope | Near-black, ember orange | Ember (restaurant) — `/kits/sites/ember` |
| Warm & crafted | A handmade label | Fraunces + Work Sans | Kraft paper, terracotta, olive | Bandra Bake House (bakery) — `/kits/sites/bandra-bake-house` |

All fonts are open-source and hosted with the site (no Google requests from visitors' phones). Each font has
a size-matched stand-in, so text doesn't jump when the real font arrives.

## Sections
Hero (split, full-bleed, typographic, collage), marquee, statement, products, categories, sideways-scrolling
story, features, gallery, restaurant menu (with veg / non-veg marks), booking, reviews, numbers, questions,
call to action, contact (map link, WhatsApp, opening hours), shop, wishlist.

Headlines can mark a highlighted word with `*asterisks*`: `"Bread worth *waking up* for"`.

## Built-in safeguards
- Everything the business types is escaped; unsafe links (`javascript:`, `http:`, `//…`) become harmless.
- Reviews must name the person and where the review came from — no invented testimonials.
- Custom colours are refused if text would be hard to read (WCAG AA, 4.5:1).
- Products or bookings without a catalogue are refused with a plain-language message.
- Search engines get the business details (address, hours, phone) and FAQ answers automatically.

## For developers
- Page description format: `packages/design-kit/src/schema.ts`. Renderer: `src/render.ts` (`renderSite`).
- Sample sites: `packages/demo/sites/<id>/site.json` (+ `data/catalog.json`, `img/`);
  art and catalogues come from `packages/demo/tools/make-sites.mjs`.
- `pnpm kits:release` builds the design kit (one CSS file per direction, fonts, frozen `render.mjs`) into
  `apps/studio/kits/design/<version>/` and renders the sample sites into `apps/studio/kits/sites/`.
- Fonts: `pnpm --filter @shopfront/design-kit fonts` downloads them and measures the stand-ins.
- Tests: `pnpm test:kits` (renderer: escaping, links, colours, schema), e2e `10-designs` (each site in a
  real browser, 360px phones, animations off, cart, booking, menu, links) and `08-lighthouse` (90+ on phones).
