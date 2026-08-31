'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

import { supabase } from '@/app/lib/supabase';

type PostStatus = 'draft' | 'published';

type Post = {
  id: string;
  title: string;
  slug: string;
  content: string | null;
  category: string | null;
  subcategory: string | null;
  description: string | null;
  seo_title: string | null;
  meta_description: string | null;
  og_image: string | null;
  status: PostStatus;
  created_at: string | null;
  updated_at: string | null;
};

type Category = {
  slug: string;
  name: string;
  is_active: boolean;
};

type CategoryFilter = 'all' | 'theory' | 'market';
type StatusFilter = 'published' | 'draft' | 'all';

type Audit = {
  score: number;
  seoTitle: string;
  metaDescription: string;
  optimizedContent: string;
  h1Count: number;
  h2Count: number;
  h3Count: number;
  imageCount: number;
  missingAltCount: number;
  internalLinkCount: number;
  tableCount: number;
  textLength: number;
  preservation: number;
  needsApply: boolean;
};

const TARGET_CATEGORY_NAMES = new Set(['투자 이론', '시황 및 시장']);

const TITLE_STOP_WORDS = new Set([
  '이란',
  '이란?',
  '정리',
  '총정리',
  '알아보기',
  '쉽게',
  '초보',
  '주식',
  '투자',
  '시장',
  '시황',
  '미국',
  '증시',
  '그리고',
  '대한',
  '무엇일까',
  '왜',
  '어떻게',
]);

function normalizeWhitespace(value: string | null | undefined) {
  return (value || '').replace(/\s+/g, ' ').trim();
}

function decodeCommonEntities(value: string) {
  return value
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'");
}

function htmlToText(html: string | null | undefined) {
  if (!html) return '';

  return normalizeWhitespace(
    decodeCommonEntities(
      html
        .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, ' ')
        .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, ' ')
        .replace(/<[^>]+>/g, ' ')
    )
  );
}

function countMatches(value: string, pattern: RegExp) {
  return (value.match(pattern) || []).length;
}

function truncateText(value: string, maxLength: number) {
  const normalized = normalizeWhitespace(value);
  if (normalized.length <= maxLength) return normalized;

  const sliced = normalized.slice(0, maxLength - 1);
  const lastSpace = sliced.lastIndexOf(' ');
  const safe = lastSpace > maxLength * 0.7 ? sliced.slice(0, lastSpace) : sliced;
  return `${safe.trim()}…`;
}

function escapeAttribute(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function getFirstParagraphText(html: string | null | undefined) {
  if (!html) return '';
  const paragraph = html.match(/<p\b[^>]*>([\s\S]*?)<\/p>/i)?.[1] || '';
  return htmlToText(paragraph);
}

function buildSeoTitle(post: Post, categoryName: string) {
  const current = normalizeWhitespace(post.seo_title);
  const base = current || normalizeWhitespace(post.title);

  if (
    categoryName === '시황 및 시장' &&
    !/(시황|증시|시장)/.test(base) &&
    base.length <= 42
  ) {
    return truncateText(`${base} | 미국 증시 시황`, 60);
  }

  return truncateText(base, 60);
}

function buildMetaDescription(post: Post, categoryName: string) {
  const current = normalizeWhitespace(post.meta_description);

  if (current.length >= 70 && current.length <= 160) {
    return current;
  }

  const description = normalizeWhitespace(post.description);
  const firstParagraph = getFirstParagraphText(post.content);
  const source = current || description || firstParagraph;

  let candidate = source;

  if (candidate.length < 70) {
    const suffix =
      categoryName === '시황 및 시장'
        ? '주요 지수와 시장 움직임, 핵심 이슈를 한눈에 확인할 수 있게 정리했습니다.'
        : '핵심 개념과 구조, 투자할 때 알아둘 포인트를 이해하기 쉽게 정리했습니다.';

    candidate = normalizeWhitespace(
      `${post.title}. ${candidate} ${suffix}`
    );
  }

  return truncateText(candidate, 155);
}

function addImageSeoAttributes(tag: string, title: string) {
  let next = tag;
  const fallbackAlt = escapeAttribute(`${title} 관련 이미지`);
  const altMatch = next.match(/\balt\s*=\s*(["'])(.*?)\1/i);

  if (!altMatch) {
    next = next.replace(/^<img\b/i, `<img alt="${fallbackAlt}"`);
  } else if (!normalizeWhitespace(altMatch[2])) {
    next = next.replace(altMatch[0], `alt="${fallbackAlt}"`);
  }

  if (!/\bloading\s*=/i.test(next)) {
    next = next.replace(/^<img\b/i, '<img loading="lazy"');
  }

  if (!/\bdecoding\s*=/i.test(next)) {
    next = next.replace(/^<img\b/i, '<img decoding="async"');
  }

  return next;
}

function optimizeContentSafely(content: string | null, title: string) {
  if (!content) return '';

  return content
    .replace(/<h1(\b[^>]*)>/gi, '<h2$1>')
    .replace(/<\/h1>/gi, '</h2>')
    .replace(/<img\b[^>]*>/gi, (tag) => addImageSeoAttributes(tag, title));
}

function getCategoryKind(categoryName: string): CategoryFilter {
  if (categoryName === '시황 및 시장') return 'market';
  if (categoryName === '투자 이론') return 'theory';
  return 'all';
}

function tokenizeTitle(title: string) {
  return Array.from(
    new Set(
      normalizeWhitespace(title)
        .toLowerCase()
        .replace(/[^0-9a-zA-Z가-힣%]+/g, ' ')
        .split(' ')
        .map((token) => token.trim())
        .filter(
          (token) =>
            token.length >= 2 &&
            !TITLE_STOP_WORDS.has(token)
        )
    )
  );
}

function getLinkCandidates(post: Post, posts: Post[]) {
  const postTokens = tokenizeTitle(post.title);
  const currentContent = post.content || '';

  return posts
    .filter(
      (candidate) =>
        candidate.id !== post.id &&
        candidate.status === 'published' &&
        !currentContent.includes(`/blog/${candidate.slug}`)
    )
    .map((candidate) => {
      const candidateTokens = tokenizeTitle(candidate.title);
      const overlap = candidateTokens.filter((token) => postTokens.includes(token)).length;

      let score = overlap * 3;
      if (candidate.category === post.category) score += 3;
      if (
        candidate.subcategory &&
        candidate.subcategory === post.subcategory
      ) {
        score += 5;
      }

      return { candidate, score };
    })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map((item) => item.candidate);
}

function buildAudit(post: Post, categoryName: string): Audit {
  const content = post.content || '';
  const optimizedContent = optimizeContentSafely(content, post.title);
  const beforeText = htmlToText(content);
  const afterText = htmlToText(optimizedContent);

  const h1Count = countMatches(content, /<h1\b[^>]*>/gi);
  const h2Count = countMatches(content, /<h2\b[^>]*>/gi);
  const h3Count = countMatches(content, /<h3\b[^>]*>/gi);
  const imageTags = content.match(/<img\b[^>]*>/gi) || [];
  const imageCount = imageTags.length;
  const missingAltCount = imageTags.filter((tag) => {
    const alt = tag.match(/\balt\s*=\s*(["'])(.*?)\1/i)?.[2];
    return !normalizeWhitespace(alt);
  }).length;
  const internalLinkCount = countMatches(
    content,
    /<a\b[^>]*href\s*=\s*(["'])\/blog\//gi
  );
  const tableCount = countMatches(content, /<table\b[^>]*>/gi);
  const textLength = beforeText.length;
  const seoTitle = buildSeoTitle(post, categoryName);
  const metaDescription = buildMetaDescription(post, categoryName);
  const preservation = beforeText === afterText ? 100 : 99;

  let score = 0;
  if (seoTitle.length >= 12 && seoTitle.length <= 60) score += 20;
  if (metaDescription.length >= 70 && metaDescription.length <= 160) score += 20;
  if (h1Count === 0) score += 15;
  if (h2Count >= 1 || textLength < 700) score += 10;
  if (missingAltCount === 0) score += 15;
  if (internalLinkCount >= 1) score += 10;
  if (textLength >= 500) score += 10;

  const needsApply =
    normalizeWhitespace(post.seo_title) !== seoTitle ||
    normalizeWhitespace(post.meta_description) !== metaDescription ||
    content !== optimizedContent;

  return {
    score,
    seoTitle,
    metaDescription,
    optimizedContent,
    h1Count,
    h2Count,
    h3Count,
    imageCount,
    missingAltCount,
    internalLinkCount,
    tableCount,
    textLength,
    preservation,
    needsApply,
  };
}

export default function AdminSeoPostsPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [posts, setPosts] = useState<Post[]>([]);
  const [categoryNames, setCategoryNames] = useState<Record<string, string>>({});
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('published');
  const [query, setQuery] = useState('');
  const [applyingId, setApplyingId] = useState<string | null>(null);
  const [bulkApplying, setBulkApplying] = useState(false);
  const [message, setMessage] = useState('');

  const loadData = useCallback(async () => {
    setLoadError('');

    const [categoryResult, postResult] = await Promise.all([
      supabase
        .from('categories')
        .select('slug, name, is_active')
        .eq('is_active', true),
      supabase
        .from('posts')
        .select(
          'id, title, slug, content, category, subcategory, description, seo_title, meta_description, og_image, status, created_at, updated_at'
        )
        .order('created_at', { ascending: false }),
    ]);

    if (categoryResult.error) throw categoryResult.error;
    if (postResult.error) throw postResult.error;

    const categories = (categoryResult.data || []) as Category[];
    const names = Object.fromEntries(
      categories.map((category) => [category.slug, category.name])
    ) as Record<string, string>;

    const targetSlugs = new Set(
      categories
        .filter((category) => TARGET_CATEGORY_NAMES.has(category.name))
        .map((category) => category.slug)
    );

    // 시황 카테고리는 사이트에서 필수 카테고리로 보정될 수 있으므로 fallback 유지
    targetSlugs.add('market');

    const targetPosts = ((postResult.data || []) as Post[]).filter((post) => {
      const categoryName = post.category ? names[post.category] : '';
      return (
        TARGET_CATEGORY_NAMES.has(categoryName) ||
        (post.category ? targetSlugs.has(post.category) : false)
      );
    });

    setCategoryNames(names);
    setPosts(targetPosts);
  }, []);

  useEffect(() => {
    const initialize = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        router.replace('/admin/login');
        return;
      }

      try {
        await loadData();
      } catch (error: any) {
        console.error('SEO 자동관리 불러오기 오류:', error);
        setLoadError(
          `투자글을 불러오지 못했습니다. ${error?.message || '잠시 후 다시 시도해주세요.'}`
        );
      } finally {
        setLoading(false);
      }
    };

    void initialize();
  }, [loadData, router]);

  const rows = useMemo(
    () =>
      posts.map((post) => {
        const categoryName =
          (post.category && categoryNames[post.category]) ||
          (post.category === 'market' ? '시황 및 시장' : post.category || '미분류');

        return {
          post,
          categoryName,
          categoryKind: getCategoryKind(categoryName),
          audit: buildAudit(post, categoryName),
          linkCandidates: getLinkCandidates(post, posts),
        };
      }),
    [categoryNames, posts]
  );

  const filteredRows = useMemo(() => {
    const normalizedQuery = normalizeWhitespace(query).toLowerCase();

    return rows.filter(({ post, categoryKind }) => {
      if (categoryFilter !== 'all' && categoryKind !== categoryFilter) return false;
      if (statusFilter !== 'all' && post.status !== statusFilter) return false;

      if (normalizedQuery) {
        const haystack = `${post.title} ${post.slug} ${post.subcategory || ''}`.toLowerCase();
        if (!haystack.includes(normalizedQuery)) return false;
      }

      return true;
    });
  }, [categoryFilter, query, rows, statusFilter]);

  const counts = useMemo(() => {
    const total = rows.length;
    const needsApply = rows.filter((row) => row.audit.needsApply).length;
    const good = rows.filter((row) => row.audit.score >= 90).length;
    const duplicateH1 = rows.filter((row) => row.audit.h1Count > 0).length;
    const missingAlt = rows.reduce(
      (sum, row) => sum + row.audit.missingAltCount,
      0
    );

    return { total, needsApply, good, duplicateH1, missingAlt };
  }, [rows]);

  const applySafeSeo = useCallback(
    async (post: Post, audit: Audit, silent = false) => {
      const { error } = await supabase
        .from('posts')
        .update({
          seo_title: audit.seoTitle,
          meta_description: audit.metaDescription,
          content: audit.optimizedContent,
          updated_at: new Date().toISOString(),
        })
        .eq('id', post.id);

      if (error) throw error;

      if (!silent) {
        setMessage(`✓ “${post.title}” SEO 안전 수정이 적용되었습니다.`);
      }
    },
    []
  );

  const handleApplyOne = async (post: Post, audit: Audit) => {
    if (!audit.needsApply) {
      setMessage('이미 안전 SEO 기준이 적용된 글입니다.');
      return;
    }

    setApplyingId(post.id);
    setMessage('');

    try {
      await applySafeSeo(post, audit);
      await loadData();
    } catch (error: any) {
      console.error('SEO 적용 오류:', error);
      setMessage(`⚠ 적용 실패: ${error?.message || '다시 시도해주세요.'}`);
    } finally {
      setApplyingId(null);
    }
  };

  const handleBulkApply = async () => {
    const targets = filteredRows.filter((row) => row.audit.needsApply);

    if (targets.length === 0) {
      setMessage('현재 목록에는 추가 적용이 필요한 글이 없습니다.');
      return;
    }

    const confirmed = window.confirm(
      `현재 목록의 ${targets.length}개 글에 안전 SEO를 적용할까요?\n\n제목·본문 문장·slug는 바꾸지 않고 SEO 제목, 메타 설명, H1 구조, 이미지 alt/로딩만 정리합니다.`
    );

    if (!confirmed) return;

    setBulkApplying(true);
    setMessage('');

    let successCount = 0;

    try {
      for (const row of targets) {
        await applySafeSeo(row.post, row.audit, true);
        successCount += 1;
      }

      setMessage(`✓ ${successCount}개 글의 안전 SEO 적용을 완료했습니다.`);
      await loadData();
    } catch (error: any) {
      console.error('SEO 일괄 적용 오류:', error);
      setMessage(
        `⚠ ${successCount}개 적용 후 중단되었습니다. ${error?.message || '다시 시도해주세요.'}`
      );
      await loadData();
    } finally {
      setBulkApplying(false);
    }
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-6">
        <p className="font-bold">투자글 SEO 상태를 불러오는 중...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto max-w-7xl p-4 sm:p-6 lg:p-8">
        <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="mb-1 text-xs font-black text-emerald-400">HOHAENG SEO OS</p>
            <h1 className="text-2xl font-black text-white sm:text-3xl">
              🔎 투자글 SEO 자동관리
            </h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">
              투자 이론·시황 글만 진단합니다. 기존 제목, 본문 문장, URL/slug는 그대로 두고
              검색엔진 구조와 모바일 읽기 요소만 안전하게 정리합니다.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link
              href="/admin"
              className="rounded-xl border border-slate-700 bg-slate-900 px-4 py-2.5 text-sm font-bold text-slate-200 hover:border-slate-500"
            >
              ← 관리자 센터
            </Link>
            <button
              type="button"
              onClick={handleBulkApply}
              disabled={bulkApplying || filteredRows.length === 0}
              className="rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-black text-white hover:bg-emerald-500 disabled:opacity-50"
            >
              {bulkApplying ? '적용 중...' : '⚡ 현재 목록 안전 일괄 적용'}
            </button>
          </div>
        </div>

        <div className="mb-6 rounded-2xl border border-emerald-900 bg-emerald-950/30 p-4 text-sm leading-6 text-emerald-100">
          <strong>안전 적용 범위:</strong> SEO 제목·메타 설명 정리, 본문 내부 H1→H2,
          이미지 빈 alt 보완, lazy loading/async decoding. <strong>본문 문장·숫자·투자 의견·slug는 변경하지 않습니다.</strong>
          내부링크는 후보만 보여주고 자동 삽입하지 않습니다.
        </div>

        {loadError && (
          <div className="mb-6 rounded-2xl border border-red-800 bg-red-950/30 p-4 text-sm font-bold text-red-300">
            {loadError}
          </div>
        )}

        {message && (
          <div className="mb-6 rounded-2xl border border-blue-800 bg-blue-950/30 p-4 text-sm font-bold text-blue-200">
            {message}
          </div>
        )}

        <div className="mb-7 grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
          <StatCard label="대상 글" value={counts.total} tone="text-white" />
          <StatCard label="추가 적용 필요" value={counts.needsApply} tone="text-amber-300" />
          <StatCard label="SEO 90점+" value={counts.good} tone="text-emerald-300" />
          <StatCard label="본문 H1 발견" value={counts.duplicateH1} tone="text-violet-300" />
          <StatCard label="빈 이미지 alt" value={counts.missingAlt} tone="text-cyan-300" />
        </div>

        <div className="mb-6 grid grid-cols-1 gap-3 rounded-2xl border border-slate-800 bg-slate-900 p-4 sm:grid-cols-2 xl:grid-cols-4">
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="제목·slug 검색"
            className="rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none focus:border-blue-500"
          />

          <select
            value={categoryFilter}
            onChange={(event) => setCategoryFilter(event.target.value as CategoryFilter)}
            className="rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none focus:border-blue-500"
          >
            <option value="all">투자 이론 + 시황 전체</option>
            <option value="theory">투자 이론만</option>
            <option value="market">시황 및 시장만</option>
          </select>

          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value as StatusFilter)}
            className="rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none focus:border-blue-500"
          >
            <option value="published">공개 글만</option>
            <option value="draft">초안만</option>
            <option value="all">공개 + 초안</option>
          </select>

          <div className="flex items-center rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm font-bold text-slate-400">
            현재 {filteredRows.length}개 표시
          </div>
        </div>

        {filteredRows.length === 0 ? (
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-10 text-center text-slate-400">
            조건에 맞는 투자글이 없습니다.
          </div>
        ) : (
          <div className="space-y-5">
            {filteredRows.map(({ post, categoryName, audit, linkCandidates }) => (
              <article
                key={post.id}
                className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900"
              >
                <div className="p-4 sm:p-5 lg:p-6">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0">
                      <div className="mb-2 flex flex-wrap items-center gap-2">
                        <span className="rounded-full bg-blue-500/10 px-2.5 py-1 text-[11px] font-black text-blue-300">
                          {categoryName}
                        </span>
                        <span
                          className={`rounded-full px-2.5 py-1 text-[11px] font-black ${
                            post.status === 'published'
                              ? 'bg-emerald-500/10 text-emerald-300'
                              : 'bg-amber-500/10 text-amber-300'
                          }`}
                        >
                          {post.status === 'published' ? '🌐 공개' : '📝 초안'}
                        </span>
                        <span
                          className={`rounded-full px-2.5 py-1 text-[11px] font-black ${
                            audit.score >= 90
                              ? 'bg-emerald-500/10 text-emerald-300'
                              : audit.score >= 70
                                ? 'bg-amber-500/10 text-amber-300'
                                : 'bg-red-500/10 text-red-300'
                          }`}
                        >
                          SEO {audit.score}/100
                        </span>
                        <span className="rounded-full bg-violet-500/10 px-2.5 py-1 text-[11px] font-black text-violet-300">
                          원문 문장 {audit.preservation}% 유지
                        </span>
                      </div>

                      <h2 className="break-words text-lg font-black leading-7 text-white sm:text-xl">
                        {post.title}
                      </h2>
                      <p className="mt-2 break-all text-xs text-slate-500">/blog/{post.slug}</p>
                    </div>

                    <div className="flex shrink-0 flex-wrap gap-2">
                      <Link
                        href={`/blog/${post.slug}`}
                        target="_blank"
                        className="rounded-xl border border-slate-700 px-3 py-2 text-xs font-bold text-slate-300 hover:border-slate-500"
                      >
                        글 보기 ↗
                      </Link>
                      <Link
                        href={`/admin/edit/${post.id}`}
                        className="rounded-xl border border-slate-700 px-3 py-2 text-xs font-bold text-slate-300 hover:border-slate-500"
                      >
                        편집기
                      </Link>
                      <button
                        type="button"
                        onClick={() => handleApplyOne(post, audit)}
                        disabled={applyingId === post.id || bulkApplying || !audit.needsApply}
                        className="rounded-xl bg-blue-600 px-3 py-2 text-xs font-black text-white hover:bg-blue-500 disabled:opacity-40"
                      >
                        {applyingId === post.id
                          ? '적용 중...'
                          : audit.needsApply
                            ? 'SEO만 적용'
                            : '적용 완료'}
                      </button>
                    </div>
                  </div>

                  <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
                    <MiniMetric label="본문 H1" value={audit.h1Count} warning={audit.h1Count > 0} />
                    <MiniMetric label="H2" value={audit.h2Count} />
                    <MiniMetric label="H3" value={audit.h3Count} />
                    <MiniMetric label="이미지" value={audit.imageCount} />
                    <MiniMetric label="빈 alt" value={audit.missingAltCount} warning={audit.missingAltCount > 0} />
                    <MiniMetric label="내부링크" value={audit.internalLinkCount} warning={audit.internalLinkCount === 0} />
                    <MiniMetric label="표" value={audit.tableCount} />
                  </div>

                  <div className="mt-5 grid grid-cols-1 gap-4 xl:grid-cols-2">
                    <SeoPreview
                      label="SEO 제목"
                      current={normalizeWhitespace(post.seo_title) || '(미설정)'}
                      recommended={audit.seoTitle}
                      length={`${audit.seoTitle.length}/60`}
                    />
                    <SeoPreview
                      label="메타 설명"
                      current={normalizeWhitespace(post.meta_description) || '(미설정)'}
                      recommended={audit.metaDescription}
                      length={`${audit.metaDescription.length}/160`}
                    />
                  </div>

                  <div className="mt-4 rounded-xl border border-slate-800 bg-slate-950 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-xs font-black text-slate-300">추천 내부링크 후보</p>
                      <span className="text-[11px] font-bold text-slate-600">자동 삽입하지 않음</span>
                    </div>

                    {linkCandidates.length === 0 ? (
                      <p className="mt-2 text-xs leading-5 text-slate-500">
                        현재 기준으로 강한 연관 후보가 없습니다. 본문은 그대로 유지합니다.
                      </p>
                    ) : (
                      <div className="mt-3 flex flex-col gap-2">
                        {linkCandidates.map((candidate) => (
                          <Link
                            key={candidate.id}
                            href={`/blog/${candidate.slug}`}
                            target="_blank"
                            className="break-words rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-xs font-bold text-blue-300 hover:border-blue-700"
                          >
                            → {candidate.title}
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>

                  <p className="mt-4 text-xs leading-5 text-slate-500">
                    본문 글자 약 {audit.textLength.toLocaleString('ko-KR')}자 · 표가 있는 경우 공개 화면에서 모바일 가로 스크롤로 표시됩니다.
                  </p>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}

function StatCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
      <p className="text-xs font-bold text-slate-500">{label}</p>
      <p className={`mt-2 text-2xl font-black ${tone}`}>
        {value.toLocaleString('ko-KR')}
      </p>
    </div>
  );
}

function MiniMetric({
  label,
  value,
  warning = false,
}: {
  label: string;
  value: number;
  warning?: boolean;
}) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-950 px-3 py-3">
      <p className="text-[11px] font-bold text-slate-600">{label}</p>
      <p className={`mt-1 text-lg font-black ${warning ? 'text-amber-300' : 'text-slate-200'}`}>
        {value}
      </p>
    </div>
  );
}

function SeoPreview({
  label,
  current,
  recommended,
  length,
}: {
  label: string;
  current: string;
  recommended: string;
  length: string;
}) {
  const changed = current !== recommended;

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-black text-slate-300">{label}</p>
        <span className="text-[11px] font-bold text-slate-600">{length}</span>
      </div>

      <div className="mt-3 space-y-3 text-xs leading-5">
        <div>
          <p className="mb-1 font-bold text-slate-600">현재</p>
          <p className="break-words text-slate-400">{current}</p>
        </div>
        <div>
          <p className="mb-1 font-bold text-emerald-500">추천</p>
          <p className="break-words font-semibold text-slate-100">{recommended}</p>
        </div>
      </div>

      <p className={`mt-3 text-[11px] font-bold ${changed ? 'text-amber-300' : 'text-emerald-400'}`}>
        {changed ? '수정 권장' : '현재 값 유지'}
      </p>
    </div>
  );
}
