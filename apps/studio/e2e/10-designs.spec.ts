import { test, expect, type Page } from '@playwright/test';
import './helpers';

// The four sample websites, one per design direction, built by the design kit.
const SITES = [
  { id: 'aranya', direction: 'editorial', h1: 'Heirlooms, made slowly', shop: '/collection/' },
  { id: 'mithai-market', direction: 'bold', h1: "Life's sweeter in Dadar", shop: '/shop/' },
  { id: 'ember', direction: 'cinematic', h1: 'Cooked over fire', shop: null },
  { id: 'bandra-bake-house', direction: 'crafted', h1: 'Bread worth waking up for', shop: '/order/' },
] as const;
const url = (id: string, path = '/') => `/kits/sites/${id}${path}`;

test.beforeEach(async ({ context }) => {
  await context.route('https://wa.me/**', (r) => r.fulfill({ status: 200, body: 'WhatsApp' }));
});

function watchErrors(page: Page) {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  page.on('response', (r) => r.status() >= 400 && errors.push(`${r.status()} ${r.url()}`));
  return errors;
}

for (const s of SITES) {
  test(`${s.direction}: ${s.id} loads in its own look, with no errors`, async ({ page }) => {
    const errors = watchErrors(page);
    await page.goto(url(s.id));
    await expect(page.locator('html')).toHaveClass(new RegExp(`(^| )d-${s.direction}( |$)`));
    await expect(page.getByRole('heading', { level: 1, name: s.h1 })).toBeVisible();
    // The direction's own headline font is really used (not a fallback).
    const font = await page.evaluate(() => getComputedStyle(document.querySelector('h1')!).fontFamily);
    await page.evaluate(() => document.fonts.ready);
    expect(await page.evaluate((f) => document.fonts.check(`40px ${f.split(',')[0]}`), font)).toBe(true);
    // Every section and the footer are reachable, and the business is described for Google.
    await page.locator('footer').scrollIntoViewIfNeeded();
    await expect(page.getByRole('button', { name: 'Pause animations' })).toBeVisible();
    const ld = await page.locator('script[type="application/ld+json"]').first().textContent();
    expect(JSON.parse(ld!).address.addressLocality).toBe('Mumbai');
    expect(errors).toEqual([]);
  });

  test(`${s.direction}: ${s.id} fits a 360px phone and works with animations off`, async ({ browser }) => {
    const ctx = await browser.newContext({ viewport: { width: 360, height: 780 }, reducedMotion: 'reduce', isMobile: true, hasTouch: true });
    const page = await ctx.newPage();
    await page.goto(url(s.id));
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(360);
    // Header buttons stay on screen.
    const right = await page.evaluate(() => Math.max(...[...document.querySelectorAll('.d-header a, .d-header button, .d-header summary')]
      .filter((e) => (e as HTMLElement).offsetParent).map((e) => e.getBoundingClientRect().right)));
    expect(right).toBeLessThanOrEqual(360);
    // With animations off, text is visible straight away (nothing waits for a scroll animation).
    for (const h of await page.locator('main h2').all()) {
      await h.scrollIntoViewIfNeeded();
      await expect(h).toBeVisible();
      expect(Number(await h.evaluate((e) => getComputedStyle(e).opacity))).toBe(1);
    }
    // The phone menu opens and lists the pages.
    await page.locator('.d-menu summary').click();
    await expect(page.getByRole('navigation', { name: 'Menu' }).getByRole('link').first()).toBeVisible();
    await ctx.close();
  });
}

test('category links open the shop already filtered', async ({ page }) => {
  await page.goto(url('mithai-market'));
  await page.getByRole('link', { name: /Gift boxes/ }).last().click();
  await expect(page).toHaveURL(/cat=gifts/);
  await expect(page.locator('#shop')).toHaveAttribute('data-state', 'ready');
  const cats = await page.locator('#shop [data-product-id] [data-slot="category"]').allTextContents();
  expect(cats.length).toBeGreaterThan(0);
  expect(new Set(cats)).toEqual(new Set(['Gift boxes']));
});

test('the bakery: order a loaf, see it in the cart in rupees', async ({ page }) => {
  await page.goto(url('bandra-bake-house', '/order/'));
  await expect(page.locator('#shop')).toHaveAttribute('data-state', 'ready');
  const loaf = page.locator('#shop [data-product-id]').filter({ has: page.getByRole('heading', { name: 'Country Sourdough' }) });
  await loaf.locator('[data-slot="variant"]').selectOption('country-sourdough-whole');
  await loaf.getByRole('button', { name: /Add/ }).click();
  await expect(page.locator('[data-sf-cart-count]').first()).toHaveText('1');
  await page.locator('[data-sf-cart-open]').first().click();
  const cart = page.getByRole('dialog');
  await expect(cart).toContainText('Country Sourdough');
  await expect(cart).toContainText('₹320');
});

test('the jeweller: book a private viewing on a free slot', async ({ page }) => {
  await page.goto(url('aranya', '/#book'));
  const booking = page.locator('#book [data-sf-booking]');
  await expect(booking).toContainText('Private viewing at the atelier');
  const time = booking.getByRole('radio', { name: /\d (am|pm)$/ }).and(page.locator(':enabled')).first();
  await time.click();
  await expect(time).toHaveAttribute('aria-checked', 'true');
  await expect(booking.getByLabel(/name/i).first()).toBeFocused();
  // The booking widget uses the site's gold, not the studio's colours.
  const accent = await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--sf-accent').trim());
  expect(await page.evaluate((v) => { const d = document.createElement('i'); d.style.color = v; document.body.append(d); const c = getComputedStyle(d).color; d.remove(); return c; }, accent)).toBe('rgb(122, 90, 30)');
});

test('the restaurant: full menu with veg marks and rupee prices', async ({ page }) => {
  await page.goto(url('ember', '/menu/'));
  await expect(page.getByRole('heading', { level: 2, name: 'Everything touches flame' })).toBeVisible();
  const lamb = page.locator('.d-dish').filter({ hasText: 'Mango-wood lamb chops' });
  await expect(lamb.locator('.d-dish-price')).toHaveText('₹1,240');
  await expect(lamb.getByRole('img', { name: 'Non-vegetarian' })).toBeVisible();
  await expect(page.locator('.d-dish').filter({ hasText: 'Dal Ember' }).getByRole('img', { name: 'Vegetarian' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Book a table' }).last()).toHaveAttribute('href', '/kits/sites/ember/#book');
});

test('every internal link on the sample sites leads to a real page', async ({ page, request }) => {
  const seen = new Set<string>();
  for (const s of SITES) {
    for (const path of ['/', ...(s.shop ? [s.shop] : [])]) {
      await page.goto(url(s.id, path));
      for (const href of await page.locator('a[href^="/"]').evaluateAll((as) => as.map((a) => a.getAttribute('href')!))) {
        const clean = href.split('#')[0].split('?')[0];
        if (!clean || seen.has(clean)) continue;
        seen.add(clean);
        expect((await request.get(clean)).status(), clean).toBe(200);
      }
    }
  }
  expect(seen.size).toBeGreaterThan(8);
});
