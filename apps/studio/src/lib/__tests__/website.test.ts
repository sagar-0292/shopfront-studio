import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { unzipSync, strFromU8 } from 'fflate';
import { Answer, SECTION_REFERENCE } from '@/lib/website/format';
import { buildWebsite, parseAnswer, parseHours, type BuildInput } from '@/lib/website/build';
import { buildBrief, type BriefFacts, type BriefInput } from '@/lib/website/brief';
import { kitGuide, renderPages, styleGuide, usedFonts, websiteZip } from '@/lib/website/render';
import { sectionReference } from '@/lib/website/format';
import { fillInPrompt, isFillInPrompt, mergeFillIn, parseFillIn } from '@/lib/website/autofill';
import { isPrivateAddress, pageText, pickPages, websiteUrl } from '@/lib/website/read-site';
import { DESIGNS, DIRECTIONS } from '@/lib/designs';
import { manifest } from '@/lib/kits';

const kits = join(__dirname, '../../../kits');
const latest = () => manifest();
const versions = () => ({ motion: latest().motion.latest, commerce: latest().commerce.latest, design: latest().design.latest });
const example = (d: (typeof DIRECTIONS)[number]) => JSON.parse(readFileSync(join(kits, 'sites', DESIGNS[d].sample.id, 'example.json'), 'utf8'));

// A stand-in for the Pexels search API: every search finds three photos.
let searches: string[] = [];
const fakePexels: typeof fetch = async (url) => {
  const q = new URL(String(url)).searchParams.get('query') ?? '';
  searches.push(q);
  const n = searches.length * 10;
  return new Response(JSON.stringify({ photos: [0, 1, 2].map((i) => ({ id: n + i, photographer: `Photographer ${n + i}`, photographer_url: `https://www.pexels.com/@p${n + i}`, src: { original: `https://images.pexels.com/photos/${n + i}/pexels-photo-${n + i}.jpeg` } })) }), { headers: { 'content-type': 'application/json' } });
};

const facts: BriefFacts = { name: 'Test Shop', businessKind: 'Sweet shop', siteTypeOther: '', city: 'Mumbai', state: 'Maharashtra', phone: '+919820012345', whatsapp: '+919820012345', email: 'hi@test.example', siteTypes: ['online_store', 'bookings'], languages: ['en'] };
const input: BriefInput = { about: 'A family sweet shop in Dadar.', offer: 'Kaju katli ₹1,100/kg', audience: '', street: '12 Ranade Road', area: 'Dadar West', city: '', state: '', pincode: '400028', hours: 'Mon – Sat 10am – 8:30pm\nSun 11:00-14:00', instagram: '@testshop', reviews: '', notes: '', website: '' };
const base = (answer: unknown, extra: Partial<BuildInput> = {}): BuildInput => ({
  answer: Answer.parse(answer), direction: 'bold', site: { id: '11111111-1111-1111-1111-111111111111', name: 'Test Shop' },
  facts, input, own: [], payments: null, fetch: fakePexels, ...extra,
});

beforeEach(() => { searches = []; process.env.PEXELS_API_KEY = 'test-key'; delete process.env.PEXELS_API_URL; });
afterEach(() => { delete process.env.PEXELS_API_KEY; });

describe('the brief and the answer format match the design kit', () => {
  it('describes every section the design kit offers', async () => {
    const kit = await import(pathToFileURL(join(kits, 'design', versions().design, 'render.mjs')).href) as { SECTION_TYPES: string[] };
    for (const t of kit.SECTION_TYPES) expect(SECTION_REFERENCE, t).toMatch(new RegExp(`^${t}\\s`, 'm'));
  });

  for (const d of DIRECTIONS) {
    it(`the ${d} sample, written in Claude's format, builds into a working website`, async () => {
      const w = await buildWebsite(base(example(d), { direction: d }));
      const pages = await renderPages(w, versions(), { base: '', noindex: false });
      expect(Object.keys(pages)).toContain('/index.html');
      expect(pages['/index.html']).toContain(`class="d-${d}"`);
      // Every photo became a real, cropped Pexels photo, with its photographer credited.
      expect(pages['/index.html']).toMatch(/images\.pexels\.com\/photos\/\d+\/[^"]+fm=webp&amp;fit=crop/);
      expect(pages['/index.html']).toContain('on <a class="d-link" href="https://www.pexels.com"');
      // Facts come from the project, not from Claude.
      expect(pages['/index.html']).toContain('tel:+919820012345');
    });
  }
});

describe('reading Claude’s answer', () => {
  const minimal = { description: 'A family sweet shop in Dadar, Mumbai.', pages: [{ path: '/', title: 'Test', description: 'Home', sections: [{ type: 'statement', text: 'Hello' }] }] };

  it('finds the JSON inside fences or a sentence', () => {
    expect(parseAnswer('Here you go:\n```json\n' + JSON.stringify(minimal) + '\n```\nEnjoy!').description).toBe(minimal.description);
    expect(parseAnswer('Sure! ' + JSON.stringify(minimal) + ' Hope this helps.').pages).toHaveLength(1);
  });

  it('explains a cut-off answer and a wrong field in plain words', () => {
    expect(() => parseAnswer(JSON.stringify(minimal).slice(0, 60))).toThrow(/stopped part-way.*continue/);
    expect(() => parseAnswer(JSON.stringify({ ...minimal, description: 'short' }))).toThrow(/description.*Ask Claude/);
    expect(() => parseAnswer('')).toThrow(/Paste Claude/);
  });

  it('reads opening hours written the way people write them', () => {
    expect(parseHours('Mon – Sat 10am – 8:30pm\nSun: 11:00-14:00\nclosed on Diwali')).toEqual({
      hours: [{ days: 'Mon – Sat', open: '10:00', close: '20:30' }, { days: 'Sun', open: '11:00', close: '14:00' }],
      bad: ['closed on Diwali'],
    });
    expect(parseHours('Every day 12 pm to 12 am').hours).toEqual([{ days: 'Every day', open: '12:00', close: '00:00' }]);
  });
});

describe('building the website', () => {
  const answer = {
    description: 'A family sweet shop in Dadar, Mumbai, making mithai fresh every morning.',
    nav: [{ label: 'Shop', href: '/shop/' }],
    pages: [
      { path: '/', title: 'Test Shop — Dadar', description: 'Sweets', sections: [
        { type: 'hero', variant: 'split', headline: 'Fresh *every* morning', media: { $photo: { q: 'kaju katli on a plate', alt: 'Kaju katli', shape: 'square' } } },
        { type: 'rows', items: [{ title: 'Our shop', text: 'Since 1962.', media: { $own: 'shop-front' } }, { title: 'Missing', text: 'x', media: { image: { $own: 'nope' } } }] },
        { type: 'menu', title: 'Menu', categories: [{ name: 'Snacks', items: [{ name: 'Samosa', price: 25.5, diet: 'veg' }] }] },
        { type: 'products', title: 'Bestsellers' },
        { type: 'booking', title: 'Book a tasting', anchor: 'book' },
      ] },
      { path: '/shop/', title: 'Shop', description: 'All sweets', sections: [{ type: 'shop', title: 'All sweets' }] },
    ],
    products: [
      { name: 'Kaju Katli', price: 1100, mrp: 1200, category: 'Sweets', featured: true, variants: [{ label: '500 g', price: 560 }], photo: { $photo: { q: 'kaju katli diamonds', alt: 'Kaju katli', shape: 'square' } } },
      { name: 'Kaju Katli', price: 900, category: 'Sweets', photo: { $own: 'shop-front' } },
    ],
    bookings: { services: [{ name: 'Tasting', minutes: 30 }], days: ['sat', 'sun'], open: '11:00', close: '17:00' },
    phone: '+910000000000',
  };
  const own = [{ name: 'shop-front', label: 'Our shop front', kind: 'photo' as const, width: 1600, height: 1200, hasSmall: true }, { name: 'logo', label: '', kind: 'logo' as const, width: 400, height: 160, hasSmall: false }];

  it('uses the project’s facts, the business’s own photos and logo, and the commerce kit’s formats', async () => {
    const w = await buildWebsite(base(answer, { own, payments: { whatsapp: true, upi: { vpa: 'shop@okicici' }, online: { provider: 'razorpay' } } }));
    const site = w.def.site as Record<string, unknown>;
    expect(site.phone).toBe('+919820012345');
    expect(site.address).toEqual({ street: '12 Ranade Road', area: 'Dadar West', city: 'Mumbai', state: 'Maharashtra', pincode: '400028' });
    expect(site.hours).toEqual([{ days: 'Mon – Sat', open: '10:00', close: '20:30' }, { days: 'Sun', open: '11:00', close: '14:00' }]);
    expect(site.social).toEqual({ instagram: 'https://www.instagram.com/testshop' });
    expect(site.logo).toEqual({ src: '/img/own/logo.webp', alt: 'Test Shop logo', width: 400, height: 160 });
    // Own photo, with a phone-sized copy.
    const rows = (w.def.pages as { sections: Record<string, unknown>[] }[])[0].sections[1] as { items: { media: { image: Record<string, unknown> } }[] };
    expect(rows.items[0].media.image).toMatchObject({ src: '/img/own/shop-front.webp', alt: 'Our shop front', srcset: '/img/own/shop-front-800.webp 800w, /img/own/shop-front.webp 1600w' });
    expect(rows.items[1].media.image.src).toMatch(/pexels/); // unknown own photo borrows a found one
    expect(w.notes.join(' ')).toMatch(/“nope”/);
    // Menu prices in paise; products and bookings in the commerce kit's format.
    const menu = (w.def.pages as { sections: Record<string, unknown>[] }[])[0].sections[2] as { categories: { items: { price_paise: number }[] }[] };
    expect(menu.categories[0].items[0].price_paise).toBe(2550);
    const cat = w.catalog as { products: Record<string, unknown>[]; bookings: Record<string, unknown> };
    expect(cat.products[0]).toMatchObject({ id: 'p1', slug: 'kaju-katli', price_paise: 110000, mrp_paise: 120000, featured: true, category: { slug: 'sweets', name: 'Sweets' } });
    expect(cat.products[1].slug).toBe('kaju-katli-2');
    expect(cat.bookings).toMatchObject({ services: [{ id: 'tasting', name: 'Tasting', duration_minutes: 30 }], hours: { sat: [['11:00', '17:00']], sun: [['11:00', '17:00']] }, slot_minutes: 30, capacity: 1 });
    // A static site can't take card payments: WhatsApp and UPI stay, online is left out (and explained).
    expect((w.def.commerce as { payments: Record<string, unknown> }).payments).toEqual({ whatsapp: true, upi: { vpa: 'shop@okicici' } });
    expect(w.notes.join(' ')).toMatch(/Card and net-banking/);
    // Each different request gets a different photo; the same search is only made once.
    expect(new Set(searches).size).toBe(searches.length);
  });

  it('explains when the photo library isn’t connected', async () => {
    delete process.env.PEXELS_API_KEY;
    await expect(buildWebsite(base(answer))).rejects.toThrow(/PEXELS_API_KEY/);
  });

  it('packs a complete website for Netlify: every file a page asks for is in the zip', async () => {
    const own2 = [{ name: 'shop-front', data: new Uint8Array([1, 2, 3]), small: new Uint8Array([4]) }, { name: 'logo', data: new Uint8Array([5]), small: null }];
    const w = await buildWebsite(base(answer, { own, direction: 'block' }));
    const zip = unzipSync(await websiteZip(w, versions(), 'Test Shop', own2));
    const names = Object.keys(zip);
    expect(names).toEqual(expect.arrayContaining(['index.html', 'shop/index.html', 'data/catalog.json', '_headers', 'README.txt', 'img/own/shop-front.webp', 'img/own/shop-front-800.webp', 'img/own/logo.webp']));
    for (const page of names.filter((n) => n.endsWith('.html'))) {
      const html = strFromU8(zip[page]);
      expect(html, page).not.toContain('<link rel="stylesheet"'); // styles are inside the page
      const wanted = [...html.matchAll(/(?:src|href)="(\/(?:kits|img|data)\/[^"?#]+)"|url\((\/kits\/[^)]+)\)/g)].map((m) => (m[1] ?? m[2]).slice(1));
      expect(wanted.length, page).toBeGreaterThan(3);
      for (const f of wanted) expect(names, `${page} needs ${f}`).toContain(f);
    }
    // The catalogue lists the products with their photos.
    expect(JSON.parse(strFromU8(zip['data/catalog.json'])).products).toHaveLength(2);
    // Scripts load their shared chunks: all of them are packed.
    for (const js of names.filter((n) => /kits\/.*\.js$/.test(n))) {
      for (const m of strFromU8(zip[js]).matchAll(/from\s*"\.\/(chunks\/[^"]+)"|import\("\.\/(chunks\/[^"]+)"\)/g)) {
        expect(names).toContain(js.replace(/[^/]+$/, '') + (m[1] ?? m[2]));
      }
    }
  });
});

describe('the brief', () => {
  it('carries the business, the look, the rules, the material and a finished example', () => {
    const text = buildBrief('poster', facts, input, example('poster'), {
      logoColours: ['#c8321a', '#1e3bd6'], photos: [{ name: 'shop-front', label: 'Our shop front' }], documents: [{ filename: 'menu.pdf', label: '2026 menu' }],
    });
    expect(text).toContain('- Name: Test Shop');
    expect(text).toContain('- Kind of business: Sweet shop');
    expect(text).toContain('12 Ranade Road, Dadar West, Mumbai, 400028');
    expect(text).toContain('## The look: Street poster');
    expect(text).toContain('Never invent facts');
    expect(text).toContain('Logo colours: #c8321a, #1e3bd6');
    expect(text).toContain('"shop-front": Our shop front');
    expect(text).toContain('menu.pdf: 2026 menu');
    expect(text).toContain('set "palette" from the logo colours');
    expect(text).toContain('This site sells online');
    expect(text).toContain('This site takes bookings');
    expect(text).toContain('Cutting chai'); // the Street poster sample, as the standard to match
    const plain = buildBrief('quiet', { ...facts, siteTypes: ['other'], siteTypeOther: 'Temple trust with donations' }, input, {}, { logoColours: [], photos: [], documents: [] });
    expect(plain).toContain('Kind of website: Temple trust with donations');
    expect(plain).toContain('Don\'t add colours');
    expect(plain).not.toContain('own material');
  });

  it('from design kit 2.0, Claude art-directs the site: the brief lists the type pairings, and its choice is built', async () => {
    const guide = await styleGuide(versions().design, 'poster');
    expect(guide).toMatch(/^ {2}vogue {6}Bodoni Moda \+ Hanken Grotesk: /m);
    expect(guide).toContain('The look\'s own pairing is "anton"');
    expect(await styleGuide('1.3.0', 'poster')).toBeNull(); // older kits have no art direction
    const text = buildBrief('poster', facts, input, example('poster'), { logoColours: [], photos: [], documents: [] }, { pairings: guide });
    expect(text).toContain('## Art direction');
    expect(text).toContain('"style": {"type": "…"');
    expect(buildBrief('poster', facts, input, {}, { logoColours: [], photos: [], documents: [] })).not.toContain('Art direction');

    const styled = { ...example('poster'), style: { type: 'unbounded', scale: 'huge', shape: 'round', buttons: 'pill', photos: 'duotone' } };
    const w = await buildWebsite(base(styled, { direction: 'poster', kit: { pairings: 'yes', actionBar: true } }));
    const home = (await renderPages(w, versions(), { base: '', noindex: false }))['/index.html'];
    expect(home).toMatch(/<html[^>]* data-type="unbounded"[^>]* data-buttons="pill"[^>]* data-photos="duotone"/);
    expect(home).toContain('unbounded-normal.woff2');
    // A project still on an older kit keeps the look's fonts, and is told how to get the new ones.
    const old = await buildWebsite(base(styled, { direction: 'poster', kit: { pairings: null, actionBar: false } }));
    expect(old.def.style).toBeUndefined();
    expect(old.notes.join(' ')).toMatch(/older than 2\.0/);
    // A choice that isn't in the kit is explained by the design kit.
    const bad = await buildWebsite(base({ ...styled, style: { type: 'comic-sans' } }, { direction: 'poster', kit: { pairings: 'yes', actionBar: true } }));
    await expect(renderPages(bad, versions(), { base: '', noindex: false })).rejects.toThrow(/style.*type/);
  });

  it('teaches Claude what makes people buy, and offers only what the project’s kit can build', async () => {
    const kit = await kitGuide(versions().design, 'bold');
    expect(kit.actionBar).toBe(true);
    const text = buildBrief('bold', facts, input, example('bold'), { logoColours: [], photos: [], documents: [] }, kit);
    expect(text).toContain('## What makes people buy');
    expect(text).toContain('"categories" row with "style": "circles" right after the hero');
    expect(text).toContain('Add a "trust" strip');
    expect(text).toContain('Use ONE buying colour');
    expect(text).toContain('Never fake urgency');
    expect(text).toContain('Book now → "#book"'); // this business takes bookings
    expect(text).toContain('"actionBar": {"actions"');
    expect(text).toMatch(/^trust {7}items/m);
    // A project on design kit 1.3.0 isn't offered the trust strip, round categories or the action bar.
    const old = await kitGuide('1.3.0', 'bold');
    expect(old).toMatchObject({ pairings: null, actionBar: false });
    const oldText = buildBrief('bold', facts, input, {}, { logoColours: [], photos: [], documents: [] }, old);
    expect(oldText).not.toMatch(/^trust /m);
    expect(oldText).not.toContain('"circles"');
    expect(oldText).not.toContain('actionBar');
    expect(oldText).toMatch(/^categories {2}title; eyebrow\?; items \[2-10 [^\n]*\]$/m);
    expect(sectionReference(['hero'])).toMatch(/^hero /m);
    expect(sectionReference(['hero'])).not.toMatch(/^marquee /m);
    expect(sectionReference(['hero'])).toContain('PHOTO means'); // the shared notes stay

    // The action bar Claude writes is built on 2.1, and dropped on older kits.
    const withBar = { ...example('bold'), actionBar: { actions: [{ label: 'Order on WhatsApp', href: 'https://wa.me/919820012345', icon: 'chat' }] } };
    const w = await buildWebsite(base(withBar, { kit }));
    expect((await renderPages(w, versions(), { base: '', noindex: false }))['/index.html']).toContain('class="d-actionbar"');
    expect((await buildWebsite(base(withBar, { kit: old }))).def.actionBar).toBeUndefined();
  });

  it('the download carries only the fonts the website uses', () => {
    const css = '@font-face{font-family:"Anton";src:url(./fonts/anton-normal.woff2)}@font-face{font-family:Bodoni Moda;src:url(./fonts/bodoni-moda-normal.woff2)}@font-face{font-family:"Inter Tight";src:url(./fonts/inter-tight-normal.woff2)}@font-face{font-family:"Inter";src:url(./fonts/inter-normal.woff2)}.d-poster{--f-display:"Anton","Anton Fallback",sans-serif}';
    expect(usedFonts(css, ['<style>.d-poster{--f-body:\'Inter Tight\', \'Inter Tight Fallback\', system-ui}</style>']).sort()).toEqual(['anton-normal.woff2', 'inter-tight-normal.woff2']);
  });

  it('every sample example is valid in Claude’s format', () => {
    for (const d of DIRECTIONS) {
      const p = join(kits, 'sites', DESIGNS[d].sample.id, 'example.json');
      expect(existsSync(p), p).toBe(true);
      expect(Answer.safeParse(JSON.parse(readFileSync(p, 'utf8'))).success, d).toBe(true);
    }
    expect(readdirSync(join(kits, 'design')).length).toBeGreaterThan(0);
  });
});

describe('asking Claude automatically', () => {
  const stream = (events: object[]) => new Response(events.map((e) => `event: x\ndata: ${JSON.stringify(e)}\n\n`).join(''), { headers: { 'content-type': 'text/event-stream' } });
  beforeEach(() => { process.env.ANTHROPIC_API_KEY = 'k'; });
  afterEach(() => { delete process.env.ANTHROPIC_API_KEY; delete process.env.ANTHROPIC_MODEL; });

  it('streams the reply, counts tokens, and sends the material with the brief', async () => {
    const { askClaude } = await import('@/lib/website/claude');
    let sent: { model: string; stream: boolean; max_tokens: number; messages: { content: { type: string; title?: string; source?: { media_type: string } }[] }[] } | null = null;
    const f = (async (_u: unknown, init?: RequestInit) => {
      sent = JSON.parse(String(init!.body));
      expect((init!.headers as Record<string, string>)['x-api-key']).toBe('k');
      return stream([{ type: 'message_start', message: { usage: { input_tokens: 100 } } }, { type: 'content_block_delta', delta: { type: 'text_delta', text: '{"a":' } },
        { type: 'content_block_delta', delta: { type: 'text_delta', text: '1}' } }, { type: 'message_delta', delta: { stop_reason: 'end_turn' }, usage: { output_tokens: 7 } }]);
    }) as typeof fetch;
    const r = await askClaude('THE BRIEF', [{ kind: 'pdf', filename: 'menu.pdf', data: new Uint8Array([37, 80]) }, { kind: 'image', caption: 'Logo:', data: new Uint8Array([1]) }], f);
    expect(r).toMatchObject({ text: '{"a":1}', model: 'claude-sonnet-5', inputTokens: 100, outputTokens: 7 });
    expect(sent!.stream).toBe(true);
    expect(sent!.messages[0].content.map((c) => c.type)).toEqual(['document', 'text', 'image', 'text']);
    expect(sent!.messages[0].content[0]).toMatchObject({ title: 'menu.pdf', source: { media_type: 'application/pdf' } });
  });

  it('explains every problem in plain words', async () => {
    const { askClaude } = await import('@/lib/website/claude');
    const reply = (status: number, message: string) => (async () => new Response(JSON.stringify({ error: { message } }), { status })) as unknown as typeof fetch;
    await expect(askClaude('b', [], reply(401, 'invalid x-api-key'))).rejects.toThrow(/refused the key/);
    await expect(askClaude('b', [], reply(400, 'Your credit balance is too low to access the Anthropic API.'))).rejects.toThrow(/out of credit/);
    await expect(askClaude('b', [], reply(529, 'Overloaded'))).rejects.toThrow(/busy/);
    const cut = (async () => stream([{ type: 'content_block_delta', delta: { type: 'text_delta', text: '{' } }, { type: 'message_delta', delta: { stop_reason: 'max_tokens' } }])) as unknown as typeof fetch;
    await expect(askClaude('b', [], cut)).rejects.toThrow(/longer than one answer allows/);
    delete process.env.ANTHROPIC_API_KEY;
    await expect(askClaude('b', [], cut)).rejects.toThrow(/ANTHROPIC_API_KEY/);
  });
});

describe('filling in the details from their website and documents', () => {
  it('reads a web page: title, description, structured data, contact links and text, without scripts or styles', () => {
    const html = `<html><head><title>Mithai Market &amp; Co</title><meta name="description" content="Sweets since 1962">
      <script type="application/ld+json">{"@type":"Bakery","telephone":"+91 98200 12345"}</script><style>.x{}</style></head>
      <body><nav><a href="/about-us/">Our story</a><a href="/menu">Menu</a><a href="https://other.example/menu">Elsewhere</a><a href="/cart">Cart</a>
      <a href="tel:+919820012345">Call</a><a href="https://wa.me/919820012345">WhatsApp</a></nav>
      <h1>Kaju katli</h1><p>₹1,100 per kg</p><script>alert(1)</script><img src="a.jpg" alt="Our shop in Dadar"></body></html>`;
    const p = pageText(html, new URL('https://www.mithai.example/'));
    expect(p.title).toBe('Mithai Market & Co');
    expect(p.text).toContain('description: Sweets since 1962');
    expect(p.text).toContain('"telephone":"+91 98200 12345"');
    expect(p.text).toContain('Contact links: tel:+919820012345 https://wa.me/919820012345');
    expect(p.text).toContain('## Kaju katli');
    expect(p.text).toContain('₹1,100 per kg');
    expect(p.text).toContain('[photo: Our shop in Dadar]');
    expect(p.text).not.toMatch(/alert|\.x\{/);
    // Only useful pages on the same site are read next.
    expect(pickPages(p, new URL('https://mithai.example/')).map(String)).toEqual(['https://www.mithai.example/about-us/', 'https://www.mithai.example/menu']);
  });

  it('only reads public web addresses', () => {
    for (const ip of ['127.0.0.1', '10.1.2.3', '172.16.0.1', '192.168.1.1', '169.254.169.254', '100.64.0.1', '0.0.0.0', '::1', 'fd00::1', 'fe80::1', '::ffff:127.0.0.1']) expect(isPrivateAddress(ip), ip).toBe(true);
    for (const ip of ['8.8.8.8', '151.101.1.1', '2606:4700::1111']) expect(isPrivateAddress(ip), ip).toBe(false);
    expect(websiteUrl('mithaimarket.in').toString()).toBe('https://mithaimarket.in/');
    expect(() => websiteUrl('http://169.254.169.254/latest/meta-data')).toThrow(/private network/);
    expect(() => websiteUrl('http://localhost/')).toThrow(/doesn’t look like a website/);
    expect(() => websiteUrl('https://example.in:8080/')).toThrow(/port/);
    expect(() => websiteUrl('ftp://example.in/')).toThrow(/http or https/);
    expect(() => websiteUrl('https://www.instagram.com/mithaimarket/')).toThrow(/Instagram and Facebook/);
  });

  it('asks Claude for the brief’s fields, and fills only what the team left empty', () => {
    const prompt = fillInPrompt({ name: 'Mithai Market', url: 'https://mithai.example/', pages: [{ url: 'https://mithai.example/', title: 'Home', text: 'Kaju katli ₹1,100', links: [] }], documents: ['menu.pdf'] });
    expect(isFillInPrompt(prompt)).toBe(true);
    expect(prompt).toContain('Kaju katli ₹1,100');
    expect(prompt).toContain('menu.pdf');
    expect(prompt).toContain('Never guess or invent');
    expect(fillInPrompt({ name: 'X', url: 'https://x.example/', pages: null, documents: [] })).toContain('Visit it');

    const fill = parseFillIn('Here you go:\n```json\n{"about": "Sweets since 1962.", "offer": "Kaju katli – ₹1,100 per kg", "pincode": 400028, "state": "maharashtra", "instagram": "https://instagram.com/mithai.market", "city": "Pune", "hours": "", "phone": "+91 98200 12345"}\n```');
    const { brief, filled } = mergeFillIn({ ...input, about: '', offer: '', city: 'Mumbai', pincode: '', state: '', instagram: '' }, fill);
    expect(brief).toMatchObject({ about: 'Sweets since 1962.', offer: 'Kaju katli – ₹1,100 per kg', pincode: '400028', state: 'Maharashtra', instagram: '@mithai.market', city: 'Mumbai' });
    expect(filled).toEqual(['What the business does', 'What they sell', 'State', 'PIN code', 'Instagram']);
    expect(fill.phone).toBe('+91 98200 12345');
    expect(mergeFillIn(input, parseFillIn('{"pincode": "4000"}')).filled).toEqual([]); // a wrong PIN code is left out
    expect(() => parseFillIn('I could not open the website')).toThrow(/complete answer/);
  });
});
