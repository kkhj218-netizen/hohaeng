'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/app/lib/supabase';

type Post = {
  id: string;
  title: string;
  slug: string;
  view_count: number | null;
  created_at: string | null;
};

export default function AdminHomePage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);

  const [postCount, setPostCount] = useState(0);
  const [categoryCount, setCategoryCount] = useState(0);
  const [totalViews, setTotalViews] = useState(0);

  const [popularPosts, setPopularPosts] = useState<Post[]>([]);

  useEffect(() => {
    const initialize = async () => {
      // 관리자 로그인 확인
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        router.replace('/admin/login');
        return;
      }

      // 글 + 카테고리 통계 불러오기
      const [
        postsResult,
        categoryResult,
      ] = await Promise.all([
        supabase
          .from('posts')
          .select(
            'id, title, slug, view_count, created_at'
          ),

        supabase
          .from('categories')
          .select('*', {
            count: 'exact',
            head: true,
          })
          .eq('is_active', true),
      ]);

      // 글 통계
      if (postsResult.error) {
        console.error(
          '게시글 통계 불러오기 오류:',
          postsResult.error
        );
      } else {
        const posts =
          (postsResult.data || []) as Post[];

        // 전체 글 수
        setPostCount(
          posts.length
        );

        // 전체 조회수
        const views =
          posts.reduce(
            (sum, post) =>
              sum +
              (post.view_count || 0),
            0
          );

        setTotalViews(
          views
        );

        // 인기글 TOP 5
        const popular =
          [...posts]
            .sort(
              (a, b) =>
                (b.view_count || 0) -
                (a.view_count || 0)
            )
            .slice(0, 5);

        setPopularPosts(
          popular
        );
      }

      // 활성 카테고리 수
      if (categoryResult.error) {
        console.error(
          '카테고리 통계 불러오기 오류:',
          categoryResult.error
        );
      } else {
        setCategoryCount(
          categoryResult.count || 0
        );
      }

      setLoading(false);
    };

    initialize();
  }, [router]);

  const handleLogout = async () => {
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

      <div className="max-w-5xl mx-auto p-6">

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
              호행처럼 콘텐츠와 사이트 현황을 관리합니다.
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
              onClick={handleLogout}
              className="px-4 py-2.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 font-bold"
            >
              로그아웃
            </button>

          </div>

        </div>

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

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">

          {/* 전체 게시글 */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">

            <div className="text-2xl mb-3">
              📚
            </div>

            <p className="text-sm text-slate-400">
              전체 게시글
            </p>

            <p className="text-4xl font-black text-white mt-2">
              {postCount.toLocaleString('ko-KR')}
            </p>

            <p className="text-xs text-slate-500 mt-2">
              현재 등록된 글
            </p>

          </div>

          {/* 전체 조회수 */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">

            <div className="text-2xl mb-3">
              👁
            </div>

            <p className="text-sm text-slate-400">
              전체 조회수
            </p>

            <p className="text-4xl font-black text-blue-400 mt-2">
              {totalViews.toLocaleString('ko-KR')}
            </p>

            <p className="text-xs text-slate-500 mt-2">
              모든 게시글 조회수 합계
            </p>

          </div>

          {/* 활성 카테고리 */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">

            <div className="text-2xl mb-3">
              🗂
            </div>

            <p className="text-sm text-slate-400">
              활성 카테고리
            </p>

            <p className="text-4xl font-black text-emerald-400 mt-2">
              {categoryCount.toLocaleString('ko-KR')}
            </p>

            <p className="text-xs text-slate-500 mt-2">
              공개 사이트에 표시 중
            </p>

          </div>

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

          {/* 새 글 */}
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
              블로그 글 작성, 이미지 업로드, SEO 설정
            </p>

            <p className="text-sm font-bold text-blue-400 mt-5">
              글 작성하기 →
            </p>

          </Link>

          {/* 글 관리 */}
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
              발행된 글 확인, 수정 및 삭제
            </p>

            <p className="text-sm font-bold text-blue-400 mt-5">
              글 관리하기 →
            </p>

          </Link>

          {/* 카테고리 */}
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
              추가, 수정, 순서 및 활성 상태 관리
            </p>

            <p className="text-sm font-bold text-blue-400 mt-5">
              카테고리 관리 →
            </p>

          </Link>

        </div>

        {/* =================================================
            인기글
        ================================================= */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">

          <div className="p-5 border-b border-slate-800">

            <h2 className="text-lg font-black text-white">
              🔥 인기글 TOP 5
            </h2>

            <p className="text-xs text-slate-500 mt-1">
              조회수가 높은 글 순서입니다.
            </p>

          </div>

          {popularPosts.length === 0 ? (

            <div className="p-8 text-center text-slate-500">
              아직 등록된 글이 없습니다.
            </div>

          ) : (

            <div>

              {popularPosts.map(
                (post, index) => (

                  <div
                    key={post.id}
                    className="flex items-center gap-4 p-4 border-b last:border-b-0 border-slate-800"
                  >

                    {/* 순위 */}
                    <div className="w-9 h-9 shrink-0 rounded-xl bg-slate-800 flex items-center justify-center font-black text-white">
                      {index + 1}
                    </div>

                    {/* 글 제목 */}
                    <div className="min-w-0 flex-1">

                      <p className="font-bold text-white truncate">
                        {post.title}
                      </p>

                      <p className="text-xs text-slate-500 mt-1">
                        👁{' '}
                        {(post.view_count || 0).toLocaleString(
                          'ko-KR'
                        )}{' '}
                        회
                      </p>

                    </div>

                    {/* 공개 글 보기 */}
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

        </div>

      </div>

    </main>
  );
}