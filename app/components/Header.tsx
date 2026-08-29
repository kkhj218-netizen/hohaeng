"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import PwaInstallButton from "@/app/components/PwaInstallButton";
import { supabase } from "@/app/lib/supabase";
import {
  buildVisibleCategories,
  isHealthCategory,
  REQUIRED_INVESTMENT_CATEGORIES,
} from "@/app/lib/categoryNavigation";

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
        .from("categories")
        .select("id, slug, name, emoji, sort_order, is_active")
        .eq("is_active", true)
        .order("sort_order", { ascending: true });

      if (error) {
        console.error("헤더 카테고리 불러오기 오류:", error);
        return;
      }

      const activeCategories = (data || []) as Category[];
      setCategories(buildVisibleCategories(activeCategories));

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) return;

      try {
        const { data: allData, error: allError } = await supabase
          .from("categories")
          .select("id, slug, name, emoji, sort_order, is_active")
          .order("sort_order", { ascending: true });

        if (allError) {
          console.warn("카테고리 구조 확인 실패:", allError);
          return;
        }

        const allCategories = (allData || []) as Category[];

        for (const healthCategory of allCategories.filter(isHealthCategory)) {
          if (!healthCategory.is_active) continue;

          const { error: hideError } = await supabase
            .from("categories")
            .update({ is_active: false })
            .eq("id", healthCategory.id);

          if (hideError) {
            console.warn("건강 정보 카테고리 비활성화 실패:", hideError);
          }
        }

        for (const required of REQUIRED_INVESTMENT_CATEGORIES) {
          const existing = allCategories.find(
            (item) => item.slug === required.slug || item.name === required.name,
          );

          if (existing) {
            const { error: updateError } = await supabase
              .from("categories")
              .update({
                slug: required.slug,
                name: required.name,
                emoji: required.emoji,
                sort_order: required.sort_order,
                is_active: true,
              })
              .eq("id", existing.id);

            if (updateError) {
              console.warn(`${required.name} 카테고리 수정 실패:`, updateError);
            }
          } else {
            const { id: _virtualId, ...newCategory } = required;
            const { error: insertError } = await supabase
              .from("categories")
              .insert(newCategory);

            if (insertError) {
              console.warn(`${required.name} 카테고리 추가 실패:`, insertError);
            }
          }
        }

        const { data: refreshedData, error: refreshedError } = await supabase
          .from("categories")
          .select("id, slug, name, emoji, sort_order, is_active")
          .eq("is_active", true)
          .order("sort_order", { ascending: true });

        if (!refreshedError) {
          setCategories(
            buildVisibleCategories((refreshedData || []) as Category[]),
          );
        }
      } catch (syncError) {
        console.warn("카테고리 구조 자동 정리 실패:", syncError);
      }
    };

    void loadCategories();
  }, []);

  return (
    <header className="sticky top-0 z-[100] border-b border-slate-200 bg-white/95 backdrop-blur-md pointer-events-auto">
      <div className="relative z-[101] mx-auto flex h-16 max-w-5xl items-center gap-2 px-4 pointer-events-auto">
        <Link
          href="/"
          className="relative z-[102] shrink-0 whitespace-nowrap text-xl font-bold tracking-tight text-blue-600 pointer-events-auto"
        >
          HOHAENG OS
        </Link>

        <nav className="relative z-[102] ml-2 flex min-w-0 flex-1 items-center gap-1 overflow-x-auto py-2 text-sm font-medium text-slate-700 sm:gap-3 pointer-events-auto">
          <Link
            href="/money"
            className="whitespace-nowrap px-2 py-1 hover:text-blue-600 pointer-events-auto"
          >
            🧮 계산기
          </Link>

          <Link
            href="/data"
            className="whitespace-nowrap px-2 py-1 font-bold text-blue-600 hover:text-blue-700 pointer-events-auto"
          >
            📊 투자데이터
          </Link>

          <Link
            href="/blog"
            className="whitespace-nowrap px-2 py-1 hover:text-blue-600 pointer-events-auto"
          >
            📰 블로그
          </Link>

          {categories.map((category) => (
            <a
              key={category.id}
              href={`/blog?category=${encodeURIComponent(category.slug)}`}
              className="relative z-[103] shrink-0 whitespace-nowrap px-2 py-1 hover:text-blue-600 pointer-events-auto touch-manipulation"
            >
              {category.emoji || "📁"} {category.name}
            </a>
          ))}
        </nav>

        <Link
          href="/saved"
          className="relative z-[102] shrink-0 whitespace-nowrap rounded-full border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700 transition hover:bg-rose-100 pointer-events-auto"
          aria-label="내 관심 글 열기"
        >
          <span aria-hidden="true">♥</span>{" "}
          <span className="hidden lg:inline">관심 글</span>
        </Link>

        <div className="relative z-[102] pointer-events-auto">
          <PwaInstallButton />
        </div>
      </div>
    </header>
  );
}
