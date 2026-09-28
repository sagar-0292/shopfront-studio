// Photo picking helper for people building sample sites.
//   node packages/photos/cli.ts search "kaju katli" [--orientation=square] [--provider=pexels] [--sheet=out.png]
// Prints numbered results and, with --sheet, makes a contact sheet to look through.
import sharp from 'sharp';
import { search, searchAll, type Provider } from './src/index.ts';

const [cmd, query, ...rest] = process.argv.slice(2);
const flag = (n: string) => rest.find((a) => a.startsWith(`--${n}=`))?.split('=')[1];
if (cmd !== 'search' || !query) {
  console.log('Usage: node packages/photos/cli.ts search "<words>" [--orientation=landscape|portrait|square] [--provider=pexels|unsplash] [--sheet=file.png]');
  process.exit(1);
}
const opts = { orientation: flag('orientation') as 'landscape' | 'portrait' | 'square' | undefined, perPage: Number(flag('n') ?? 15) };
const provider = flag('provider') as Provider | undefined;
const results = provider ? await search(provider, query, opts) : await searchAll(query, opts);
results.forEach((c, i) => console.log(`${String(i).padStart(2)}  ${c.provider}:${c.id}  ${c.width}×${c.height}  ${c.photographer} — ${c.alt.slice(0, 90)}`));
const sheet = flag('sheet');
if (sheet && results.length) {
  const T = 260, cols = 5, rows = Math.ceil(results.length / cols);
  const tiles = await Promise.all(results.map(async (c, i) => {
    const buf = Buffer.from(await (await fetch(c.thumb)).arrayBuffer());
    const label = Buffer.from(`<svg width="${T}" height="28"><rect width="${T}" height="28" fill="#000" opacity=".7"/><text x="8" y="19" font-family="sans-serif" font-size="15" fill="#fff">${i} · ${c.provider}:${c.id}</text></svg>`);
    return { input: await sharp(buf).resize(T, T, { fit: 'cover' }).composite([{ input: label, top: T - 28, left: 0 }]).png().toBuffer(), left: (i % cols) * T, top: Math.floor(i / cols) * T };
  }));
  await sharp({ create: { width: cols * T, height: rows * T, channels: 3, background: '#222' } }).composite(tiles).png().toFile(sheet);
  console.log(`Contact sheet: ${sheet}`);
}
