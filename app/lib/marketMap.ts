import "server-only";

import { loadMarketMapSnapshot, saveMarketMapSnapshot } from "@/app/lib/marketMapSnapshotStore";
import { getUsMarketCloseDashboard } from "@/app/lib/usMarketClose";
import type {
  MarketMapIndexKey,
  MarketMapSector,
  MarketMapSnapshot,
  MarketMapStock,
} from "@/app/lib/marketMapTypes";

export type { MarketMapIndexKey, MarketMapSector, MarketMapSnapshot, MarketMapStock } from "@/app/lib/marketMapTypes";

type MembershipRow = {
  symbol: string;
  name: string;
  fallbackSector: string;
};

type NasdaqScreenerRow = {
  symbol?: string;
  name?: string;
  lastsale?: string;
  pctchange?: string;
  marketCap?: string;
  volume?: string;
  sector?: string;
  industry?: string;
};

type NasdaqScreenerTable = {
  rows?: NasdaqScreenerRow[];
  totalrecords?: number | string;
  totalRecords?: number | string;
};

type NasdaqScreenerResponse = {
  data?: {
    rows?: NasdaqScreenerRow[];
    table?: NasdaqScreenerTable;
    totalrecords?: number | string;
    totalRecords?: number | string;
  };
};

type NasdaqPage = {
  rows: NasdaqScreenerRow[];
  total: number | null;
};

type GetSnapshotOptions = {
  forceRefresh?: boolean;
};

const NASDAQ_100_URL =
  "https://raw.githubusercontent.com/Gary-Strauss/NASDAQ100_Constituents/master/data/nasdaq100_constituents.csv";
const SP500_URL =
  "https://raw.githubusercontent.com/datasets/s-and-p-500-companies/main/data/constituents.csv";
const NASDAQ_SCREENER_BASE_URL = "https://api.nasdaq.com/api/screener/stocks";

const MEMBERSHIP_CACHE_SECONDS = 60 * 60 * 24 * 7;
const MEMBERSHIP_TIMEOUT_MS = 25_000;
const MARKET_PAGE_SIZE = 1_000;
const MARKET_MAX_PAGES = 10;
const MARKET_PAGE_CONCURRENCY = 3;
const MARKET_FETCH_TIMEOUT_MS = 15_000;
const MARKET_FETCH_ATTEMPTS = 2;
const RETRY_DELAY_MS = 900;

function round(value: number, digits = 2) {
  const factor = 10 ** digits;
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function parseCsvLine(line: string) {
  const values: string[] = [];
  let current = "";
  let quoted = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    if (char === '"') {
      if (quoted && line[index + 1] === '"') {
        current += '"';
        index += 1;
      } else {
        quoted = !quoted;
      }
      continue;
    }
    if (char === "," && !quoted) {
      values.push(current.trim());
      current = "";
      continue;
    }
    current += char;
  }
  values.push(current.trim());
  return values;
}

function normalizeSymbol(value: string) {
  return value.trim().toUpperCase().replaceAll(".", "/");
}

function displaySymbol(value: string) {
  return value.replaceAll("/", ".");
}

function parseNumeric(value: string | undefined): number | null {
  if (!value) return null;
  const parsed = Number(value.replaceAll(",", "").replaceAll("$", "").replaceAll("%", "").trim());
  return Number.isFinite(parsed) ? parsed : null;
}

function parseCount(value: number | string | undefined): number | null {
  if (value === undefined) return null;
  const parsed = typeof value === "number" ? value : Number(value.replaceAll(",", "").trim());
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

function normalizeSector(value: string | undefined, fallback: string) {
  const raw = (value || fallback || "Other").trim();
  const lowered = raw.toLowerCase();

  if (lowered === "finance" || lowered === "financials") return "Financials";
  if (lowered.includes("technology") || lowered === "computer software" || lowered === "semiconductors") {
    return "Technology";
  }
  if (lowered.includes("health")) return "Health Care";
  if (lowered.includes("consumer discretionary")) return "Consumer Discretionary";
  if (lowered.includes("consumer staples")) return "Consumer Staples";
  if (lowered.includes("industrial")) return "Industrials";
  if (lowered.includes("energy")) return "Energy";
  if (lowered.includes("utilit") || lowered.includes("power generation") || lowered.includes("electric utilities")) {
    return "Utilities";
  }
  if (lowered.includes("real estate")) return "Real Estate";
  if (lowered.includes("material") || lowered.includes("chemical")) return "Materials";
  if (lowered.includes("communication") || lowered.includes("telecommunication")) {
    return "Communication Services";
  }

  const known = [
    "Technology",
    "Health Care",
    "Consumer Discretionary",
    "Consumer Staples",
    "Industrials",
    "Energy",
    "Utilities",
    "Real Estate",
    "Materials",
    "Communication Services",
    "Financials",
  ];
  const exact = known.find((item) => item.toLowerCase() === lowered);
  return exact ?? (raw.length <= 30 ? raw : "Other");
}

function newYorkDateKey() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const map = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${map.year}-${map.month}-${map.day}`;
}

async function fetchText(url: string, revalidate: number) {
  const response = await fetch(url, {
    next: { revalidate },
    headers: {
      Accept: "text/plain,text/csv;q=0.9,*/*;q=0.8",
      "User-Agent": "Mozilla/5.0 (compatible; HOHAENG-OS/1.0; +https://hohaeng.vercel.app)",
    },
    signal: AbortSignal.timeout(MEMBERSHIP_TIMEOUT_MS),
  });
  if (!response.ok) throw new Error(`구성종목 데이터를 불러오지 못했습니다. (${response.status})`);
  return response.text();
}

async function fetchMembership(indexKey: MarketMapIndexKey): Promise<MembershipRow[]> {
  const url = indexKey === "nasdaq100" ? NASDAQ_100_URL : SP500_URL;
  const csv = await fetchText(url, MEMBERSHIP_CACHE_SECONDS);
  const lines = csv.split(/\r?\n/).filter(Boolean);
  if (lines.length < 2) return [];

  const header = parseCsvLine(lines[0]);
  const symbolKey = indexKey === "nasdaq100" ? "Ticker" : "Symbol";
  const nameKey = indexKey === "nasdaq100" ? "Company" : "Security";
  const sectorKey = indexKey === "nasdaq100" ? "GICS_Sector" : "GICS Sector";
  const symbolIndex = header.indexOf(symbolKey);
  const nameIndex = header.indexOf(nameKey);
  const sectorIndex = header.indexOf(sectorKey);

  return lines.slice(1).map((line) => {
    const columns = parseCsvLine(line);
    return {
      symbol: normalizeSymbol(columns[symbolIndex] || ""),
      name: columns[nameIndex] || columns[symbolIndex] || "",
      fallbackSector: sectorIndex >= 0 ? columns[sectorIndex] || "" : "",
    };
  }).filter((item) => item.symbol);
}

function extractNasdaqPage(payload: NasdaqScreenerResponse): NasdaqPage {
  const data = payload.data;
  const rows = data?.rows ?? data?.table?.rows ?? [];
  const total =
    parseCount(data?.totalrecords) ??
    parseCount(data?.totalRecords) ??
    parseCount(data?.table?.totalrecords) ??
    parseCount(data?.table?.totalRecords);
  return { rows, total };
}

async function fetchNasdaqPage(offset: number): Promise<NasdaqPage> {
  let lastError: unknown = null;
  const sessionKey = newYorkDateKey();

  for (let attempt = 1; attempt <= MARKET_FETCH_ATTEMPTS; attempt += 1) {
    try {
      const params = new URLSearchParams({
        tableonly: "true",
        limit: String(MARKET_PAGE_SIZE),
        offset: String(offset),
        hohaeng_session: sessionKey,
        hohaeng_attempt: String(attempt),
      });
      const response = await fetch(`${NASDAQ_SCREENER_BASE_URL}?${params.toString()}`, {
        cache: "no-store",
        headers: {
          Accept: "application/json,text/plain,*/*",
          "Accept-Language": "en-US,en;q=0.9",
          Origin: "https://www.nasdaq.com",
          Referer: "https://www.nasdaq.com/market-activity/stocks/screener",
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36",
        },
        signal: AbortSignal.timeout(MARKET_FETCH_TIMEOUT_MS),
      });

      if (!response.ok) throw new Error(`NASDAQ 페이지 응답 오류 (${response.status}, offset ${offset})`);
      const page = extractNasdaqPage((await response.json()) as NasdaqScreenerResponse);
      if (page.rows.length === 0 && offset === 0) {
        throw new Error("NASDAQ 첫 페이지가 비어 있습니다.");
      }
      return page;
    } catch (error) {
      lastError = error;
      if (attempt < MARKET_FETCH_ATTEMPTS) {
        await sleep(RETRY_DELAY_MS * attempt);
      }
    }
  }

  const detail = lastError instanceof Error ? lastError.message : String(lastError ?? "알 수 없는 오류");
  throw new Error(detail);
}

async function fetchNasdaqScreenerRows(): Promise<NasdaqScreenerRow[]> {
  const firstPage = await fetchNasdaqPage(0);
  const totalPages = firstPage.total
    ? Math.min(MARKET_MAX_PAGES, Math.max(1, Math.ceil(firstPage.total / MARKET_PAGE_SIZE)))
    : MARKET_MAX_PAGES;

  const collected = [...firstPage.rows];
  const failures: string[] = [];
  let shouldStop = firstPage.rows.length < MARKET_PAGE_SIZE;

  for (let page = 1; page < totalPages && !shouldStop; page += MARKET_PAGE_CONCURRENCY) {
    const offsets = Array.from(
      { length: Math.min(MARKET_PAGE_CONCURRENCY, totalPages - page) },
      (_, index) => (page + index) * MARKET_PAGE_SIZE,
    );
    const results = await Promise.allSettled(offsets.map((offset) => fetchNasdaqPage(offset)));

    results.forEach((result, index) => {
      const offset = offsets[index];
      if (result.status === "fulfilled") {
        collected.push(...result.value.rows);
        if (!firstPage.total && result.value.rows.length < MARKET_PAGE_SIZE) shouldStop = true;
      } else {
        const message = result.reason instanceof Error ? result.reason.message : String(result.reason);
        failures.push(`offset ${offset}: ${message}`);
      }
    });
  }

  const bySymbol = new Map<string, NasdaqScreenerRow>();
  for (const row of collected) {
    if (!row.symbol) continue;
    bySymbol.set(normalizeSymbol(row.symbol), row);
  }
  const rows = Array.from(bySymbol.values());

  if (rows.length < 500) {
    const failureNote = failures.length > 0 ? ` 실패 페이지: ${failures.join(" / ")}` : "";
    throw new Error(`NASDAQ MARKET MAP 원본 데이터가 부족합니다. (${rows.length}개).${failureNote}`);
  }

  if (failures.length > 0) {
    console.warn("NASDAQ MARKET MAP 일부 페이지 재시도 후 누락:", failures);
  }
  return rows;
}

function sectorSummary(stocks: MarketMapStock[]): MarketMapSector[] {
  const groups = new Map<string, MarketMapStock[]>();
  for (const stock of stocks) {
    const list = groups.get(stock.sector) ?? [];
    list.push(stock);
    groups.set(stock.sector, list);
  }

  return Array.from(groups.entries()).map(([name, members]) => {
    const marketCap = members.reduce((sum, item) => sum + item.marketCap, 0);
    const weightedChange = marketCap > 0
      ? members.reduce((sum, item) => sum + item.changePercent * item.marketCap, 0) / marketCap
      : members.reduce((sum, item) => sum + item.changePercent, 0) / Math.max(1, members.length);
    return {
      name,
      stockCount: members.length,
      marketCap,
      weightedChange: round(weightedChange, 2),
      advancers: members.filter((item) => item.changePercent > 0.01).length,
      decliners: members.filter((item) => item.changePercent < -0.01).length,
    };
  }).sort((a, b) => b.marketCap - a.marketCap);
}

async function latestMarketDate() {
  try {
    const dashboard = await getUsMarketCloseDashboard();
    return dashboard.cash.map((item) => item.date).sort((a, b) => b.localeCompare(a))[0] ?? null;
  } catch {
    return null;
  }
}

function buildSnapshot(
  indexKey: MarketMapIndexKey,
  membership: MembershipRow[],
  screenerRows: NasdaqScreenerRow[],
  marketDate: string | null,
): MarketMapSnapshot {
  const screenerMap = new Map(
    screenerRows
      .filter((row) => row.symbol)
      .map((row) => [normalizeSymbol(row.symbol || ""), row]),
  );

  const stocks = membership.map((member) => {
    const quote = screenerMap.get(member.symbol);
    if (!quote) return null;
    const changePercent = parseNumeric(quote.pctchange) ?? 0;
    const marketCap = parseNumeric(quote.marketCap) ?? 0;
    return {
      symbol: member.symbol,
      displaySymbol: displaySymbol(member.symbol),
      name: member.name || quote.name || member.symbol,
      sector: normalizeSector(quote.sector, member.fallbackSector),
      industry: quote.industry?.trim() || member.fallbackSector || "—",
      price: parseNumeric(quote.lastsale),
      changePercent: round(changePercent, 3),
      marketCap: Math.max(1, marketCap),
      volume: parseNumeric(quote.volume),
    } satisfies MarketMapStock;
  }).filter((item): item is MarketMapStock => item !== null)
    .sort((a, b) => b.marketCap - a.marketCap);

  const totalMarketCap = stocks.reduce((sum, item) => sum + item.marketCap, 0);
  const advancers = stocks.filter((item) => item.changePercent > 0.01).length;
  const decliners = stocks.filter((item) => item.changePercent < -0.01).length;
  const unchanged = Math.max(0, stocks.length - advancers - decliners);
  const advanceRatio = stocks.length > 0 ? (advancers / stocks.length) * 100 : 0;
  const advanceMarketCap = stocks
    .filter((item) => item.changePercent > 0.01)
    .reduce((sum, item) => sum + item.marketCap, 0);
  const weightedChange = totalMarketCap > 0
    ? stocks.reduce((sum, item) => sum + item.changePercent * item.marketCap, 0) / totalMarketCap
    : 0;
  const sectors = sectorSummary(stocks);
  const byPerformance = [...sectors].sort((a, b) => b.weightedChange - a.weightedChange);

  return {
    indexKey,
    indexName: indexKey === "nasdaq100" ? "NASDAQ 100" : "S&P 500",
    marketDate,
    generatedAt: new Date().toISOString(),
    stocks,
    sectors,
    totalCount: stocks.length,
    advancers,
    decliners,
    unchanged,
    advanceRatio: round(advanceRatio, 1),
    advanceMarketCapShare: totalMarketCap > 0 ? round((advanceMarketCap / totalMarketCap) * 100, 1) : 0,
    marketCapWeightedChange: round(weightedChange, 2),
    breadthLabel: advanceRatio >= 65 ? "강한 확산" : advanceRatio <= 35 ? "약한 확산" : "중립",
    strongestSector: byPerformance[0] ?? null,
    weakestSector: byPerformance.at(-1) ?? null,
    sourceNote:
      "구성종목은 공개 구성자료, 종가·등락률·시가총액·섹터는 NASDAQ Stock Screener의 장마감 데이터를 페이지 단위로 수집합니다. 공개 화면은 저장된 완성 스냅샷만 읽으며, 시총가중 평균은 실제 지수 수익률과 다를 수 있습니다.",
  };
}

async function buildFreshMarketMapSnapshot(indexKey: MarketMapIndexKey): Promise<MarketMapSnapshot> {
  const [membership, screenerRows, marketDate] = await Promise.all([
    fetchMembership(indexKey),
    fetchNasdaqScreenerRows(),
    latestMarketDate(),
  ]);
  return buildSnapshot(indexKey, membership, screenerRows, marketDate);
}

export async function getMarketMapSnapshot(
  indexKey: MarketMapIndexKey,
  options: GetSnapshotOptions = {},
): Promise<MarketMapSnapshot> {
  if (!options.forceRefresh) {
    const stored = await loadMarketMapSnapshot(indexKey);
    if (stored) return stored;
  }

  const snapshot = await buildFreshMarketMapSnapshot(indexKey);
  try {
    await saveMarketMapSnapshot(snapshot);
  } catch (error) {
    console.warn(`MARKET MAP ${indexKey} 스냅샷 저장 실패:`, error);
  }
  return snapshot;
}

export async function warmMarketMapCache() {
  const [nasdaqMembership, sp500Membership, screenerRows, marketDate] = await Promise.all([
    fetchMembership("nasdaq100"),
    fetchMembership("sp500"),
    fetchNasdaqScreenerRows(),
    latestMarketDate(),
  ]);

  const nasdaq100 = buildSnapshot("nasdaq100", nasdaqMembership, screenerRows, marketDate);
  const sp500 = buildSnapshot("sp500", sp500Membership, screenerRows, marketDate);

  if (nasdaq100.totalCount < 80) {
    throw new Error(`NASDAQ100 MARKET MAP 종목 수가 부족합니다. (${nasdaq100.totalCount}개)`);
  }
  if (sp500.totalCount < 400) {
    throw new Error(`S&P500 MARKET MAP 종목 수가 부족합니다. (${sp500.totalCount}개)`);
  }

  const [nasdaqStorage, sp500Storage] = await Promise.all([
    saveMarketMapSnapshot(nasdaq100),
    saveMarketMapSnapshot(sp500),
  ]);

  return {
    nasdaq100Count: nasdaq100.totalCount,
    sp500Count: sp500.totalCount,
    marketDate: nasdaq100.marketDate ?? sp500.marketDate,
    nasdaqStorage: nasdaqStorage.storage,
    sp500Storage: sp500Storage.storage,
  };
}
