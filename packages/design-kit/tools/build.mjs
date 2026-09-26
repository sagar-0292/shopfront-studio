// Builds the design kit into packages/design-kit/dist:
//   <direction>.css   fonts + shared layout + that direction's look, minified
//   fonts/*.woff2     self-hosted fonts (SIL Open Font Licence)
//   render.mjs        the frozen page renderer for this version
// Usage: node tools/build.mjs
import { build, transform } from 'esbuild';
import { cpSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const dir = join(dirname(fileURLToPath(import.meta.url)), '..');
const pkg = JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8'));
const out = join(dir, 'dist');
rmSync(out, { recursive: true, force: true });
mkdirSync(join(out, 'fonts'), { recursive: true });

const fonts = readFileSync(join(dir, 'fonts/fonts.css'), 'utf8').replace(/url\(\.\//g, 'url(./fonts/') + readFileSync(join(dir, 'fonts/fallbacks.css'), 'utf8');
const shared = readFileSync(join(dir, 'src/design.css'), 'utf8');
for (const f of readdirSync(join(dir, 'src/themes')).filter((f) => f.endsWith('.css')).sort()) {
  const theme = readFileSync(join(dir, 'src/themes', f), 'utf8');
  const { code } = await transform(`${fonts}\n${shared}\n${theme}`, { loader: 'css', minify: true, target: ['chrome87', 'safari15', 'firefox90'] });
  writeFileSync(join(out, f), code);
}
for (const f of readdirSync(join(dir, 'fonts')).filter((f) => f.endsWith('.woff2'))) cpSync(join(dir, 'fonts', f), join(out, 'fonts', f));
await build({
  entryPoints: [join(dir, 'src/index.ts')], outfile: join(out, 'render.mjs'), bundle: true, format: 'esm', platform: 'neutral',
  minify: true, target: 'es2022', legalComments: 'eof', logLevel: 'warning',
});
writeFileSync(join(out, 'VERSION'), pkg.version + '\n');
console.log(`Built design-kit ${pkg.version}`);
