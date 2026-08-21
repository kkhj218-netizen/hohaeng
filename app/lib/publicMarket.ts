import "server-only";

import { getJhMarketDashboard } from "@/app/lib/jhMarketEngine";
import type {
  JhDashboardData,
  JhMarketMetric,
  JhPeriodChange,
} from "@/app/lib/jhMarketTypes";
import { supabase } from "@/app/lib/supabase";

export type PublicPost = {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  category: string | null;
  subcategory: string | null;
  created_at: string | null;
  view_count: number | null;
};

export type PublicRelease = {
  date: string;
  title: string;
  category: string;
  symbols: string[];
  importanceScore: number;
};

export async function getPublicMarketDashboard(): Promise<JhDashboardData | null> {
  try {
    return await getJhMarketDashboard();
  } catch (error) {
    console.error("공개 투자 데이터 불러오기 오류:", error);
    return null;
  }
}

export async function getLatestInvestmentPosts(limit = 5): Promise<PublicPost[]> {
  const fields =
    "id, title, slug, description, category, subcategory, created_at, view_count";

  const investmentResult = await supabase
    .from("posts")
    .select(fields)
    .eq("status", "published")
    .in("category", ["market", "investment-data"])
    .order("created_at", { ascending: false })
    .limit(limit);

  if (!investmentResult.error && (investmentResult.data?.length ?? 0) > 0) {
    return (investmentResult.data ?? []) as PublicPost[];
  }

  const fallbackResult = await supabase
    .from("posts")
    .select(fields)
    .eq("status", "published")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (fallbackResult.error) {
    console.error("TODAY 최신글 불러오기 오류:", fallbackResult.error);
    return [];
  }

  return (fallbackResult.data ?? []) as PublicPost[];
}

export function metricBySymbol(
  dashboard: JhDashboardData | null,
  symbol: string,
): JhMarketMetric | null {
  if (!dashboard) return null;

  return (
    dashboard.metrics.find(
      (metric) => metric.symbol.toUpperCase() === symbol.toUpperCase(),
    ) ?? null
  );
}

export function pickMetrics(
  dashboard: JhDashboardData | null,
  symbols: string[],
  fallbackCategory?: string,
  limit = symbols.length,
): JhMarketMetric[] {
  if (!dashboard) return [];

  const picked: JhMarketMetric[] = [];
  const seen = new Set<string>();

  for (const symbol of symbols) {
    const metric = metricBySymbol(dashboard, symbol);
    if (!metric || metric.currentValue === null || seen.has(metric.symbol)) {
      continue;
    }

    picked.push(metric);
    seen.add(metric.symbol);
  }

  if (fallbackCategory && picked.length < limit) {
    for (const metric of dashboard.metrics) {
      if (
        metric.category !== fallbackCategory ||
        metric.currentValue === null ||
        seen.has(metric.symbol)
      ) {
        continue;
      }

      picked.push(metric);
      seen.add(metric.symbol);

      if (picked.length >= limit) break;
    }
  }

  return picked.slice(0, limit);
}

export function firstChange(
  metric: JhMarketMetric,
): JhPeriodChange | undefined {
  return metric.changes.find((change) => change.key === "short") ?? metric.changes[0];
}

export function formatMetricValue(metric: JhMarketMetric): string {
  if (metric.currentValue === null) return "—";

  const absolute = Math.abs(metric.currentValue);
  const maximumFractionDigits = absolute >= 1_000 ? 1 : absolute >= 10 ? 2 : 3;
  const value = new Intl.NumberFormat("ko-KR", {
    maximumFractionDigits,
  }).format(metric.currentValue);

  return metric.currentUnit ? `${value} ${metric.currentUnit}` : value;
}

export function formatChange(change: JhPeriodChange | undefined): string {
  if (!change || change.value === null) return "—";

  const sign = change.value > 0 ? "+" : "";
  const digits = Math.abs(change.value) >= 100 ? 1 : 2;
  const suffix = change.unit === "value" ? "" : change.unit;

  return `${sign}${change.value.toFixed(digits)}${suffix}`;
}

export function changeTone(change: JhPeriodChange | undefined): string {
  if (!change || change.value === null || change.value === 0) {
    return "text-slate-500";
  }

  return change.value > 0 ? "text-emerald-600" : "text-rose-600";
}

export function formatObservedDate(value: string | null): string {
  if (!value) return "기준일 없음";
  const [year, month, day] = value.slice(0, 10).split("-");
  return `${year}.${month}.${day}`;
}

export function formatSeoulDate(value = new Date()): string {
  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "short",
  }).format(value);
}

export function buildUpcomingReleases(
  dashboard: JhDashboardData | null,
  limit = 30,
): PublicRelease[] {
  if (!dashboard) return [];

  const grouped = new Map<string, PublicRelease>();

  for (const metric of dashboard.metrics) {
    const date = metric.nextReleaseDate?.slice(0, 10);
    if (!date || date < dashboard.asOfDate) continue;

    const title = metric.releaseName?.trim() || `${metric.nameKo} 발표`;
    const key = `${date}:${title}`;
    const existing = grouped.get(key);

    if (existing) {
      if (!existing.symbols.includes(metric.symbol)) {
        existing.symbols.push(metric.symbol);
      }
      existing.importanceScore = Math.max(
        existing.importanceScore,
        metric.importanceScore,
      );
      continue;
    }

    grouped.set(key, {
      date,
      title,
      category: metric.category,
      symbols: [metric.symbol],
      importanceScore: metric.importanceScore,
    });
  }

  return Array.from(grouped.values())
    .sort((left, right) => {
      const dateOrder = left.date.localeCompare(right.date);
      if (dateOrder !== 0) return dateOrder;
      return right.importanceScore - left.importanceScore;
    })
    .slice(0, limit);
}

export function categoryMetric(
  dashboard: JhDashboardData | null,
  category: string,
): JhMarketMetric | null {
  if (!dashboard) return null;

  return (
    dashboard.metrics.find(
      (metric) => metric.category === category && metric.currentValue !== null,
    ) ?? null
  );
}

export function freshnessLabel(metric: JhMarketMetric): string {
  const status = metric.freshnessStatus ?? (metric.stale ? "delayed" : "fresh");

  if (status === "fresh") return "원천 최신";
  if (status === "awaiting_release") return "발표 대기";
  if (status === "delayed") return "업데이트 확인 필요";
  return "데이터 없음";
}
