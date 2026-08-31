'use client';

import Link from 'next/link';
import { useState } from 'react';

import { supabase } from '@/app/lib/supabase';
import type { SeoAuditIssue, SeoAuditTarget } from '@/app/lib/adminSeoAudit';

type Props = {
  postId: string;
  issue: SeoAuditIssue;
  onFixed: () => Promise<void> | void;
};

function severityStyle(severity: SeoAuditIssue['severity']) {
  if (severity === 'error') return { icon: '🔴', box: 'border-red-500/20 bg-red-500/5', title: 'text-red-300' };
  if (severity === 'warning') return { icon: '🟡', box: 'border-amber-500/20 bg-amber-500/5', title: 'text-amber-200' };
  return { icon: 'ℹ️', box: 'border-blue-500/20 bg-blue-500/5', title: 'text-blue-200' };
}

function targetHref(postId: string, issueId: string, target: SeoAuditTarget) {
  const params = new URLSearchParams({
    seoIssue: issueId,
    seoTarget: target.kind,
    seoTargetIndex: String(target.index),
    seoTargetPreview: target.preview,
  });
  if (target.value) params.set('seoTargetValue', target.value);
  return `/admin/edit/${postId}?${params.toString()}`;
}

function convertNthH1ToH2(content: string, targetIndex: number) {
  let currentIndex = 0;
  let changed = false;

  const nextContent = content.replace(
    /<h1\b([^>]*)>([\s\S]*?)<\/h1>/gi,
    (full, attributes: string, inner: string) => {
      const index = currentIndex;
      currentIndex += 1;
      if (index !== targetIndex) return full;
      changed = true;
      return `<h2${attributes}>${inner}</h2>`;
    },
  );

  return { nextContent, changed };
}

export default function SeoIssueActionCard({ postId, issue, onFixed }: Props) {
  const style = severityStyle(issue.severity);
  const [fixingIndex, setFixingIndex] = useState<number | null>(null);
  const targets = issue.targets || [];

  const convertH1 = async (target: SeoAuditTarget) => {
    const confirmed = window.confirm(`이 H1을 H2로 변경할까요?\n\n${target.preview}`);
    if (!confirmed) return;

    try {
      setFixingIndex(target.index);
      const { data, error } = await supabase
        .from('posts')
        .select('content')
        .eq('id', postId)
        .single();

      if (error) throw error;
      const content = data?.content || '';
      const { nextContent, changed } = convertNthH1ToH2(content, target.index);

      if (!changed) {
        alert('해당 H1 위치가 달라졌습니다. SEO 검사를 다시 실행한 뒤 확인해 주세요.');
        await onFixed();
        return;
      }

      const updateResult = await supabase
        .from('posts')
        .update({ content: nextContent })
        .eq('id', postId);

      if (updateResult.error) throw updateResult.error;
      await onFixed();
      alert('본문 H1을 H2로 변경했습니다. SEO 진단도 다시 반영했습니다.');
    } catch (error: any) {
      console.error('H1 → H2 변경 오류:', error);
      alert('H2 변경 실패: ' + (error?.message || '알 수 없는 오류'));
    } finally {
      setFixingIndex(null);
    }
  };

  return (
    <div className={`rounded-xl border p-3 ${style.box}`}>
      <div className="flex gap-2">
        <span>{style.icon}</span>
        <div className="min-w-0 flex-1">
          <p className={`text-sm font-black ${style.title}`}>{issue.label}</p>
          <p className="mt-1 text-xs leading-5 text-slate-400">{issue.detail}</p>

          {targets.length > 0 ? (
            <div className="mt-3 grid gap-2">
              {targets.slice(0, 8).map((target, targetPosition) => {
                const isH1 = issue.id === 'body-h1' && target.kind === 'h1';
                const fixing = fixingIndex === target.index;

                return (
                  <div key={`${target.kind}-${target.index}-${targetPosition}`} className="rounded-lg border border-slate-700/70 bg-slate-950/60 p-2.5">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <p className="min-w-0 flex-1 break-words text-xs font-bold leading-5 text-slate-200">
                        <span className="mr-1 text-slate-500">#{targetPosition + 1}</span>
                        {target.preview}
                      </p>
                      <div className="flex shrink-0 flex-wrap gap-2">
                        <Link
                          href={targetHref(postId, issue.id, target)}
                          className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-2.5 py-1.5 text-[11px] font-black text-amber-200 hover:bg-amber-500/20"
                        >
                          📍 위치 보기
                        </Link>
                        {isH1 && (
                          <button
                            type="button"
                            disabled={fixing}
                            onClick={() => void convertH1(target)}
                            className="rounded-lg border border-blue-500/30 bg-blue-500/10 px-2.5 py-1.5 text-[11px] font-black text-blue-200 hover:bg-blue-500/20 disabled:opacity-50"
                          >
                            {fixing ? '변경 중...' : 'H2로 변경'}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
              {targets.length > 8 && (
                <p className="px-1 text-[11px] text-slate-500">외 {targets.length - 8}개가 더 있습니다. 먼저 표시된 항목을 수정한 뒤 SEO 검사를 다시 실행해 주세요.</p>
              )}
            </div>
          ) : (
            <div className="mt-3">
              <Link
                href={`/admin/edit/${postId}`}
                className="inline-flex rounded-lg border border-slate-700 bg-slate-900 px-2.5 py-1.5 text-[11px] font-black text-slate-300 hover:border-blue-500 hover:text-white"
              >
                ✏️ 수정 화면 열기
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
