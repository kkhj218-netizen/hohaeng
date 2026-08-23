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
  process.env.SEC_USER_AGENT?.trim() ||
  "HOHAENG OS/1.0 https://hohaeng.vercel.app";
const SEC_CONTACT_EMAIL = process.env.SEC_CONTACT_EMAIL?.trim() || "";
const SOURCE_FETCH_TIMEOUT_MS = 12_000;
const FEED_CACHE_SECONDS = 6 * 60 * 60;
const TICKER_CACHE_SECONDS = 7 * 24 * 60 * 60;
const SEC_DAY_CACHE_SECONDS = 7 * 24 * 60 * 60;

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

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function secHeaders(accept: string): HeadersInit {
  return {
    Accept: accept,
    "User-Agent": SEC_USER_AGENT,
    ...(SEC_CONTACT_EMAIL ? { From: SEC_CONTACT_EMAIL } : {}),
  };
}

async function secFetch(url: string, accept: string): Promise<Response> {
  let lastResponse: Response | null = null;
  let lastError: unknown = null;

  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const response = await fetch(url, {
        cache: "no-store",
        headers: secHeaders(accept),
        signal: AbortSignal.timeout(SOURCE_FETCH_TIMEOUT_MS),
      });
      lastResponse = response;

      if (response.ok || response.status === 404) return response;
      if (![403, 429, 500, 502, 503, 504].includes(response.status)) return response;
    } catch (error) {
      lastError = error;
    }

    if (attempt < 2) await sleep(attempt === 0 ? 900 : 2_100);
  }

  if (lastResponse) return lastResponse;
  throw lastError instanceof Error ? lastError : new Error("SEC 요청 실패");
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
type SecTickerInfo = { ticker: string; title: string };

const loadSecTickerMap = unstable_cache(
  async (): Promise<Record<string, SecTickerInfo>> => {
    const response = await secFetch(
      "https://www.sec.gov/files/company_tickers.json",
      "application/json",
    );
    if (!response.ok) throw new Error(`SEC ticker map 요청 실패 (${response.status})`);

    const payload = (await response.json()) as SecTickerPayload;
    const map: Record<string, SecTickerInfo> = {};
    for (const entry of Object.values(payload)) {
      const cik = safeNumber(entry.cik_str, -1);
      const ticker = entry.ticker?.trim();
      if (cik < 0 || !ticker) continue;
      const key = String(cik);
      if (!map[key]) {
        map[key] = { ticker, title: entry.title?.trim() || ticker };
      }
    }
    return map;
  },
  ["hohaeng-sec-ticker-map-v2"],
  { revalidate: TICKER_CACHE_SECONDS },
);

function formatAccession(value: string): string | null {
  const hyphenated = value.match(/\d{10}-\d{2}-\d{6}/)?.[0];
  if (hyphenated) return hyphenated;
  const digits = value.replace(/\D/g, "");
  if (digits.length !== 18) return null;
  return `${digits.slice(0, 10)}-${digits.slice(10, 12)}-${digits.slice(12)}`;
}

function sortSecItems(items: DisclosureItem[]) {
  return items.sort((left, right) => {
    if (right.importance !== left.importance) return right.importance - left.importance;
    return left.company.localeCompare(right.company, "en");
  });
}

async function fetchSecDailyIndex(date: string): Promise<DisclosureItem[] | null> {
  const year = Number(date.slice(0, 4));
  const month = Number(date.slice(5, 7));
  const quarter = Math.floor((month - 1) / 3) + 1;
  const url = `https://www.sec.gov/Archives/edgar/daily-index/${year}/QTR${quarter}/master.${compactDate(date)}.idx`;
  const response = await secFetch(url, "text/plain,*/*;q=0.8");

  if (response.status === 404) return null;
  if (!response.ok) throw new Error(`SEC daily index 요청 실패 (${response.status})`);

  const text = await response.text();
  const tickers = await loadSecTickerMap().catch(() => ({} as Record<string, SecTickerInfo>));
  const items: DisclosureItem[] = [];

  for (const line of text.split(/\r?\n/)) {
    if (!line.includes("|")) continue;
    const [cikRaw, companyRaw, formRaw, filingDateRaw, filenameRaw] = line.split("|");
    if (!cikRaw || !companyRaw || !formRaw || !filingDateRaw || !filenameRaw) continue;

    const cik = String(safeNumber(cikRaw.trim(), -1));
    if (cik === "-1") continue;
    const classification = secCategory(formRaw);
    if (!classification) continue;

    const filename = filenameRaw.trim();
    const accession = formatAccession(filename.split("/").pop()?.replace(/\.txt$/i, "") ?? "");
    if (!accession) continue;
    const tickerInfo = tickers[cik];
    const form = formRaw.trim().toUpperCase();

    items.push({
      id: `SEC-${accession}`,
      market: "US",
      exchange: "US",
      ticker: tickerInfo?.ticker ?? null,
      company: tickerInfo?.title || companyRaw.trim(),
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

  return sortSecItems(items);
}

function decodeXml(value: string): string {
  return value
    .replaceAll("&amp;", "&")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&quot;", '"')
    .replaceAll("&#39;", "'")
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/<[^>]+>/g, "")
    .trim();
}

function xmlTag(block: string, tag: string): string {
  const match = block.match(new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${tag}>`, "i"));
  return match?.[1] ? decodeXml(match[1]) : "";
}

function atomLink(block: string): string {
  const links = [...block.matchAll(/<link\b[^>]*href=["']([^"']+)["'][^>]*>/gi)];
  const preferred = links.find((match) => /rel=["']alternate["']/i.test(match[0]));
  return decodeXml((preferred ?? links[0])?.[1] ?? "");
}

function atomForm(block: string, title: string): string {
  const category = block.match(/<category\b[^>]*term=["']([^"']+)["']/i)?.[1];
  if (category) return decodeXml(category).toUpperCase();
  return title.split(" - ")[0]?.trim().toUpperCase() || "";
}

function atomCompany(title: string, form: string): string {
  const withoutForm = title.startsWith(`${form} - `) ? title.slice(form.length + 3) : title;
  return withoutForm.replace(/\s*\([^)]*\)\s*$/, "").trim() || "SEC 등록 기업";
}

async function fetchSecCurrentAtom(): Promise<DisclosureItem[]> {
  const tickers = await loadSecTickerMap().catch(() => ({} as Record<string, SecTickerInfo>));
  const items: DisclosureItem[] = [];
  const seen = new Set<string>();

  for (const start of [0, 100, 200]) {
    const params = new URLSearchParams({
      action: "getcurrent",
      owner: "include",
      count: "100",
      output: "atom",
      start: String(start),
    });
    const response = await secFetch(
      `https://www.sec.gov/cgi-bin/browse-edgar?${params}`,
      "application/atom+xml,application/xml,text/xml,*/*;q=0.8",
    );
    if (!response.ok) throw new Error(`SEC current filings 요청 실패 (${response.status})`);

    const xml = await response.text();
    const entries = [...xml.matchAll(/<entry\b[^>]*>([\s\S]*?)<\/entry>/gi)];
    if (entries.length === 0 && start === 0) {
      throw new Error("SEC current filings 응답에 공시 항목이 없습니다.");
    }

    for (const match of entries) {
      const block = match[1];
      const title = xmlTag(block, "title");
      const updated = xmlTag(block, "updated");
      const sourceUrl = atomLink(block);
      const form = atomForm(block, title);
      const classification = secCategory(form);
      if (!classification || !sourceUrl) continue;

      const accession = formatAccession(sourceUrl);
      if (!accession || seen.has(accession)) continue;
      const cikMatch = sourceUrl.match(/\/data\/(\d+)\//i);
      const cik = cikMatch?.[1] ? String(Number(cikMatch[1])) : null;
      const tickerInfo = cik ? tickers[cik] : undefined;
      const company = tickerInfo?.title || atomCompany(title, form);
      const filingDate = updated.slice(0, 10);
      if (!filingDate) continue;

      seen.add(accession);
      items.push({
        id: `SEC-${accession}`,
        market: "US",
        exchange: "US",
        ticker: tickerInfo?.ticker ?? null,
        company,
        category: classification.category,
        importance: classification.importance,
        title: form,
        form,
        filingDate,
        source: "SEC",
        sourceUrl,
        detailUrl: cik
          ? `/data/disclosures/us/${encodeURIComponent(cik)}/${encodeURIComponent(accession)}`
          : null,
        sourceId: accession,
        amendment: /\/A$/i.test(form),
        structuredEarnings: classification.structuredEarnings,
      });
    }

    if (entries.length < 100) break;
    await sleep(350);
  }

  return items;
}

const loadSecAtomFallback = unstable_cache(
  fetchSecCurrentAtom,
  ["hohaeng-sec-current-atom-v2"],
  { revalidate: 30 * 60 },
);

const loadSecDay = unstable_cache(
  async (date: string): Promise<DisclosureSourceFeed> => {
    try {
      const daily = await fetchSecDailyIndex(date);
      if (daily && daily.length > 0) {
        return { configured: true, sourceDate: date, items: daily, error: null };
      }
    } catch (dailyError) {
      const fallback = await loadSecAtomFallback();
      const sameDay = sortSecItems(fallback.filter((item) => item.filingDate === date));
      if (sameDay.length > 0) {
        return { configured: true, sourceDate: date, items: sameDay, error: null };
      }
      throw dailyError;
    }

    const fallback = await loadSecAtomFallback();
    const sameDay = sortSecItems(fallback.filter((item) => item.filingDate === date));
    if (sameDay.length > 0) {
      return { configured: true, sourceDate: date, items: sameDay, error: null };
    }
    throw new Error(`${date} SEC 공시를 찾지 못했습니다.`);
  },
  ["hohaeng-sec-day-v2"],
  { revalidate: SEC_DAY_CACHE_SECONDS },
);

async function buildUsFeed(targetDate: string): Promise<DisclosureSourceFeed> {
  let firstError: string | null = null;

  for (let offset = 0; offset <= 7; offset += 1) {
    const date = shiftDate(targetDate, -offset);
    try {
      const feed = await loadSecDay(date);
      if (feed.items.length > 0) return feed;
    } catch (error) {
      if (!firstError) firstError = error instanceof Error ? error.message : String(error);
    }
  }

  return {
    configured: true,
    sourceDate: null,
    items: [],
    error: firstError || "최근 SEC 거래일 공시를 찾지 못했습니다.",
  };
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
  if (!response.ok) throw new Error(`OpenDART 요청 실패 (${response.status})`);
  return (await response.json()) as DartListResponse;
}

function dartItemToDisclosure(item: DartListItem): DisclosureItem | null {
  const receiptNo = item.rcept_no?.trim();
  const reportName = item.report_nm?.trim();
  const corpName = item.corp_name?.trim();
  if (!receiptNo || !reportName || !corpName) return null;

  const classification = koreaCategory(reportName);
  const exchange = item.corp_cls === "Y" ? "KOSPI" : item.corp_cls === "K" ? "KOSDAQ" : "KR";
  const receiptDate = item.rcept_dt?.trim() || "";

  return {
    id: `DART-${receiptNo}`,
    market: "KR",
    exchange,
    ticker: item.stock_code?.trim() || null,
    company: corpName,
    category: classification.category,
    importance: classification.importance,
    title: reportName,
    form: reportName,
    filingDate: receiptDate
      ? `${receiptDate.slice(0, 4)}-${receiptDate.slice(4, 6)}-${receiptDate.slice(6, 8)}`
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
  if (!apiKey) return { configured: false, sourceDate: null, items: [], error: null };

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
      return { configured: true, sourceDate: date, items, error: null };
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

const loadKoreaFeed = unstable_cache(
  buildKoreaFeed,
  ["hohaeng-dart-daily-feed-v2"],
  { revalidate: FEED_CACHE_SECONDS, tags: ["hohaeng-disclosure-feed"] },
);

export async function getDailyDisclosureFeed(): Promise<DisclosureDailyFeed> {
  const seoulToday = dateInTimeZone("Asia/Seoul");
  const newYorkToday = dateInTimeZone("America/New_York");

  // SEC daily index는 미국 동부시간 밤에 생성되므로 항상 뉴욕 기준 전일 완료분을 우선한다.
  // 한국도 완료 영업일 기준으로 전일 자료를 사용한다.
  const [korea, us] = await Promise.all([
    loadKoreaFeed(shiftDate(seoulToday, -1)),
    buildUsFeed(shiftDate(newYorkToday, -1)),
  ]);

  return {
    generatedAt: new Date().toISOString(),
    korea,
    us,
  };
}
