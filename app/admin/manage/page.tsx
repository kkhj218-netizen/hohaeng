'use client';

import {
  useEffect,
  useMemo,
  useState,
} from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/app/lib/supabase';

type PostStatus = 'draft' | 'published';

type Post = {
  id: string;
  title: string;
  slug: string;
  category: string | null;
  subcategory: string | null;
  description: string | null;
  created_at: string | null;
  published_at: string | null;
  view_count: number | null;
  status: PostStatus | null;
};

type Category = {
  id: number;
  slug: string;
  name: string;
  emoji: string | null;
  sort_order: number;
  is_active: boolean;
};

type SortType =
  | 'newest'
  | 'oldest'
  | 'views';

type StatusFilter =
  | 'all'
  | 'draft'
  | 'published';

function getPostTimestamp(post: Post) {
  // 공개 글은 published_at 우선, 초안은 created_at 우선
  const dateValue =
    post.status === 'published'
      ? post.published_at || post.created_at
      : post.created_at || post.published_at;

  if (dateValue) {
    const time = new Date(dateValue).getTime();

    if (!Number.isNaN(time)) {
      return time;
    }
  }

  // 예전 글은 slug의 timestamp 사용
  const value = Number(
    post.slug
      .split('-')
      .pop()
  );

  return Number.isNaN(value)
    ? 0
    : value;
}

function formatDate(post: Post) {
  const timestamp =
    getPostTimestamp(post);

  if (!timestamp) {
    return '-';
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

function isDraft(post: Post) {
  return post.status === 'draft';
}

function isPublished(post: Post) {
  // 혹시 과거 데이터에 status가 비어 있어도 기존 글은 공개 글로 취급
  return post.status !== 'draft';
}

export default function AdminManagePage() {
  const router = useRouter();

  const [posts, setPosts] =
    useState<Post[]>([]);

  const [categories, setCategories] =
    useState<Category[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [
    deletingId,
    setDeletingId,
  ] =
    useState<string | null>(
      null
    );

  // 검색
  const [search, setSearch] =
    useState('');

  // 정렬
  const [sortType, setSortType] =
    useState<SortType>(
      'newest'
    );

  // 전체 / 초안 / 공개 탭
  const [statusFilter, setStatusFilter] =
    useState<StatusFilter>('all');

  // =========================================================
  // 초기화
  // =========================================================

  useEffect(() => {
    const initialize =
      async () => {
        // 로그인 확인
        const {
          data: { session },
        } =
          await supabase.auth.getSession();

        if (!session) {
          router.replace(
            '/admin/login'
          );

          return;
        }

        await loadData();
      };

    initialize();
  }, [router]);

  // =========================================================
  // 게시글 + 카테고리 불러오기
  // =========================================================

  const loadData =
    async () => {
      setLoading(true);

      const [
        postsResult,
        categoriesResult,
      ] =
        await Promise.all([
          supabase
            .from('posts')
            .select(
              'id, title, slug, category, subcategory, description, created_at, published_at, view_count, status'
            ),

          supabase
            .from('categories')
            .select(
              'id, slug, name, emoji, sort_order, is_active'
            )
            .order(
              'sort_order',
              {
                ascending: true,
              }
            ),
        ]);

      // 게시글
      if (postsResult.error) {
        alert(
          '글 목록을 불러오지 못했습니다: ' +
            postsResult.error.message
        );

        setLoading(false);
        return;
      }

      setPosts(
        (postsResult.data ||
          []) as Post[]
      );

      // 카테고리
      if (
        categoriesResult.error
      ) {
        console.error(
          '카테고리 불러오기 오류:',
          categoriesResult.error
        );
      } else {
        setCategories(
          (categoriesResult.data ||
            []) as Category[]
        );
      }

      setLoading(false);
    };

  // =========================================================
  // 카테고리 표시 이름
  // =========================================================

  const categoryMap =
    useMemo(() => {
      return Object.fromEntries(
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
    }, [categories]);

  // =========================================================
  // 상태별 개수
  // =========================================================

  const draftCount =
    useMemo(() => {
      return posts.filter(
        isDraft
      ).length;
    }, [posts]);

  const publishedCount =
    useMemo(() => {
      return posts.filter(
        isPublished
      ).length;
    }, [posts]);

  // =========================================================
  // 상태 탭 + 검색 + 정렬
  // =========================================================

  const filteredPosts =
    useMemo(() => {
      const keyword =
        search
          .trim()
          .toLowerCase();

      let result =
        posts.filter(
          (post) => {
            // 1) 상태 필터
            if (
              statusFilter === 'draft' &&
              !isDraft(post)
            ) {
              return false;
            }

            if (
              statusFilter === 'published' &&
              !isPublished(post)
            ) {
              return false;
            }

            // 2) 검색어가 없으면 상태 필터만 적용
            if (!keyword) {
              return true;
            }

            const categoryName =
              categoryMap[
                post.category ||
                  ''
              ] || '';

            const searchable =
              [
                post.title,
                post.description,
                post.category,
                categoryName,
                post.subcategory,
                post.status,
              ]
                .filter(Boolean)
                .join(' ')
                .toLowerCase();

            return searchable.includes(
              keyword
            );
          }
        );

      result = [...result];

      // 최신순
      if (
        sortType ===
        'newest'
      ) {
        result.sort(
          (a, b) =>
            getPostTimestamp(
              b
            ) -
            getPostTimestamp(
              a
            )
        );
      }

      // 오래된순
      if (
        sortType ===
        'oldest'
      ) {
        result.sort(
          (a, b) =>
            getPostTimestamp(
              a
            ) -
            getPostTimestamp(
              b
            )
        );
      }

      // 조회수순
      if (
        sortType ===
        'views'
      ) {
        result.sort(
          (a, b) =>
            (b.view_count ||
              0) -
            (a.view_count ||
              0)
        );
      }

      return result;
    }, [
      posts,
      search,
      sortType,
      statusFilter,
      categoryMap,
    ]);

  // =========================================================
  // 전체 조회수
  // =========================================================

  const totalViews =
    useMemo(() => {
      return posts.reduce(
        (sum, post) =>
          sum +
          (post.view_count ||
            0),
        0
      );
    }, [posts]);

  // =========================================================
  // 글 삭제
  // =========================================================

  const handleDelete =
    async (post: Post) => {
      const ok =
        window.confirm(
          `"${post.title}" 글을 정말 삭제하시겠습니까?\n\n삭제하면 되돌릴 수 없습니다.`
        );

      if (!ok) return;

      try {
        setDeletingId(
          post.id
        );

        const { error } =
          await supabase
            .from('posts')
            .delete()
            .eq(
              'id',
              post.id
            );

        if (error) {
          throw error;
        }

        setPosts(
          (current) =>
            current.filter(
              (item) =>
                item.id !==
                post.id
            )
        );

        alert(
          '글이 삭제되었습니다.'
        );

      } catch (
        error: any
      ) {
        alert(
          '삭제 실패: ' +
            error.message
        );
      } finally {
        setDeletingId(
          null
        );
      }
    };

  // =========================================================
  // 로그아웃
  // =========================================================

  const handleLogout =
    async () => {
      await supabase.auth.signOut();

      router.replace(
        '/admin/login'
      );
    };

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">

      <div className="max-w-5xl mx-auto px-5 py-10">

        {/* =================================================
            상단
        ================================================= */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-8">

          <div>

            <p className="text-blue-400 text-sm font-bold mb-1">
              HOHAENG ADMIN
            </p>

            <h1 className="text-3xl font-black">
              📚 글 관리
            </h1>

            <p className="text-slate-400 text-sm mt-2">
              초안과 공개 글을 구분해서 검색하고 수정·관리할 수 있습니다.
            </p>

          </div>

          <div className="flex flex-wrap gap-2">

            <Link
              href="/admin"
              className="bg-slate-800 hover:bg-slate-700 px-4 py-2.5 rounded-xl font-bold text-sm"
            >
              ⚙️ 관리자 홈
            </Link>

            <Link
              href="/admin/write"
              className="bg-blue-600 hover:bg-blue-500 px-4 py-2.5 rounded-xl font-bold text-sm"
            >
              ✍️ 새 글 작성
            </Link>

            <button
              type="button"
              onClick={
                handleLogout
              }
              className="bg-slate-800 hover:bg-slate-700 px-4 py-2.5 rounded-xl font-bold text-sm"
            >
              로그아웃
            </button>

          </div>

        </div>

        {/* =================================================
            간단 통계
        ================================================= */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">

          <div className="bg-slate-900 border border-slate-800 rounded-2xl px-5 py-4">

            <p className="text-xs text-slate-500">
              전체 글
            </p>

            <strong className="block text-2xl text-white mt-1">
              {posts.length.toLocaleString(
                'ko-KR'
              )}
            </strong>

          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl px-5 py-4">

            <p className="text-xs text-slate-500">
              초안
            </p>

            <strong className="block text-2xl text-amber-400 mt-1">
              {draftCount.toLocaleString(
                'ko-KR'
              )}
            </strong>

          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl px-5 py-4">

            <p className="text-xs text-slate-500">
              공개
            </p>

            <strong className="block text-2xl text-emerald-400 mt-1">
              {publishedCount.toLocaleString(
                'ko-KR'
              )}
            </strong>

          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl px-5 py-4">

            <p className="text-xs text-slate-500">
              전체 조회수
            </p>

            <strong className="block text-2xl text-blue-400 mt-1">
              {totalViews.toLocaleString(
                'ko-KR'
              )}
            </strong>

          </div>

        </div>

        {/* =================================================
            전체 / 초안 / 공개 탭
        ================================================= */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-2 mb-4">

          <div className="grid grid-cols-3 gap-2">

            <button
              type="button"
              onClick={() =>
                setStatusFilter('all')
              }
              className={`rounded-xl px-3 py-3 text-sm font-black transition-colors ${
                statusFilter === 'all'
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-400 hover:bg-slate-800 hover:text-white'
              }`}
            >
              전체 {posts.length}
            </button>

            <button
              type="button"
              onClick={() =>
                setStatusFilter('draft')
              }
              className={`rounded-xl px-3 py-3 text-sm font-black transition-colors ${
                statusFilter === 'draft'
                  ? 'bg-amber-500 text-slate-950'
                  : 'text-slate-400 hover:bg-slate-800 hover:text-white'
              }`}
            >
              📝 초안 {draftCount}
            </button>

            <button
              type="button"
              onClick={() =>
                setStatusFilter('published')
              }
              className={`rounded-xl px-3 py-3 text-sm font-black transition-colors ${
                statusFilter === 'published'
                  ? 'bg-emerald-600 text-white'
                  : 'text-slate-400 hover:bg-slate-800 hover:text-white'
              }`}
            >
              🌐 공개 {publishedCount}
            </button>

          </div>

        </div>

        {/* =================================================
            검색 / 정렬
        ================================================= */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 mb-5">

          <div className="flex flex-col sm:flex-row gap-3">

            {/* 검색 */}
            <div className="relative flex-1">

              <span className="absolute left-4 top-1/2 -translate-y-1/2">
                🔎
              </span>

              <input
                type="search"
                value={search}
                onChange={(e) =>
                  setSearch(
                    e.target.value
                  )
                }
                placeholder="제목, 설명, 카테고리 검색"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-11 pr-4 py-3 text-white focus:outline-none focus:border-blue-500"
              />

            </div>

            {/* 정렬 */}
            <select
              value={sortType}
              onChange={(e) =>
                setSortType(
                  e.target
                    .value as SortType
                )
              }
              className="bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500"
            >
              <option value="newest">
                🆕 최신순
              </option>

              <option value="oldest">
                🕐 오래된순
              </option>

              <option value="views">
                🔥 조회수 높은순
              </option>
            </select>

          </div>

          {(search || statusFilter !== 'all') && (
            <div className="flex items-center justify-between gap-3 mt-3">

              <p className="text-xs text-slate-400">
                현재 조건 결과{' '}
                <strong className="text-blue-400">
                  {filteredPosts.length}개
                </strong>
              </p>

              {search && (
                <button
                  type="button"
                  onClick={() =>
                    setSearch('')
                  }
                  className="text-xs font-bold text-slate-400 hover:text-white"
                >
                  ✕ 검색 초기화
                </button>
              )}

            </div>
          )}

        </div>

        {/* =================================================
            글 목록
        ================================================= */}
        {loading ? (

          <div className="text-center py-20 text-slate-400">
            글을 불러오는 중...
          </div>

        ) : posts.length === 0 ? (

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center">

            <p className="text-slate-400 mb-5">
              아직 작성된 글이 없습니다.
            </p>

            <Link
              href="/admin/write"
              className="text-blue-400 font-bold"
            >
              첫 글 작성하기 →
            </Link>

          </div>

        ) : filteredPosts.length ===
          0 ? (

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center">

            <div className="text-4xl mb-4">
              🔎
            </div>

            <p className="font-bold text-white">
              조건에 맞는 글이 없습니다.
            </p>

            <p className="text-sm text-slate-500 mt-2">
              다른 탭이나 검색어를 확인해보세요.
            </p>

            <button
              type="button"
              onClick={() => {
                setSearch('');
                setStatusFilter('all');
              }}
              className="mt-5 text-blue-400 font-bold text-sm"
            >
              전체 글 보기
            </button>

          </div>

        ) : (

          <div className="space-y-3">

            {filteredPosts.map(
              (post) => {
                const draft =
                  isDraft(post);

                return (
                  <div
                    key={post.id}
                    className={`bg-slate-900 border rounded-2xl p-5 transition-colors ${
                      draft
                        ? 'border-amber-500/20 hover:border-amber-500/40'
                        : 'border-slate-800 hover:border-slate-700'
                    }`}
                  >

                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">

                      {/* 글 정보 */}
                      <div className="min-w-0 flex-1">

                        <div className="flex flex-wrap items-center gap-2 mb-2">

                          {/* 상태 */}
                          {draft ? (
                            <span className="text-xs font-black bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2.5 py-1 rounded-lg">
                              📝 초안
                            </span>
                          ) : (
                            <span className="text-xs font-black bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2.5 py-1 rounded-lg">
                              🌐 공개
                            </span>
                          )}

                          {/* 카테고리 */}
                          <span className="text-xs font-bold bg-blue-500/10 text-blue-400 px-2.5 py-1 rounded-lg">

                            {categoryMap[
                              post.category ||
                                ''
                            ] ||
                              post.category ||
                              '📁 기타'}

                          </span>

                          {/* 세부주제 */}
                          {post.subcategory && (
                            <span className="text-xs bg-slate-800 text-slate-300 px-2.5 py-1 rounded-lg">
                              {
                                post.subcategory
                              }
                            </span>
                          )}

                          {/* 조회수 */}
                          {!draft && (
                            <span className="text-xs bg-slate-800 text-slate-400 px-2.5 py-1 rounded-lg">
                              👁{' '}
                              {(post.view_count ||
                                0).toLocaleString(
                                'ko-KR'
                              )}
                            </span>
                          )}

                          {/* 날짜 */}
                          <span className="text-xs text-slate-500">
                            📅{' '}
                            {formatDate(
                              post
                            )}
                          </span>

                        </div>

                        <h2 className="text-lg font-black text-white truncate">
                          {post.title || '제목 없는 초안'}
                        </h2>

                        {post.description && (
                          <p className="text-sm text-slate-400 mt-1 line-clamp-1">
                            {
                              post.description
                            }
                          </p>
                        )}

                        {draft ? (
                          <p className="text-xs text-amber-400/70 mt-2 truncate">
                            아직 공개되지 않은 초안입니다.
                          </p>
                        ) : (
                          <p className="text-xs text-slate-600 mt-2 truncate">
                            /blog/
                            {post.slug}
                          </p>
                        )}

                      </div>

                      {/* 버튼 */}
                      <div className="flex flex-wrap gap-2 shrink-0">

                        {!draft && (
                          <Link
                            href={`/blog/${post.slug}`}
                            target="_blank"
                            className="px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-sm font-bold"
                          >
                            👁 보기
                          </Link>
                        )}

                        <Link
                          href={`/admin/edit/${post.id}`}
                          className={`px-3 py-2 rounded-lg text-sm font-bold ${
                            draft
                              ? 'bg-amber-500/10 hover:bg-amber-500/20 text-amber-400'
                              : 'bg-blue-500/10 hover:bg-blue-500/20 text-blue-400'
                          }`}
                        >
                          {draft
                            ? '✍️ 이어쓰기'
                            : '✏️ 수정'}
                        </Link>

                        <button
                          type="button"
                          onClick={() =>
                            handleDelete(
                              post
                            )
                          }
                          disabled={
                            deletingId ===
                            post.id
                          }
                          className="px-3 py-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 text-sm font-bold disabled:opacity-50"
                        >
                          {deletingId ===
                          post.id
                            ? '삭제 중...'
                            : '🗑 삭제'}
                        </button>

                      </div>

                    </div>

                  </div>
                );
              }
            )}

          </div>

        )}

      </div>

    </main>
  );
}