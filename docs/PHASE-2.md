# Phase 2 — Motion kit and commerce kit

## What you have now

Two tested, versioned libraries that every client website is built from. Websites never contain
animation, cart or checkout code of their own: they carry HTML *hooks* (labels such as
`data-sf-reveal="up"`) and load the kits. The AI Builder (Phase 3) is only allowed to use the hooks listed
in each kit's `hooks.json`.

**Motion kit 1.0.0** (7 KB to start; the 3D engine loads only when a page shows 3D)
- Scroll reveals: up, down, left, right, fade, scale, blur, mask wipe — with staggering
- Split-text headlines (word by word or letter by letter), still read normally by screen readers
- Parallax, pinned sideways-scrolling section, marquee strips
- Magnetic buttons, tilt cards with shine, custom cursor with labels ("View")
- Scroll progress bar, header that hides while scrolling down
- Smooth scrolling (computers only), animated backgrounds: aurora, particles, waves
- Video hero: still image first, silent looping video only on capable devices, with a pause button
- 3D objects: ring, gem, knot, blob, cup, orbit, stack — plus the client's own `.glb` model
- Visitors can press **Pause animations** (remembered); "reduce motion" settings are always respected
- Phones get a lighter version; low-power phones and data-saver mode keep still images instead of 3D and video;
  everything pauses when scrolled off-screen

**Commerce kit 1.0.0** (14 KB)
- Product grids from live data, in the site's own card design (template with slots: image, name, price, MRP,
  discount, category, seller, badges, stock, variants, add, wishlist)
- Filters built automatically from the products (category, seller, price, in stock), search, sorting;
  filters are kept in the page address so they can be shared
- Cart drawer with quantities and stock limits, coupons, delivery charge with free-delivery threshold,
  "prices include all taxes", all amounts as ₹1,25,000
- Checkout: order on WhatsApp now (message prepared with items, totals and address);
  online payment through Razorpay is built in and switches on when the order server arrives in Phase 6
- Consent tick box on every form (DPDP), plain-language error messages, Indian mobile and PIN code checks
- Wishlist, seller pages, category links, placeholder cards while loading
- Booking form with live free slots (opening hours, capacity, blocked dates), re-checked just before booking

**Versions**
- Each release is frozen in `apps/studio/kits/<kit>/<version>/`. The release tool refuses to change a
  published version; a change means a new version number and a changelog entry.
- Every website records the kit versions it uses. New projects start on the latest.
- Only the **agency owner** can upgrade a website (enforced in the database). Before upgrading, the
  **compare screen** shows the site on both versions side by side or with a before/after slider, on desktop
  or phone. Switching back is one click.

**Studio**
- New look: indigo + marigold, bolder headings, dashboard summary tiles.
- New **Kits** page: versions, release notes, the full hooks reference, links to the showcase.
- Project page: a **Kits** card showing each kit's version and any available upgrade.

## Quality checks (all passing)
- Lighthouse on a simulated mid-range phone on 4G: sample home page 97–99, shop 96–98, showcase 99 for
  performance; 100 for accessibility, best practices and SEO. Checked automatically in the test suite.
- 49 browser tests (27 new): every effect runs, stops off-screen, respects reduced motion and low-power
  mode, scales down on phones; the full shopping journey including coupons, stock limits, WhatsApp
  checkout, wishlist, seller pages and bookings; the compare-and-upgrade flow; nothing scrolls sideways at 360px.
- 32 kit logic tests (search, filters, sorting, cart maths, coupons, delivery, booking slots, phone numbers,
  WhatsApp message, card templates, no HTML injection from product names).
- 53 database security tests (4 new): only the owner can change a website's kit version.

Bugs these tests caught and that are now fixed: the price slider could hide the most expensive product;
elements waiting to slide in made phone pages scroll sideways; the "mask" reveal never started in Chrome;
the cart lost keyboard focus after removing an item; the booking form opened on a day with no free times.

## Decision made in this phase
- **Open-source animation (your choice):** Lenis, Three.js and our own scroll engine instead of GSAP, to avoid
  GSAP's licence restriction on website-builder products. All requested effects are included.
- **3D on phones starts at the first touch or scroll.** Until then a still image shows. This is what keeps the
  sample site at 97+ on a cheap phone; on computers 3D starts as soon as the page has loaded.

## Demo script (about 15 minutes)

Start the app as in the README (or use your Vercel address). Log in as the agency owner.

1. **New look.** The dashboard now has an indigo menu, marigold highlights and summary tiles.
2. **Kits page.** Click **Kits** in the menu. You see Motion kit 1.0.0 and Commerce kit 1.0.0 with release notes.
   Open **All … hooks** to see every hook the AI is allowed to use.
3. **Showcase.** Click **Open showcase ↗**. Scroll slowly from top to bottom and watch: tiles sliding in 8
   ways, headlines appearing word by word and letter by letter, parallax, the section that scrolls
   sideways while you scroll down, marquee strips (hover to pause), the magnetic button, tilt cards (the cursor
   says "View"), three animated backgrounds, the video hero (press its pause button), and 8 live 3D objects
   including the diya model. At the bottom press **Pause animations** — everything stops; reload, it stays paused.
4. **Sample shop.** Click the logo "Mithai Market". Open the **Cart**, add sweets from the shop, change quantities
   (Methi Mathri stops at 3 — only 3 in stock), enter coupon **DIWALI10**, watch free delivery apply over ₹999.
   Press **Checkout**, try **Order on WhatsApp** with empty fields to see the plain-language messages, then fill
   them in: WhatsApp opens with the full order written out.
5. **Filters.** On the shop page tick **Namkeen**, sort by price, search "bhujia". Copy the address and open it in
   a new tab — the same filters are applied. Tap ♡ on a product and open the wishlist.
6. **Sellers.** Click **Sellers**: only Joshi Sweets' products. Switch to Kulkarni Namkeen.
7. **Booking.** On the home page scroll to **Taste before you order**, pick a day and time, fill in your details,
   confirm. Book the same time again: after two bookings (the capacity) that time greys out.
8. **Phone.** Open the sample site on your phone: the diya shows as a picture, and turns live 3D when you
   touch the screen. The sideways section becomes a swipeable row.
9. **Versions.** Open any project. The **Kits** card shows its versions and "Up to date". When a new kit version
   is released, a link appears to **compare & upgrade**: side-by-side or slider, desktop or phone. Only you (the
   owner) see the **Upgrade** button; team members see an explanation.

## What you need to set up
Nothing new. Everything runs on the existing Vercel + Supabase setup. Before Vercel can serve the kits you need
to run the new database file once: in Supabase **SQL Editor**, run
`supabase/migrations/20260925000002_kit_versions.sql`.

## Known limits
- The compare screen uses the sample site until projects have their own generated pages (Phase 3).
- Online payment, real coupon checking on the server, and bookings stored in the database arrive in Phase 6.
  Until then the shop's data source for coupons/bookings in live sites answers politely ("available soon").
- The demo images are simple illustrations; real sites use client photos (Phase 3 brand intake).
