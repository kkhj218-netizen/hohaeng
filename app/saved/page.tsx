"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

const STORAGE_KEY = "hohaeng-saved-posts-v1";

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

function readSavedPosts(): SavedPost[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];

    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    return parsed
      .filter(
        (item): item is SavedPost =>
          typeof item === "object" &&
          item !== null &&
          typeof (item as SavedPost).slug === "string" &&
          typeof (item as SavedPost).title === "string" &&
          typeof (item as SavedPost).savedAt === "number",
      )
      .sort((a, b) => b.savedAt - a.savedAt);
  } catch {
    return [];
  }
}

export default function SavedPostsLibrary() {
  const [savedPosts, setSavedPosts] = useState<SavedPost[]>([]);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    setSavedPosts(readSavedPosts());
    setIsReady(true);
  }, []);

  const writeSavedPosts = (nextPosts: SavedPost[]) => {
    setSavedPosts(nextPosts);
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(nextPosts));
    } catch {
      // 저장 공간이 차단돼도 화면은 계속 동작합니다.
    }
  };

  const removePost = (slug: string) => {
    writeSavedPosts(savedPosts.filter((post) => post.slug !== slug));
  };

  if (!isReady) {
    return <div className="h-48 animate-pulse rounded-3xl bg-slate-100" />;
  }

  if (savedPosts.length === 0) {
    return (
      <section className="rounded-3xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center">
        <div className="text-5xl" aria-hidden="true">
          ♡
        </div>
        <h2 className="mt-4 text-xl font-black text-slate-900">
          아직 저장한 글이 없어요
        </h2>
        <p className="mt-2 text-sm leading-6 text-slate-500">
          글을 읽다가 ‘이 글 관심 저장’을 누르면 이곳에 모아드려요.
        </p>
        <Link
          href="/blog"
          className="mt-6 inline-flex rounded-xl bg-blue-600 px-5 py-3 text-sm font-black text-white hover:bg-blue-700"
        >
          글 둘러보기
        </Link>
      </section>
    );
  }

  return (
    <section>
      <div className="mb-5 flex items-center justify-between gap-4">
        <p className="text-sm font-bold text-slate-500">
          총 {savedPosts.length}개의 관심 글
        </p>
        <button
          type="button"
          onClick={() => {
            if (window.confirm("저장한 관심 글을 모두 지울까요?"))
              writeSavedPosts([]);
          }}
          className="rounded-lg px-3 py-2 text-xs font-black text-slate-500 hover:bg-rose-50 hover:text-rose-700"
        >
          전체 비우기
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {savedPosts.map((post) => (
          <article
            key={post.slug}
            className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:border-rose-300 hover:shadow-md"
          >
            <Link
              href={`/blog/${post.slug}`}
              className="absolute inset-0 z-0"
              aria-label={`${post.title} 읽기`}
            />
            <div className="aspect-[16/8] overflow-hidden bg-gradient-to-br from-slate-100 to-rose-50">
              {post.image ? (
                <img
                  src={post.image}
                  alt=""
                  className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                />
              ) : (
                <div className="flex h-full items-center justify-center text-5xl">
                  {post.categoryEmoji || "🌱"}
                </div>
              )}
            </div>
            <div className="p-5 pr-12">
              <p className="text-xs font-black text-rose-600">
                {post.categoryEmoji || "📁"}{" "}
                {post.categoryLabel || post.category || "블로그"}
              </p>
              <h2 className="mt-2 line-clamp-2 text-lg font-black leading-7 text-slate-950 group-hover:text-rose-700">
                {post.title}
              </h2>
              {post.description && (
                <p className="mt-2 line-clamp-2 text-sm leading-6 text-slate-500">
                  {post.description}
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={() => removePost(post.slug)}
              className="absolute right-3 top-3 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-white/90 font-black text-slate-500 shadow hover:bg-rose-50 hover:text-rose-700"
              aria-label={`${post.title} 관심 목록에서 삭제`}
              title="관심 목록에서 삭제"
            >
              ×
            </button>
          </article>
        ))}
      </div>
    </section>
  );
}