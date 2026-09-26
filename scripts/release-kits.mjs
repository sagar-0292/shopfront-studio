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

// Demo pages: fill in the shared header/footer/card parts.
const demoSrc = join(root, 'packages/demo');
const demoOut = join(out, 'demo');
const partial = (n) => readFileSync(join(demoSrc, 'pages/partials', `${n}.html`), 'utf8').trim();
const pages = {};
for (const f of readdirSync(join(demoSrc, 'pages')).filter((f) => f.endsWith('.html'))) {
  pages[f] = readFileSync(join(demoSrc, 'pages', f), 'utf8').replace(/<!-- @(\w+) -->/g, (_, n) => partial(n));
}

// Sample websites: one per design direction, rendered by the published design kit.
const sitesSrc = join(demoSrc, 'sites');
const sitesOut = join(out, 'sites');
const siteFiles = {};
const published = join(out, 'design', manifest.design.latest, 'render.mjs');
const { renderSite } = await import(pathToFileURL(existsSync(published) ? published : join(root, 'packages/design-kit/dist/render.mjs')).href);
const versions = { motion: manifest.motion.latest, commerce: manifest.commerce.latest, design: manifest.design.latest };
for (const id of readdirSync(sitesSrc).sort()) {
  const base = `/kits/sites/${id}`;
  const def = JSON.parse(readFileSync(join(sitesSrc, id, 'site.json'), 'utf8'));
  for (const [path, html] of Object.entries(renderSite(def, { base, versions }))) siteFiles[join(id, path)] = html;
  for (const f of files(join(sitesSrc, id)).filter((f) => f !== 'site.json')) {
    let body = readFileSync(join(sitesSrc, id, f));
    // Catalogue pictures are site paths ("/img/x.svg"); point them at this preview's folder.
    if (f.endsWith('.json')) body = JSON.stringify(JSON.parse(body), (k, v) => (k === 'src' && typeof v === 'string' && v.startsWith('/') ? base + v : v), 1) + '\n';
    siteFiles[join(id, f)] = body;
  }
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
  const old = JSON.stringify(JSON.parse(readFileSync(manifestPath, 'utf8')));
  if (old !== JSON.stringify(manifest)) { console.error('✗ kits/manifest.json is out of date.'); problems++; }
} else {
  rmSync(demoOut, { recursive: true, force: true });
  mkdirSync(demoOut, { recursive: true });
  for (const [f, html] of Object.entries(pages)) writeFileSync(join(demoOut, f), html);
  cpSync(join(demoSrc, 'assets'), join(demoOut, 'assets'), { recursive: true });
  writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
  rmSync(sitesOut, { recursive: true, force: true });
  for (const [f, body] of Object.entries(siteFiles)) { mkdirSync(dirname(join(sitesOut, f)), { recursive: true }); writeFileSync(join(sitesOut, f), body); }
  console.log(`✓ Demo pages, sample sites and manifest updated`);
}
if (problems) process.exit(1);
