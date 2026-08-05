import type { MetadataRoute } from 'next';
import { supabase } from '@/app/lib/supabase';

export const dynamic = 'force-dynamic';

const BASE_URL = 'https://hohaeng.vercel.app';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const { data: posts, error } = await supabase
    .from('posts')
    .select('slug, created_at')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Sitemap 글 불러오기 오류:', error);
  }

  const staticPages: MetadataRoute.Sitemap = [
    {
      url: BASE_URL,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 1,
    },
    {
      url: `${BASE_URL}/blog`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.9,
    },
    {
      url: `${BASE_URL}/projects/trading`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    {
      url: `${BASE_URL}/projects/site-growth`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.8,
    },
  ];

  const postPages: MetadataRoute.Sitemap =
    posts?.map((post) => ({
      url: `${BASE_URL}/blog/${post.slug}`,
      lastModified: post.created_at
        ? new Date(post.created_at)
        : new Date(),
      changeFrequency: 'monthly',
      priority: 0.8,
    })) || [];

  return [...staticPages, ...postPages];
}