"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { supabase } from "@/app/lib/supabase";

type DailyRecommendation = {
  id: string | null;
  recommendationDate: string;
  rank: number;
  keyword: string;
  recommendedTitle: string;
  sourceType: string;
  strategy: string;
  reason: string;
  candidateScore: number;
  createdAt: string | null;
  analysis: {
    modelVersion: string;
    keyword: {
      primary: string;
      secondary: string[];
      intent: string;
      contentRole: "pillar" | "cluster";
      contentType: string;
    };
    scores: {
      opportunity: number;
      serpDifficulty: number;
      siteAuthority: number;
      titleSeo: number;
      gscStrength: number;
    };
    prediction: {
      min: number;
      max: number;
      optimizedMin: number;
      optimizedMax: number;
      clusterMin: number;
      clusterMax: number;
      top10Probability: number;
      confidence: string;
      confidenceReasons: string[];
    };
    gsc: {
      connected: boolean;
      relatedCount: number;
      totalImpressions: number;
      totalClicks: number;
      averagePosition: number | null;
      bestPosition: number | null;
    };
    serp: {
      connected: boolean;
      provider: "serper" | "fallback";
      resultCount: number;
      authorityResultCount: number;
    };
    recommendations: Array<{
      title: string;
      detail: string;
      impact: number;
    }>;
    cluster: {
      pillarTopic: string;
      suggestedClusters: string[];
      internalLinkSentence: string;
    };
    quickWin: boolean;
  };
};

function rankText(min: number, max: number) {
  return min === max ? `${min}위` : `${min}~${max}위`;
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("ko-KR").format(Math.round(value));
}

function sourceLabel(sourceType: string) {
  if (sourceType === "gsc-quick-win") return "GSC 빠른공략";
  if (sourceType === "google-suggest") return "Google 자동완성";
  if (sourceType === "gsc-opportunity") return "GSC 기회";
  return "연관 확장";
}

function probabilityTone(value: number) {
  if (value >= 70) return "bg-emerald-100 text-emerald-700";
  if (value >= 50) return "bg-blue-100 text-blue-700";
  return "bg-amber-100 text-amber-700";
}

export default function DailySeoKeywordPage() {
  const router = useRouter();
  const [items, setItems] = useState<DailyRecommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const [regenerating, setRegenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  async function authHeader() {
    const { data } = await supabase.auth.getSession();
    const session = data.session;
    if (!session) {
      router.replace("/admin/login");
      return null;
    }
    return { Authorization: `Bearer ${session.access_token}` };
  }

  async function load(force = false) {
    if (force) setRegenerating(true);
    else setLoading(true);
    setError(null);
    setNotice(null);

    try {
      const headers = await authHeader();
      if (!headers) return;
      const response = await fetch("/api/admin/seo-keywords", {
        method: force ? "POST" : "GET",
        headers,
        cache: "no-store",
      });
      const payload = (await response.json()) as {
        ok: boolean;
        recommendations?: DailyRecommendation[];
        error?: string;
      };
      if (!response.ok || !payload.ok) throw new Error(payload.error || `HTTP ${response.status}`);
      setItems(payload.recommendations ?? []);
      if (force) setNotice("오늘 추천 키워드 5개를 최신 GSC·Google 자동완성·V3 예상순위 기준으로 다시 만들었습니다.");
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "오늘 추천 키워드를 불러오지 못했습니다.");
    } finally {
      setLoading(false);
      setRegenerating(false);
    }
  }

  useEffect(() => {
    void load(false);
  }, []);

  async function copyTitle(item: DailyRecommendation) {
    await navigator.clipboard.writeText(item.recommendedTitle);
    setCopied(item.keyword);
    window.setTimeout(() => setCopied(null), 1400);
  }

  const recommendationDate = items[0]?.recommendationDate ?? "오늘";
  const averageTop10 = items.length
    ? Math.round(items.reduce((sum, item) => sum + item.analysis.prediction.top10Probability, 0) / items.length)
    : 0;
  const quickWins = items.filter((item) => item.analysis.quickWin).length;
  const liveSerp = items.filter((item) => item.analysis.serp.connected).length;

  return (
    <main className="min-h-screen bg-[#f5f7fb] pb-24 text-slate-950">
      <section className="bg-slate-950 text-white">
        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
          <div className="flex flex-wrap items-start justify-between gap-5">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.2em] text-orange-300">
                HOHAENG DAILY SEO PICKS
              </p>
              <h1 className="mt-2 text-3xl font-black sm:text-4xl">
                오늘 쓰면 좋은 키워드 5개
              </h1>
              <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-300">
                호행처럼 Search Console에서 이미 잡히는 주제와 Google 자동완성을 확장한 뒤,
                Rank Predictor V3로 예상 순위까지 다시 계산해 상위 가능성이 높은 5개만 남깁니다.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link
                href="/admin/seo"
                className="rounded-xl border border-white/15 bg-white/5 px-4 py-2.5 text-sm font-black text-white"
              >
                V3 상세 분석 →
              </Link>
              <button
                onClick={() => void load(true)}
                disabled={regenerating || loading}
                className="rounded-xl bg-white px-4 py-2.5 text-sm font-black text-slate-950 disabled:opacity-50"
              >
                {regenerating ? "5개 다시 분석 중..." : "오늘 5개 다시 뽑기"}
              </button>
            </div>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-7xl space-y-7 px-4 py-8 sm:px-6">
        <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-black text-slate-400">추천 기준일</p>
            <p className="mt-2 text-2xl font-black">{recommendationDate}</p>
            <p className="mt-1 text-xs text-slate-400">매일 한국시간 06:05 자동 갱신</p>
          </div>
          <div className="rounded-3xl border border-blue-200 bg-blue-50 p-5 shadow-sm">
            <p className="text-xs font-black text-blue-700">평균 TOP10 확률</p>
            <p className="mt-2 text-3xl font-black text-blue-800">{averageTop10}%</p>
            <p className="mt-1 text-xs text-blue-700/70">5개 추천의 평균 모델 확률</p>
          </div>
          <div className="rounded-3xl border border-emerald-200 bg-emerald-50 p-5 shadow-sm">
            <p className="text-xs font-black text-emerald-700">빠른 상위진입 후보</p>
            <p className="mt-2 text-3xl font-black text-emerald-800">{quickWins}개</p>
            <p className="mt-1 text-xs text-emerald-700/70">이미 GSC 신호가 있는 키워드</p>
          </div>
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-black text-slate-400">실시간 SERP 반영</p>
            <p className="mt-2 text-3xl font-black">{liveSerp}/{items.length || 5}</p>
            <p className="mt-1 text-xs text-slate-400">SERPER 키가 없으면 보수적 추정</p>
          </div>
        </section>

        <section className="rounded-3xl border border-violet-200 bg-violet-50 p-5 sm:p-6">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-violet-700">HOW IT PICKS</p>
          <h2 className="mt-1 text-xl font-black">매일 같은 키워드를 반복 추천하지 않습니다</h2>
          <p className="mt-2 text-sm leading-7 text-violet-900/70">
            최근 21일 추천 키워드는 제외하고, GSC 노출·현재 순위·CTR 여지·롱테일 구체성·Google 자동완성·호행처럼 주제 강도·SERP 난이도·TOP10 확률을 합산합니다.
            비슷한 키워드만 5개 몰리지 않도록 주제 중복도도 한 번 더 제거합니다.
          </p>
        </section>

        {error && (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm font-bold text-rose-700">
            {error}
          </div>
        )}
        {notice && (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-bold text-emerald-700">
            {notice}
          </div>
        )}

        {loading && (
          <section className="rounded-3xl border border-slate-200 bg-white p-10 text-center shadow-sm">
            <p className="text-lg font-black">오늘 쓸 키워드 5개를 분석하고 있습니다.</p>
            <p className="mt-2 text-sm text-slate-500">GSC → 자동완성 → V3 예상순위 순으로 확인합니다.</p>
          </section>
        )}

        {!loading && !error && items.length === 0 && (
          <section className="rounded-3xl border border-dashed border-slate-300 bg-white p-8 text-center">
            <p className="font-black">오늘 추천 데이터가 아직 없습니다.</p>
            <button onClick={() => void load(true)} className="mt-4 rounded-xl bg-slate-950 px-5 py-3 text-sm font-black text-white">
              지금 5개 만들기
            </button>
          </section>
        )}

        <section className="space-y-5">
          {items.map((item) => {
            const analysis = item.analysis;
            return (
              <article key={`${item.recommendationDate}-${item.rank}`} className="overflow-hidden rounded-[30px] border border-slate-200 bg-white shadow-sm">
                <div className="p-5 sm:p-7">
                  <div className="flex flex-wrap items-start justify-between gap-5">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full bg-slate-950 px-3 py-1.5 text-xs font-black text-white">
                          TOP {item.rank}
                        </span>
                        <span className="rounded-full bg-orange-100 px-3 py-1.5 text-xs font-black text-orange-700">
                          {item.strategy}
                        </span>
                        <span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-black text-slate-600">
                          {sourceLabel(item.sourceType)}
                        </span>
                        <span className={`rounded-full px-3 py-1.5 text-xs font-black ${probabilityTone(analysis.prediction.top10Probability)}`}>
                          TOP10 {analysis.prediction.top10Probability}%
                        </span>
                      </div>

                      <h2 className="mt-4 text-3xl font-black tracking-tight text-slate-950">
                        {item.keyword}
                      </h2>
                      <p className="mt-2 text-sm font-bold leading-6 text-slate-500">{item.reason}</p>

                      <div className="mt-5 rounded-2xl border border-blue-100 bg-blue-50 p-4 sm:p-5">
                        <p className="text-xs font-black uppercase tracking-[0.16em] text-blue-700">추천 글 제목</p>
                        <p className="mt-2 text-lg font-black leading-7 text-blue-950">{item.recommendedTitle}</p>
                        <div className="mt-4 flex flex-wrap gap-2">
                          <button
                            onClick={() => void copyTitle(item)}
                            className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-black text-white"
                          >
                            {copied === item.keyword ? "복사 완료 ✓" : "제목 복사"}
                          </button>
                          <Link
                            href="/admin/seo"
                            className="rounded-xl border border-blue-200 bg-white px-4 py-2.5 text-sm font-black text-blue-700"
                          >
                            V3 상세 분석 화면 →
                          </Link>
                        </div>
                      </div>
                    </div>

                    <div className="grid w-full grid-cols-2 gap-3 sm:w-[370px]">
                      <div className="rounded-2xl bg-slate-950 p-4 text-white">
                        <p className="text-[11px] font-black text-slate-400">현재 예상 순위</p>
                        <p className="mt-2 text-2xl font-black">{rankText(analysis.prediction.min, analysis.prediction.max)}</p>
                        <p className="mt-1 text-[11px] text-slate-400">신뢰도 {analysis.prediction.confidence}</p>
                      </div>
                      <div className="rounded-2xl bg-emerald-50 p-4">
                        <p className="text-[11px] font-black text-emerald-700">글 보강 후</p>
                        <p className="mt-2 text-2xl font-black text-emerald-800">
                          {rankText(analysis.prediction.optimizedMin, analysis.prediction.optimizedMax)}
                        </p>
                        <p className="mt-1 text-[11px] text-emerald-700/70">추천 수정 반영 기준</p>
                      </div>
                      <div className="rounded-2xl bg-blue-50 p-4">
                        <p className="text-[11px] font-black text-blue-700">기회 점수</p>
                        <p className="mt-2 text-2xl font-black text-blue-800">{analysis.scores.opportunity}/100</p>
                      </div>
                      <div className="rounded-2xl bg-amber-50 p-4">
                        <p className="text-[11px] font-black text-amber-700">SERP 난이도</p>
                        <p className="mt-2 text-2xl font-black text-amber-800">{analysis.scores.serpDifficulty}/100</p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-5 grid gap-3 lg:grid-cols-3">
                    <div className="rounded-2xl bg-slate-50 p-4">
                      <p className="text-xs font-black text-slate-400">호행처럼 기존 검색 신호</p>
                      <p className="mt-2 text-sm font-black">
                        연관 검색어 {analysis.gsc.relatedCount}개 · 노출 {formatNumber(analysis.gsc.totalImpressions)}회
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        평균 {analysis.gsc.averagePosition === null ? "데이터 부족" : `${analysis.gsc.averagePosition.toFixed(1)}위`} · 사이트 주제 강도 {analysis.scores.siteAuthority}/100
                      </p>
                    </div>
                    <div className="rounded-2xl bg-slate-50 p-4">
                      <p className="text-xs font-black text-slate-400">검색 의도 / 구조</p>
                      <p className="mt-2 text-sm font-black">{analysis.keyword.intent}</p>
                      <p className="mt-1 text-xs text-slate-500">
                        {analysis.keyword.contentRole === "pillar" ? "Pillar 글 추천" : "Cluster 글 추천"} · {analysis.keyword.contentType}
                      </p>
                    </div>
                    <div className="rounded-2xl bg-slate-50 p-4">
                      <p className="text-xs font-black text-slate-400">Cluster까지 구축하면</p>
                      <p className="mt-2 text-sm font-black">
                        예상 {rankText(analysis.prediction.clusterMin, analysis.prediction.clusterMax)}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">Pillar: {analysis.cluster.pillarTopic}</p>
                    </div>
                  </div>

                  <div className="mt-5 grid gap-4 lg:grid-cols-2">
                    <div className="rounded-2xl border border-slate-200 p-4 sm:p-5">
                      <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">먼저 보강할 것</p>
                      <div className="mt-3 space-y-3">
                        {analysis.recommendations.slice(0, 3).map((recommendation) => (
                          <div key={recommendation.title}>
                            <p className="text-sm font-black">{recommendation.title} <span className="text-emerald-600">+{recommendation.impact}</span></p>
                            <p className="mt-1 text-xs leading-5 text-slate-500">{recommendation.detail}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="rounded-2xl border border-slate-200 p-4 sm:p-5">
                      <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">이어서 쓸 Cluster</p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {analysis.cluster.suggestedClusters.slice(0, 5).map((cluster) => (
                          <span key={cluster} className="rounded-xl bg-slate-100 px-3 py-2 text-xs font-bold text-slate-600">
                            {cluster}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </section>
      </div>
    </main>
  );
}
