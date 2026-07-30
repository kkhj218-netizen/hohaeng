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

export default async function BlogListPage({
  searchParams,
}: {
  searchParams: Promise<{
    cat?: string;
    category?: string;
    sub?: string;
    year?: string;
    q?: string;
  }>;
}) {
  const params = await searchParams;

  // 기존 cat 방식과 Header의 category 방식 둘 다 지원
  const category =
    params.category ||
    params.cat ||
    'log';

  const sub = params.sub || 'all';

  const year = params.year || 'all';

  // 검색어
  const query =
    params.q?.trim() || '';

  const normalizedQuery =
    query.toLowerCase();

  // 검색어를 유지하면서 카테고리 이동
  const makeCategoryHref = (
    targetCategory: string
  ) => {
    const search = new URLSearchParams();

    search.set(
      'category',
      targetCategory
    );

    if (query) {
      search.set('q', query);
    }

    return `/blog?${search.toString()}`;
  };

  // 검색어를 유지하면서 세부 카테고리 이동
  const makeSubHref = (
    targetSub: string
  ) => {
    const search = new URLSearchParams();

    search.set('category', 'log');
    search.set('sub', targetSub);

    if (query) {
      search.set('q', query);
    }

    return `/blog?${search.toString()}`;
  };

  // Supabase posts 테이블에서 글 가져오기
  const { data, error } = await supabase
    .from('posts')
    .select('*');

  if (error) {
    console.error(
      'Supabase 글 불러오기 오류:',
      error
    );

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
        getPostTimestamp(b) -
        getPostTimestamp(a)
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
        const timestamp =
          getPostTimestamp(post);

        if (timestamp) {
          matchYear =
            String(
              new Date(
                timestamp
              ).getFullYear()
            ) === year;
        }
      }

      // 검색
      let matchSearch = true;

      if (normalizedQuery) {
        const searchableText = [
          post.title,
          post.description,
          post.subcategory,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();

        matchSearch =
          searchableText.includes(
            normalizedQuery
          );
      }

      return (
        matchCategory &&
        matchSub &&
        matchYear &&
        matchSearch
      );
    });

  return (
    <main className="min-h-screen bg-slate-50">

      <div className="max-w-4xl mx-auto p-6">

        {/* 상단 제목 */}
        <div className="mb-8">

          <h1 className="text-3xl font-black text-slate-900">
            {categoryNames[category] ||
              '📚 호행의 글'}
          </h1>

          <p className="text-sm text-slate-500 mt-2">
            호행처럼에서 직접 작성한 기록과 정보를 모았습니다.
          </p>

        </div>

        {/* =====================================================
            🔎 검색
        ===================================================== */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 mb-6 shadow-sm">

          <form
            action="/blog"
            method="GET"
            className="flex flex-col sm:flex-row gap-2"
          >

            {/* 현재 카테고리 유지 */}
            <input
              type="hidden"
              name="category"
              value={category}
            />

            {/* 현재 세부 카테고리 유지 */}
            {category === 'log' &&
              sub !== 'all' && (
                <input
                  type="hidden"
                  name="sub"
                  value={sub}
                />
              )}

            {/* 현재 연도 유지 */}
            {year !== 'all' && (
              <input
                type="hidden"
                name="year"
                value={year}
              />
            )}

            <div className="relative flex-1">

              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                🔎
              </span>

              <input
                type="search"
                name="q"
                defaultValue={query}
                placeholder="글 제목, 설명, 주제를 검색하세요"
                className="w-full border border-slate-200 rounded-xl pl-11 pr-4 py-3 text-slate-900 bg-slate-50 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />

            </div>

            <button
              type="submit"
              className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl transition-colors"
            >
              검색
            </button>

          </form>

          {/* 검색 중일 때 */}
          {query && (
            <div className="flex flex-wrap items-center justify-between gap-3 mt-4 pt-4 border-t border-slate-100">

              <p className="text-sm text-slate-600">

                <span className="font-black text-slate-900">
                  &quot;{query}&quot;
                </span>

                {' '}검색 결과{' '}

                <span className="font-black text-blue-600">
                  {posts.length}개
                </span>

              </p>

              <Link
                href={`/blog?category=${category}`}
                className="text-sm font-bold text-slate-500 hover:text-red-500"
              >
                ✕ 검색 초기화
              </Link>

            </div>
          )}

        </div>

        {/* =====================================================
            카테고리 메뉴
        ===================================================== */}
        <div className="flex flex-wrap gap-2 mb-6">

          <Link
            href={makeCategoryHref('log')}
            className={`px-4 py-2 rounded-xl text-sm font-bold ${
              category === 'log'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-slate-600 border border-slate-200'
            }`}
          >
            📝 일지
          </Link>

          <Link
            href={makeCategoryHref(
              'mindset'
            )}
            className={`px-4 py-2 rounded-xl text-sm font-bold ${
              category === 'mindset'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-slate-600 border border-slate-200'
            }`}
          >
            🧠 마인드셋
          </Link>

          <Link
            href={makeCategoryHref(
              'guide'
            )}
            className={`px-4 py-2 rounded-xl text-sm font-bold ${
              category === 'guide'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-slate-600 border border-slate-200'
            }