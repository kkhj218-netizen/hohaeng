"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

import { supabase } from "@/app/lib/supabase";
import type {
  JhCollectionApiResult,
  JhDashboardData,
  JhFreshnessStatus,
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

const COPY_REFRESH_INTERVAL_MS = 30 * 60 * 1_000;

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

function koreanToday(): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
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

function freshnessStatus(metric: JhMarketMetric): JhFreshnessStatus {
  return metric.freshnessStatus ?? (metric.stale ? "delayed" : "fresh");
}

function freshnessBadge(metric: JhMarketMetric): {
  label: string;
  className: string;
} {
  const status = freshnessStatus(metric);
  if (status === "fresh") {
    return {
      label: "원천 최신",
      className:
        "border-emerald-800 bg-emerald-950/40 text-emerald-300",
    };
  }
  if (status === "awaiting_release") {
    return {
      label: "발표 대기",
      className: "border-blue-800 bg-blue-950/40 text-blue-300",
    };
  }
  if (status === "delayed") {
    return {
      label: "확인 필요",
      className: "border-amber-800 bg-amber-950/40 text-amber-300",
    };
  }
  return {
    label: "데이터 없음",
    className: "border-slate-700 bg-slate-900 text-slate-500",
  };
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
  const [copyRefreshing, setCopyRefreshing] = useState(false);

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
      if (!token) return null;

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
          return null;
        }
        if (!response.ok || !payload.ok) {
          throw new Error(payload.ok ? "데이터를 불러오지 못했습니다." : payload.error);
        }

        setDashboard(payload.dashboard);
        setSelectedDate(payload.dashboard.asOfDate);
        return payload.dashboard;
      } catch (error) {
        setErrorMessage(
          error instanceof Error ? error.message : "투자 데이터를 불러오지 못했습니다."
        );
        return null;
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

  const runCollection = async (
    options: { forCopy?: boolean } = {}
  ): Promise<JhDashboardData | null> => {
    const token = await getAccessToken();
    if (!token || collecting) return null;

    setCollecting(true);
    setNotice(
      options.forCopy
        ? "GPT 복사 전 FRED 원천 갱신시각을 확인하고 있습니다. 바뀐 지표만 최신화합니다."
        : "FRED 40개 원천 갱신시각을 확인하고 있습니다. 바뀐 지표만 최신화하며, 이력이 부족한 지표는 과거 데이터도 채웁니다."
    );
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
        return null;
      }
      if (!response.ok || !payload.ok) {
        throw new Error(payload.error ?? "수집 실행에 실패했습니다.");
      }

      setNotice(
        `${payload.seriesSucceeded ?? 0}/${payload.seriesCount ?? 0}개 원천 확인 완료 · 갱신 ${payload.seriesUpdated ?? 0}개 · 변경 없음 ${payload.seriesUnchanged ?? 0}개${(payload.metadataWarnings ?? 0) > 0 ? ` · 발표정보 확인 경고 ${payload.metadataWarnings}개` : ""}${payload.archiveSaved === false ? " · 일별 아카이브는 다음 실행에서 재시도 필요" : " · 오늘 Data Pack 보관 완료"}`
      );

      if (payload.dashboard) {
        setDashboard(payload.dashboard);
        setSelectedDate(payload.dashboard.asOfDate);
        return payload.dashboard;
      }

      return await loadDashboard();
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "데이터 수집에 실패했습니다."
      );
      setNotice("");
      return null;
    } finally {
      setCollecting(false);
    }
  };

  const handleCopy = async () => {
    if (!dashboard || collecting) return;
    let copyDashboard = dashboard;

    try {
      const checkedAt =
        dashboard.sourceCheckedAt ??
        dashboard.collectionRun?.finishedAt ??
        dashboard.collectionRun?.startedAt ??
        null;
      const checkedTime = checkedAt ? new Date(checkedAt).getTime() : 0;
      const needsRefresh =
        dashboard.asOfDate === koreanToday() &&
        (!Number.isFinite(checkedTime) ||
          checkedTime === 0 ||
          Date.now() - checkedTime > COPY_REFRESH_INTERVAL_MS);

      if (needsRefresh) {
        setCopyRefreshing(true);
        const refreshed = await runCollection({ forCopy: true });
        if (!refreshed) return;
        copyDashboard = refreshed;
      }

      await copyText(copyDashboard.copyPack);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2_000);
    } catch {
      setErrorMessage("복사하지 못했습니다. 아래 미리보기에서 직접 복사해주세요.");
    } finally {
      setCopyRefreshing(false);
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

  const freshnessCounts = useMemo(() => {
    const awaiting = dashboard?.coverage.awaitingReleaseSeries ?? 0;
    const delayed = dashboard?.coverage.staleSeries ?? 0;
    const withData = dashboard?.coverage.seriesWithData ?? 0;
    const fresh =
      dashboard?.coverage.freshSeries ??
      Math.max(0, withData - awaiting - delayed);
    const unavailable =
      dashboard?.coverage.unavailableSeries ??
      Math.max(0, (dashboard?.coverage.totalSeries ?? 0) - withData);
    return { fresh, awaiting, delayed, unavailable };
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
              disabled={
                !dashboard ||
                dashboard.coverage.seriesWithData === 0 ||
                collecting
              }
              className="rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 px-5 py-2.5 text-sm font-black text-white shadow-lg shadow-cyan-950/40 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {copyRefreshing
                ? "최신 확인 중..."
                : copied
                  ? "복사 완료 ✓"
                  : "최신화 후 COPY"}
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
                공식 FRED 데이터 40개의 원천 갱신시각을 먼저 확인하고, 바뀐
                지표만 최신화해 평소보다 큰 변화와 교차자산 다이버전스를
                규칙 기반으로 선별합니다.
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
                <p className="text-xs font-bold text-slate-500">공식 최신 상태</p>
                <p className="mt-2 text-2xl font-black text-cyan-300">
                  {freshnessCounts.fresh + freshnessCounts.awaiting} / {dashboard.coverage.totalSeries}
                </p>
                <p className="mt-2 text-xs text-slate-500">
                  원천 최신 {freshnessCounts.fresh} · 발표 대기 {freshnessCounts.awaiting} · 확인 필요 {freshnessCounts.delayed}
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
                <p className="text-xs font-bold text-slate-500">최근 FRED 원천 확인</p>
                <p className="mt-2 text-xl font-black text-white">
                  {dashboard.collectionRun
                    ? dashboard.collectionRun.status === "success"
                      ? "정상 완료"
                      : dashboard.collectionRun.status
                    : "실행 전"}
                </p>
                <p className="mt-2 text-xs text-slate-500">
                  {dashboard.collectionRun
                    ? `${formatDateTime(dashboard.sourceCheckedAt ?? dashboard.collectionRun.finishedAt ?? dashboard.collectionRun.startedAt)} · 갱신 ${dashboard.collectionRun.seriesUpdated ?? "—"} · 그대로 ${dashboard.collectionRun.seriesUnchanged ?? "—"}`
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
                      관측일은 수치가 대표하는 기간입니다. FRED의 실제 원천
                      갱신시각과 발표주기를 별도로 확인해 최신 여부를 판정합니다.
                    </p>
                  </div>

                  <div className="grid gap-3 rounded-2xl border border-slate-800 bg-slate-900/60 p-4 text-xs sm:grid-cols-3">
                    <div className="rounded-xl border border-emerald-900/70 bg-emerald-950/20 p-3">
                      <p className="font-black text-emerald-300">원천 최신</p>
                      <p className="mt-1 leading-5 text-slate-500">
                        FRED의 마지막 갱신시각까지 확인된 최신 유효값
                      </p>
                    </div>
                    <div className="rounded-xl border border-blue-900/70 bg-blue-950/20 p-3">
                      <p className="font-black text-blue-300">발표 대기</p>
                      <p className="mt-1 leading-5 text-slate-500">
                        월간·분기 지표의 공식 최신값이며 다음 발표를 기다리는 상태
                      </p>
                    </div>
                    <div className="rounded-xl border border-amber-900/70 bg-amber-950/20 p-3">
                      <p className="font-black text-amber-300">확인 필요</p>
                      <p className="mt-1 leading-5 text-slate-500">
                        발표주기를 넘겨 원천 갱신과 관측일이 모두 오래된 상태
                      </p>
                    </div>
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
                                      {metric.currentValue !== null ? (
                                        <span
                                          className={`rounded-full border px-2 py-0.5 text-[9px] font-bold ${freshnessBadge(metric).className}`}
                                        >
                                          {freshnessBadge(metric).label}
                                        </span>
                                      ) : null}
                                    </div>
                                  </td>
                                  <td className="whitespace-nowrap px-4 py-4 text-right font-black text-slate-100">{formatCurrent(metric)}</td>
                                  <td className="whitespace-nowrap px-4 py-4 text-right text-xs text-slate-500">
                                    <p>{formatDate(metric.observedAt)}</p>
                                    {metric.sourceUpdatedAt ? (
                                      <p className="mt-1 text-[10px] text-slate-600">
                                        원천 갱신 {formatDate(metric.sourceUpdatedAt)}
                                      </p>
                                    ) : null}
                                    {metric.nextReleaseDate ? (
                                      <p className="mt-0.5 text-[10px] text-blue-400/70">
                                        다음 발표 {formatDate(metric.nextReleaseDate)}
                                      </p>
                                    ) : null}
                                  </td>
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
                                    <p className="mt-1 text-[10px] text-slate-500">
                                      {metric.freshnessLabel ?? freshnessBadge(metric).label}
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
                        마지막 원천 확인이 30분을 넘겼으면 바뀐 지표만 먼저
                        최신화한 뒤, 관측일·원천 갱신시각·다음 발표일까지 함께
                        복사합니다. 유료 AI API는 호출하지 않습니다.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => void handleCopy()}
                      disabled={collecting}
                      className="shrink-0 rounded-xl bg-cyan-400 px-6 py-3 font-black text-slate-950 transition hover:bg-cyan-300 disabled:cursor-wait disabled:opacity-50"
                    >
                      {copyRefreshing
                        ? "최신 확인 중..."
                        : copied
                          ? "복사 완료 ✓"
                          : "최신화 후 COPY"}
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
              데이터 출처: Federal Reserve Bank of St. Louis FRED · 매일 한국시간
              오전 8시 30분경 자동 확인 · GPT 복사 전 30분 이상 지났으면 증분
              최신화 · 월간·분기 관측일은 발표일이 아닌 해당 통계의 기준기간 · 이
              화면은 투자 판단 보조용이며 투자 권유가 아닙니다.
            </footer>
          </>
        ) : null}
      </div>
    </main>
  );
}
