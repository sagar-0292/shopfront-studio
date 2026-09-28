# Creating a client's website

Every project has a **Website** page (project page → **Create website**). It takes about five minutes.

1. **What they already have (optional).**
   - **Logo:** shown in the website's header. Its main colours are read automatically and become the site's colours
     (the readability checker still has the last word).
   - **Photos** (shop front, products, team): resized in the browser before upload, then used by Claude where they
     fit best, alongside stock photos.
   - **Documents** (brochure, menu, price list: PDF, Word, PowerPoint or text): read by Claude for facts, prices and
     the way the business speaks.
   - **Fill in the details for me:** type their current website address and click the button. The studio reads the
     home page and up to five useful pages (About, Menu, Treatments, Contact…) plus the PDF and text documents, and
     Claude fills in step 2: what they do, what they sell with prices, address, hours, Instagram, real reviews and
     other notes. Only empty fields are filled, so nothing typed is lost; check the result before creating the site.
     Phone numbers or emails it finds are shown so you can add them to the client details. Instagram and Facebook
     pages can't be read (they need a login): paste their bio instead. Without an Anthropic key, **Copy the request**
     and paste it into claude.ai (which visits the website itself), then paste Claude's reply back.
2. **About the business.** What they do, what they sell (with prices), address, opening hours, Instagram, real
   reviews. Phone, WhatsApp and email come from the client details on the project page.
3. **Create the website.**
   - **Automatically** (needs `ANTHROPIC_API_KEY`, pay per use): one button sends the brief, the logo, the photos
     and PDF/text documents to Claude and builds its answer; the time and tokens used are shown after. Word and
     PowerPoint files can't be read directly: save them as PDF.
   - **Or by copy and paste** with your own Claude subscription (no extra cost): **Copy the brief**, **Open
     Claude**, attach the material zip if there is one, paste, send, then paste Claude's reply back.
   - **Art direction** (design kit 2.0 and newer): Claude also chooses the site's own style: one of 21 type
     pairings, headline size, capitals, corners, spacing, button style and photo colour grading, so two sites in the
     same look feel like different brands. Projects on an older kit keep the look's fonts until the owner moves them
     to the newest kit.
   - The brief contains the business, the chosen look, rules that keep the site high-end (specific copy, no
     invented facts or reviews, section rhythm, photo search phrases), the section reference, and a finished
     sample site in the same look as the standard to match.
4. **Building** (both routes):
   - The studio pulls the JSON out of Claude's reply, finds a real Pexels photo for every photo request (cropped to
     the shape that spot needs, photographers credited), fills in the business facts from the project (never from
     Claude), and checks every page with the design kit.
   - Problems are explained in plain words, with the exact thing to ask Claude to fix.
5. **Preview** on a computer and a phone, then **Download website for Netlify (.zip)**.
   - Unzip it, drag the folder onto [app.netlify.com/drop](https://app.netlify.com/drop): it's live in seconds.
     Netlify → Domain management → Add a domain for the business's own address.
   - The zip is complete: every page, styles written into each page, fonts, animations, the product catalogue,
     the business's own photos, and caching rules (`_headers`) for Netlify and Cloudflare Pages.
   - Orders work by WhatsApp, UPI and cash on delivery. Card payments need Shopfront hosting (a later phase).

## For developers
- Answer format and section reference: `apps/studio/src/lib/website/format.ts`. The brief: `brief.ts`.
  Claude through the API: `claude.ts` (streamed; `ANTHROPIC_API_KEY`, optional `ANTHROPIC_MODEL`, server only).
  Building: `build.ts`. Photos: `photos.ts` (`PEXELS_API_KEY`, server only). Rendering and the zip: `render.ts`,
  which loads the frozen `render.mjs` of the project's design-kit version.
- Reading a current website: `read-site.ts`. Only public addresses are fetched (private networks, this machine
  and cloud metadata are refused at connection time, redirects are checked again), HTML only, 2 MB and 12 seconds
  per page. The fill-in request and merge: `autofill.ts`.
- Type pairings and style options live in the design kit (`packages/design-kit/src/style.ts`); the studio lists
  them in the brief from the project's frozen kit. After adding a font, run `tools/fetch-fonts.mjs`,
  `tools/make-fallbacks.mjs` and `tools/measure-fonts.mjs` (letter widths so a business name fills the screen).
- Stored on `sites.website_brief` / `sites.website`; the business's files in `site_files` (migration
  `20260929000007_websites.sql`), with the same agency-only rules as the project.
- `scripts/release-kits.mjs` writes `kits/sites/<sample>/example.json`: each sample site in Claude's format, used
  in briefs as the quality bar. A unit test builds all seven into complete zips; e2e `13-website` covers the flow
  (local stand-ins for Pexels and Claude run in `scripts/local-stack.mjs`).
