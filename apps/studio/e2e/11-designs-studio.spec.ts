import { alertIn, expect, logIn, noHorizontalScroll, openProject, sql, test } from './helpers';

// The Designs gallery, and choosing a design for a project.
test.describe.configure({ mode: 'serial' });

test.beforeAll(async () => {
  await sql(`update sites set design_direction = null where name = 'Mithai Market'`);
});

test('the Designs page shows all four looks with live previews', async ({ page }) => {
  await logIn(page, 'tanvi@mumbai-studio.test');
  await page.getByRole('navigation', { name: 'Main' }).getByRole('link', { name: 'Designs' }).click();
  await expect(page.getByRole('heading', { name: 'Designs', level: 1 })).toBeVisible();
  const list = page.getByRole('list', { name: 'Design directions' });
  for (const name of ['Editorial luxury', 'Bold & vibrant', 'Dark & cinematic', 'Warm & crafted']) {
    await expect(list.getByRole('heading', { name, level: 2 })).toBeVisible();
  }
  // Each preview really shows its sample website, on a computer and on a phone.
  const frame = page.frameLocator('iframe[title="Ember on a computer"]');
  await page.locator('iframe[title="Ember on a computer"]').scrollIntoViewIfNeeded();
  await expect(frame.getByRole('heading', { level: 1, name: 'Cooked over fire' })).toBeAttached();
  await expect(page.locator('iframe[title="Ember on a phone"]')).toHaveCount(1);
  await expect(list.getByRole('link', { name: 'Open Aranya ↗' })).toHaveAttribute('href', '/kits/sites/aranya');
  await expect(list.getByText('Not used yet').first()).toBeVisible();
});

test('a team member chooses a design for a project, and it is remembered', async ({ page }) => {
  await logIn(page, 'tanvi@mumbai-studio.test');
  const url = await openProject(page, 'Mithai Market');
  const card = page.locator('section').filter({ has: page.getByRole('heading', { name: 'Design', exact: true, level: 2 }) });
  await expect(card.getByText('Not chosen yet')).toBeVisible();
  await card.getByRole('radio', { name: /Bold & vibrant/ }).check();
  await card.getByRole('button', { name: 'Use this design' }).click();
  await expect(card.getByText('Design set to Bold & vibrant.')).toBeVisible();
  await page.goto(url);
  await expect(card.getByRole('radio', { name: /Bold & vibrant/ })).toBeChecked();
  await expect(card.getByText('Bold & vibrant', { exact: true }).first()).toBeVisible();
  const rows = await sql<{ design_direction: string }>(`select design_direction from sites where name = 'Mithai Market'`);
  expect(rows[0].design_direction).toBe('bold');

  await page.getByRole('navigation', { name: 'Main' }).getByRole('link', { name: 'Designs' }).click();
  await expect(page.getByText('Used by 1 project')).toBeVisible();
});

test('a made-up design is refused with a plain message', async ({ page }) => {
  await logIn(page, 'tanvi@mumbai-studio.test');
  await openProject(page, 'Mithai Market');
  const radio = page.getByRole('radio', { name: /Dark & cinematic/ });
  await radio.evaluate((r: HTMLInputElement) => { r.value = 'neon'; r.checked = true; });
  await page.getByRole('button', { name: 'Use this design' }).click();
  await expect(alertIn(page)).toHaveText('Please pick one of the four designs.');
});

test('the Designs page works on a 360px phone', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 780 });
  await logIn(page, 'tanvi@mumbai-studio.test');
  await page.goto('/studio/designs');
  await expect(page.getByRole('heading', { name: 'Designs', level: 1 })).toBeVisible();
  await noHorizontalScroll(page);
});
