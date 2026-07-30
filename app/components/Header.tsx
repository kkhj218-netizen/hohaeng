'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/app/lib/supabase';

type Category = {
  id: number;
  slug: string;
  name: string;
  emoji: string | null;
  sort_order: number;
  is_active: boolean;
};

export default function Header() {
  const [categories, setCategories] = useState<Category[]>([]);

  useEffect(() => {
    const loadCategories = async () => {
      const { data, error } = await supabase
        .from('categories')
        .select(
          'id, slug, name, emoji, sort_order, is_active'
        )
        .eq('is_active', true)
        .order('sort_order', {
          ascending: true,
        });

      if (error) {
        console.error(
          '헤더 카테고리 불러오기 오류:',
          error
        );

        return;
      }

      setCategories(
        (data || []) as Category[]
      );
    };

    loadCategories();
  }, []);

  return (
    <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-200">
      <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">

        {/* 로고 */}
        <Link
          href="/"
          className="font-bold text-xl text-blue-600 tracking-tight whitespace-nowrap"
        >
          HOHAENG OS
        </Link>

        {/* 상단 메뉴 */}
        <nav className="flex items-center gap-1 sm:gap-3 text-sm font-medium text-slate-700 overflow-x-auto py-2 ml-4">

          {/* 계산기는 고정 메뉴 */}
          <Link
            href="/"
            className="hover:text-blue-600 whitespace-nowrap px-2 py-1"
          >
            🧮 계산기
          </Link>

          {/* DB 카테고리 자동 생성 */}
          {categories.map((category) => (
            <Link
              key={category.id}
              href={`/blog?category=${category.slug}`}
              className="hover:text-blue-600 whitespace-nowrap px-2 py-1"
            >
              {category.emoji || '📁'}{' '}
              {category.name}
            </Link>
          ))}

        </nav>

      </div>
    </header>
  );
}