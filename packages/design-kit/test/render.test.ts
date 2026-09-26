import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { renderSite, DesignError, DIRECTIONS, SECTION_TYPES, DEFAULTS, checkPalette, contrast as checkContrast, safeHref, emph, type SiteDefT } from '../src';

const V = { versions: { motion: '1.0.0', commerce: '1.1.0', design: '1.0.0' } };
const art = { art: 'x' };

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
    pages: [
      { path: '/', title: 'Test Shop', description: 'Home page.', sections: [
        { type: 'hero', variant: 'split', headline: 'Fresh *every* morning', ctas: [{ label: 'Shop', href: '/shop/' }, { label: 'Call', href: 'tel:+919820012345' }], media: art, sticker: 'Since 1962' },
        { type: 'hero', variant: 'fullbleed', headline: 'Full', media: { image: { src: '/img/a.jpg', alt: 'A shop front', width: 1600, height: 1000, srcset: '/img/a-800.jpg 800w, /img/a.jpg 1600w' } } },
        { type: 'hero', variant: 'typographic', headline: 'Words' },
        { type: 'hero', variant: 'collage', headline: 'Collage', collage: [art, art, art] },
        { type: 'marquee', items: ['One', 'Two'] },
        { type: 'statement', text: 'We *care*.', meta: ['Est. 1962'] },
        { type: 'products', title: 'Bestsellers', featured: true, link: { label: 'All', href: '/shop/' } },
        { type: 'categories', title: 'Browse', items: [{ name: 'Sweets', href: '/shop/?cat=sweets', media: art }, { name: 'Namkeen', href: '/shop/?cat=namkeen', media: { object: 'ring', label: 'A gold ring' } }] },
        { type: 'story', title: 'Our story', panels: [{ title: 'One', text: 'First.' }, { title: 'Two', text: 'Second.', media: { video: { src: '/v.webm', poster: '/v.jpg' } } }] },
        { type: 'features', title: 'Why us', items: [{ title: 'A', text: 'a' }, { title: 'B', text: 'b' }] },
        { type: 'gallery', title: 'Gallery', items: [{ media: art }, { media: art, ratio: 'square' }, { media: { model: '/m/diya.glb', label: 'A clay lamp' } }] },
        { type: 'menu', title: 'Menu', categories: [{ name: 'Small plates', items: [{ name: 'Paneer tikka', price_paise: 42000, diet: 'veg' }, { name: 'Prawn koliwada', price_paise: 56050, diet: 'nonveg', description: 'Crisp' }] }] },
        { type: 'booking', title: 'Book a table' },
        { type: 'quotes', title: 'Kind words', items: [{ quote: 'Lovely.', name: 'Asha', source: 'Google review' }] },
        { type: 'stats', items: [{ value: '60+', label: 'years' }, { value: '4.8', label: 'rating' }] },
        { type: 'faq', title: 'Questions', items: [{ q: 'Do you deliver?', a: 'Yes, across Mumbai.' }] },
        { type: 'cta', headline: 'Come *hungry*', ctas: [{ label: 'Book', href: '#book' }] },
        { type: 'contact', title: 'Visit us' },
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
