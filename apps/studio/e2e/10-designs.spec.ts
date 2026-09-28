import { test, expect, type Page } from '@playwright/test';
import './helpers';

// The sample websites, one per design direction, built by the design kit.
const SITES = [
  { id: 'aranya', direction: 'editorial', h1: 'Heirlooms, made slowly', shop: '/collection/' },
  { id: 'mithai-market', direction: 'bold', h1: "Life's sweeter in Dadar", shop: '/shop/' },
  { id: 'ember', direction: 'cinematic', h1: 'Cooked over fire', shop: null },
  { id: 'bandra-bake-house', direction: 'crafted', h1: 'Bread worth waking up for', shop: '/order/' },
  { id: 'tapri', direction: 'poster', h1: 'Cutting chai, loud and proud', shop: '/shop/' },
  { id: 'saltwater', direction: 'quiet', h1: 'Slow days by the Arabian Sea', shop: null, city: 'Alibaug' },
  { id: 'kulfi-club', direction: 'block', h1: 'Cold, sweet and very Bombay', shop: '/shop/' },
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
    expect(JSON.parse(ld!).address.addressLocality).toBe('city' in s ? s.city : 'Mumbai');
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

test('every picture is a real photo that loads, icons are line drawings, and photographers are credited', async ({ page }) => {
  test.setTimeout(120_000);
  const pages = [...SITES.flatMap((s) => [url(s.id), ...(s.shop ? [url(s.id, s.shop)] : [])]), '/kits/demo/sample.html', '/kits/demo/shop.html'];
  for (const u of pages) {
    await page.goto(u);
    // Walk down the page so lazy photos load.
    const h = await page.evaluate(() => document.documentElement.scrollHeight);
    for (let y = 0; y < h; y += 500) { await page.evaluate((y) => window.scrollTo({ top: y, behavior: 'instant' }), y); await page.waitForTimeout(120); }
    // Photos waiting off to the side (gliding strip, swipe reel) load as they come into view; ask for them now.
    await page.evaluate(() => document.querySelectorAll<HTMLImageElement>('img[loading="lazy"]').forEach((i) => { i.loading = 'eager'; }));
    await page.waitForFunction(() => [...document.images].filter((i) => i.getBoundingClientRect().width > 0).every((i) => i.complete), null, { timeout: 20_000 });
    const imgs = await page.locator('img:visible').evaluateAll((els) => els.map((e) => {
      const i = e as HTMLImageElement;
      return { src: i.currentSrc || i.src, ok: i.complete && i.naturalWidth > 0, alt: i.alt };
    }));
    expect(imgs.length, u).toBeGreaterThan(0);
    for (const i of imgs) {
      expect(i.src, `${u} uses a photo`).toMatch(/\.webp(\?|$)/);
      expect(i.ok, `${i.src} loads`).toBe(true);
    }
    // Any SVG on the page is a small icon, never a picture.
    const bigSvgs = await page.locator('svg:visible').evaluateAll((els) => els.filter((e) => e.getBoundingClientRect().width > 48).length);
    expect(bigSvgs, `${u} has no drawn pictures`).toBe(0);
    await expect(page.locator('footer')).toContainText(/Photos by .+ on Pexels\./);
  }
});

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
  expect(await page.evaluate((v) => { const d = document.createElement('i'); d.style.color = v; document.body.append(d); const c = getComputedStyle(d).color; d.remove(); return c; }, accent)).toBe('rgb(212, 178, 106)'); // Aranya's own gold (#d4b26a)
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

test('moving sections: pinned story photo, hover list, swipe reel and photo strip, with animations on and off', async ({ browser }) => {
  // On a computer with animations on, the story photo stays pinned and changes with the steps.
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  await page.goto(url('tapri'));
  const stage = page.locator('.d-scrolly-stage');
  await stage.scrollIntoViewIfNeeded();
  await expect(stage).toBeVisible();
  await expect(page.locator('.d-scrolly-photo').first()).toBeHidden();
  const last = page.locator('.d-scrolly-step').last();
  await last.scrollIntoViewIfNeeded();
  await expect.poll(() => page.locator('.d-scrolly-frame').last().evaluate((e) => Number(getComputedStyle(e).opacity))).toBeGreaterThan(0.9);
  // Pointing at a menu line shows its photo.
  const row = page.locator('.d-index-row').first();
  await row.scrollIntoViewIfNeeded();
  const thumb = row.locator('.d-index-thumb');
  expect(Number(await thumb.evaluate((e) => getComputedStyle(e).opacity))).toBe(0);
  await row.hover();
  await expect.poll(() => thumb.evaluate((e) => Number(getComputedStyle(e).opacity))).toBe(1);
  // The reel scrolls sideways with the keyboard.
  const reel = page.locator('.d-reel-track');
  await reel.focus();
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('ArrowRight');
  await expect.poll(() => reel.evaluate((e) => e.scrollLeft)).toBeGreaterThan(0);
  // The photo strip glides, and "Pause animations" stops it.
  const strip = page.locator('.d-strip-track');
  expect(await strip.evaluate((e) => getComputedStyle(e).animationPlayState)).toBe('running');
  await page.getByRole('button', { name: 'Pause animations' }).click();
  expect(await strip.evaluate((e) => getComputedStyle(e).animationPlayState)).toBe('paused');
  // Paused, the story shows each photo beside its step instead.
  await expect(page.locator('.d-scrolly-photo').first()).toBeVisible();
  await ctx.close();

  // Phones with animations off: every step has its photo, nothing moves, nothing overflows.
  const phone = await browser.newContext({ viewport: { width: 360, height: 780 }, reducedMotion: 'reduce', isMobile: true, hasTouch: true });
  const p = await phone.newPage();
  await p.goto(url('saltwater'));
  await expect(p.locator('.d-scrolly-stage')).toBeHidden();
  for (const photo of await p.locator('.d-scrolly-photo').all()) { await photo.scrollIntoViewIfNeeded(); await expect(photo.locator('img')).toBeVisible(); }
  expect(await p.locator('.d-strip-track').evaluate((e) => getComputedStyle(e).animationName)).toBe('none');
  await expect(p.locator('.d-index-thumb img').first()).toBeVisible();
  expect(await p.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(360);
  await phone.close();
});

test('colour block: every section is its own readable colour panel, photos are cut into shapes, the badge turns', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(url('kulfi-club'));
  const panels = await page.locator('main > *').evaluateAll((els) => els.map((e) => getComputedStyle(e).backgroundColor));
  expect(new Set(panels.slice(0, 7)).size).toBe(7);
  // Photos in shapes: an oval and an arch among the rows.
  const radii = await page.locator('.d-row-media').evaluateAll((els) => els.map((e) => getComputedStyle(e).borderTopLeftRadius));
  expect(radii[0]).toBe('50%');
  expect(radii[1]).toMatch(/^999px/);
  // The sticker's words run round a turning circle; "Pause animations" stops it.
  const ring = page.locator('.d-ring');
  await expect(ring).toBeVisible();
  expect(await ring.locator('i').count()).toBe('Since 1978 · Since 1978 · '.length);
  expect(await ring.evaluate((e) => getComputedStyle(e).animationPlayState)).toBe('running');
  await page.getByRole('button', { name: 'Pause animations' }).click();
  expect(await ring.evaluate((e) => getComputedStyle(e).animationPlayState)).toBe('paused');
});
