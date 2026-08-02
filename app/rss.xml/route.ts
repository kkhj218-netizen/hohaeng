import { supabase } from '@/app/lib/supabase';

export const dynamic = 'force-dynamic';

const SITE_URL = 'https://hohaeng.vercel.app';
const FEED_TITLE = '호행처럼 | HOHAENG';
const FEED_DESCRIPTION =
  '조금 더 나은 방향으로 살아가려는 호행처럼의 기록과 정보';

type RssPost = {
  title: string;
  slug: string;
  description: string | null;
  content: string | null;
  category: string | null;
  created_at: string | null;
  published_at: string | null;
  updated_at: string | null;
};

function escapeXml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function stripHtml(value: string) {
  return value
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function getPostDate(post: RssPost) {
  const dateValue =
    post.published_at ||
    post.created_at ||
    post.updated_at;

  if (!dateValue) {
    return new Date().toUTCString();
  }

  const date = new Date(dateValue);

  return Number.isNaN(date.getTime())
    ? new Date().toUTCString()
    : date.toUTCString();
}

function getFeedUpdatedAt(posts: RssPost[]) {
  const firstPost = posts[0];

  if (!firstPost) {
    return new Date().toUTCString();
  }

  const dateValue =
    firstPost.updated_at ||
    firstPost.published_at ||
    firstPost.created_at;

  if (!dateValue) {
    return new Date().toUTCString();
  }

  const date = new Date(dateValue);

  return Number.isNaN(date.getTime())
    ? new Date().toUTCString()
    : date.toUTCString();
}

function getPostDescription(post: RssPost) {
  const description =
    post.description?.trim() ||
    stripHtml(post.content || '').slice(0, 300) ||
    `${post.title}에 대한 호행처럼의 기록입니다.`;

  return description;
}

export async function GET() {
  const { data, error } = await supabase
    .from('posts')
    .select(
      'title, slug, description, content, category, created_at, published_at, updated_at'
    )
    .eq('status', 'published')
    .order('published_at', {
      ascending: false,
    })
    .limit(50);

  if (error) {
    console.error('RSS 글 불러오기 오류:', error);

    return new Response(
      'RSS 피드를 불러오지 못했습니다.',
      {
        status: 500,
        headers: {
          'Content-Type':
            'text/plain; charset=utf-8',
        },
      }
    );
  }

  const posts = (data || []) as RssPost[];

  const items = posts
    .map((post) => {
      const postUrl =
        `${SITE_URL}/blog/${encodeURIComponent(
          post.slug
        )}`;

      const categoryXml = post.category
        ? `<category>${escapeXml(post.category)}</category>`
        : '';

      return `
    <item>
      <title>${escapeXml(post.title)}</title>
      <link>${escapeXml(postUrl)}</link>
      <guid isPermaLink="true">${escapeXml(postUrl)}</guid>
      <description>${escapeXml(
        getPostDescription(post)
      )}</description>
      <pubDate>${getPostDate(post)}</pubDate>
      ${categoryXml}
    </item>`;
    })
    .join('');

  const rssXml = `<?xml version="1.0" encoding="UTF-8"?>
<rss
  version="2.0"
  xmlns:atom="http://www.w3.org/2005/Atom"
>
  <channel>
    <title>${escapeXml(FEED_TITLE)}</title>
    <link>${SITE_URL}</link>
    <description>${escapeXml(FEED_DESCRIPTION)}</description>
    <language>ko-KR</language>
    <lastBuildDate>${getFeedUpdatedAt(posts)}</lastBuildDate>
    <atom:link
      href="${SITE_URL}/rss.xml"
      rel="self"
      type="application/rss+xml"
    />
    ${items}
  </channel>
</rss>`;

  return new Response(rssXml, {
    status: 200,
    headers: {
      'Content-Type':
        'application/rss+xml; charset=utf-8',
      'Cache-Control':
        'public, max-age=0, s-maxage=600, stale-while-revalidate=3600',
    },
  });
}