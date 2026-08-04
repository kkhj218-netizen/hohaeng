"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

const STORAGE_KEY = "hohaeng-recently-viewed-v1";
const MAX_SAVED_POSTS = 10;
const MAX_VISIBLE_POSTS = 5;

type RecentPost = {
  slug: string;
  title: string;
  description: string | null;
  category: string | null;
  categoryLabel: string;
  categoryEmoji: string;
  image: string | null;
  viewedAt: number;
};

type RecentlyViewedPostsProps = {
  currentPost: Omit<RecentPost, "viewedAt">;
};

function readSavedPosts(): RecentPost[] {
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);

    if (!saved) {
      return [];
    }

    const parsed: unknown = JSON.parse(saved);

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.filter(
      (item): item is RecentPost =>
        typeof item === "object" &&
        item !== null &&
        typeof (item as RecentPost).slug === "string" &&
        typeof (item as RecentPost).title === "string" &&
        typeof (item as RecentPost).viewedAt === "number",
    );
  } catch {
    return [];
  }
}

export default function RecentlyViewedPosts({
  currentPost,
}: RecentlyViewedPostsProps) {
  const [recentPosts, setRecentPosts] = useState<RecentPost[]>([]);

  useEffect(() => {
    const savedPosts = readSavedPosts();
    const otherPosts = savedPosts.filter(
      (savedPost) => savedPost.slug !== currentPost.slug,
    );

    setRecentPosts(otherPosts.slice(0, MAX_VISIBLE_POSTS));

    const nextPosts: RecentPost[] = [
      {
        ...currentPost,
        viewedAt: Date.now(),
      },
      ...otherPosts,
    ].slice(0, MAX_SAVED_POSTS);

    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(nextPosts));
    } catch {
      // 저장 공간이 차 있거나 차단된 경우에도 글 읽기는 그대로 유지합니다.
    }
  }, [currentPost]);

  const clearRecentPosts = () => {
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      // 브라우저 저장소가 차단된 경우 화면만 정리합니다.
    }

    setRecentPosts([]);
  };

  if (recentPosts.length === 0) {
    return null;
  }

  return (
    <section
      aria-labelledby="recently-viewed-title"
      className="px-6 sm:px-12 pb-10"
    >
      <div className="border-t border-slate-100 pt-9">
        <div className="mb-5 flex items-end justify-between gap-4">
          <div>
            <p className="text-xs font-black tracking-[0.08em] text-emerald-600">
              RECENTLY VIEWED
            </p>
            <h2
              id="recently-viewed-title"
              className="mt-1 text-xl font-black text-slate-950 sm:text-2xl"
            >
              최근 본 글
            </h2>
          </div>

          <button
            type="button"
            onClick={clearRecentPosts}
            className="shrink-0 text-xs font-bold text-slate-400 transition-colors hover:text-slate-700"
          >
            기록 지우기
          </button>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {recentPosts.map((recentPost) => (
            <Link
              key={recentPost.slug}
              href={`/blog/${recentPost.slug}`}
              className="group flex min-w-0 gap-4 overflow-hidden rounded-2xl border border-slate-200 bg-white p-3 transition-all hover:border-emerald-300 hover:shadow-md"
            >
              <div className="h-20 w-24 shrink-0 overflow-hidden rounded-xl bg-gradient-to-br from-slate-100 to-emerald-50">
                {recentPost.image ? (
                  <img
                    src={recentPost.image}
                    alt=""
                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-2xl">
                    {recentPost.categoryEmoji || "🌱"}
                  </div>
                )}
              </div>

              <div className="min-w-0 py-1">
                <p className="text-[11px] font-black text-emerald-600">
                  {recentPost.categoryEmoji || "📁"}{" "}
                  {recentPost.categoryLabel || recentPost.category || "블로그"}
                </p>
                <h3 className="mt-1 line-clamp-2 break-words text-sm font-black leading-5 text-slate-900 transition-colors group-hover:text-emerald-700">
                  {recentPost.title}
                </h3>
                <p className="mt-1 text-xs font-bold text-slate-400">
                  다시 읽기 →
                </p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}