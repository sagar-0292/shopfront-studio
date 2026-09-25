# Putting Shopfront Studio online

Everything below is account and settings work only you can do. Nothing here needs code changes.
Allow about an hour. Do the steps in order.

## 1. Supabase (database + login) — Mumbai region

1. Sign up at [supabase.com](https://supabase.com) and create an **organisation** for your agency.
2. **New project** → name `shopfront-studio` → **Region: South Asia (Mumbai) `ap-south-1`** → generate a strong
   database password and save it in your password manager.
   - Free plan is fine while testing. **Switch to Pro (about $25/month) before any client goes live**: it adds daily
     backups and stops the project pausing after a week of no use.
3. **Create the database tables and security rules:** open **SQL Editor → New query**, paste the whole of
   `supabase/migrations/20260925000001_foundation.sql`, click **Run**. It should say "Success. No rows returned".
   Then do the same with `20260925000002_kit_versions.sql` and `20260925000003_references_payments.sql`. (Later phases add more files to that folder;
   run each new one once, in name order.)
4. **Create the app's limited database login.** In a new SQL Editor query, run this, replacing the password with a
   long random one (save it):
   ```sql
   create role shopfront_app login noinherit password 'PASTE-A-LONG-RANDOM-PASSWORD';
   grant anon, authenticated to shopfront_app;
   ```
   This login can do nothing on its own except act as a logged-in person, so the security rules always apply.
5. **Connection details** (**Project Settings → Database**, or the **Connect** button):
   - Copy the **Transaction pooler** connection string (port **6543**). Replace the user part `postgres.xxxx` with
     `shopfront_app.xxxx` (keep the `.xxxx` project code) and put in the password from step 4. This is your
     `DATABASE_URL`.
   - Under **SSL Configuration**, **Download certificate**. Open it in a text editor; its full contents are your
     `DATABASE_CA_CERT`.
6. **API keys** (**Project Settings → API Keys**): copy the **Project URL** (`NEXT_PUBLIC_SUPABASE_URL`) and the
   **publishable / anon** key (`NEXT_PUBLIC_SUPABASE_ANON_KEY`). The app never needs the secret / service_role key.
7. **Login settings** (**Authentication → URL Configuration**):
   - Site URL: `https://studio.youragency.in` (the address you'll use in step 3 below).
   - Redirect URLs: add `https://studio.youragency.in/**` and, for Vercel previews, `https://*.vercel.app/**`.
8. **Login emails** (**Authentication → Emails → SMTP Settings**): Supabase's built-in email only sends a couple of
   emails an hour. Turn on **custom SMTP** with Resend (step 2): host `smtp.resend.com`, port `465`, user `resend`,
   password = your Resend API key, sender `studio@youragency.in`.
   - Optional: under **Email Templates**, reword the emails in your own voice.
9. **Password rules** (**Authentication → Sign In / Providers → Email**): minimum length 8, and turn on
   "Leaked password protection" if your plan allows it.

## 2. Resend (emails) — optional for the first test, needed before real use

1. Sign up at [resend.com](https://resend.com) → **Domains → Add domain** → your agency domain → add the DNS records
   it shows you at your domain registrar → wait for "Verified".
2. **API Keys → Create** (sending access). This is `RESEND_API_KEY`. Use it both in Supabase (step 1.8) and Vercel.
   Without it, invitations still work: the app shows the link for you to share on WhatsApp.

## 3. Vercel (hosting the studio app)

1. At [vercel.com](https://vercel.com) → **Add New → Project** → import the `sashah` GitHub repository.
2. **Root Directory:** `shopfront/apps/studio`. Framework: Next.js (detected automatically).
3. **Environment Variables** (Production and Preview):
   | Name | Value |
   | --- | --- |
   | `NEXT_PUBLIC_SUPABASE_URL` | from 1.6 |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | from 1.6 |
   | `DATABASE_URL` | from 1.5 (secret) |
   | `DATABASE_CA_CERT` | from 1.5 (paste the whole certificate) |
   | `NEXT_PUBLIC_APP_URL` | `https://studio.youragency.in` |
   | `RESEND_API_KEY` | from 2.2 (secret) |
   | `EMAIL_FROM` | `Your Agency <studio@youragency.in>` |
   | `PAYMENT_SECRETS_KEY` | encrypts shops' payment keys. Make one with `openssl rand -base64 32` (secret; keep a backup — without it saved keys can't be used) |
   | `RAZORPAY_PARTNER_CLIENT_ID` / `RAZORPAY_PARTNER_CLIENT_SECRET` | optional, from step 5 — turns on one-click "Connect Razorpay" |
4. **Deploy.** The app runs in Vercel's Mumbai region (`bom1`), next to the database.
5. **Settings → Domains:** add `studio.youragency.in` and create the DNS record Vercel shows you.

## 5. Razorpay Partner account (optional, for one-click "Connect Razorpay")

Without this, shops can still connect Razorpay (or any gateway) by pasting their keys.

1. Apply at [razorpay.com/partners](https://razorpay.com/partners) as a **Technology Partner** (uses your agency's
   Razorpay account; approval takes a few days).
2. In the Partner dashboard create an **OAuth application**. Redirect URL:
   `https://studio.youragency.in/api/payments/razorpay/callback`.
3. Copy its **Client ID** and **Client secret** into Vercel as `RAZORPAY_PARTNER_CLIENT_ID` and
   `RAZORPAY_PARTNER_CLIENT_SECRET`, then redeploy.

## 4. First login

1. Open `https://studio.youragency.in/signup`, create your account, and click the link in the confirmation email.
2. You'll be asked to name your agency — you become its owner. After this, nobody else can create an agency
   (only invitations work). To sell the studio to other agencies later, run in the SQL Editor:
   `update platform_settings set agency_signup_mode = 'open';`
3. Follow the demo script in [docs/PHASE-1.md](docs/PHASE-1.md).

## Accounts needed in later phases (no action yet)

| Phase | Account |
| --- | --- |
| 2–3 | Anthropic API key (console.anthropic.com) |
| 4 | none extra (crawling runs on our own servers) |
| 6 | Razorpay (KYC takes 1–3 days, start early), WhatsApp Business API provider (Gupshup or Interakt; Meta business verification can take 1–2 weeks), Shiprocket |
| 7 | Cloudflare account (client sites, domains, SSL) |
