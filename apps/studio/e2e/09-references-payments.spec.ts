import { expect, logIn, openProject, sql, test } from './helpers';

test.describe.configure({ mode: 'serial' });
const OWNER = 'sagar@mumbai-studio.test';
const CLIENT = 'mehul@mithaimarket.test';
const STAFF = 'sonal@mithaimarket.test';
let mithaiId = '';

test('the agency adds inspiration and competitor websites', async ({ page }) => {
  await logIn(page, OWNER);
  const url = await openProject(page, 'Mithai Market');
  mithaiId = url.split('/').pop()!;
  const card = page.locator('section').filter({ has: page.getByRole('heading', { name: 'Reference & competitor websites' }) });
  await card.getByLabel('A competitor').check();
  await card.getByLabel('Web address').fill('Rival-Sweets.in/Menu/');
  await card.getByLabel(/What do you like/).fill('Watch their Diwali offers');
  await card.getByRole('button', { name: 'Add website' }).click();
  await expect(card.getByText('Added https://rival-sweets.in/Menu.')).toBeVisible();
  await page.reload();
  const competitors = page.getByRole('region', { name: 'Competitors' });
  await expect(competitors.getByRole('link', { name: 'rival-sweets.in/Menu' })).toHaveAttribute('href', 'https://rival-sweets.in/Menu');
  await expect(competitors.getByText('Watch their Diwali offers')).toBeVisible();

  await card.getByLabel('Web address').fill('https://rival-sweets.in/Menu');
  await card.getByLabel('A competitor').check();
  await card.getByRole('button', { name: 'Add website' }).click();
  await expect(card.getByText('That website is already on the list.')).toBeVisible();
  await card.getByLabel('Web address').fill('localhost:3000');
  await card.getByRole('button', { name: 'Add website' }).click();
  await expect(card.getByText('“localhost:3000” isn’t a public website address.')).toBeVisible();
});

test('the business owner adds their own inspiration and can only remove their own links', async ({ page }) => {
  await logIn(page, CLIENT);
  await page.getByRole('link', { name: 'Payments & reference websites →' }).click();
  await expect(page).toHaveURL(new RegExp(`/admin/sites/${mithaiId}`));
  await expect(page.getByRole('region', { name: 'Competitors' }).getByText('rival-sweets.in/Menu')).toBeVisible();
  await expect(page.getByRole('region', { name: 'Competitors' }).getByRole('button', { name: 'Remove' })).toHaveCount(0);
  await page.getByLabel('Web address').fill('lovelybakery.co.in');
  await page.getByRole('button', { name: 'Add website' }).click();
  await expect(page.getByText('Added https://lovelybakery.co.in.')).toBeVisible();
  await page.reload();
  const insp = page.getByRole('region', { name: 'Inspiration — “make it like this”' });
  await expect(insp.getByText('lovelybakery.co.in')).toBeVisible();
  await expect(insp.getByText('Added by you')).toBeVisible();
  await expect(insp.getByRole('button', { name: 'Remove' })).toHaveCount(1);
});

test('the business owner sets up UPI and cash on delivery, with plain-language checks', async ({ page }) => {
  await logIn(page, CLIENT);
  await page.goto(`/admin/sites/${mithaiId}`);
  const pay = page.locator('#payments');
  await expect(pay.getByLabel(/Pay online/)).toBeDisabled();
  await pay.getByLabel(/UPI \(free\)/).check();
  await pay.getByLabel('Shop’s UPI ID').fill('mithai market');
  await pay.getByRole('button', { name: 'Save payment options' }).click();
  await expect(pay.getByRole('alert')).toHaveText(/That UPI ID doesn’t look right/);
  await pay.getByLabel('Shop’s UPI ID').fill('mithaimarket@okicici');
  await pay.getByLabel('Name shown in the UPI app').fill('Mithai Market');
  await pay.getByLabel(/Cash on delivery/).check();
  await pay.getByLabel('Cash-on-delivery limit (₹)').fill('5,000');
  await pay.getByRole('button', { name: 'Save payment options' }).click();
  await expect(pay.getByText('Payment options saved.')).toBeVisible();
  await page.reload();
  await expect(page.locator('#payments').getByText('Now: ₹5,000')).toBeVisible();
  await expect(page.locator('#payments').getByLabel('Shop’s UPI ID')).toHaveValue('mithaimarket@okicici');
});

test('gateway keys are checked, stored encrypted, and never shown again', async ({ page }) => {
  await logIn(page, CLIENT);
  await page.goto(`/admin/sites/${mithaiId}`);
  const pay = page.locator('#payments');
  await pay.getByText('Enter keys instead').click();
  await pay.getByLabel('Payment gateway', { exact: true }).selectOption('stripe');
  await pay.getByLabel('Publishable key').fill('pk_test_abc');
  await pay.getByLabel('Secret key').fill('sk_test_Sup3rS3cretValue9876');
  await pay.getByRole('button', { name: 'Save Stripe keys' }).click();
  await expect(pay.getByRole('alert')).toHaveText(/That Stripe Publishable key doesn’t look right/);
  // A mistake never wipes what was typed, and the chosen gateway stays chosen.
  await expect(pay.getByLabel('Payment gateway', { exact: true })).toHaveValue('stripe');
  await expect(pay.getByLabel('Secret key')).toHaveValue('sk_test_Sup3rS3cretValue9876');
  await pay.getByLabel('Publishable key').fill('pk_test_51AbCdEfGhIjKl');
  await pay.getByLabel('Secret key').fill('sk_test_Sup3rS3cretValue9876');
  await pay.getByRole('button', { name: 'Save Stripe keys' }).click();
  // The key form is replaced by the connected gateway panel.
  await expect(pay.getByText(/••••9876 · connected/)).toBeVisible();
  await page.reload();
  await expect(page.locator('#payments').getByText('Test mode')).toBeVisible();
  await expect(page.locator('#payments').getByText(/••••9876/)).toBeVisible();
  expect(await page.content()).not.toContain('Sup3rS3cret');
  const [row] = await sql<{ ciphertext: string }>(`select ciphertext from site_payment_secrets where site_id = $1`, [mithaiId]);
  expect(row.ciphertext).toMatch(/^v1\./);
  expect(row.ciphertext).not.toContain('Sup3rS3cret');

  await page.locator('#payments').getByLabel(/Pay online/).check();
  await page.locator('#payments').getByRole('button', { name: 'Save payment options' }).click();
  await expect(page.locator('#payments').getByText('Payment options saved.')).toBeVisible();

  page.once('dialog', (d) => d.accept());
  await page.locator('#payments').getByRole('button', { name: 'Disconnect' }).click();
  await expect(page.locator('#payments').getByText('Enter keys instead', { exact: false })).toBeVisible(); // back to "not connected"
  expect((await sql(`select 1 from site_payment_secrets where site_id = $1`, [mithaiId])).length).toBe(0);
});

test('Razorpay Connect: approve on Razorpay and come back connected', async ({ page }) => {
  await logIn(page, OWNER);
  await page.goto(`/studio/projects/${mithaiId}`);
  await page.getByRole('link', { name: 'Connect Razorpay (test)' }).click();
  await expect(page).toHaveURL(new RegExp(`/studio/projects/${mithaiId}\\?payments=connected`));
  await expect(page.getByText('Razorpay connected. The tokens are stored encrypted.')).toBeVisible();
  await expect(page.locator('#payments').getByText('Account ••••5678')).toBeVisible();
  const [s] = await sql<{ online_provider: string; provider_public_id: string; online_mode: string }>(`select online_provider, provider_public_id, online_mode from site_payment_settings where site_id = $1`, [mithaiId]);
  expect(s).toEqual({ online_provider: 'razorpay', provider_public_id: 'rzp_test_oauth_Mock1234', online_mode: 'test' });
});

test('a forged Razorpay return is refused and nothing is saved', async ({ page }) => {
  await logIn(page, OWNER);
  await page.goto(`/studio/projects/${mithaiId}`);
  page.once('dialog', (d) => d.accept());
  await page.locator('#payments').getByRole('button', { name: 'Disconnect' }).click();
  await expect(page.getByRole('link', { name: 'Connect Razorpay (test)' })).toBeVisible();
  const before = (await sql<{ n: number }>(`select count(*)::int as n from audit_log where table_name = 'site_payment_secrets'`))[0].n;
  // Start a real connection, but stop before Razorpay answers…
  const href = await page.getByRole('link', { name: 'Connect Razorpay (test)' }).getAttribute('href');
  const first = await page.request.get(href!, { maxRedirects: 0 }); // sets the connection cookie
  expect(first.status()).toBe(307);
  expect(first.headers()['location']).toContain('127.0.0.1:54326/authorize');
  // …then arrive with a reply that didn't come from that connection.
  await page.goto('/api/payments/razorpay/callback?code=mock-code&state=forged-state-value-000000');
  await expect(page).toHaveURL(new RegExp(`/studio/projects/${mithaiId}`));
  await expect(page.getByText('The Razorpay connection expired or didn’t match. Please try again.')).toBeVisible();
  const after = (await sql<{ n: number }>(`select count(*)::int as n from audit_log where table_name = 'site_payment_secrets'`))[0].n;
  expect(after).toBe(before);
  expect((await sql(`select 1 from site_payment_secrets where site_id = $1`, [mithaiId])).length).toBe(0);
});

test('staff cannot open payment settings, and changes show in Activity', async ({ page }) => {
  await logIn(page, STAFF);
  await page.goto(`/admin/sites/${mithaiId}`);
  await expect(page.getByText('This page doesn’t exist, or you don’t have access to it.')).toBeVisible();
  await logIn(page, OWNER);
  await page.goto('/studio/activity');
  await expect(page.getByText(/Mehul Joshi added reference website “https:\/\/lovelybakery.co.in”/)).toBeVisible();
  await expect(page.getByText(/changed payment options/).first()).toBeVisible();
  await expect(page.getByText(/added payment gateway keys “razorpay”/).first()).toBeVisible();
});
