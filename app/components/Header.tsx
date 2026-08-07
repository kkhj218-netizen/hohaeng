"use client";

// Final header: category navigation, saved-post library, and save/install guide.

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/app/lib/supabase";

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

      setCategories((data || []) as Category[]);
    };

    loadCategories();
  }, []);

  useEffect(() => {
    const userAgent = navigator.userAgent.toLowerCase();
    const isIos =
      /iphone|ipad|ipod/.test(userAgent) ||
      (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);

    if (isIos) {
      setDevice("ios");
    } else if (/android/.test(userAgent)) {
      setDevice("android");
    } else {
      setDevice("pc");
    }

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
              href="/tools"
              className="whitespace-nowrap px-2 py-1 hover:text-blue-600"
            >
              🧮 계산기
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
            onClick={() => setIsSaveOpen(true)}
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