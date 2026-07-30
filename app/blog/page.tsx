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

type Category = {
  id: number;
  slug: string;
  name: string;
  emoji: string | null;
  sort_order: number;
  is_active: boolean;
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
  const timestamp =
    getPostTimestamp(post);

  if (!timestamp) {
    return '';
  }

  return new Intl.DateTimeFormat(
    'ko-KR',
    {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }
  ).format(
    new Date(timestamp)
  );
}

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
  const params =
    await searchParams;

  const requestedCategory =
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

  // 카테고리 + 글 동시에 불러오기
  const [
    categoryResult,
    postResult,
  ] = await Promise.all([
    supabase
      .from('categories')
      .select(
        'id, slug, name, emoji, sort_order, is_active'
      )
      .eq('is_active', true)
      .order('sort_order', {
        ascending: true,
      }),

    supabase
      .from('posts')
      .select('*'),
  ]);

  const {
    data: categoryData,
    error: categoryError,
  } = categoryResult;

  const {
    data: postData,
    error: postError,
  } = postResult;

  if (categoryError) {
    console.error(
      '카테고리 불러오기 오류:',
      categoryError
    );
  }

  if (postError) {
    console.error(
      'Supabase 글 불러오기 오류:',
      postError
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

  const categories =
    (categoryData || []) as Category[];

  // 요청한 카테고리가 실제 활성 카테고리에 있는지 확인
  const requestedExists =
    categories.some(
      (item) =>
        item.slug ===
        requestedCategory
    );

  // 없는 카테고리면 log 또는 첫 번째 카테고리 사용
  const category =
    requestedExists
      ? requestedCategory
      : categories.find(
          (item) =>
            item.slug === 'log'
        )?.slug ||
        categories[0]?.slug ||
        'log';

  const currentCategory =
    categories.find(
      (item) =>
        item.slug === category
    );

  // slug → 표시 이름
  const categoryLabelMap =
    Object.fromEntries(
      categories.map(
        (item) => [
          item.slug,
          `${item.emoji || '📁'} ${item.name}`,
        ]
      )
    );

  // 카테고리 이동 URL
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
      search.set(
        'q',
        query
      );
    }

    return `/blog?${search.toString()}`;
  };

  // 세부 주제 이동 URL
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
      search.set(
        'q',
        query
      );
    }

    return `/blog?${search.toString()}`;
  };

  const posts =
    ((postData || []) as Post[])
      .sort(
        (a, b) =>
          getPostTimestamp(b) -
          getPostTimestamp(a)
      )
      .filter((post) => {

        // 카테고리
        const matchCategory =
          post.category ===
          category;

        // 세부 주제
        const matchSub =
          sub === 'all' ||
          post.subcategory ===
            sub;

        // 연도
        let matchYear = true;

        if (
          year !== 'all'
        ) {
          const timestamp =
            getPostTimestamp(
              post
            );

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

        if (
          normalizedQuery
        ) {
          const searchableText =
            [
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
            {currentCategory
              ? `${
                  currentCategory.emoji ||
                  '📁'
                } ${
                  currentCategory.name
                }`
              : '📚 호행의 글'}
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
              value={
                category
              }
            />

            {category ===
              'log' &&
              sub !== 'all' && (
                <input
                  type="hidden"
                  name="sub"
                  value={sub}
                />
              )}

            {year !==
              'all' && (
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
                defaultValue={
                  query
                }
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
                  &quot;
                  {query}
                  &quot;
                </span>{' '}

                검색 결과{' '}

                <span className="font-black text-blue-600">
                  {
                    posts.length
                  }
                  개
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

        {/* =================================================
            DB 카테고리 자동 메뉴
        ================================================= */}
        <div className="flex flex-wrap gap-2 mb-6">

          {categories.map(
            (item) => (
              <Link
                key={item.id}
                href={makeCategoryHref(
                  item.slug
                )}
                className={`px-4 py-2 rounded-xl text-sm font-bold ${
                  category ===
                  item.slug
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-slate-600 border border-slate-200'
                }`}
              >
                {item.emoji ||
                  '📁'}{' '}
                {item.name}
              </Link>
            )
          )}

        </div>

        {/* 일지일 때 세부 주제 */}
        {category ===
          'log' && (
          <div className="bg-white p-4 rounded-xl border border-slate-200 mb-8">

            <div className="flex flex-wrap gap-2">

              <Link
                href={makeSubHref(
                  'all'
                )}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium ${
                  sub ===
                  'all'
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 text-slate-600'
                }`}
              >
                전체 보기
              </Link>

              <Link
                href={makeSubHref(
                  'invest'
                )}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium ${
                  sub ===
                  'invest'
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 text-slate-600'
                }`}
              >
                📈 투자일지
              </Link>

              <Link
                href={makeSubHref(
                  'dividend'
                )}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium ${
                  sub ===
                  'dividend'
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 text-slate-600'
                }`}
              >
                💰 배당일지
              </Link>

              <Link
                href={makeSubHref(
                  'routine'
                )}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium ${
                  sub ===
                  'routine'
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

          {posts.length ===
          0 ? (

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

            posts.map(
              (post) => (

                <Link
                  key={
                    post.id
                  }
                  href={`/blog/${post.slug}`}
                  className="block p-5 rounded-2xl border border-slate-200 hover:border-blue-500 hover:shadow-lg transition-all bg-white"
                >

                  <div className="flex items-center justify-between gap-3 mb-3">

                    <span className="text-xs font-bold text-blue-600 uppercase bg-blue-50 px-2.5 py-1 rounded-lg">

                      {post.subcategory ||
                        categoryLabelMap[
                          post.category ||
                            ''
                        ] ||
                        post.category ||
                        'BLOG'}

                    </span>

                    <span className="text-xs text-slate-400">
                      {formatDate(
                        post
                      )}
                    </span>

                  </div>

                  <h2 className="text-xl font-bold text-slate-900 mb-2">
                    {
                      post.title
                    }
                  </h2>

                  {post.description && (
                    <p className="text-sm text-slate-600 line-clamp-2">
                      {
                        post.description
                      }
                    </p>
                  )}

                </Link>
              )
            )

          )}

        </div>

      </div>

    </main>
  );
}