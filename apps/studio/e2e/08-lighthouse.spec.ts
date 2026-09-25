import { test, expect } from '@playwright/test';

// Every generated site must score 90+ on Lighthouse mobile (a mid-range phone on 4G)
// for performance, accessibility and SEO. The sample site and shop are checked here.
test.describe.configure({ mode: 'serial', timeout: 180_000 });

for (const page of ['sample', 'shop', 'showcase']) {
  test(`${page} page scores 90+ on a phone`, async ({ baseURL }) => {
    const { score } = await import('../scripts-lighthouse.mjs');
    const r = await score(`${baseURL}/kits/demo/${page}.html`);
    console.log(page, JSON.stringify(r.scores), r.metrics.join(' '));
    expect(r.scores.performance, r.failing.join(', ')).toBeGreaterThanOrEqual(90);
    expect(r.scores.accessibility, r.failing.join(', ')).toBeGreaterThanOrEqual(90);
    expect(r.scores.seo, r.failing.join(', ')).toBeGreaterThanOrEqual(90);
  });
}
