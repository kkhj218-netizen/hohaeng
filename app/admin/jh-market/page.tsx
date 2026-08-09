"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

import { supabase } from "@/app/lib/supabase";
import type {
  JhCollectionApiResult,
  JhDashboardData,
  JhMarketMetric,
  JhMarketSignal,
  JhPeriodChange,
} from "@/app/lib/jhMarketTypes";

type DashboardResponse =
  | { ok: true; dashboard: JhDashboardData }
  | { ok: false; error: string };

const frequencyLabels: Record<string, string> = {
  daily: "일간",
  weekly: "주간",
  monthly: "월간",
  quarterly: "분기",
};

const categoryAccents: Record<string, string> = {
  equities: "from-emerald-500/20 to-emerald-500/0 border-emerald-900/70",
  volatility: "from-rose-500/20 to-rose-500/0 border-rose-900/70",
  rates: "from-sky-500/20 to-sky-500/0 border-sky-900/70",
  credit: "from-amber-500/20 to-amber-500/0 border-amber-900/70",
  liquidity: "from-cyan-500/20 to-cyan-500/0 border-cyan-900/70",
  inflation: "from-orange-500/20 to-orange-500/0 border-orange-900/70",
  labor: "from-violet-500/20 to-violet-500/0 border-violet-900/70",
  growth: "from-indigo-500/20 to-indigo-500/0 border-indigo-900/70",
  commodities: "from-yellow-500/20 to-yellow-500/0 border-yellow-900/70",
  fx: "from-blue-500/20 to-blue-500/0 border-blue-900/70",
  crypto: "from-fuchsia-500/20 to-fuchsia-500/0 border-fuchsia-900/70",
};

function formatDate(value: string | null): string {
  if (!value) return "데이터 없음";
  const [year, month, day] = value.slice(0, 10).split("-");
  return `${year}.${month}.${day}`;
}

function formatDateTime(value: string | null): string {
  if (!value) return "기록 없음";
  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(value));
}

function formatCurrent(metric: JhMarketMetric): string {
  if (metric.currentValue === null) return "—";
  const digits =
    Math.abs(metric.currentValue) >= 1_000
      ? 1
      : Math.abs(metric.currentValue) >= 10
        ? 2
        : 3;
  const value = new Intl.NumberFormat("ko-KR", {
    maximumFractionDigits: digits,
  }).format(metric.currentValue);
  return `${value}${metric.currentUnit ? ` ${metric.currentUnit}` : ""}`;
}

function changeSuffix(unit: JhPeriodChange["unit"]): string {
  return unit === "value" ? "" : unit;
}

function formatChange(change: JhPeriodChange | undefined): string {
  if (!change || change.value === null) return "—";
  const sign = change.value > 0 ? "+" : "";
  const digits = Math.abs(change.value) >= 100 ? 1 : 2;
  return `${sign}${change.value.toFixed(digits)}${changeSuffix(change.unit)}`;
}

function formatChangeValue(value: number, unit: JhPeriodChange["unit"]): string {
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(Math.abs(value) >= 100 ? 1 : 2)}${changeSuffix(unit)}`;
}

function changeTone(value: number | null | undefined): string {
  if (value === null || value === undefined || value === 0) return "text-slate-400";
  return value > 0 ? "text-emerald-400" : "text-rose-400";
}

function severityClass(signal: JhMarketSignal): string {
  if (signal.severity === "critical") {
    return "border-rose-500/60 bg-rose-950/30 text-rose-100";
  }
  if (signal.severity === "high") {
    return "border-orange-500/50 bg-orange-950/25 text-orange-100";
  }
  if (signal.severity === "medium") {
    return "border-amber-600/40 bg-amber-950/20 text-amber-100";
  }
  return "border-slate-700 bg-slate-900 text-slate-200";
}

function regimeClass(regime: JhDashboardData["regime"]): string {
  if (regime === "Risk-On") return "border-emerald-500/50 bg-emerald-950/40 text-emerald-300";
  if (regime === "Risk-Off") return "border-rose-500/50 bg-rose-950/40 text-rose-300";
  return "border-amber-500/40 bg-amber-950/30 text-amber-200";
}

async function copyText(text: string): Promise<void> {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }

  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand("copy");
  document.body.removeChild(textarea);
}

export default function JhMarketDashboardPage() {
  const router = useRouter();
  const [dashboard, setDashboard] = useState<JhDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [collecting, setCollecting] = useState(false);
  const [selectedDate, setSelectedDate] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [notice, setNotice] = useState("");
  const [copied, setCopied] = useState(false);

  const getAccessToken = useCallback(async (): Promise<string | null> => {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      router.replace("/admin/login");
      return null;
    }

    return session.access_token;
  }, [router]);

  const loadDashboard = useCallback(
    async (date?: string) => {
      const token = await getAccessToken();
      if (!token) return;

      setLoading(true);
      setErrorMessage("");

      try {
        const query = date ? `?date=${encodeURIComponent(date)}` : "";
        const response = await fetch(`/api/admin/jh-market${query}`, {
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store",
        });
        const payload = (await response.json()) as DashboardResponse;

        if (response.status === 401) {
          router.replace("/admin/login");
          return;
        }
        if (!response.ok || !payload.ok) {
          throw new Error(payload.ok ? "데이터를 불러오지 못했습니다." : payload.error);
        }

        setDashboard(payload.dashboard);
        setSelectedDate(payload.dashboard.asOfDate);
      } catch (error) {
        setErrorMessage(
          error instanceof Error ? error.message : "투자 데이터를 불러오지 못했습니다."
        );
      } finally {
        setLoading(false);
      }
    },
    [getAccessToken, router]
  );

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadDashboard();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [loadDashboard]);

  const runCollection = async () => {
    const token = await getAccessToken();
    if (!token || collecting) return;

    setCollecting(true);
    setNotice("FRED 40개 지표를 확인하고 있습니다. 최초 실행은 과거 데이터까지 채웁니다.");
    setErrorMessage("");

    try {
      const response = await fetch("/api/admin/jh-market", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ mode: "auto" }),
      });
      const payload = (await response.json()) as JhCollectionApiResult;

      if (response.status === 401) {
        router.replace("/admin/login");
        return;
      }
      if (!response.ok || !payload.ok) {
        throw new Error(payload.error ?? "수집 실행에 실패했습니다.");
      }

      setNotice(
        `${payload.seriesSucceeded ?? 0}/${payload.seriesCount ?? 0}개 지표 수집 완료 · ${new Intl.NumberFormat("ko-KR").format(payload.recordsSaved ?? 0)}개 관측값 반영${payload.archiveSaved === false ? " · 일별 아카이브는 다음 실행에서 재시도 필요" : " · 오늘 Data Pack 보관 완료"}`
      );
      await loadDashboard();
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "데이터 수집에 실패했습니다."
      );
      setNotice("");
    } finally {
      setCollecting(false);
    }
  };

  const handleCopy = async () => {
    if (!dashboard) return;
    try {
      await copyText(dashboard.copyPack);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2_000);
    } catch {
      setErrorMessage("복사하지 못했습니다. 아래 미리보기에서 직접 복사해주세요.");
    }
  };

  const metricsByCategory = useMemo(() => {
    const grouped = new Map<string, JhMarketMetric[]>();
    for (const metric of dashboard?.metrics ?? []) {
      const current = grouped.get(metric.category) ?? [];
      current.push(metric);
      grouped.set(metric.category, current);
    }
    return grouped;
  }, [dashboard]);

  if (loading && !dashboard) {
    return (
      <main className="min-h-screen bg-slate-950 px-4 py-20 text-slate-100">
        <div className="mx-auto max-w-6xl rounded-3xl border border-slate-800 bg-slate-900/70 p-10 text-center shadow-2xl">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-slate-700 border-t-cyan-400" />
          <p className="mt-5 font-bold text-white">JH 투자 레이더 계산 중...</p>
          <p className="mt-2 text-sm text-slate-500">40개 지표의 기간별 변화와 이상신호를 확인합니다.</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <Link
            href="/admin"
            className="rounded-xl border border-slate-800 bg-slate-900 px-4 py-2 text-sm font-bold text-slate-300 transition hover:border-slate-600 hover:text-white"
          >
            ← 관리자 센터
          </Link>

          <div className="flex flex-wrap items-center gap-2">
            <label className="sr-only" htmlFor="archive-date">
              과거 데이터 날짜
            </label>
            <select
              id="archive-date"
              value={selectedDate}
              onChange={(event) => {
                const value = event.target.value;
                setSelectedDate(value);
                void loadDashboard(value);
              }}
              className="rounded-xl border border-slate-700 bg-slate-900 px-3 py-2.5 text-sm font-bold text-slate-200 outline-none focus:border-cyan-500"
            >
              {dashboard?.archiveDates.includes(selectedDate) === false && selectedDate ? (
                <option value={selectedDate}>{formatDate(selectedDate)}</option>
              ) : null}
              {(dashboard?.archiveDates ?? []).map((date) => (
                <option key={date} value={date}>
                  {formatDate(date)}
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={() => void loadDashboard(selectedDate || undefined)}
              disabled={loading}
              className="rounded-xl border border-slate-700 bg-slate-900 px-4 py-2.5 text-sm font-bold text-slate-200 transition hover:border-slate-500 disabled:opacity-50"
            >
              {loading ? "계산 중..." : "새로고침"}
            </button>

            <button
              type="button"
              onClick={() => void runCollection()}
              disabled={collecting}
              className="rounded-xl border border-cyan-700 bg-cyan-950/60 px-4 py-2.5 text-sm font-black text-cyan-200 transition hover:bg-cyan-900/70 disabled:cursor-wait disabled:opacity-60"
            >
              {collecting ? "수집 중..." : "지금 데이터 수집"}
            </button>

            <button
              type="button"
              onClick={() => void handleCopy()}
              disabled={!dashboard || dashboard.coverage.seriesWithData === 0}
              className="rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 px-5 py-2.5 text-sm font-black text-white shadow-lg shadow-cyan-950/40 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {copied ? "복사 완료 ✓" : "COPY FOR GPT"}
            </button>
          </div>
        </div>

        <section className="relative overflow-hidden rounded-3xl border border-slate-800 bg-slate-900/70 p-6 shadow-2xl sm:p-8">
          <div className="pointer-events-none absolute -right-20 -top-24 h-72 w-72 rounded-full bg-cyan-500/10 blur-3xl" />
          <div className="relative flex flex-col justify-between gap-7 lg:flex-row lg:items-end">
            <div>
              <p className="text-xs font-black tracking-[0.22em] text-cyan-400">
                JH HEDGE FUND DATA PACK V1
              </p>
              <h1 className="mt-3 text-3xl font-black tracking-tight text-white sm:text-5xl">
                오늘 시장의 이상한 움직임만
                <span className="block bg-gradient-to-r from-cyan-300 via-blue-300 to-violet-300 bg-clip-text text-transparent">
                  2분 안에 찾는 투자 레이더
                </span>
              </h1>
              <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-400 sm:text-base">
                공식 FRED 데이터 40개를 과거 흐름과 비교해 평소보다 큰 변화,
                극단 구간, 교차자산 다이버전스를 규칙 기반으로 선별합니다.
              </p>
            </div>

            {dashboard ? (
              <div className={`min-w-56 rounded-2xl border px-5 py-4 ${regimeClass(dashboard.regime)}`}>
                <p className="text-xs font-bold opacity-75">RULE-BASED REGIME</p>
                <div className="mt-1 flex items-end justify-between gap-4">
                  <p className="text-2xl font-black">{dashboard.regime}</p>
                  <p className="text-sm font-bold">신뢰 {dashboard.regimeConfidence}</p>
                </div>
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-950/50">
                  <div
                    className="h-full rounded-full bg-current transition-all"
                    style={{ width: `${dashboard.regimeScore}%` }}
                  />
                </div>
                <p className="mt-2 text-[11px] opacity-70">위험점수 0 Risk-On · 100 Risk-Off</p>
              </div>
            ) : null}
          </div>
        </section>

        {errorMessage ? (
          <div className="mt-5 rounded-2xl border border-rose-800 bg-rose-950/40 px-5 py-4 text-sm font-bold text-rose-200">
            {errorMessage}
          </div>
        ) : null}

        {notice ? (
          <div className="mt-5 rounded-2xl border border-cyan-800 bg-cyan-950/30 px-5 py-4 text-sm font-bold text-cyan-200">
            {notice}
          </div>
        ) : null}

        {dashboard ? (
          <>
            <section className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
                <p className="text-xs font-bold text-slate-500">분석 기준일</p>
                <p className="mt-2 text-2xl font-black text-white">{formatDate(dashboard.asOfDate)}</p>
                <p className="mt-2 text-xs text-slate-500">{dashboard.marketStatus}</p>
              </div>
              <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
                <p className="text-xs font-bold text-slate-500">데이터 커버리지</p>
                <p className="mt-2 text-2xl font-black text-cyan-300">
                  {dashboard.coverage.seriesWithData} / {dashboard.coverage.totalSeries}
                </p>
                <p className="mt-2 text-xs text-slate-500">
                  지연 {dashboard.coverage.staleSeries} · 조회 실패 {dashboard.coverage.failedSeries}
                </p>
              </div>
              <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
                <p className="text-xs font-bold text-slate-500">가장 최신 관측일</p>
                <p className="mt-2 text-2xl font-black text-white">
                  {formatDate(dashboard.latestDataUpdate)}
                </p>
                <p className="mt-2 text-xs text-slate-500">각 지표의 실제 기준일은 표에 별도 표시</p>
              </div>
              <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
                <p className="text-xs font-bold text-slate-500">최근 자동수집</p>
                <p className="mt-2 text-xl font-black text-white">
                  {dashboard.collectionRun
                    ? dashboard.collectionRun.status === "success"
                      ? "정상 완료"
                      : dashboard.collectionRun.status
                    : "실행 전"}
                </p>
                <p className="mt-2 text-xs text-slate-500">
                  {dashboard.collectionRun
                    ? `${formatDateTime(dashboard.collectionRun.finishedAt ?? dashboard.collectionRun.startedAt)} · ${dashboard.collectionRun.seriesSucceeded ?? "—"}개 성공`
                    : "지금 데이터 수집을 눌러 최초 적재"}
                </p>
              </div>
            </section>

            {dashboard.coverage.seriesWithData === 0 ? (
              <section className="mt-6 rounded-3xl border border-dashed border-cyan-700 bg-cyan-950/20 p-8 text-center">
                <p className="text-4xl">📡</p>
                <h2 className="mt-4 text-xl font-black text-white">연결은 끝났고, 최초 데이터 적재만 남았습니다</h2>
                <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-slate-400">
                  아래 버튼을 한 번 누르면 데이터가 없는 지표는 과거 구간까지 채우고,
                  이후부터는 매일 최신 구간만 갱신합니다.
                </p>
                <button
                  type="button"
                  onClick={() => void runCollection()}
                  disabled={collecting}
                  className="mt-6 rounded-xl bg-cyan-500 px-6 py-3 font-black text-slate-950 transition hover:bg-cyan-300 disabled:opacity-60"
                >
                  {collecting ? "최초 데이터 적재 중..." : "FRED 40개 최초 수집 시작"}
                </button>
              </section>
            ) : (
              <>
                <section className="mt-8">
                  <div className="mb-4 flex items-end justify-between gap-4">
                    <div>
                      <p className="text-xs font-black tracking-[0.18em] text-cyan-400">TODAY&apos;S BIGGEST CHANGES</p>
                      <h2 className="mt-1 text-2xl font-black text-white">오늘 먼저 볼 변화 TOP 5</h2>
                    </div>
                    <p className="hidden text-xs text-slate-500 sm:block">변화 크기 · 역사적 극단 · 추세 · 지속성 종합</p>
                  </div>

                  <div className="grid gap-4 lg:grid-cols-5">
                    {dashboard.biggestChanges.map((item) => (
                      <article
                        key={item.symbol}
                        className="relative overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/80 p-5"
                      >
                        <span className="absolute right-3 top-2 text-5xl font-black text-slate-800/60">{item.rank}</span>
                        <p className="relative text-xs font-bold text-slate-500">{item.symbol} · {item.changeLabel}</p>
                        <h3 className="relative mt-2 min-h-12 font-black leading-6 text-white">{item.name}</h3>
                        <p className={`relative mt-3 text-2xl font-black ${changeTone(item.changeValue)}`}>
                          {formatChangeValue(item.changeValue, item.changeUnit)}
                        </p>
                        <p className="relative mt-3 text-xs leading-5 text-slate-400">{item.explanation}</p>
                        <div className="relative mt-4 h-1.5 overflow-hidden rounded-full bg-slate-800">
                          <div className="h-full rounded-full bg-cyan-400" style={{ width: `${item.importanceScore}%` }} />
                        </div>
                      </article>
                    ))}
                  </div>
                </section>

                <section className="mt-9">
                  <div className="mb-4">
                    <p className="text-xs font-black tracking-[0.18em] text-amber-400">TODAY&apos;S ANOMALIES</p>
                    <h2 className="mt-1 text-2xl font-black text-white">다이버전스·극단·추세 신호</h2>
                  </div>
                  {dashboard.anomalies.length === 0 ? (
                    <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 text-sm text-slate-400">
                      현재 규칙에서 포착된 주요 이상신호가 없습니다.
                    </div>
                  ) : (
                    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                      {dashboard.anomalies.map((signal) => (
                        <article key={signal.id} className={`rounded-2xl border p-5 ${severityClass(signal)}`}>
                          <div className="flex items-center justify-between gap-3">
                            <span className="rounded-full bg-slate-950/40 px-2.5 py-1 text-[10px] font-black tracking-wider">
                              {signal.type.toUpperCase()}
                            </span>
                            <span className="text-xs font-black">{signal.importanceScore}점</span>
                          </div>
                          <h3 className="mt-3 font-black">{signal.title}</h3>
                          <p className="mt-2 text-xs leading-5 opacity-75">{signal.description}</p>
                        </article>
                      ))}
                    </div>
                  )}
                </section>

                <section className="mt-9 overflow-hidden rounded-3xl border border-slate-800 bg-slate-900/60">
                  <div className="border-b border-slate-800 p-5 sm:p-6">
                    <p className="text-xs font-black tracking-[0.18em] text-violet-400">RELATIVE STRENGTH</p>
                    <h2 className="mt-1 text-xl font-black text-white">어느 시장이 더 강한가</h2>
                  </div>
                  <div className="grid gap-px bg-slate-800 md:grid-cols-3">
                    {dashboard.relativeStrength.map((item) => (
                      <article key={item.id} className="bg-slate-950/70 p-5">
                        <p className="text-sm font-black text-white">{item.label}</p>
                        <p className="mt-2 text-xs text-slate-500">강세: {item.leader}</p>
                        <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs">
                          {[
                            [item.shortLabel, item.short],
                            [item.mediumLabel, item.medium],
                            [item.longLabel, item.long],
                          ].map(([label, value]) => (
                            <div key={String(label)} className="rounded-xl bg-slate-900 px-2 py-3">
                              <p className="text-[10px] text-slate-500">{label}</p>
                              <p className={`mt-1 font-black ${changeTone(value as number | null)}`}>
                                {value === null ? "—" : `${(value as number) > 0 ? "+" : ""}${(value as number).toFixed(2)}%p`}
                              </p>
                            </div>
                          ))}
                        </div>
                        <p className="mt-3 text-xs leading-5 text-slate-400">{item.interpretation}</p>
                      </article>
                    ))}
                  </div>
                </section>

                <section className="mt-10 space-y-6">
                  <div>
                    <p className="text-xs font-black tracking-[0.18em] text-blue-400">MARKET DASHBOARD</p>
                    <h2 className="mt-1 text-2xl font-black text-white">40개 핵심 지표 전체 보기</h2>
                    <p className="mt-2 text-sm text-slate-500">
                      일간·주간·월간 지표마다 기간 라벨이 다르며, 관측일을 그대로 표시해 오래된 값을 오늘 값처럼 보이지 않게 했습니다.
                    </p>
                  </div>

                  {dashboard.categoryOrder.map((category) => {
                    const metrics = metricsByCategory.get(category) ?? [];
                    const accent = categoryAccents[category] ?? "from-slate-500/20 to-slate-500/0 border-slate-800";

                    return (
                      <section key={category} className={`overflow-hidden rounded-3xl border bg-gradient-to-br ${accent}`}>
                        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800/80 px-5 py-4 sm:px-6">
                          <div>
                            <h3 className="text-lg font-black text-white">{dashboard.categoryLabels[category] ?? category}</h3>
                            <p className="mt-1 text-xs text-slate-500">{metrics.length}개 지표 · 공식 무료 데이터</p>
                          </div>
                          <span className="rounded-full border border-slate-700 bg-slate-950/60 px-3 py-1 text-[11px] font-bold text-slate-400">FRED</span>
                        </div>

                        <div className="overflow-x-auto">
                          <table className="w-full min-w-[1050px] text-left text-sm">
                            <thead className="bg-slate-950/60 text-[11px] uppercase tracking-wide text-slate-500">
                              <tr>
                                <th className="px-5 py-3 font-bold">지표</th>
                                <th className="px-4 py-3 text-right font-bold">현재값</th>
                                <th className="px-4 py-3 text-right font-bold">관측일</th>
                                <th className="px-4 py-3 text-right font-bold">단기</th>
                                <th className="px-4 py-3 text-right font-bold">중기</th>
                                <th className="px-4 py-3 text-right font-bold">장기</th>
                                <th className="px-4 py-3 text-right font-bold">백분위</th>
                                <th className="px-4 py-3 text-right font-bold">Z</th>
                                <th className="px-5 py-3 font-bold">신호</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-800/80 bg-slate-950/35">
                              {metrics.map((metric) => (
                                <tr key={metric.id} className="transition hover:bg-slate-800/30">
                                  <td className="px-5 py-4">
                                    <div className="flex items-start gap-3">
                                      <div>
                                        <p className="font-black text-white">{metric.nameKo}</p>
                                        <p className="mt-1 text-[11px] text-slate-500">
                                          {metric.symbol} · {frequencyLabels[metric.frequency] ?? metric.frequency}
                                        </p>
                                      </div>
                                      {metric.stale && metric.currentValue !== null ? (
                                        <span className="rounded-full border border-amber-800 bg-amber-950/40 px-2 py-0.5 text-[9px] font-bold text-amber-300">지연</span>
                                      ) : null}
                                    </div>
                                  </td>
                                  <td className="whitespace-nowrap px-4 py-4 text-right font-black text-slate-100">{formatCurrent(metric)}</td>
                                  <td className="whitespace-nowrap px-4 py-4 text-right text-xs text-slate-500">{formatDate(metric.observedAt)}</td>
                                  {metric.changes.slice(0, 3).map((change) => (
                                    <td key={change.key} className={`whitespace-nowrap px-4 py-4 text-right font-bold ${changeTone(change.value)}`}>
                                      <span className="mr-1 text-[10px] font-normal text-slate-600">{change.label}</span>
                                      {formatChange(change)}
                                    </td>
                                  ))}
                                  <td className="px-4 py-4 text-right">
                                    {metric.percentile === null ? (
                                      <span className="text-slate-600">—</span>
                                    ) : (
                                      <div className="ml-auto w-20">
                                        <p className="text-xs font-black text-slate-200">{metric.percentile.toFixed(0)}</p>
                                        <div className="mt-1 h-1 overflow-hidden rounded-full bg-slate-800">
                                          <div className="h-full rounded-full bg-blue-400" style={{ width: `${metric.percentile}%` }} />
                                        </div>
                                      </div>
                                    )}
                                  </td>
                                  <td className="px-4 py-4 text-right text-xs font-bold text-slate-300">
                                    {metric.zScore === null ? "—" : `${metric.zScore > 0 ? "+" : ""}${metric.zScore.toFixed(2)}`}
                                  </td>
                                  <td className="max-w-52 px-5 py-4 text-xs">
                                    <p className={metric.trend === "up" ? "text-emerald-400" : metric.trend === "down" ? "text-rose-400" : "text-slate-400"}>
                                      {metric.error ?? metric.trendLabel}
                                    </p>
                                    <p className="mt-1 text-[10px] text-slate-600">중요도 {metric.importanceScore}</p>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </section>
                    );
                  })}
                </section>

                <section className="mt-10 rounded-3xl border border-cyan-900/70 bg-gradient-to-br from-cyan-950/40 to-slate-900/70 p-6 sm:p-8">
                  <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-center">
                    <div>
                      <p className="text-xs font-black tracking-[0.18em] text-cyan-400">JH COPY PACK</p>
                      <h2 className="mt-2 text-2xl font-black text-white">이제 ChatGPT 분석은 버튼 한 번이면 됩니다</h2>
                      <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
                        오늘 데이터, 이상신호, 상대강도, 분석 역할과 출력 형식까지 한 번에 복사됩니다. 유료 AI API는 호출하지 않습니다.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => void handleCopy()}
                      className="shrink-0 rounded-xl bg-cyan-400 px-6 py-3 font-black text-slate-950 transition hover:bg-cyan-300"
                    >
                      {copied ? "복사 완료 ✓" : "COPY FOR GPT"}
                    </button>
                  </div>

                  <details className="mt-6 rounded-2xl border border-slate-800 bg-slate-950/60">
                    <summary className="cursor-pointer px-5 py-4 text-sm font-bold text-slate-300">복사될 Data Pack 미리보기</summary>
                    <pre className="max-h-[520px] overflow-auto whitespace-pre-wrap border-t border-slate-800 p-5 text-xs leading-6 text-slate-400">
                      {dashboard.copyPack}
                    </pre>
                  </details>
                </section>
              </>
            )}

            <footer className="mt-8 rounded-2xl border border-slate-800 bg-slate-900/50 px-5 py-4 text-xs leading-5 text-slate-500">
              데이터 출처: Federal Reserve Bank of St. Louis FRED · 자동 수집은 매일 한국시간 오전 8시 30분경 실행 ·
              주말·휴장일·주간·월간 지표는 마지막 유효값과 실제 관측일을 함께 표시 · 이 화면은 투자 판단 보조용이며 투자 권유가 아닙니다.
            </footer>
          </>
        ) : null}
      </div>
    </main>
  );
}
