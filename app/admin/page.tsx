'use client';

import {
  useEffect,
  useState,
} from 'react';

import Link from 'next/link';
import { useRouter } from 'next/navigation';

import { supabase } from '@/app/lib/supabase';

type PostStatus =
  | 'draft'
  | 'published';

type Post = {
  id: string;
  title: string;
  slug: string;
  view_count: number | null;
  created_at: string | null;
  published_at: string | null;
  updated_at: string | null;
  status: PostStatus;
  category: string | null;
};

type Category = {
  id: number;
  slug: string;
  name: string;
  emoji: string | null;
  sort_order: number;
  is_active: boolean;
};

type CategoryStat = {
  slug: string;
  name: string;
  emoji: string;
  isActive: boolean;
  total: number;
  published: number;
  draft: number;
};

function getPostTime(post: Post) {
  const rawDate =
    post.updated_at ||
    post.published_at ||
    post.created_at;

  if (!rawDate) {
    return 0;
  }

  const time =
    new Date(rawDate).getTime();

  return Number.isNaN(time)
    ? 0
    : time;
}

function formatPostDate(post: Post) {
  const time =
    getPostTime(post);

  if (!time) {
    return '날짜 없음';
  }

  return new Intl.DateTimeFormat(
    'ko-KR',
    {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }
  ).format(
    new Date(time)
  );
}

export default function AdminHomePage() {
  const router =
    useRouter();

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    loadError,
    setLoadError,
  ] = useState('');

  const [
    postCount,
    setPostCount,
  ] = useState(0);

  const [
    publishedCount,
    setPublishedCount,
  ] = useState(0);

  const [
    draftCount,
    setDraftCount,
  ] = useState(0);

  const [
    categoryCount,
    setCategoryCount,
  ] = useState(0);

  const [
    totalViews,
    setTotalViews,
  ] = useState(0);

  const [
    popularPosts,
    setPopularPosts,
  ] = useState<Post[]>([]);

  const [
    recentPosts,
    setRecentPosts,
  ] = useState<Post[]>([]);

  const [
    categoryStats,
    setCategoryStats,
  ] = useState<CategoryStat[]>([]);

  useEffect(() => {
    const initialize =
      async () => {
        // 관리자 로그인 확인
        const {
          data: {
            session,
          },
        } =
          await supabase.auth.getSession();

        if (!session) {
          router.replace(
            '/admin/login'
          );

          return;
        }

        setLoadError('');

        // 글 + 카테고리 통계 불러오기
        const [
          postsResult,
          categoriesResult,
        ] =
          await Promise.all([
            supabase
              .from('posts')
              .select(
                'id, title, slug, view_count, created_at, published_at, updated_at, status, category'
              ),

            supabase
              .from('categories')
              .select(
                'id, slug, name, emoji, sort_order, is_active'
              )
              .order(
                'sort_order',
                {
                  ascending:
                    true,
                }
              ),
          ]);

        if (
          postsResult.error ||
          categoriesResult.error
        ) {
          console.error(
            '관리자 대시보드 불러오기 오류:',
            postsResult.error ||
              categoriesResult.error
          );

          setLoadError(
            '일부 통계를 불러오지 못했습니다. 새로고침 후 다시 확인해주세요.'
          );

          setLoading(false);

          return;
        }

        const posts =
          (postsResult.data ||
            []) as Post[];

        const categories =
          (categoriesResult.data ||
            []) as Category[];

        const publishedPosts =
          posts.filter(
            (post) =>
              post.status ===
              'published'
          );

        const draftPosts =
          posts.filter(
            (post) =>
              post.status ===
              'draft'
          );

        setPostCount(
          posts.length
        );

        setPublishedCount(
          publishedPosts.length
        );

        setDraftCount(
          draftPosts.length
        );

        setCategoryCount(
          categories.filter(
            (category) =>
              category.is_active
          ).length
        );

        // 전체 조회수
        const views =
          posts.reduce(
            (
              sum,
              post
            ) =>
              sum +
              (post.view_count ||
                0),
            0
          );

        setTotalViews(
          views
        );

        // 인기글 TOP 5:
        // 실제 방문자가 볼 수 있는 공개글만 표시
        const popular =
          [...publishedPosts]
            .sort(
              (
                a,
                b
              ) =>
                (b.view_count ||
                  0) -
                (a.view_count ||
                  0)
            )
            .slice(
              0,
              5
            );

        setPopularPosts(
          popular
        );

        // 최근 수정 글 TOP 5
        const recent =
          [...posts]
            .sort(
              (
                a,
                b
              ) =>
                getPostTime(b) -
                getPostTime(a)
            )
            .slice(
              0,
              5
            );

        setRecentPosts(
          recent
        );

        // 카테고리별 전체 / 공개 / 초안 개수
        const knownCategorySlugs =
          new Set(
            categories.map(
              (category) =>
                category.slug
            )
          );

        const registeredStats =
          categories.map(
            (
              category
            ): CategoryStat => {
              const categoryPosts =
                posts.filter(
                  (post) =>
                    post.category ===
                    category.slug
                );

              return {
                slug:
                  category.slug,

                name:
                  category.name,

                emoji:
                  category.emoji ||
                  '📁',

                isActive:
                  category.is_active,

                total:
                  categoryPosts.length,

                published:
                  categoryPosts.filter(
                    (post) =>
                      post.status ===
                      'published'
                  ).length,

                draft:
                  categoryPosts.filter(
                    (post) =>
                      post.status ===
                      'draft'
                  ).length,
              };
            }
          );

        // 과거 삭제된 카테고리를 사용하는 글도 통계에서 누락하지 않음
        const unknownCategorySlugs =
          Array.from(
            new Set(
              posts
                .map(
                  (post) =>
                    post.category
                )
                .filter(
                  (
                    slug
                  ): slug is string =>
                    Boolean(
                      slug
                    ) &&
                    !knownCategorySlugs.has(
                      slug as string
                    )
                )
            )
          );

        const unknownStats =
          unknownCategorySlugs.map(
            (
              slug
            ): CategoryStat => {
              const categoryPosts =
                posts.filter(
                  (post) =>
                    post.category ===
                    slug
                );

              return {
                slug,

                name:
                  `기존 카테고리 (${slug})`,

                emoji:
                  '⚠️',

                isActive:
                  false,

                total:
                  categoryPosts.length,

                published:
                  categoryPosts.filter(
                    (post) =>
                      post.status ===
                      'published'
                  ).length,

                draft:
                  categoryPosts.filter(
                    (post) =>
                      post.status ===
                      'draft'
                  ).length,
              };
            }
          );

        const uncategorizedPosts =
          posts.filter(
            (post) =>
              !post.category
          );

        const uncategorizedStats =
          uncategorizedPosts.length >
          0
            ? [
                {
                  slug:
                    'uncategorized',

                  name:
                    '미분류',

                  emoji:
                    '❓',

                  isActive:
                    false,

                  total:
                    uncategorizedPosts.length,

                  published:
                    uncategorizedPosts.filter(
                      (post) =>
                        post.status ===
                        'published'
                    ).length,

                  draft:
                    uncategorizedPosts.filter(
                      (post) =>
                        post.status ===
                        'draft'
                    ).length,
                },
              ]
            : [];

        setCategoryStats([
          ...registeredStats,
          ...unknownStats,
          ...uncategorizedStats,
        ]);

        setLoading(false);
      };

    void initialize();
  }, [
    router,
  ]);

  const handleLogout =
    async () => {
      await supabase.auth.signOut();

      router.replace(
        '/admin/login'
      );
    };

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-950 flex items-center justify-center">
        <p className="text-white font-bold">
          관리자 통계 불러오는 중...
        </p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <div className="max-w-6xl mx-auto p-6">
        {/* =================================================
            상단
        ================================================= */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-10">
          <div>
            <p className="text-xs text-blue-400 font-bold mb-1">
              HOHAENG ADMIN
            </p>

            <h1 className="text-3xl font-black text-white">
              ⚙️ 관리자 센터
            </h1>

            <p className="text-sm text-slate-400 mt-2">
              호행처럼 콘텐츠와 사이트 현황을 한눈에 관리합니다.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link
              href="/"
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 font-bold"
            >
              🏠 사이트 보기
            </Link>

            <button
              type="button"
              onClick={
                handleLogout
              }
              className="px-4 py-2.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 font-bold"
            >
              로그아웃
            </button>
          </div>
        </div>

        {loadError && (
          <div className="mb-8 rounded-2xl border border-red-800 bg-red-950/30 px-5 py-4 text-sm font-bold text-red-300">
            {loadError}
          </div>
        )}

        {/* =================================================
            사이트 현황
        ================================================= */}
        <div className="mb-4">
          <h2 className="text-lg font-black text-white">
            📊 사이트 현황
          </h2>

          <p className="text-xs text-slate-500 mt-1">
            현재 호행처럼의 콘텐츠 통계입니다.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4 mb-10">
          {/* 전체 게시글 */}
          <Link
            href="/admin/manage"
            className="bg-slate-900 border border-slate-800 hover:border-slate-600 rounded-2xl p-5 transition-colors"
          >
            <div className="text-2xl mb-3">
              📚
            </div>

            <p className="text-sm text-slate-400">
              전체 게시글
            </p>

            <p className="text-4xl font-black text-white mt-2">
              {postCount.toLocaleString(
                'ko-KR'
              )}
            </p>

            <p className="text-xs text-slate-500 mt-2">
              전체 글 관리 →
            </p>
          </Link>

          {/* 공개 글 */}
          <Link
            href="/admin/manage"
            className="bg-slate-900 border border-slate-800 hover:border-emerald-700 rounded-2xl p-5 transition-colors"
          >
            <div className="text-2xl mb-3">
              🌐
            </div>

            <p className="text-sm text-slate-400">
              공개 글
            </p>

            <p className="text-4xl font-black text-emerald-400 mt-2">
              {publishedCount.toLocaleString(
                'ko-KR'
              )}
            </p>

            <p className="text-xs text-slate-500 mt-2">
              방문자에게 공개 중
            </p>
          </Link>

          {/* 초안 */}
          <Link
            href="/admin/manage"
            className="bg-slate-900 border border-slate-800 hover:border-amber-700 rounded-2xl p-5 transition-colors"
          >
            <div className="text-2xl mb-3">
              📝
            </div>

            <p className="text-sm text-slate-400">
              초안
            </p>

            <p className="text-4xl font-black text-amber-400 mt-2">
              {draftCount.toLocaleString(
                'ko-KR'
              )}
            </p>

            <p className="text-xs text-slate-500 mt-2">
              작성 중인 글
            </p>
          </Link>

          {/* 전체 조회수 */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
            <div className="text-2xl mb-3">
              👁
            </div>

            <p className="text-sm text-slate-400">
              전체 조회수
            </p>

            <p className="text-4xl font-black text-blue-400 mt-2">
              {totalViews.toLocaleString(
                'ko-KR'
              )}
            </p>

            <p className="text-xs text-slate-500 mt-2">
              모든 글 조회수 합계
            </p>
          </div>

          {/* 활성 카테고리 */}
          <Link
            href="/admin/categories"
            className="bg-slate-900 border border-slate-800 hover:border-violet-700 rounded-2xl p-5 transition-colors"
          >
            <div className="text-2xl mb-3">
              🗂
            </div>

            <p className="text-sm text-slate-400">
              활성 카테고리
            </p>

            <p className="text-4xl font-black text-violet-400 mt-2">
              {categoryCount.toLocaleString(
                'ko-KR'
              )}
            </p>

            <p className="text-xs text-slate-500 mt-2">
              카테고리 관리 →
            </p>
          </Link>
        </div>

        {/* =================================================
            관리 메뉴
        ================================================= */}
        <div className="mb-4">
          <h2 className="text-lg font-black text-white">
            🛠 콘텐츠 관리
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10">
          <Link
            href="/admin/write"
            className="group bg-slate-900 border border-slate-800 hover:border-blue-500 rounded-2xl p-6 transition-all"
          >
            <div className="text-3xl mb-4">
              ✍️
            </div>

            <h3 className="text-lg font-black text-white">
              새 글 작성
            </h3>

            <p className="text-sm text-slate-400 mt-2">
              블로그 글 작성, 자동저장, 이미지 업로드, SEO 설정
            </p>

            <p className="text-sm font-bold text-blue-400 mt-5">
              글 작성하기 →
            </p>
          </Link>

          <Link
            href="/admin/manage"
            className="group bg-slate-900 border border-slate-800 hover:border-blue-500 rounded-2xl p-6 transition-all"
          >
            <div className="text-3xl mb-4">
              📚
            </div>

            <h3 className="text-lg font-black text-white">
              글 관리
            </h3>

            <p className="text-sm text-slate-400 mt-2">
              초안과 공개글 검색, 수정, 삭제 및 발행 상태 관리
            </p>

            <p className="text-sm font-bold text-blue-400 mt-5">
              글 관리하기 →
            </p>
          </Link>

          <Link
            href="/admin/categories"
            className="group bg-slate-900 border border-slate-800 hover:border-blue-500 rounded-2xl p-6 transition-all"
          >
            <div className="text-3xl mb-4">
              🗂
            </div>

            <h3 className="text-lg font-black text-white">
              카테고리 관리
            </h3>

            <p className="text-sm text-slate-400 mt-2">
              카테고리와 세부주제 추가, 수정, 정렬 및 활성 상태 관리
            </p>

            <p className="text-sm font-bold text-blue-400 mt-5">
              카테고리 관리 →
            </p>
          </Link>
        </div>

        {/* =================================================
            인기글 + 최근 글
        ================================================= */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mb-10">
          {/* 인기글 */}
          <section className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
            <div className="p-5 border-b border-slate-800">
              <h2 className="text-lg font-black text-white">
                🔥 공개 인기글 TOP 5
              </h2>

              <p className="text-xs text-slate-500 mt-1">
                공개글 중 조회수가 높은 순서입니다.
              </p>
            </div>

            {popularPosts.length ===
            0 ? (
              <div className="p-8 text-center text-slate-500">
                아직 공개된 글이 없습니다.
              </div>
            ) : (
              <div>
                {popularPosts.map(
                  (
                    post,
                    index
                  ) => (
                    <div
                      key={
                        post.id
                      }
                      className="flex items-center gap-4 p-4 border-b last:border-b-0 border-slate-800"
                    >
                      <div className="w-9 h-9 shrink-0 rounded-xl bg-slate-800 flex items-center justify-center font-black text-white">
                        {index +
                          1}
                      </div>

                      <div className="min-w-0 flex-1">
                        <p className="font-bold text-white truncate">
                          {
                            post.title
                          }
                        </p>

                        <p className="text-xs text-slate-500 mt-1">
                          👁{' '}
                          {(
                            post.view_count ||
                            0
                          ).toLocaleString(
                            'ko-KR'
                          )}{' '}
                          회
                        </p>
                      </div>

                      <Link
                        href={`/blog/${post.slug}`}
                        target="_blank"
                        className="shrink-0 text-xs font-bold text-blue-400 hover:text-blue-300"
                      >
                        보기 →
                      </Link>
                    </div>
                  )
                )}
              </div>
            )}
          </section>

          {/* 최근 수정 글 */}
          <section className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
            <div className="p-5 border-b border-slate-800">
              <h2 className="text-lg font-black text-white">
                🕒 최근 수정 글
              </h2>

              <p className="text-xs text-slate-500 mt-1">
                최근 작성하거나 수정한 글 순서입니다.
              </p>
            </div>

            {recentPosts.length ===
            0 ? (
              <div className="p-8 text-center text-slate-500">
                아직 등록된 글이 없습니다.
              </div>
            ) : (
              <div>
                {recentPosts.map(
                  (
                    post
                  ) => (
                    <div
                      key={
                        post.id
                      }
                      className="flex items-center gap-4 p-4 border-b last:border-b-0 border-slate-800"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className={`inline-flex px-2 py-1 rounded-full text-[11px] font-black ${
                              post.status ===
                              'published'
                                ? 'bg-emerald-500/10 text-emerald-300'
                                : 'bg-amber-500/10 text-amber-300'
                            }`}
                          >
                            {post.status ===
                            'published'
                              ? '🌐 공개'
                              : '📝 초안'}
                          </span>

                          <p className="min-w-0 flex-1 font-bold text-white truncate">
                            {
                              post.title
                            }
                          </p>
                        </div>

                        <p className="text-xs text-slate-500 mt-2">
                          최근 변경:{' '}
                          {formatPostDate(
                            post
                          )}
                        </p>
                      </div>

                      <Link
                        href={`/admin/edit/${post.id}`}
                        className="shrink-0 text-xs font-bold text-blue-400 hover:text-blue-300"
                      >
                        수정 →
                      </Link>
                    </div>
                  )
                )}
              </div>
            )}
          </section>
        </div>

        {/* =================================================
            카테고리별 글 현황
        ================================================= */}
        <section>
          <div className="flex flex-wrap items-end justify-between gap-3 mb-4">
            <div>
              <h2 className="text-lg font-black text-white">
                🗂 카테고리별 글 현황
              </h2>

              <p className="text-xs text-slate-500 mt-1">
                각 카테고리의 전체·공개·초안 글 수입니다.
              </p>
            </div>

            <Link
              href="/admin/categories"
              className="text-sm font-bold text-blue-400 hover:text-blue-300"
            >
              카테고리 관리 →
            </Link>
          </div>

          {categoryStats.length ===
          0 ? (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center text-slate-500">
              등록된 카테고리가 없습니다.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {categoryStats.map(
                (
                  item
                ) => (
                  <div
                    key={
                      item.slug
                    }
                    className="bg-slate-900 border border-slate-800 rounded-2xl p-5"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="text-2xl shrink-0">
                          {
                            item.emoji
                          }
                        </span>

                        <div className="min-w-0">
                          <p className="font-black text-white truncate">
                            {
                              item.name
                            }
                          </p>

                          <p className="text-xs text-slate-500 mt-1 truncate">
                            slug:{' '}
                            {
                              item.slug
                            }
                          </p>
                        </div>
                      </div>

                      <span
                        className={`shrink-0 px-2.5 py-1 rounded-full text-[11px] font-black ${
                          item.isActive
                            ? 'bg-emerald-500/10 text-emerald-300'
                            : 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        {item.isActive
                          ? '활성'
                          : '비활성'}
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-2 mt-5">
                      <div className="rounded-xl bg-slate-950 border border-slate-800 px-3 py-3 text-center">
                        <p className="text-xs text-slate-500">
                          전체
                        </p>

                        <p className="text-xl font-black text-white mt-1">
                          {
                            item.total
                          }
                        </p>
                      </div>

                      <div className="rounded-xl bg-slate-950 border border-slate-800 px-3 py-3 text-center">
                        <p className="text-xs text-slate-500">
                          공개
                        </p>

                        <p className="text-xl font-black text-emerald-400 mt-1">
                          {
                            item.published
                          }
                        </p>
                      </div>

                      <div className="rounded-xl bg-slate-950 border border-slate-800 px-3 py-3 text-center">
                        <p className="text-xs text-slate-500">
                          초안
                        </p>

                        <p className="text-xl font-black text-amber-400 mt-1">
                          {
                            item.draft
                          }
                        </p>
                      </div>
                    </div>
                  </div>
                )
              )}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}