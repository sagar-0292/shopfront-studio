# Working on the kits (for developers)

- Source: `packages/motion-kit`, `packages/commerce-kit`, `packages/design-kit` (see DESIGNS.md). Demo pages and sample sites: `packages/demo`.
- Hooks: `src/hooks.ts` in each kit is the contract with the AI Builder. Adding a hook means adding it there.
- Tests: `pnpm test:kits` (logic), `pnpm test:e2e` (real browser: 05-motion-kit, 06-commerce-kit, 07-kit-upgrade,
  08-lighthouse).

## Releasing a new version
1. Make the change. Raise `version` in the kit's `package.json` (e.g. 1.0.0 → 1.1.0).
2. Add a section to the kit's `CHANGELOG.md`: `## 1.1.0 — YYYY-MM-DD` followed by plain-language notes.
3. Run `pnpm kits:release`. It builds the kit, freezes it in `apps/studio/kits/<kit>/<version>/`,
   writes `hooks.json`, and updates `manifest.json` and the demo pages.
4. Commit. CI runs `pnpm kits:check`, which fails if a published version no longer matches its source.

Published versions are never changed. Websites keep their version until the agency owner upgrades them from
the project's compare screen.

## How a website uses the kits
```html
<script>document.documentElement.classList.add('sf-js')</script>
<link rel="stylesheet" href="/kits/motion/1.0.0/sf-motion.css">
<link rel="stylesheet" href="/kits/commerce/1.0.0/sf-commerce.css">
<script type="module" src="/kits/motion/1.0.0/sf-motion.js"></script>
<script type="module" src="/kits/commerce/1.0.0/sf-commerce.js"></script>
<script type="application/json" id="sf-config">{ "site": {"id": "…", "name": "…"}, "whatsapp": "+91…",
  "delivery": {"fee_paise": 4900, "free_above_paise": 99900},
  "source": {"type": "supabase", "url": "https://….supabase.co", "anonKey": "…"} }</script>
```
See `packages/demo/pages/sample.html` for a complete page.
