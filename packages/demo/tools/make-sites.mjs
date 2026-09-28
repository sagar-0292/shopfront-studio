// Writes the product catalogues for the four sample websites (packages/demo/sites/<id>/data).
// Every picture is a real stock photo: {"$photo": "<group>/<slot>"} points at photos.json,
// and the release step swaps in the saved photo (sizes, alt text) and credits the photographer.
//   node tools/make-sites.mjs
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const sites = join(here, '..', 'sites');
const json = (site, data) => { mkdirSync(join(sites, site, 'data'), { recursive: true }); writeFileSync(join(sites, site, 'data', 'catalog.json'), JSON.stringify(data, null, 1) + '\n'); };
const photo = (key) => ({ $photo: key });

// ---------------------------------------------------------------- Aranya (editorial jeweller)
const aranya = [
  ['p1', 'emerald-solitaire', 'The Emerald Solitaire', 'rings', 'Rings', 18650000, 'A Colombian emerald framed in diamonds, set by hand in 18k yellow gold.', true, ['New']],
  ['p2', 'kundan-choker', 'Kundan Choker Set', 'necklaces', 'Necklaces', 42500000, 'Kundan choker with matching earrings, finished with blue stone drops and meenakari on the reverse.', true],
  ['p3', 'jhumka-pearl', 'Temple Jhumkas', 'earrings', 'Earrings', 8900000, 'Temple-style gold jhumkas with fine granulation work.', true],
  ['p4', 'bridal-bangles', 'Bridal Bangle Set', 'bangles', 'Bangles', 26400000, 'A stacked set of 22k bangles made for the wedding day, sized to order.', true],
  ['p5', 'diamond-band', 'Eternity Band', 'rings', 'Rings', 12400000, 'Brilliant-cut diamonds set all the way round a gold band.'],
  ['p6', 'sapphire-drop', 'Sapphire Drop Pendant', 'necklaces', 'Necklaces', 15800000, 'An oval sapphire cabochon on a fine gold chain.'],
  ['p7', 'chandbali', 'Diamond Chandbalis', 'earrings', 'Earrings', 11200000, 'Crescent chandbalis set with diamonds, light enough to wear all evening.'],
  ['p8', 'pearl-bangles', 'Pearl & Gold Bangles', 'bangles', 'Bangles', 6400000, 'Slim gold bangles worn with a strand of Basra pearls.'],
];
json('aranya', {
  products: aranya.map(([id, slug, name, cat, catName, price, description, featured, badges]) => ({
    id, slug, name, description, price_paise: price, image: photo(`aranya/${slug}`),
    category: { slug: cat, name: catName }, stock: 2, status: 'active', created_at: '2026-09-01', ...(featured ? { featured: true } : {}), ...(badges ? { badges } : {}),
  })),
  bookings: { services: [{ id: 'viewing', name: 'Private viewing at the atelier', duration_minutes: 60, price_paise: 0 }, { id: 'bridal', name: 'Bridal consultation', duration_minutes: 90, price_paise: 0 }],
    hours: Object.fromEntries(['tue', 'wed', 'thu', 'fri', 'sat'].map((d) => [d, [['11:00', '19:00']]])), slot_minutes: 60, capacity: 1, blocked_dates: [], booked: {} },
});

// ---------------------------------------------------------------- Bandra Bake House (crafted bakery)
const bake = [
  ['b1', 'country-sourdough', 'Country Sourdough', 'breads', 'Breads', 32000, '48-hour ferment, stone-baked, with a crackling crust.', true, ['Bestseller'], [['half', 'Half loaf', 18000], ['whole', 'Whole loaf', 32000]]],
  ['b2', 'butter-croissant', 'Butter Croissant', 'viennoiserie', 'Viennoiserie', 14000, '27 layers of French-style butter, baked every morning at 7.', true],
  ['b3', 'brown-butter-cookie', 'Brown Butter Cookies', 'cookies', 'Cookies', 24000, 'Box of four: dark chocolate, sea salt, brown butter.', true],
  ['b4', 'chocolate-babka', 'Chocolate Babka', 'breads', 'Breads', 58000, 'Rich brioche twisted with 70% chocolate and hazelnut.', true],
  ['b5', 'rosemary-focaccia', 'Rosemary Focaccia', 'breads', 'Breads', 36000, 'Olive oil, rosemary from our terrace, flaky salt.'],
  ['b6', 'cinnamon-buns', 'Cinnamon Buns', 'viennoiserie', 'Viennoiserie', 42000, 'Box of three, with cardamom and brown sugar.'],
  ['b7', 'ladi-pav', 'Milk Ladi Pav', 'breads', 'Breads', 9000, 'Soft, pillowy pav for your weekend bhaji.'],
  ['b8', 'mango-cheesecake', 'Alphonso Cheesecake', 'cakes', 'Cakes', 145000, 'Baked cheesecake with Ratnagiri Alphonso. Serves 8.', false, ['Seasonal']],
];
json('bandra-bake-house', {
  products: bake.map(([id, slug, name, cat, catName, price, description, featured, badges, variants]) => ({
    id, slug, name, description, price_paise: price, image: photo(`bandra-bake-house/${slug}`),
    category: { slug: cat, name: catName }, stock: 20, status: 'active', created_at: '2026-09-10', ...(featured ? { featured: true } : {}), ...(badges ? { badges } : {}),
    ...(variants ? { variants: variants.map(([vid, label, p]) => ({ id: `${slug}-${vid}`, label, price_paise: p, stock: 10 })) } : {}),
  })),
  bookings: { services: [{ id: 'cake', name: 'Custom cake consultation', duration_minutes: 30, price_paise: 0 }],
    hours: Object.fromEntries(['mon', 'tue', 'wed', 'thu', 'fri', 'sat'].map((d) => [d, [['10:00', '13:00'], ['15:00', '18:00']]])), slot_minutes: 30, capacity: 1, blocked_dates: [], booked: {} },
});

// ---------------------------------------------------------------- Mithai Market (bold): the demo shop's catalogue, with this site's photos
const mithai = JSON.parse(readFileSync(join(here, '../assets/data/mithai.json'), 'utf8'));
for (const p of mithai.products) p.image = photo(p.image.$photo.replace(/^demo\//, 'mithai-market/'));
json('mithai-market', mithai);

// ---------------------------------------------------------------- Ember (cinematic restaurant): bookings only
json('ember', {
  products: [],
  bookings: { services: [{ id: 'table', name: 'Table for dinner', duration_minutes: 120 }, { id: 'chef', name: "Chef's counter (8 seats)", duration_minutes: 150 }],
    hours: Object.fromEntries(['tue', 'wed', 'thu', 'fri', 'sat', 'sun'].map((d) => [d, [['19:00', '23:00']]])), slot_minutes: 30, capacity: 6, blocked_dates: [], booked: {} },
});
console.log('Sample site catalogues written.');
