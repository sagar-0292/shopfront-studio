import type { Product } from '../src/types';
export const products: Product[] = [
  { id: 'p1', slug: 'kaju-katli', name: 'Kaju Katli 500g', price_paise: 49900, mrp_paise: 59900, category: { slug: 'sweets', name: 'Sweets' }, seller: { slug: 'joshi', name: 'Joshi Sweets' }, stock: 20, featured: true, created_at: '2026-09-01' },
  { id: 'p2', slug: 'bhujia', name: 'Bikaneri Bhujia', description: 'Crispy namkeen', price_paise: 12000, category: { slug: 'namkeen', name: 'Namkeen' }, seller: { slug: 'rival', name: 'Rival Namkeen' }, stock: 3, created_at: '2026-09-10' },
  { id: 'p3', slug: 'hamper', name: 'Diwali Hamper', price_paise: 12500000, mrp_paise: 15000000, category: { slug: 'gifts', name: 'Gifts' }, seller: { slug: 'joshi', name: 'Joshi Sweets' }, stock: 0, created_at: '2026-09-05' },
  { id: 'p4', slug: 'ladoo', name: 'Motichoor Ladoo', price_paise: 30000, category: { slug: 'sweets', name: 'Sweets' }, variants: [{ id: 'v1', label: '250g', price_paise: 18000, stock: 0 }, { id: 'v2', label: '500g', price_paise: 30000, stock: 10 }], created_at: '2026-09-12' },
];
