// Makes the demo's sample media (run once; outputs are committed):
//   assets/models/diya.glb   – a 3D model, to show "load the client's own .glb"
//   assets/media/hero.webm   – a short looping video for the video hero
//   (Product and page pictures are real stock photos: see photos.json and tools/fetch-photos.ts.)
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

console.log('Demo assets written.');
