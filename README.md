# Shopfront Studio

A web app for a web agency to create, launch and run premium websites for Indian businesses.
AI agents do most of the work; people approve. Each client gets a simple admin panel.

**Status: Phase 2 (Kits) complete.** See [docs/PHASE-2.md](docs/PHASE-2.md), [docs/PAYMENTS-AND-REFERENCES.md](docs/PAYMENTS-AND-REFERENCES.md) and [docs/PHASE-1.md](docs/PHASE-1.md) for what's in them and demo scripts,
and [SETUP.md](SETUP.md) for the accounts and settings needed to put it online.

## What's in this folder

| Folder | What it is |
| --- | --- |
| `apps/studio` | The web app (Next.js). Agency studio, client admin, seller area, login. |
| `supabase/migrations` | The database design and its security rules, as SQL files applied in order. |
| `supabase/local` | Extras that make a plain local Postgres behave like hosted Supabase (not used in production). |
| `tests/db` | Security tests that prove who can and can't see or change each kind of data. |
| `apps/studio/e2e` | Browser tests that click through the real app. |
| `scripts` | Local tools: reset the database, run the local login server, build it. |
| `packages/motion-kit`, `packages/commerce-kit` | The versioned kits every website uses ([docs/KITS.md](docs/KITS.md)). |
| `packages/demo` | Showcase and sample-shop pages. |
| `apps/studio/kits` | Published, frozen kit versions served at `/kits/…`. |

## Key design decisions

1. **One shared database, rows tagged by agency and website.** Every client-owned row carries `organisation_id`
   (the agency) and, where relevant, `site_id`. The database fills these in itself from the parent record and
   never lets a row move between agencies, clients or sites.
2. **Security rules live in the database** (Postgres row-level security), so they hold even if the app has a bug.
3. **The app talks to the database directly, as the logged-in person.** Each request runs inside a transaction
   that switches to the `authenticated` role with the person's id, using a limited login (`shopfront_app`) that can
   do nothing else. Supabase is used for login (and later file storage). This keeps all data access on the server
   (nothing sensitive in the browser), lets us run multi-step changes atomically, and lets the whole thing be
   tested end-to-end without Docker.
4. **Built for many agencies from day one** (your answer), with sign-up of new agencies switched off after the first
   one (`platform_settings.agency_signup_mode`).
5. **Money is stored in paise** (whole numbers) and always shown the Indian way: ₹1,25,000.

## Everyday commands (run inside `shopfront/`)

```bash
pnpm install                 # once
bash scripts/build-gotrue.sh # once: builds the local login server (needs Go)
pnpm stack                   # local database + login server + email catcher (http://127.0.0.1:54324)
pnpm dev                     # the app at http://localhost:3000 (copy apps/studio/.env.example to .env.local first)

pnpm test:db                 # database security tests
pnpm test:unit               # small logic tests (money, phone numbers, errors…)
pnpm test:kits               # kit logic tests
pnpm kits:release            # publish a new kit version (see docs/KITS.md)
pnpm test:e2e                # browser tests (starts its own servers; stop `pnpm stack`/`pnpm dev` first)
pnpm lint && pnpm typecheck
```

These need Node 20.9+, pnpm, PostgreSQL 16 running locally (user `postgres`, password `postgres`) and Go 1.24+.
The same checks run automatically on GitHub for every change (`.github/workflows/shopfront-ci.yml`).
