import "server-only";

export type KoreaMarketQuote = {
  symbol: string;
  yahooSymbol: string;
  name: string;
  market: "KOSPI" | "KOSDAQ" | "INDEX" | "FX";
  date: string;
  current: number;
  previousClose: number | null;
  changePercent: number | null;
  volume: number | null;
  estimatedTurnover: number | null;
  percentile52w: number | null;
  high52w: number | null;
  distanceFromHigh52w: number | null;
  averageVolume20d: number | null;
  volumeRatio20d: number | null;
  trend20d: "up" | "down" | "flat" | "unknown";
  source: "Yahoo Finance";
};

export type KoreaMarketDashboard = {
  generatedAt: string;
  indices: KoreaMarketQuote[];
  fx: KoreaMarketQuote | null;
  stocks: KoreaMarketQuote[];
};

type YahooChartResponse = {
  chart?: {
    result?: Array<{
      meta?: {
        regularMarketPrice?: number;
        regularMarketTime?: number;
        previousClose?: number;
        chartPreviousClose?: number;
        exchangeTimezoneName?: string;
      };
      timestamp?: number[];
      indicators?: {
        quote?: Array<{
          close?: Array<number | null>;
          volume?: Array<number | null>;
        }>;
      };
    }>;
  };
};

type QuoteDefinition = {
  symbol: string;
  yahooSymbol: string;
  name: string;
  market: KoreaMarketQuote["market"];
};

const INDEX_DEFINITIONS: QuoteDefinition[] = [
  { symbol: "KOSPI", yahooSymbol: "^KS11", name: "코스피", market: "INDEX" },
  { symbol: "KOSDAQ", yahooSymbol: "^KQ11", name: "코스닥", market: "INDEX" },
];

const FX_DEFINITION: QuoteDefinition = {
  symbol: "USDKRW",
  yahooSymbol: "KRW=X",
  name: "원·달러 환율",
  market: "FX",
};

// 시장 전체 랭킹이 아니라 국내 투자자가 자주 확인하는 대표 종목 묶음이다.
const STOCK_DEFINITIONS: QuoteDefinition[] = [
  { symbol: "005930", yahooSymbol: "005930.KS", name: "삼성전자", market: "KOSPI" },
  { symbol: "000660", yahooSymbol: "000660.KS", name: "SK하이닉스", market: "KOSPI" },
  { symbol: "005380", yahooSymbol: "005380.KS", name: "현대차", market: "KOSPI" },
  { symbol: "035420", yahooSymbol: "035420.KS", name: "NAVER", market: "KOSPI" },
  { symbol: "105560", yahooSymbol: "105560.KS", name: "KB금융", market: "KOSPI" },
  { symbol: "207940", yahooSymbol: "207940.KS", name: "삼성바이오로직스", market: "KOSPI" },
  { symbol: "068270", yahooSymbol: "068270.KS", name: "셀트리온", market: "KOSPI" },
  { symbol: "012450", yahooSymbol: "012450.KS", name: "한화에어로스페이스", market: "KOSPI" },
  { symbol: "329180", yahooSymbol: "329180.KS", name: "HD현대중공업", market: "KOSPI" },
  { symbol: "196170", yahooSymbol: "196170.KQ", name: "알테오젠", market: "KOSDAQ" },
  { symbol: "247540", yahooSymbol: "247540.KQ", name: "에코프로비엠", market: "KOSDAQ" },
  { symbol: "086520", yahooSymbol: "086520.KQ", name: "에코프로", market: "KOSDAQ" },
];

function round(value: number, digits = 2): number {
  const factor = 10 ** digits;
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

function mean(values: number[]): number | null {
  if (values.length === 0) return null;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function percentileRank(current: number, values: number[]): number | null {
  if (values.length < 20) return null;
  const count = values.filter((value) => value <= current).length;
  return round((count / values.length) * 100, 1);
}

function percentChange(current: number, previous: number | null): number | null {
  if (previous === null || previous === 0) return null;
  return round(((current / previous) - 1) * 100, 2);
}

function dateFromUnix(seconds: number, timeZone = "Asia/Seoul"): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date(seconds * 1000));
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

async function fetchYahooHost(
  host: string,
  definition: QuoteDefinition,
): Promise<KoreaMarketQuote | null> {
  const url = `https://${host}/v8/finance/chart/${encodeURIComponent(
    definition.yahooSymbol,
  )}?range=1y&interval=1d&includePrePost=false&events=div%2Csplits`;

  try {
    const response = await fetch(url, {
      next: { revalidate: 300 },
      headers: {
        Accept: "application/json,text/plain;q=0.9,*/*;q=0.8",
        "User-Agent":
          "Mozilla/5.0 (compatible; HOHAENG-OS/1.0; +https://hohaeng.vercel.app)",
      },
      signal: AbortSignal.timeout(10_000),
    });

    if (!response.ok) return null;
    const payload = (await response.json()) as YahooChartResponse;
    const result = payload.chart?.result?.[0];
    const meta = result?.meta;
    if (!result || !meta) return null;

    const timestamps = result.timestamp ?? [];
    const closes = result.indicators?.quote?.[0]?.close ?? [];
    const volumes = result.indicators?.quote?.[0]?.volume ?? [];
    const timeZone = meta.exchangeTimezoneName || "Asia/Seoul";

    const rows = timestamps
      .map((timestamp, index) => {
        const close = closes[index];
        if (typeof close !== "number" || !Number.isFinite(close)) return null;
        const rawVolume = volumes[index];
        return {
          date: dateFromUnix(timestamp, timeZone),
          close,
          volume:
            typeof rawVolume === "number" && Number.isFinite(rawVolume)
              ? rawVolume
              : null,
        };
      })
      .filter(
        (row): row is { date: string; close: number; volume: number | null } =>
          row !== null,
      )
      .sort((left, right) => right.date.localeCompare(left.date));

    let current = meta.regularMarketPrice;
    let date =
      typeof meta.regularMarketTime === "number"
        ? dateFromUnix(meta.regularMarketTime, timeZone)
        : rows[0]?.date;

    if (typeof current !== "number" || !Number.isFinite(current)) {
      current = rows[0]?.close;
    }
    if (typeof current !== "number" || !Number.isFinite(current) || !date) {
      return null;
    }

    const previousRow = rows.find((row) => row.date < date);
    const metaPrevious = meta.previousClose ?? meta.chartPreviousClose;
    const previousClose =
      previousRow?.close ??
      (typeof metaPrevious === "number" && Number.isFinite(metaPrevious)
        ? metaPrevious
        : null);

    const currentRow = rows.find((row) => row.date === date) ?? rows[0];
    const currentVolume = currentRow?.volume ?? null;
    const historicalCloses = rows.map((row) => row.close).slice(0, 252);
    const statisticalValues = [current, ...historicalCloses]
      .filter((value, index, all) => index === all.findIndex((item) => item === value) || index === 0)
      .slice(0, 252);
    const high52w = statisticalValues.length > 0 ? Math.max(...statisticalValues) : null;
    const distanceFromHigh52w =
      high52w && high52w !== 0 ? round(((current / high52w) - 1) * 100, 2) : null;
    const percentile52w = percentileRank(current, statisticalValues);

    const recentVolumes = rows
      .map((row) => row.volume)
      .filter((value): value is number => typeof value === "number")
      .slice(0, 20);
    const averageVolume20d = mean(recentVolumes);
    const volumeRatio20d =
      currentVolume !== null && averageVolume20d && averageVolume20d > 0
        ? round(currentVolume / averageVolume20d, 2)
        : null;

    const recent20 = rows.map((row) => row.close).slice(0, 20);
    const average20 = mean(recent20);
    const trend20d =
      average20 === null
        ? "unknown"
        : current > average20 * 1.002
          ? "up"
          : current < average20 * 0.998
            ? "down"
            : "flat";

    return {
      ...definition,
      date,
      current: round(current, current >= 1000 ? 1 : 2),
      previousClose,
      changePercent: percentChange(current, previousClose),
      volume: currentVolume,
      estimatedTurnover:
        currentVolume !== null ? Math.round(current * currentVolume) : null,
      percentile52w,
      high52w,
      distanceFromHigh52w,
      averageVolume20d,
      volumeRatio20d,
      trend20d,
      source: "Yahoo Finance",
    };
  } catch {
    return null;
  }
}

async function fetchQuote(definition: QuoteDefinition): Promise<KoreaMarketQuote | null> {
  const primary = await fetchYahooHost("query1.finance.yahoo.com", definition);
  if (primary) return primary;
  return fetchYahooHost("query2.finance.yahoo.com", definition);
}

export async function getKoreaMarketDashboard(): Promise<KoreaMarketDashboard> {
  const [indexResults, fx, stockResults] = await Promise.all([
    Promise.all(INDEX_DEFINITIONS.map(fetchQuote)),
    fetchQuote(FX_DEFINITION),
    Promise.all(STOCK_DEFINITIONS.map(fetchQuote)),
  ]);

  return {
    generatedAt: new Date().toISOString(),
    indices: indexResults.filter((item): item is KoreaMarketQuote => item !== null),
    fx,
    stocks: stockResults.filter((item): item is KoreaMarketQuote => item !== null),
  };
}
