# Designs: seven looks, one page builder

Every client website is built from a **page description** (a small, checked JSON file) by the
**design kit** (`packages/design-kit`). The AI Builder (Phase 3) will write these descriptions; a person can
edit them too. The kit turns a description into finished pages that already meet our quality bar.

## The seven design directions

| Direction | Feels like | Type | Colours | Sample |
|---|---|---|---|---|
| Editorial luxury | A fashion magazine | Cormorant Garamond + Jost | Ivory, ink, dark gold | Aranya (jeweller) — `/kits/sites/aranya` |
| Bold & vibrant | A festival poster | Bricolage Grotesque + DM Sans | Cream, magenta, saffron | Mithai Market (sweet shop) — `/kits/sites/mithai-market` |
| Dark & cinematic | A film title sequence | Syne + Manrope | Near-black, ember orange | Ember (restaurant) — `/kits/sites/ember` |
| Warm & crafted | A handmade label | Fraunces + Karla | Kraft paper, terracotta, olive | Bandra Bake House (bakery) — `/kits/sites/bandra-bake-house` |
| Street poster | A gig poster | Anton + Archivo | Tomato red, cobalt, yellow, black | Tapri (chai bar) — `/kits/sites/tapri` |
| Quiet luxury | A gallery | Instrument Serif + Inter Tight | Stone, bone white, sage | Saltwater (villa stay) — `/kits/sites/saltwater` |
| Colour block | A sticker sheet | Mona Sans (stretches narrow to extra-wide) | A new flat colour per section on a dark frame | Kulfi Club (kulfi parlour) — `/kits/sites/kulfi-club` |

All fonts are open-source and hosted with the site (no Google requests from visitors' phones). Each font has
a size-matched stand-in, so text doesn't jump when the real font arrives.

The last three (design kit 1.2.0) came from studying award-winning sites: DIKO and Flying Papers (the name as a
poster), MORAL and Pebble (giant type over photography, announcement bar), Fabric and agency sites (big
typographic lists), Lusion and Teenage Engineering (sideways motion), this month's luxury Awwwards winners, and
for Colour block: DIKO and Mode (flat colour panels, photos cut into ovals, arches and notches, text round a
turning badge) and GitHub's Mona Sans (type that stretches wider as the name scrolls away).

## Sections
Hero (split, full-bleed, typographic, collage, wordmark — the name edge to edge over a big photo), marquee, statement, products, categories, sideways-scrolling
story, features, gallery, restaurant menu (with veg / non-veg marks), booking, reviews, numbers, questions,
call to action, contact (map link, WhatsApp, opening hours), shop, wishlist, alternating photo rows, bento grid.

Moving sections (1.2.0), each fully readable on phones and with animations off:
- **Pinned story** (`scrolly`): a photo stays put while steps scroll past and change it. Without scroll-timeline
  support, on phones, or with animations off, each step shows its own photo instead.
- **Hover list** (`index`): huge one-line items; pointing at one reveals its photo. Phones show a small photo beside it.
- **Swipe reel** (`reel`): big photos you swipe or arrow-key sideways.
- **Photo strip** (`photostrip`): photos gliding slowly back and forth; stops with "Pause animations".
- **Split screen** (`pinned`): the heading stays on one side while cards scroll on the other.

A site can also show a slim **announcement bar** above the header (`announcement`).

**Backdrops** (`backdrop` on any section), learned from the reference sites and drawn in CSS from the site's own
colours: `sky` and `dusk` gradients (Obys, Lusion), `glow` (Apple), a hairline `grid` (DIKO, Overrrides),
halftone `dots` (Obys), and flat fields of the look's `accent`, `pop` or `dark` colour (DIKO, Mode). On a dark
page the gradients are tinted more gently so text keeps its contrast. With a custom `palette`, each client's site
can sit on its own colour: the samples use emerald (Aranya), violet (Mithai Market), butter yellow (Bandra Bake
House), cobalt (Tapri) and pale sea blue (Saltwater).

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
- Styles are written into each page (`renderSite(def, { styles })`), so a phone can draw the first screen without
  waiting for a stylesheet; fonts still load from the kit, which browsers cache.
- Fonts: `pnpm --filter @shopfront/design-kit fonts` downloads them and measures the stand-ins.
- Tests: `pnpm test:kits` (renderer: escaping, links, colours, schema), e2e `10-designs` (each site in a
  real browser, 360px phones, animations off, cart, booking, menu, links) and `08-lighthouse` (90+ on phones).

## In the studio
- **Designs** (side menu) shows all seven looks with live previews of each sample site on a computer and a
  phone, what each suits, its fonts and colours, and how many of your projects use it.
- On a project, the **Design** card is where the team picks the look. Anyone in the agency can choose it;
  business owners can't change it. The website's design-kit version is shown with the other kits and, like
  them, only the agency owner can change it.

## Photos
- Every picture on the sample sites is a real stock photo. Drawn artwork is not allowed: the page format has
  no way to ask for it, and tests fail if a page contains a drawn picture or an emoji-style symbol.
- `packages/photos` searches **Pexels** and **Unsplash** (keys `PEXELS_API_KEY` and `UNSPLASH_ACCESS_KEY`, on the
  server only), crops each photo to the shape a section needs and saves fast WebP sizes. Unsplash photos stay
  on Unsplash's image servers, as its terms require. Phase 3's AI builder uses the same package.
- Sample-site photos are listed in `packages/demo/photos.json` (photo id, crop shape, sizes, description);
  `node packages/demo/tools/fetch-photos.ts` downloads any that are missing and records them, with the
  photographer, in `photos.lock.json`. Pages refer to a photo as `{"$photo": "aranya/hero"}`.
- Photographers are credited in each site's footer, linked to their profiles.
- To browse candidates: `node packages/photos/cli.ts search "kaju katli" --orientation=square --sheet=out.png`.
