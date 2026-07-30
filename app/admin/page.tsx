'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/app/lib/supabase';

export default function AdminHomePage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [postCount, setPostCount] = useState(0);
  const [categoryCount, setCategoryCount] = useState(0);

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

      // 글 개수
      const { count: posts } = await supabase
        .from('posts')
        .select('*', {
          count: 'exact',
          head: true,
        });

      // 활성 카테고리 개수
      const { count: categories } = await supabase
        .from('categories')
        .select('*', {
          count: 'exact',
          head: true,
        })
        .eq('is_active', true);

      setPostCount(posts || 0);
      setCategoryCount(categories || 0);

      setLoading(false);
    };

    initialize();
  }, [router]);

  const handleLogout = async () => {
    await supabase.auth.signOut();

    router.replace('/admin/login');
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-950 flex items-center justify-center">
        <p className="text-white font-bold">
          관리자 화면 불러오는 중...
        </p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">

      <div className="max-w-5xl mx-auto p-6">

        {/* 상단 */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-10">

          <div>
            <p className="text-xs text-blue-400 font-bold mb-1">
              HOHAENG ADMIN
            </p>

            <h1 className="text-3xl font-black text-white">
              ⚙️ 관리자 센터
            </h1>

            <p className="text-sm text-slate-400 mt-2">
              호행처럼 콘텐츠와 카테고리를 관리합니다.
            </p>
          </div>

          <div className="flex gap-2">

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

        {/* 현황 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
            <p className="text-sm text-slate-400">
              전체 게시글
            </p>

            <p className="text-4xl font-black text-white mt-2">
              {postCount}
            </p>

            <p className="text-xs text-slate-500 mt-2">
              현재 발행된 글
            </p>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
            <p className="text-sm text-slate-400">
              활성 카테고리
            </p>

            <p className="text-4xl font-black text-white mt-2">
              {categoryCount}
            </p>

            <p className="text-xs text-slate-500 mt-2">
              공개 사이트에 표시 중
            </p>
          </div>

        </div>

        {/* 관리 메뉴 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

          <Link
            href="/admin/write"
            className="group bg-slate-900 border border-slate-800 hover:border-blue-500 rounded-2xl p-6 transition-all"
          >
            <div className="text-3xl mb-4">
              ✍️
            </div>

            <h2 className="text-lg font-black text-white">
              새 글 작성
            </h2>

            <p className="text-sm text-slate-400 mt-2">
              블로그 글 작성, 이미지 업로드, SEO 설정
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

            <h2 className="text-lg font-black text-white">
              글 관리
            </h2>

            <p className="text-sm text-slate-400 mt-2">
              발행된 글 확인, 수정 및 삭제
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

            <h2 className="text-lg font-black text-white">
              카테고리 관리
            </h2>

            <p className="text-sm text-slate-400 mt-2">
              카테고리 추가, 수정, 순서 및 활성화 관리
            </p>

            <p className="text-sm font-bold text-blue-400 mt-5">
              카테고리 관리 →
            </p>
          </Link>

        </div>

      </div>

    </main>
  );
}