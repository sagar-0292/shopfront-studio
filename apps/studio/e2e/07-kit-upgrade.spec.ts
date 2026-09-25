import { expect, logIn, openProject, sql, test } from './helpers';

// Websites stay on their kit version until the agency owner compares and upgrades.
// (The test copy of the kits has a pretend motion kit 1.1.0.)
test.describe.configure({ mode: 'serial' });

test.beforeAll(async () => {
  // Projects made earlier in the run already started on 1.1.0; put one back on 1.0.0.
  await sql(`update sites set motion_kit_version = '1.0.0' where name = 'Mithai Market'`);
});

test('the kit library lists versions and hooks', async ({ page }) => {
  await logIn(page, 'tanvi@mumbai-studio.test');
  await page.getByRole('link', { name: 'Kits' }).click();
  await expect(page.getByRole('heading', { name: 'Kits', level: 1 })).toBeVisible();
  await expect(page.getByText(/^Version 1\.1\.0/)).toHaveCount(2); // motion (test copy) and commerce
  await expect(page.getByText(/^Version 1\.0\.0/).first()).toBeVisible();
  await page.getByText(/All \d+ hooks in 1\.1\.0/).first().click();
  await expect(page.getByRole('cell', { name: 'data-sf-3d', exact: false }).first()).toBeVisible();
});

test('a team member can compare but not upgrade', async ({ page }) => {
  await logIn(page, 'tanvi@mumbai-studio.test');
  const url = await openProject(page, 'Mithai Market');
  await expect(page.getByRole('list', { name: 'Kit versions' })).toContainText('1.1.0 available');
  await page.goto(`${url}/kits?kit=motion&to=1.1.0`);
  await expect(page.getByText('Only the agency owner can change a website’s kit version.')).toBeVisible();
  await expect(page.getByRole('button', { name: /Upgrade to/ })).toHaveCount(0);
});

test('the owner compares side by side and with a slider, then upgrades', async ({ page }) => {
  await logIn(page, 'sagar@mumbai-studio.test');
  await openProject(page, 'Mithai Market');
  await page.getByRole('link', { name: '1.1.0 available — compare & upgrade' }).click();
  await expect(page.getByRole('heading', { name: 'Motion kit: 1.0.0 → 1.1.0' })).toBeVisible();
  await expect(page.getByText('Test release: smoother reveals.')).toBeVisible();

  const before = page.frameLocator('iframe[title="Now: 1.0.0"]');
  const after = page.frameLocator('iframe[title="After: 1.1.0"]');
  await expect(before.locator('html')).toHaveClass(/sf-ready/, { timeout: 20000 });
  await expect(after.locator('html')).toHaveClass(/sf-ready/, { timeout: 20000 });
  const versions = await Promise.all(['Now: 1.0.0', 'After: 1.1.0'].map((t) =>
    page.locator(`iframe[title="${t}"]`).evaluate((f: HTMLIFrameElement) => (f.contentWindow as Window).SFMotion.version)));
  expect(versions).toEqual(['1.0.0', '1.1.0']);

  await page.getByRole('button', { name: 'Before/after slider' }).click();
  await page.getByLabel('Move the before/after divider').fill('20');
  await page.getByRole('button', { name: 'Phone' }).click();
  await expect(page.locator('iframe[title="After: 1.1.0"]')).toBeVisible();

  page.once('dialog', (d) => d.accept());
  await page.getByRole('button', { name: 'Upgrade to 1.1.0' }).click();
  await expect(page.getByText('Kit version updated.')).toBeVisible();
  await expect(page.getByRole('list', { name: 'Kit versions' })).toContainText('1.1.0');
  await expect(page.getByRole('list', { name: 'Kit versions' }).getByText('Up to date').first()).toBeVisible();

  await page.goto('/studio/activity');
  await expect(page.getByText(/Sagar Shah changed project “Mithai Market” \(motion kit version\)/)).toBeVisible();
});

test('new projects start on the latest kits', async ({ page }) => {
  await logIn(page, 'sagar@mumbai-studio.test');
  await page.goto('/studio/projects/new');
  await page.getByLabel('Business name').fill('Chai Katta Stall');
  await page.getByLabel('Project name').fill('Chai Katta');
  await page.getByRole('button', { name: 'Create project' }).click();
  await expect(page.getByRole('list', { name: 'Kit versions' })).toContainText('1.1.0');
});
