import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  poweredByHeader: false,
  serverExternalPackages: ['pg'],
  // Published kit files are read from disk by the /kits route and by the website builder.
  outputFileTracingIncludes: {
    '/kits/[...path]': ['./kits/**/*'],
    '/studio/projects/[id]/website': ['./kits/**/*'],
    '/studio/projects/[id]/website/preview/[[...path]]': ['./kits/**/*'],
    '/studio/projects/[id]/website/download': ['./kits/**/*'],
  },
  // One uploaded file per request (photos are resized in the browser first). Vercel allows 4.5 MB.
  experimental: { serverActions: { bodySizeLimit: '4.5mb' } },
  async headers() {
    return [
      {
        // Website previews are shown inside the studio, so they may be framed by it (same site only).
        source: '/((?!kits/|studio/projects/[^/]+/website/preview).*)',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
          { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains' },
        ],
      },
      {
        source: '/studio/projects/:id/website/preview/:path*',
        headers: [
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Robots-Tag', value: 'noindex' },
        ],
      },
    ];
  },
};

export default nextConfig;
