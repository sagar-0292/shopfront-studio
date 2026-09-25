// Takes screenshots of the running app (after `pnpm test:e2e` has filled the
// shopfront_e2e database). Usage: node scripts-screenshots.mjs [outDir]
import { chromium } from '@playwright/test';
const BASE = process.env.BASE ?? 'http://localhost:3100';
const out = process.argv[2] ?? 'screenshots';
const b = await chromium.launch();
async function session(vp, email, pages) {
  const ctx = await b.newContext({ viewport: vp, deviceScaleFactor: vp.width < 500 ? 2 : 1 });
  const p = await ctx.newPage();
  if (email) {
    await p.goto(`${BASE}/login`);
    await p.getByLabel('Email').first().fill(email);
    await p.getByLabel('Password').fill('Mumbai2026!');
    await p.getByRole('button', { name: 'Log in' }).click();
    await p.waitForURL((u) => !u.pathname.startsWith('/login'));
  }
  for (const [path, name, full] of pages) {
    if (path.startsWith('project:')) {
      await p.goto(`${BASE}/studio`);
      await p.getByRole('heading', { name: path.slice(8) }).click();
      await p.waitForURL(/projects\//);
    } else await p.goto(BASE + path);
    await p.waitForTimeout(500);
    await p.screenshot({ path: `${out}/${name}.png`, fullPage: !!full });
  }
  await ctx.close();
}
const desk = { width: 1440, height: 900 };
const phone = { width: 360, height: 740 };
await session(desk, null, [['/login', 'login']]);
await session(desk, 'sagar@mumbai-studio.test', [['/studio', 'dashboard'], ['project:Mithai Market', 'project-settings', true], ['/studio/team', 'team']]);
await session(phone, 'sagar@mumbai-studio.test', [['/studio', 'phone-dashboard', true]]);
await session(phone, 'mehul@mithaimarket.test', [['/admin', 'phone-client-admin']]);
await b.close();
