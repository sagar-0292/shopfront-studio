// Scores a page the way Google does for a mid-range phone on 4G.
// Usage: node scripts-lighthouse.mjs <url> [minScore]
import lighthouse from 'lighthouse';
import { chromium } from '@playwright/test';

export async function score(url) {
  const browser = await chromium.launch({ args: ['--remote-debugging-port=9333', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  try {
    const r = await lighthouse(url, { port: 9333, output: 'json', logLevel: 'error', onlyCategories: ['performance', 'accessibility', 'best-practices', 'seo'] });
    const c = r.lhr.categories;
    const scores = Object.fromEntries(Object.entries(c).map(([k, v]) => [k, Math.round(v.score * 100)]));
    const failing = Object.values(r.lhr.audits).filter((a) => a.score !== null && a.score < 0.9 && a.scoreDisplayMode !== 'informative' && a.scoreDisplayMode !== 'notApplicable' && a.scoreDisplayMode !== 'manual').map((a) => `${a.id} (${a.displayValue ?? a.score})`);
    const metrics = ['first-contentful-paint', 'largest-contentful-paint', 'total-blocking-time', 'cumulative-layout-shift', 'speed-index'].map((m) => `${m}=${r.lhr.audits[m].displayValue}`);
    return { scores, failing, metrics };
  } finally {
    await browser.close();
  }
}

if (process.argv[1].endsWith('scripts-lighthouse.mjs')) {
  const url = process.argv[2];
  const min = Number(process.argv[3] ?? 90);
  const r = await score(url);
  console.log(JSON.stringify(r, null, 1));
  if (Object.values(r.scores).some((s) => s < min)) process.exit(1);
}
