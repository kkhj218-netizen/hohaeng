'use client';

import { useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';

import { supabase } from '@/app/lib/supabase';
import {
  buildSeoSlugSuggestions,
  normalizeSeoSlug,
} from '@/app/lib/seoSlugSuggestions';

type SlugStatus = 'idle' | 'checking' | 'available' | 'taken' | 'error';

export default function AdminEditSlugControl() {
  const pathname = usePathname();
  const router = useRouter();
  const postId = useMemo(() => {
    const match = pathname.match(/^\/admin\/edit\/([^/]+)/);
    return match?.[1] ? decodeURIComponent(match[1]) : null;
  }, [pathname]);

  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<string | null>(null);
  const [subcategory, setSubcategory] = useState<string | null>(null);
  const [postStatus, setPostStatus] = useState<'draft' | 'published'>('draft');
  const [originalSlug, setOriginalSlug] = useState('');
  const [slug, setSlug] = useState('');
  const [status, setStatus] = useState<SlugStatus>('idle');
  const [message, setMessage] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);

  const slugSuggestions = useMemo(
    () => buildSeoSlugSuggestions(title, { category, subcategory }),
    [category, subcategory, title]
  );

  useEffect(() => {
    if (!postId) return;

    const params = new URLSearchParams(window.location.search);
    if (params.get('openSlug') === '1') {
      setOpen(true);
      setShowSuggestions(true);
    }
  }, [pathname, postId]);

  useEffect(() => {
    if (!postId) {
      setOpen(false);
      return;
    }

    let active = true;

    const load = async () => {
      setLoading(true);
      setMessage('');

      const { data, error } = await supabase
        .from('posts')
        .select('id, title, slug, status, category, subcategory')
        .eq('id', postId)
        .single();

      if (!active) return;

      if (error || !data) {
        setMessage('⚠ Slug 정보를 불러오지 못했습니다.');
        setLoading(false);
        return;
      }

      setTitle(data.title || '');
      setCategory(data.category || null);
      setSubcategory(data.subcategory || null);
      setPostStatus(data.status === 'published' ? 'published' : 'draft');
      setOriginalSlug(data.slug || '');
      setSlug(data.slug || '');
      setStatus('idle');
      setLoading(false);
    };

    void load();

    return () => {
      active = false;
    };
  }, [postId]);

  if (!postId) return null;

  const checkAvailability = async (value = slug) => {
    const normalized = normalizeSeoSlug(value);
    setSlug(normalized);

    if (!normalized) {
      setStatus('idle');
      setMessage('Slug를 입력해주세요.');
      return false;
    }

    setStatus('checking');
    setMessage('중복 여부를 확인하고 있습니다...');

    const { data, error } = await supabase
      .from('posts')
      .select('id')
      .eq('slug', normalized)
      .neq('id', postId)
      .limit(1);

    if (error) {
      setStatus('error');
      setMessage('⚠ 중복 확인에 실패했습니다.');
      return false;
    }

    if ((data || []).length > 0) {
      setStatus('taken');
      setMessage('⚠ 이미 사용 중인 Slug입니다.');
      return false;
    }

    setStatus('available');
    setMessage('✓ 사용할 수 있는 Slug입니다.');
    return true;
  };

  const chooseSuggestion = (suggestion: string) => {
    setSlug(suggestion);
    setStatus('idle');
    setMessage('추천 Slug를 선택했습니다. 저장 전 중복 확인을 권장합니다.');
  };

  const handleSave = async () => {
    const normalized = normalizeSeoSlug(slug);
    setSlug(normalized);

    if (!normalized) {
      setMessage('Slug를 입력해주세요.');
      return;
    }

    if (normalized === originalSlug) {
      setStatus('available');
      setMessage('현재 저장된 주소와 같습니다.');
      return;
    }

    const available = await checkAvailability(normalized);
    if (!available) return;

    if (postStatus === 'published') {
      const confirmed = window.confirm(
        `공개된 글의 주소를 바꾸면 기존 링크가 더 이상 열리지 않을 수 있습니다.\n\n기존: /blog/${originalSlug}\n변경: /blog/${normalized}\n\n그래도 변경할까요?`
      );

      if (!confirmed) return;
    }

    try {
      setSaving(true);
      setMessage('');

      const { error } = await supabase
        .from('posts')
        .update({
          slug: normalized,
          updated_at: new Date().toISOString(),
        })
        .eq('id', postId);

      if (error) throw error;

      setOriginalSlug(normalized);
      setSlug(normalized);
      setStatus('available');
      setMessage('✓ Slug가 저장되었습니다.');
      router.refresh();
    } catch (error: any) {
      console.error('Slug 수정 실패:', error);
      setStatus('error');
      setMessage(`⚠ 저장 실패: ${error?.message || '다시 시도해주세요.'}`);
    } finally {
      setSaving(false);
    }
  };

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-4 left-4 z-[70] rounded-full border border-blue-700 bg-slate-950/95 px-4 py-2.5 text-xs font-black text-blue-300 shadow-xl backdrop-blur hover:border-blue-400 hover:text-blue-200 sm:bottom-6 sm:left-6"
      >
        🔗 SEO 주소 수정
      </button>
    );
  }

  return (
    <div className="fixed bottom-4 left-4 right-4 z-[80] max-h-[82vh] overflow-y-auto rounded-2xl border border-blue-800 bg-slate-950/98 p-4 text-slate-100 shadow-2xl backdrop-blur sm:bottom-6 sm:left-6 sm:right-auto sm:w-[460px]">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-black uppercase tracking-[0.12em] text-blue-400">SEO URL</p>
          <h2 className="mt-1 text-base font-black text-white">🔗 글 주소 Slug 수정</h2>
          {title && <p className="mt-1 line-clamp-1 text-xs text-slate-500">{title}</p>}
        </div>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="rounded-lg px-2 py-1 text-sm font-bold text-slate-500 hover:bg-slate-800 hover:text-white"
          aria-label="Slug 수정 닫기"
        >
          ✕
        </button>
      </div>

      {loading ? (
        <p className="mt-4 text-sm font-bold text-slate-400">주소를 불러오는 중...</p>
      ) : (
        <>
          <div className="mt-4 rounded-xl border border-slate-800 bg-slate-900/70 p-3">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] font-bold text-slate-500">현재 저장 주소</span>
              <span className={`rounded-full px-2 py-0.5 text-[10px] font-black ${postStatus === 'published' ? 'bg-emerald-500/10 text-emerald-300' : 'bg-amber-500/10 text-amber-300'}`}>
                {postStatus === 'published' ? '공개 글' : '초안'}
              </span>
            </div>
            <p className="mt-1 break-all text-xs font-bold text-slate-200">/blog/{originalSlug}</p>
          </div>

          <label className="mt-4 block text-xs font-black text-blue-300">수정할 Slug</label>
          <div className="mt-2 flex overflow-hidden rounded-xl border border-slate-700 bg-slate-900 focus-within:border-blue-500">
            <span className="hidden shrink-0 items-center pl-3 text-xs text-slate-600 sm:flex">/blog/</span>
            <input
              type="text"
              value={slug}
              maxLength={80}
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              onChange={(event) => {
                setSlug(normalizeSeoSlug(event.target.value));
                setStatus('idle');
                setMessage('');
              }}
              className="min-w-0 flex-1 bg-transparent px-3 py-3 text-sm font-bold text-white outline-none"
              placeholder="예: japan-rate-nasdaq"
            />
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setShowSuggestions((current) => !current)}
              disabled={!title.trim() || slugSuggestions.length === 0}
              className="rounded-lg border border-violet-700 bg-violet-950/30 px-3 py-2 text-[11px] font-black text-violet-200 hover:border-violet-500 disabled:opacity-40"
            >
              ✨ 짧은 SEO Slug 추천
            </button>
            <button
              type="button"
              onClick={() => void checkAvailability()}
              disabled={!slug.trim() || status === 'checking'}
              className="rounded-lg border border-blue-800 bg-blue-950/50 px-3 py-2 text-[11px] font-black text-blue-200 hover:bg-blue-900/50 disabled:opacity-40"
            >
              {status === 'checking' ? '확인 중...' : '중복 확인'}
            </button>
          </div>

          {showSuggestions && slugSuggestions.length > 0 && (
            <div className="mt-3 rounded-xl border border-violet-800/60 bg-violet-950/20 p-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-[11px] font-black text-violet-200">제목 핵심어 기준 추천 3개</p>
                <span className="text-[10px] font-bold text-slate-500">클릭하면 입력</span>
              </div>
              <div className="mt-2 grid gap-2">
                {slugSuggestions.map((suggestion, index) => (
                  <button
                    key={suggestion}
                    type="button"
                    onClick={() => chooseSuggestion(suggestion)}
                    className={`flex items-center justify-between gap-3 rounded-lg border px-3 py-2 text-left text-xs font-bold transition-colors ${slug === suggestion ? 'border-violet-400 bg-violet-500/15 text-white' : 'border-slate-700 bg-slate-950/70 text-slate-200 hover:border-violet-600'}`}
                  >
                    <span className="min-w-0 break-all">{index + 1}. /blog/{suggestion}</span>
                    {index === 0 && <span className="shrink-0 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[9px] font-black text-emerald-300">추천</span>}
                  </button>
                ))}
              </div>
              <p className="mt-2 text-[10px] leading-4 text-slate-500">
                제목 전체를 복사하지 않고 핵심 검색어 2~4개 중심으로 줄인 후보입니다. 마음에 들지 않으면 직접 수정해도 됩니다.
              </p>
            </div>
          )}

          <p className="mt-3 break-all text-[11px] leading-5 text-slate-500">
            변경 후 주소: <span className="font-bold text-slate-300">/blog/{slug || 'slug'}</span>
          </p>

          {postStatus === 'published' && slug !== originalSlug && (
            <p className="mt-3 rounded-xl border border-amber-800/60 bg-amber-950/30 px-3 py-2 text-[11px] font-bold leading-5 text-amber-200">
              ⚠ 이미 공개된 글의 Slug를 바꾸면 기존 외부 링크·검색 결과 주소가 끊길 수 있습니다. 꼭 필요한 경우에만 변경해주세요.
            </p>
          )}

          {message && (
            <p className={`mt-3 text-xs font-bold ${status === 'available' ? 'text-emerald-300' : status === 'taken' || status === 'error' ? 'text-amber-300' : 'text-slate-400'}`}>
              {message}
            </p>
          )}

          <button
            type="button"
            onClick={() => void handleSave()}
            disabled={saving || loading || !slug.trim()}
            className="mt-4 w-full rounded-xl bg-blue-600 px-4 py-3 text-sm font-black text-white hover:bg-blue-500 disabled:opacity-50"
          >
            {saving ? '저장 중...' : 'Slug 저장'}
          </button>
        </>
      )}
    </div>
  );
}
