'use client';

import { useEffect, useState } from 'react';

type LocateStatus = 'idle' | 'finding' | 'found' | 'not-found';

type TargetKind = 'h1' | 'missing-alt' | 'broken-link' | 'long-paragraph' | 'editor';

function getTargetElement(kind: TargetKind, index: number, value: string) {
  const editor = document.querySelector<HTMLElement>('.ProseMirror');
  if (!editor) return null;

  if (kind === 'editor') return editor;

  if (kind === 'h1') {
    return editor.querySelectorAll<HTMLElement>('h1')[index] || null;
  }

  if (kind === 'missing-alt') {
    const images = [...editor.querySelectorAll<HTMLImageElement>('img')]
      .filter((image) => !(image.getAttribute('alt') || '').trim());

    if (value) {
      const exact = images.find((image) => image.getAttribute('src') === value);
      if (exact) return exact;
    }
    return images[index] || null;
  }

  if (kind === 'broken-link') {
    const links = [...editor.querySelectorAll<HTMLAnchorElement>('a[href]')];
    if (value) {
      const exact = links.find((link) => {
        const raw = link.getAttribute('href') || '';
        return raw === value || link.href === value;
      });
      if (exact) return exact;
    }
    return links[index] || null;
  }

  const longParagraphs = [...editor.querySelectorAll<HTMLElement>('p')]
    .filter((paragraph) => (paragraph.textContent || '').trim().length >= 450);
  return longParagraphs[index] || null;
}

function highlightElement(element: HTMLElement) {
  const previous = {
    outline: element.style.outline,
    outlineOffset: element.style.outlineOffset,
    boxShadow: element.style.boxShadow,
    borderRadius: element.style.borderRadius,
  };

  element.scrollIntoView({ behavior: 'smooth', block: 'center' });
  element.style.outline = '3px solid rgb(245 158 11)';
  element.style.outlineOffset = '6px';
  element.style.boxShadow = '0 0 0 10px rgb(245 158 11 / 0.16)';
  element.style.borderRadius = '8px';

  window.setTimeout(() => {
    element.style.outline = previous.outline;
    element.style.outlineOffset = previous.outlineOffset;
    element.style.boxShadow = previous.boxShadow;
    element.style.borderRadius = previous.borderRadius;
  }, 9000);
}

export default function AdminSeoLocator() {
  const [status, setStatus] = useState<LocateStatus>('idle');
  const [preview, setPreview] = useState('');

  useEffect(() => {
    if (!window.location.pathname.startsWith('/admin/edit/')) return;

    const params = new URLSearchParams(window.location.search);
    const issue = params.get('seoIssue');
    const kind = params.get('seoTarget') as TargetKind | null;
    if (!issue || !kind) return;

    const parsedIndex = Number.parseInt(params.get('seoTargetIndex') || '0', 10);
    const index = Number.isFinite(parsedIndex) && parsedIndex >= 0 ? parsedIndex : 0;
    const value = params.get('seoTargetValue') || '';
    setPreview(params.get('seoTargetPreview') || '');
    setStatus('finding');

    let attempts = 0;
    let timer: ReturnType<typeof setInterval> | null = null;

    const tryLocate = () => {
      attempts += 1;
      const element = getTargetElement(kind, index, value);

      if (element) {
        if (timer) window.clearInterval(timer);
        highlightElement(element);
        setStatus('found');
        return;
      }

      if (attempts >= 50) {
        if (timer) window.clearInterval(timer);
        setStatus('not-found');
      }
    };

    timer = window.setInterval(tryLocate, 250);
    tryLocate();

    return () => {
      if (timer) window.clearInterval(timer);
    };
  }, []);

  if (status === 'idle') return null;

  return (
    <div className="fixed left-1/2 top-4 z-[9999] w-[min(92vw,640px)] -translate-x-1/2 rounded-2xl border border-amber-400/40 bg-slate-950/95 px-4 py-3 shadow-2xl backdrop-blur">
      <div className="flex items-start gap-3">
        <span className="text-lg">📍</span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-black text-amber-200">
            {status === 'finding' && 'SEO 문제 위치를 찾는 중입니다...'}
            {status === 'found' && 'SEO 문제 위치로 이동했습니다.'}
            {status === 'not-found' && '문제 위치를 자동으로 찾지 못했습니다.'}
          </p>
          {preview && <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-300">{preview}</p>}
          {status === 'found' && <p className="mt-1 text-[11px] text-slate-500">노란 테두리로 표시된 부분을 확인해 주세요. 강조 표시는 잠시 후 사라집니다.</p>}
          {status === 'not-found' && <p className="mt-1 text-[11px] text-slate-500">글이 수정된 뒤라 위치 정보가 달라졌을 수 있습니다. 글 관리에서 SEO 검사를 다시 실행해 주세요.</p>}
        </div>
        <button type="button" onClick={() => setStatus('idle')} className="rounded-lg px-2 py-1 text-xs font-bold text-slate-400 hover:bg-slate-800 hover:text-white" aria-label="안내 닫기">✕</button>
      </div>
    </div>
  );
}
