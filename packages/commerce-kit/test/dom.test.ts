import { beforeEach, describe, expect, it } from 'vitest';
import { fillCard } from '../src/template';
import { Store } from '../src/store';
import { products } from './fixtures';

const tpl = () => {
  const t = document.createElement('template');
  t.innerHTML = `<article><img data-slot="image"><h3 data-slot="name"></h3><p data-slot="description"></p>
    <b data-slot="price"></b><s data-slot="mrp"></s><i data-slot="discount"></i><span data-slot="seller"></span>
    <span data-slot="stock"></span><div data-slot="badges"></div><select data-slot="variant"></select>
    <button data-slot="add">Add</button><button data-slot="wishlist"></button></article>`;
  return t;
};

describe('card templates', () => {
  it('fills every slot and hides empty ones', () => {
    const card = fillCard(tpl(), { ...products[0], image: { src: '/k.avif', alt: 'Kaju katli on a plate' }, badges: ['Bestseller'] }, { wished: true });
    expect(card.dataset.productId).toBe('p1');
    expect(card.querySelector('[data-slot="name"]')!.textContent).toBe('Kaju Katli 500g');
    expect(card.querySelector('[data-slot="price"]')!.textContent).toBe('₹499');
    expect(card.querySelector('[data-slot="mrp"]')!.textContent).toBe('₹599');
    expect(card.querySelector('[data-slot="discount"]')!.textContent).toBe('17% off');
    expect(card.querySelector<HTMLElement>('[data-slot="description"]')!.hidden).toBe(true);
    expect(card.querySelector('img')!.getAttribute('loading')).toBe('lazy');
    expect(card.querySelector('img')!.alt).toBe('Kaju katli on a plate');
    expect(card.querySelector('[data-slot="badges"]')!.textContent).toBe('Bestseller');
    expect(card.querySelector('[data-slot="wishlist"]')!.getAttribute('aria-pressed')).toBe('true');
    expect(card.querySelector('[data-slot="variant"]')).toBeNull();
  });
  it('disables sold-out products', () => {
    const card = fillCard(tpl(), products[2], { wished: false });
    const add = card.querySelector('button[data-slot="add"]') as HTMLButtonElement;
    expect(add.disabled).toBe(true);
    expect(add.textContent).toBe('Sold out');
    expect(card.classList.contains('sf-soldout')).toBe(true);
  });
  it('offers variants, skipping sold-out ones, with a "From" price', () => {
    const card = fillCard(tpl(), products[3], { wished: false });
    const sel = card.querySelector('select')!;
    expect(Array.from(sel.options).map((o) => [o.text, o.disabled])).toEqual([['250g – ₹180 (sold out)', true], ['500g – ₹300', false]]);
    expect(sel.value).toBe('v2');
    expect(card.querySelector('[data-slot="price"]')!.textContent).toBe('From ₹180');
  });
  it('never treats product text as HTML', () => {
    const card = fillCard(tpl(), { ...products[1], name: '<img src=x onerror=alert(1)>' }, { wished: false });
    expect(card.querySelector('[data-slot="name"]')!.innerHTML).toBe('&lt;img src=x onerror=alert(1)&gt;');
  });
});

describe('cart memory', () => {
  beforeEach(() => localStorage.clear());
  it('remembers the cart per shop and respects stock', () => {
    const s = new Store('sf-shop:a');
    s.add('p1', undefined, 1, 2);
    s.add('p1', undefined, 5, 2);
    s.add('p2');
    expect(s.state.cart).toEqual([{ productId: 'p1', variantId: undefined, qty: 2 }, { productId: 'p2', variantId: undefined, qty: 1 }]);
    expect(new Store('sf-shop:a').state.cart).toHaveLength(2);
    expect(new Store('sf-shop:b').state.cart).toHaveLength(0);
    s.setQty('p2', undefined, 0);
    expect(s.state.cart.map((l) => l.productId)).toEqual(['p1']);
  });
  it('ignores tampered or broken saved data', () => {
    localStorage.setItem('sf-shop:x', JSON.stringify({ cart: [{ productId: 'p1', qty: -5 }, { productId: 3, qty: 1 }, { productId: 'ok', qty: 2 }] }));
    expect(new Store('sf-shop:x').state.cart).toEqual([{ productId: 'ok', qty: 2 }]);
    localStorage.setItem('sf-shop:y', '{not json');
    expect(new Store('sf-shop:y').state.cart).toEqual([]);
  });
  it('toggles the wishlist', () => {
    const s = new Store('sf-shop:w');
    expect(s.toggleWish('p1')).toBe(true);
    expect(s.toggleWish('p1')).toBe(false);
  });
});
