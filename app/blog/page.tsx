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

    if (!Number.isNaN(time)) {
      return time;
    }
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

  if (!timestamp) {
    return '';
  }

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

  const category =
    params.category ||
    params.cat ||
    'log';

  const sub =
    params.sub || 'all';

  const year =
    params.year || 'all';

  const query =
    params.q?.trim() || '';

  const normalizedQuery =
    query.toLowerCase();

  // 카테고리를 이동해도 검색어 유지
  const makeCategoryHref = (
    targetCategory: string
  ) => {
    const search =
      new URLSearchParams();

    search.set(
      'category',
      targetCategory
    );

    if (query) {
      search.set('q', query);
    }

    return `/blog?${search.toString()}`;
  };

  // 세부 주제를 이동해도 검색어 유지
  const makeSubHref = (
    targetSub: string
  ) => {
    const search =
      new URLSearchParams();

    search.set(
      'category',
      'log'
    );

    search.set(
      'sub',
      targetSub
    );

    if (query) {
      search.set('q', query);
    }

    return `/blog?${search.toString()}`;
  };

  // Supabase 글 불러오기
  const { data, error } =
    await supabase
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

  const posts =
    ((data || []) as Post[])
      .sort(
        (a, b) =>
          getPostTimestamp(b) -
          getPostTimestamp(a)
      )
      .filter((post) => {
        // 카테고리 필터
        const matchCategory =
          category === 'all' ||
          post.category === category;

        // 세부 주제 필터
        const matchSub =
          sub === 'all' ||
          post.subcategory === sub;

        // 연도 필터
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

        // 검색 필터
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

        {/* 제목 */}
        <div className="mb-8">
          <h1 className="text-3xl font-black text-slate-900">
            {categoryNames[category] ||
              '📚 호행의 글'}
          </h1>

          <p className="text-sm text-slate-500 mt-2">
            호행처럼에서 직접 작성한 기록과 정보를 모았습니다.
          </p>
        </div>

        {/* 검색창 */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 mb-6 shadow-sm">
          <form
            action="/blog"
            method="GET"
            className="flex flex-col sm:flex-row gap-2"
          >
            <input
              type="hidden"
              name="category"
              value={category}
            />

            {category === 'log' &&
              sub !== 'all' && (
                <input
                  type="hidden"
                  name="sub"
                  value={sub}
                />
              )}

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

          {query && (
            <div className="flex flex-wrap items-center justify-between gap-3 mt-4 pt-4 border-t border-slate-100">
              <p className="text-sm text-slate-600">
                <span className="font-black text-slate-900">
                  &quot;{query}&quot;
                </span>{' '}
                검색 결과{' '}
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

        {/* 카테고리 */}
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
            href={makeCategoryHref('mindset')}
            className={`px-4 py-2 rounded-xl text-sm font-bold ${
              category === 'mindset'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-slate-600 border border-slate-200'
            }`}
          >
            🧠 마인드셋
          </Link>

          <Link
            href={makeCategoryHref('guide')}
            className={`px-4 py-2 rounded-xl text-sm font-bold ${
              category === 'guide'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-slate-600 border border-slate-200'
            }`}
          >
            💡 각종 정보
          </Link>

          <Link
            href={makeCategoryHref('analysis')}
            className={`px-4 py-2 rounded-xl text-sm font-bold ${
              category === 'analysis'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-slate-600 border border-slate-200'
            }`}
          >
            📊 시황분석
          </Link>

        </div>

        {/* 일지 세부 주제 */}
        {category === 'log' && (
          <div className="bg-white p-4 rounded-xl border border-slate-200 mb-8">
            <div className="flex flex-wrap gap-2">

              <Link
                href={makeSubHref('all')}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium ${
                  sub === 'all'
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 text-slate-600'
                }`}
              >
                전체 보기
              </Link>

              <Link
                href={makeSubHref('invest')}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium ${
                  sub === 'invest'
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 text-slate-600'
                }`}
              >
                📈 투자일지
              </Link>

              <Link
                href={makeSubHref('dividend')}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium ${
                  sub === 'dividend'
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 text-slate-600'
                }`}
              >
                💰 배당일지
              </Link>

              <Link
                href={makeSubHref('routine')}
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

              <div className="text-4xl mb-4">
                🔎
              </div>

              <p className="text-slate-900 font-bold">
                {query
                  ? '검색 결과가 없습니다.'
                  : '아직 등록된 글이 없습니다.'}
              </p>

              {query && (
                <p className="text-sm text-slate-500 mt-2">
                  다른 검색어로 다시 검색해보세요.
                </p>
              )}

            </div>
          ) : (
            posts.map((post) => (
              <Link
                key={post.id}
                href={`/blog/${post.slug}`}
                className="block p-5 rounded-2xl border border-slate-200 hover:border-blue-500 hover:shadow-lg transition-all bg-white"
              >
                <div className="flex items-center justify-between gap-3 mb-3">

                  <span className="text-xs font-bold text-blue-600 uppercase bg-blue-50 px-2.5 py-1 rounded-lg">
                    {post.subcategory ||
                      categoryNames[
                        post.category || ''
                      ] ||
                      post.category ||
                      'BLOG'}
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