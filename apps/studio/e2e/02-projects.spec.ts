import { logIn, noHorizontalScroll, test, expect, alertIn, openProject } from './helpers';

const FOUNDER = 'sagar@mumbai-studio.test';
test.describe.configure({ mode: 'serial' });

test.beforeEach(async ({ page }) => {
  await logIn(page, FOUNDER);
});

test('create a project for a new client', async ({ page }) => {
  await page.getByRole('link', { name: '+ New project' }).click();
  await page.getByLabel('Business name').fill('Mithai Market');
  await page.getByLabel('Contact person').fill('Mehul Joshi');
  await page.getByLabel('Phone').fill('098200 12345');
  await page.getByLabel('City').fill('Dadar');
  await page.getByLabel('Project name').fill('Mithai Market');
  await page.getByLabel('Kind of business').fill('Sweet shop');
  await page.getByText('Online store', { exact: true }).click();
  await page.getByText('Hindi', { exact: true }).click();
  await page.getByText('Marathi', { exact: true }).click();
  await page.getByRole('button', { name: 'Create project' }).click();

  await expect(page).toHaveURL(/\/studio\/projects\/[0-9a-f-]+\?created=1/);
  await expect(page.getByRole('heading', { name: 'Mithai Market' })).toBeVisible();
  await expect(page.getByText('Project created.')).toBeVisible();
  // phone number was tidied into international format
  await expect(page.getByLabel('Phone')).toHaveValue('+919820012345');
});

test('a second project for a different client, and the dashboard lists both', async ({ page }) => {
  await page.goto('/studio/projects/new');
  await page.getByLabel('Business name').fill('Kapoor Dental Clinic');
  await page.getByLabel('Project name').fill('Kapoor Dental');
  await page.getByLabel('Kind of business').fill('Dental clinic');
  await page.getByText('Bookings', { exact: true }).click();
  await page.getByRole('button', { name: 'Create project' }).click();
  await expect(page.getByRole('heading', { name: 'Kapoor Dental' })).toBeVisible();

  await page.goto('/studio');
  await expect(page.getByRole('heading', { name: 'Mithai Market' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Kapoor Dental' })).toBeVisible();
});

test('search and status filter', async ({ page }) => {
  await page.goto('/studio');
  await page.getByLabel('Search projects').fill('dadar');
  await page.getByRole('button', { name: 'Search' }).click();
  await expect(page.getByRole('heading', { name: 'Mithai Market' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Kapoor Dental' })).toHaveCount(0);

  await page.goto('/studio?q=nothing-matches-this');
  await expect(page.getByText('No matches')).toBeVisible();
});

test('edit project settings and see it in the activity log', async ({ page }) => {
  await openProject(page, 'Mithai Market');
  await page.getByLabel('Status').selectOption('live');
  await page.getByLabel('Domain').fill('https://MithaiMarket.in/');
  await page.getByRole('button', { name: 'Save settings' }).click();
  await expect(page.getByText('Project settings saved.')).toBeVisible();
  await page.reload();
  await expect(page.getByLabel('Domain')).toHaveValue('mithaimarket.in');
  await expect(page.getByLabel('Status')).toHaveValue('live');
  await expect(page.locator('main header').getByText('Live', { exact: true })).toBeVisible();

  await page.goto('/studio/activity');
  await expect(page.getByText(/Sagar Shah changed project “Mithai Market” \(.*status.*\)/)).toBeVisible();
});

test('mistakes get plain-language messages', async ({ page }) => {
  await openProject(page, 'Mithai Market');
  await page.getByLabel('GSTIN (optional)').fill('12345');
  await page.getByRole('button', { name: 'Save client details' }).click();
  await expect(alertIn(page)).toHaveText(/GSTIN doesn’t look right/);
  await expect(page.getByLabel('GSTIN (optional)')).toHaveValue('12345'); // not wiped

  await page.getByLabel('Phone').fill('12');
  await page.getByRole('button', { name: 'Save client details' }).click();
  await expect(alertIn(page)).toHaveText(/doesn’t look like an Indian phone number/);
});

test('archive and restore a project', async ({ page }) => {
  await openProject(page, 'Kapoor Dental');
  page.once('dialog', (d) => d.accept());
  await page.getByRole('button', { name: 'Archive project' }).click();
  await expect(page.getByText('Project archived.')).toBeVisible();

  await page.goto('/studio');
  await expect(page.getByRole('heading', { name: 'Kapoor Dental' })).toHaveCount(0);
  await page.goto('/studio?status=archived');
  await page.getByRole('heading', { name: 'Kapoor Dental' }).click();
  await page.waitForURL(/\/studio\/projects\//);
  await page.getByRole('button', { name: 'Restore project' }).click();
  await expect(page.getByText('Project restored as a draft.')).toBeVisible();
});

test('works on a 360px-wide phone', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 740 });
  for (const path of ['/studio', '/studio/projects/new', '/studio/team', '/studio/activity']) {
    await page.goto(path);
    await noHorizontalScroll(page);
  }
  await openProject(page, 'Mithai Market');
  await noHorizontalScroll(page);
});
