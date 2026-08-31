'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';

import { supabase } from '@/app/lib/supabase';
import SeoIssueActionCard from './SeoIssueActionCard';
import {
  auditSeoPosts,
  type SeoAuditResult,
  type SeoAuditSourcePost,
  type SeoAuditStatus,
} from '@/app/lib/adminSeoAudit';

type PostStatus = 'draft' | 'published';

type Post = {
  id: string;
  title: string;
  slug: string;
  category: string | null;
  subcategory: string | null;
  description: string | null;
  created_at: string | null;
  published_at: string | null;
  scheduled_at: string | null;
  view_count: number | null;
  status: PostStatus | null;
};

type Category = {
  id: number;
  slug: string;
  name: string;
  emoji: string | null;
  sort_order: number;
  is_active: boolean;
};

type SortType = 'newest' | 'oldest' | 'views';
type StatusFilter = 'all' | 'draft' | 'scheduled' | 'published';
type SeoFilter = 'all' | SeoAuditStatus;

function getPostTimestamp(post: Post) {
  const dateValue = post.status === 'published'
    ? post.published_at || post.created_at
    : post.created_at || post.published_at;

  if (dateValue) {
    const time = new Date(dateValue).getTime();
    if (!Number.isNaN(time)) return time;
  }

  const value = Number(post.slug.split('-').pop());
  return Number.isNaN(value) ? 0 : value;
}

function formatDate(post: Post) {
  const timestamp = getPostTimestamp(post);
  if (!timestamp) return '-';
  return new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(timestamp));
}

function formatScheduledDate(value: string | null) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date);
}

function isDraft(post: Post) {
  return post.status === 'draft' && !post.scheduled_at;
}

function isScheduled(post: Post) {
  return post.status === 'draft' && Boolean(post.scheduled_at);
}

function isPublished(post: Post) {
  return post.status !== 'draft';
}

function seoLabel(audit: SeoAuditResult | undefined) {
  if (!audit) return { text: 'SEO 검사 중', icon: '⏳', className: 'border-slate-700 bg-slate-800 text-slate-400' };
  if (audit.status === 'good') return { text: 'SEO 양호', icon: '🟢', className: 'border-emerald-500/25 bg-emerald-500/10 text-emerald-300' };
  if (audit.status === 'improve') return { text: 'SEO 보완', icon: '🟡', className: 'border-amber-500/25 bg-amber-500/10 text-amber-300' };
  return { text: 'SEO 수정 필요', icon: '🔴', className: 'border-red-500/25 bg-red-500/10 text-red-300' };
}

export default function AdminManageSeoPage() {
  const router = useRouter();
  const [posts, setPosts] = useState<Post[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [sortType, setSortType] = useState<SortType>('newest');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [seoFilter, setSeoFilter] = useState<SeoFilter>('all');
  const [seoAudits, setSeoAudits] = useState<Record<string, SeoAuditResult>>({});
  const [seoLoading, setSeoLoading] = useState(false);
  const [seoError, setSeoError] = useState<string | null>(null);
  const [expandedSeoId, setExpandedSeoId] = useState<string | null>(null);

  useEffect(() => {
    const initialize = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.replace('/admin/login');
        return;
      }
      await loadData();
    };
    void initialize();
  }, [router]);

  const loadSeoAudits = async () => {
    setSeoLoading(true);
    setSeoError(null);
    try {
      const { data, error } = await supabase
        .from('posts')
        .select('id, title, slug, description, seo_title, meta_description, og_image, content, category, status');

      if (error) throw error;
      const source = (data || []) as SeoAuditSourcePost[];
      setSeoAudits(auditSeoPosts(source));
    } catch (error: any) {
      console.error('SEO 진단 오류:', error);
      setSeoError(error?.message || 'SEO 진단 데이터를 불러오지 못했습니다.');
    } finally {
      setSeoLoading(false);
    }
  };

  const loadData = async () => {
    setLoading(true);
    const [postsResult, categoriesResult] = await Promise.all([
      supabase
        .from('posts')
        .select('id, title, slug, category, subcategory, description, created_at, published_at, scheduled_at, view_count, status'),
      supabase
        .from('categories')
        .select('id, slug, name, emoji, sort_order, is_active')
        .order('sort_order', { ascending: true }),
    ]);

    if (postsResult.error) {
      alert('글 목록을 불러오지 못했습니다: ' + postsResult.error.message);
      setLoading(false);
      return;
    }

    setPosts((postsResult.data || []) as Post[]);
    if (categoriesResult.error) {
      console.error('카테고리 불러오기 오류:', categoriesResult.error);
    } else {
      setCategories((categoriesResult.data || []) as Category[]);
    }
    setLoading(false);

    // 목록 화면은 먼저 보여주고, 긴 본문이 필요한 SEO 검사는 뒤에서 별도로 진행한다.
    void loadSeoAudits();
  };

  const categoryMap = useMemo(() => Object.fromEntries(
    categories.map((item) => [item.slug, `${item.emoji || '📁'} ${item.name}`]),
  ) as Record<string, string>, [categories]);

  const draftCount = useMemo(() => posts.filter(isDraft).length, [posts]);
  const scheduledCount = useMemo(() => posts.filter(isScheduled).length, [posts]);
  const publishedCount = useMemo(() => posts.filter(isPublished).length, [posts]);
  const totalViews = useMemo(() => posts.reduce((sum, post) => sum + (post.view_count || 0), 0), [posts]);

  const seoCounts = useMemo(() => {
    const values = Object.values(seoAudits);
    return {
      good: values.filter((item) => item.status === 'good').length,
      improve: values.filter((item) => item.status === 'improve').length,
      fix: values.filter((item) => item.status === 'fix').length,
    };
  }, [seoAudits]);

  const filteredPosts = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    let result = posts.filter((post) => {
      if (statusFilter === 'draft' && !isDraft(post)) return false;
      if (statusFilter === 'scheduled' && !isScheduled(post)) return false;
      if (statusFilter === 'published' && !isPublished(post)) return false;

      if (seoFilter !== 'all') {
        const audit = seoAudits[post.id];
        if (!audit || audit.status !== seoFilter) return false;
      }

      if (!keyword) return true;
      const searchable = [
        post.title,
        post.description,
        post.category,
        categoryMap[post.category || ''],
        post.subcategory,
        post.status,
        post.scheduled_at,
      ].filter(Boolean).join(' ').toLowerCase();
      return searchable.includes(keyword);
    });

    result = [...result];
    if (sortType === 'newest') result.sort((a, b) => getPostTimestamp(b) - getPostTimestamp(a));
    if (sortType === 'oldest') result.sort((a, b) => getPostTimestamp(a) - getPostTimestamp(b));
    if (sortType === 'views') result.sort((a, b) => (b.view_count || 0) - (a.view_count || 0));
    return result;
  }, [posts, search, sortType, statusFilter, seoFilter, seoAudits, categoryMap]);

  const handleDelete = async (post: Post) => {
    const ok = window.confirm(`"${post.title}" 글을 정말 삭제하시겠습니까?\n\n삭제하면 되돌릴 수 없습니다.`);
    if (!ok) return;
    try {
      setDeletingId(post.id);
      const { error } = await supabase.from('posts').delete().eq('id', post.id);
      if (error) throw error;
      setPosts((current) => current.filter((item) => item.id !== post.id));
      setSeoAudits((current) => {
        const next = { ...current };
        delete next[post.id];
        return next;
      });
      alert('글이 삭제되었습니다.');
    } catch (error: any) {
      alert('삭제 실패: ' + error.message);
    } finally {
      setDeletingId(null);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.replace('/admin/login');
  };

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto max-w-5xl px-5 py-10">
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="mb-1 text-sm font-bold text-blue-400">HOHAENG ADMIN</p>
            <h1 className="text-3xl font-black">📚 글 관리</h1>
            <p className="mt-2 text-sm text-slate-400">글 상태와 SEO 보완 우선순위를 한 화면에서 관리합니다.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href="/admin" className="rounded-xl bg-slate-800 px-4 py-2.5 text-sm font-bold hover:bg-slate-700">⚙️ 관리자 홈</Link>
            <Link href="/admin/write" className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold hover:bg-blue-500">✍️ 새 글 작성</Link>
            <button type="button" onClick={handleLogout} className="rounded-xl bg-slate-800 px-4 py-2.5 text-sm font-bold hover:bg-slate-700">로그아웃</button>
          </div>
        </div>

        <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-5">
          {[
            ['전체 글', posts.length, 'text-white'],
            ['예약 대기', scheduledCount, 'text-violet-400'],
            ['초안', draftCount, 'text-amber-400'],
            ['공개', publishedCount, 'text-emerald-400'],
            ['전체 조회수', totalViews, 'text-blue-400'],
          ].map(([label, value, tone]) => (
            <div key={String(label)} className="rounded-2xl border border-slate-800 bg-slate-900 px-5 py-4">
              <p className="text-xs text-slate-500">{label}</p>
              <strong className={`mt-1 block text-2xl ${tone}`}>{Number(value).toLocaleString('ko-KR')}</strong>
            </div>
          ))}
        </div>

        <section className="mb-5 rounded-2xl border border-slate-800 bg-slate-900 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.14em] text-blue-400">SEO HEALTH CHECK</p>
              <h2 className="mt-1 text-lg font-black text-white">검색 최적화 점검</h2>
              <p className="mt-1 text-xs text-slate-500">규칙 기반 무료 진단입니다. 점수는 수정 우선순위를 위한 지표이며 구글 순위를 보장하는 점수가 아닙니다.</p>
            </div>
            <button type="button" onClick={() => void loadSeoAudits()} disabled={seoLoading} className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs font-black text-slate-300 hover:border-blue-500 disabled:opacity-50">
              {seoLoading ? '⏳ SEO 검사 중...' : '↻ SEO 다시 검사'}
            </button>
          </div>

          <div className="mt-4 grid grid-cols-3 gap-2">
            <button type="button" disabled={seoLoading} onClick={() => setSeoFilter(seoFilter === 'good' ? 'all' : 'good')} className={`rounded-xl border px-3 py-3 text-left ${seoFilter === 'good' ? 'border-emerald-400 bg-emerald-500/15' : 'border-slate-800 bg-slate-950/70'}`}>
              <p className="text-[11px] font-black text-emerald-300">🟢 SEO 양호</p><strong className="mt-1 block text-xl">{seoLoading ? '…' : seoCounts.good}</strong>
            </button>
            <button type="button" disabled={seoLoading} onClick={() => setSeoFilter(seoFilter === 'improve' ? 'all' : 'improve')} className={`rounded-xl border px-3 py-3 text-left ${seoFilter === 'improve' ? 'border-amber-400 bg-amber-500/15' : 'border-slate-800 bg-slate-950/70'}`}>
              <p className="text-[11px] font-black text-amber-300">🟡 SEO 보완</p><strong className="mt-1 block text-xl">{seoLoading ? '…' : seoCounts.improve}</strong>
            </button>
            <button type="button" disabled={seoLoading} onClick={() => setSeoFilter(seoFilter === 'fix' ? 'all' : 'fix')} className={`rounded-xl border px-3 py-3 text-left ${seoFilter === 'fix' ? 'border-red-400 bg-red-500/15' : 'border-slate-800 bg-slate-950/70'}`}>
              <p className="text-[11px] font-black text-red-300">🔴 수정 필요</p><strong className="mt-1 block text-xl">{seoLoading ? '…' : seoCounts.fix}</strong>
            </button>
          </div>
          {seoError && <p className="mt-3 rounded-xl border border-red-500/20 bg-red-500/5 px-3 py-2 text-xs text-red-300">SEO 진단 오류: {seoError}</p>}
        </section>

        <div className="mb-4 rounded-2xl border border-slate-800 bg-slate-900 p-2">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {([
              ['all', `전체 ${posts.length}`],
              ['draft', `📝 초안 ${draftCount}`],
              ['scheduled', `⏰ 예약 ${scheduledCount}`],
              ['published', `🌐 공개 ${publishedCount}`],
            ] as const).map(([key, label]) => (
              <button key={key} type="button" onClick={() => setStatusFilter(key)} className={`rounded-xl px-3 py-3 text-sm font-black transition-colors ${statusFilter === key ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}>{label}</button>
            ))}
          </div>
        </div>

        <div className="mb-5 rounded-2xl border border-slate-800 bg-slate-900 p-4">
          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="relative flex-1">
              <span className="absolute left-4 top-1/2 -translate-y-1/2">🔎</span>
              <input type="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="제목, 설명, 카테고리 검색" className="w-full rounded-xl border border-slate-800 bg-slate-950 py-3 pl-11 pr-4 text-white focus:border-blue-500 focus:outline-none" />
            </div>
            <select value={sortType} onChange={(e) => setSortType(e.target.value as SortType)} className="rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-white focus:border-blue-500 focus:outline-none">
              <option value="newest">🆕 최신순</option><option value="oldest">🕐 오래된순</option><option value="views">🔥 조회수 높은순</option>
            </select>
          </div>
          {(search || statusFilter !== 'all' || seoFilter !== 'all') && (
            <div className="mt-3 flex items-center justify-between gap-3">
              <p className="text-xs text-slate-400">현재 조건 결과 <strong className="text-blue-400">{filteredPosts.length}개</strong></p>
              <button type="button" onClick={() => { setSearch(''); setStatusFilter('all'); setSeoFilter('all'); }} className="text-xs font-bold text-slate-400 hover:text-white">✕ 필터 초기화</button>
            </div>
          )}
        </div>

        {loading ? (
          <div className="py-20 text-center text-slate-400">글을 불러오는 중...</div>
        ) : posts.length === 0 ? (
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-12 text-center"><p className="mb-5 text-slate-400">아직 작성된 글이 없습니다.</p><Link href="/admin/write" className="font-bold text-blue-400">첫 글 작성하기 →</Link></div>
        ) : filteredPosts.length === 0 ? (
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-12 text-center"><div className="mb-4 text-4xl">🔎</div><p className="font-bold text-white">조건에 맞는 글이 없습니다.</p><button type="button" onClick={() => { setSearch(''); setStatusFilter('all'); setSeoFilter('all'); }} className="mt-5 text-sm font-bold text-blue-400">전체 글 보기</button></div>
        ) : (
          <div className="space-y-3">
            {filteredPosts.map((post) => {
              const draft = isDraft(post);
              const scheduled = isScheduled(post);
              const audit = seoAudits[post.id];
              const seo = seoLabel(audit);
              const actionableCount = audit?.issues.filter((issue) => issue.severity !== 'info').length || 0;
              const expanded = expandedSeoId === post.id;

              return (
                <article key={post.id} className={`rounded-2xl border bg-slate-900 p-5 transition-colors ${scheduled ? 'border-violet-500/30' : draft ? 'border-amber-500/20' : 'border-slate-800 hover:border-slate-700'}`}>
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="mb-2 flex flex-wrap items-center gap-2">
                        {scheduled ? <span className="rounded-lg border border-violet-500/20 bg-violet-500/10 px-2.5 py-1 text-xs font-black text-violet-400">⏰ 예약 대기</span> : draft ? <span className="rounded-lg border border-amber-500/20 bg-amber-500/10 px-2.5 py-1 text-xs font-black text-amber-400">📝 초안</span> : <span className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1 text-xs font-black text-emerald-400">🌐 공개</span>}
                        <span className="rounded-lg bg-blue-500/10 px-2.5 py-1 text-xs font-bold text-blue-400">{categoryMap[post.category || ''] || post.category || '📁 기타'}</span>
                        {post.subcategory && <span className="rounded-lg bg-slate-800 px-2.5 py-1 text-xs text-slate-300">{post.subcategory}</span>}
                        {!draft && !scheduled && <span className="rounded-lg bg-slate-800 px-2.5 py-1 text-xs text-slate-400">👁 {(post.view_count || 0).toLocaleString('ko-KR')}</span>}
                        <span className="text-xs text-slate-500">📅 {formatDate(post)}</span>
                        <button type="button" onClick={() => setExpandedSeoId(expanded ? null : post.id)} className={`rounded-lg border px-2.5 py-1 text-xs font-black ${seo.className}`}>{seo.icon} {seo.text}{audit ? ` ${audit.score}점` : ''}</button>
                        {scheduled && <span className="rounded-lg border border-violet-500/20 bg-violet-500/10 px-2.5 py-1 text-xs font-bold text-violet-300">공개 예정: {formatScheduledDate(post.scheduled_at)}</span>}
                      </div>

                      <h2 className="truncate text-lg font-black text-white">{post.title || '제목 없는 초안'}</h2>
                      {post.description && <p className="mt-1 line-clamp-1 text-sm text-slate-400">{post.description}</p>}
                      {scheduled ? <p className="mt-2 truncate text-xs text-violet-400/80">{formatScheduledDate(post.scheduled_at)}에 자동 공개될 예정입니다.</p> : draft ? <p className="mt-2 truncate text-xs text-amber-400/70">아직 공개되지 않은 초안입니다.</p> : <p className="mt-2 truncate text-xs text-slate-600">/blog/{post.slug}</p>}
                    </div>

                    <div className="flex shrink-0 flex-wrap gap-2">
                      {audit && audit.status !== 'good' && <button type="button" onClick={() => setExpandedSeoId(expanded ? null : post.id)} className={`rounded-lg border px-3 py-2 text-sm font-black ${seo.className}`}>{seo.icon} {seo.text} {actionableCount > 0 ? actionableCount : ''}</button>}
                      {!draft && !scheduled && <Link href={`/blog/${post.slug}`} target="_blank" className="rounded-lg bg-slate-800 px-3 py-2 text-sm font-bold hover:bg-slate-700">👁 보기</Link>}
                      <Link href={`/admin/edit/${post.id}`} className={`rounded-lg px-3 py-2 text-sm font-bold ${scheduled ? 'bg-violet-500/10 text-violet-400 hover:bg-violet-500/20' : draft ? 'bg-amber-500/10 text-amber-400 hover:bg-amber-500/20' : 'bg-blue-500/10 text-blue-400 hover:bg-blue-500/20'}`}>{scheduled ? '⏰ 예약 수정' : draft ? '✍️ 이어쓰기' : '✏️ 수정'}</Link>
                      <button type="button" onClick={() => void handleDelete(post)} disabled={deletingId === post.id} className="rounded-lg bg-red-500/10 px-3 py-2 text-sm font-bold text-red-400 hover:bg-red-500/20 disabled:opacity-50">{deletingId === post.id ? '삭제 중...' : '🗑 삭제'}</button>
                    </div>
                  </div>

                  {expanded && (
                    <div className="mt-4 border-t border-slate-800 pt-4">
                      {!audit ? (
                        <p className="text-sm text-slate-400">SEO 진단을 불러오는 중입니다.</p>
                      ) : (
                        <>
                          <div className="flex flex-wrap items-center justify-between gap-3">
                            <div>
                              <p className="text-xs font-black text-blue-400">SEO CHECK · {audit.score}/100</p>
                              <h3 className="mt-1 font-black text-white">이 글에서 확인할 항목</h3>
                            </div>
                            <div className="flex flex-wrap gap-2 text-[11px] font-bold text-slate-400">
                              <span className="rounded-full bg-slate-800 px-2.5 py-1">본문 {audit.textLength.toLocaleString('ko-KR')}자</span>
                              <span className="rounded-full bg-slate-800 px-2.5 py-1">H2 {audit.h2Count}개</span>
                              <span className="rounded-full bg-slate-800 px-2.5 py-1">내부링크 {audit.internalLinkCount}개</span>
                              <span className="rounded-full bg-slate-800 px-2.5 py-1">이미지 {audit.imageCount}장</span>
                            </div>
                          </div>

                          {audit.issues.length === 0 ? (
                            <div className="mt-3 rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4 text-sm font-bold text-emerald-300">✅ 현재 검사 기준에서 수정이 필요한 SEO 항목이 없습니다.</div>
                          ) : (
                            <div className="mt-3 grid gap-2">
                              {audit.issues.map((issue) => (
                                <SeoIssueActionCard
                                  key={issue.id}
                                  postId={post.id}
                                  issue={issue}
                                  onFixed={loadSeoAudits}
                                />
                              ))}
                            </div>
                          )}

                          <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                            <p className="text-[11px] text-slate-500">‘📍 위치 보기’를 누르면 수정 화면에서 문제 부분으로 자동 이동해 노란색으로 표시합니다. 수정 후 ‘SEO 다시 검사’를 누르면 즉시 재진단됩니다.</p>
                            <Link href={`/admin/edit/${post.id}`} className="rounded-lg bg-blue-600 px-3 py-2 text-xs font-black text-white hover:bg-blue-500">✏️ 이 글 수정하기 →</Link>
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
