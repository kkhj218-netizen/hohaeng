import type { Metadata } from 'next';
import Link from 'next/link';

import Breadcrumbs from '@/app/components/Breadcrumbs';
import { SITE_NAME } from '@/app/lib/site';
import { supabase } from '@/app/lib/supabase';

export const dynamic = 'force-dynamic';

const POSTS_PER_PAGE = 12;

type BlogSearchParams = {
  cat?: string;
  category?: string;
  sub?: string;
  year?: string;
  q?: string;
  page?: string;
};

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<BlogSearchParams>;
}): Promise<Metadata> {
  const params = await searchParams;
  const isFiltered = Object.keys(params).length > 0;

  const title = '호행처럼 블로그 | 돈·직장·투자·삶의 실제 기록';
  const description =
    '연봉과 직장생활, 투자, 돈 관리와 호행처럼의 실제 성장 기록을 주제별로 읽어보세요.';

  return {
    title,
    description,
    alternates: {
      canonical: '/blog',
    },
    robots: {
      index: !isFiltered,
      follow: true,
      googleBot: {
        index: !isFiltered,
        follow: true,
        'max-image-preview': 'large',
        'max-snippet': -1,
        'max-video-preview': -1,
      },
    },
    openGraph: {
      title,
      description,
      url: '/blog',
      siteName: SITE_NAME,
      locale: 'ko_KR',
      type: 'website',
    },
    twitter: {
      card: 'summary',
      title,
      description,
    },
  };
}

const BLOG_START_GUIDES = [
  {
    href: '/blog/post-log-1785841740573',
    label: '연봉 PILLAR',
    title: '2026 연봉 실수령액 총정리',
    description: '연봉 구간별 실제 월급을 비교하고 세금과 공제 구조를 이해합니다.',
  },
  {
    href: '/blog/prepared-monthly-100-five-years',
    label: '투자 PILLAR',
    title: '매월 100만 원 투자하면 5년 뒤 얼마일까',
    description: '적립식 투자 원금과 복리 수익의 차이를 숫자로 확인합니다.',
  },
  {
    href: '/projects/site-growth',
    label: '성장 기록',
    title: '검색 유입 0명부터 사이트 키우기',
    description: '사이트 제작부터 검색 노출과 개선 과정을 실제 데이터로 기록합니다.',
  },
];

type Post = {
  id: string;
  title: string;
  slug: string;
  content?: string | null;
  category?: string | null;
  subcategory?: string | null;
  description?: string | null;
  created_at?: string | null;
  og_image?: string | null;
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

  return new Intl.DateTimeFormat(
    'ko-KR',
    {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }
  ).format(new Date(timestamp));
}

function getSafePage(value?: string) {
  const parsed = Number(value);

  if (
    !Number.isInteger(parsed) ||
    parsed < 1
  ) {
    return 1;
  }

  return parsed;
}

function getSafeSearchTerm(value: string) {
  return value
    .replace(/[%_,()]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export default async function BlogListPage({
  searchParams,
}: {
  searchParams: Promise<BlogSearchParams>;
}) {
  const params = await searchParams;

  const requestedCategory =
    params.category ||
    params.cat ||
    'all';

  const sub =
    params.sub ||
    'all';

  const year =
    params.year ||
    'all';

  const query =
    params.q?.trim() ||
    '';

  const currentPage =
    getSafePage(
      params.page
    );

  // =========================================================
  // 활성 카테고리 불러오기
  // =========================================================

  const {
    data: categoryData,
    error: categoryError,
  } = await supabase
    .from('categories')
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
        ascending: true,
      }
    );

  if (categoryError) {
    console.error(
      '카테고리 불러오기 오류:',
      categoryError
    );
  }

  const categories =
    (categoryData ||
      []) as Category[];

  // =========================================================
  // 선택 카테고리 확인
  // =========================================================

  const requestedExists =
    requestedCategory === 'all' ||
    categories.some(
      (item) => item.slug === requestedCategory
    );

  const category =
    requestedExists
      ? requestedCategory
      : categories.find(
          (item) =>
            item.slug ===
            'log'
        )?.slug ||
        categories[0]?.slug ||
        'log';

  const currentCategory =
    categories.find(
      (item) =>
        item.slug ===
        category
    );

  const isInvestmentJournal =
    category === 'log' &&
    sub === 'invest';

  // =========================================================
  // DB에서 필요한 공개글만 가져오기
  // 페이지가 늘어날수록 12개씩 누적해서 표시
  // =========================================================

  const visibleLimit =
    currentPage *
    POSTS_PER_PAGE;

  let postQuery = supabase
    .from('posts')
    .select(
      'id, title, slug, content, category, subcategory, description, created_at, og_image, view_count',
      {
        count: 'exact',
      }
    )
    .eq(
      'status',
      'published'
    );

  if (category !== 'all') {
    postQuery = postQuery.eq('category', category);
  }

  if (
    sub !==
    'all'
  ) {
    postQuery =
      postQuery.eq(
        'subcategory',
        sub
      );
  }

  if (
    year !==
      'all' &&
    /^\d{4}$/.test(
      year
    )
  ) {
    const startYear =
      Number(year);

    const startDate =
      `${startYear}-01-01T00:00:00.000Z`;

    const endDate =
      `${startYear + 1}-01-01T00:00:00.000Z`;

    postQuery =
      postQuery
        .gte(
          'created_at',
          startDate
        )
        .lt(
          'created_at',
          endDate
        );
  }

  const safeSearchTerm =
    getSafeSearchTerm(
      query
    );

  if (safeSearchTerm) {
    postQuery =
      postQuery.or(
        `title.ilike.%${safeSearchTerm}%,description.ilike.%${safeSearchTerm}%,subcategory.ilike.%${safeSearchTerm}%`
      );
  }

  const {
    data: postData,
    error: postError,
    count: postCount,
  } = await postQuery
    .order(
      'created_at',
      {
        ascending: isInvestmentJournal,
      }
    )
    .range(
      0,
      visibleLimit - 1
    );

  if (postError) {
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

  const posts =
    (postData ||
      []) as Post[];

  const totalPostCount =
    postCount ??
    posts.length;

  const hasMore =
    posts.length <
    totalPostCount;

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
  // URL 생성 함수
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

      if (
        targetSub !==
        'all'
      ) {
        search.set(
          'sub',
          targetSub
        );
      }

      if (
        year !==
        'all'
      ) {
        search.set(
          'year',
          year
        );
      }

      if (query) {
        search.set(
          'q',
          query
        );
      }

      return `/blog?${search.toString()}`;
    };

  const makeLoadMoreHref =
    () => {
      const search =
        new URLSearchParams();

      if (category !== 'all') {
        search.set('category', category);
      }

      if (
        sub !==
        'all'
      ) {
        search.set(
          'sub',
          sub
        );
      }

      if (
        year !==
        'all'
      ) {
        search.set(
          'year',
          year
        );
      }

      if (query) {
        search.set(
          'q',
          query
        );
      }

      search.set(
        'page',
        String(
          currentPage +
          1
        )
      );

      return `/blog?${search.toString()}`;
    };

  const isBaseHub =
    category === 'all' &&
    sub === 'all' &&
    year === 'all' &&
    !query &&
    currentPage === 1;

  return (
    <main className="min-h-screen bg-[#f6f7f9]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        <Breadcrumbs
          items={[
            { name: '홈', href: '/' },
            { name: '블로그', href: '/blog' },
          ]}
          className="mb-7"
        />

        {/* =====================================================
            상단 제목
        ===================================================== */}

        <div className="mb-8">
          <p className="text-xs font-black text-blue-600 tracking-[0.16em] mb-2">
            HOHAENG BLOG
          </p>

          <h1 className="text-3xl sm:text-4xl font-black text-slate-950 tracking-[-0.03em]">
            {currentCategory
              ? `${currentCategory.emoji || '📁'} ${currentCategory.name}`
              : '호행처럼 블로그'}
          </h1>

          <p className="text-sm sm:text-base text-slate-500 mt-3">
            {currentCategory
              ? `${currentCategory.name} 주제의 공개 글을 모았습니다.`
              : '돈·직장·투자·삶을 더 나은 방향으로 바꾸는 기록과 가이드를 모았습니다.'}
          </p>

          <p className="text-xs text-slate-400 mt-2">
            총{' '}
            <strong className="text-slate-700">
              {totalPostCount}
            </strong>
            개의 글
          </p>
        </div>

        {isBaseHub && (
          <section className="mb-8 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="text-xs font-black tracking-[0.14em] text-emerald-600">
                  START HERE
                </p>
                <h2 className="mt-2 text-xl font-black text-slate-950 sm:text-2xl">
                  먼저 읽을 핵심 가이드
                </h2>
              </div>
              <Link href="/money" className="text-sm font-bold text-blue-600 hover:underline">
                계산기가 필요하다면 Money Hub →
              </Link>
            </div>

            <div className="mt-5 grid gap-3 md:grid-cols-3">
              {BLOG_START_GUIDES.map((guide) => (
                <Link
                  key={guide.href}
                  href={guide.href}
                  className="rounded-2xl border border-slate-200 bg-slate-50 p-4 transition hover:border-emerald-300 hover:bg-emerald-50"
                >
                  <span className="text-xs font-black text-emerald-700">{guide.label}</span>
                  <h3 className="mt-2 font-black text-slate-950">{guide.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-500">{guide.description}</p>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* =====================================================
            검색
        ===================================================== */}

        <div className="bg-white border border-slate-200 rounded-2xl p-4 mb-6 shadow-sm">
          <form
            action="/blog"
            method="GET"
            className="flex flex-col sm:flex-row gap-2"
          >
            {category !== 'all' && (
              <input type="hidden" name="category" value={category} />
            )}

            {sub !==
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
                    totalPostCount
                  }
                  개
                </span>
              </p>

              <Link
                href={category === 'all' ? '/blog' : `/blog?category=${category}`}
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
          <Link
            href="/blog"
            className={`px-4 py-2.5 rounded-xl text-sm font-bold transition-all ${
              category === 'all'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-white text-slate-600 border border-slate-200 hover:border-blue-300 hover:text-blue-600'
            }`}
          >
            📚 전체 글
          </Link>

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
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-5 sm:gap-6">
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
                      {/* 대표 이미지 */}
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

                      {/* 글 정보 */}
                      <div className="flex flex-col flex-1 p-5 sm:p-6">
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
                            ) ||
                              '날짜 없음'}
                          </span>

                          <span className="inline-flex items-center gap-1">
                            👁{' '}
                            {(
                              post.view_count ||
                              0
                            ).toLocaleString(
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

            {/* 더보기 */}
            <div className="flex flex-col items-center gap-3 mt-10">
              <p className="text-sm text-slate-500">
                총{' '}
                <strong className="text-slate-800">
                  {
                    totalPostCount
                  }
                </strong>
                개 중{' '}
                <strong className="text-blue-600">
                  {
                    posts.length
                  }
                </strong>
                개 표시
              </p>

              {hasMore && (
                <Link
                  href={
                    makeLoadMoreHref()
                  }
                  scroll={
                    false
                  }
                  className="inline-flex items-center justify-center min-w-[220px] px-7 py-3.5 rounded-xl bg-slate-900 hover:bg-blue-600 text-white font-black shadow-sm hover:shadow-lg transition-all"
                >
                  ＋ 글 12개 더보기
                </Link>
              )}

              {!hasMore && (
                <p className="text-xs font-bold text-slate-400">
                  모든 글을 불러왔습니다.
                </p>
              )}
            </div>
          </>
        )}
      </div>
    </main>
  );
}
