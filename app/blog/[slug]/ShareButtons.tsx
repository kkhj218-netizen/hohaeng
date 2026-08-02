'use client';

import { useState } from 'react';

type ShareButtonsProps = {
  title: string;
  description?: string | null;
  slug: string;
};

type ShareMessage =
  | ''
  | '공유창을 열었습니다.'
  | '링크를 복사했습니다.'
  | '공유를 지원하지 않아 링크를 복사했습니다.'
  | '링크 복사에 실패했습니다.';

export default function ShareButtons({
  title,
  description,
  slug,
}: ShareButtonsProps) {
  const [message, setMessage] =
    useState<ShareMessage>('');

  const getShareUrl = () => {
    if (typeof window === 'undefined') {
      return `/blog/${slug}`;
    }

    return `${window.location.origin}/blog/${slug}`;
  };

  const copyText = async (
    text: string
  ) => {
    if (
      navigator.clipboard &&
      window.isSecureContext
    ) {
      await navigator.clipboard.writeText(
        text
      );

      return;
    }

    const textarea =
      document.createElement(
        'textarea'
      );

    textarea.value = text;
    textarea.setAttribute(
      'readonly',
      ''
    );
    textarea.style.position =
      'fixed';
    textarea.style.opacity = '0';

    document.body.appendChild(
      textarea
    );
    textarea.select();

    const copied =
      document.execCommand('copy');

    document.body.removeChild(
      textarea
    );

    if (!copied) {
      throw new Error(
        '클립보드 복사 실패'
      );
    }
  };

  const handleNativeShare =
    async () => {
      const url = getShareUrl();

      try {
        if (navigator.share) {
          await navigator.share({
            title,
            text:
              description?.trim() ||
              title,
            url,
          });

          setMessage(
            '공유창을 열었습니다.'
          );

          return;
        }

        await copyText(url);

        setMessage(
          '공유를 지원하지 않아 링크를 복사했습니다.'
        );
      } catch (error) {
        if (
          error instanceof DOMException &&
          error.name === 'AbortError'
        ) {
          return;
        }

        console.error(
          '공유 오류:',
          error
        );

        setMessage(
          '링크 복사에 실패했습니다.'
        );
      }
    };

  const handleCopyLink =
    async () => {
      try {
        await copyText(
          getShareUrl()
        );

        setMessage(
          '링크를 복사했습니다.'
        );
      } catch (error) {
        console.error(
          '링크 복사 오류:',
          error
        );

        setMessage(
          '링크 복사에 실패했습니다.'
        );
      }
    };

  return (
    <section
      aria-labelledby="share-post-title"
      className="px-6 sm:px-12 pb-10"
    >
      <div className="border-t border-slate-100 pt-8">
        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-5 py-5 sm:px-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-black tracking-[0.08em] text-blue-600">
                SHARE
              </p>

              <h2
                id="share-post-title"
                className="mt-1 text-lg font-black text-slate-950"
              >
                이 글이 도움 됐다면 공유해 주세요
              </h2>

              <p className="mt-1 text-xs leading-5 text-slate-500">
                휴대폰에서는 카카오톡·문자·SNS를 바로 선택할 수 있습니다.
              </p>
            </div>

            <div className="flex flex-col gap-2 min-[420px]:flex-row sm:shrink-0">
              <button
                type="button"
                onClick={
                  handleNativeShare
                }
                className="inline-flex min-h-11 items-center justify-center rounded-xl bg-blue-600 px-5 py-3 text-sm font-black text-white transition-colors hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2"
              >
                📤 공유하기
              </button>

              <button
                type="button"
                onClick={
                  handleCopyLink
                }
                className="inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-black text-slate-700 transition-colors hover:border-blue-300 hover:text-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2"
              >
                🔗 링크 복사
              </button>
            </div>
          </div>

          <p
            aria-live="polite"
            className={`mt-3 min-h-5 text-xs font-bold ${
              message ===
              '링크 복사에 실패했습니다.'
                ? 'text-red-500'
                : 'text-emerald-600'
            }`}
          >
            {message}
          </p>
        </div>
      </div>
    </section>
  );
}