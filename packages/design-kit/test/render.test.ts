import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { renderSite, DesignError, DIRECTIONS, SECTION_TYPES, DEFAULTS, checkPalette, contrast as checkContrast, safeHref, emph, type SiteDefT } from '../src';

const V = { versions: { motion: '1.0.0', commerce: '1.1.0', design: '1.0.0' } };
const photo = { image: { src: '/img/p-800.webp', srcset: '/img/p-400.webp 400w, /img/p-800.webp 800w', alt: 'Kaju katli on a plate', width: 800, height: 1000 } };

function everything(direction: SiteDefT['direction'] = 'editorial'): Record<string, unknown> {
  return {
    direction,
    site: {
      id: 'test-site', name: 'Test Shop', description: 'A shop used by the tests.', url: 'https://test.example',
      phone: '+919820012345', whatsapp: '+919820012345', email: 'hello@test.example',
      address: { street: '12 Ranade Road', area: 'Dadar West', city: 'Mumbai', state: 'Maharashtra', pincode: '400028' },
      hours: [{ days: 'Mon – Sat', open: '10:00', close: '20:30' }, { days: 'Sun', open: '11:00', close: '14:00' }],
    },
    nav: [{ label: 'Shop', href: '/shop/' }, { label: 'Visit', href: '/#visit' }],
    commerce: { source: { type: 'json', url: '/data/catalog.json' } },
    credits: [{ name: 'Neeta', url: 'https://www.pexels.com/@neeta', source: 'Pexels' }, { name: 'Rajan Gaur', url: 'https://www.pexels.com/@rajan-gaur', source: 'Pexels' }],
    pages: [
      { path: '/', title: 'Test Shop', description: 'Home page.', sections: [
        { type: 'hero', variant: 'split', headline: 'Fresh *every* morning', ctas: [{ label: 'Shop', href: '/shop/' }, { label: 'Call', href: 'tel:+919820012345' }], media: photo, sticker: 'Since 1962' },
        { type: 'hero', variant: 'fullbleed', headline: 'Full', media: { image: { src: '/img/a.jpg', alt: 'A shop front', width: 1600, height: 1000, srcset: '/img/a-800.jpg 800w, /img/a.jpg 1600w' } } },
        { type: 'hero', variant: 'typographic', headline: 'Words' },
        { type: 'hero', variant: 'collage', headline: 'Collage', collage: [photo, photo, photo] },
        { type: 'marquee', items: ['One', 'Two'] },
        { type: 'statement', text: 'We *care*.', meta: ['Est. 1962'] },
        { type: 'products', title: 'Bestsellers', featured: true, link: { label: 'All', href: '/shop/' } },
        { type: 'categories', title: 'Browse', items: [{ name: 'Sweets', href: '/shop/?cat=sweets', media: photo }, { name: 'Namkeen', href: '/shop/?cat=namkeen', media: { object: 'ring', label: 'A gold ring' } }] },
        { type: 'story', title: 'Our story', panels: [{ title: 'One', text: 'First.' }, { title: 'Two', text: 'Second.', media: { video: { src: '/v.webm', poster: '/v.jpg' } } }] },
        { type: 'features', title: 'Why us', items: [{ title: 'A', text: 'a' }, { title: 'B', text: 'b' }] },
        { type: 'gallery', title: 'Gallery', items: [{ media: photo }, { media: photo, ratio: 'square' }, { media: { model: '/m/diya.glb', label: 'A clay lamp' } }] },
        { type: 'menu', title: 'Menu', categories: [{ name: 'Small plates', items: [{ name: 'Paneer tikka', price_paise: 42000, diet: 'veg' }, { name: 'Prawn koliwada', price_paise: 56050, diet: 'nonveg', description: 'Crisp' }] }] },
        { type: 'booking', title: 'Book a table' },
        { type: 'quotes', title: 'Kind words', items: [{ quote: 'Lovely.', name: 'Asha', source: 'Google review' }] },
        { type: 'stats', items: [{ value: '60+', label: 'years' }, { value: '4.8', label: 'rating' }] },
        { type: 'faq', title: 'Questions', items: [{ q: 'Do you deliver?', a: 'Yes, across Mumbai.' }] },
        { type: 'cta', headline: 'Come *hungry*', ctas: [{ label: 'Book', href: '#book' }] },
        { type: 'contact', title: 'Visit us' },
        { type: 'rows', anchor: 'our-story', items: [{ title: 'The *starter*', text: 'Ten years old.', media: photo, link: { label: 'Order', href: '/shop/' } }, { title: 'The bake', text: 'At 5 am.', media: photo }] },
        { type: 'bento', tiles: [{ kind: 'photo', media: photo, size: 'big', caption: 'The counter' }, { kind: 'stat', value: '1962', label: 'Since' }, { kind: 'text', title: 'Pure *ghee*', text: 'Always.' }] },
        { type: 'hero', variant: 'wordmark', headline: 'Chai, *loud*', media: photo, sticker: 'Open late' },
        { type: 'scrolly', title: 'How we *make it*', steps: [{ title: 'Boil', text: 'Water and leaf.', media: photo }, { title: 'Pour', text: 'From a height.', media: photo }] },
        { type: 'index', title: 'The menu', items: [{ title: 'Cutting chai', meta: '₹30', href: '/shop/', media: photo }, { title: 'Bun maska', media: photo }] },
        { type: 'reel', title: 'Our *stalls*', items: [{ media: photo, title: 'Dadar' }, { media: photo, title: 'Bandra', text: 'By the station.' }, { media: photo, title: 'Fort' }] },
        { type: 'photostrip', items: [photo, photo, photo, photo] },
        { type: 'pinned', title: 'Why *us*', text: 'Three reasons.', cta: { label: 'Order', href: '/shop/' }, items: [{ title: 'Fresh', text: 'Every hour.', media: photo }, { title: 'Local', text: 'Assam leaf.' }] },
      ] },
      { path: '/shop/', title: 'Shop', description: 'Everything we make.', sections: [{ type: 'shop', title: 'All sweets' }] },
      { path: '/wishlist/', title: 'Wishlist', description: 'Saved.', sections: [{ type: 'wishlist' }] },
    ],
  };
}

const doc = (s: string) => new DOMParser().parseFromString(s, 'text/html');

describe('renderSite', () => {
  it('covers every section type in every direction', () => {
    const used = new Set((everything().pages as { sections: { type: string }[] }[]).flatMap((p) => p.sections.map((s) => s.type)));
    expect([...used].sort()).toEqual([...SECTION_TYPES].sort());
    for (const d of DIRECTIONS) {
      const out = renderSite(everything(d), V);
      expect(Object.keys(out).sort()).toEqual(['/index.html', '/shop/index.html', '/wishlist/index.html']);
      const home = doc(out['/index.html']);
      expect(home.documentElement.className).toBe(`d-${d}`);
      expect(home.querySelectorAll('h1').length).toBeGreaterThan(0);
      expect(home.querySelector(`link[href="/kits/design/1.0.0/${d}.css"]`)).not.toBeNull();
      expect(home.querySelector('[data-sf-motion-toggle]')).not.toBeNull();
    }
  });

  it('escapes everything the business typed', () => {
    const def = everything();
    (def.site as Record<string, unknown>).name = '<script>alert(1)</script> & "Sons"';
    const out = renderSite(def, V)['/index.html'];
    expect(out).not.toContain('<script>alert(1)</script>');
    expect(out).toContain('&lt;script&gt;alert(1)&lt;/script&gt; &amp; &quot;Sons&quot;');
    // Inside JSON blocks the closing tag cannot break out either.
    for (const m of out.matchAll(/<script type="application\/(?:ld\+)?json"[^>]*>([\s\S]*?)<\/script>/g)) {
      expect(m[1]).not.toMatch(/<\/?script/i);
      expect(() => JSON.parse(m[1])).not.toThrow();
    }
  });

  it('turns unsafe links into harmless ones', () => {
    expect(safeHref('javascript:alert(1)')).toBe('#');
    expect(safeHref('//evil.example')).toBe('#');
    expect(safeHref('data:text/html,x')).toBe('#');
    expect(safeHref('http://plain.example')).toBe('#');
    expect(safeHref('https://ok.example/x')).toBe('https://ok.example/x');
    expect(safeHref('/shop/')).toBe('/shop/');
    const def = everything();
    (def.nav as unknown[]).push({ label: 'Bad', href: 'javascript:alert(1)' });
    expect(renderSite(def, V)['/index.html']).not.toContain('javascript:');
  });

  it('only marks *emphasis*, never other HTML', () => {
    expect(emph('Fresh *every* <b>day</b>').value).toBe('Fresh <em>every</em> &lt;b&gt;day&lt;/b&gt;');
  });

  it('prefixes site paths when previewed under a folder', () => {
    const out = renderSite(everything(), { ...V, base: '/kits/sites/test-site/' })['/index.html'];
    const d = doc(out);
    expect(d.querySelector('.d-logo')!.getAttribute('href')).toBe('/kits/sites/test-site/');
    expect(d.querySelector('.d-nav a')!.getAttribute('href')).toBe('/kits/sites/test-site/shop/');
    expect(out).toContain('src="/kits/sites/test-site/img/a.jpg"');
    expect(out).toContain('/kits/sites/test-site/img/a-800.jpg 800w');
    expect(JSON.parse(d.querySelector('#sf-config')!.textContent!).source.url).toBe('/kits/sites/test-site/data/catalog.json');
    expect(d.querySelector('a[href^="tel:"]')).not.toBeNull();
  });

  it('describes the business for search engines', () => {
    const d = doc(renderSite(everything(), V)['/index.html']);
    const blocks = [...d.querySelectorAll('script[type="application/ld+json"]')].map((s) => JSON.parse(s.textContent!));
    const biz = blocks.find((b) => b['@type'] === 'LocalBusiness');
    expect(biz.address.postalCode).toBe('400028');
    expect(biz.openingHoursSpecification[0].dayOfWeek).toEqual(['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']);
    expect(blocks.some((b) => b['@type'] === 'FAQPage')).toBe(true);
    expect(d.querySelector('link[rel="canonical"]')!.getAttribute('href')).toBe('https://test.example/');
    expect(d.title).toBe('Test Shop');
    expect(doc(renderSite(everything(), V)['/shop/index.html']).title).toBe('Shop – Test Shop');
  });

  it('shows prices in rupees and times in 12-hour format', () => {
    const out = renderSite(everything(), V)['/index.html'];
    expect(out).toContain('₹420');
    expect(out).toContain('₹560.50');
    expect(out).toContain('10 am – 8:30 pm');
  });

  it('animated backgrounds start from the colour of the block they sit in', () => {
    const def = everything('cinematic');
    (def.pages as { sections: unknown[] }[])[0].sections = [{ type: 'cta', headline: 'Lit', ctas: [{ label: 'Go', href: '#' }], tone: 'accent', background: 'particles' }];
    const cta = doc(renderSite(def, V)['/index.html']).querySelector('.d-cta')!;
    expect(cta.getAttribute('data-sf-colors')!.split(',')[0]).toBe(DEFAULTS.cinematic.accent);
  });

  it('only loads the commerce kit when the site sells or takes bookings', () => {
    const def = everything();
    def.commerce = undefined;
    def.pages = [{ path: '/', title: 'Home', description: 'Home.', sections: [{ type: 'statement', text: 'Hello' }] }];
    const out = renderSite(def, V)['/index.html'];
    expect(out).not.toContain('sf-commerce');
    expect(out).not.toContain('data-sf-cart-open');
  });

  it('refuses designs that cannot work, in plain language', () => {
    const noCatalogue = everything();
    noCatalogue.commerce = undefined;
    expect(() => renderSite(noCatalogue, V)).toThrow(/needs a catalogue/);

    const fakeReview = everything();
    (fakeReview.pages as { sections: unknown[] }[])[0].sections = [{ type: 'quotes', title: 'Reviews', items: [{ quote: 'Best shop ever!' }] }];
    expect(() => renderSite(fakeReview, V)).toThrow(DesignError);

    const twoHomes = everything();
    (twoHomes.pages as unknown[]).push({ path: '/', title: 'Again', description: 'x', sections: [{ type: 'statement', text: 'x' }] });
    expect(() => renderSite(twoHomes, V)).toThrow(/Two pages use the address \//);

    const badImage = everything();
    (badImage.pages as { sections: unknown[] }[])[0].sections = [{ type: 'hero', variant: 'split', headline: 'x', media: { image: { src: 'javascript:x', alt: '', width: 1, height: 1 } } }];
    expect(() => renderSite(badImage, V)).toThrow(/Image address/);
  });

  it('uses real photos and drawn line icons only: no artwork, no symbol characters', () => {
    for (const d of DIRECTIONS) {
      for (const html of Object.values(renderSite(everything(d), V))) {
        expect(html).not.toMatch(/[♡♥→↗↓✦✕★]/u);
        expect(html).not.toMatch(/(?![©®™])\p{Extended_Pictographic}/u); // emoji; © ® ™ are ordinary text
      }
    }
    const def = everything();
    (def.pages as { sections: unknown[] }[])[0].sections = [{ type: 'hero', variant: 'split', headline: 'x', media: { art: 'rings' } }];
    expect(() => renderSite(def, V)).toThrow(DesignError);
    // A missing photo leaves a calm block, not a drawing.
    const noPhoto = everything();
    (noPhoto.pages as { sections: unknown[] }[])[0].sections = [{ type: 'hero', variant: 'split', headline: 'x' }];
    const out = renderSite(noPhoto, V)['/index.html'];
    expect(out).toContain('class="d-blank"');
    expect(out).not.toContain('<svg viewBox="0 0 800');
  });

  it('credits the photographers and links anchors from the menu', () => {
    const d = doc(renderSite(everything(), V)['/index.html']);
    const credit = d.querySelector('.d-credits')!;
    expect(credit.textContent!.replace(/\s+/g, ' ')).toBe('Photos by Neeta and Rajan Gaur on Pexels.');
    expect(credit.querySelector('a[href="https://www.pexels.com/@neeta"]')).not.toBeNull();
    expect(d.getElementById('our-story')).not.toBeNull();
    expect(d.querySelectorAll('.d-row')).toHaveLength(2);
    expect(d.querySelector('.d-row--flip')).not.toBeNull();
    expect(d.querySelectorAll('.d-bento .d-tile')).toHaveLength(3);
    expect(d.querySelector('.d-row img')!.getAttribute('srcset')).toContain('400w');
  });

  it('builds the moving sections so they still read without animation', () => {
    const def = everything('poster');
    def.announcement = { text: 'Free delivery across Mumbai over ₹999', href: '/shop/' };
    const d = doc(renderSite(def, V)['/index.html']);
    // Announcement bar sits above the header and links into the site.
    expect(d.querySelector('.d-announce + .d-header')).not.toBeNull();
    expect(d.querySelector('.d-announce a')!.getAttribute('href')).toBe('/shop/');
    // The giant name is decoration: hidden from screen readers, headline stays the h1.
    const wm = d.querySelector('.d-hero--wordmark')!;
    expect(wm.querySelector('.d-wordmark')!.getAttribute('aria-hidden')).toBe('true');
    expect(wm.querySelector('.d-wordmark')!.getAttribute('style')).toBe('--chars:9');
    expect(wm.querySelector('h1')!.textContent).toBe('Chai, loud');
    // A sticker carries its words once as text and once as letters for the turning circle (hidden from screen readers).
    const st = wm.querySelector('.d-sticker')!;
    expect(st.getAttribute('aria-hidden')).toBe('true');
    expect(st.querySelector('.d-sticker-text')!.textContent).toBe('Open late');
    expect([...st.querySelectorAll('.d-ring i')].map((i) => i.textContent).join('')).toBe('Open late · Open late · ');
    // Scrolly: every step names its timeline, the pinned copy is hidden from screen readers,
    // and each step also carries its own photo for phones and animations-off.
    const sc = d.querySelector('.d-scrolly')!;
    expect(sc.querySelector('.d-scrolly-stage')!.getAttribute('aria-hidden')).toBe('true');
    const steps = [...sc.querySelectorAll('.d-scrolly-step')];
    expect(steps.map((s) => s.getAttribute('style'))).toEqual(['view-timeline-name:--sc-s21-0', 'view-timeline-name:--sc-s21-1']);
    expect(steps.every((s) => s.querySelector('.d-scrolly-photo img'))).toBe(true);
    expect(sc.querySelector('.d-scrolly-grid')!.getAttribute('style')).toBe('timeline-scope:--sc-s21-0,--sc-s21-1');
    // Index: linked lines are links, each with its photo.
    expect(d.querySelectorAll('.d-index-item')).toHaveLength(2);
    expect(d.querySelector('a.d-index-row')!.getAttribute('href')).toBe('/shop/');
    expect(d.querySelectorAll('.d-index-thumb img')).toHaveLength(2);
    // Reel: a keyboard-scrollable, named region.
    const reel = d.querySelector('.d-reel-track')!;
    expect(reel.getAttribute('tabindex')).toBe('0');
    expect(reel.getAttribute('aria-label')).toBe('Our stalls');
    expect(reel.querySelectorAll('figure')).toHaveLength(3);
    // Photo strip: one set of photos (no hidden duplicates), timed by its length.
    expect(d.querySelectorAll('.d-strip-item img')).toHaveLength(4);
    expect(d.querySelector('.d-strip-track')!.getAttribute('style')).toBe('--strip-dur:36s');
    // Pinned: heading, text, button and numbered cards.
    const pin = d.querySelector('.d-pinned')!;
    expect(pin.querySelector('h2')!.textContent).toBe('Why us');
    expect(pin.querySelectorAll('.d-pinned-card')).toHaveLength(2);
    expect(pin.querySelector('.d-btn')!.getAttribute('href')).toBe('/shop/');
  });

  it('can write the styles into the page, with font addresses still pointing at the kit', () => {
    const css = "@font-face{src:url(./fonts/a.woff2)}body{color:red}</style><script>";
    const out = renderSite(everything('quiet'), { ...V, styles: { '/kits/design/1.0.0/quiet.css': css } })['/index.html'];
    expect(out).not.toContain('href="/kits/design/1.0.0/quiet.css"');
    expect(out).toContain('url(/kits/design/1.0.0/fonts/a.woff2)');
    expect(out).not.toContain('</style><script>');
    // Stylesheets that were not given stay linked.
    expect(out).toContain('<link rel="stylesheet" href="/kits/motion/1.0.0/sf-motion.css">');
  });

  it('gives any section a backdrop drawn in CSS, and refuses made-up ones', () => {
    const def = everything('editorial');
    (def.pages as { sections: Record<string, unknown>[] }[])[0].sections = [
      { type: 'statement', text: 'Glow', backdrop: 'glow' },
      { type: 'marquee', items: ['A', 'B'], backdrop: 'grid' },
      { type: 'faq', title: 'Q', items: [{ q: 'a', a: 'b' }], backdrop: 'pop' },
      { type: 'cta', headline: 'Go', ctas: [{ label: 'Go', href: '#' }], tone: 'invert', backdrop: 'sky' },
    ];
    def.palette = { bg: '#0f2f25', surface: '#143a2e', ink: '#f3ead9', muted: '#c8bda6', accent: '#d4b26a', accentInk: '#0f2f25' };
    const out = renderSite(def, V)['/index.html'];
    const d = doc(out);
    expect(d.querySelector('.d-statement')!.className).toMatch(/^d-bd d-bd--glow d-section/);
    expect(d.querySelector('.d-marquee')!.classList.contains('d-bd--grid')).toBe(true);
    expect(d.querySelector('#s2')!.classList.contains('d-block--pop')).toBe(true);
    expect(d.querySelector('.d-cta')!.classList.contains('d-bd--sky')).toBe(true);
    // A dark page tints its gradients more gently.
    expect(out).toContain('--bd-mix:18%');
    (def.pages as { sections: Record<string, unknown>[] }[])[0].sections = [{ type: 'statement', text: 'x', backdrop: 'neon' }];
    expect(() => renderSite(def, V)).toThrow(/backdrop/);
  });

  it('refuses custom colours that are hard to read', () => {
    expect(checkPalette('editorial', { ink: '#cccccc' })[0]).toMatch(/Main text on the page background is too faint/);
    expect(checkPalette('editorial', { accent: '#123456' })).toEqual([]);
    const def = everything();
    def.palette = { accent: '#ffe066', accentInk: '#ffffff' };
    expect(() => renderSite(def, V)).toThrow(/Button text on the accent colour/);
  });

  it('every direction is readable out of the box, and the checker knows its real colours', () => {
    for (const d of DIRECTIONS) {
      expect(checkPalette(d, {})).toEqual([]);
      const css = readFileSync(join(__dirname, `../src/themes/${d}.css`), 'utf8');
      const v = (name: string) => css.match(new RegExp(`--c-${name}:\\s*(#[0-9a-f]{6})`, 'i'))![1].toLowerCase();
      const D = DEFAULTS[d];
      expect([D.bg, D.surface, D.ink, D.muted, D.accent, D.accentInk, D.invertBg, D.invertAccent, D.pop, D.popInk]).toEqual(
        [v('bg'), v('surface'), v('ink'), v('muted'), v('accent'), v('accent-ink'), v('invert-bg'), v('invert-accent'), v('pop'), v('pop-ink')]);
    }
  });
});

describe('built-in colours', () => {
  it('every direction keeps text readable in light, dark and coloured sections', () => {
    for (const d of DIRECTIONS) {
      const css = readFileSync(join(__dirname, `../src/themes/${d}.css`), 'utf8');
      const v = (name: string) => css.match(new RegExp(`--c-${name}:\\s*(#[0-9a-f]{6})`, 'i'))![1];
      const pairs: [string, string, number][] = [
        ['ink', 'bg', 4.5], ['muted', 'bg', 4.5], ['accent-ink', 'accent', 4.5], ['accent', 'bg', 3],
        ['invert-ink', 'invert-bg', 4.5], ['invert-muted', 'invert-bg', 4.5], ['invert-accent', 'invert-bg', 3], ['invert-bg', 'invert-accent', 3],
        ['pop-ink', 'pop', 4.5],
      ];
      for (const [fg, bg, min] of pairs) expect(checkContrast(v(fg), v(bg)), `${d}: ${fg} on ${bg}`).toBeGreaterThanOrEqual(min);
    }
  });
});
