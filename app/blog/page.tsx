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

  const timestamp = Number(post.slug.split('-').pop());

  return Number.isNaN(timestamp) ? 0 : timestamp;
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

export default async function BlogListPage({
  searchParams,
}: {
  searchParams: Promise<{
    cat?: string;
    category?: string;
    sub?: string;
    year?: string;
  }>;
}) {
  const params = await searchParams;

  // 기존 cat 방식과 Header의 category 방식 둘 다 지원
  const category =
    params.category || params.cat || 'log';

  const sub = params.sub || 'all';
  const year = params.year || 'all';

  // Supabase posts 테이블에서 글 가져오기
  const { data, error } = await supabase
    .from('posts')
    .select('*');

  if (error) {
    console.error('Supabase 글 불러오기 오류:', error);

    return (
      <main className="min-h-screen bg-slate-50">
        <div className="max-w-4xl mx-auto p-6">
          <h1 className="text-3xl font-bold text-slate-900 mb-6">
            글을 불러올 수 없습니다.
          </h1>

          <p className="text-red-500">
            Supabase 연결을 확인해주세요.
          </p>
        </div>
      </main>
    );
  }

  const posts = ((data || []) as Post[])
    .sort(
      (a, b) =>
        getPostTimestamp(b) - getPostTimestamp(a)
    )
    .filter((post) => {
      // 카테고리
      const matchCategory =
        category === 'all' ||
        post.category === category;

      // 세부 카테고리
      const matchSub =
        sub === 'all' ||
        post.subcategory === sub;

      // 연도
      let matchYear = true;

      if (year !== 'all') {
        const timestamp = getPostTimestamp(post);

        if (timestamp) {
          matchYear =
            String(new Date(timestamp).getFullYear()) ===
            year;
        }
      }

      return matchCategory && matchSub && matchYear;
    });

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="max-w-4xl mx-auto p-6">

        <div className="mb-8">
          <h1 className="text-3xl font-black text-slate-900">
            {categoryNames[category] || '📚 호행의 글'}
          </h1>

          <p className="text-sm text-slate-500 mt-2">
            호행처럼에서 직접 작성한 기록과 정보를 모았습니다.
          </p>
        </div>

        {/* 카테고리 메뉴 */}
        <div className="flex flex-wrap gap-2 mb-6">
          <Link
            href="/blog?category=log"
            className={`px-4 py-2 rounded-xl text-sm font-bold ${
              category === 'log'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-slate-600 border border-slate-200'
            }`}
          >
            📝 일지
          </Link>

          <Link
            href="/blog?category=mindset"
            className={`px-4 py-2 rounded-xl text-sm font-bold ${
              category === 'mindset'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-slate-600 border border-slate-200'
            }`}
          >
            🧠 마인드셋
          </Link>

          <Link
            href="/blog?category=guide"
            className={`px-4 py-2 rounded-xl text-sm font-bold ${
              category === 'guide'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-slate-600 border border-slate-200'
            }`}
          >
            💡 각종 정보
          </Link>

          <Link
            href="/blog?category=analysis"
            className={`px-4 py-2 rounded-xl text-sm font-bold ${
              category === 'analysis'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-slate-600 border border-slate-200'
            }`}
          >
            📊 시황분석
          </Link>
        </div>

        {/* 일지일 때 세부 카테고리 */}
        {category === 'log' && (
          <div className="bg-white p-4 rounded-xl border border-slate-200 mb-8">
            <div className="flex flex-wrap gap-2">

              <Link
                href="/blog?category=log&sub=all"
                className={`px-3 py-1.5 rounded-lg text-sm font-medium ${
                  sub === 'all'
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 text-slate-600'
                }`}
              >
                전체 보기
              </Link>

              <Link
                href="/blog?category=log&sub=invest"
                className={`px-3 py-1.5 rounded-lg text-sm font-medium ${
                  sub === 'invest'
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 text-slate-600'
                }`}
              >
                📈 투자일지
              </Link>

              <Link
                href="/blog?category=log&sub=dividend"
                className={`px-3 py-1.5 rounded-lg text-sm font-medium ${
                  sub === 'dividend'
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 text-slate-600'
                }`}
              >
                💰 배당일지
              </Link>

              <Link
                href="/blog?category=log&sub=routine"
                className={`px-3 py-1.5 rounded-lg text-sm font-medium ${
                  sub === 'routine'
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 text-slate-600'
                }`}
              >
                🏃 일상/루틴
              </Link>

            </div>
          </div>
        )}

        {/* 글 목록 */}
        <div className="grid gap-4">

          {posts.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-2xl p-10 text-center">
              <p className="text-slate-500">
                아직 등록된 글이 없습니다.
              </p>
            </div>
          ) : (
            posts.map((post) => (
              <Link
                key={post.id}
                href={`/blog/${post.slug}`}
                className="block p-5 rounded-2xl border border-slate-200 hover:border-blue-500 hover:shadow-lg transition-all bg-white"
              >
                <div className="flex items-center justify-between mb-3">

                  <span className="text-xs font-bold text-blue-600 uppercase bg-blue-50 px-2.5 py-1 rounded-lg">
                    {post.subcategory ||
                      categoryNames[
                        post.category || ''
                      ] ||
                      post.category}
                  </span>

                  <span className="text-xs text-slate-400">
                    {formatDate(post)}
                  </span>

                </div>

                <h2 className="text-xl font-bold text-slate-900 mb-2">
                  {post.title}
                </h2>

                {post.description && (
                  <p className="text-sm text-slate-600 line-clamp-2">
                    {post.description}
                  </p>
                )}

              </Link>
            ))
          )}

        </div>

      </div>
    </main>
  );
}