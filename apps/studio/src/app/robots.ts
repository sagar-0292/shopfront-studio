import type { MetadataRoute } from 'next';

// The studio itself stays out of search engines; only the public kit demo is crawlable.
export default function robots(): MetadataRoute.Robots {
  return { rules: [{ userAgent: '*', allow: '/kits/demo/', disallow: '/' }] };
}
