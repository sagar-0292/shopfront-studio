#!/usr/bin/env node
// Publishes the kits into the studio so websites can use them.
//
//   node scripts/release-kits.mjs          build + publish new versions + demo pages
//   node scripts/release-kits.mjs --check  fail if a published version no longer matches its source
//
// Each version is frozen once published (apps/studio/kits/<kit>/<version>/).
// To change a kit, raise its version in packages/<kit>-kit/package.json and add
// a CHANGELOG entry; websites stay on their version until the agency owner upgrades.
import { execFileSync } from 'node:child_process';
import { build } from 'esbuild';
import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join, dirname, relative } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const out = process.env.KITS_DIR ?? join(root, 'apps/studio/kits');
const check = process.argv.includes('--check');
const KITS = [
  { short: 'motion', pkg: 'motion-kit' },
  { short: 'commerce', pkg: 'commerce-kit' },
  { short: 'design', pkg: 'design-kit', build: 'packages/design-kit/tools/build.mjs' },
];

function files(dir) {
  return readdirSync(dir, { recursive: true }).map(String).filter((f) => statSync(join(dir, f)).isFile()).sort();
}
function hashDir(dir, skip = []) {
  const h = createHash('sha256');
  for (const f of files(dir)) if (!skip.includes(f)) h.update(f).update(readFileSync(join(dir, f)));
  return h.digest('hex');
}
function changelog(pkg, version) {
  const text = readFileSync(join(root, 'packages', pkg, 'CHANGELOG.md'), 'utf8');
  const m = text.match(new RegExp(`## ${version.replace(/\./g, '\\.')} — (\\d{4}-\\d{2}-\\d{2})\\n([\\s\\S]*?)(?=\\n## |$)`));
  if (!m) throw new Error(`packages/${pkg}/CHANGELOG.md has no entry for ${version}. Add "## ${version} — YYYY-MM-DD" with notes.`);
  return { released_at: m[1], notes: m[2].trim() };
}
async function hooksOf(pkg) {
  const tmp = join(root, 'packages', pkg, 'dist', '.hooks.mjs');
  await build({ entryPoints: [join(root, 'packages', pkg, 'src/hooks.ts')], bundle: true, format: 'esm', outfile: tmp, logLevel: 'error' });
  const mod = await import(pathToFileURL(tmp).href + `?t=${Date.now()}`);
  rmSync(tmp);
  return mod.HOOKS;
}

const manifestPath = join(out, 'manifest.json');
const manifest = existsSync(manifestPath) ? JSON.parse(readFileSync(manifestPath, 'utf8')) : {};
let problems = 0;

for (const k of KITS) {
  execFileSync(process.execPath, k.build ? [join(root, k.build)] : [join(root, 'packages/build-kit.mjs'), k.pkg], { stdio: 'inherit' });
  const pkgDir = join(root, 'packages', k.pkg);
  const version = JSON.parse(readFileSync(join(pkgDir, 'package.json'), 'utf8')).version;
  const dist = join(pkgDir, 'dist');
  if (!k.build) {
    const hooks = await hooksOf(k.pkg);
    writeFileSync(join(dist, 'hooks.json'), JSON.stringify({ kit: k.short, version, hooks }, null, 2) + '\n');
  }
  const dest = join(out, k.short, version);
  if (existsSync(dest)) {
    if (hashDir(dest) !== hashDir(dist)) {
      console.error(`✗ ${k.short} ${version} is already published and frozen, but the source has changed.\n  Raise the version in packages/${k.pkg}/package.json and add a CHANGELOG entry.`);
      problems++;
    } else console.log(`✓ ${k.short} ${version} already published (unchanged)`);
  } else if (check) {
    console.error(`✗ ${k.short} ${version} is not published yet. Run: node scripts/release-kits.mjs`);
    problems++;
  } else {
    mkdirSync(dest, { recursive: true });
    cpSync(dist, dest, { recursive: true });
    console.log(`✓ Published ${k.short} ${version} → ${relative(root, dest)}`);
  }
  const entry = { version, ...changelog(k.pkg, version) };
  const m = (manifest[k.short] ??= { latest: version, versions: [] });
  if (!m.versions.some((v) => v.version === version)) m.versions.push(entry);
  m.versions.sort((a, b) => cmp(b.version, a.version));
  m.latest = m.versions[0].version;
}

function cmp(a, b) {
  const pa = a.split(/[.-]/).map((x) => (isNaN(+x) ? x : +x));
  const pb = b.split(/[.-]/).map((x) => (isNaN(+x) ? x : +x));
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    if (pa[i] === pb[i]) continue;
    if (pa[i] === undefined) return 1;
    if (pb[i] === undefined) return -1;
    return pa[i] > pb[i] ? 1 : -1;
  }
  return 0;
}

// Real stock photos: {"$photo": "<group>/<slot>"} in page descriptions and catalogues
// becomes the saved photo (see packages/demo/photos.json and tools/fetch-photos.ts).
const demoSrc = join(root, 'packages/demo');
const photoLock = JSON.parse(readFileSync(join(demoSrc, 'photos.lock.json'), 'utf8'));
function withPhotos(value, used) {
  return JSON.parse(JSON.stringify(value), (_k, v) => {
    if (!v || typeof v !== 'object' || Array.isArray(v) || !('$photo' in v)) return v;
    const p = photoLock[v.$photo];
    if (!p) throw new Error(`Photo "${v.$photo}" is not in photos.lock.json. Add it to packages/demo/photos.json and run: node packages/demo/tools/fetch-photos.ts`);
    used.set(p.credit.photographerUrl, { name: p.credit.photographer, url: p.credit.photographerUrl, source: p.credit.provider === 'pexels' ? 'Pexels' : 'Unsplash' });
    return { src: p.src, srcset: p.srcset, width: p.width, height: p.height, alt: p.alt };
  });
}
// A sample site in the same shape Claude answers in (see apps/studio/src/lib/website): the studio puts the
// sample for the chosen look into each brief, so Claude sees the standard it has to match.
function toExample(def, catalog) {
  const shape = (p) => { const a = Number(p.from.split(':')[2]); return a >= 1.5 ? 'wide' : a > 1.1 ? 'landscape' : a >= 0.95 ? 'square' : 'portrait'; };
  const photo = (key) => { const p = photoLock[key]; return { $photo: { q: p.alt, alt: p.alt, shape: shape(p) } }; };
  const conv = (x) => JSON.parse(JSON.stringify(x), (_k, v) => {
    if (!v || typeof v !== 'object' || Array.isArray(v)) return v;
    if (typeof v.$photo === 'string') return photo(v.$photo);
    if (v.image && v.image.$photo && Object.keys(v).length === 1) return v.image; // media is written as the photo itself
    return v;
  });
  const rupees = (p) => (p == null ? undefined : p / 100);
  const products = (catalog.products ?? []).map((p) => ({
    name: p.name, description: p.description, price: rupees(p.price_paise), ...(p.mrp_paise ? { mrp: rupees(p.mrp_paise) } : {}),
    category: p.category?.name, ...(p.featured ? { featured: true } : {}), ...(p.badges ? { badges: p.badges } : {}),
    ...(p.variants ? { variants: p.variants.map((v) => ({ label: v.label, price: rupees(v.price_paise) })) } : {}),
    photo: conv(p.image),
  }));
  const b = catalog.bookings;
  const bookings = b ? {
    services: b.services.map((sv) => ({ name: sv.name, minutes: sv.duration_minutes, ...(sv.price_paise ? { price: rupees(sv.price_paise) } : {}) })),
    days: Object.keys(b.hours), open: Object.values(b.hours)[0][0][0], close: Object.values(b.hours)[0].at(-1)[1], slotMinutes: b.slot_minutes, capacity: b.capacity,
  } : undefined;
  return {
    tagline: def.site.tagline, description: def.site.description, businessType: def.site.businessType,
    ...(def.palette ? { palette: def.palette } : {}), ...(def.announcement ? { announcement: def.announcement } : {}), ...(def.actionBar ? { actionBar: def.actionBar } : {}),
    nav: def.nav ?? [], pages: conv(def.pages), ...(products.length ? { products } : {}), ...(bookings ? { bookings } : {}),
  };
}

const creditsHtml = (used) => {
  const people = [...used.values()];
  if (!people.length) return '';
  const esc = (t) => t.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
  return `<p class="note">Photos by ${people.map((c) => `<a href="${esc(c.url)}" target="_blank" rel="noopener">${esc(c.name)}</a>`).join(', ')} on <a href="https://www.pexels.com" target="_blank" rel="noopener">Pexels</a>.</p>`;
};

// Demo pages: fill in the shared header/footer/card parts, and the catalogue's photos.
const demoOut = join(out, 'demo');
const demoUsed = new Map();
const demoData = JSON.stringify(withPhotos(JSON.parse(readFileSync(join(demoSrc, 'assets/data/mithai.json'), 'utf8')), demoUsed), null, 1) + '\n';
for (const k of ['demo/diya']) withPhotos({ $photo: k }, demoUsed);
const partial = (n) => (n === 'credits' ? creditsHtml(demoUsed) : readFileSync(join(demoSrc, 'pages/partials', `${n}.html`), 'utf8').trim());
const pages = {};
for (const f of readdirSync(join(demoSrc, 'pages')).filter((f) => f.endsWith('.html'))) {
  pages[f] = readFileSync(join(demoSrc, 'pages', f), 'utf8').replace(/<!-- @(\w+) -->/g, (_, n) => partial(n)).replace(/<!-- @(\w+) -->/g, (_, n) => partial(n));
}

// Sample websites: one per design direction, rendered by the published design kit.
const sitesSrc = join(demoSrc, 'sites');
const sitesOut = join(out, 'sites');
const siteFiles = {};
const published = join(out, 'design', manifest.design.latest, 'render.mjs');
const { renderSite } = await import(pathToFileURL(existsSync(published) ? published : join(root, 'packages/design-kit/dist/render.mjs')).href);
const versions = { motion: manifest.motion.latest, commerce: manifest.commerce.latest, design: manifest.design.latest };
// Each page carries its styles inside it (no extra download before the first paint on a phone).
const styles = {};
for (const [kit, v, names] of [['motion', versions.motion, ['sf-motion.css']], ['commerce', versions.commerce, ['sf-commerce.css']], ['design', versions.design, null]]) {
  const dir = join(out, kit, v);
  for (const f of names ?? readdirSync(dir).filter((f) => f.endsWith('.css'))) styles[`/kits/${kit}/${v}/${f}`] = readFileSync(join(dir, f), 'utf8');
}
for (const id of readdirSync(sitesSrc).sort()) {
  const base = `/kits/sites/${id}`;
  const used = new Map();
  for (const f of files(join(sitesSrc, id)).filter((f) => f !== 'site.json')) {
    let body = readFileSync(join(sitesSrc, id, f));
    // Catalogue photos are site paths ("/img/x.webp"); point them (and each size) at this preview's folder.
    const at = (u) => (u.startsWith('/') ? base + u : u);
    if (f.endsWith('.json')) body = JSON.stringify(withPhotos(JSON.parse(body), used), (k, v) => (k === 'src' && typeof v === 'string' ? at(v) : k === 'srcset' && typeof v === 'string' ? v.split(', ').map((p) => { const [u, w] = p.split(' '); return `${at(u)} ${w}`; }).join(', ') : v), 1) + '\n';
    siteFiles[join(id, f)] = body;
  }
  const raw = JSON.parse(readFileSync(join(sitesSrc, id, 'site.json'), 'utf8'));
  const rawCatalog = existsSync(join(sitesSrc, id, 'data/catalog.json')) ? JSON.parse(readFileSync(join(sitesSrc, id, 'data/catalog.json'), 'utf8')) : {};
  siteFiles[join(id, 'example.json')] = JSON.stringify(toExample(raw, rawCatalog), null, 1) + '\n';
  const def = withPhotos(raw, used);
  def.credits = [...used.values()];
  for (const [path, html] of Object.entries(renderSite(def, { base, versions, styles }))) siteFiles[join(id, path)] = html;
}

if (check) {
  for (const [f, body] of Object.entries(siteFiles)) {
    const p = join(sitesOut, f);
    if (!existsSync(p) || !readFileSync(p).equals(Buffer.from(body))) { console.error(`✗ sites/${f} is out of date. Run: node scripts/release-kits.mjs`); problems++; }
  }
  for (const [f, html] of Object.entries(pages)) {
    const p = join(demoOut, f);
    if (!existsSync(p) || readFileSync(p, 'utf8') !== html) { console.error(`✗ demo/${f} is out of date. Run: node scripts/release-kits.mjs`); problems++; }
  }
  const dataPath = join(demoOut, 'assets/data/mithai.json');
  if (!existsSync(dataPath) || readFileSync(dataPath, 'utf8') !== demoData) { console.error('✗ demo/assets/data/mithai.json is out of date. Run: node scripts/release-kits.mjs'); problems++; }
  const old = JSON.stringify(JSON.parse(readFileSync(manifestPath, 'utf8')));
  if (old !== JSON.stringify(manifest)) { console.error('✗ kits/manifest.json is out of date.'); problems++; }
} else {
  rmSync(demoOut, { recursive: true, force: true });
  mkdirSync(demoOut, { recursive: true });
  for (const [f, html] of Object.entries(pages)) writeFileSync(join(demoOut, f), html);
  cpSync(join(demoSrc, 'assets'), join(demoOut, 'assets'), { recursive: true });
  writeFileSync(join(demoOut, 'assets/data/mithai.json'), demoData);
  writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
  rmSync(sitesOut, { recursive: true, force: true });
  for (const [f, body] of Object.entries(siteFiles)) { mkdirSync(dirname(join(sitesOut, f)), { recursive: true }); writeFileSync(join(sitesOut, f), body); }
  console.log(`✓ Demo pages, sample sites and manifest updated`);
}
if (problems) process.exit(1);
