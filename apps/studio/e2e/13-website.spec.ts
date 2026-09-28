import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { unzipSync, strFromU8 } from 'fflate';
import { alertIn, expect, logIn, noHorizontalScroll, openProject, sql, test } from './helpers';

// Create website: the brief for Claude, the business's own material, Claude's answer,
// the preview, and the .zip that goes on Netlify.
const FOUNDER = 'sagar@mumbai-studio.test';
test.describe.configure({ mode: 'serial' });

// Claude's answer: the Quiet luxury sample, written in Claude's format.
const answer = readFileSync(join(__dirname, '../kits/sites/saltwater/example.json'), 'utf8');

test.beforeEach(async ({ context }) => {
  // Photos from the local Pexels stand-in point at Pexels' image servers; serve a small image instead.
  const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');
  await context.route('https://images.pexels.com/**', (r) => r.fulfill({ status: 200, contentType: 'image/png', body: png }));
});

test('a project page leads to creating its website, once a design is chosen', async ({ page }) => {
  await logIn(page, FOUNDER);
  await openProject(page, 'Kapoor Dental');
  await page.getByRole('link', { name: 'Create website' }).click();
  await expect(page.getByRole('heading', { name: 'Website', level: 1 })).toBeVisible();
  await expect(page.getByText('Choose a design for this project first')).toBeVisible();
  await page.getByRole('link', { name: 'Go to the Design card' }).click();
  await page.getByRole('radio', { name: /Quiet luxury/ }).check();
  await page.getByRole('button', { name: 'Use this design' }).click();
  await expect(page.getByText('Design set to Quiet luxury.')).toBeVisible();
});

test('the team describes the business and uploads the logo; the brief for Claude includes both', async ({ page }) => {
  await logIn(page, FOUNDER);
  await openProject(page, 'Kapoor Dental');
  await page.getByRole('link', { name: 'Create website' }).click();
  await expect(page.getByText('Look: Quiet luxury')).toBeVisible();

  await page.getByLabel(/What does the business do/).fill('A calm family dental clinic in Bandra, open since 1998, known for painless root canals.');
  await page.getByLabel('Street address').fill('14 Hill Road');
  await page.getByLabel('Area').fill('Bandra West');
  await page.getByLabel('PIN code').fill('400050');
  await page.getByLabel('City').fill('Mumbai');
  await page.getByLabel('Opening hours').fill('Mon – Sat 10am – 7pm');
  await page.getByRole('button', { name: 'Save' }).click();
  await expect(page.getByText('Saved. The brief for Claude below now includes these details.')).toBeVisible();

  // A two-colour logo, made in the browser.
  const logo = await page.evaluate(() => {
    const c = document.createElement('canvas'); c.width = 400; c.height = 160;
    const g = c.getContext('2d')!; g.fillStyle = '#1f4e5f'; g.fillRect(0, 0, 400, 160); g.fillStyle = '#e8a06a'; g.fillRect(0, 100, 400, 60);
    return c.toDataURL('image/png').split(',')[1];
  });
  await page.getByLabel('What is it?').selectOption('logo');
  await page.getByLabel('File').setInputFiles({ name: 'kapoor-logo.png', mimeType: 'image/png', buffer: Buffer.from(logo, 'base64') });
  await page.getByRole('button', { name: 'Upload' }).click();
  await expect(page.getByRole('group', { name: 'Upload material' }).getByRole('status')).toHaveText('Uploaded.');
  const list = page.getByRole('list', { name: 'Uploaded material' });
  await expect(list.getByText('Logo', { exact: true })).toBeVisible();
  await expect(list.locator('[title="#1f4e5f"]')).toBeVisible();

  // A document for Claude to read. Wrong file types are refused in plain words.
  await page.getByLabel('What is it?').selectOption('document');
  await page.getByLabel('File').setInputFiles({ name: 'price-list.txt', mimeType: 'text/plain', buffer: Buffer.from('Cleaning ₹1,200\nRoot canal from ₹6,500') });
  await page.getByRole('button', { name: 'Upload' }).click();
  await expect(page.getByRole('group', { name: 'Upload material' }).getByRole('status')).toHaveText('Uploaded.');
  await expect(list.getByText('price-list.txt')).toBeVisible();
  await page.getByLabel('File').setInputFiles({ name: 'song.mp3', mimeType: 'audio/mpeg', buffer: Buffer.from('x') });
  await page.getByRole('button', { name: 'Upload' }).click();
  await expect(page.getByRole('group', { name: 'Upload material' }).getByRole('status')).toContainText('Documents can be PDF, Word, PowerPoint or plain text');

  // The brief: business, look, logo colours, the document, and the example.
  await page.getByText(/See the brief/).click();
  const brief = await page.getByLabel('The brief for Claude').inputValue();
  expect(brief).toContain('- Name: Kapoor Dental');
  expect(brief).toContain('14 Hill Road, Bandra West');
  expect(brief).toContain('## The look: Quiet luxury');
  expect(brief).toMatch(/Logo colours: #1f4e5f/);
  expect(brief).toContain('price-list.txt');
  expect(brief).toContain('This site takes bookings');
  await expect(page.getByRole('button', { name: 'Copy the brief' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Open Claude ↗' })).toHaveAttribute('href', 'https://claude.ai/new');

  // The material zip holds the logo and the document, to attach to the Claude chat.
  const [dl] = await Promise.all([page.waitForEvent('download'), page.getByRole('link', { name: 'Download material (.zip)' }).click()]);
  const files = Object.keys(unzipSync(readFileSync(await dl.path())));
  expect(files.sort()).toEqual(['logo.webp', 'price-list.txt']);
});

test('pasting Claude’s answer builds the website, with plain-language help when it is wrong', async ({ page }) => {
  await logIn(page, FOUNDER);
  await openProject(page, 'Kapoor Dental');
  await page.getByRole('link', { name: 'Create website' }).click();

  // A cut-off answer.
  await page.getByLabel('Claude’s answer').fill(answer.slice(0, 500));
  await page.getByRole('button', { name: 'Build the website' }).click();
  await expect(alertIn(page)).toContainText('If Claude stopped part-way, type “continue”');

  // A page the design kit can't build (a hero with no headline).
  const broken = JSON.parse(answer);
  delete broken.pages[0].sections[0].headline;
  await page.getByLabel('Claude’s answer').fill(JSON.stringify(broken));
  await page.getByRole('button', { name: 'Build the website' }).click();
  await expect(alertIn(page)).toContainText('pages → 0 → sections → 0 → headline');
  await expect(alertIn(page)).toContainText('Ask Claude to fix this part');

  // The real answer, wrapped the way Claude often replies.
  await page.getByLabel('Claude’s answer').fill('Here is the website:\n```json\n' + answer + '\n```');
  await page.getByRole('button', { name: 'Build the website' }).click();
  await expect(page.getByText('Website built. Check the preview below')).toBeVisible({ timeout: 30_000 });
  const rows = await sql<{ status: string; website: { def: { site: { phone?: string; address?: { pincode: string }; logo?: unknown } } } }>(`select status, website from sites where name = 'Kapoor Dental'`);
  expect(rows[0].status).toBe('building');
  expect(rows[0].website.def.site.address?.pincode).toBe('400050'); // facts from the team, not from Claude
  expect(rows[0].website.def.site.logo).toBeTruthy();

  // The preview shows the website, on a computer and a phone, with the logo in its header.
  const frame = page.frameLocator('iframe[title="Website on a computer"]');
  await expect(frame.getByRole('heading', { level: 1, name: 'Slow days by the Arabian Sea' })).toBeAttached();
  await expect(frame.locator('.d-header .d-logo img')).toHaveAttribute('src', /\/website\/preview\/img\/own\/logo\.webp$/);
  await expect(page.locator('iframe[title="Website on a phone"]')).toHaveCount(1);
  await expect(page.getByRole('link', { name: 'Create website' })).toHaveCount(0);
});

test('the full preview works page by page, and only the agency can see it', async ({ page, browser }) => {
  await logIn(page, FOUNDER);
  await openProject(page, 'Kapoor Dental');
  await page.getByRole('link', { name: 'Open the website builder' }).click();
  const href = await page.getByRole('link', { name: 'Open full preview ↗' }).getAttribute('href');
  await page.goto(href!);
  await expect(page.getByRole('heading', { level: 1, name: 'Slow days by the Arabian Sea' })).toBeVisible();
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex');
  await page.locator('footer').scrollIntoViewIfNeeded();
  await expect(page.locator('footer')).toContainText(/Photos by .*Test Photographer/);
  await page.goto(`${href}rooms/`);
  await expect(page.getByRole('heading', { level: 2, name: 'The rooms' })).toBeVisible();
  await noHorizontalScroll(page);

  const stranger = await browser.newContext();
  const res = await (await stranger.newPage()).goto(href!);
  expect(res!.url()).toMatch(/\/login/);
  await stranger.close();
});

test('the download is a complete website for Netlify', async ({ page }) => {
  await logIn(page, FOUNDER);
  await openProject(page, 'Kapoor Dental');
  await page.getByRole('link', { name: 'Open the website builder' }).click();
  const [dl] = await Promise.all([page.waitForEvent('download'), page.getByRole('link', { name: 'Download website for Netlify (.zip)' }).click()]);
  expect(dl.suggestedFilename()).toBe('kapoor-dental-website.zip');
  const zip = unzipSync(readFileSync(await dl.path()));
  const names = Object.keys(zip);
  expect(names).toEqual(expect.arrayContaining(['index.html', 'rooms/index.html', 'data/catalog.json', 'img/own/logo.webp', '_headers', 'README.txt']));
  const home = strFromU8(zip['index.html']);
  expect(home).not.toContain('noindex');
  expect(home).toContain('<img src="/img/own/logo.webp"');
  expect(home).toContain('14 Hill Road');
  for (const f of [...home.matchAll(/(?:src|href)="(\/kits\/[^"?#]+)"|url\((\/kits\/[^)]+)\)/g)].map((m) => (m[1] ?? m[2]).slice(1))) expect(names).toContain(f);
  expect(strFromU8(zip['README.txt'])).toContain('app.netlify.com/drop');
});

test('the builder fits a 360px phone', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 780 });
  await logIn(page, FOUNDER);
  await openProject(page, 'Kapoor Dental');
  await page.getByRole('link', { name: 'Open the website builder' }).click();
  await expect(page.getByRole('heading', { name: 'Website', level: 1 })).toBeVisible();
  await noHorizontalScroll(page);
});
