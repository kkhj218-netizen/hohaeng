import "server-only";

import { unstable_cache } from "next/cache";

export type DisclosureMarket = "KR" | "US";
export type DisclosureCategory =
  | "earnings"
  | "major"
  | "capital"
  | "mna"
  | "shareholder"
  | "ownership"
  | "proxy"
  | "other";

export type DisclosureItem = {
  id: string;
  market: DisclosureMarket;
  exchange: string;
  ticker: string | null;
  company: string;
  category: DisclosureCategory;
  importance: number;
  title: string;
  form: string;
  filingDate: string;
  source: "DART" | "SEC";
  sourceUrl: string;
  detailUrl: string | null;
  sourceId: string;
  amendment: boolean;
  structuredEarnings: boolean;
};

export type DisclosureSourceFeed = {
  configured: boolean;
  sourceDate: string | null;
  items: DisclosureItem[];
  error: string | null;
};

export type DisclosureDailyFeed = {
  generatedAt: string;
  korea: DisclosureSourceFeed;
  us: DisclosureSourceFeed;
};

export const DISCLOSURE_CATEGORY_LABELS: Record<DisclosureCategory, string> = {
  earnings: "실적·정기보고서",
  major: "주요 공시",
  capital: "자금조달",
  mna: "M&A·사업재편",
  shareholder: "주주환원",
  ownership: "지분·최대주주",
  proxy: "주주총회",
  other: "기타",
};

const SEC_USER_AGENT =
  process.env.SEC_USER_AGENT ?? "HOHAENG-OS/1.0 (+https://hohaeng.vercel.app)";
const SOURCE_FETCH_TIMEOUT_MS = 12_000;
const FEED_CACHE_SECONDS = 6 * 60 * 60;
const TICKER_CACHE_SECONDS = 7 * 24 * 60 * 60;

function dateInTimeZone(timeZone: string, value = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(value);
  const map = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${map.year}-${map.month}-${map.day}`;
}

function shiftDate(value: string, days: number): string {
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day + days, 12));
  return date.toISOString().slice(0, 10);
}

function compactDate(value: string): string {
  return value.replaceAll("-", "");
}

function safeNumber(value: unknown, fallback = 0): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function normalizeForm(form: string): string {
  return form.trim().toUpperCase().replace(/\/A$/, "");
}

function secCategory(form: string): {
  category: DisclosureCategory;
  importance: number;
  structuredEarnings: boolean;
} | null {
  const normalized = normalizeForm(form);

  if (["10-Q", "10-K", "20-F", "40-F"].includes(normalized)) {
    return { category: "earnings", importance: 100, structuredEarnings: true };
  }
  if (["8-K", "6-K"].includes(normalized)) {
    return { category: "major", importance: 85, structuredEarnings: false };
  }
  if (["S-1", "S-3", "F-1", "F-3", "424B3", "424B5"].includes(normalized)) {
    return { category: "capital", importance: 90, structuredEarnings: false };
  }
  if (
    ["SC 13D", "SC 13G", "SCHEDULE 13D", "SCHEDULE 13G"].some((item) =>
      normalized.startsWith(item),
    )
  ) {
    return { category: "ownership", importance: 78, structuredEarnings: false };
  }
  if (normalized === "DEF 14A") {
    return { category: "proxy", importance: 60, structuredEarnings: false };
  }

  return null;
}

function koreaCategory(reportName: string): {
  category: DisclosureCategory;
  importance: number;
} {
  const name = reportName.replaceAll(" ", "");

  if (
    name.includes("영업(잠정)실적") ||
    name.includes("매출액또는손익구조") ||
    name.includes("분기보고서") ||
    name.includes("반기보고서") ||
    name.includes("사업보고서")
  ) {
    return {
      category: "earnings",
      importance:
        name.includes("영업(잠정)실적") || name.includes("매출액또는손익구조") ? 100 : 78,
    };
  }
  if (name.includes("단일판매") || name.includes("공급계약")) {
    return { category: "major", importance: 96 };
  }
  if (
    name.includes("유상증자") ||
    name.includes("무상증자") ||
    name.includes("전환사채") ||
    name.includes("신주인수권") ||
    name.includes("교환사채") ||
    name.includes("증권신고서")
  ) {
    return { category: "capital", importance: 92 };
  }
  if (
    name.includes("합병") ||
    name.includes("분할") ||
    name.includes("영업양수") ||
    name.includes("영업양도") ||
    name.includes("타법인주식") ||
    name.includes("회사분할")
  ) {
    return { category: "mna", importance: 90 };
  }
  if (name.includes("자기주식") || name.includes("배당")) {
    return { category: "shareholder", importance: 88 };
  }
  if (
    name.includes("최대주주") ||
    name.includes("주식등의대량보유") ||
    name.includes("임원ㆍ주요주주") ||
    name.includes("임원·주요주주")
  ) {
    return { category: "ownership", importance: 82 };
  }
  if (name.includes("주주총회")) {
    return { category: "proxy", importance: 62 };
  }
  if (name.includes("주요사항보고서") || name.includes("조회공시") || name.includes("공정공시")) {
    return { category: "major", importance: 72 };
  }

  return { category: "other", importance: 35 };
}

type SecTickerEntry = {
  cik_str?: number;
  ticker?: string;
  title?: string;
};

type SecTickerPayload = Record<string, SecTickerEntry>;

type SecTickerInfo = {
  ticker: string;
  title: string;
};

const loadSecTickerMap = unstable_cache(
  async (): Promise<Record<string, SecTickerInfo>> => {
    const response = await fetch("https://www.sec.gov/files/company_tickers.json", {
      cache: "no-store",
      headers: {
        Accept: "application/json",
        "User-Agent": SEC_USER_AGENT,
      },
      signal: AbortSignal.timeout(SOURCE_FETCH_TIMEOUT_MS),
    });

    if (!response.ok) {
      throw new Error(`SEC ticker map 요청 실패 (${response.status})`);
    }

    const payload = (await response.json()) as SecTickerPayload;
    const map: Record<string, SecTickerInfo> = {};

    for (const entry of Object.values(payload)) {
      const cik = safeNumber(entry.cik_str, -1);
      const ticker = entry.ticker?.trim();
      if (cik < 0 || !ticker) continue;
      const key = String(cik);
      if (!map[key]) {
        map[key] = {
          ticker,
          title: entry.title?.trim() || ticker,
        };
      }
    }

    return map;
  },
  ["hohaeng-sec-ticker-map-v1"],
  { revalidate: TICKER_CACHE_SECONDS },
);

async function fetchSecDailyIndex(date: string): Promise<DisclosureItem[] | null> {
  const year = Number(date.slice(0, 4));
  const month = Number(date.slice(5, 7));
  const quarter = Math.floor((month - 1) / 3) + 1;
  const url = `https://www.sec.gov/Archives/edgar/daily-index/${year}/QTR${quarter}/master.${compactDate(date)}.idx`;

  const response = await fetch(url, {
    cache: "no-store",
    headers: {
      Accept: "text/plain,*/*;q=0.8",
      "User-Agent": SEC_USER_AGENT,
    },
    signal: AbortSignal.timeout(SOURCE_FETCH_TIMEOUT_MS),
  });

  if (response.status === 404) return null;
  if (!response.ok) {
    throw new Error(`SEC daily index 요청 실패 (${response.status})`);
  }

  const [text, tickers] = await Promise.all([response.text(), loadSecTickerMap()]);
  const items: DisclosureItem[] = [];

  for (const line of text.split(/\r?\n/)) {
    if (!line.includes("|")) continue;
    const [cikRaw, companyRaw, formRaw, filingDateRaw, filenameRaw] = line.split("|");
    if (!cikRaw || !companyRaw || !formRaw || !filingDateRaw || !filenameRaw) continue;

    const cik = String(safeNumber(cikRaw.trim(), -1));
    if (cik === "-1") continue;
    const tickerInfo = tickers[cik];
    if (!tickerInfo) continue;

    const classification = secCategory(formRaw);
    if (!classification) continue;

    const filename = filenameRaw.trim();
    const accession = filename.split("/").pop()?.replace(/\.txt$/i, "") ?? "";
    if (!accession) continue;

    const form = formRaw.trim().toUpperCase();
    items.push({
      id: `SEC-${accession}`,
      market: "US",
      exchange: "US",
      ticker: tickerInfo.ticker,
      company: tickerInfo.title || companyRaw.trim(),
      category: classification.category,
      importance: classification.importance,
      title: form,
      form,
      filingDate: filingDateRaw.trim(),
      source: "SEC",
      sourceUrl: `https://www.sec.gov/Archives/${filename}`,
      detailUrl: `/data/disclosures/us/${encodeURIComponent(cik)}/${encodeURIComponent(accession)}`,
      sourceId: accession,
      amendment: /\/A$/i.test(formRaw.trim()),
      structuredEarnings: classification.structuredEarnings,
    });
  }

  return items.sort((left, right) => {
    if (right.importance !== left.importance) return right.importance - left.importance;
    return left.company.localeCompare(right.company, "en");
  });
}

async function buildUsFeed(targetDate: string): Promise<DisclosureSourceFeed> {
  try {
    for (let offset = 0; offset <= 7; offset += 1) {
      const date = shiftDate(targetDate, -offset);
      const items = await fetchSecDailyIndex(date);
      if (items === null) continue;
      if (items.length === 0) continue;
      return {
        configured: true,
        sourceDate: date,
        items,
        error: null,
      };
    }

    return {
      configured: true,
      sourceDate: null,
      items: [],
      error: "최근 SEC 거래일 공시를 찾지 못했습니다.",
    };
  } catch (error) {
    return {
      configured: true,
      sourceDate: null,
      items: [],
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

type DartListItem = {
  corp_cls?: string;
  corp_name?: string;
  corp_code?: string;
  stock_code?: string;
  report_nm?: string;
  rcept_no?: string;
  rcept_dt?: string;
};

type DartListResponse = {
  status?: string;
  message?: string;
  page_no?: number | string;
  total_page?: number | string;
  list?: DartListItem[];
};

async function fetchDartPage(
  apiKey: string,
  date: string,
  corpClass: "Y" | "K",
  pageNo: number,
): Promise<DartListResponse> {
  const params = new URLSearchParams({
    crtfc_key: apiKey,
    bgn_de: compactDate(date),
    end_de: compactDate(date),
    corp_cls: corpClass,
    page_no: String(pageNo),
    page_count: "100",
    sort: "date",
    sort_mth: "desc",
  });

  const response = await fetch(`https://opendart.fss.or.kr/api/list.json?${params}`, {
    cache: "no-store",
    signal: AbortSignal.timeout(SOURCE_FETCH_TIMEOUT_MS),
  });

  if (!response.ok) {
    throw new Error(`OpenDART 요청 실패 (${response.status})`);
  }

  return (await response.json()) as DartListResponse;
}

function dartItemToDisclosure(item: DartListItem): DisclosureItem | null {
  const receiptNo = item.rcept_no?.trim();
  const reportName = item.report_nm?.trim();
  const corpName = item.corp_name?.trim();
  if (!receiptNo || !reportName || !corpName) return null;

  const classification = koreaCategory(reportName);
  const market = item.corp_cls === "Y" ? "KOSPI" : item.corp_cls === "K" ? "KOSDAQ" : "KR";

  return {
    id: `DART-${receiptNo}`,
    market: "KR",
    exchange: market,
    ticker: item.stock_code?.trim() || null,
    company: corpName,
    category: classification.category,
    importance: classification.importance,
    title: reportName,
    form: reportName,
    filingDate: item.rcept_dt?.trim()
      ? `${item.rcept_dt?.slice(0, 4)}-${item.rcept_dt?.slice(4, 6)}-${item.rcept_dt?.slice(6, 8)}`
      : "",
    source: "DART",
    sourceUrl: `https://dart.fss.or.kr/dsaf001/main.do?rcpNo=${encodeURIComponent(receiptNo)}`,
    detailUrl: null,
    sourceId: receiptNo,
    amendment: /정정|첨부정정|기재정정/.test(reportName),
    structuredEarnings: classification.category === "earnings",
  };
}

async function fetchDartMarketDay(
  apiKey: string,
  date: string,
  corpClass: "Y" | "K",
): Promise<{ items: DisclosureItem[]; noData: boolean }> {
  const first = await fetchDartPage(apiKey, date, corpClass, 1);
  if (first.status === "013") return { items: [], noData: true };
  if (first.status && first.status !== "000") {
    throw new Error(first.message || `OpenDART 상태 ${first.status}`);
  }

  const totalPages = Math.min(Math.max(1, safeNumber(first.total_page, 1)), 30);
  const pages: DartListResponse[] = [first];

  for (let pageNo = 2; pageNo <= totalPages; pageNo += 1) {
    const page = await fetchDartPage(apiKey, date, corpClass, pageNo);
    if (page.status && page.status !== "000" && page.status !== "013") {
      throw new Error(page.message || `OpenDART 상태 ${page.status}`);
    }
    pages.push(page);
  }

  const items = pages
    .flatMap((page) => page.list ?? [])
    .map(dartItemToDisclosure)
    .filter((item): item is DisclosureItem => item !== null);

  return { items, noData: items.length === 0 };
}

async function buildKoreaFeed(targetDate: string): Promise<DisclosureSourceFeed> {
  const apiKey = process.env.DART_API_KEY;
  if (!apiKey) {
    return {
      configured: false,
      sourceDate: null,
      items: [],
      error: null,
    };
  }

  try {
    for (let offset = 0; offset <= 7; offset += 1) {
      const date = shiftDate(targetDate, -offset);
      const [kospi, kosdaq] = await Promise.all([
        fetchDartMarketDay(apiKey, date, "Y"),
        fetchDartMarketDay(apiKey, date, "K"),
      ]);

      if (kospi.noData && kosdaq.noData) continue;

      const items = [...kospi.items, ...kosdaq.items].sort((left, right) => {
        if (right.importance !== left.importance) return right.importance - left.importance;
        return left.company.localeCompare(right.company, "ko");
      });

      return {
        configured: true,
        sourceDate: date,
        items,
        error: null,
      };
    }

    return {
      configured: true,
      sourceDate: null,
      items: [],
      error: "최근 DART 영업일 공시를 찾지 못했습니다.",
    };
  } catch (error) {
    return {
      configured: true,
      sourceDate: null,
      items: [],
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

const loadDailyDisclosureFeed = unstable_cache(
  async (koreaTargetDate: string, usTargetDate: string): Promise<DisclosureDailyFeed> => {
    const [korea, us] = await Promise.all([
      buildKoreaFeed(koreaTargetDate),
      buildUsFeed(usTargetDate),
    ]);

    return {
      generatedAt: new Date().toISOString(),
      korea,
      us,
    };
  },
  ["hohaeng-official-disclosure-feed-v1"],
  {
    revalidate: FEED_CACHE_SECONDS,
    tags: ["hohaeng-disclosure-feed"],
  },
);

export async function getDailyDisclosureFeed(): Promise<DisclosureDailyFeed> {
  const seoulToday = dateInTimeZone("Asia/Seoul");
  const newYorkToday = dateInTimeZone("America/New_York");

  // 한국은 전 영업일 전체 공시, 미국은 뉴욕 현지에서 이미 마감된 당일 공시를 우선한다.
  return loadDailyDisclosureFeed(shiftDate(seoulToday, -1), newYorkToday);
}
