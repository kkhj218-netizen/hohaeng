'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

import { supabase } from '@/app/lib/supabase';
import {
  PREPARED_POSTS,
  type PreparedPost,
} from './preparedPosts';

type PostStatus = 'draft' | 'published';

type StoredPost = {
  id: string;
  slug: string;
  status: PostStatus | null;
  scheduled_at: string | null;
  published_at: string | null;
  updated_at: string | null;
};

type QueueState =
  | 'checking-auth'
  | 'syncing'
  | 'ready'
  | 'error';

function statusLabel(post: StoredPost | undefined) {
  if (!post) {
    return '준비 중';
  }

  if (post.status === 'published') {
    return '공개 완료';
  }

  if (post.scheduled_at) {
    return '예약 대기';
  }

  return '최종 검토 대기';
}

function statusClass(post: StoredPost | undefined) {
  if (!post) {
    return 'border-slate-700 bg-slate-800 text-slate-300';
  }

  if (post.status === 'published') {
    return 'border-emerald-700 bg-emerald-950/60 text-emerald-300';
  }

  if (post.scheduled_at) {
    return 'border-violet-700 bg-violet-950/60 text-violet-300';
  }

  return 'border-amber-700 bg-amber-950/60 text-amber-300';
}

export default function ContentQueuePage() {
  const router = useRouter();
  const [queueState, setQueueState] =
    useState<QueueState>('checking-auth');
  const [storedPosts, setStoredPosts] =
    useState<StoredPost[]>([]);
  const [errorMessage, setErrorMessage] =
    useState('');

  const syncPreparedPosts =
    useCallback(async () => {
      setQueueState('syncing');
      setErrorMessage('');

      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session) {
          router.replace('/admin/login');
          return;
        }

        const preparedSlugs =
          PREPARED_POSTS.map(
            (post) => post.seedSlug
          );

        const { data: existingData, error: existingError } =
          await supabase
            .from('posts')
            .select(
              'id, slug, status, scheduled_at, published_at, updated_at'
            )
            .in('slug', preparedSlugs);

        if (existingError) {
          throw existingError;
        }

        const existingPosts =
          (existingData || []) as StoredPost[];
        const existingSlugs = new Set(
          existingPosts.map((post) => post.slug)
        );
        const missingPosts =
          PREPARED_POSTS.filter(
            (post) => !existingSlugs.has(post.seedSlug)
          );

        if (missingPosts.length > 0) {
          const now = new Date().toISOString();
          const { error: insertError } =
            await supabase.from('posts').insert(
              missingPosts.map((post) => ({
                slug: post.seedSlug,
                title: post.title,
                content: post.content,
                category: post.category,
                subcategory: post.subcategory,
                description: post.description,
                seo_title: post.seoTitle,
                meta_description: post.metaDescription,
                og_image: null,
                status: 'draft',
                published_at: null,
                scheduled_at: null,
                updated_at: now,
              }))
            );

          if (insertError) {
            throw insertError;
          }
        }

        const { data: refreshedData, error: refreshedError } =
          await supabase
            .from('posts')
            .select(
              'id, slug, status, scheduled_at, published_at, updated_at'
            )
            .in('slug', preparedSlugs);

        if (refreshedError) {
          throw refreshedError;
        }

        setStoredPosts(
          (refreshedData || []) as StoredPost[]
        );
        setQueueState('ready');
      } catch (error) {
        console.error('발행 준비함 동기화 오류:', error);
        setErrorMessage(
          error instanceof Error
            ? error.message
            : '초안을 준비하지 못했습니다.'
        );
        setQueueState('error');
      }
    }, [router]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void syncPreparedPosts();
    }, 0);

    return () => {
      window.clearTimeout(timer);
    };
  }, [syncPreparedPosts]);

  const storedPostMap = useMemo(
    () =>
      new Map(
        storedPosts.map((post) => [post.slug, post])
      ),
    [storedPosts]
  );

  const publishedCount = storedPosts.filter(
    (post) => post.status === 'published'
  ).length;
  const scheduledCount = storedPosts.filter(
    (post) =>
      post.status === 'draft' &&
      Boolean(post.scheduled_at)
  ).length;
  const reviewCount = Math.max(
    0,
    PREPARED_POSTS.length -
      publishedCount -
      scheduledCount
  );

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-8 text-slate-100 sm:px-6">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-black tracking-[0.16em] text-cyan-400">
              HOHAENG CONTENT QUEUE
            </p>
            <h1 className="mt-2 text-3xl font-black text-white">
              ✅ 발행 준비함
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-400">
              8주 동안 주 3편씩 발행할 원고입니다. 글을 열어 마지막으로 확인한 뒤
              기존 편집기의 ‘공개 발행’만 누르면 됩니다.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link
              href="/admin"
              className="rounded-xl bg-slate-800 px-4 py-2.5 text-sm font-bold text-white hover:bg-slate-700"
            >
              ← 관리자 센터
            </Link>
            <Link
              href="/admin/manage"
              className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-blue-500"
            >
              전체 글 관리
            </Link>
          </div>
        </div>

        {queueState === 'syncing' ||
        queueState === 'checking-auth' ? (
          <section className="mb-8 rounded-3xl border border-cyan-800 bg-cyan-950/30 p-7 text-center">
            <p className="text-lg font-black text-cyan-200">
              24편의 완성 원고를 초안함에 준비하는 중...
            </p>
            <p className="mt-2 text-sm text-cyan-100/70">
              이미 저장된 글은 건드리지 않고 누락된 초안만 추가합니다.
            </p>
          </section>
        ) : null}

        {queueState === 'error' && (
          <section className="mb-8 rounded-3xl border border-red-800 bg-red-950/30 p-6">
            <h2 className="font-black text-red-300">
              초안을 자동으로 준비하지 못했습니다.
            </h2>
            <p className="mt-2 break-words text-sm text-red-200/80">
              {errorMessage}
            </p>
            <button
              type="button"
              onClick={() => void syncPreparedPosts()}
              className="mt-4 rounded-xl bg-red-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-red-500"
            >
              다시 준비하기
            </button>
          </section>
        )}

        <section className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <p className="text-xs font-bold text-slate-500">전체 원고</p>
            <p className="mt-2 text-3xl font-black text-white">{PREPARED_POSTS.length}</p>
          </div>
          <div className="rounded-2xl border border-amber-900 bg-slate-900 p-5">
            <p className="text-xs font-bold text-slate-500">최종 검토 대기</p>
            <p className="mt-2 text-3xl font-black text-amber-300">{reviewCount}</p>
          </div>
          <div className="rounded-2xl border border-violet-900 bg-slate-900 p-5">
            <p className="text-xs font-bold text-slate-500">예약 대기</p>
            <p className="mt-2 text-3xl font-black text-violet-300">{scheduledCount}</p>
          </div>
          <div className="rounded-2xl border border-emerald-900 bg-slate-900 p-5">
            <p className="text-xs font-bold text-slate-500">공개 완료</p>
            <p className="mt-2 text-3xl font-black text-emerald-300">{publishedCount}</p>
          </div>
        </section>

        <section className="mb-8 rounded-3xl border border-slate-800 bg-slate-900/70 p-5">
          <h2 className="font-black text-white">발행 순서</h2>
          <div className="mt-4 grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
            <div className="rounded-2xl border border-blue-900/70 bg-blue-950/30 p-4">
              <p className="font-black text-blue-300">1~4주차 · 연봉·월급</p>
              <p className="mt-2 leading-6 text-slate-400">
                연봉 6천~1억 실수령액 → 식대·부양가족 → 계약서·급여명세서
              </p>
            </div>
            <div className="rounded-2xl border border-emerald-900/70 bg-emerald-950/30 p-4">
              <p className="font-black text-emerald-300">5~8주차 · 투자 계산기</p>
              <p className="mt-2 leading-6 text-slate-400">
                복리·적립식·목표금액 → 배당금 → 평균단가·계좌 기록
              </p>
            </div>
          </div>
        </section>

        <div className="space-y-4">
          {PREPARED_POSTS.map((preparedPost) => {
            const storedPost = storedPostMap.get(
              preparedPost.seedSlug
            );

            return (
              <PreparedPostCard
                key={preparedPost.seedSlug}
                preparedPost={preparedPost}
                storedPost={storedPost}
              />
            );
          })}
        </div>
      </div>
    </main>
  );
}

function PreparedPostCard({
  preparedPost,
  storedPost,
}: {
  preparedPost: PreparedPost;
  storedPost: StoredPost | undefined;
}) {
  const published = storedPost?.status === 'published';

  return (
    <article className="rounded-3xl border border-slate-800 bg-slate-900 p-5 transition hover:border-slate-700 sm:p-6">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-center">
        <div className="flex min-w-0 flex-1 gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-slate-800 text-lg font-black text-white">
            {preparedPost.sequence}
          </div>

          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-slate-700 bg-slate-950 px-2.5 py-1 text-[11px] font-black text-slate-300">
                {preparedPost.week}주차
              </span>
              <span className="rounded-full border border-blue-900 bg-blue-950/60 px-2.5 py-1 text-[11px] font-black text-blue-300">
                {preparedPost.cluster}
              </span>
              <span
                className={`rounded-full border px-2.5 py-1 text-[11px] font-black ${statusClass(
                  storedPost
                )}`}
              >
                {statusLabel(storedPost)}
              </span>
            </div>

            <h2 className="mt-3 break-words text-lg font-black leading-7 text-white sm:text-xl">
              {preparedPost.title}
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-400">
              {preparedPost.description}
            </p>

            <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-xs font-bold text-slate-500">
              <span>키워드: {preparedPost.keyword}</span>
              <span>본문 약 {preparedPost.plainTextLength.toLocaleString('ko-KR')}자</span>
              <Link
                href={preparedPost.calculatorHref}
                target="_blank"
                className="text-cyan-400 hover:text-cyan-300"
              >
                {preparedPost.calculatorLabel} 보기 ↗
              </Link>
            </div>
          </div>
        </div>

        <div className="flex shrink-0 flex-wrap gap-2 lg:w-[230px] lg:justify-end">
          {storedPost ? (
            <>
              <Link
                href={`/admin/edit/${storedPost.id}`}
                className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-black text-white hover:bg-blue-500"
              >
                {published ? '내용 수정' : '최종 확인 →'}
              </Link>

              {published && (
                <Link
                  href={`/blog/${storedPost.slug}`}
                  target="_blank"
                  className="rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-black text-white hover:bg-emerald-600"
                >
                  공개글 보기 ↗
                </Link>
              )}
            </>
          ) : (
            <span className="rounded-xl bg-slate-800 px-4 py-2.5 text-sm font-bold text-slate-400">
              저장 대기 중
            </span>
          )}
        </div>
      </div>
    </article>
  );
}
