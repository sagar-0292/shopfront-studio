// Builds one kit into packages/<kit>/dist:
//   sf-<name>.js   (ES module, minified; heavy parts split into lazy chunks)
//   sf-<name>.css
// Usage: node build-kit.mjs motion-kit
import { build } from 'esbuild';
import { readFileSync, rmSync, mkdirSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const kit = process.argv[2];
const dir = join(dirname(fileURLToPath(import.meta.url)), kit);
const pkg = JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8'));
const short = kit.replace('-kit', '');
const out = join(dir, 'dist');
rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });

await build({
  entryPoints: { [`sf-${short}`]: join(dir, 'src/index.ts') },
  outdir: out,
  bundle: true,
  splitting: true,
  format: 'esm',
  minify: true,
  target: ['es2020', 'chrome87', 'safari15', 'firefox90'],
  chunkNames: 'chunks/[name]-[hash]',
  define: { __KIT_VERSION__: JSON.stringify(pkg.version) },
  legalComments: 'eof',
  logLevel: 'warning',
});
await build({
  entryPoints: [join(dir, `src/${short}.css`)],
  outfile: join(out, `sf-${short}.css`),
  bundle: true,
  minify: true,
  logLevel: 'warning',
});
writeFileSync(join(out, 'VERSION'), pkg.version + '\n');
console.log(`Built ${kit} ${pkg.version}`);
