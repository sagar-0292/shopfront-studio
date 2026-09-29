# What makes a website sell

Learned on 29 September 2026 from the home and product pages of big brands, on computers and phones:
Apple, boAt, Mamaearth, SUGAR, Haldiram's, Kapiva, Nobero, Chaayos, FabIndia, IKEA, Glossier, Allbirds,
The Leela, Airbnb and Urban Company. (Nykaa, Tanishq, Bewakoof, Practo and Lenskart block automated visits,
so they couldn't be studied.) We measured where things sit, which buttons stay on screen, and the colour and
contrast of every button, then looked at every page ourselves.

Every website Claude writes gets these rules in its brief (`SELLING_RULES` in
`apps/studio/src/lib/website/format.ts`), and the seven sample sites follow them.

## Where things go

| On the page | What big brands do | Examples |
| --- | --- | --- |
| Top bar | One line with the real offer or the free-delivery amount | boAt, SUGAR, Glossier, Haldiram's, Allbirds, Mamaearth |
| Header | Logo, search and cart always visible; on phones, shortcuts right under it | boAt, Mamaearth, IKEA, Haldiram's |
| First screen | One promise and one main button. A second button, if any, is quieter | Apple (Learn more, Buy), Kapiva (Buy now), The Leela (Reserve your stay) |
| Straight after | Round shortcuts to the main categories, what people came for | boAt, Mamaearth, Haldiram's, SUGAR, FabIndia, Kapiva (by health concern) |
| First two screens | Bestsellers with price, original price crossed out, % off, rating and an Add button on each card | Mamaearth, SUGAR, Haldiram's, Glossier |
| Near the top | Promises: delivery, cash on delivery, returns, secure payment, warranty | boAt and SUGAR product pages, Urban Company ("Why Urban Company?"), Nobero |
| Next to products | Proof: real reviews, star rating with the number of reviews, "6 million customers", press | Glossier (10,822 reviews), Chaayos (4.4 rating), The Souled Store |
| Middle | Occasions and gifting: Diwali, weddings, Rakhi, corporate | Haldiram's, SUGAR, Chaayos, FabIndia |
| End | FAQ (delivery, payment, returns), contact, newsletter, policies | Mamaearth, The Leela, FabIndia |
| Phone | The main action fixed at the bottom within thumb reach, or a WhatsApp button | Product pages of boAt, Mamaearth, SUGAR, Haldiram's and Nobero; WhatsApp on FabIndia, Kapiva and Nobero |

On product pages, the order is almost always: photos → name → rating (number of reviews) → price, crossed-out
MRP, % off, "inclusive of all taxes" → options → Add to cart / Buy now (fixed at the bottom on phones) →
delivery check and promises → details → reviews → related products.

## Colours

- **One buying colour, used everywhere.** Mamaearth uses the same bright blue on all 34 buy buttons on its home page.
  SUGAR uses black on 43, Haldiram's orange on 19, Kapiva green and Apple blue. Brands use their own colour; no
  single colour "sells". What matters is that the buy colour is consistent and stands out.
- **It must stand out from the page.** Mamaearth's bright blue (2.5:1 against its white text) and Kapiva's green (3.0:1)
  are hard to read. Our palette check now also asks that buttons stand 3:1 apart from the page background, and
  button text stays at 4.5:1.
- **Calm, light backgrounds where products are.** Almost every shop is white or near-white: the product photos
  bring the colour.
- **Offers stand out in words, not in a second button colour.** Red and orange mark sales (boAt, Haldiram's),
  and green marks savings and free delivery (Mamaearth, boAt, Nobero).
- **The price level sets the tone.** Premium brands (Apple, The Leela, Glossier, Allbirds) use few buttons,
  lots of space and one quiet accent (The Leela's bronze "Book"). Everyday brands (boAt, Mamaearth, SUGAR)
  put offers and products higher up and use bolder colour.

## What we do not copy

- **Fake urgency.** The countdown timers and "sale ends in" banners (boAt, Nobero) are left out, and so are
  invented discounts, stock counts and reviews. Shops show "Only 3 left" only from real stock.
- **Pop-ups on arrival.** Newsletter, app and notification pop-ups covered the first screen on SUGAR, Glossier
  and boAt.
- **Carousels as the main message.** Most people only see the first slide.

## What's in design kit 2.1 because of this

- `trust`: a strip of 2 to 5 promises with line icons.
- `categories` with `style: "circles"`: round category shortcuts for right after the hero.
- `actionBar`: one or two actions fixed at the bottom of phone screens.
- One buying colour per site: add-to-cart buttons, the main button and the phone bar share the look's main
  button colour (before, four of the seven looks had two different buying colours).
- The palette check that buttons stand out from the page.

Not built yet: a page for each product with the product-page order above (today, products are cards with an Add
button, and the cart and checkout open in a drawer).
