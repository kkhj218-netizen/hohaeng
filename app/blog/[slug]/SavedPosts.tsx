"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

const STORAGE_KEY = "hohaeng-saved-posts-v1";
const MAX_SAVED_POSTS = 20;

type SavedPost = {
  slug: string;
  title: string;
  description: string | null;
  category: string | null;
  categoryLabel: string;
  categoryEmoji: string;
  image: string | null;
  savedAt: number;
};

type SavedPostsProps = {
  currentPost: Omit<SavedPost, "savedAt">;
};

function readSavedPosts(): SavedPost[] {
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);

    if (!saved) return [];

    const parsed: unknown = JSON.parse(saved);

    if (!Array.isArray(parsed)) return [];

    return parsed.filter(
      (item): item is SavedPost =>
        typeof item === "object" &&
        item !== null &&
        typeof (item as SavedPost).slug === "string" &&
        typeof (item as SavedPost).title === "string" &&
        typeof (item as SavedPost).savedAt === "number",
    );
  } catch {
    return [];
  }
}

export default function SavedPosts({ currentPost }: SavedPostsProps) {
  const [savedPosts, setSavedPosts] = useState<SavedPost[]>([]);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    setSavedPosts(readSavedPosts());
    setIsReady(true);
  }, []);

  const isSaved = savedPosts.some((post) => post.slug === currentPost.slug);

  const writeSavedPosts = (nextPosts: SavedPost[]) => {
    setSavedPosts(nextPosts);

    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(nextPosts));
    } catch {
      // 저장 공간이 차단돼도 글 읽기와 화면 동작은 유지합니다.
    }
  };

  const toggleCurrentPost = () => {
    if (isSaved) {
      writeSavedPosts(
        savedPosts.filter((savedPost) => savedPost.slug !== currentPost.slug),
      );
      return;
    }

    writeSavedPosts(
      [
        { ...currentPost, savedAt: Date.now() },
        ...savedPosts.filter(
          (savedPost) => savedPost.slug !== currentPost.slug,
        ),
      ].slice(0, MAX_SAVED_POSTS),
    );
  };

  const removeSavedPost = (slug: string) => {
    writeSavedPosts(savedPosts.filter((savedPost) => savedPost.slug !== slug));
  };

  return (
    <section
      aria-labelledby="saved-posts-title"
      className="px-6 sm:px-12 pb-10"
    >
      <div className="border-t border-slate-100 pt-9">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-black tracking-[0.08em] text-rose-600">
              MY FAVORITES
            </p>
            <h2
              id="saved-posts-title"
              className="mt-1 text-xl font-black text-slate-950 sm:text-2xl"
            >
              내 관심 글
            </h2>
            <p className="mt-1 text-sm font-medium text-slate-500">
              마음에 든 글을 이 기기에 모아두고 다시 읽어보세요.
            </p>
          </div>

          <button
            type="button"
            onClick={toggleCurrentPost}
            disabled={!isReady}
            aria-pressed={isSaved}
            className={`shrink-0 rounded-xl px-5 py-3 text-sm font-black transition-all disabled:cursor-wait disabled:opacity-60 ${
              isSaved
                ? "border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100"
                : "bg-slate-950 text-white hover:bg-rose-600"
            }`}
          >
            {isSaved ? "♥ 관심 글 저장됨" : "♡ 이 글 관심 저장"}
          </button>
        </div>

        {isReady && savedPosts.length > 0 && (
          <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {savedPosts.map((savedPost) => (
              <div
                key={savedPost.slug}
                className="group relative flex min-w-0 gap-4 overflow-hidden rounded-2xl border border-slate-200 bg-white p-3 pr-10 transition-all hover:border-rose-300 hover:shadow-md"
              >
                <Link
                  href={`/blog/${savedPost.slug}`}
                  className="absolute inset-0 z-0"
                  aria-label={`${savedPost.title} 읽기`}
                />

                <div className="pointer-events-none h-20 w-24 shrink-0 overflow-hidden rounded-xl bg-gradient-to-br from-slate-100 to-rose-50">
                  {savedPost.image ? (
                    <img
                      src={savedPost.image}
                      alt=""
                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-2xl">
                      {savedPost.categoryEmoji || "🌱"}
                    </div>
                  )}
                </div>

                <div className="pointer-events-none min-w-0 py-1">
                  <p className="text-[11px] font-black text-rose-600">
                    {savedPost.categoryEmoji || "📁"}{" "}
                    {savedPost.categoryLabel || savedPost.category || "블로그"}
                  </p>
                  <h3 className="mt-1 line-clamp-2 break-words text-sm font-black leading-5 text-slate-900 transition-colors group-hover:text-rose-700">
                    {savedPost.title}
                  </h3>
                  <p className="mt-1 text-xs font-bold text-slate-400">
                    저장한 글 읽기 →
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => removeSavedPost(savedPost.slug)}
                  className="absolute right-3 top-3 z-10 flex h-7 w-7 items-center justify-center rounded-full bg-slate-100 text-xs font-black text-slate-500 transition-colors hover:bg-rose-100 hover:text-rose-700"
                  aria-label={`${savedPost.title} 관심 목록에서 삭제`}
                  title="관심 목록에서 삭제"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}