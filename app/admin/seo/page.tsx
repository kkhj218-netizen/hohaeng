"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { supabase } from "@/app/lib/supabase";

type Recommendation = {
  title: string;
  detail: string;
  impact: number;
};

type Analysis = {
  modelVersion: string;
  generatedAt: string;
  title: string;
  url: string | null;
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
    intentFit: number;
    gscStrength: number;
    serpAccessibility: number;
    specificity: number;
    breakdown: Record<string, number>;
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
    error: string | null;
    relatedCount: number;
    totalImpressions: number;
    totalClicks: number;
    averagePosition: number | null;
    bestPosition: number | null;
    top20Count: number;
    relatedQueries: Array<{
      query: string;
      clicks: number;
      impressions: number;
      ctr: number;
      position: number;
      relevance: number;
    }>;
  };
  serp: {
    connected: boolean;
    provider: "serper" | "fallback";
    error: string | null;
    resultCount: number;
    authorityResultCount: number;
    exactIntentResultCount: number;
    hasAnswerFeature: boolean;
    organic: Array<{
      position: number;
      title: string;
      link: string;
      domain: string;
      snippet: string;
      authorityLike: boolean;
      titleMatch: number;
    }>;
  };
  recommendations: Recommendation[];
  cluster: {
    pillarTopic: string;
    suggestedClusters: string[];
    internalLinkSentence: string;
  };
  quickWin: boolean;
};

type HistoryItem = {
  id: string;
  createdAt: string;
  title: string;
  url: string | null;
  primaryKeyword: string;
  opportunityScore: number;
  serpDifficulty: number;
  siteAuthority: number;
  predictedMin: number;
  predictedMax: number;
  top10Probability: number;
  confidence: string;
  serpConnected: boolean;
  gscConnected: boolean;
  actualPosition7d: number | null;
  actualPosition14d: number | null;
  actualPosition30d: number | null;
  actualPosition60d: number | null;
  predictionError30d: number | null;
  lastCheckedAt: string | null;
};

type SessionHeaders = { Authorization: string };

const SCORE_LABELS: Array<[keyof Analysis["scores"]["breakdown"], string, number]> = [
  ["titleFit", "제목 적합도", 15],
  ["intentFit", "검색의도", 10],
  ["siteAuthority", "사이트 주제 강도", 25],
  ["gscStrength", "GSC 기존 성과", 20],
  ["serpAccessibility", "SERP 공략 가능성", 25],
  ["specificity", "롱테일 구체성", 5],
];

function formatNumber(value: number) {
  return new Intl.NumberFormat("ko-KR").format(Math.round(value));
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("ko-KR", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function scoreClass(score: number) {
  if (score >= 80) return "text-emerald-600";
  if (score >= 65) return "text-blue-600";
  if (score >= 50) return "text-amber-600";
  return "text-rose-600";
}

function scoreBar(score: number) {
  return `${Math.max(2, Math.min(100, score))}%`;
}

function rankText(min: number, max: number) {
  return min === max ? `${min}위` : `${min}~${max}위`;
}

function actualText(value: number | null) {
  return value === null ? "-" : `${value.toFixed(1)}위`;
}

function SourceBadge({ connected, children }: { connected: boolean; children: React.ReactNode }) {
  return (
    <span
      className={`rounded-full px-2.5 py-1 text-[11px] font-black ${
        connected
          ? "bg-emerald-100 text-emerald-700"
          : "bg-amber-100 text-amber-700"
      }`}
    >
      {connected ? "● LIVE" : "○ FALLBACK"} {children}
    </span>
  );
}

function MetricCard({
  label,
  value,
  description,
  emphasis = false,
}: {
  label: string;
  value: string;
  description: string;
  emphasis?: boolean;
}) {
  return (
    <div
      className={`rounded-3xl border p-5 shadow-sm ${
        emphasis
          ? "border-blue-200 bg-blue-50"
          : "border-slate-200 bg-white"
      }`}
    >
      <p className={`text-xs font-black ${emphasis ? "text-blue-700" : "text-slate-400"}`}>
        {label}
      </p>
      <p className={`mt-2 text-3xl font-black tracking-tight ${emphasis ? "text-blue-800" : "text-slate-950"}`}>
        {value}
      </p>
      <p className={`mt-2 text-xs leading-5 ${emphasis ? "text-blue-700/70" : "text-slate-500"}`}>
        {description}
      </p>
    </div>
  );
}

export default function GoogleSeoIntelligencePage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [calibrating, setCalibrating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function authHeaders(): Promise<SessionHeaders | null> {
    const { data } = await supabase.auth.getSession();
    const session = data.session;
    if (!session) {
      router.replace("/admin/login");
      return null;
    }
    return { Authorization: `Bearer ${session.access_token}` };
  }

  async function loadHistory() {
    setHistoryLoading(true);
    try {
      const headers = await authHeaders();
      if (!headers) return;
      const response = await fetch("/api/admin/seo-rank", {
        headers,
        cache: "no-store",
      });
      const payload = (await response.json()) as {
        ok: boolean;
        history?: HistoryItem[];
        error?: string;
      };
      if (!response.ok || !payload.ok) throw new Error(payload.error || `HTTP ${response.status}`);
      setHistory(payload.history ?? []);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "예측 이력을 불러오지 못했습니다.");
    } finally {
      setHistoryLoading(false);
    }
  }

  useEffect(() => {
    void loadHistory();
  }, []);

  async function analyze() {
    if (title.trim().length < 4) {
      setError("분석할 제목을 4자 이상 입력해 주세요.");
      return;
    }

    setLoading(true);
    setError(null);
    setNotice(null);

    try {
      const headers = await authHeaders();
      if (!headers) return;
      const response = await fetch("/api/admin/seo-rank", {
        method: "POST",
        headers: {
          ...headers,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ title: title.trim(), url: url.trim() || null }),
      });
      const payload = (await response.json()) as {
        ok: boolean;
        analysis?: Analysis;
        saveError?: string | null;
        error?: string;
      };
      if (!response.ok || !payload.ok || !payload.analysis) {
        throw new Error(payload.error || `HTTP ${response.status}`);
      }
      setAnalysis(payload.analysis);
      if (payload.saveError) setNotice(`분석은 완료됐지만 이력 저장은 실패했습니다: ${payload.saveError}`);
      else setNotice("분석 결과를 저장했습니다. URL을 넣었다면 7·14·30·60일 실제 순위 보정 대상이 됩니다.");
      await loadHistory();
    } catch (analysisError) {
      setError(analysisError instanceof Error ? analysisError.message : "분석에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  }

  async function calibrate() {
    setCalibrating(true);
    setError(null);
    setNotice(null);
    try {
      const headers = await authHeaders();
      if (!headers) return;
      const response = await fetch("/api/admin/seo-rank/calibrate", {
        method: "POST",
        headers,
      });
      const payload = (await response.json()) as {
        ok: boolean;
        result?: { checked: number; updated: number; noData: number; failures: unknown[] };
        error?: string;
      };
      if (!response.ok || !payload.ok || !payload.result) {
        throw new Error(payload.error || `HTTP ${response.status}`);
      }
      setNotice(
        `실제 순위 보정 완료 · 확인 ${payload.result.checked}개 / 업데이트 ${payload.result.updated}개 / GSC 데이터 없음 ${payload.result.noData}개`,
      );
      await loadHistory();
    } catch (calibrationError) {
      setError(calibrationError instanceof Error ? calibrationError.message : "보정에 실패했습니다.");
    } finally {
      setCalibrating(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#f5f7fb] pb-24 text-slate-950">
      <section className="bg-slate-950 text-white">
        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
          <div className="flex flex-wrap items-start justify-between gap-5">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.2em] text-cyan-300">
                HOHAENG GOOGLE SEO INTELLIGENCE · V3
              </p>
              <h1 className="mt-2 text-3xl font-black sm:text-4xl">
                제목 하나로 Google 예상 순위 분석
              </h1>
              <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-300">
                제목 키워드, 호행처럼 Search Console 실데이터, Google SERP 경쟁도를 함께 계산합니다.
                단일 순위를 맞힌다고 가장하지 않고 예상 구간·TOP10 확률·신뢰도를 보여줍니다.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link
                href="/admin/analytics"
                className="rounded-xl border border-white/15 bg-white/5 px-4 py-2.5 text-sm font-black text-white"
              >
                Search Console 대시보드 →
              </Link>
              <button
                onClick={() => void calibrate()}
                disabled={calibrating}
                className="rounded-xl bg-white px-4 py-2.5 text-sm font-black text-slate-950 disabled:opacity-50"
              >
                {calibrating ? "실제 순위 확인 중..." : "실제 순위 보정"}
              </button>
            </div>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-7xl space-y-7 px-4 py-8 sm:px-6">
        <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
          <div className="grid gap-4 lg:grid-cols-[1fr_0.55fr_auto] lg:items-end">
            <label>
              <span className="text-xs font-black text-slate-500">분석할 글 제목</span>
              <input
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") void analyze();
                }}
                placeholder="예: 연봉 계산 완벽 가이드｜세전·세후·실수령액·성과급·식대까지"
                className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm font-bold outline-none transition focus:border-blue-400 focus:bg-white"
              />
            </label>
            <label>
              <span className="text-xs font-black text-slate-500">글 URL · 선택</span>
              <input
                value={url}
                onChange={(event) => setUrl(event.target.value)}
                placeholder="/blog/... 또는 전체 URL"
                className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm outline-none transition focus:border-blue-400 focus:bg-white"
              />
            </label>
            <button
              onClick={() => void analyze()}
              disabled={loading}
              className="h-[54px] rounded-2xl bg-blue-600 px-7 text-sm font-black text-white shadow-sm transition hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? "V3 분석 중..." : "예상 순위 분석"}
            </button>
          </div>
          <p className="mt-3 text-xs leading-5 text-slate-400">
            URL 없이 새 글을 사전 분석할 수 있습니다. 발행된 글은 URL까지 넣으면 예측 이력이 저장되고 자동 보정에 사용됩니다.
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

        {analysis && (
          <>
            <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <MetricCard
                label="Google 기회 점수"
                value={`${analysis.scores.opportunity}/100`}
                description="제목·GSC·SERP·롱테일을 합친 호행처럼 전용 점수"
                emphasis
              />
              <MetricCard
                label="현재 예상 순위"
                value={rankText(analysis.prediction.min, analysis.prediction.max)}
                description={`예측 신뢰도 ${analysis.prediction.confidence}`}
              />
              <MetricCard
                label="TOP10 진입 확률"
                value={`${analysis.prediction.top10Probability}%`}
                description="현재 제목과 사이트 상태 기준 모델 추정치"
              />
              <MetricCard
                label="Google 경쟁도"
                value={`${analysis.scores.serpDifficulty}/100`}
                description={analysis.serp.connected ? "실시간 SERP 상위 결과 반영" : "SERP 키 미연결 · 보수적 추정"}
              />
            </section>

            <section className="overflow-hidden rounded-[30px] border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-100 p-5 sm:p-7">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.18em] text-blue-600">KEYWORD ENGINE</p>
                    <h2 className="mt-2 text-2xl font-black">{analysis.keyword.primary}</h2>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <span className="rounded-full bg-slate-950 px-3 py-1.5 text-xs font-black text-white">
                        {analysis.keyword.contentRole.toUpperCase()}
                      </span>
                      <span className="rounded-full bg-blue-50 px-3 py-1.5 text-xs font-black text-blue-700">
                        {analysis.keyword.intent}
                      </span>
                      <span className="rounded-full bg-violet-50 px-3 py-1.5 text-xs font-black text-violet-700">
                        {analysis.keyword.contentType}
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <SourceBadge connected={analysis.gsc.connected}>GSC</SourceBadge>
                    <SourceBadge connected={analysis.serp.connected}>GOOGLE SERP</SourceBadge>
                  </div>
                </div>
                {analysis.keyword.secondary.length > 0 && (
                  <div className="mt-5 flex flex-wrap gap-2">
                    {analysis.keyword.secondary.map((keyword) => (
                      <span key={keyword} className="rounded-lg bg-slate-100 px-2.5 py-1.5 text-xs font-bold text-slate-600">
                        {keyword}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="grid gap-0 lg:grid-cols-3">
                <div className="border-b border-slate-100 p-5 sm:p-7 lg:border-b-0 lg:border-r">
                  <p className="text-xs font-black text-slate-400">현재 상태</p>
                  <p className="mt-2 text-4xl font-black">{rankText(analysis.prediction.min, analysis.prediction.max)}</p>
                  <p className="mt-2 text-xs text-slate-500">지금 제목·사이트·경쟁환경 기준</p>
                </div>
                <div className="border-b border-slate-100 bg-blue-50/50 p-5 sm:p-7 lg:border-b-0 lg:border-r">
                  <p className="text-xs font-black text-blue-600">추천 수정 반영 후</p>
                  <p className="mt-2 text-4xl font-black text-blue-800">
                    {rankText(analysis.prediction.optimizedMin, analysis.prediction.optimizedMax)}
                  </p>
                  <p className="mt-2 text-xs text-blue-700/70">계산기·표·내부링크 등 권장사항 반영 가정</p>
                </div>
                <div className="bg-emerald-50/60 p-5 sm:p-7">
                  <p className="text-xs font-black text-emerald-700">Cluster 구축 후</p>
                  <p className="mt-2 text-4xl font-black text-emerald-800">
                    {rankText(analysis.prediction.clusterMin, analysis.prediction.clusterMax)}
                  </p>
                  <p className="mt-2 text-xs text-emerald-700/70">주제 폭과 내부링크가 추가로 강화된 경우</p>
                </div>
              </div>
            </section>

            <section className="grid gap-5 lg:grid-cols-[0.85fr_1.15fr]">
              <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">MODEL BREAKDOWN</p>
                <h2 className="mt-1 text-xl font-black">왜 이 점수가 나왔을까?</h2>
                <div className="mt-5 space-y-4">
                  {SCORE_LABELS.map(([key, label, weight]) => {
                    const value = analysis.scores.breakdown[key] ?? 0;
                    return (
                      <div key={key}>
                        <div className="mb-1.5 flex items-center justify-between text-xs">
                          <span className="font-bold text-slate-600">{label} · 비중 {weight}%</span>
                          <strong className={scoreClass(value)}>{value}/100</strong>
                        </div>
                        <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                          <div className="h-full rounded-full bg-slate-900" style={{ width: scoreBar(value) }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="mt-6 rounded-2xl bg-slate-50 p-4">
                  <p className="text-xs font-black text-slate-400">예측 신뢰도 · {analysis.prediction.confidence}</p>
                  <div className="mt-2 space-y-1 text-xs leading-5 text-slate-600">
                    {analysis.prediction.confidenceReasons.map((reason) => (
                      <p key={reason}>• {reason}</p>
                    ))}
                  </div>
                </div>
              </div>

              <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-600">HOHAENG AUTHORITY ENGINE</p>
                    <h2 className="mt-1 text-xl font-black">Search Console에서 이미 힘이 있는 주제인가?</h2>
                  </div>
                  <span className={`text-3xl font-black ${scoreClass(analysis.scores.siteAuthority)}`}>
                    {analysis.scores.siteAuthority}
                  </span>
                </div>

                <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <div className="rounded-2xl bg-slate-50 p-3">
                    <p className="text-[11px] font-black text-slate-400">관련 검색어</p>
                    <p className="mt-1 text-xl font-black">{analysis.gsc.relatedCount}개</p>
                  </div>
                  <div className="rounded-2xl bg-slate-50 p-3">
                    <p className="text-[11px] font-black text-slate-400">노출</p>
                    <p className="mt-1 text-xl font-black">{formatNumber(analysis.gsc.totalImpressions)}</p>
                  </div>
                  <div className="rounded-2xl bg-slate-50 p-3">
                    <p className="text-[11px] font-black text-slate-400">관련 평균 순위</p>
                    <p className="mt-1 text-xl font-black">
                      {analysis.gsc.averagePosition === null ? "-" : `${analysis.gsc.averagePosition.toFixed(1)}위`}
                    </p>
                  </div>
                  <div className="rounded-2xl bg-slate-50 p-3">
                    <p className="text-[11px] font-black text-slate-400">TOP20 검색어</p>
                    <p className="mt-1 text-xl font-black">{analysis.gsc.top20Count}개</p>
                  </div>
                </div>

                {analysis.quickWin && (
                  <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-black text-emerald-800">
                    🔥 Quick Win 후보 · 이미 1~2페이지 경계에 관련 검색어가 있어 내부링크·본문 보강 효과를 우선 노릴 만합니다.
                  </div>
                )}

                {analysis.gsc.relatedQueries.length > 0 ? (
                  <div className="mt-5 overflow-x-auto">
                    <table className="w-full min-w-[520px] text-left text-xs">
                      <thead className="text-slate-400">
                        <tr>
                          <th className="pb-2 font-black">관련 검색어</th>
                          <th className="pb-2 text-right font-black">순위</th>
                          <th className="pb-2 text-right font-black">노출</th>
                          <th className="pb-2 text-right font-black">CTR</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {analysis.gsc.relatedQueries.slice(0, 8).map((row) => (
                          <tr key={row.query}>
                            <td className="py-2.5 font-bold text-slate-700">{row.query}</td>
                            <td className="py-2.5 text-right font-black">{row.position.toFixed(1)}</td>
                            <td className="py-2.5 text-right">{formatNumber(row.impressions)}</td>
                            <td className="py-2.5 text-right">{(row.ctr * 100).toFixed(1)}%</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="mt-5 rounded-2xl bg-slate-50 p-4 text-sm text-slate-500">
                    {analysis.gsc.error || "90일 GSC에서 직접 관련된 검색어가 아직 충분히 잡히지 않았습니다."}
                  </p>
                )}
              </div>
            </section>

            <section className="grid gap-5 lg:grid-cols-2">
              <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.18em] text-rose-600">SERP COMPETITION ENGINE</p>
                    <h2 className="mt-1 text-xl font-black">Google 상위 결과 경쟁도</h2>
                  </div>
                  <span className="text-3xl font-black text-rose-600">{analysis.scores.serpDifficulty}</span>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <SourceBadge connected={analysis.serp.connected}>
                    {analysis.serp.connected ? "SERPER 실시간" : "규칙 기반 추정"}
                  </SourceBadge>
                  {analysis.serp.connected && (
                    <>
                      <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-black text-slate-600">
                        강한 도메인 {analysis.serp.authorityResultCount}/{analysis.serp.resultCount}
                      </span>
                      <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-black text-slate-600">
                        제목의도 일치 {analysis.serp.exactIntentResultCount}/{analysis.serp.resultCount}
                      </span>
                    </>
                  )}
                </div>

                {analysis.serp.connected ? (
                  <div className="mt-5 space-y-2">
                    {analysis.serp.organic.slice(0, 7).map((item) => (
                      <a
                        key={`${item.position}-${item.link}`}
                        href={item.link}
                        target="_blank"
                        rel="noreferrer"
                        className="block rounded-2xl border border-slate-100 p-3 transition hover:border-blue-200 hover:bg-blue-50/40"
                      >
                        <div className="flex gap-3">
                          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-950 text-[11px] font-black text-white">
                            {item.position}
                          </span>
                          <div className="min-w-0">
                            <p className="truncate text-sm font-black">{item.title}</p>
                            <p className="mt-1 text-[11px] text-slate-400">{item.domain}</p>
                          </div>
                        </div>
                      </a>
                    ))}
                  </div>
                ) : (
                  <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4">
                    <p className="text-sm font-black text-amber-800">실시간 Google 상위 10개는 아직 연결되지 않았습니다.</p>
                    <p className="mt-2 text-xs leading-5 text-amber-700/80">
                      {analysis.serp.error} Vercel 서버 환경변수에 SERPER_API_KEY를 추가하면 같은 화면에서 실제 Google Korea SERP가 자동 반영됩니다.
                    </p>
                  </div>
                )}
              </div>

              <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                <p className="text-xs font-black uppercase tracking-[0.18em] text-blue-600">TOP10 REVERSE PLAN</p>
                <h2 className="mt-1 text-xl font-black">TOP10에 가려면 무엇을 바꿔야 할까?</h2>
                <div className="mt-5 space-y-3">
                  {analysis.recommendations.map((item, index) => (
                    <div key={item.title} className="rounded-2xl bg-slate-50 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-black">
                            <span className="mr-2 text-blue-600">{index + 1}.</span>{item.title}
                          </p>
                          <p className="mt-1.5 text-xs leading-5 text-slate-600">{item.detail}</p>
                        </div>
                        <span className="shrink-0 rounded-full bg-blue-100 px-2.5 py-1 text-[11px] font-black text-blue-700">
                          +{item.impact}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            <section className="rounded-[28px] border border-violet-200 bg-violet-50 p-5 shadow-sm sm:p-7">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-violet-700">PILLAR + CLUSTER ARCHITECT</p>
              <h2 className="mt-1 text-2xl font-black">상위 Pillar · {analysis.cluster.pillarTopic}</h2>
              <p className="mt-3 rounded-2xl bg-white/70 p-4 text-sm font-bold leading-6 text-violet-950/80">
                {analysis.cluster.internalLinkSentence}
              </p>
              <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                {analysis.cluster.suggestedClusters.map((cluster, index) => (
                  <div key={cluster} className="rounded-2xl border border-violet-100 bg-white p-3 text-sm font-black">
                    <span className="mr-2 text-violet-500">{String(index + 1).padStart(2, "0")}</span>
                    {cluster}
                  </div>
                ))}
              </div>
            </section>
          </>
        )}

        <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">MODEL LEARNING</p>
              <h2 className="mt-1 text-xl font-black">예측 → 실제 순위 비교 이력</h2>
              <p className="mt-2 text-xs leading-5 text-slate-500">
                URL이 있는 분석은 매일 cron이 확인하고 7·14·30·60일 Search Console 실제 평균 순위를 채웁니다.
              </p>
            </div>
            <button
              onClick={() => void loadHistory()}
              disabled={historyLoading}
              className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-black text-slate-600 disabled:opacity-50"
            >
              {historyLoading ? "불러오는 중..." : "이력 새로고침"}
            </button>
          </div>

          {history.length > 0 ? (
            <div className="mt-5 overflow-x-auto">
              <table className="w-full min-w-[980px] text-left text-xs">
                <thead className="border-b border-slate-100 text-slate-400">
                  <tr>
                    <th className="pb-3 font-black">분석일</th>
                    <th className="pb-3 font-black">키워드 / 제목</th>
                    <th className="pb-3 text-right font-black">점수</th>
                    <th className="pb-3 text-right font-black">예상</th>
                    <th className="pb-3 text-right font-black">7일</th>
                    <th className="pb-3 text-right font-black">14일</th>
                    <th className="pb-3 text-right font-black">30일</th>
                    <th className="pb-3 text-right font-black">60일</th>
                    <th className="pb-3 text-right font-black">30일 오차</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {history.map((item) => (
                    <tr key={item.id}>
                      <td className="py-3 text-slate-400">{formatDate(item.createdAt)}</td>
                      <td className="max-w-[360px] py-3">
                        <p className="font-black text-slate-800">{item.primaryKeyword}</p>
                        <p className="mt-1 truncate text-[11px] text-slate-400">{item.title}</p>
                      </td>
                      <td className={`py-3 text-right font-black ${scoreClass(item.opportunityScore)}`}>{item.opportunityScore}</td>
                      <td className="py-3 text-right font-black">{rankText(item.predictedMin, item.predictedMax)}</td>
                      <td className="py-3 text-right">{actualText(item.actualPosition7d)}</td>
                      <td className="py-3 text-right">{actualText(item.actualPosition14d)}</td>
                      <td className="py-3 text-right">{actualText(item.actualPosition30d)}</td>
                      <td className="py-3 text-right">{actualText(item.actualPosition60d)}</td>
                      <td className="py-3 text-right font-black">
                        {item.predictionError30d === null ? "-" : `${item.predictionError30d.toFixed(1)}칸`}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="mt-5 rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center text-sm text-slate-500">
              첫 제목을 분석하면 예측 이력이 여기에 쌓입니다.
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
