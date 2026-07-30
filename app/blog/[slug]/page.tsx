import { notFound } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/app/lib/supabase';

export const dynamic = 'force-dynamic';

type Post = {
  id: string;
  title: string;
  slug: string;
  content?: string | null;
  category?: string | null;
  subcategory?: string | null;
  description?: string | null;
  created_at?: string | null;
};

function getPostTimestamp(post: Post) {
  if (post.created_at) {
    const time = new Date(post.created_at).getTime();

    if (!Number.isNaN(time)) return time;
  }

  const timestamp = Number(
    post.slug.split('-').pop()
  );

  return Number.isNaN(timestamp)
    ? 0
    : timestamp;
}

function formatDate(post: Post) {
  const timestamp = getPostTimestamp(post);

  if (!timestamp) return '';

  return new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(timestamp));
}

const categoryNames: Record<string, string> = {
  log: '📝 호행의 일지',
  guide: '💡 각종 정보',
  mindset: '🧠 마인드셋',
  analysis: '📊 종목 및 시황분석',
};

export default async function BlogDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const { data, error } = await supabase
    .from('posts')
    .select('*')
    .eq('slug', slug)
    .maybeSingle();

  if (error) {
    console.error(
      'Supabase 글 상세 불러오기 오류:',
      error
    );

    notFound();
  }

  if (!data) {
    notFound();
  }

  const post = data as Post;

  return (
    <main className="min-h-screen bg-slate-50">

      <article className="max-w-3xl mx-auto px-6 py-10">

        <Link
          href={`/blog?category=${post.category || 'log'}`}
          className="inline-flex items-center text-sm font-semibold text-blue-600 hover:text-blue-500 mb-6"
        >
          ← 목록으로 돌아가기
        </Link>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">

          {/* 글 헤더 */}
          <header className="px-6 sm:px-10 pt-8 pb-6 border-b border-slate-200">

            <div className="flex flex-wrap items-center gap-2 mb-4">

              <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-lg">
                {categoryNames[
                  post.category || ''
                ] ||
                  post.category ||
                  'BLOG'}
              </span>

              {post.subcategory && (
                <span className="text-xs font-bold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-lg">
                  {post.subcategory}
                </span>
              )}

            </div>

            <h1 className="text-3xl sm:text-4xl font-black text-slate-900 leading-tight">
              {post.title}
            </h1>

            <div className="text-sm text-slate-400 mt-4">
              {formatDate(post)}
            </div>

            {post.description && (
              <p className="text-slate-600 mt-5 leading-relaxed">
                {post.description}
              </p>
            )}

          </header>

          {/* Tiptap에서 저장된 HTML 본문 */}
          <div
            className="
              px-6 sm:px-10 py-8
              text-slate-800
              leading-8
              break-words
              [&_p]:mb-5
              [&_h2]:text-2xl
              [&_h2]:font-black
              [&_h2]:text-slate-900
              [&_h2]:mt-10
              [&_h2]:mb-4
              [&_h3]:text-xl
              [&_h3]:font-bold
              [&_h3]:text-slate-900
              [&_h3]:mt-8
              [&_h3]:mb-3
              [&_strong]:font-black
              [&_img]:rounded-2xl
              [&_img]:my-6
              [&_img]:max-w-full
              [&_ul]:list-disc
              [&_ul]:pl-6
              [&_ol]:list-decimal
              [&_ol]:pl-6
              [&_li]:mb-2
              [&_blockquote]:border-l-4
              [&_blockquote]:border-blue-500
              [&_blockquote]:pl-4
              [&_blockquote]:text-slate-600
            "
            dangerouslySetInnerHTML={{
              __html: post.content || '',
            }}
          />

        </div>

      </article>

    </main>
  );
}