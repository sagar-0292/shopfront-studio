# Creating a client's website

Every project has a **Website** page (project page → **Create website**). It takes about five minutes.

1. **About the business.** What they do, what they sell (with prices), address, opening hours, Instagram, real
   reviews. Phone, WhatsApp, email and city come from the client details on the project page.
2. **Their own material (optional).**
   - **Logo:** shown in the website's header. Its main colours are read automatically and become the site's colours
     (the readability checker still has the last word).
   - **Photos** (shop front, products, team): resized in the browser before upload, then used by Claude where they
     fit best, alongside stock photos.
   - **Documents** (brochure, menu, price list: PDF, Word, PowerPoint or text): attached to the Claude chat so Claude
     can read facts, prices and the way the business speaks.
3. **Ask Claude**, using your own Claude subscription (no extra cost): **Copy the brief**, **Open Claude**, attach
   the material zip if there is one, paste, send.
   - The brief contains the business, the chosen look, rules that keep the site high-end (specific copy, no
     invented facts or reviews, section rhythm, photo search phrases), the section reference, and a finished
     sample site in the same look as the standard to match.
4. **Paste Claude's answer** and press **Build the website**.
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
  Building: `build.ts`. Photos: `photos.ts` (`PEXELS_API_KEY`, server only). Rendering and the zip: `render.ts`,
  which loads the frozen `render.mjs` of the project's design-kit version.
- Stored on `sites.website_brief` / `sites.website`; the business's files in `site_files` (migration
  `20260929000007_websites.sql`), with the same agency-only rules as the project.
- `scripts/release-kits.mjs` writes `kits/sites/<sample>/example.json`: each sample site in Claude's format, used
  in briefs as the quality bar. A unit test builds all seven into complete zips; e2e `13-website` covers the flow
  (a local Pexels stand-in runs in `scripts/local-stack.mjs`).
