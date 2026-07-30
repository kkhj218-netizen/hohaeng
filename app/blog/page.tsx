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

  // 대표 이미지
  og_image?: string | null;

  // 조회수
  view_count?: number | null;
};

type Category = {
  id: number;
  slug: string;
  name: string;
  emoji: string | null;
  sort_order: number;
  is_active: boolean;
};

function getPostTimestamp(
  post: Post
) {
  if (post.created_at) {
    const time =
      new Date(
        post.created_at
      ).getTime();

    if (
      !Number.isNaN(time)
    ) {
      return time;
    }
  }

  const timestamp =
    Number(
      post.slug
        .split('-')
        .pop()
    );

  return Number.isNaN(
    timestamp
  )
    ? 0
    : timestamp;
}

function formatDate(
  post: Post
) {
  const timestamp =
    getPostTimestamp(
      post
    );

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
    params.sub ||
    'all';

  const year =
    params.year ||
    'all';

  const query =
    params.q?.trim() ||
    '';

  const normalizedQuery =
    query.toLowerCase();

  // =========================================================
  // 카테고리 + 글 동시에 불러오기
  // =========================================================

  const [
    categoryResult,
    postResult,
  ] =
    await Promise.all([
      supabase
        .from(
          'categories'
        )
        .select(
          'id, slug, name, emoji, sort_order, is_active'
        )
        .eq(
          'is_active',
          true
        )
        .order(
          'sort_order',
          {
            ascending:
              true,
          }
        ),

      supabase
        .from('posts')
        .select(
          'id, title, slug, content, category, subcategory, description, created_at, og_image, view_count'
        ),
    ]);

  const {
    data:
      categoryData,
    error:
      categoryError,
  } =
    categoryResult;

  const {
    data:
      postData,
    error:
      postError,
  } =
    postResult;

  if (
    categoryError
  ) {
    console.error(
      '카테고리 불러오기 오류:',
      categoryError
    );
  }

  if (
    postError
  ) {
    console.error(
      'Supabase 글 불러오기 오류:',
      postError
    );

    return (
      <main className="min-h-screen bg-[#f6f7f9]">

        <div className="max-w-5xl mx-auto p-6">

          <h1 className="text-3xl font-black text-slate-900 mb-6">
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
    (categoryData ||
      []) as Category[];

  // =========================================================
  // 선택 카테고리 확인
  // =========================================================

  const requestedExists =
    categories.some(
      (item) =>
        item.slug ===
        requestedCategory
    );

  const category =
    requestedExists
      ? requestedCategory
      : categories.find(
          (item) =>
            item.slug ===
            'log'
        )?.slug ||
        categories[0]
          ?.slug ||
        'log';

  const currentCategory =
    categories.find(
      (item) =>
        item.slug ===
        category
    );

  // =========================================================
  // slug → 실제 카테고리 이름
  // =========================================================

  const categoryLabelMap =
    Object.fromEntries(
      categories.map(
        (item) => [
          item.slug,
          `${
            item.emoji ||
            '📁'
          } ${item.name}`,
        ]
      )
    ) as Record<
      string,
      string
    >;

  const categoryEmojiMap =
    Object.fromEntries(
      categories.map(
        (item) => [
          item.slug,
          item.emoji ||
            '📁',
        ]
      )
    ) as Record<
      string,
      string
    >;

  // =========================================================
  // 카테고리 이동 주소
  // =========================================================

  const makeCategoryHref =
    (
      targetCategory:
        string
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

  // =========================================================
  // 세부 주제 이동 주소
  // =========================================================

  const makeSubHref =
    (
      targetSub:
        string
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

  // =========================================================
  // 정렬 + 필터 + 검색
  // =========================================================

  const posts =
    ((postData ||
      []) as Post[])
      .sort(
        (
          a,
          b
        ) =>
          getPostTimestamp(
            b
          ) -
          getPostTimestamp(
            a
          )
      )
      .filter(
        (post) => {
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
          let matchYear =
            true;

          if (
            year !==
            'all'
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
                ) ===
                year;
            }
          }

          // 검색
          let matchSearch =
            true;

          if (
            normalizedQuery
          ) {
            const categoryName =
              categoryLabelMap[
                post.category ||
                  ''
              ] || '';

            const searchableText =
              [
                post.title,
                post.description,
                post.subcategory,
                categoryName,
              ]
                .filter(
                  Boolean
                )
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
        }
      );

  return (
    <main className="min-h-screen bg-[#f6f7f9]">

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-12">

        {/* =====================================================
            상단 제목
        ===================================================== */}

        <div className="mb-8">

          <p className="text-xs font-black text-blue-600 tracking-[0.16em] mb-2">
            HOHAENG BLOG
          </p>

          <h1 className="text-3xl sm:text-4xl font-black text-slate-950 tracking-[-0.03em]">

            {currentCategory
              ? `${
                  currentCategory.emoji ||
                  '📁'
                } ${
                  currentCategory.name
                }`
              : '📚 호행의 글'}

          </h1>

          <p className="text-sm sm:text-base text-slate-500 mt-3">
            호행처럼에서 직접 작성한 기록과 정보를 모았습니다.
          </p>

          <p className="text-xs text-slate-400 mt-2">
            총{' '}
            <strong className="text-slate-700">
              {
                posts.length
              }
            </strong>
            개의 글
          </p>

        </div>

        {/* =====================================================
            검색
        ===================================================== */}

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
              sub !==
                'all' && (
                <input
                  type="hidden"
                  name="sub"
                  value={
                    sub
                  }
                />
              )}

            {year !==
              'all' && (
                <input
                  type="hidden"
                  name="year"
                  value={
                    year
                  }
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
              className="px-6 py-3 bg-slate-900 hover:bg-blue-600 text-white font-bold rounded-xl transition-colors"
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

        {/* =====================================================
            DB 카테고리 메뉴
        ===================================================== */}

        <div className="flex flex-wrap gap-2 mb-6">

          {categories.map(
            (item) => (
              <Link
                key={
                  item.id
                }
                href={
                  makeCategoryHref(
                    item.slug
                  )
                }
                className={`px-4 py-2.5 rounded-xl text-sm font-bold transition-all ${
                  category ===
                  item.slug
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'bg-white text-slate-600 border border-slate-200 hover:border-blue-300 hover:text-blue-600'
                }`}
              >
                {item.emoji ||
                  '📁'}{' '}
                {item.name}
              </Link>
            )
          )}

        </div>

        {/* =====================================================
            일지 세부 주제
        ===================================================== */}

        {category ===
          'log' && (
          <div className="bg-white p-4 rounded-2xl border border-slate-200 mb-8 shadow-sm">

            <p className="text-xs font-bold text-slate-400 mb-3">
              세부 주제
            </p>

            <div className="flex flex-wrap gap-2">

              <Link
                href={
                  makeSubHref(
                    'all'
                  )
                }
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  sub ===
                  'all'
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                전체 보기
              </Link>

              <Link
                href={
                  makeSubHref(
                    'invest'
                  )
                }
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  sub ===
                  'invest'
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                📈 투자일지
              </Link>

              <Link
                href={
                  makeSubHref(
                    'dividend'
                  )
                }
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  sub ===
                  'dividend'
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                💰 배당일지
              </Link>

              <Link
                href={
                  makeSubHref(
                    'routine'
                  )
                }
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  sub ===
                  'routine'
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                🏃 일상/루틴
              </Link>

            </div>

          </div>
        )}

        {/* =====================================================
            글 목록
        ===================================================== */}

        {posts.length ===
        0 ? (

          <div className="bg-white border border-slate-200 rounded-[24px] p-12 text-center shadow-sm">

            <div className="text-5xl mb-4">
              🔎
            </div>

            <p className="text-slate-900 font-black text-lg">

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

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-6">

            {posts.map(
              (post) => {
                const categoryLabel =
                  categoryLabelMap[
                    post.category ||
                      ''
                  ] ||
                  post.category ||
                  'BLOG';

                const categoryEmoji =
                  categoryEmojiMap[
                    post.category ||
                      ''
                  ] ||
                  '📚';

                return (
                  <Link
                    key={
                      post.id
                    }
                    href={`/blog/${post.slug}`}
                    className="
                      group
                      flex
                      flex-col
                      overflow-hidden
                      bg-white
                      border
                      border-slate-200
                      rounded-[22px]
                      shadow-sm
                      hover:shadow-xl
                      hover:-translate-y-1
                      hover:border-blue-200
                      transition-all
                      duration-300
                    "
                  >

                    {/* =========================================
                        대표 이미지
                    ========================================= */}

                    <div className="relative aspect-[16/9] overflow-hidden bg-slate-100">

                      {post.og_image ? (

                        <img
                          src={
                            post.og_image
                          }
                          alt={
                            post.title
                          }
                          className="
                            w-full
                            h-full
                            object-cover
                            group-hover:scale-[1.035]
                            transition-transform
                            duration-500
                          "
                        />

                      ) : (

                        <div className="
                          w-full
                          h-full
                          flex
                          flex-col
                          items-center
                          justify-center
                          bg-gradient-to-br
                          from-slate-50
                          via-blue-50
                          to-slate-100
                        ">

                          <span className="text-5xl sm:text-6xl mb-3">
                            {
                              categoryEmoji
                            }
                          </span>

                          <span className="text-xs font-black text-slate-400 tracking-[0.15em]">
                            HOHAENG
                          </span>

                        </div>

                      )}

                      {/* 카테고리 뱃지 */}
                      <div className="absolute top-3 left-3">

                        <span className="
                          inline-flex
                          items-center
                          rounded-full
                          bg-white/95
                          backdrop-blur
                          px-3
                          py-1.5
                          text-[11px]
                          font-black
                          text-slate-800
                          shadow-sm
                          border
                          border-white/70
                        ">
                          {
                            categoryLabel
                          }
                        </span>

                      </div>

                    </div>

                    {/* =========================================
                        글 정보
                    ========================================= */}

                    <div className="flex flex-col flex-1 p-5 sm:p-6">

                      {/* 세부 주제 */}
                      {post.subcategory && (
                        <div className="mb-3">

                          <span className="inline-flex text-[11px] font-black text-blue-600 bg-blue-50 px-2.5 py-1 rounded-lg">
                            #
                            {
                              post.subcategory
                            }
                          </span>

                        </div>
                      )}

                      {/* 제목 */}
                      <h2 className="
                        text-[20px]
                        sm:text-[22px]
                        font-black
                        leading-[1.4]
                        tracking-[-0.02em]
                        text-slate-950
                        group-hover:text-blue-600
                        transition-colors
                        line-clamp-2
                      ">
                        {
                          post.title
                        }
                      </h2>

                      {/* 설명 */}
                      <div className="flex-1">

                        {post.description ? (

                          <p className="
                            text-sm
                            sm:text-[15px]
                            text-slate-500
                            leading-6
                            mt-3
                            line-clamp-2
                          ">
                            {
                              post.description
                            }
                          </p>

                        ) : (

                          <p className="text-sm text-slate-400 mt-3">
                            글을 눌러 내용을 확인해보세요.
                          </p>

                        )}

                      </div>

                      {/* 날짜 + 조회수 */}
                      <div className="
                        flex
                        items-center
                        justify-between
                        gap-3
                        border-t
                        border-slate-100
                        mt-5
                        pt-4
                        text-xs
                        text-slate-400
                      ">

                        <span>
                          {formatDate(
                            post
                          ) || '날짜 없음'}
                        </span>

                        <span className="inline-flex items-center gap-1">
                          👁{' '}
                          {(post.view_count ||
                            0).toLocaleString(
                            'ko-KR'
                          )}
                        </span>

                      </div>

                    </div>

                  </Link>
                );
              }
            )}

          </div>

        )}

      </div>

    </main>
  );
}