import { test, expect, type Page } from '@playwright/test';

// The motion kit, exercised on its live showcase page as a visitor would see it.
const SHOWCASE = '/kits/demo/showcase.html?motion=1.0.0&commerce=1.0.0';
type Stats = { active: number; frames: number; running: boolean; features: Record<string, number>; scenes: number; tier: string };
const stats = (page: Page) => page.evaluate(() => (window as unknown as { SFMotion: { stats: () => Stats } }).SFMotion.stats());
const ready = (page: Page) => page.waitForFunction(() => document.documentElement.classList.contains('sf-ready'));
const frames = (page: Page, sel: string) => page.locator(sel).evaluate((el) => Number((el as HTMLElement).dataset.sfFrames ?? 0));
async function scrollTo(page: Page, sel: string) {
  await page.locator(sel).first().evaluate((el) => el.scrollIntoView({ block: 'center' }));
  await page.waitForTimeout(600);
}

test.describe('on a computer', () => {
  test.use({ viewport: { width: 1280, height: 800 } });

  test('loads the pinned versions with no errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.goto(SHOWCASE);
    await ready(page);
    expect(await page.evaluate(() => [window.SFMotion?.version, window.SFCommerce?.version])).toEqual(['1.0.0', '1.0.0']);
    expect((await stats(page)).tier).toBe('full');
    await page.mouse.wheel(0, 20000);
    await page.waitForTimeout(1500);
    expect(errors).toEqual([]);
  });

  test('scroll reveals and split headlines', async ({ page }) => {
    await page.goto(SHOWCASE);
    await ready(page);
    await expect(page.locator('h1 .sf-sr')).toHaveText('Kit showcase');
    await expect(page.locator('h1 .sf-split-visual')).toHaveAttribute('aria-hidden', 'true');
    // Things further down wait until they are scrolled into view.
    await expect(page.locator('#backgrounds [data-sf-bg]').first()).toBeAttached();
    const tiles = page.locator('#reveals [data-sf-reveal]');
    await scrollTo(page, '#reveals .grid');
    for (const t of await tiles.all()) await expect(t).toHaveClass(/sf-in/);
    await expect(tiles.nth(1)).toHaveCSS('opacity', '1', { timeout: 5000 });
    await expect(page.locator('#split [data-sf-split="chars"]')).not.toHaveClass(/sf-in/);
    await scrollTo(page, '#split');
    await expect(page.locator('#split [data-sf-split="chars"]')).toHaveClass(/sf-in/);
  });

  test('parallax, marquee, progress bar and auto-hiding header', async ({ page }) => {
    await page.goto(SHOWCASE);
    await ready(page);
    await scrollTo(page, '#parallax .par');
    await expect(page.locator('#parallax .layer').first()).toHaveAttribute('style', /translate3d/);
    await scrollTo(page, '#marquee .strip');
    const strip = page.locator('#marquee .strip .sf-marquee-inner').first();
    const a = await strip.getAttribute('style');
    await page.waitForTimeout(400);
    expect(await strip.getAttribute('style')).not.toBe(a);
    const scale = await page.locator('[data-sf-progress]').evaluate((el) => (el as HTMLElement).style.transform);
    expect(scale).toMatch(/scaleX\(0\.\d+\)/);
    await page.mouse.wheel(0, 600);
    await expect(page.locator('header[data-sf-header]')).toHaveClass(/sf-hidden/);
    await page.waitForTimeout(1200); // let smooth scrolling settle
    await page.mouse.wheel(0, -400);
    await expect(page.locator('header[data-sf-header]')).not.toHaveClass(/sf-hidden/);
  });

  test('pinned horizontal scroll moves sideways as you scroll down', async ({ page }) => {
    await page.goto(SHOWCASE);
    await ready(page);
    const section = page.locator('#hscroll');
    await expect(section).toHaveClass(/sf-hs-pinned/);
    const top = await section.evaluate((el) => el.getBoundingClientRect().top + window.scrollY);
    await page.evaluate((y) => window.scrollTo(0, y + 600), top);
    await page.waitForTimeout(800);
    const x = await page.locator('#hscroll [data-sf-hscroll-track]').evaluate((el) => new DOMMatrix(getComputedStyle(el).transform).m41);
    expect(x).toBeLessThan(-100);
  });

  test('magnetic buttons, tilt cards and the cursor label', async ({ page }) => {
    await page.goto(SHOWCASE);
    await ready(page);
    await scrollTo(page, '#pointer');
    const mag = page.locator('#magnetic-demo');
    const box = (await mag.boundingBox())!;
    await page.mouse.move(box.x + box.width - 4, box.y + box.height / 2);
    await expect(mag).toHaveAttribute('style', /translate3d\([1-9]/);
    const tilt = page.locator('#tilt-demo');
    const t = (await tilt.boundingBox())!;
    await page.mouse.move(t.x + 10, t.y + 10);
    await expect(tilt).toHaveAttribute('style', /rotateX/);
    await expect(page.locator('.sf-cursor')).toHaveClass(/sf-cursor-label/);
    await expect(page.locator('.sf-cursor span')).toHaveText('View');
  });

  test('backgrounds only draw while on screen', async ({ page }) => {
    await page.goto(SHOWCASE);
    await ready(page);
    await scrollTo(page, '#backgrounds .grid');
    await page.waitForTimeout(800);
    const f1 = await frames(page, '#bg-aurora');
    expect(f1).toBeGreaterThan(5);
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(500);
    const f2 = await frames(page, '#bg-aurora');
    await page.waitForTimeout(800);
    expect(await frames(page, '#bg-aurora')).toBe(f2);
  });

  test('video hero plays silently with a working pause button', async ({ page }) => {
    await page.goto(SHOWCASE);
    await ready(page);
    await scrollTo(page, '#video .vid');
    const video = page.locator('#video video');
    await expect(video).toHaveAttribute('src', /hero\.webm/);
    expect(await video.evaluate((v: HTMLVideoElement) => v.muted && v.loop && v.playsInline)).toBe(true);
    await expect.poll(() => video.evaluate((v: HTMLVideoElement) => !v.paused)).toBe(true);
    await page.getByRole('button', { name: 'Pause background video' }).click();
    await expect.poll(() => video.evaluate((v: HTMLVideoElement) => v.paused)).toBe(true);
    await expect(page.getByRole('button', { name: 'Play background video' })).toBeVisible();
  });

  test('3D objects come alive when seen, and stop drawing off-screen', async ({ page }) => {
    await page.goto(SHOWCASE);
    await ready(page);
    await scrollTo(page, '#objects .grid');
    await expect(page.locator('#objects canvas.sf-3d-canvas')).toHaveCount(8, { timeout: 30000 });
    expect((await stats(page)).scenes).toBe(8);
    await expect.poll(() => frames(page, '[data-sf-3d="model"]')).toBeGreaterThan(3);
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(600);
    const f = await frames(page, '[data-sf-3d="ring"]');
    await page.waitForTimeout(800);
    expect(await frames(page, '[data-sf-3d="ring"]')).toBe(f);
  });

  test('"Pause animations" stops everything and is remembered', async ({ page }) => {
    await page.goto(SHOWCASE);
    await ready(page);
    await scrollTo(page, '#marquee .strip');
    expect((await stats(page)).running).toBe(true);
    await page.getByRole('button', { name: 'Pause animations' }).click();
    await expect(page.locator('html')).toHaveClass(/sf-paused/);
    expect((await stats(page)).running).toBe(false);
    await page.reload();
    await ready(page);
    await expect(page.locator('html')).toHaveClass(/sf-paused/);
    await expect(page.getByRole('button', { name: 'Play animations' })).toHaveAttribute('aria-pressed', 'true');
    await page.getByRole('button', { name: 'Play animations' }).click();
    await expect(page.locator('html')).not.toHaveClass(/sf-paused/);
  });
});

test('reduced motion: everything is visible and nothing moves', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto(SHOWCASE);
  await ready(page);
  const s = await stats(page);
  expect(s.tier).toBe('static');
  for (const t of await page.locator('#reveals [data-sf-reveal]').all()) await expect(t).toHaveCSS('opacity', '1');
  await expect(page.locator('#hscroll')).toHaveClass(/sf-hs-native/);
  await page.mouse.wheel(0, 20000);
  await page.waitForTimeout(1500);
  expect((await stats(page)).running).toBe(false);
  await expect(page.locator('.sf-3d-canvas')).toHaveCount(0);
  await expect(page.locator('video')).toHaveCount(0);
});

test('low-power devices keep still images instead of 3D and video', async ({ page }) => {
  await page.goto(`${SHOWCASE}&sf-lowpower=1`);
  await ready(page);
  await page.locator('#objects').scrollIntoViewIfNeeded();
  await page.waitForTimeout(3000);
  await expect(page.locator('.sf-3d-still')).toHaveCount(8);
  await expect(page.locator('.sf-3d-canvas')).toHaveCount(0);
  await expect(page.locator('video')).toHaveCount(0);
});

test.describe('on a phone', () => {
  test.use({ viewport: { width: 360, height: 740 }, isMobile: true, hasTouch: true });

  test('scales down: swipeable panels, no custom cursor, 3D waits for the first touch', async ({ page }) => {
    await page.goto('/kits/demo/sample.html');
    await ready(page);
    expect((await stats(page)).tier).toBe('lite');
    await expect(page.locator('[data-sf-hscroll]')).toHaveClass(/sf-hs-native/);
    await expect(page.locator('.sf-cursor')).toHaveCount(0);
    await page.waitForTimeout(3000);
    await expect(page.locator('.hero-3d canvas')).toHaveCount(0);
    await expect(page.locator('.hero-3d img')).toBeVisible();
    await page.touchscreen.tap(10, 400);
    await page.mouse.wheel(0, 10);
    await expect(page.locator('.hero-3d canvas')).toHaveCount(1, { timeout: 20000 });
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBeLessThanOrEqual(0);
  });
});
