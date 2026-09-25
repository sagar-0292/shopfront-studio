# Reference websites, competitors and payments

## Reference & competitor websites
Every project has a **Reference & competitor websites** section (studio project page), and business owners
have the same section in their admin (**Payments & reference websites →**).

- **Inspiration — “make it like this”**: sites whose layout or feel the client likes. In Phase 3 the Creative
  Director agent borrows layout ideas from these — never their words or photos.
- **Competitors**: studied by the Site Reader in Phase 4 for the audit and proposal.
- Addresses are tidied automatically (`Rival-Sweets.in/Menu/` → `https://rival-sweets.in/Menu`); private or
  made-up addresses are refused; duplicates are caught.
- The business owner can remove only the links they added; your team can remove any.
- Staff, sellers, other clients and other agencies can’t see them (proved by database tests).

## Payments (per website)
Money always goes **straight to the shop’s own account**. The agency never handles it.

| Way to pay | How it works today | Cost |
| --- | --- | --- |
| Order on WhatsApp | Order arrives in the shop’s WhatsApp; payment arranged there. | Free |
| UPI (direct) | Checkout shows a QR code (computers) and a “Pay with a UPI app” button (phones) with the exact amount and an order reference. The shopper enters the 12-digit UPI transaction ID, which is sent to the shop on WhatsApp to check. | Free |
| Cash on delivery | Offered only up to the shop’s limit (e.g. ₹5,000). | Free |
| Online (gateway) | Razorpay, Cashfree, PhonePe PG, PayU, or Stripe (international cards). Connected now; takes payments once the order system arrives in Phase 6. | Gateway fees |

**Connecting a gateway**
- **Razorpay — one click:** “Connect Razorpay” sends the shop owner to Razorpay to approve; we receive
  tokens, never their password or keys. Needs your agency’s Razorpay Partner account (see SETUP.md).
- **Any gateway — keys:** paste the gateway’s public ID and secret. We check the format (and that test keys
  aren’t saved as live), then **encrypt the secret on the server** (AES-256-GCM) before it reaches the database.
  Nobody — not the agency owner, not the business owner — can read it back; the screen shows only a hint
  (••••9876). Disconnecting deletes it.
- Only your agency and the **business owner** can change payments — not their staff (enforced in the database).
- Every change appears in **Activity**; secrets never do.

**Commerce kit 1.1.0** adds UPI and cash on delivery to checkout. Websites on 1.0.0 keep WhatsApp-only checkout
until you upgrade them from the project’s Kits card (compare screen first).

## Demo script (10 minutes)
1. Open **Mithai Market** in the studio. In **Reference & competitor websites**, choose *A competitor*, type
   `rival-sweets.in/menu`, add a note, press **Add website**. Try adding it again → “already on the list”.
2. Log in as the business owner → **Payments & reference websites →**. Add an inspiration site. Notice you can’t
   remove the agency’s competitor link, only your own.
3. In **Payments**, tick **UPI (free)** and type `mithai market` as the UPI ID → a plain-language error.
   Enter `mithaimarket@okicici`, tick **Cash on delivery**, limit `5000`, **Save**.
4. Open **Enter keys instead**, choose **Stripe**, type a wrong publishable key → error, and what you typed stays.
   Enter valid test keys → the panel shows **Stripe · Test mode · ••••1234**. The secret is never shown again.
   **Disconnect** removes it.
5. Open the sample shop (`/kits/demo/shop.html`), add Bhujia, **Checkout** → **Pay ₹229 by UPI**: QR code, UPI app
   button, then enter `412345678901` → WhatsApp opens with the order and payment reference.
6. Add three Diwali hampers → **Cash on delivery** is greyed out with “available for orders up to ₹5,000”.
