'use client';

import {
  useEffect,
  useMemo,
  useState,
} from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/app/lib/supabase';

type PostStatus =
  | 'draft'
  | 'published';

type StatusFilter =
  | 'all'
  | PostStatus;

type Post = {
  id: string;
  title: string;
  slug: string;
  category: string | null;
  subcategory: string | null;
  description: string | null;
  created_at: string | null;
  published_at: string | null;
  updated_at: string | null;
  status: PostStatus;
  view_count: number | null;
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

function getPostTimestamp(post: Post) {
  if (post.created_at) {
    const time = new Date(
      post.created_at
    ).getTime();

    if (!Number.isNaN(time)) {
      return time;
    }
  }

  const value = Number(
    post.slug.split('-').pop()
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

function formatUpdatedAt(
  value: string | null
) {
  if (!value) {
    return '-';
  }

  const date = new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return '-';
  }

  return new Intl.DateTimeFormat(
    'ko-KR',
    {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }
  ).format(date);
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
  ] = useState<string | null>(null);

  // 검색
  const [search, setSearch] =
    useState('');

  // 정렬
  const [sortType, setSortType] =
    useState<SortType>('newest');

  // 공개 / 초안 필터
  const [
    statusFilter,
    setStatusFilter,
  ] = useState<StatusFilter>('all');

  // =========================================================
  // 초기화
  // =========================================================

  useEffect(() => {
    const initialize = async () => {
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

  const loadData = async () => {
    setLoading(true);

    const [
      postsResult,
      categoriesResult,
    ] = await Promise.all([
      supabase
        .from('posts')
        .select(
          'id, title, slug, category, subcategory, description, created_at, published_at, updated_at, status, view_count'
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

    if (postsResult.error) {
      alert(
        '글 목록을 불러오지 못했습니다: ' +
          postsResult.error.message
      );

      setLoading(false);
      return;
    }

    setPosts(
      (postsResult.data || []) as Post[]
    );

    if (categoriesResult.error) {
      console.error(
        '카테고리 불러오기 오류:',
        categoriesResult.error
      );
    } else {
      setCategories(
        (categoriesResult.data || []) as Category[]
      );
    }

    setLoading(false);
  };

  // =========================================================
  // 카테고리 표시 이름
  // =========================================================

  const categoryMap = useMemo(() => {
    return Object.fromEntries(
      categories.map((item) => [
        item.slug,
        `${item.emoji || '📁'} ${item.name}`,
      ])
    ) as Record<string, string>;
  }, [categories]);

  // =========================================================
  // 통계
  // =========================================================

  const publishedCount =
    useMemo(() => {
      return posts.filter(
        (post) =>
          post.status ===
          'published'
      ).length;
    }, [posts]);

  const draftCount = useMemo(() => {
    return posts.filter(
      (post) =>
        post.status === 'draft'
    ).length;
  }, [posts]);

  const totalViews =
    useMemo(() => {
      return posts.reduce(
        (sum, post) =>
          sum +
          (post.view_count || 0),
        0
      );
    }, [posts]);

  // =========================================================
  // 상태 + 검색 + 정렬
  // =========================================================

  const filteredPosts =
    useMemo(() => {
      const keyword = search
        .trim()
        .toLowerCase();

      let result = posts.filter(
        (post) => {
          // 상태 필터
          if (
            statusFilter !== 'all' &&
            post.status !==
              statusFilter
          ) {
            return false;
          }

          // 검색어가 없으면 상태만 확인
          if (!keyword) {
            return true;
          }

          const categoryName =
            categoryMap[
              post.category || ''
            ] || '';

          const searchable = [
            post.title,
            post.description,
            post.category,
            categoryName,
            post.subcategory,
            post.status === 'draft'
              ? '초안 draft'
              : '공개 published',
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

      if (
        sortType === 'newest'
      ) {
        result.sort(
          (a, b) =>
            getPostTimestamp(b) -
            getPostTimestamp(a)
        );
      }

      if (
        sortType === 'oldest'
      ) {
        result.sort(
          (a, b) =>
            getPostTimestamp(a) -
            getPostTimestamp(b)
        );
      }

      if (
        sortType === 'views'
      ) {
        result.sort(
          (a, b) =>
            (b.view_count || 0) -
            (a.view_count || 0)
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
  // 글 삭제
  // =========================================================

  const handleDelete = async (
    post: Post
  ) => {
    const ok = window.confirm(
      `"${post.title}" 글을 정말 삭제하시겠습니까?\n\n삭제하면 되돌릴 수 없습니다.`
    );

    if (!ok) {
      return;
    }

    try {
      setDeletingId(post.id);

      const { error } =
        await supabase
          .from('posts')
          .delete()
          .eq('id', post.id);

      if (error) {
        throw error;
      }

      setPosts((current) =>
        current.filter(
          (item) =>
            item.id !== post.id
        )
      );

      alert(
        post.status === 'draft'
          ? '초안이 삭제되었습니다.'
          : '글이 삭제되었습니다.'
      );
    } catch (error: any) {
      alert(
        '삭제 실패: ' +
          error.message
      );
    } finally {
      setDeletingId(null);
    }
  };

  // =========================================================
  // 로그아웃
  // =========================================================

  const handleLogout = async () => {
    await supabase.auth.signOut();

    router.replace(
      '/admin/login'
    );
  };

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">

      <div className="max-w-6xl mx-auto px-5 py-10">

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
              공개 글과 초안을 한곳에서 검색하고 수정·관리할 수 있습니다.
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
              onClick={handleLogout}
              className="bg-slate-800 hover:bg-slate-700 px-4 py-2.5 rounded-xl font-bold text-sm"
            >
              로그아웃
            </button>
          </div>

        </div>

        {/* =================================================
            통계
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
              🚀 공개
            </p>

            <strong className="block text-2xl text-emerald-400 mt-1">
              {publishedCount.toLocaleString(
                'ko-KR'
              )}
            </strong>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl px-5 py-4">
            <p className="text-xs text-slate-500">
              💾 초안
            </p>

            <strong className="block text-2xl text-amber-400 mt-1">
              {draftCount.toLocaleString(
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
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-2 mb-5">

          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() =>
                setStatusFilter('all')
              }
              className={`px-4 py-3 rounded-xl text-sm font-black transition-colors ${
                statusFilter === 'all'
                  ? 'bg-white text-slate-950'
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
              className={`px-4 py-3 rounded-xl text-sm font-black transition-colors ${
                statusFilter === 'draft'
                  ? 'bg-amber-500 text-slate-950'
                  : 'text-slate-400 hover:bg-slate-800 hover:text-white'
              }`}
            >
              💾 초안 {draftCount}
            </button>

            <button
              type="button"
              onClick={() =>
                setStatusFilter('published')
              }
              className={`px-4 py-3 rounded-xl text-sm font-black transition-colors ${
                statusFilter === 'published'
                  ? 'bg-emerald-500 text-slate-950'
                  : 'text-slate-400 hover:bg-slate-800 hover:text-white'
              }`}
            >
              🚀 공개 {publishedCount}
            </button>
          </div>

          <p className="text-[11px] text-slate-500 px-2 pt-2 pb-1">
            초안은 관리자에게만 보이며 일반 블로그에는 공개되지 않습니다.
          </p>

        </div>

        {/* =================================================
            검색 / 정렬
        ================================================= */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 mb-5">

          <div className="flex flex-col sm:flex-row gap-3">

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

            <select
              value={sortType}
              onChange={(e) =>
                setSortType(
                  e.target.value as SortType
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

          {(search ||
            statusFilter !== 'all') && (
            <div className="flex flex-wrap items-center justify-between gap-3 mt-3 pt-3 border-t border-slate-800">

              <p className="text-xs text-slate-400">
                현재 결과{' '}
                <strong className="text-blue-400">
                  {filteredPosts.length}
                  개
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

        ) : filteredPosts.length === 0 ? (

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center">
            <div className="text-4xl mb-4">
              {statusFilter === 'draft'
                ? '💾'
                : statusFilter === 'published'
                  ? '🚀'
                  : '🔎'}
            </div>

            <p className="font-bold text-white">
              {search
                ? '검색 결과가 없습니다.'
                : statusFilter === 'draft'
                  ? '저장된 초안이 없습니다.'
                  : statusFilter === 'published'
                    ? '공개된 글이 없습니다.'
                    : '글이 없습니다.'}
            </p>

            <p className="text-sm text-slate-500 mt-2">
              {search
                ? '다른 검색어를 입력해보세요.'
                : statusFilter === 'draft'
                  ? '글쓰기 화면에서 초안 저장을 누르면 여기에 나타납니다.'
                  : '새 글을 작성해보세요.'}
            </p>

            {search && (
              <button
                type="button"
                onClick={() =>
                  setSearch('')
                }
                className="mt-5 text-blue-400 font-bold text-sm"
              >
                검색 초기화
              </button>
            )}
          </div>

        ) : (

          <div className="space-y-3">

            {filteredPosts.map(
              (post) => (
                <div
                  key={post.id}
                  className={`bg-slate-900 border rounded-2xl p-5 transition-colors ${
                    post.status === 'draft'
                      ? 'border-amber-500/20 hover:border-amber-500/40'
                      : 'border-slate-800 hover:border-slate-700'
                  }`}
                >

                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">

                    {/* 글 정보 */}
                    <div className="min-w-0 flex-1">

                      <div className="flex flex-wrap items-center gap-2 mb-2">

                        {/* 상태 */}
                        {post.status === 'draft' ? (
                          <span className="text-xs font-black bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2.5 py-1 rounded-lg">
                            💾 초안
                          </span>
                        ) : (
                          <span className="text-xs font-black bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2.5 py-1 rounded-lg">
                            🚀 공개
                          </span>
                        )}

                        {/* 카테고리 */}
                        <span className="text-xs font-bold bg-blue-500/10 text-blue-400 px-2.5 py-1 rounded-lg">
                          {categoryMap[
                            post.category || ''
                          ] ||
                            post.category ||
                            '📁 기타'}
                        </span>

                        {/* 세부 주제 */}
                        {post.subcategory && (
                          <span className="text-xs bg-slate-800 text-slate-300 px-2.5 py-1 rounded-lg">
                            {post.subcategory}
                          </span>
                        )}

                        {/* 조회수 - 공개글 위주 */}
                        <span className="text-xs bg-slate-800 text-slate-400 px-2.5 py-1 rounded-lg">
                          👁{' '}
                          {(post.view_count || 0).toLocaleString(
                            'ko-KR'
                          )}
                        </span>

                        {/* 작성일 */}
                        <span className="text-xs text-slate-500">
                          📅 {formatDate(post)}
                        </span>

                        {/* 초안은 마지막 저장시간 표시 */}
                        {post.status === 'draft' && (
                          <span className="text-xs text-amber-500/70">
                            최근 저장 {formatUpdatedAt(
                              post.updated_at
                            )}
                          </span>
                        )}

                      </div>

                      <h2 className="text-lg font-black text-white truncate">
                        {post.title}
                      </h2>

                      {post.description && (
                        <p className="text-sm text-slate-400 mt-1 line-clamp-1">
                          {post.description}
                        </p>
                      )}

                      <p className="text-xs text-slate-600 mt-2 truncate">
                        {post.status === 'draft'
                          ? '🔒 비공개 초안'
                          : `/blog/${post.slug}`}
                      </p>

                    </div>

                    {/* 버튼 */}
                    <div className="flex flex-wrap gap-2 shrink-0">

                      {post.status === 'published' && (
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
                          post.status === 'draft'
                            ? 'bg-amber-500/10 hover:bg-amber-500/20 text-amber-400'
                            : 'bg-blue-500/10 hover:bg-blue-500/20 text-blue-400'
                        }`}
                      >
                        {post.status === 'draft'
                          ? '✏️ 초안 이어쓰기'
                          : '✏️ 수정'}
                      </Link>

                      <button
                        type="button"
                        onClick={() =>
                          handleDelete(post)
                        }
                        disabled={
                          deletingId === post.id
                        }
                        className="px-3 py-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 text-sm font-bold disabled:opacity-50"
                      >
                        {deletingId === post.id
                          ? '삭제 중...'
                          : '🗑 삭제'}
                      </button>

                    </div>

                  </div>

                </div>
              )
            )}

          </div>

        )}

      </div>

    </main>
  );
}