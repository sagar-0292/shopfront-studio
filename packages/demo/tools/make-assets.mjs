// Makes the demo's sample media (run once; outputs are committed):
//   assets/models/diya.glb   – a 3D model, to show "load the client's own .glb"
//   assets/media/hero.webm   – a short looping video for the video hero
//   assets/img/*.svg         – product illustrations
// The video and model are made inside a real browser (MediaRecorder + Three.js).
import { build } from 'esbuild';
import { chromium } from '@playwright/test';
import { writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const assets = join(here, '..', 'assets');
const bundle = await build({ entryPoints: [join(here, 'exporter-entry.js')], bundle: true, write: false, format: 'iife', nodePaths: [join(here, '../../motion-kit/node_modules')] });
const browser = await chromium.launch();
const page = await browser.newPage();
await page.setContent('<html><body></body></html>');
await page.addScriptTag({ content: bundle.outputFiles[0].text });
writeFileSync(join(assets, 'models/diya.glb'), Buffer.from(await page.evaluate(() => window.makeDiya())));
writeFileSync(join(assets, 'media/hero.webm'), Buffer.from(await page.evaluate(() => window.makeVideo(4))));
await browser.close();

const sweets = [
  ['kaju-katli', '#e9d8b4', 'diamond'], ['motichoor-ladoo', '#f59e0b', 'ball'], ['rasgulla', '#f8f5ee', 'ball'],
  ['gulab-jamun', '#7c2d12', 'ball'], ['soan-papdi', '#fde68a', 'square'], ['barfi', '#fef3c7', 'square'],
  ['bhujia', '#d97706', 'strands'], ['chakli', '#b45309', 'spiral'], ['mathri', '#e7c28a', 'disc'],
  ['hamper', '#be123c', 'box'], ['dry-fruit-box', '#4338ca', 'box'], ['peda', '#f3e1c0', 'disc'],
];
const shape = (kind, c) => ({
  diamond: [0, 1, 2].map((i) => `<path d="M${130 + i * 70} 190 l30 -30 30 30 -30 30z" fill="${c}" stroke="#0002"/>`).join(''),
  ball: [0, 1, 2].map((i) => `<circle cx="${140 + i * 60}" cy="${200 - (i % 2) * 30}" r="34" fill="${c}" stroke="#0002"/>`).join(''),
  square: [0, 1, 2, 3].map((i) => `<rect x="${120 + (i % 2) * 80}" y="${140 + Math.floor(i / 2) * 70}" width="70" height="60" rx="6" fill="${c}" stroke="#0002"/>`).join(''),
  strands: Array.from({ length: 14 }, (_, i) => `<path d="M${110 + i * 13} 150 q20 40 0 90" stroke="${c}" stroke-width="5" fill="none"/>`).join(''),
  spiral: `<path d="M200 190 m-8 0 a8 8 0 1 1 16 0 a16 16 0 1 1 -32 0 a24 24 0 1 1 48 0 a32 32 0 1 1 -64 0 a40 40 0 1 1 80 0" stroke="${c}" stroke-width="12" fill="none"/>`,
  disc: [0, 1, 2].map((i) => `<ellipse cx="${140 + i * 60}" cy="195" rx="30" ry="22" fill="${c}" stroke="#0002"/>`).join(''),
  box: `<rect x="120" y="130" width="160" height="120" rx="10" fill="${c}"/><rect x="190" y="130" width="20" height="120" fill="#f5a524"/><rect x="120" y="180" width="160" height="20" fill="#f5a524"/>`,
})[kind];
for (const [slug, color, kind] of sweets) {
  writeFileSync(join(assets, `img/${slug}.svg`), `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400"><rect width="400" height="400" fill="#f5f0e6"/><ellipse cx="200" cy="210" rx="150" ry="110" fill="#fff" stroke="#e8dcc4" stroke-width="6"/>${shape(kind, color)}</svg>`);
}
writeFileSync(join(assets, 'img/hero-poster.svg'), `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 960 540"><defs><linearGradient id="g" x2="1" y2="1"><stop offset="0" stop-color="#1e1b4b"/><stop offset="1" stop-color="#3b0764"/></linearGradient></defs><rect width="960" height="540" fill="url(#g)"/></svg>`);
console.log('Demo assets written.');
