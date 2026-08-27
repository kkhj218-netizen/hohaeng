import "server-only";

import { getUsMarketCloseDashboard } from "@/app/lib/usMarketClose";

export type MarketMapIndexKey = "nasdaq100" | "sp500";

export type MarketMapStock = {
  symbol: string;
  displaySymbol: string;
  name: string;
  sector: string;
  industry: string;
  price: number | null;
  changePercent: number;
  marketCap: number;
  volume: number | null;
};

export type MarketMapSector = {
  name: string;
  stockCount: number;
  marketCap: number;
  weightedChange: number;
  advancers: number;
  decliners: number;
};

export type MarketMapSnapshot = {
  indexKey: MarketMapIndexKey;
  indexName: string;
  marketDate: string | null;
  generatedAt: string;
  stocks: MarketMapStock[];
  sectors: MarketMapSector[];
  totalCount: number;
  advancers: number;
  decliners: number;
  unchanged: number;
  advanceRatio: number;
  advanceMarketCapShare: number;
  marketCapWeightedChange: number;
  breadthLabel: "강한 확산" | "중립" | "약한 확산";
  strongestSector: MarketMapSector | null;
  weakestSector: MarketMapSector | null;
  sourceNote: string;
};

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

type NasdaqScreenerResponse = {
  data?: {
    rows?: NasdaqScreenerRow[];
  };
};

const NASDAQ_100_URL =
  "https://raw.githubusercontent.com/Gary-Strauss/NASDAQ100_Constituents/master/data/nasdaq100_constituents.csv";
const SP500_URL =
  "https://raw.githubusercontent.com/datasets/s-and-p-500-companies/main/data/constituents.csv";
const NASDAQ_SCREENER_URL =
  "https://api.nasdaq.com/api/screener/stocks?tableonly=true&limit=25&offset=0&download=true";

const MEMBERSHIP_CACHE_SECONDS = 60 * 60 * 24 * 7;
const MARKET_CACHE_SECONDS = 90_000;
const FETCH_TIMEOUT_MS = 20_000;

function round(value: number, digits = 2) {
  const factor = 10 ** digits;
  return Math.round((value + Number.EPSILON) * factor) / factor;
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
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
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

async function fetchNasdaqScreenerRows(): Promise<NasdaqScreenerRow[]> {
  // 뉴욕 날짜를 캐시 키에 포함해, 매일 새 스냅샷이 만들어지도록 한다.
  // 05:30 UTC cron이 미국장 개장 전에 이 캐시를 미리 채운다.
  const sessionKey = newYorkDateKey();
  const url = `${NASDAQ_SCREENER_URL}&hohaeng_session=${encodeURIComponent(sessionKey)}`;
  const response = await fetch(url, {
    next: { revalidate: MARKET_CACHE_SECONDS },
    headers: {
      Accept: "application/json,text/plain;q=0.9,*/*;q=0.8",
      "User-Agent": "Mozilla/5.0 (compatible; HOHAENG-OS/1.0; +https://hohaeng.vercel.app)",
      Referer: "https://www.nasdaq.com/market-activity/stocks/screener",
    },
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });
  if (!response.ok) throw new Error(`NASDAQ 종가 스냅샷을 불러오지 못했습니다. (${response.status})`);
  const payload = (await response.json()) as NasdaqScreenerResponse;
  return payload.data?.rows ?? [];
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

export async function getMarketMapSnapshot(indexKey: MarketMapIndexKey): Promise<MarketMapSnapshot> {
  const [membership, screenerRows, marketDate] = await Promise.all([
    fetchMembership(indexKey),
    fetchNasdaqScreenerRows(),
    latestMarketDate(),
  ]);

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
      "구성종목은 공개 구성자료, 종가·등락률·시가총액·섹터는 NASDAQ Stock Screener의 최근 스냅샷을 사용합니다. 시총가중 평균은 실제 지수 수익률과 다를 수 있습니다.",
  };
}

export async function warmMarketMapCache() {
  const [nasdaq100, sp500] = await Promise.all([
    getMarketMapSnapshot("nasdaq100"),
    getMarketMapSnapshot("sp500"),
  ]);
  return {
    nasdaq100Count: nasdaq100.totalCount,
    sp500Count: sp500.totalCount,
    marketDate: nasdaq100.marketDate ?? sp500.marketDate,
  };
}
