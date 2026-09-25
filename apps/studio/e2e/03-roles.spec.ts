import { inviteLinkOnPage, logIn, logOut, noHorizontalScroll, signUp, test, expect, openProject } from './helpers';

const FOUNDER = 'sagar@mumbai-studio.test';
const TEAM = { name: 'Tanvi Team', email: 'tanvi@mumbai-studio.test' };
const CLIENT = { name: 'Mehul Joshi', email: 'mehul@mithaimarket.test' };
const STAFF = { name: 'Sonal Orders', email: 'sonal@mithaimarket.test' };

test.describe.configure({ mode: 'serial' });

let mithaiUrl = '';
let kapoorUrl = '';

test('the owner invites a team member, who joins', async ({ page }) => {
  await logIn(page, FOUNDER);
  mithaiUrl = await openProject(page, 'Mithai Market');
  kapoorUrl = await openProject(page, 'Kapoor Dental');

  await page.goto('/studio/team');
  await page.getByLabel('Email address').fill(TEAM.email);
  await page.getByRole('button', { name: 'Create invitation' }).click();
  const link = await inviteLinkOnPage(page);
  await expect(page.getByRole('link', { name: 'Share on WhatsApp' })).toHaveAttribute('href', /wa\.me/);

  await logOut(page);
  await page.goto(link);
  await expect(page.getByRole('heading', { name: 'Join Mumbai Web Studio' })).toBeVisible();
  await page.getByRole('link', { name: 'Create account' }).click();
  await expect(page.getByLabel('Email')).toHaveValue(TEAM.email);
  await signUp(page, TEAM.name, TEAM.email, new URL(link).pathname);
  await expect(page).toHaveURL(new RegExp(new URL(link).pathname));
  await page.getByRole('button', { name: 'Accept invitation' }).click();
  await expect(page).toHaveURL(/\/studio$/);

  // the link cannot be used twice
  await page.goto(link);
  await expect(page.getByText('already been used')).toBeVisible();
});

test('a team member sees projects but not billing, and cannot manage the team', async ({ page }) => {
  await logIn(page, TEAM.email);
  await expect(page.getByRole('heading', { name: 'Mithai Market' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Billing' })).toHaveCount(0);
  await page.goto('/studio/billing');
  await expect(page.getByText('Billing is for owners')).toBeVisible();
  await page.goto('/studio/team');
  await expect(page.getByText('Only an agency owner can invite or remove people.')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Create invitation' })).toHaveCount(0);
});

test('the owner can edit billing details', async ({ page }) => {
  await logIn(page, FOUNDER);
  await page.goto('/studio/billing');
  await page.getByLabel('Legal business name').fill('Mumbai Web Studio LLP');
  await page.getByLabel('GSTIN').fill('27aapfu0939f1zv');
  await page.getByRole('button', { name: 'Save' }).click();
  await expect(page.getByText('Billing details saved.')).toBeVisible();
  await page.reload();
  await expect(page.getByLabel('GSTIN')).toHaveValue('27AAPFU0939F1ZV');
});

test('the agency invites the business owner, who sees only their own website', async ({ page }) => {
  await logIn(page, TEAM.email); // team members can invite clients
  await page.goto(mithaiUrl);
  await page.getByLabel('Email address').fill(CLIENT.email);
  await page.getByRole('button', { name: 'Create invitation' }).click();
  const link = await inviteLinkOnPage(page);
  await page.reload();
  await expect(page.getByText(CLIENT.email)).toBeVisible();

  await logOut(page);
  await signUp(page, CLIENT.name, CLIENT.email, new URL(link).pathname);
  await expect(page.getByRole('heading', { name: /Join Mithai Market/ })).toBeVisible();
  await page.getByRole('button', { name: 'Accept invitation' }).click();
  await expect(page).toHaveURL(/\/admin$/);
  await expect(page.getByRole('heading', { name: 'Namaste, Mehul' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Mithai Market' })).toBeVisible();
  await expect(page.getByText('Kapoor Dental')).toHaveCount(0);
  await noHorizontalScroll(page);

  // the agency studio and other projects are off-limits
  await page.goto('/studio');
  await expect(page).toHaveURL(/\/admin$/);
  await page.goto(kapoorUrl);
  await expect(page).toHaveURL(/\/admin$/);
});

test('the business owner invites orders-only staff, who see only orders', async ({ page }) => {
  await logIn(page, CLIENT.email);
  await page.getByRole('link', { name: 'Staff' }).click();
  await page.getByLabel('Email address').fill(STAFF.email);
  // "Orders" is ticked by default
  await page.getByRole('button', { name: 'Create invitation' }).click();
  const link = await inviteLinkOnPage(page);

  await logOut(page);
  await signUp(page, STAFF.name, STAFF.email, new URL(link).pathname);
  await expect(page.getByText('join as a staff member')).toBeVisible();
  await page.getByRole('button', { name: 'Accept invitation' }).click();
  await expect(page).toHaveURL(/\/admin$/);
  await expect(page.getByText('You can manage:')).toBeVisible();
  const areas = page.locator('ul li');
  await expect(areas).toHaveText(['Orders']);
  await expect(page.getByRole('link', { name: 'Staff' })).toHaveCount(0);
  await page.goto('/admin/team');
  await expect(page).toHaveURL(/\/admin$/);
});

test('an invitation only works for the email it was sent to', async ({ page }) => {
  await logIn(page, FOUNDER);
  await page.goto('/studio/team');
  await page.getByLabel('Email address').fill('someone-else@mumbai-studio.test');
  await page.getByRole('button', { name: 'Create invitation' }).click();
  const link = await inviteLinkOnPage(page);
  await page.goto(link);
  await expect(page.getByText(`You’re logged in as ${FOUNDER}, but this invitation is for someone-else@mumbai-studio.test.`)).toBeVisible();
  await expect(page.getByRole('button', { name: 'Accept invitation' })).toHaveCount(0);
});

test('the owner can change a team member’s role', async ({ page }) => {
  await logIn(page, FOUNDER);
  await page.goto('/studio/team');
  const tanvi = page.getByRole('listitem').filter({ hasText: TEAM.email });
  await tanvi.getByLabel(`Role for ${TEAM.email}`).selectOption('owner');
  await tanvi.getByRole('button', { name: 'Change' }).click();
  await expect(tanvi.getByText('Role updated.')).toBeVisible();
  await tanvi.getByLabel(`Role for ${TEAM.email}`).selectOption('team');
  await tanvi.getByRole('button', { name: 'Change' }).click();
  await expect(tanvi.getByText('Role updated.')).toBeVisible();
});
