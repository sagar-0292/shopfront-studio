import { test, expect, type Page } from '@playwright/test';

// The commerce kit on the sample shop, as a shopper uses it.
test.use({ viewport: { width: 1280, height: 900 } });
test.beforeEach(async ({ context }) => {
  await context.route('https://wa.me/**', (r) => r.fulfill({ status: 200, body: 'WhatsApp' }));
});

const cards = (page: Page) => page.locator('#shop [data-product-id]');
const card = (page: Page, name: string) => cards(page).filter({ has: page.getByRole('heading', { name, exact: true }) });
const loaded = (page: Page) => expect(page.locator('#shop')).toHaveAttribute('data-state', /ready|empty/);

test('products load from live data with prices, discounts and stock', async ({ page }) => {
  await page.goto('/kits/demo/shop.html');
  await loaded(page);
  await expect(cards(page)).toHaveCount(12);
  await expect(page.locator('.sf-skeleton')).toHaveCount(0);
  const hamper = card(page, 'Diwali Grand Hamper');
  await expect(hamper.locator('[data-slot="price"]')).toHaveText('₹2,499');
  await expect(hamper.locator('[data-slot="mrp"]')).toHaveText('₹2,999');
  await expect(hamper.locator('[data-slot="discount"]')).toHaveText('17% off');
  await expect(card(page, 'Rasgulla (8 pcs)').locator('[data-slot="stock"]')).toHaveText('Only 4 left');
  await expect(card(page, 'Soan Papdi').getByRole('button', { name: 'Soan Papdi is sold out' })).toBeDisabled();
});

test('search, filters and sorting, remembered in the address', async ({ page }) => {
  await page.goto('/kits/demo/shop.html');
  await loaded(page);
  await page.getByLabel('Search products').fill('bhujia');
  await expect(cards(page)).toHaveCount(1);
  await page.getByLabel('Search products').fill('');
  await expect(cards(page)).toHaveCount(12);

  await page.getByRole('checkbox', { name: 'Namkeen (3)', exact: true }).check();
  await expect(cards(page)).toHaveCount(3);
  await expect(page).toHaveURL(/cat=namkeen/);
  await page.getByLabel('Sort products').selectOption('price-asc');
  await expect(cards(page).first().getByRole('heading')).toHaveText('Methi Mathri');
  await page.reload();
  await loaded(page);
  await expect(cards(page)).toHaveCount(3);
  await expect(page.getByRole('checkbox', { name: 'Namkeen (3)', exact: true })).toBeChecked();

  await page.getByRole('button', { name: 'Clear filters' }).click();
  await expect(cards(page)).toHaveCount(12);
  await page.getByLabel('In stock only').check();
  await expect(cards(page)).toHaveCount(11);
});

test('cart: variants, quantities, stock limits, coupon and free delivery in ₹', async ({ page }) => {
  await page.goto('/kits/demo/shop.html');
  await loaded(page);
  const kk = card(page, 'Kaju Katli');
  await kk.getByLabel('Choose Kaju Katli option').selectOption('kk-500');
  await kk.getByRole('button', { name: 'Add Kaju Katli to cart' }).click();
  await card(page, 'Methi Mathri').getByRole('button', { name: 'Add Methi Mathri to cart' }).click();
  await expect(page.locator('[data-sf-cart-count]').first()).toHaveText('2');

  await page.locator('[data-sf-cart-open]').first().click();
  const drawer = page.getByRole('dialog', { name: 'Your cart' });
  await expect(drawer).toBeVisible();
  await expect(drawer.getByText('Kaju Katli (500 g)')).toBeVisible();
  const more = drawer.getByRole('button', { name: 'One more Methi Mathri' });
  await more.click();
  await more.click();
  await expect(more).toBeDisabled(); // only 3 in stock
  await expect(drawer.locator('[data-sf-total]')).toHaveText('₹1,379'); // 899 + 3×160, free delivery over ₹999
  await expect(drawer.getByText('Free')).toBeVisible();

  await drawer.getByLabel('Coupon code').fill('diwali10');
  await drawer.getByRole('button', { name: 'Apply' }).click();
  await expect(drawer.getByText('DIWALI10 applied: 10% off, up to ₹500.')).toBeVisible();
  await expect(drawer.locator('[data-sf-total]')).toHaveText('₹1,241.10');
  await drawer.getByRole('button', { name: 'One less Methi Mathri' }).click();
  await drawer.getByRole('button', { name: 'One less Methi Mathri' }).click();
  await drawer.getByRole('button', { name: 'One less Methi Mathri' }).click();
  await expect(drawer.getByText('Methi Mathri')).toHaveCount(0);
  // ₹899 − 10% = ₹809.10, now under ₹999 so ₹49 delivery applies
  await expect(drawer.locator('[data-sf-total]')).toHaveText('₹858.10');

  await page.keyboard.press('Escape');
  await expect(drawer).toBeHidden();
  await expect(page.locator('[data-sf-cart-open]').first()).toBeFocused();
  await page.reload();
  await expect(page.locator('[data-sf-cart-count]').first()).toHaveText('1');
});

test('checkout by WhatsApp with plain-language checks and consent', async ({ page }) => {
  await page.goto('/kits/demo/shop.html');
  await loaded(page);
  await card(page, 'Bikaneri Bhujia 400 g').getByRole('button', { name: /Add Bikaneri Bhujia/ }).click();
  await page.locator('[data-sf-cart-open]').first().click();
  await page.getByRole('button', { name: 'Checkout' }).click();
  const drawer = page.getByRole('dialog');
  await drawer.getByRole('button', { name: 'Order on WhatsApp' }).click();
  await expect(drawer.getByText('Please enter your name.')).toBeVisible();
  await expect(drawer.getByText('Please enter a 10-digit mobile number, e.g. 98200 12345.')).toBeVisible();
  await expect(drawer.getByText('Please enter a 6-digit PIN code.')).toBeVisible();
  await expect(drawer.getByLabel('Your name')).toBeFocused();

  await drawer.getByLabel('Your name').fill('Ravi Kulkarni');
  await drawer.getByLabel('Mobile number').fill('098200 12345');
  await drawer.getByLabel('Delivery address').fill('12 Ranade Road, Dadar West');
  await drawer.getByLabel('PIN code').fill('400028');
  await drawer.getByRole('button', { name: 'Order on WhatsApp' }).click();
  await expect(drawer.getByText('Please tick the box to agree to how we use your details.')).toBeVisible();
  await drawer.getByRole('checkbox').check();
  const popup = page.waitForEvent('popup');
  await drawer.getByRole('button', { name: 'Order on WhatsApp' }).click();
  await popup;
  const link = await page.locator('[data-sf-cart]').getAttribute('data-last-whatsapp');
  const text = decodeURIComponent(link!.split('text=')[1]);
  expect(link).toContain('https://wa.me/919820012345');
  expect(text).toContain('• Bikaneri Bhujia 400 g × 1 — ₹180');
  expect(text).toContain('Delivery: ₹49');
  expect(text).toContain('Total: ₹229');
  expect(text).toContain('Phone: +919820012345');
  await expect(page.getByRole('dialog', { name: 'Thank you' })).toBeVisible();
  await expect(page.locator('[data-sf-cart-count]').first()).toHaveText('0');
});

test('wishlist is saved and shown on its own page', async ({ page }) => {
  await page.goto('/kits/demo/shop.html');
  await loaded(page);
  await card(page, 'Royal Dry Fruit Box').getByRole('button', { name: 'Save Royal Dry Fruit Box to wishlist' }).click();
  await expect(page.locator('[data-sf-wishlist-count]')).toHaveText('1');
  await page.goto('/kits/demo/wishlist.html');
  await expect(page.locator('[data-sf-wishlist] [data-product-id]')).toHaveCount(1);
  await expect(page.getByRole('heading', { name: 'Royal Dry Fruit Box' })).toBeVisible();
  await page.getByRole('button', { name: 'Remove Royal Dry Fruit Box from wishlist' }).click();
  await expect(page.getByText('Nothing saved yet.')).toBeVisible();
});

test('seller pages show only that seller’s products', async ({ page }) => {
  await page.goto('/kits/demo/seller.html?seller=kulkarni-namkeen');
  await expect(page.getByRole('heading', { name: 'Kulkarni Namkeen', level: 1 })).toBeVisible();
  const items = page.locator('#seller-grid [data-product-id]');
  await expect(items).toHaveCount(3);
  for (const s of await items.locator('[data-slot="seller"]').all()) await expect(s).toHaveText('Kulkarni Namkeen');
});

test('bookings: live free slots, and a full slot can’t be booked again', async ({ page }) => {
  await page.goto('/kits/demo/sample.html#book');
  const box = page.locator('[data-sf-booking]');
  await expect(box.locator('.sf-slot').first()).toBeVisible();
  const slot = box.locator('.sf-slot:not([disabled])').first();
  const time = await slot.getAttribute('data-time');
  for (let i = 0; i < 2; i++) { // capacity is 2 per slot
    await box.locator(`.sf-slot[data-time="${time}"]`).click();
    await box.getByLabel('Your name').fill('Anjali Desai');
    await box.getByLabel('Mobile number').fill('9876543210');
    await box.getByRole('checkbox').check();
    await box.getByRole('button', { name: 'Confirm booking' }).click();
    await expect(box.getByText(/^Booked! Wedding sweets tasting on .* Reference BK-/)).toBeVisible();
  }
  await expect(box.locator(`.sf-slot[data-time="${time}"]`)).toBeDisabled();
});

test('shop pages fit a 360px phone', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 740 });
  for (const p of ['sample', 'shop', 'seller', 'wishlist', 'showcase']) {
    await page.goto(`/kits/demo/${p}.html`);
    await page.waitForTimeout(500);
    // A visitor must not be able to scroll the page sideways.
    const x = await page.evaluate(() => { window.scrollTo(300, window.scrollY); return window.scrollX; });
    expect(x, p).toBe(0);
  }
  await page.goto('/kits/demo/shop.html');
  await page.getByText('Filters', { exact: true }).click();
  await expect(page.getByRole('checkbox', { name: 'Namkeen (3)', exact: true })).toBeVisible();
});
