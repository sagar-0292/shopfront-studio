import { test as base, expect, type Page } from '@playwright/test';

/** Like Playwright's `test`, but every page load waits until the page is interactive. */
export const test = base.extend({
  page: async ({ page }, provide) => {
    const wait = () => page.waitForFunction(() => document.documentElement.dataset.hydrated === '1');
    const goto = page.goto.bind(page);
    const reload = page.reload.bind(page);
    page.goto = async (...a) => { const r = await goto(...a); await wait(); return r; };
    page.reload = async (...a) => { const r = await reload(...a); await wait(); return r; };
    await provide(page);
  },
});
export { expect };

/** Opens a project from the dashboard and waits for its page. */
export async function openProject(page: Page, name: string) {
  await page.goto('/studio');
  await page.getByRole('heading', { name }).click();
  await page.waitForURL(/\/studio\/projects\/[0-9a-f-]{36}/);
  await page.waitForFunction(() => document.documentElement.dataset.hydrated === '1');
  return new URL(page.url()).pathname;
}

/** The page's own error message (Next.js adds a separate hidden alert for screen readers). */
export const alertIn = (page: Page) => page.getByRole('main').getByRole('alert');
import pg from 'pg';

const MAIL = 'http://127.0.0.1:54324';
export const PASSWORD = 'Mumbai2026!';

type Mail = { to: string[]; subject: string; links: string[]; at: number };

/** Waits for an email to arrive in the local mail catcher and returns its first link. */
export async function emailLink(to: string, subject: RegExp, after = 0): Promise<string> {
  for (let i = 0; i < 50; i++) {
    const res = await fetch(`${MAIL}/messages?to=${encodeURIComponent(to)}`);
    const mails = (await res.json()) as Mail[];
    const m = mails.find((x) => subject.test(x.subject) && x.at >= after);
    if (m) return m.links[0];
    await new Promise((r) => setTimeout(r, 200));
  }
  throw new Error(`No email "${subject}" for ${to}`);
}

export async function signUp(page: Page, name: string, email: string, next?: string) {
  const started = Date.now();
  await page.goto(next ? `/signup?next=${encodeURIComponent(next)}` : '/signup');
  await page.getByLabel('Your name').fill(name);
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill(PASSWORD);
  await page.getByRole('button', { name: 'Create account' }).click();
  await expect(page.getByText(/sent a confirmation link/)).toBeVisible();
  await page.goto(await emailLink(email, /confirm/i, started - 1000));
}

export async function logIn(page: Page, email: string, password = PASSWORD) {
  await page.goto('/login');
  await page.getByLabel('Email').first().fill(email);
  await page.getByLabel('Password').fill(password);
  await page.getByRole('button', { name: 'Log in' }).click();
  await page.waitForURL((u) => !u.pathname.startsWith('/login'));
  await page.waitForFunction(() => document.documentElement.dataset.hydrated === '1');
}

export async function logOut(page: Page) {
  await page.context().clearCookies();
}

/** Reads the invitation link shown after creating an invitation. */
export async function inviteLinkOnPage(page: Page) {
  const box = page.getByLabel('Invitation link');
  await expect(box).toBeVisible();
  return box.inputValue();
}

export async function sql<T extends pg.QueryResultRow = pg.QueryResultRow>(text: string, params: unknown[] = []) {
  const client = new pg.Client({ connectionString: process.env.E2E_DATABASE_URL });
  await client.connect();
  try {
    return (await client.query<T>(text, params)).rows;
  } finally {
    await client.end();
  }
}

export async function noHorizontalScroll(page: Page) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow, 'page should not scroll sideways').toBeLessThanOrEqual(0);
}

declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    SFMotion?: any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    SFCommerce?: any;
  }
}
