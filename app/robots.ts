import type { MetadataRoute } from 'next';

import { SITE_URL, absoluteUrl } from '@/app/lib/site';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: ['/', '/blog', '/blog/', '/money', '/money/'],
      disallow: ['/admin', '/api/'],
    },
    sitemap: absoluteUrl('/sitemap.xml'),
    host: SITE_URL,
  };
}
