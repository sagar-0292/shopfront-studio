// Makes the product illustrations and catalogues for the four sample websites
// in packages/demo/sites/<id>/ (run once; outputs are committed).
// Illustrations stand in for photos until the business sends its own.
import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const sites = join(here, '..', 'sites');
const svg = (body, bg, defs = '') => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 750"><defs>${defs}</defs><rect width="600" height="750" fill="${bg}"/>${body}</svg>`;
const write = (site, name, text) => { mkdirSync(join(sites, site, 'img'), { recursive: true }); writeFileSync(join(sites, site, 'img', name), text); };
const json = (site, data) => { mkdirSync(join(sites, site, 'data'), { recursive: true }); writeFileSync(join(sites, site, 'data', 'catalog.json'), JSON.stringify(data, null, 1) + '\n'); };

// ---------------------------------------------------------------- Aranya (editorial jeweller)
const GOLD = `<linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f3dea0"/><stop offset=".45" stop-color="#c79a45"/><stop offset=".7" stop-color="#8a6420"/><stop offset="1" stop-color="#e8c77a"/></linearGradient>
<radialGradient id="s" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#000" stop-opacity=".18"/><stop offset="1" stop-color="#000" stop-opacity="0"/></radialGradient>`;
const gemDefs = (c) => `<radialGradient id="gem" cx=".35" cy=".3" r=".8"><stop offset="0" stop-color="#fff" stop-opacity=".95"/><stop offset=".25" stop-color="${c}"/><stop offset="1" stop-color="${c}" stop-opacity=".85"/></radialGradient>`;
const shadow = (cx, cy, rx) => `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${rx * 0.16}" fill="url(#s)"/>`;
const JEWEL = {
  ring: (c) => `${shadow(300, 560, 170)}<ellipse cx="300" cy="420" rx="150" ry="150" fill="none" stroke="url(#g)" stroke-width="26"/><ellipse cx="300" cy="420" rx="150" ry="150" fill="none" stroke="#fff" stroke-opacity=".35" stroke-width="3" transform="translate(-6 -6)"/>
    <path d="M262 272 L300 222 L338 272 L300 300 Z" fill="url(#gem)" stroke="#fff" stroke-opacity=".6"/><path d="M262 272 H338 M300 222 V300" stroke="#fff" stroke-opacity=".35"/><rect x="284" y="292" width="32" height="18" fill="url(#g)"/>`,
  necklace: (c) => `${shadow(300, 640, 150)}<path d="M110 150 C140 430 460 430 490 150" fill="none" stroke="url(#g)" stroke-width="7"/>
    ${Array.from({ length: 9 }, (_, i) => { const t = (i + 1) / 10; const x = 110 + 380 * t; const y = 150 + 560 * t * (1 - t) * 1.05; return `<circle cx="${x.toFixed(0)}" cy="${y.toFixed(0)}" r="${i === 4 ? 0 : 9}" fill="url(#g)"/>`; }).join('')}
    <path d="M300 440 L340 500 L300 590 L260 500 Z" fill="url(#gem)" stroke="url(#g)" stroke-width="6"/>`,
  earrings: (c) => [220, 380].map((x) => `${shadow(x, 640, 60)}<circle cx="${x}" cy="210" r="16" fill="none" stroke="url(#g)" stroke-width="6"/><path d="M${x} 226 V300" stroke="url(#g)" stroke-width="5"/>
    <path d="M${x - 50} 330 Q${x} 280 ${x + 50} 330 L${x + 30} 470 Q${x} 540 ${x - 30} 470 Z" fill="none" stroke="url(#g)" stroke-width="8"/><circle cx="${x}" cy="420" r="26" fill="url(#gem)"/>
    ${[-36, -12, 12, 36].map((d) => `<circle cx="${x + d}" cy="${505 + Math.abs(d) * -0.4}" r="7" fill="#f4efe6" stroke="#c9b99a"/>`).join('')}`).join(''),
  bangle: (c) => `${shadow(300, 610, 200)}<ellipse cx="300" cy="420" rx="190" ry="120" fill="none" stroke="url(#g)" stroke-width="34"/><ellipse cx="300" cy="400" rx="190" ry="120" fill="none" stroke="url(#g)" stroke-width="10" opacity=".7"/>
    ${Array.from({ length: 7 }, (_, i) => { const a = Math.PI * (0.15 + i * 0.117); return `<circle cx="${(300 - 190 * Math.cos(a)).toFixed(0)}" cy="${(420 + 120 * Math.sin(a)).toFixed(0)}" r="11" fill="url(#gem)"/>`; }).join('')}`,
};
const GEMS = { emerald: '#0f6b4f', ruby: '#9b1b30', diamond: '#cfdde6', sapphire: '#1f3f96', pearl: '#efe6d6', polki: '#e9dcc0' };
const aranya = [
  ['p1', 'emerald-solitaire', 'The Emerald Solitaire', 'rings', 'Rings', 'ring', 'emerald', 18650000, 'A single Colombian emerald in 18k yellow gold, set by hand.', true, ['New']],
  ['p2', 'polki-choker', 'Polki Choker', 'necklaces', 'Necklaces', 'necklace', 'polki', 42500000, 'Uncut diamonds in a 22k gold choker, finished with meenakari on the reverse.', true],
  ['p3', 'jhumka-pearl', 'Pearl Jhumkas', 'earrings', 'Earrings', 'earrings', 'pearl', 8900000, 'Temple-style jhumkas with Basra pearl drops.', true],
  ['p4', 'ruby-kada', 'Ruby Kada', 'bangles', 'Bangles', 'bangle', 'ruby', 26400000, 'A hinged 22k kada set with Burmese rubies.', true],
  ['p5', 'diamond-band', 'Eternity Band', 'rings', 'Rings', 'ring', 'diamond', 12400000, 'Brilliant-cut diamonds all the way round, in platinum.'],
  ['p6', 'sapphire-drop', 'Sapphire Drop Pendant', 'necklaces', 'Necklaces', 'necklace', 'sapphire', 15800000, 'A Ceylon sapphire on a fine gold chain.'],
  ['p7', 'emerald-studs', 'Emerald Chandbalis', 'earrings', 'Earrings', 'earrings', 'emerald', 11200000, 'Crescent chandbalis with emerald beads.'],
  ['p8', 'pearl-bangle', 'Pearl Bangles, pair', 'bangles', 'Bangles', 'bangle', 'pearl', 6400000, 'A pair of slim bangles lined with seed pearls.'],
];
json('aranya', {
  products: aranya.map(([id, slug, name, cat, catName, kind, gem, price, description, featured, badges]) => {
    write('aranya', `${slug}.svg`, svg(JEWEL[kind](GEMS[gem]), '#efe8dc', GOLD + gemDefs(GEMS[gem])));
    return { id, slug, name, description, price_paise: price, image: { src: `/img/${slug}.svg`, alt: name, width: 600, height: 750 },
      category: { slug: cat, name: catName }, stock: 2, status: 'active', created_at: '2026-09-01', ...(featured ? { featured: true } : {}), ...(badges ? { badges } : {}) };
  }),
  bookings: { services: [{ id: 'viewing', name: 'Private viewing at the atelier', duration_minutes: 60, price_paise: 0 }, { id: 'bridal', name: 'Bridal consultation', duration_minutes: 90, price_paise: 0 }],
    hours: Object.fromEntries(['tue', 'wed', 'thu', 'fri', 'sat'].map((d) => [d, [['11:00', '19:00']]])), slot_minutes: 60, capacity: 1, blocked_dates: [], booked: {} },
});

// ---------------------------------------------------------------- Bandra Bake House (crafted bakery)
const CRUST = `<radialGradient id="c" cx=".4" cy=".35" r=".75"><stop offset="0" stop-color="#e2a55c"/><stop offset=".7" stop-color="#b86a2a"/><stop offset="1" stop-color="#7d3f16"/></radialGradient>
<radialGradient id="s" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#3b2a1e" stop-opacity=".22"/><stop offset="1" stop-color="#3b2a1e" stop-opacity="0"/></radialGradient>`;
const plate = `<circle cx="300" cy="400" r="235" fill="#f8f0e2" stroke="#3b2a1e" stroke-opacity=".12" stroke-width="3"/><circle cx="300" cy="400" r="205" fill="none" stroke="#3b2a1e" stroke-opacity=".08" stroke-width="2" stroke-dasharray="4 8"/>`;
const BAKE = {
  loaf: `${plate}${shadow(300, 500, 170)}<ellipse cx="300" cy="410" rx="175" ry="118" fill="url(#c)"/><path d="M190 380 q55 -40 110 0 M250 350 q55 -40 110 0 M300 420 q55 -40 110 0" stroke="#f3dcb4" stroke-width="10" fill="none" stroke-linecap="round"/><ellipse cx="300" cy="410" rx="175" ry="118" fill="none" stroke="#fff" stroke-opacity=".25" stroke-dasharray="1 9" stroke-width="4"/>`,
  croissant: `${plate}${shadow(300, 500, 170)}${[-2, -1, 0, 1, 2].map((i) => `<ellipse cx="${300 + i * 58}" cy="${410 + Math.abs(i) * 22}" rx="${46 - Math.abs(i) * 7}" ry="${80 - Math.abs(i) * 16}" transform="rotate(${i * 24} ${300 + i * 58} ${410 + Math.abs(i) * 22})" fill="url(#c)" stroke="#7d3f16" stroke-opacity=".4" stroke-width="3"/>`).join('')}`,
  cookie: `${plate}${[[230, 360, 88], [370, 440, 78]].map(([x, y, r]) => `${shadow(x, y + r * 0.8, r)}<circle cx="${x}" cy="${y}" r="${r}" fill="#d49a58" stroke="#a8641f" stroke-width="4"/>${Array.from({ length: 7 }, (_, i) => `<path d="M${(x + Math.cos(i * 2.4) * r * 0.55).toFixed(0)} ${(y + Math.sin(i * 2.4) * r * 0.55).toFixed(0)} l12 -4 l-2 12z" fill="#3b2216"/>`).join('')}`).join('')}`,
  cake: `${plate}${shadow(300, 540, 170)}<path d="M150 330 h300 v190 q-150 40 -300 0z" fill="#f6e3cf"/><path d="M150 400 h300 M150 460 h300" stroke="#8a3b1b" stroke-width="14"/><ellipse cx="300" cy="330" rx="150" ry="40" fill="#fff4e6"/><path d="M160 335 q20 40 40 0 q20 40 40 0 q20 40 40 0 q20 40 40 0 q20 40 40 0 q20 40 40 0 q20 40 40 0" fill="#fff4e6"/>${[230, 300, 370].map((x) => `<circle cx="${x}" cy="318" r="13" fill="#a8481f"/>`).join('')}`,
  bun: `${plate}${[[230, 350], [370, 350], [300, 460]].map(([x, y]) => `${shadow(x, y + 60, 80)}<circle cx="${x}" cy="${y}" r="78" fill="url(#c)"/><path d="M${x - 30} ${y - 20} q30 -25 60 0" stroke="#fff" stroke-opacity=".5" stroke-width="6" fill="none" stroke-linecap="round"/>`).join('')}`,
  focaccia: `${plate}${shadow(300, 540, 180)}<rect x="130" y="270" width="340" height="250" rx="34" fill="url(#c)"/>${Array.from({ length: 15 }, (_, i) => `<circle cx="${175 + (i % 5) * 62}" cy="${315 + Math.floor(i / 5) * 75}" r="10" fill="#7d3f16" opacity=".55"/>`).join('')}${[[210, 330], [330, 400], [390, 310], [250, 450]].map(([x, y]) => `<path d="M${x} ${y} q14 -22 28 0 q-14 22 -28 0" fill="#5f6f2f"/>`).join('')}`,
  babka: `${plate}${shadow(300, 520, 180)}<rect x="140" y="300" width="320" height="200" rx="60" fill="url(#c)"/>${[0, 1, 2, 3].map((i) => `<path d="M${170 + i * 75} 310 q40 90 10 180" stroke="#4a2616" stroke-width="16" fill="none" stroke-linecap="round"/>`).join('')}`,
  pav: `${plate}${Array.from({ length: 6 }, (_, i) => { const x = 195 + (i % 3) * 105, y = 345 + Math.floor(i / 3) * 110; return `<rect x="${x - 50}" y="${y - 50}" width="100" height="100" rx="40" fill="url(#c)" stroke="#e8c690" stroke-width="3"/>`; }).join('')}`,
};
const bake = [
  ['b1', 'country-sourdough', 'Country Sourdough', 'breads', 'Breads', 'loaf', 32000, '48-hour ferment, stone-baked, with a crackling crust.', true, ['Bestseller'], [['half', 'Half loaf', 18000], ['whole', 'Whole loaf', 32000]]],
  ['b2', 'butter-croissant', 'Butter Croissant', 'viennoiserie', 'Viennoiserie', 'croissant', 14000, '27 layers of French-style butter, baked every morning at 7.', true],
  ['b3', 'brown-butter-cookie', 'Brown Butter Cookies', 'cookies', 'Cookies', 'cookie', 24000, 'Box of four: dark chocolate, sea salt, brown butter.', true],
  ['b4', 'chocolate-babka', 'Chocolate Babka', 'breads', 'Breads', 'babka', 58000, 'Rich brioche twisted with 70% chocolate and hazelnut.', true],
  ['b5', 'rosemary-focaccia', 'Rosemary Focaccia', 'breads', 'Breads', 'focaccia', 36000, 'Olive oil, rosemary from our terrace, flaky salt.'],
  ['b6', 'cinnamon-buns', 'Cinnamon Buns', 'viennoiserie', 'Viennoiserie', 'bun', 42000, 'Box of three, with cardamom and brown sugar.'],
  ['b7', 'ladi-pav', 'Milk Ladi Pav', 'breads', 'Breads', 'pav', 9000, 'Soft, pillowy pav for your weekend bhaji.'],
  ['b8', 'mango-cheesecake', 'Alphonso Cheesecake', 'cakes', 'Cakes', 'cake', 145000, 'Baked cheesecake with Ratnagiri Alphonso. Serves 8.', false, ['Seasonal']],
];
json('bandra-bake-house', {
  products: bake.map(([id, slug, name, cat, catName, kind, price, description, featured, badges, variants]) => {
    write('bandra-bake-house', `${slug}.svg`, svg(BAKE[kind], '#ecdcc2', CRUST));
    return { id, slug, name, description, price_paise: price, image: { src: `/img/${slug}.svg`, alt: name, width: 600, height: 750 },
      category: { slug: cat, name: catName }, stock: 20, status: 'active', created_at: '2026-09-10', ...(featured ? { featured: true } : {}), ...(badges ? { badges } : {}),
      ...(variants ? { variants: variants.map(([vid, label, p]) => ({ id: `${slug}-${vid}`, label, price_paise: p, stock: 10 })) } : {}) };
  }),
  bookings: { services: [{ id: 'cake', name: 'Custom cake consultation', duration_minutes: 30, price_paise: 0 }],
    hours: Object.fromEntries(['mon', 'tue', 'wed', 'thu', 'fri', 'sat'].map((d) => [d, [['10:00', '13:00'], ['15:00', '18:00']]])), slot_minutes: 30, capacity: 1, blocked_dates: [], booked: {} },
});

// ---------------------------------------------------------------- Mithai Market (bold): reuses the demo's sweets
const mithai = JSON.parse(readFileSync(join(here, '../assets/data/mithai.json'), 'utf8'));
for (const p of mithai.products) {
  const file = p.image.src.split('/').pop();
  mkdirSync(join(sites, 'mithai-market', 'img'), { recursive: true });
  copyFileSync(join(here, '../assets/img', file), join(sites, 'mithai-market', 'img', file));
  p.image.src = `/img/${file}`;
}
json('mithai-market', mithai);

// ---------------------------------------------------------------- Ember (cinematic restaurant): bookings only
json('ember', {
  products: [],
  bookings: { services: [{ id: 'table', name: 'Table for dinner', duration_minutes: 120 }, { id: 'chef', name: "Chef's counter (8 seats)", duration_minutes: 150 }],
    hours: Object.fromEntries(['tue', 'wed', 'thu', 'fri', 'sat', 'sun'].map((d) => [d, [['19:00', '23:00']]])), slot_minutes: 30, capacity: 6, blocked_dates: [], booked: {} },
});
console.log('Sample site art and catalogues written.');
