import type { MetadataRoute } from 'next';

// The studio itself stays out of search engines; only the public kit demo and sample websites are crawlable.
export default function robots(): MetadataRoute.Robots {
  return { rules: [{ userAgent: '*', allow: ['/kits/demo/', '/kits/sites/'], disallow: '/' }] };
}
