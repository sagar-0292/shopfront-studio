# Phase 1 — Foundation

## What you can do now

- **Log in** with email + password or a one-time email link; reset a forgotten password.
- **Create your agency** (you become owner). After that, new agencies can't be created without an invitation.
- **Projects dashboard**: every client website as a card, with search (name, client, city, business kind) and a
  status filter. Archived projects are hidden but can be restored.
- **New project**: add a new client (or pick an existing one) and their website — types (a site can combine
  several), kind of business, languages. Phone numbers and GSTINs are checked and tidied automatically.
- **Project settings**: website settings, client details, client logins (invite the business owner or staff with
  chosen areas), who in your team is on the project, and archive/restore.
- **Team**: invite owners or team members, change roles, remove people. Team members can't see billing.
- **Billing** (owners only): legal name, GSTIN, address for invoices.
- **Activity**: every change by anyone, with who and when. Nobody can edit or delete it.
- **Client admin** (`/admin`): the business owner sees only their own website(s) and can invite staff with limited
  areas (e.g. orders only). Real products/orders/bookings screens arrive in Phases 5–6.
- **Seller area** (`/seller`): a marketplace seller sees only their own products, prices in ₹ Indian format.
- **Invitations** are emailed (once Resend is set up) and can always be shared on WhatsApp. They work once, only for
  the invited email, and expire in 7 days.

## What's proven by automated tests (112 checks)

- **49 database security tests**, including: agency B can't read or change anything of agency A; a client can't
  read or change another client's products, orders or leads, or move a product to another client's site; client
  staff with "orders only" can't see leads or edit products and can't give themselves more access; a seller can't
  see, edit, delete, create under, or hand products to another seller, nor change their own commission; visitors
  see only products that are on sale on live websites; team members can't see billing or manage the team; the last
  owner can't be removed; invitations only work for the right email, once; the audit log can't be altered; and
  every table has security switched on (a new table without rules fails the tests).
- **22 browser tests** clicking through the real app, with real logins and real emails: sign-up with email
  confirmation, email-link login, password reset, projects, search, settings, archive, team and client
  invitations, staff permissions, seller view, and no sideways scrolling at 360px.
- **41 small logic tests**: ₹ formatting (₹1,25,000), reading typed prices, Indian phone numbers, GSTIN,
  plain-language errors, safe redirects.

## Demo script (about 15 minutes)

Use two browsers (or one normal + one private window) so you can be two people at once.

1. **Sign up.** Go to `/signup`, enter your name, email, password. Open the confirmation email and click the link.
   → You land on "Welcome, <name>". Name your agency → **Create workspace**. You see an empty Projects page.
2. **Create a project.** **+ New project** → Business name "Mithai Market", phone `098200 12345`, city "Dadar" →
   Project name "Mithai Market", kind "Sweet shop", tick **Online store**, **Hindi**, **Marathi** → **Create project**.
   → The project page opens; the phone now reads `+919820012345`.
3. **Try a mistake.** In Client details type GSTIN `12345` → **Save client details**.
   → A red message in plain words explains the GSTIN format. Fix it or clear it.
4. **Change settings.** Set Status to **Live**, Domain `https://MithaiMarket.in/` → **Save settings**.
   → Saved; the domain is tidied to `mithaimarket.in`; the badge says Live.
5. **See the history.** Open **Activity** → "<You> changed project “Mithai Market” (status, primary domain)".
6. **Invite a team member.** **Team** → email of a second address you own → **Create invitation**. Copy the link
   (or press **Share on WhatsApp**). In the second browser, open it → **Create account** (the email is pre-filled)
   → confirm the email → **Accept invitation**. → They see Projects but there's **no Billing** in the menu, and
   `/studio/billing` says "Billing is for owners".
7. **Invite the business owner.** Back as yourself, open Mithai Market → **Client logins** → a third email,
   role **Business owner** → **Create invitation**. In the second browser, log out, open the link, create the
   account and accept. → They land on "Namaste, <name>" and see only Mithai Market. Typing `/studio` in the address
   bar sends them back to their admin.
8. **Owner invites staff.** As the business owner, **Staff** → a fourth email, keep only **Orders** ticked →
   **Create invitation** → accept it in a private window. → The staff member sees only "Orders" and no Staff menu.
9. **Archive.** As yourself, create a second project, then **Archive project** at the bottom of its page. → It
   disappears from the dashboard; choose **Archived** in the filter to find and **Restore** it.
10. **Phone check.** Open the studio on your phone (or narrow the browser to phone width): everything fits, the menu
    scrolls sideways, nothing else does.

## Known limits of this phase

- The business-kind picker (150+ kinds), brand intake and the AI pipeline arrive in Phase 3; for now "kind of
  business" is free text.
- Seller accounts are created by the shop in Phase 5; in this phase the seller view is tested with prepared data.
- If someone picks from a dropdown before a page has finished loading, their choice can be reset when it finishes.
  This mostly affects slow phones; the page-speed work in Phase 2 addresses it.
