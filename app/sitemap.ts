import type { MetadataRoute } from 'next';

import { SITE_URL, absoluteUrl } from '@/app/lib/site';
import { supabase } from '@/app/lib/supabase';
import { TOOLS } from '@/app/tools';

export const dynamic = 'force-dynamic';

const STATIC_LAST_MODIFIED = '2026-08-13T00:00:00+09:00';

type SitemapPost = {
  slug: string | null;
  created_at: string | null;
  published_at: string | null;
  updated_at: string | null;
};

function getValidDate(...values: Array<string | null | undefined>) {
  for (const value of values) {
    if (!value) continue;

    const date = new Date(value);
    if (!Number.isNaN(date.getTime())) return date;
  }

  return undefined;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const { data: posts, error } = await supabase
    .from('posts')
    .select('slug, created_at, published_at, updated_at')
    .eq('status', 'published')
    .order('published_at', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Sitemap 글 불러오기 오류:', error);
  }

  const publicPaths = Array.from(
    new Set([
      '/',
      '/blog',
      '/money',
      '/projects/trading',
      '/projects/site-growth',
      ...TOOLS.map((tool) => tool.href),
    ])
  );

  const staticPages: MetadataRoute.Sitemap = publicPaths.map((path) => ({
    url: path === '/' ? `${SITE_URL}/` : absoluteUrl(path),
    lastModified: STATIC_LAST_MODIFIED,
    changeFrequency:
      path === '/blog' ? 'daily' : path === '/' || path === '/money' ? 'weekly' : 'monthly',
    priority:
      path === '/' ? 1 : path === '/blog' || path === '/money' ? 0.9 : 0.8,
  }));

  const seenPostUrls = new Set<string>();
  const postPages: MetadataRoute.Sitemap = [];

  for (const post of (posts || []) as SitemapPost[]) {
    const slug = post.slug?.trim();
    if (!slug) continue;

    const url = absoluteUrl(`/blog/${encodeURIComponent(slug)}`);
    if (seenPostUrls.has(url)) continue;

    seenPostUrls.add(url);
    postPages.push({
      url,
      lastModified: getValidDate(post.updated_at, post.published_at, post.created_at),
      changeFrequency: 'monthly',
      priority: 0.8,
    });
  }

  return [...staticPages, ...postPages];
}
