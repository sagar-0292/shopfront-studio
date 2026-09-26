import { expect, logIn, noHorizontalScroll, test } from './helpers';

// Light and dark screens: the choice is remembered and drawn straight away on the next page.
test('dark mode can be chosen, is remembered, and can be switched back', async ({ page }) => {
  await logIn(page, 'tanvi@mumbai-studio.test');
  await page.goto('/account');
  const appearance = page.getByRole('radiogroup', { name: 'Appearance' }).last();
  await expect(appearance.getByRole('radio', { name: 'Auto' })).toHaveAttribute('aria-checked', 'true');
  await appearance.getByRole('radio', { name: 'Dark' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  const bg = () => page.evaluate(() => getComputedStyle(document.documentElement).backgroundColor);
  expect(await bg()).toBe('rgb(13, 12, 29)');

  // A fresh page load is dark from the first paint (the server knows the choice).
  const html = await (await page.request.get('/studio')).text();
  expect(html).toMatch(/<html[^>]*data-theme="dark"/);
  await page.goto('/studio');
  expect(await bg()).toBe('rgb(13, 12, 29)');
  await noHorizontalScroll(page);

  await page.goto('/account');
  await page.getByRole('radiogroup', { name: 'Appearance' }).last().getByRole('radio', { name: 'Light' }).click();
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  expect(await bg()).toBe('rgb(245, 246, 250)');
});

test('with no choice made, the studio follows the device setting', async ({ browser }) => {
  const ctx = await browser.newContext({ colorScheme: 'dark' });
  const page = await ctx.newPage();
  await page.goto('/login');
  expect(await page.evaluate(() => getComputedStyle(document.documentElement).backgroundColor)).toBe('rgb(13, 12, 29)');
  await ctx.close();
});
