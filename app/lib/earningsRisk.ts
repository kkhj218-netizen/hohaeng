import "server-only";

import { loadEarningsRiskSnapshot, saveEarningsRiskSnapshot } from "@/app/lib/earningsRiskSnapshotStore";
import type {
  EarningsRiskEvent,
  EarningsRiskIndexImpact,
  EarningsRiskSession,
  EarningsRiskSnapshot,
} from "@/app/lib/earningsRiskTypes";
import { loadMarketMapSnapshot } from "@/app/lib/marketMapSnapshotStore";
import type { MarketMapSnapshot, MarketMapStock } from "@/app/lib/marketMapTypes";

type NasdaqEarningsRow = {
  symbol?: string;
  name?: string;
  time?: string;
  marketCap?: string;
  fiscalQuarterEnding?: string;
  epsForecast?: string;
  noOfEsts?: string;
};

type NasdaqEarningsResponse = {
  data?: {
    rows?: NasdaqEarningsRow[];
  };
};

type StockContext = {
  stock: MarketMapStock;
  indices: EarningsRiskIndexImpact[];
};

const NASDAQ_EARNINGS_URL = "https://api.nasdaq.com/api/calendar/earnings";
const NASDAQ_EARNINGS_PAGE_URL = "https://www.nasdaq.com/market-activity/earnings";
const WINDOW_DAYS = 7;
const NASDAQ_TOP_LIMIT = 30;
const SP500_TOP_LIMIT = 50;
const FETCH_TIMEOUT_MS = 15_000;
const FETCH_ATTEMPTS = 2;
const FETCH_CONCURRENCY = 4;

function clamp(value: number, min = 0, max = 100) {
  return Math.max(min, Math.min(max, value));
}

function round(value: number, digits = 1) {
  const factor = 10 ** digits;
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function normalizeSymbol(value: string) {
  return value.trim().toUpperCase().replaceAll(".", "/");
}

function dateKeyInNewYork(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const map = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${map.year}-${map.month}-${map.day}`;
}

function addDays(dateKey: string, days: number) {
  const date = new Date(`${dateKey}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function daysBetween(baseDate: string, targetDate: string) {
  return Math.round(
    (Date.parse(`${targetDate}T00:00:00Z`) - Date.parse(`${baseDate}T00:00:00Z`)) / 86_400_000,
  );
}

function normalizeSession(value: string | undefined): { session: EarningsRiskSession; label: string } {
  const normalized = (value ?? "").toLowerCase();
  if (normalized.includes("pre-market") || normalized.includes("pre_market")) {
    return { session: "pre_market", label: "장 시작 전" };
  }
  if (
    normalized.includes("after-hours") ||
    normalized.includes("after-market") ||
    normalized.includes("after_hours")
  ) {
    return { session: "after_hours", label: "장 마감 후" };
  }
  return { session: "unknown", label: "시간 미정" };
}

function marketCapScore(marketCap: number) {
  if (marketCap <= 0) return 0;
  const lower = 100_000_000_000;
  const upper = 5_000_000_000_000;
  const normalized =
    (Math.log10(Math.max(marketCap, lower)) - Math.log10(lower)) /
    (Math.log10(upper) - Math.log10(lower));
  return clamp(normalized * 100);
}

function impactLabel(score: number) {
  if (score >= 80) return "매우 높음";
  if (score >= 65) return "높음";
  if (score >= 50) return "주의";
  return "관찰";
}

function riskLevel(daysAway: number, impactScore: number): EarningsRiskEvent["riskLevel"] {
  if (daysAway <= 1 && impactScore >= 65) return "high";
  if (daysAway <= 3 || impactScore >= 80) return "important";
  return "watch";
}

function buildIndexImpacts(snapshot: MarketMapSnapshot, indexName: string) {
  const totalMarketCap = snapshot.stocks.reduce((sum, stock) => sum + stock.marketCap, 0);
  return new Map(
    snapshot.stocks.map((stock, index) => [
      normalizeSymbol(stock.symbol),
      {
        indexKey: snapshot.indexKey,
        indexName,
        rank: index + 1,
        marketCapShare: totalMarketCap > 0 ? round((stock.marketCap / totalMarketCap) * 100, 2) : 0,
      } satisfies EarningsRiskIndexImpact,
    ]),
  );
}

function buildStockContexts(nasdaq100: MarketMapSnapshot, sp500: MarketMapSnapshot) {
  const nasdaqImpacts = buildIndexImpacts(nasdaq100, "NASDAQ 100");
  const sp500Impacts = buildIndexImpacts(sp500, "S&P 500");
  const candidates = [
    ...nasdaq100.stocks.slice(0, NASDAQ_TOP_LIMIT),
    ...sp500.stocks.slice(0, SP500_TOP_LIMIT),
  ];
  const contexts = new Map<string, StockContext>();

  for (const stock of candidates) {
    const symbol = normalizeSymbol(stock.symbol);
    const existing = contexts.get(symbol);
    const bestStock = existing && existing.stock.marketCap > stock.marketCap ? existing.stock : stock;
    const indices = [nasdaqImpacts.get(symbol), sp500Impacts.get(symbol)].filter(
      (item): item is EarningsRiskIndexImpact => Boolean(item),
    );
    contexts.set(symbol, { stock: bestStock, indices });
  }

  return contexts;
}

function calculateImpact(context: StockContext) {
  const bestIndexImpact = context.indices.reduce((best, item) => {
    const shareScore = clamp(item.marketCapShare * 10);
    const rankUniverse = item.indexKey === "nasdaq100" ? 100 : 500;
    const rankScore = clamp(100 - ((item.rank - 1) / Math.max(1, rankUniverse - 1)) * 100);
    return Math.max(best, shareScore * 0.72 + rankScore * 0.28);
  }, 0);
  const overlapBonus = context.indices.length > 1 ? 4 : 0;
  return Math.round(clamp(bestIndexImpact * 0.8 + marketCapScore(context.stock.marketCap) * 0.2 + overlapBonus));
}

async function fetchEarningsForDate(date: string): Promise<NasdaqEarningsRow[]> {
  let lastError: unknown = null;

  for (let attempt = 1; attempt <= FETCH_ATTEMPTS; attempt += 1) {
    try {
      const response = await fetch(`${NASDAQ_EARNINGS_URL}?date=${encodeURIComponent(date)}`, {
        cache: "no-store",
        headers: {
          Accept: "application/json,text/plain,*/*",
          "Accept-Language": "en-US,en;q=0.9",
          Origin: "https://www.nasdaq.com",
          Referer: NASDAQ_EARNINGS_PAGE_URL,
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36",
        },
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      });
      if (!response.ok) throw new Error(`NASDAQ earnings ${date} 응답 오류 (${response.status})`);
      const payload = (await response.json()) as NasdaqEarningsResponse;
      return payload.data?.rows ?? [];
    } catch (error) {
      lastError = error;
      if (attempt < FETCH_ATTEMPTS) await sleep(700 * attempt);
    }
  }

  const detail = lastError instanceof Error ? lastError.message : String(lastError ?? "알 수 없는 오류");
  throw new Error(detail);
}

async function fetchEarningsWindow(asOfDate: string) {
  const dates = Array.from({ length: WINDOW_DAYS + 1 }, (_, index) => addDays(asOfDate, index));
  const rowsByDate = new Map<string, NasdaqEarningsRow[]>();
  const failures: string[] = [];

  for (let offset = 0; offset < dates.length; offset += FETCH_CONCURRENCY) {
    const batch = dates.slice(offset, offset + FETCH_CONCURRENCY);
    const results = await Promise.allSettled(batch.map((date) => fetchEarningsForDate(date)));
    results.forEach((result, index) => {
      const date = batch[index];
      if (result.status === "fulfilled") rowsByDate.set(date, result.value);
      else failures.push(`${date}: ${result.reason instanceof Error ? result.reason.message : String(result.reason)}`);
    });
  }

  if (rowsByDate.size === 0) {
    throw new Error(`NASDAQ earnings calendar를 불러오지 못했습니다. ${failures.join(" / ")}`);
  }
  return { rowsByDate, failures };
}

export async function buildFreshEarningsRiskSnapshot(): Promise<EarningsRiskSnapshot> {
  const [nasdaq100, sp500] = await Promise.all([
    loadMarketMapSnapshot("nasdaq100"),
    loadMarketMapSnapshot("sp500"),
  ]);
  if (!nasdaq100 || !sp500) {
    throw new Error("EARNINGS RISK 계산 전에 MARKET MAP 스냅샷이 필요합니다.");
  }

  const asOfDate = dateKeyInNewYork();
  const contexts = buildStockContexts(nasdaq100, sp500);
  const { rowsByDate, failures } = await fetchEarningsWindow(asOfDate);
  const events: EarningsRiskEvent[] = [];

  for (const [reportDate, rows] of rowsByDate.entries()) {
    for (const row of rows) {
      if (!row.symbol) continue;
      const symbol = normalizeSymbol(row.symbol);
      const context = contexts.get(symbol);
      if (!context) continue;
      const impactScore = calculateImpact(context);
      if (impactScore < 42) continue;
      const daysAway = daysBetween(asOfDate, reportDate);
      const session = normalizeSession(row.time);

      events.push({
        symbol: context.stock.displaySymbol,
        name: row.name?.trim() || context.stock.name,
        reportDate,
        daysAway,
        session: session.session,
        sessionLabel: session.label,
        confidence: "estimated",
        confidenceLabel: "ESTIMATED",
        fiscalQuarterEnding: row.fiscalQuarterEnding?.trim() || null,
        epsForecast: row.epsForecast?.trim() || null,
        marketCap: context.stock.marketCap,
        sector: context.stock.sector,
        impactScore,
        impactLabel: impactLabel(impactScore),
        riskLevel: riskLevel(daysAway, impactScore),
        indices: context.indices,
        sourceName: "Nasdaq Earnings Calendar / Zacks",
        sourceUrl: NASDAQ_EARNINGS_PAGE_URL,
      });
    }
  }

  const deduped = Array.from(
    new Map(events.map((event) => [`${event.reportDate}-${event.symbol}`, event])).values(),
  ).sort((a, b) => a.daysAway - b.daysAway || b.impactScore - a.impactScore);

  const snapshot: EarningsRiskSnapshot = {
    asOfDate,
    generatedAt: new Date().toISOString(),
    windowDays: WINDOW_DAYS,
    events: deduped,
    highRiskCount: deduped.filter((event) => event.riskLevel === "high").length,
    importantCount: deduped.filter((event) => event.riskLevel === "important").length,
    sourceNote:
      `NASDAQ Earnings Calendar의 향후 ${WINDOW_DAYS}일 일정을 MARKET MAP 시가총액과 결합한 경고용 레이더입니다. Nasdaq의 Earnings Date는 회사 확정 공지가 아닌 과거 보고 패턴 기반 Zacks 추정일 수 있어 V1에서는 자동 수집 일정에 ESTIMATED를 표시합니다.${failures.length > 0 ? ` 일부 날짜 수집 실패 ${failures.length}건.` : ""} 영향도 점수는 시가총액·지수 내 순위·시총 비중을 조합한 휴리스틱이며 방향 예측 확률이 아닙니다.`,
  };

  await saveEarningsRiskSnapshot(snapshot);
  return snapshot;
}

export async function getEarningsRiskSnapshot() {
  return loadEarningsRiskSnapshot();
}

export async function warmEarningsRiskRadar() {
  const snapshot = await buildFreshEarningsRiskSnapshot();
  return {
    asOfDate: snapshot.asOfDate,
    eventCount: snapshot.events.length,
    highRiskCount: snapshot.highRiskCount,
    importantCount: snapshot.importantCount,
  };
}
