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
  timeKst: string | null;
  title: string;
  category: string;
  categoryLabel: string;
  symbols: string[];
  importanceScore: number;
  sourceAgency: string | null;
  sourceUrl: string | null;
};

type OfficialScheduleEntry = {
  date: string;
  timeEt: string;
};

type ReleaseDefinition = {
  titleKo: string;
  agency: string;
  sourceUrl: string;
  schedule?: OfficialScheduleEntry[];
};

const BLS_SCHEDULE_URL = "https://www.bls.gov/schedule/2026/";
const BEA_SCHEDULE_URL = "https://www.bea.gov/news/schedule";
const CENSUS_HOUSING_SCHEDULE_URL =
  "https://www.census.gov/construction/soc/schedule.html";
const FED_H6_SCHEDULE_URL = "https://www.federalreserve.gov/Releases/H6/default.htm";

const CATEGORY_LABELS: Record<string, string> = {
  equities: "주식시장",
  volatility: "변동성",
  rates: "금리·채권",
  credit: "신용시장",
  liquidity: "유동성",
  inflation: "물가",
  labor: "고용",
  growth: "경기",
  commodities: "원자재",
  fx: "환율",
  crypto: "가상자산",
};

const SCHEDULES = {
  cpi: [
    { date: "2026-09-11", timeEt: "08:30" },
    { date: "2026-10-14", timeEt: "08:30" },
    { date: "2026-11-10", timeEt: "08:30" },
    { date: "2026-12-10", timeEt: "08:30" },
  ],
  ppi: [
    { date: "2026-09-10", timeEt: "08:30" },
    { date: "2026-10-15", timeEt: "08:30" },
    { date: "2026-11-13", timeEt: "08:30" },
    { date: "2026-12-15", timeEt: "08:30" },
  ],
  jobs: [
    { date: "2026-09-04", timeEt: "08:30" },
    { date: "2026-10-02", timeEt: "08:30" },
    { date: "2026-11-06", timeEt: "08:30" },
    { date: "2026-12-04", timeEt: "08:30" },
  ],
  jolts: [
    { date: "2026-09-01", timeEt: "10:00" },
    { date: "2026-09-29", timeEt: "10:00" },
    { date: "2026-11-03", timeEt: "10:00" },
    { date: "2026-12-01", timeEt: "10:00" },
  ],
  pce: [
    { date: "2026-08-26", timeEt: "08:30" },
    { date: "2026-09-30", timeEt: "08:30" },
    { date: "2026-10-29", timeEt: "08:30" },
    { date: "2026-11-25", timeEt: "08:30" },
    { date: "2026-12-23", timeEt: "08:30" },
  ],
  gdp: [
    { date: "2026-08-26", timeEt: "08:30" },
    { date: "2026-09-30", timeEt: "08:30" },
    { date: "2026-10-29", timeEt: "08:30" },
    { date: "2026-11-25", timeEt: "08:30" },
    { date: "2026-12-23", timeEt: "08:30" },
  ],
  housing: [
    { date: "2026-09-17", timeEt: "08:30" },
    { date: "2026-10-20", timeEt: "08:30" },
    { date: "2026-11-18", timeEt: "08:30" },
    { date: "2026-12-17", timeEt: "08:30" },
  ],
  m2: [
    { date: "2026-08-25", timeEt: "13:00" },
    { date: "2026-09-22", timeEt: "13:00" },
    { date: "2026-10-27", timeEt: "13:00" },
    { date: "2026-11-24", timeEt: "13:00" },
    { date: "2026-12-22", timeEt: "13:00" },
  ],
} satisfies Record<string, OfficialScheduleEntry[]>;

function hasHangul(value: string): boolean {
  return /[가-힣]/.test(value);
}

function releaseDefinition(metric: JhMarketMetric): ReleaseDefinition | null {
  const releaseName = (metric.releaseName ?? "").toLowerCase();
  const symbol = metric.symbol.toUpperCase();

  if (
    releaseName.includes("consumer price index") ||
    symbol === "CPIAUCSL" ||
    symbol === "CPILFESL"
  ) {
    return {
      titleKo: "미국 소비자물가지수(CPI)",
      agency: "미 노동통계국(BLS)",
      sourceUrl: BLS_SCHEDULE_URL,
      schedule: SCHEDULES.cpi,
    };
  }

  if (releaseName.includes("producer price index") || symbol.startsWith("PPI")) {
    return {
      titleKo: "미국 생산자물가지수(PPI)",
      agency: "미 노동통계국(BLS)",
      sourceUrl: BLS_SCHEDULE_URL,
      schedule: SCHEDULES.ppi,
    };
  }

  if (
    releaseName.includes("employment situation") ||
    symbol === "PAYEMS" ||
    symbol === "UNRATE"
  ) {
    return {
      titleKo: "미국 고용보고서",
      agency: "미 노동통계국(BLS)",
      sourceUrl: BLS_SCHEDULE_URL,
      schedule: SCHEDULES.jobs,
    };
  }

  if (
    releaseName.includes("job openings and labor turnover") ||
    releaseName.includes("jolts") ||
    symbol.startsWith("JTS")
  ) {
    return {
      titleKo: "미국 구인·이직 보고서(JOLTS)",
      agency: "미 노동통계국(BLS)",
      sourceUrl: BLS_SCHEDULE_URL,
      schedule: SCHEDULES.jolts,
    };
  }

  if (
    releaseName.includes("personal income and outlays") ||
    symbol === "PCEPI" ||
    symbol === "PCEPILFE"
  ) {
    return {
      titleKo: "미국 개인소득·소비지출(PCE)",
      agency: "미 경제분석국(BEA)",
      sourceUrl: BEA_SCHEDULE_URL,
      schedule: SCHEDULES.pce,
    };
  }

  if (
    releaseName.includes("gross domestic product") ||
    symbol === "GDPC1" ||
    symbol === "GDP"
  ) {
    return {
      titleKo: "미국 국내총생산(GDP)",
      agency: "미 경제분석국(BEA)",
      sourceUrl: BEA_SCHEDULE_URL,
      schedule: SCHEDULES.gdp,
    };
  }

  if (
    releaseName.includes("new residential construction") ||
    symbol === "HOUST"
  ) {
    return {
      titleKo: "미국 주택착공·건축허가",
      agency: "미 인구조사국(Census)",
      sourceUrl: CENSUS_HOUSING_SCHEDULE_URL,
      schedule: SCHEDULES.housing,
    };
  }

  if (
    releaseName.includes("money stock measures") ||
    releaseName.includes("h.6") ||
    symbol === "M2SL"
  ) {
    return {
      titleKo: "미국 M2 통화량",
      agency: "미 연방준비제도(Fed)",
      sourceUrl: FED_H6_SCHEDULE_URL,
      schedule: SCHEDULES.m2,
    };
  }

  if (releaseName.includes("retail sales") || symbol === "RSAFS") {
    return {
      titleKo: "미국 소매판매",
      agency: "미 인구조사국(Census)",
      sourceUrl: "https://www.census.gov/economic-indicators/",
    };
  }

  if (releaseName.includes("industrial production") || symbol === "INDPRO") {
    return {
      titleKo: "미국 산업생산·설비가동률",
      agency: "미 연방준비제도(Fed)",
      sourceUrl: "https://www.federalreserve.gov/releases/g17/",
    };
  }

  return null;
}

function zonedLocalTimeToUtc(
  date: string,
  time: string,
  timeZone: string,
): Date {
  const [year, month, day] = date.split("-").map(Number);
  const [hour, minute] = time.split(":").map(Number);
  const desiredAsUtc = Date.UTC(year, month - 1, day, hour, minute);
  let guess = desiredAsUtc;

  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  });

  for (let index = 0; index < 2; index += 1) {
    const parts = formatter.formatToParts(new Date(guess));
    const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
    const representedAsUtc = Date.UTC(
      Number(values.year),
      Number(values.month) - 1,
      Number(values.day),
      Number(values.hour),
      Number(values.minute),
    );
    guess += desiredAsUtc - representedAsUtc;
  }

  return new Date(guess);
}

function toKoreanReleaseTime(entry: OfficialScheduleEntry): {
  date: string;
  time: string;
} {
  const instant = zonedLocalTimeToUtc(
    entry.date,
    entry.timeEt,
    "America/New_York",
  );
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(instant);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));

  return {
    date: `${values.year}-${values.month}-${values.day}`,
    time: `${values.hour}:${values.minute}`,
  };
}

function nextOfficialRelease(
  schedule: OfficialScheduleEntry[] | undefined,
  asOfDate: string,
): { date: string; time: string } | null {
  if (!schedule) return null;

  for (const entry of schedule) {
    const korean = toKoreanReleaseTime(entry);
    if (korean.date >= asOfDate) return korean;
  }

  return null;
}

export function publicCategoryLabel(category: string): string {
  return CATEGORY_LABELS[category] ?? category;
}

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
    const definition = releaseDefinition(metric);
    const official = nextOfficialRelease(definition?.schedule, dashboard.asOfDate);
    const fallbackDate = metric.nextReleaseDate?.slice(0, 10) ?? null;
    const date = official?.date ?? fallbackDate;

    if (!date || date < dashboard.asOfDate) continue;

    const rawReleaseName = metric.releaseName?.trim() ?? "";
    const title =
      definition?.titleKo ||
      (rawReleaseName && hasHangul(rawReleaseName)
        ? rawReleaseName
        : `${metric.nameKo} 발표`);
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
      if (!existing.timeKst && official?.time) existing.timeKst = official.time;
      continue;
    }

    grouped.set(key, {
      date,
      timeKst: official?.time ?? null,
      title,
      category: metric.category,
      categoryLabel: publicCategoryLabel(metric.category),
      symbols: [metric.symbol],
      importanceScore: metric.importanceScore,
      sourceAgency: definition?.agency ?? metric.sourceName ?? null,
      sourceUrl: definition?.sourceUrl ?? null,
    });
  }

  return Array.from(grouped.values())
    .sort((left, right) => {
      const dateOrder = left.date.localeCompare(right.date);
      if (dateOrder !== 0) return dateOrder;
      const leftTime = left.timeKst ?? "99:99";
      const rightTime = right.timeKst ?? "99:99";
      const timeOrder = leftTime.localeCompare(rightTime);
      if (timeOrder !== 0) return timeOrder;
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
