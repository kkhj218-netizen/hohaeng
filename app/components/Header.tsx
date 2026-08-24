"use client";

// Final header: category navigation, saved-post library, and save/install guide.

import { useEffect, useState } from "react";
import Link from "next/link";
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

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{
    outcome: "accepted" | "dismissed";
    platform: string;
  }>;
};

type DeviceType = "ios" | "android" | "pc";

export default function Header() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [isSaveOpen, setIsSaveOpen] = useState(false);
  const [device, setDevice] = useState<DeviceType>("pc");
  const [installPrompt, setInstallPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);

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

      // 관리자 로그인 상태에서만 실제 DB 카테고리도 새 구조로 맞춘다.
      // 공개 방문자에게는 쓰기 요청을 하지 않으므로 사이트 로딩과 분리되어 안전하다.
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

    loadCategories();
  }, []);

  useEffect(() => {
    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as BeforeInstallPromptEvent);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener(
        "beforeinstallprompt",
        handleBeforeInstallPrompt,
      );
    };
  }, []);

  useEffect(() => {
    if (!isSaveOpen) return;

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsSaveOpen(false);
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleEscape);

    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleEscape);
    };
  }, [isSaveOpen]);

  const openSaveGuide = () => {
    const userAgent = navigator.userAgent.toLowerCase();
    const isIos =
      /iphone|ipad|ipod/.test(userAgent) ||
      (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);

    setDevice(isIos ? "ios" : /android/.test(userAgent) ? "android" : "pc");
    setIsSaveOpen(true);
  };

  const installApp = async () => {
    if (!installPrompt) return;

    await installPrompt.prompt();
    const { outcome } = await installPrompt.userChoice;

    if (outcome === "accepted") {
      setIsSaveOpen(false);
    }

    setInstallPrompt(null);
  };

  const guide = {
    ios: {
      title: "아이폰에 저장하기",
      description: "Safari 아래쪽의 공유 버튼을 누른 뒤 진행하세요.",
      steps: [
        "공유 버튼(□↑) 누르기",
        "홈 화면에 추가 선택",
        "오른쪽 위 추가 누르기",
      ],
    },
    android: {
      title: "안드로이드에 저장하기",
      description: "Chrome 오른쪽 위 메뉴에서 홈 화면에 추가할 수 있어요.",
      steps: [
        "오른쪽 위 점 3개 누르기",
        "홈 화면에 추가 선택",
        "추가 또는 설치 누르기",
      ],
    },
    pc: {
      title: "PC 즐겨찾기에 저장하기",
      description: "키보드 단축키로 가장 빠르게 다시 찾을 수 있어요.",
      steps: ["Ctrl + D 누르기", "이름과 저장 위치 확인", "완료 버튼 누르기"],
    },
  }[device];

  return (
    <>
      <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-5xl items-center gap-2 px-4">
          <Link
            href="/"
            className="shrink-0 whitespace-nowrap text-xl font-bold tracking-tight text-blue-600"
          >
            HOHAENG OS
          </Link>

          <nav className="ml-2 flex min-w-0 flex-1 items-center gap-1 overflow-x-auto py-2 text-sm font-medium text-slate-700 sm:gap-3">
            <Link
              href="/money"
              className="whitespace-nowrap px-2 py-1 hover:text-blue-600"
            >
              🧮 계산기
            </Link>

            <Link
              href="/data"
              className="whitespace-nowrap px-2 py-1 font-bold text-blue-600 hover:text-blue-700"
            >
              📊 투자데이터
            </Link>

            <Link
              href="/blog"
              className="whitespace-nowrap px-2 py-1 hover:text-blue-600"
            >
              📰 블로그
            </Link>

            {categories.map((category) => (
              <Link
                key={category.id}
                href={`/blog?category=${category.slug}`}
                className="whitespace-nowrap px-2 py-1 hover:text-blue-600"
              >
                {category.emoji || "📁"} {category.name}
              </Link>
            ))}
          </nav>

          <Link
            href="/saved"
            className="shrink-0 whitespace-nowrap rounded-full border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700 transition hover:bg-rose-100"
            aria-label="내 관심 글 열기"
          >
            <span aria-hidden="true">♥</span>{" "}
            <span className="hidden lg:inline">관심 글</span>
          </Link>

          <button
            type="button"
            onClick={openSaveGuide}
            className="shrink-0 rounded-full bg-blue-600 px-3 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            aria-haspopup="dialog"
          >
            <span aria-hidden="true">💾</span>{" "}
            <span className="hidden sm:inline">호행 저장하기</span>
            <span className="sm:hidden">저장</span>
          </button>
        </div>
      </header>

      {isSaveOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-end justify-center bg-slate-950/60 p-4 sm:items-center"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setIsSaveOpen(false);
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="save-hohaeng-title"
            className="w-full max-w-md rounded-3xl bg-white p-6 text-slate-900 shadow-2xl"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="mb-1 text-sm font-semibold text-blue-600">
                  호행처럼을 다시 쉽게 만나세요
                </p>
                <h2 id="save-hohaeng-title" className="text-xl font-bold">
                  {installPrompt ? "앱처럼 설치하기" : guide.title}
                </h2>
              </div>

              <button
                type="button"
                onClick={() => setIsSaveOpen(false)}
                className="rounded-full p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                aria-label="저장 안내 닫기"
              >
                ✕
              </button>
            </div>

            {installPrompt ? (
              <div className="mt-5">
                <p className="text-sm leading-6 text-slate-600">
                  홈 화면에 추가하면 주소를 다시 검색하지 않고 바로 들어올 수
                  있어요.
                </p>
                <button
                  type="button"
                  onClick={installApp}
                  className="mt-5 w-full rounded-xl bg-blue-600 px-4 py-3 font-bold text-white transition hover:bg-blue-700"
                >
                  지금 설치하기
                </button>
              </div>
            ) : (
              <div className="mt-5">
                <p className="text-sm leading-6 text-slate-600">
                  {guide.description}
                </p>

                <ol className="mt-4 space-y-3">
                  {guide.steps.map((step, index) => (
                    <li
                      key={step}
                      className="flex items-center gap-3 rounded-xl bg-slate-50 px-4 py-3 text-sm font-medium"
                    >
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-100 font-bold text-blue-700">
                        {index + 1}
                      </span>
                      {step}
                    </li>
                  ))}
                </ol>

                {device === "ios" && (
                  <p className="mt-4 rounded-xl bg-amber-50 px-4 py-3 text-xs leading-5 text-amber-800">
                    Chrome이 아니라 Safari에서 열어야 ‘홈 화면에 추가’가 보여요.
                  </p>
                )}
              </div>
            )}
          </section>
        </div>
      )}
    </>
  );
}
