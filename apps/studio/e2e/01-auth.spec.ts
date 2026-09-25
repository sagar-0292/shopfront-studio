import { emailLink, logIn, logOut, PASSWORD, signUp, test, expect, alertIn } from './helpers';

const FOUNDER = { name: 'Sagar Shah', email: 'sagar@mumbai-studio.test' };

test.describe.configure({ mode: 'serial' });

test('logged-out visitors are sent to the login page', async ({ page }) => {
  await page.goto('/studio');
  await expect(page).toHaveURL(/\/login\?next=%2Fstudio/);
  await expect(page.getByRole('heading', { name: 'Welcome back' })).toBeVisible();
});

test('the agency founder signs up, confirms their email and creates the agency', async ({ page }) => {
  await signUp(page, FOUNDER.name, FOUNDER.email);
  await expect(page).toHaveURL(/\/onboarding/);
  await expect(page.getByRole('heading', { name: 'Welcome, Sagar' })).toBeVisible();
  await page.getByLabel('Agency name').fill('Mumbai Web Studio');
  await page.getByRole('button', { name: 'Create workspace' }).click();
  await expect(page).toHaveURL(/\/studio$/);
  await expect(page.getByRole('heading', { name: 'Projects' })).toBeVisible();
  await expect(page.getByText('Your first project starts here')).toBeVisible();
  await expect(page.getByRole('link', { name: 'Billing' })).toBeVisible();
});

test('a wrong password gets a plain-language message', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel('Email').first().fill(FOUNDER.email);
  await page.getByLabel('Password').fill('not-my-password1');
  await page.getByRole('button', { name: 'Log in' }).click();
  await expect(alertIn(page)).toHaveText(/email and password don’t match/);
});

test('logging in with an email link works', async ({ page }) => {
  const started = Date.now();
  await page.goto('/login?next=/studio/team');
  await page.getByLabel('Email').nth(1).fill(FOUNDER.email);
  await page.getByRole('button', { name: 'Email me a login link' }).click();
  await expect(page.getByText(/emailed a login link/)).toBeVisible();
  await page.goto(await emailLink(FOUNDER.email, /sign-in link|magic link/i, started - 1000));
  await expect(page).toHaveURL(/\/studio\/team$/);
  await expect(page.getByRole('heading', { name: 'Team' })).toBeVisible();
});

test('an expired or reused login link gives a clear message', async ({ page }) => {
  await page.goto('/auth/callback?code=not-a-real-code&next=/studio');
  await expect(page).toHaveURL(/\/login\?error=link/);
  await expect(alertIn(page)).toHaveText(/expired or was already used/);
});

test('forgot password → reset link → new password works', async ({ page }) => {
  const started = Date.now();
  await page.goto('/forgot-password');
  await page.getByLabel('Email').fill(FOUNDER.email);
  await page.getByRole('button', { name: 'Send reset link' }).click();
  await expect(page.getByText(/password reset link is on its way/)).toBeVisible();
  await page.goto(await emailLink(FOUNDER.email, /reset/i, started - 1000));
  await expect(page).toHaveURL(/\/auth\/reset-password/);
  await page.getByLabel('New password').fill('Bandra2026!');
  await page.getByLabel('Type it again').fill('Bandra2026!');
  await page.getByRole('button', { name: 'Save new password' }).click();
  await expect(page.getByText('Your password has been changed.')).toBeVisible();

  await logOut(page);
  await logIn(page, FOUNDER.email, 'Bandra2026!');
  await expect(page).toHaveURL(/\/studio$/);
  // put it back for the other tests
  await page.goto('/account');
  await page.getByLabel('New password').fill(PASSWORD);
  await page.getByLabel('Type it again').fill(PASSWORD);
  await page.getByRole('button', { name: 'Change password' }).click();
  await expect(page.getByText('Your password has been changed.')).toBeVisible();
});

test('a stranger who signs up cannot create a second agency or see anything', async ({ page }) => {
  await signUp(page, 'Random Person', 'random@elsewhere.test');
  await expect(page).toHaveURL(/\/onboarding/);
  await expect(page.getByText('You don’t have access to anything yet')).toBeVisible();
  await page.goto('/studio');
  await expect(page).toHaveURL(/\/onboarding/);
});
