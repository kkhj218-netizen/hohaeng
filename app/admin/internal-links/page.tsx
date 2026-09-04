'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';

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
  status: PostStatus | null;
  created_at: string | null;
  updated_at: string | null;
};

type RelatedItem = {
  post: Post;
  score: number;
  reasons: string[];
  anchor: string;
};

type ContentRole = 'pillar' | 'cluster';

const STOP_WORDS = new Set([
  '이란', '이란?', '뜻', '정리', '총정리', '알아보기', '쉽게', '초보',
  '주식', '투자', '시장', '시황', '미국', '증시', '그리고', '대한',
  '무엇일까', '왜', '어떻게', '하는', '하면', '있다면', '보는', '이유',
  '오늘', '이번', '정도', '정말', '핵심', '완전', '바로', '관련',
]);

function normalizeWhitespace(value: string | null | undefined) {
  return (value || '').replace(/\s+/g, ' ').trim();
}

function stripHtml(value: string | null | undefined) {
  return normalizeWhitespace(
    (value || '')
      .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, ' ')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;|&#160;/gi, ' ')
      .replace(/&amp;/gi, '&')
      .replace(/&lt;/gi, '<')
      .replace(/&gt;/gi, '>')
      .replace(/&quot;/gi, '"')
      .replace(/&#39;/gi, "'")
  );
}

function tokenize(value: string | null | undefined) {
  return Array.from(
    new Set(
      normalizeWhitespace(value)
        .toLowerCase()
        .replace(/[^0-9a-zA-Z가-힣%]+/g, ' ')
        .split(' ')
        .map((token) => token.trim())
        .filter((token) => token.length >= 2 && !STOP_WORDS.has(token))
    )
  );
}

function safeDecode(value: string) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function parseBlogSlug(value: string) {
  const input = value.trim();
  if (!input) return '';

  try {
    const url = new URL(input);
    const match = url.pathname.match(/\/blog\/([^/?#]+)/i);
    if (match?.[1]) return safeDecode(match[1].replace(/\/$/, ''));
  } catch {
    // URL이 아니면 아래에서 slug 자체로 처리한다.
  }

  const pathMatch = input.match(/(?:^|\/)blog\/([^/?#]+)/i);
  if (pathMatch?.[1]) return safeDecode(pathMatch[1].replace(/\/$/, ''));

  return safeDecode(
    input
      .replace(/^https?:\/\/[^/]+/i, '')
      .replace(/^\/+|\/+$/g, '')
      .replace(/^blog\//i, '')
      .split(/[?#]/)[0]
  );
}

function extractInternalSlugs(content: string | null | undefined) {
  const slugs = new Set<string>();
  const html = content || '';
  const pattern = /href=["'](?:https?:\/\/[^/]+)?\/blog\/([^?#"']+)/gi;

  for (const match of html.matchAll(pattern)) {
    if (match[1]) slugs.add(safeDecode(match[1].replace(/\/$/, '')));
  }

  return slugs;
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function countH2(content: string | null | undefined) {
  return (content || '').match(/<h2\b[^>]*>/gi)?.length || 0;
}

function getRole(post: Post): { role: ContentRole; score: number; reasons: string[] } {
  const title = post.title || '';
  const textLength = stripHtml(post.content).length;
  const h2Count = countH2(post.content);
  let pillarScore = 0;
  const reasons: string[] = [];

  if (/(이란|뜻|개념|기초|가이드|총정리|입문|원리|종류|기본|이해)/.test(title)) {
    pillarScore += 3;
    reasons.push('기초·개념형 제목');
  }

  if (textLength >= 1800) {
    pillarScore += 2;
    reasons.push('본문이 충분히 긴 편');
  } else if (textLength >= 1200) {
    pillarScore += 1;
  }

  if (h2Count >= 4) {
    pillarScore += 2;
    reasons.push('소제목 구조가 넓음');
  } else if (h2Count >= 2) {
    pillarScore += 1;
  }

  if (/(왜|영향|관계|차이|전망|급등|급락|돌파|발표|오늘|이번|20\d{2}|\d+%)/.test(title)) {
    pillarScore -= 2;
    reasons.push('세부 이슈·사례형 제목');
  }

  return {
    role: pillarScore >= 4 ? 'pillar' : 'cluster',
    score: pillarScore,
    reasons,
  };
}

function buildAnchor(post: Post) {
  const tokens = tokenize(post.title).slice(0, 4);
  if (tokens.length >= 2) return tokens.join(' ');
  return normalizeWhitespace(post.title).slice(0, 48) || '관련 글';
}

function relationScore(source: Post, candidate: Post): RelatedItem {
  const sourceTitleTokens = tokenize(source.title);
  const candidateTitleTokens = tokenize(candidate.title);
  const sourceText = `${source.title} ${source.description || ''} ${stripHtml(source.content)}`.toLowerCase();
  const overlap = candidateTitleTokens.filter((token) => sourceTitleTokens.includes(token));
  const bodyMentions = candidateTitleTokens.filter((token) => sourceText.includes(token)).length;
  let score = 0;
  const reasons: string[] = [];

  if (overlap.length > 0) {
    score += Math.min(42, overlap.length * 14);
    reasons.push(`제목 핵심어 ${overlap.slice(0, 3).join(' · ')} 겹침`);
  }

  if (source.category && source.category === candidate.category) {
    score += 16;
    reasons.push('같은 카테고리');
  }

  if (
    source.subcategory &&
    candidate.subcategory &&
    source.subcategory === candidate.subcategory
  ) {
    score += 24;
    reasons.push('같은 세부주제');
  }

  if (bodyMentions > 0) {
    score += Math.min(18, bodyMentions * 4);
    reasons.push('본문에서 관련 키워드 확인');
  }

  const sourceRole = getRole(source).role;
  const candidateRole = getRole(candidate).role;
  if (sourceRole !== candidateRole) score += 5;

  return {
    post: candidate,
    score: Math.min(100, score),
    reasons,
    anchor: buildAnchor(candidate),
  };
}

function getRelatedPosts(source: Post, posts: Post[], limit = 8) {
  const existingLinks = extractInternalSlugs(source.content);

  return posts
    .filter(
      (candidate) =>
        candidate.id !== source.id &&
        candidate.status === 'published' &&
        !existingLinks.has(candidate.slug)
    )
    .map((candidate) => relationScore(source, candidate))
    .filter((item) => item.score >= 16)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

function appendManagedLink(
  content: string | null | undefined,
  destination: Post,
  label: string
) {
  const current = content || '';
  if (extractInternalSlugs(current).has(destination.slug)) {
    return { content: current, changed: false };
  }

  const block = [
    '<p data-hohaeng-internal-link="1">',
    `<strong>${escapeHtml(label)}</strong> `,
    `<a href="/blog/${escapeHtml(destination.slug)}">${escapeHtml(destination.title)}</a>`,
    '</p>',
  ].join('');

  return {
    content: `${current.trim()}\n${block}`.trim(),
    changed: true,
  };
}

function roleLabel(role: ContentRole) {
  return role === 'pillar' ? 'Pillar 후보' : 'Cluster 후보';
}

export default function InternalLinkManagerPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [posts, setPosts] = useState<Post[]>([]);
  const [input, setInput] = useState('');
  const [targetSlug, setTargetSlug] = useState('');
  const [message, setMessage] = useState('');
  const [applyingKey, setApplyingKey] = useState('');

  const loadPosts = useCallback(async () => {
    const { data, error } = await supabase
      .from('posts')
      .select('id, title, slug, content, category, subcategory, description, status, created_at, updated_at')
      .order('created_at', { ascending: false });

    if (error) throw error;
    setPosts((data || []) as Post[]);
  }, []);

  useEffect(() => {
    const initialize = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.replace('/admin/login');
        return;
      }

      try {
        await loadPosts();
      } catch (error: any) {
        console.error('내부링크 매니저 불러오기 오류:', error);
        setMessage(`⚠ 글 목록을 불러오지 못했습니다: ${error?.message || '다시 시도해주세요.'}`);
      } finally {
        setLoading(false);
      }
    };

    void initialize();
  }, [loadPosts, router]);

  const target = useMemo(
    () => posts.find((post) => post.slug === targetSlug) || null,
    [posts, targetSlug]
  );

  const outbound = useMemo(
    () => (target ? getRelatedPosts(target, posts, 8) : []),
    [posts, target]
  );

  const reverse = useMemo(() => {
    if (!target) return [];

    return posts
      .filter(
        (post) =>
          post.id !== target.id &&
          post.status === 'published' &&
          !extractInternalSlugs(post.content).has(target.slug)
      )
      .map((post) => {
        const scored = relationScore(post, target);
        return {
          post,
          score: scored.score,
          reasons: scored.reasons,
          anchor: buildAnchor(target),
        } satisfies RelatedItem;
      })
      .filter((item) => item.score >= 16)
      .sort((a, b) => b.score - a.score)
      .slice(0, 8);
  }, [posts, target]);

  const pillarCluster = useMemo(() => {
    if (!target) return [];
    const targetRole = getRole(target).role;

    return outbound
      .map((item) => ({
        ...item,
        role: getRole(item.post).role,
      }))
      .filter((item) => item.role !== targetRole)
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);
  }, [outbound, target]);

  const analyze = () => {
    const slug = parseBlogSlug(input);
    setMessage('');

    if (!slug) {
      setTargetSlug('');
      setMessage('⚠ 글 주소 또는 Slug를 입력해주세요.');
      return;
    }

    const found = posts.find((post) => post.slug === slug);
    if (!found) {
      setTargetSlug('');
      setMessage(`⚠ /blog/${slug} 글을 찾지 못했습니다.`);
      return;
    }

    setTargetSlug(found.slug);
  };

  const updateSinglePost = async (source: Post, destination: Post, label: string) => {
    const next = appendManagedLink(source.content, destination, label);
    if (!next.changed) {
      setMessage(`✓ 이미 /blog/${destination.slug} 링크가 들어가 있습니다.`);
      return false;
    }

    const { error } = await supabase
      .from('posts')
      .update({
        content: next.content,
        updated_at: new Date().toISOString(),
      })
      .eq('id', source.id);

    if (error) throw error;
    return true;
  };

  const applyOutbound = async (candidate: Post) => {
    if (!target) return;
    const key = `out-${candidate.id}`;
    try {
      setApplyingKey(key);
      setMessage('');
      const changed = await updateSinglePost(target, candidate, '함께 보면 좋은 글:');
      if (changed) setMessage(`✓ 새 글 → 「${candidate.title}」 내부링크를 추가했습니다.`);
      await loadPosts();
    } catch (error: any) {
      setMessage(`⚠ 내부링크 추가 실패: ${error?.message || '다시 시도해주세요.'}`);
    } finally {
      setApplyingKey('');
    }
  };

  const applyTopOutbound = async () => {
    if (!target || outbound.length === 0) return;
    const selected = outbound.slice(0, 3);

    try {
      setApplyingKey('out-bulk');
      setMessage('');
      let nextContent = target.content || '';
      let added = 0;

      for (const item of selected) {
        const next = appendManagedLink(nextContent, item.post, '함께 보면 좋은 글:');
        nextContent = next.content;
        if (next.changed) added += 1;
      }

      if (added === 0) {
        setMessage('✓ 상위 추천 링크가 이미 모두 들어가 있습니다.');
        return;
      }

      const { error } = await supabase
        .from('posts')
        .update({
          content: nextContent,
          updated_at: new Date().toISOString(),
        })
        .eq('id', target.id);

      if (error) throw error;
      setMessage(`✓ 추천 내부링크 ${added}개를 새 글 하단에 추가했습니다.`);
      await loadPosts();
    } catch (error: any) {
      setMessage(`⚠ 일괄 적용 실패: ${error?.message || '다시 시도해주세요.'}`);
    } finally {
      setApplyingKey('');
    }
  };

  const applyReverse = async (source: Post) => {
    if (!target) return;
    const key = `rev-${source.id}`;
    try {
      setApplyingKey(key);
      setMessage('');
      const changed = await updateSinglePost(source, target, '이 글과 함께 보면 좋은 글:');
      if (changed) setMessage(`✓ 「${source.title}」 → 새 글 역방향 링크를 추가했습니다.`);
      await loadPosts();
    } catch (error: any) {
      setMessage(`⚠ 역방향 링크 추가 실패: ${error?.message || '다시 시도해주세요.'}`);
    } finally {
      setApplyingKey('');
    }
  };

  const applyPillarCluster = async (candidate: Post) => {
    if (!target) return;
    const key = `pc-${candidate.id}`;
    const targetRole = getRole(target).role;
    const candidateRole = getRole(candidate).role;

    if (targetRole === candidateRole) {
      setMessage('⚠ 현재 자동 분류상 두 글의 역할이 같습니다. 일반 내부링크 추천을 이용해주세요.');
      return;
    }

    const pillar = targetRole === 'pillar' ? target : candidate;
    const cluster = targetRole === 'cluster' ? target : candidate;

    const pillarNext = appendManagedLink(pillar.content, cluster, '관련 심화 글:');
    const clusterNext = appendManagedLink(cluster.content, pillar, '기초부터 보기:');

    if (!pillarNext.changed && !clusterNext.changed) {
      setMessage('✓ 이미 Pillar ↔ Cluster 양방향 링크가 연결되어 있습니다.');
      return;
    }

    try {
      setApplyingKey(key);
      setMessage('');

      if (pillarNext.changed) {
        const pillarResult = await supabase
          .from('posts')
          .update({ content: pillarNext.content, updated_at: new Date().toISOString() })
          .eq('id', pillar.id);
        if (pillarResult.error) throw pillarResult.error;
      }

      if (clusterNext.changed) {
        const clusterResult = await supabase
          .from('posts')
          .update({ content: clusterNext.content, updated_at: new Date().toISOString() })
          .eq('id', cluster.id);

        if (clusterResult.error) {
          if (pillarNext.changed) {
            await supabase
              .from('posts')
              .update({ content: pillar.content, updated_at: new Date().toISOString() })
              .eq('id', pillar.id);
          }
          throw clusterResult.error;
        }
      }

      setMessage(`✓ Pillar 「${pillar.title}」 ↔ Cluster 「${cluster.title}」 양방향 연결을 완료했습니다.`);
      await loadPosts();
    } catch (error: any) {
      setMessage(`⚠ Pillar/Cluster 연결 실패: ${error?.message || '다시 시도해주세요.'}`);
    } finally {
      setApplyingKey('');
    }
  };

  const targetRole = target ? getRole(target) : null;
  const existingLinkCount = target ? extractInternalSlugs(target.content).size : 0;

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto max-w-6xl px-5 py-10">
        <div className="mb-7 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.16em] text-cyan-400">INTERNAL LINK MANAGER</p>
            <h1 className="mt-1 text-3xl font-black text-white">🔗 내부링크 매니저</h1>
            <p className="mt-2 text-sm text-slate-400">새 글 주소 하나만 넣으면 관련 글 추천, 역방향 링크, Pillar/Cluster 연결까지 한 화면에서 처리합니다.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href="/admin/manage" className="rounded-xl bg-slate-800 px-4 py-2.5 text-sm font-bold hover:bg-slate-700">📚 글 관리</Link>
            <Link href="/admin/seo-posts" className="rounded-xl bg-emerald-600/15 px-4 py-2.5 text-sm font-bold text-emerald-300 hover:bg-emerald-600/25">🔎 전체 글 SEO</Link>
          </div>
        </div>

        <section className="rounded-2xl border border-cyan-900/70 bg-slate-900 p-5">
          <label className="text-xs font-black text-cyan-300">발행한 글 주소 또는 Slug</label>
          <div className="mt-2 flex flex-col gap-2 sm:flex-row">
            <input
              type="text"
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') analyze();
              }}
              placeholder="https://hohaeng.vercel.app/blog/japan-10y-yield 또는 japan-10y-yield"
              className="min-w-0 flex-1 rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none focus:border-cyan-500"
            />
            <button
              type="button"
              onClick={analyze}
              disabled={loading || !input.trim()}
              className="rounded-xl bg-cyan-600 px-5 py-3 text-sm font-black text-white hover:bg-cyan-500 disabled:opacity-40"
            >
              {loading ? '불러오는 중...' : '🔎 내부링크 분석'}
            </button>
          </div>
          <p className="mt-2 text-[11px] leading-5 text-slate-500">추천은 제목·본문 키워드·카테고리·세부주제를 조합한 규칙 기반 분석입니다. 링크 적용 시 기존 문장은 고치지 않고 글 하단에 별도 링크 문단만 추가합니다.</p>
        </section>

        {message && (
          <div className={`mt-4 rounded-xl border px-4 py-3 text-sm font-bold ${message.startsWith('✓') ? 'border-emerald-700/50 bg-emerald-950/30 text-emerald-300' : 'border-amber-700/50 bg-amber-950/30 text-amber-200'}`}>
            {message}
          </div>
        )}

        {target && targetRole && (
          <>
            <section className="mt-5 rounded-2xl border border-slate-800 bg-slate-900 p-5">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-lg bg-blue-500/10 px-2.5 py-1 text-xs font-black text-blue-300">분석 대상</span>
                    <span className={`rounded-lg px-2.5 py-1 text-xs font-black ${targetRole.role === 'pillar' ? 'bg-violet-500/10 text-violet-300' : 'bg-amber-500/10 text-amber-300'}`}>{roleLabel(targetRole.role)}</span>
                    <span className="rounded-lg bg-slate-800 px-2.5 py-1 text-xs text-slate-400">기존 내부링크 {existingLinkCount}개</span>
                  </div>
                  <h2 className="mt-3 text-xl font-black text-white">{target.title}</h2>
                  <p className="mt-1 break-all text-xs text-slate-500">/blog/{target.slug}</p>
                  {targetRole.reasons.length > 0 && <p className="mt-2 text-xs text-slate-400">자동 분류 근거: {targetRole.reasons.join(' · ')}</p>}
                </div>
                <div className="flex shrink-0 flex-wrap gap-2">
                  <Link href={`/blog/${target.slug}`} target="_blank" className="rounded-lg bg-slate-800 px-3 py-2 text-xs font-bold hover:bg-slate-700">👁 글 보기</Link>
                  <Link href={`/admin/edit/${target.id}`} className="rounded-lg bg-blue-600/15 px-3 py-2 text-xs font-bold text-blue-300 hover:bg-blue-600/25">✏️ 편집기</Link>
                </div>
              </div>
            </section>

            <section className="mt-5 rounded-2xl border border-slate-800 bg-slate-900 p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-black text-blue-400">① NEW → EXISTING</p>
                  <h2 className="mt-1 text-lg font-black text-white">새 글에 연결하면 좋은 기존 글</h2>
                  <p className="mt-1 text-xs text-slate-500">이미 링크된 글은 자동 제외합니다. 적용해도 원문 문장은 바뀌지 않습니다.</p>
                </div>
                {outbound.length > 0 && (
                  <button
                    type="button"
                    onClick={() => void applyTopOutbound()}
                    disabled={Boolean(applyingKey)}
                    className="rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-black text-white hover:bg-blue-500 disabled:opacity-40"
                  >
                    {applyingKey === 'out-bulk' ? '적용 중...' : '상위 3개 한 번에 적용'}
                  </button>
                )}
              </div>

              <div className="mt-4 grid gap-3">
                {outbound.length === 0 ? (
                  <p className="rounded-xl border border-slate-800 bg-slate-950/60 p-4 text-sm text-slate-400">현재 기준으로 새로 추천할 관련 글이 없습니다.</p>
                ) : outbound.map((item, index) => (
                  <div key={item.post.id} className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="min-w-0">
                        <p className="text-[11px] font-black text-blue-400">추천 #{index + 1} · 관련도 {item.score}%</p>
                        <h3 className="mt-1 font-black text-white">{item.post.title}</h3>
                        <p className="mt-1 text-xs text-slate-500">추천 앵커: <span className="font-bold text-slate-300">{item.anchor}</span></p>
                        <p className="mt-1 text-xs text-slate-500">{item.reasons.join(' · ') || '콘텐츠 주제 유사성'}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => void applyOutbound(item.post)}
                        disabled={Boolean(applyingKey)}
                        className="shrink-0 rounded-lg border border-blue-700 bg-blue-950/40 px-3 py-2 text-xs font-black text-blue-200 hover:bg-blue-900/50 disabled:opacity-40"
                      >
                        {applyingKey === `out-${item.post.id}` ? '추가 중...' : '＋ 이 링크 적용'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section className="mt-5 rounded-2xl border border-slate-800 bg-slate-900 p-5">
              <div>
                <p className="text-xs font-black text-emerald-400">② EXISTING → NEW</p>
                <h2 className="mt-1 text-lg font-black text-white">기존 글에서 새 글로 보내면 좋은 역방향 링크</h2>
                <p className="mt-1 text-xs text-slate-500">새 글을 고립시키지 않도록 관련 기존 글에서 새 글로 들어오는 링크를 추천합니다.</p>
              </div>

              <div className="mt-4 grid gap-3">
                {reverse.length === 0 ? (
                  <p className="rounded-xl border border-slate-800 bg-slate-950/60 p-4 text-sm text-slate-400">현재 기준으로 새로 추가할 역방향 링크가 없습니다.</p>
                ) : reverse.map((item, index) => (
                  <div key={item.post.id} className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="min-w-0">
                        <p className="text-[11px] font-black text-emerald-400">역방향 #{index + 1} · 관련도 {item.score}%</p>
                        <h3 className="mt-1 font-black text-white">{item.post.title}</h3>
                        <p className="mt-1 text-xs text-slate-500">이 글 하단에서 → <span className="font-bold text-slate-300">{target.title}</span></p>
                        <p className="mt-1 text-xs text-slate-500">{item.reasons.join(' · ') || '콘텐츠 주제 유사성'}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => void applyReverse(item.post)}
                        disabled={Boolean(applyingKey)}
                        className="shrink-0 rounded-lg border border-emerald-700 bg-emerald-950/30 px-3 py-2 text-xs font-black text-emerald-200 hover:bg-emerald-900/40 disabled:opacity-40"
                      >
                        {applyingKey === `rev-${item.post.id}` ? '추가 중...' : '← 역방향 링크 적용'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section className="mt-5 rounded-2xl border border-violet-900/70 bg-violet-950/10 p-5">
              <div>
                <p className="text-xs font-black text-violet-400">③ PILLAR ↔ CLUSTER</p>
                <h2 className="mt-1 text-lg font-black text-white">Pillar / Cluster 자동 연결 후보</h2>
                <p className="mt-1 text-xs text-slate-500">기초·개념형 넓은 글은 Pillar, 세부 이슈·사례형 글은 Cluster로 추정합니다. 버튼 한 번으로 두 글을 서로 연결합니다.</p>
              </div>

              <div className="mt-4 grid gap-3">
                {pillarCluster.length === 0 ? (
                  <p className="rounded-xl border border-violet-900/50 bg-slate-950/60 p-4 text-sm text-slate-400">반대 역할의 관련 글이 아직 충분히 확인되지 않습니다. 글이 더 쌓이면 자동 후보가 늘어납니다.</p>
                ) : pillarCluster.map((item) => {
                  const candidateRole = getRole(item.post).role;
                  return (
                    <div key={item.post.id} className="rounded-xl border border-violet-900/50 bg-slate-950/60 p-4">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div className="min-w-0">
                          <div className="flex flex-wrap gap-2">
                            <span className="rounded-lg bg-slate-800 px-2 py-1 text-[11px] font-black text-slate-300">현재 글: {roleLabel(targetRole.role)}</span>
                            <span className="rounded-lg bg-violet-500/10 px-2 py-1 text-[11px] font-black text-violet-300">후보: {roleLabel(candidateRole)}</span>
                            <span className="rounded-lg bg-slate-800 px-2 py-1 text-[11px] text-slate-400">관련도 {item.score}%</span>
                          </div>
                          <h3 className="mt-2 font-black text-white">{item.post.title}</h3>
                          <p className="mt-1 text-xs text-slate-500">연결 후 Pillar에는 ‘관련 심화 글’, Cluster에는 ‘기초부터 보기’ 링크가 자동 추가됩니다.</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => void applyPillarCluster(item.post)}
                          disabled={Boolean(applyingKey)}
                          className="shrink-0 rounded-lg bg-violet-600 px-3 py-2 text-xs font-black text-white hover:bg-violet-500 disabled:opacity-40"
                        >
                          {applyingKey === `pc-${item.post.id}` ? '연결 중...' : '↔ 양방향 연결'}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          </>
        )}
      </div>
    </main>
  );
}
