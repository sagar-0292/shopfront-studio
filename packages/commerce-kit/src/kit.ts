import type { Config, Product } from './types';
import { sourceFor, type DataSource } from './source';
import { Store } from './store';

export class Kit {
  products: Product[] = [];
  byId = new Map<string, Product>();
  loaded = false;
  error: Error | null = null;
  source: DataSource;
  store: Store;
  private waiting: (() => void)[] = [];
  constructor(public config: Config) {
    this.source = sourceFor(config);
    this.store = new Store(`sf-shop:${config.site.id}`);
  }
  async load() {
    try {
      this.products = await this.source.products();
      this.byId = new Map(this.products.map((p) => [p.id, p]));
    } catch (e) {
      this.error = e as Error;
      console.warn('[sf-commerce] products could not load', e);
    }
    this.loaded = true;
    this.waiting.splice(0).forEach((fn) => fn());
  }
  onLoad(fn: () => void) {
    if (this.loaded) fn();
    else this.waiting.push(fn);
  }
}
