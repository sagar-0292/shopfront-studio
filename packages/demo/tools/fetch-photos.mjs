// Fetches real photos for the sample site from Wikimedia Commons, keeps only
// freely licensed ones, makes fast phone-friendly versions, and records the
// credit for each (shown in the site footer).
//
//   node tools/fetch-photos.mjs            fetch any photos not yet downloaded
//   node tools/fetch-photos.mjs --refresh  fetch them all again
//
// Outputs: assets/photos/<name>-{400,800}.webp (products, square) or
//          <name>-{800,1600}.webp (wide), and assets/photos/credits.json
import sharp from 'sharp';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const out = join(here, '../assets/photos');
mkdirSync(out, { recursive: true });
const wanted = JSON.parse(readFileSync(join(here, 'photos.json'), 'utf8'));
const creditsPath = join(out, 'credits.json');
const credits = existsSync(creditsPath) ? JSON.parse(readFileSync(creditsPath, 'utf8')) : {};
const refresh = process.argv.includes('--refresh');
const UA = 'ShopfrontStudioDemo/1.0 (sample site builder; contact via agency)';
const FREE = /^(cc0|public domain|pd|cc by(-sa)? [0-9.]+( [a-z]+)?|cc-by(-sa)?-[0-9.]+)$/i;

const strip = (html = '') => html.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();

async function api(params) {
  const url = `https://commons.wikimedia.org/w/api.php?${new URLSearchParams({ format: 'json', origin: '*', ...params })}`;
  const r = await fetch(url, { headers: { 'user-agent': UA } });
  if (!r.ok) throw new Error(`Wikimedia search failed (${r.status})`);
  return r.json();
}

async function find(spec) {
  const common = { prop: 'imageinfo', iiprop: 'url|extmetadata|size|mime', iiurlwidth: spec.wide ? '2000' : '1200' };
  const data = spec.file
    ? await api({ action: 'query', titles: spec.file, ...common })
    : await api({ action: 'query', generator: 'search', gsrnamespace: '6', gsrsearch: `${spec.query} filetype:bitmap`, gsrlimit: '20', ...common });
  const pages = Object.values(data.query?.pages ?? {}).sort((a, b) => (a.index ?? 0) - (b.index ?? 0));
  for (const p of pages) {
    const ii = p.imageinfo?.[0];
    if (!ii || !/image\/(jpeg|png|webp)/.test(ii.mime)) continue;
    if (ii.width < (spec.wide ? 1200 : 600) || ii.height < (spec.wide ? 600 : 500)) continue;
    const m = ii.extmetadata ?? {};
    const license = strip(m.LicenseShortName?.value);
    if (!FREE.test(license)) continue;
    return {
      title: p.title,
      url: ii.thumburl ?? ii.url,
      page: ii.descriptionurl,
      author: strip(m.Artist?.value) || 'Unknown',
      license,
      licenseUrl: m.LicenseUrl?.value ?? null,
    };
  }
  return null;
}

let failed = 0;
for (const [name, spec] of Object.entries(wanted)) {
  if (name.startsWith('_')) continue;
  const sizes = spec.wide ? [800, 1600] : [400, 800];
  if (!refresh && credits[name] && sizes.every((s) => existsSync(join(out, `${name}-${s}.webp`)))) continue;
  try {
    const hit = await find(spec);
    if (!hit) { console.error(`✗ ${name}: no freely licensed photo found for "${spec.query}". Try another query in photos.json.`); failed++; continue; }
    const r = await fetch(hit.url, { headers: { 'user-agent': UA } });
    if (!r.ok) throw new Error(`download failed (${r.status})`);
    const buf = Buffer.from(await r.arrayBuffer());
    for (const s of sizes) {
      const img = sharp(buf).rotate();
      await (spec.wide ? img.resize(s, Math.round(s * 0.62), { fit: 'cover', position: 'attention' }) : img.resize(s, s, { fit: 'cover', position: 'attention' }))
        .webp({ quality: s <= 400 ? 70 : 72 })
        .toFile(join(out, `${name}-${s}.webp`));
    }
    credits[name] = { alt: spec.alt, ...hit };
    console.log(`✓ ${name}: ${hit.title} — ${hit.author} (${hit.license})`);
  } catch (e) {
    console.error(`✗ ${name}: ${e.message}`);
    failed++;
  }
}
writeFileSync(creditsPath, JSON.stringify(credits, null, 2) + '\n');

// Point the sample catalogue at the photos (products without one keep their drawing).
const dataPath = join(here, '../assets/data/mithai.json');
const data = JSON.parse(readFileSync(dataPath, 'utf8'));
for (const p of data.products) {
  const key = p.image?.src?.match(/\/(?:img|photos)\/([\w-]+?)(?:-\d+)?\.(?:svg|webp)$/)?.[1];
  const c = key && credits[key];
  if (!c) continue;
  p.image = {
    src: `/kits/demo/assets/photos/${key}-800.webp`,
    srcset: `/kits/demo/assets/photos/${key}-400.webp 400w, /kits/demo/assets/photos/${key}-800.webp 800w`,
    alt: c.alt, width: 800, height: 800,
  };
}
writeFileSync(dataPath, JSON.stringify(data, null, 1) + '\n');

// A credits page, linked from every page footer.
const esc = (t) => String(t).replace(/[&<>"]/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[ch]);
const rows = Object.entries(credits).map(([k, c]) =>
  `<li><img src="/kits/demo/assets/photos/${k}-${wanted[k]?.wide ? 800 : 400}.webp" alt="" width="80" height="80" loading="lazy" style="width:80px;height:80px;object-fit:cover;border-radius:12px"> <span><a href="${esc(c.page)}">${esc(c.title.replace(/^File:/, ''))}</a> by ${esc(c.author)} — ${c.licenseUrl ? `<a href="${esc(c.licenseUrl)}">${esc(c.license)}</a>` : esc(c.license)}</span></li>`).join('\n      ');
writeFileSync(join(here, '../pages/credits.html'), `<!doctype html>
<html lang="en-IN">
<head>
<title>Photo credits – Mithai Market</title>
<meta name="description" content="Credits for the photographs used on this sample site.">
<!-- @head -->
<style>.credits{list-style:none;padding:0;display:grid;gap:14px}.credits li{display:flex;gap:14px;align-items:center}</style>
</head>
<body>
<!-- @header -->
<main id="main" class="block">
  <div class="wrap">
    <h1 style="font-size:clamp(2.2rem,6vw,4rem);margin:0 0 16px">Photo credits</h1>
    <p class="lede">Photographs from Wikimedia Commons, used under their free licences. Thank you to the photographers.</p>
    <ul class="credits">
      ${rows}
    </ul>
  </div>
</main>
<!-- @footer -->
</body>
</html>
`);
console.log(`Done. ${Object.keys(credits).length} photos credited.${failed ? ` ${failed} need attention.` : ''}`);
if (failed) process.exit(1);
