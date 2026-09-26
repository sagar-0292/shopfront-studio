import { test, expect } from '@playwright/test';

// Every generated site must score 90+ on Lighthouse mobile (a mid-range phone on 4G)
// for performance, accessibility and SEO. The demo pages and the four sample sites are checked here.
test.describe.configure({ mode: 'serial', timeout: 180_000 });

const PAGES = [
  ...['sample', 'shop', 'showcase'].map((p) => `/kits/demo/${p}.html`),
  // One sample website per design direction.
  '/kits/sites/aranya', '/kits/sites/mithai-market', '/kits/sites/ember', '/kits/sites/bandra-bake-house', '/kits/sites/bandra-bake-house/order',
];
for (const page of PAGES) {
  test(`${page} scores 90+ on a phone`, async ({ baseURL }) => {
    const { score } = await import('../scripts-lighthouse.mjs');
    const r = await score(`${baseURL}${page}`);
    console.log(page, JSON.stringify(r.scores), r.metrics.join(' '));
    expect(r.scores.performance, r.failing.join(', ')).toBeGreaterThanOrEqual(90);
    expect(r.scores.accessibility, r.failing.join(', ')).toBeGreaterThanOrEqual(90);
    expect(r.scores.seo, r.failing.join(', ')).toBeGreaterThanOrEqual(90);
  });
}
