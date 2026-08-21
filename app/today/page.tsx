import type { Metadata } from "next";
import Link from "next/link";

import type { JhMarketMetric } from "@/app/lib/jhMarketTypes";
import {
  buildUpcomingReleases,
  categoryMetric,
  changeTone,
  firstChange,
  formatChange,
  formatMetricValue,
  formatObservedDate,
  formatSeoulDate,
  getLatestInvestmentPosts,
  getPublicMarketDashboard,
  pickMetrics,
} from "@/app/lib/publicMarket";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "오늘의 투자 대시보드 | 호행처럼",
  description:
    "오늘 확인할 경제 일정, 최근 미국시장 마감, 금리·물가·고용·유동성 데이터와 호행처럼의 최신 투자 글을 한 화면에서 확인합니다.",
  alternates: {
    canonical: "/today",
  },
  openGraph: {
    title: "오늘의 투자 대시보드 | 호행처럼",
    description:
      "오늘 투자자가 확인할 일정과 최근 시장·경제 데이터를 한 화면에서 확인하세요.",
    url: "/today",
    type: "website",
  },
};

const MARKET_SYMBOLS = ["NASDAQCOM", "SP500", "DJIA"];
const CHECK_SYMBOLS = [
  "DGS10",
  "VIXCLS",
  "DTWEXBGS",
  "DCOILWTICO",
  "GOLDAMGBD228NLBM",
];
const POSITION_SYMBOLS = [
  "NASDAQCOM",
  "SP500",
  "DJIA",
  "VIXCLS",
  "DGS10",
  "GOLDAMGBD228NLBM",
  "DCOILWTICO",
  "DTWEXBGS",
  "CBBTCUSD",
];
const POSITION_CATEGORIES = new Set([
  "equities",
  "volatility",
  "rates",
  "credit",
  "commodities",
  "fx",
  "crypto",
]);

function releaseDateLabel(date: string) {
  const parsed = new Date(`${date}T12:00:00+09:00`);
  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    month: "numeric",
    day: "numeric",
    weekday: "short",
  }).format(parsed);
}

function importanceStars(score: number) {
  if (score >= 75) return "★★★";
  if (score >= 50) return "★★☆";
  return "★☆☆";
}

function regimeLabel(regime: "Risk-On" | "Neutral" | "Risk-Off") {
  if (regime === "Risk-On") return "위험선호";
  if (regime === "Risk-Off") return "위험회피";
  return "중립";
}

function daysUntil(date: string, baseDate: string) {
  const target = Date.parse(`${date}T00:00:00Z`);
  const base = Date.parse(`${baseDate}T00:00:00Z`);
  const diff = Math.round((target - base) / 86_400_000);
  if (diff <= 0) return "오늘";
  if (diff === 1) return "내일";
  return `D-${diff}`;
}

function clampPercentile(value: number) {
  return Math.max(0, Math.min(100, value));
}

function percentilePosition(value: number) {
  const percentile = clampPercentile(value);

  if (percentile >= 95) {
    return {
      rank: `상위 ${Math.max(1, Math.round(100 - percentile))}%`,
      zone: "극단 고점권",
      className: "text-rose-300",
    };
  }
  if (percentile >= 90) {
    return {
      rank: `상위 ${Math.max(1, Math.round(100 - percentile))}%`,
      zone: "고점권",
      className: "text-rose-300",
    };
  }
  if (percentile >= 75) {
    return {
      rank: `상위 ${Math.max(1, Math.round(100 - percentile))}%`,
      zone: "높은 구간",
      className: "text-amber-300",
    };
  }
  if (percentile <= 5) {
    return {
      rank: `하위 ${Math.max(1, Math.round(percentile))}%`,
      zone: "극단 저점권",
      className: "text-sky-300",
    };
  }
  if (percentile <= 10) {
    return {
      rank: `하위 ${Math.max(1, Math.round(percentile))}%`,
      zone: "저점권",
      className: "text-sky-300",
    };
  }
  if (percentile <= 25) {
    return {
      rank: `하위 ${Math.max(1, Math.round(percentile))}%`,
      zone: "낮은 구간",
      className: "text-blue-300",
    };
  }

  return {
    rank: `${Math.round(percentile)}백분위`,
    zone: "중립 구간",
    className: "text-slate-200",
  };
}

function distanceFromHighLabel(metric: JhMarketMetric) {
  if (metric.distanceFromHigh === null) return null;
  if (metric.distanceFromHigh >= -0.05) return "비교구간 최고점 부근";
  return `최고점 대비 ${metric.distanceFromHigh.toFixed(1)}%`;
}

function buildPositionMetrics(metrics: JhMarketMetric[]) {
  const preferred = POSITION_SYMBOLS.map((symbol) =>
    metrics.find((metric) => metric.symbol === symbol),
  ).filter((metric): metric is JhMarketMetric => Boolean(metric));

  const fallback = metrics.filter(
    (metric) =>
      POSITION_CATEGORIES.has(metric.category) &&
      metric.currentValue !== null &&
      metric.percentile !== null &&
      !metric.stale,
  );

  const seen = new Set<string>();
  return [...preferred, ...fallback]
    .filter((metric) => {
      if (
        seen.has(metric.symbol) ||
        metric.currentValue === null ||
        metric.percentile === null ||
        metric.stale
      ) {
        return false;
      }
      seen.add(metric.symbol);
      return true;
    })
    .sort((left, right) => {
      const leftExtreme = Math.abs((left.percentile ?? 50) - 50);
      const rightExtreme = Math.abs((right.percentile ?? 50) - 50);
      if (rightExtreme !== leftExtreme) return rightExtreme - leftExtreme;
      return right.importanceScore - left.importanceScore;
    })
    .slice(0, 7);
}

function MarketPositionRow({ metric }: { metric: JhMarketMetric }) {
  const percentile = clampPercentile(metric.percentile ?? 50);
  const position = percentilePosition(percentile);
  const change = firstChange(metric);
  const highDistance = distanceFromHighLabel(metric);

  return (
    <Link
      href={`/data/${encodeURIComponent(metric.symbol)}`}
      className="block rounded-2xl border border-white/10 bg-white/[0.06] p-4 transition hover:border-blue-400/40 hover:bg-white/[0.09]"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="truncate font-black text-white">{metric.nameKo}</h3>
            <span className="rounded-md bg-white/10 px-2 py-0.5 text-[10px] font-bold text-slate-400">
              {metric.symbol}
            </span>
          </div>
          <div className="mt-1 flex flex-wrap gap-x-2 gap-y-1 text-[11px] text-slate-400">
            <span>{formatObservedDate(metric.observedAt)} 기준</span>
            <span>{metric.trendLabel}</span>
          </div>
        </div>

        <div className="shrink-0 text-right">
          <p className="font-black tabular-nums text-white">
            {formatMetricValue(metric)}
          </p>
          <p className={`mt-1 text-xs font-black ${changeTone(change)}`}>
            {change?.label ?? "변화"} {formatChange(change)}
          </p>
        </div>
      </div>

      <div className="mt-4 flex items-end justify-between gap-3">
        <div>
          <p className={`text-sm font-black ${position.className}`}>
            {Math.round(percentile)}백분위 · {position.rank}
          </p>
          <p className="mt-0.5 text-[11px] font-bold text-slate-400">
            {position.zone}
            {highDistance ? ` · ${highDistance}` : ""}
          </p>
        </div>
        {metric.zScore !== null && (
          <span className="rounded-full border border-white/10 px-2.5 py-1 text-[10px] font-bold text-slate-400">
            Z {metric.zScore > 0 ? "+" : ""}
            {metric.zScore.toFixed(2)}
          </span>
        )}
      </div>

      <div className="mt-3">
        <div className="relative h-2 overflow-visible rounded-full bg-gradient-to-r from-sky-500 via-slate-500 to-rose-500 opacity-90">
          <span
            className="absolute top-1/2 h-4 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/70 bg-white shadow-lg"
            style={{ left: `${percentile}%` }}
            aria-hidden="true"
          />
        </div>
        <div className="mt-1.5 flex justify-between text-[10px] font-medium text-slate-500">
          <span>저점</span>
          <span>50</span>
          <span>고점</span>
        </div>
      </div>
    </Link>
  );
}

function MarketCard({ metric }: { metric: JhMarketMetric }) {
  const change = firstChange(metric);

  return (
    <Link
      href={`/data/${encodeURIComponent(metric.symbol)}`}
      className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-blue-300 hover:shadow-md"
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            {metric.symbol}
          </p>
          <h3 className="mt-1 line-clamp-1 text-sm font-bold text-slate-900">
            {metric.nameKo}
          </h3>
        </div>
        <span className={`text-sm font-black tabular-nums ${changeTone(change)}`}>
          {formatChange(change)}
        </span>
      </div>

      <p className="mt-4 text-xl font-black tracking-tight text-slate-950 tabular-nums">
        {formatMetricValue(metric)}
      </p>
      <p className="mt-1 text-[11px] text-slate-400">
        {formatObservedDate(metric.observedAt)} 기준 · {change?.label ?? "변화"}
      </p>
    </Link>
  );
}

export default async function TodayPage() {
  const [dashboard, posts] = await Promise.all([
    getPublicMarketDashboard(),
    getLatestInvestmentPosts(5),
  ]);

  const marketMetrics = pickMetrics(
    dashboard,
    MARKET_SYMBOLS,
    "equities",
    3,
  );
  const checkMetrics = pickMetrics(
    dashboard,
    CHECK_SYMBOLS,
    undefined,
    5,
  );

  const releases = buildUpcomingReleases(dashboard, 16);
  const todayReleases = dashboard
    ? releases.filter((release) => release.date === dashboard.asOfDate).slice(0, 4)
    : [];
  const displayedReleases =
    todayReleases.length > 0 ? todayReleases : releases.slice(0, 4);

  const keyData = [
    categoryMetric(dashboard, "inflation"),
    categoryMetric(dashboard, "labor"),
    categoryMetric(dashboard, "rates"),
    categoryMetric(dashboard, "liquidity"),
  ].filter((metric): metric is JhMarketMetric => metric !== null);

  const positionMetrics = dashboard ? buildPositionMetrics(dashboard.metrics) : [];
  const narrativeChecks = [
    ...(dashboard?.anomalies.slice(0, 3).map((item) => ({
      key: item.id,
      title: item.title,
      description: item.description,
      symbols: item.relatedSymbols,
    })) ?? []),
    ...(dashboard?.biggestChanges.slice(0, 2).map((item) => ({
      key: `change-${item.symbol}`,
      title: `${item.name} 주요 변화`,
      description: `${item.changeLabel} 변화가 ${item.explanation}`,
      symbols: [item.symbol],
    })) ?? []),
  ].filter(
    (item, index, all) =>
      all.findIndex((candidate) => candidate.key === item.key) === index,
  ).slice(0, 3);

  return (
    <main className="min-h-screen bg-[#f6f7f9] pb-24 text-slate-900 md:pb-12">
      <section className="border-b border-slate-200 bg-gradient-to-b from-slate-950 to-slate-900 text-white">
        <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-10">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-blue-300">
                HOHAENG TODAY
              </p>
              <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">
                오늘의 투자 대시보드
              </h1>
              <p className="mt-2 text-sm text-slate-300">{formatSeoulDate()}</p>
            </div>

            {dashboard && (
              <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-right">
                <p className="text-xs text-slate-400">시장 국면</p>
                <p
                  className={`mt-1 text-lg font-black ${
                    dashboard.regime === "Risk-On"
                      ? "text-emerald-300"
                      : dashboard.regime === "Risk-Off"
                        ? "text-rose-300"
                        : "text-amber-200"
                  }`}
                >
                  {regimeLabel(dashboard.regime)}
                </p>
                <p className="text-[11px] text-slate-400">
                  신뢰도 {dashboard.regimeConfidence}
                </p>
              </div>
            )}
          </div>

          {dashboard?.latestDataUpdate && (
            <p className="mt-5 text-xs text-slate-400">
              최근 데이터 기준 {formatObservedDate(dashboard.latestDataUpdate)}
            </p>
          )}
        </div>
      </section>

      <div className="mx-auto max-w-5xl space-y-6 px-4 py-6 sm:px-6 sm:py-8">
        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-blue-600">
                01 · MARKET CLOSE
              </p>
              <h2 className="mt-1 text-xl font-black">최근 미국시장 마감</h2>
            </div>
            <Link
              href="/data"
              className="shrink-0 text-sm font-bold text-blue-600 hover:text-blue-700"
            >
              전체 데이터 →
            </Link>
          </div>

          {marketMetrics.length > 0 ? (
            <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-3">
              {marketMetrics.map((metric) => (
                <MarketCard key={metric.symbol} metric={metric} />
              ))}
            </div>
          ) : (
            <p className="mt-5 rounded-2xl bg-slate-50 p-4 text-sm text-slate-500">
              시장 데이터를 불러오는 중입니다.
            </p>
          )}

          {checkMetrics.length > 0 && (
            <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
              {checkMetrics.map((metric) => {
                const change = firstChange(metric);
                return (
                  <Link
                    key={metric.symbol}
                    href={`/data/${encodeURIComponent(metric.symbol)}`}
                    className="rounded-xl bg-slate-50 px-3 py-3 transition hover:bg-slate-100"
                  >
                    <p className="line-clamp-1 text-xs font-semibold text-slate-500">
                      {metric.nameKo}
                    </p>
                    <p className="mt-1 font-black tabular-nums text-slate-900">
                      {formatMetricValue(metric)}
                    </p>
                    <p className={`mt-1 text-xs font-bold ${changeTone(change)}`}>
                      {formatChange(change)}
                    </p>
                  </Link>
                );
              })}
            </div>
          )}
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-rose-600">
                02 · CALENDAR
              </p>
              <h2 className="mt-1 text-xl font-black">
                {todayReleases.length > 0 ? "오늘의 주요 발표" : "다가오는 주요 발표"}
              </h2>
            </div>
            <Link
              href="/data/calendar"
              className="shrink-0 text-sm font-bold text-blue-600 hover:text-blue-700"
            >
              일정 전체보기 →
            </Link>
          </div>

          {displayedReleases.length > 0 ? (
            <div className="mt-5 divide-y divide-slate-100">
              {displayedReleases.map((release) => (
                <div
                  key={`${release.date}-${release.title}`}
                  className="grid grid-cols-[76px_1fr] gap-4 py-4 first:pt-0 last:pb-0 sm:grid-cols-[90px_1fr_auto] sm:items-center"
                >
                  <div className="shrink-0">
                    <p className="text-sm font-black text-slate-900">
                      {releaseDateLabel(release.date)}
                    </p>
                    <p className="mt-1 text-xs font-bold tracking-wider text-amber-500">
                      {importanceStars(release.importanceScore)}
                    </p>
                  </div>

                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-black text-slate-900">{release.title}</p>
                      {dashboard && (
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-500">
                          {daysUntil(release.date, dashboard.asOfDate)}
                        </span>
                      )}
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-400">
                      {release.timeKst && (
                        <span className="font-bold text-blue-600">
                          한국시간 {release.timeKst}
                        </span>
                      )}
                      <span>{release.categoryLabel}</span>
                      {release.sourceAgency && <span>{release.sourceAgency}</span>}
                    </div>
                  </div>

                  <div className="col-start-2 flex flex-wrap gap-1 sm:col-start-auto sm:justify-end">
                    {release.symbols.slice(0, 2).map((symbol) => (
                      <Link
                        key={symbol}
                        href={`/data/${encodeURIComponent(symbol)}`}
                        className="rounded-full bg-blue-50 px-2.5 py-1 text-[11px] font-bold text-blue-700 hover:bg-blue-100"
                      >
                        {symbol}
                      </Link>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-5 rounded-2xl bg-slate-50 p-4 text-sm text-slate-500">
              확인되는 다음 주요 발표 일정이 없습니다.
            </p>
          )}

          <p className="mt-4 text-xs leading-5 text-slate-400">
            한국시간 기준 · 공식 일정이 확인되는 핵심 지표는 발표시각까지 표시합니다.
          </p>
        </section>

        <section className="grid gap-6 lg:grid-cols-[1.35fr_0.65fr]">
          <div className="rounded-3xl border border-slate-200 bg-slate-950 p-5 text-white shadow-sm sm:p-6">
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-blue-300">
                  03 · TODAY CHECK
                </p>
                <h2 className="mt-1 text-xl font-black">오늘 시장 위치</h2>
              </div>
              <Link
                href="/data"
                className="shrink-0 text-xs font-bold text-blue-300 hover:text-blue-200"
              >
                전체 지표 →
              </Link>
            </div>

            <p className="mt-3 text-xs leading-5 text-slate-400">
              지표별 과거 비교구간에서 현재 값이 어디에 있는지 백분위로 표시합니다.
              오른쪽에 가까울수록 상대적으로 높은 구간입니다.
            </p>

            {positionMetrics.length > 0 ? (
              <div className="mt-5 space-y-3">
                {positionMetrics.map((metric) => (
                  <MarketPositionRow key={metric.symbol} metric={metric} />
                ))}
              </div>
            ) : (
              <p className="mt-5 rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-slate-300">
                현재 위치를 계산할 수 있는 시장 지표가 아직 부족합니다.
              </p>
            )}

            {narrativeChecks.length > 0 && (
              <div className="mt-6 border-t border-white/10 pt-5">
                <h3 className="text-sm font-black text-white">왜 체크해야 하나</h3>
                <div className="mt-3 space-y-2">
                  {narrativeChecks.map((item, index) => (
                    <div
                      key={item.key}
                      className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3"
                    >
                      <div className="flex items-start gap-3">
                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-500/20 text-[10px] font-black text-blue-200">
                          {index + 1}
                        </span>
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="text-sm font-black text-white">{item.title}</p>
                            {item.symbols.slice(0, 2).map((symbol) => (
                              <span
                                key={symbol}
                                className="rounded bg-white/10 px-1.5 py-0.5 text-[9px] font-bold text-slate-400"
                              >
                                {symbol}
                              </span>
                            ))}
                          </div>
                          <p className="mt-1 text-xs leading-5 text-slate-300">
                            {item.description}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="mt-5 flex flex-wrap gap-2">
              <Link
                href="/blog?category=market"
                className="rounded-full bg-blue-600 px-4 py-2 text-sm font-bold text-white hover:bg-blue-500"
              >
                오늘 시황 보기 →
              </Link>
              <Link
                href="/blog?category=investment-data"
                className="rounded-full border border-white/15 px-4 py-2 text-sm font-bold text-slate-200 hover:bg-white/10"
              >
                투자 데이터 글 →
              </Link>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <p className="text-xs font-bold uppercase tracking-wider text-violet-600">
              04 · KEY DATA
            </p>
            <h2 className="mt-1 text-xl font-black">최신 경제 데이터</h2>

            <div className="mt-5 space-y-2">
              {keyData.length > 0 ? (
                keyData.map((metric) => (
                  <Link
                    key={metric.symbol}
                    href={`/data/${encodeURIComponent(metric.symbol)}`}
                    className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 px-4 py-3 transition hover:bg-slate-100"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-slate-900">
                        {metric.nameKo}
                      </p>
                      <p className="mt-0.5 text-[11px] text-slate-400">
                        {formatObservedDate(metric.observedAt)}
                      </p>
                    </div>
                    <p className="shrink-0 font-black tabular-nums text-slate-900">
                      {formatMetricValue(metric)}
                    </p>
                  </Link>
                ))
              ) : (
                <p className="text-sm text-slate-500">표시할 데이터가 없습니다.</p>
              )}
            </div>
          </div>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-emerald-600">
                05 · CONTENT
              </p>
              <h2 className="mt-1 text-xl font-black">지금 같이 보면 좋은 글</h2>
            </div>
            <Link
              href="/blog"
              className="shrink-0 text-sm font-bold text-blue-600 hover:text-blue-700"
            >
              블로그 전체 →
            </Link>
          </div>

          {posts.length > 0 ? (
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {posts.map((post) => (
                <Link
                  key={post.id}
                  href={`/blog/${encodeURIComponent(post.slug)}`}
                  className="group rounded-2xl border border-slate-200 p-4 transition hover:border-blue-300 hover:bg-blue-50/30"
                >
                  <p className="text-xs font-bold text-blue-600">
                    {post.category === "market"
                      ? "시황 및 시장"
                      : post.category === "investment-data"
                        ? "투자 데이터"
                        : "HOHAENG"}
                  </p>
                  <h3 className="mt-2 line-clamp-2 font-black leading-6 text-slate-900 group-hover:text-blue-700">
                    {post.title}
                  </h3>
                  {post.description && (
                    <p className="mt-2 line-clamp-2 text-sm leading-5 text-slate-500">
                      {post.description}
                    </p>
                  )}
                </Link>
              ))}
            </div>
          ) : (
            <p className="mt-5 text-sm text-slate-500">
              공개된 최신 글이 아직 없습니다.
            </p>
          )}
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
            QUICK ACCESS
          </p>
          <h2 className="mt-1 text-xl font-black">빠른 실행</h2>

          <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { href: "/data/calendar", icon: "📅", label: "투자 캘린더" },
              { href: "/data", icon: "📊", label: "투자 데이터" },
              { href: "/money", icon: "🧮", label: "계산기" },
              { href: "/blog?category=log", icon: "✍️", label: "호행의 일지" },
            ].map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-2xl bg-slate-50 p-4 text-center font-bold text-slate-800 transition hover:bg-slate-100"
              >
                <span className="block text-2xl" aria-hidden="true">
                  {item.icon}
                </span>
                <span className="mt-2 block text-sm">{item.label}</span>
              </Link>
            ))}
          </div>
        </section>
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 shadow-[0_-10px_30px_rgba(15,23,42,0.08)] backdrop-blur md:hidden">
        <div className="mx-auto grid max-w-md grid-cols-5">
          {[
            { href: "/", icon: "⌂", label: "홈" },
            { href: "/today", icon: "◉", label: "TODAY" },
            { href: "/data", icon: "▦", label: "데이터" },
            { href: "/money", icon: "＋", label: "계산기" },
            { href: "/blog", icon: "☰", label: "콘텐츠" },
          ].map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center gap-1 rounded-xl px-1 py-1.5 text-[11px] font-bold ${
                item.href === "/today"
                  ? "text-blue-600"
                  : "text-slate-500 hover:text-slate-900"
              }`}
            >
              <span className="text-lg leading-none" aria-hidden="true">
                {item.icon}
              </span>
              {item.label}
            </Link>
          ))}
        </div>
      </nav>
    </main>
  );
}
