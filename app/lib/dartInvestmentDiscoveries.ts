import "server-only";

import { inflateRawSync } from "node:zlib";
import { unstable_cache } from "next/cache";

import {
  getDailyDisclosureFeed,
  type DisclosureItem,
} from "@/app/lib/disclosureHub";

export type InvestmentDiscoveryType =
  | "earnings-growth"
  | "turnaround"
  | "insider-increase"
  | "insider-decrease"
  | "major-holder-change";

export type InvestmentDiscovery = {
  id: string;
  type: InvestmentDiscoveryType;
  company: string;
  stockCode: string;
  title: string;
  summary: string;
  metricLabel: string;
  metricValue: string;
  filingDate: string;
  sourceUrl: string;
  importance: number;
};

export type InvestmentDiscoveryDashboard = {
  configured: boolean;
  sourceDate: string | null;
  generatedAt: string;
  stats: {
    importantFilings: number;
    supplyContracts: number;
    shareholderReturns: number;
    earningsSurge: number;
    turnarounds: number;
    ownershipChanges: number;
  };
  items: InvestmentDiscovery[];
  analyzed: {
    earningsCandidates: number;
    ownershipCandidates: number;
  };
  costNote: string;
  error: string | null;
};

type RawDartRow = Record<string, string | number | null | undefined>;
type RawDartResponse = {
  status?: string;
  message?: string;
  list?: RawDartRow[];
};

type ParsedMetric = {
  current: number | null;
  previousYear: number | null;
  yoy: number | null;
};

const DART_TIMEOUT_MS = 12_000;
const DASHBOARD_CACHE_SECONDS = 6 * 60 * 60;
const DETAIL_CACHE_SECONDS = 7 * 24 * 60 * 60;
const CORP_MAP_CACHE_SECONDS = 7 * 24 * 60 * 60;
const MAX_EARNINGS_CANDIDATES = 6;
const MAX_OWNERSHIP_CANDIDATES = 8;
const MAX_TEXT_ENTRY_BYTES = 6 * 1024 * 1024;
const MAX_TOTAL_TEXT_BYTES = 12 * 1024 * 1024;

function cleanNumber(value: unknown): number | null {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value !== "string") return null;
  const normalized = value
    .replaceAll(",", "")
    .replaceAll("▲", "")
    .replaceAll("△", "")
    .replaceAll("%", "")
    .trim();
  if (!normalized || normalized === "-" || normalized === "–") return null;
  const match = normalized.match(/-?\d+(?:\.\d+)?/);
  if (!match) return null;
  const parsed = Number(match[0]);
  return Number.isFinite(parsed) ? parsed : null;
}

function cleanText(value: unknown): string | null {
  if (typeof value !== "string" && typeof value !== "number") return null;
  const text = String(value).replace(/\s+/g, " ").trim();
  return text && text !== "-" ? text : null;
}

function formatPercent(value: number | null): string {
  return value === null
    ? "확인되지 않음"
    : `${value.toLocaleString("ko-KR", { maximumFractionDigits: 1 })}%`;
}

function formatShares(value: number | null): string {
  if (value === null) return "확인되지 않음";
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toLocaleString("ko-KR")}주`;
}

function formatKrw(value: number | null): string {
  if (value === null) return "확인되지 않음";
  const absolute = Math.abs(value);
  const sign = value < 0 ? "-" : "";
  if (absolute >= 1_000_000_000_000) {
    return `${sign}${(absolute / 1_000_000_000_000).toLocaleString("ko-KR", { maximumFractionDigits: 2 })}조 원`;
  }
  if (absolute >= 100_000_000) {
    return `${sign}${(absolute / 100_000_000).toLocaleString("ko-KR", { maximumFractionDigits: 1 })}억 원`;
  }
  if (absolute >= 10_000) {
    return `${sign}${(absolute / 10_000).toLocaleString("ko-KR", { maximumFractionDigits: 1 })}만 원`;
  }
  return `${sign}${absolute.toLocaleString("ko-KR")}원`;
}

function decodeEntities(value: string): string {
  return value
    .replaceAll("&nbsp;", " ")
    .replaceAll("&amp;", "&")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&quot;", '"')
    .replaceAll("&#39;", "'")
    .replace(/&#(\d+);/g, (_, code: string) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code: string) => String.fromCodePoint(Number.parseInt(code, 16)));
}

function normalizeCell(value: string): string {
  return decodeEntities(
    value
      .replace(/<br\s*\/?\s*>/gi, " ")
      .replace(/<\/p>|<\/div>|<\/tr>/gi, " ")
      .replace(/<[^>]+>/g, " "),
  )
    .replace(/\s+/g, " ")
    .trim();
}

function cellKey(value: string): string {
  return value
    .replace(/\s+/g, "")
    .replace(/[()（）\[\]ㆍ·:：,.]/g, "")
    .toLowerCase();
}

function decodeTextBuffer(buffer: Buffer): string {
  const utf8 = new TextDecoder("utf-8").decode(buffer);
  const replacementCount = (utf8.match(/�/g) ?? []).length;
  if (replacementCount < 10) return utf8;
  try {
    return new TextDecoder("euc-kr").decode(buffer);
  } catch {
    return utf8;
  }
}

function unzipTextEntries(buffer: Buffer): string[] {
  if (buffer.length < 4 || buffer.readUInt32LE(0) !== 0x04034b50) {
    return [decodeTextBuffer(buffer.subarray(0, MAX_TOTAL_TEXT_BYTES))];
  }

  let eocdOffset = -1;
  for (let offset = buffer.length - 22; offset >= Math.max(0, buffer.length - 65_557); offset -= 1) {
    if (buffer.readUInt32LE(offset) === 0x06054b50) {
      eocdOffset = offset;
      break;
    }
  }
  if (eocdOffset < 0) throw new Error("OpenDART 원문 ZIP 구조를 읽을 수 없습니다.");

  const entryCount = buffer.readUInt16LE(eocdOffset + 10);
  let centralOffset = buffer.readUInt32LE(eocdOffset + 16);
  let totalDecoded = 0;
  const texts: string[] = [];

  for (let index = 0; index < entryCount; index += 1) {
    if (centralOffset + 46 > buffer.length || buffer.readUInt32LE(centralOffset) !== 0x02014b50) break;

    const compression = buffer.readUInt16LE(centralOffset + 10);
    const compressedSize = buffer.readUInt32LE(centralOffset + 20);
    const uncompressedSize = buffer.readUInt32LE(centralOffset + 24);
    const filenameLength = buffer.readUInt16LE(centralOffset + 28);
    const extraLength = buffer.readUInt16LE(centralOffset + 30);
    const commentLength = buffer.readUInt16LE(centralOffset + 32);
    const localOffset = buffer.readUInt32LE(centralOffset + 42);
    const filename = buffer
      .subarray(centralOffset + 46, centralOffset + 46 + filenameLength)
      .toString("utf8");

    const textLike = /\.(?:xml|html?|txt)$/i.test(filename) || !filename.includes(".");
    const withinLimit = uncompressedSize <= MAX_TEXT_ENTRY_BYTES && totalDecoded < MAX_TOTAL_TEXT_BYTES;

    if (
      textLike &&
      withinLimit &&
      localOffset + 30 <= buffer.length &&
      buffer.readUInt32LE(localOffset) === 0x04034b50
    ) {
      const localFilenameLength = buffer.readUInt16LE(localOffset + 26);
      const localExtraLength = buffer.readUInt16LE(localOffset + 28);
      const dataStart = localOffset + 30 + localFilenameLength + localExtraLength;
      const compressed = buffer.subarray(dataStart, dataStart + compressedSize);
      const decoded =
        compression === 0
          ? compressed
          : compression === 8
            ? inflateRawSync(compressed)
            : null;

      if (decoded) {
        const allowed = Math.min(decoded.length, MAX_TOTAL_TEXT_BYTES - totalDecoded);
        if (allowed > 0) {
          texts.push(decodeTextBuffer(decoded.subarray(0, allowed)));
          totalDecoded += allowed;
        }
      }
    }

    centralOffset += 46 + filenameLength + extraLength + commentLength;
    if (totalDecoded >= MAX_TOTAL_TEXT_BYTES) break;
  }

  return texts;
}

function extractCells(documentText: string): string[] {
  const cells = [...documentText.matchAll(/<(?:td|th)\b[^>]*>([\s\S]*?)<\/(?:td|th)>/gi)]
    .map((match) => normalizeCell(match[1]))
    .filter(Boolean);
  if (cells.length > 0) return cells;

  return documentText
    .split(/\r?\n/)
    .map(normalizeCell)
    .filter(Boolean);
}

function findLabelIndex(cells: string[], labels: string[], start = 0, end = cells.length): number {
  const keys = labels.map(cellKey);
  for (let index = start; index < Math.min(end, cells.length); index += 1) {
    const current = cellKey(cells[index]);
    if (keys.some((label) => current === label || current.includes(label))) return index;
  }
  return -1;
}

function nextNumber(cells: string[], index: number, maxLookahead = 8): number | null {
  for (let offset = 1; offset <= maxLookahead && index + offset < cells.length; offset += 1) {
    const value = cleanNumber(cells[index + offset]);
    if (value !== null) return value;
  }
  return null;
}

function metricSection(
  cells: string[],
  labels: string[],
  nextSectionLabels: string[][],
): { start: number; end: number } | null {
  const start = findLabelIndex(cells, labels);
  if (start < 0) return null;
  let end = Math.min(cells.length, start + 48);
  for (const nextLabels of nextSectionLabels) {
    const candidate = findLabelIndex(cells, nextLabels, start + 1, end);
    if (candidate >= 0) end = Math.min(end, candidate);
  }
  return { start, end };
}

function parseMetric(
  cells: string[],
  labels: string[],
  nextSectionLabels: string[][],
): ParsedMetric {
  const section = metricSection(cells, labels, nextSectionLabels);
  if (!section) return { current: null, previousYear: null, yoy: null };

  const currentIndex = findLabelIndex(
    cells,
    ["당해실적", "당해사업연도", "당해 사업연도", "당기실적", "당기"],
    section.start + 1,
    section.end,
  );
  const previousYearIndex = findLabelIndex(
    cells,
    ["전년동기실적", "전년동기", "직전사업연도", "직전 사업연도", "전기실적", "전기"],
    section.start + 1,
    section.end,
  );
  const yoyIndex = findLabelIndex(
    cells,
    ["증감율", "증감률", "증감비율", "전년동기대비증감율", "전년동기대비증감률"],
    section.start + 1,
    section.end,
  );

  const current = currentIndex >= 0 ? nextNumber(cells, currentIndex, 5) : null;
  const previousYear = previousYearIndex >= 0 ? nextNumber(cells, previousYearIndex, 5) : null;
  const reportedYoy = yoyIndex >= 0 ? nextNumber(cells, yoyIndex, 4) : null;
  const calculatedYoy =
    current !== null && previousYear !== null && previousYear !== 0
      ? ((current - previousYear) / Math.abs(previousYear)) * 100
      : null;

  return {
    current,
    previousYear,
    yoy: calculatedYoy ?? reportedYoy,
  };
}

function detectUnitMultiplier(documentText: string): number | null {
  const normalized = normalizeCell(documentText.slice(0, 120_000));
  const match = normalized.match(/단위\s*[:：]?\s*(억원|백만원|천원|원)/);
  const unit = match?.[1];
  if (unit === "억원") return 100_000_000;
  if (unit === "백만원") return 1_000_000;
  if (unit === "천원") return 1_000;
  if (unit === "원") return 1;
  return null;
}

const loadDocumentText = unstable_cache(
  async (receiptNo: string): Promise<string> => {
    const apiKey = process.env.DART_API_KEY?.trim();
    if (!apiKey) throw new Error("DART_API_KEY가 설정되지 않았습니다.");

    const params = new URLSearchParams({ crtfc_key: apiKey, rcept_no: receiptNo });
    const response = await fetch(`https://opendart.fss.or.kr/api/document.xml?${params}`, {
      cache: "no-store",
      signal: AbortSignal.timeout(DART_TIMEOUT_MS),
    });
    if (!response.ok) throw new Error(`OpenDART 원문 요청 실패 (${response.status})`);

    const texts = unzipTextEntries(Buffer.from(await response.arrayBuffer()));
    return texts.join("\n");
  },
  ["hohaeng-dart-discovery-document-v1"],
  { revalidate: DETAIL_CACHE_SECONDS },
);

function isEarningsCandidate(item: DisclosureItem): boolean {
  const name = item.title.replace(/\s+/g, "");
  return (
    item.source === "DART" &&
    Boolean(item.ticker) &&
    (name.includes("영업(잠정)실적") || name.includes("매출액또는손익구조"))
  );
}

async function analyzeEarningsCandidate(item: DisclosureItem): Promise<InvestmentDiscovery | null> {
  if (!item.ticker) return null;
  const documentText = await loadDocumentText(item.sourceId);
  const cells = extractCells(documentText);
  const revenue = parseMetric(cells, ["매출액", "영업수익"], [["영업이익"], ["영업손익"]]);
  const operating = parseMetric(
    cells,
    ["영업이익", "영업손익"],
    [["법인세비용차감전계속사업이익"], ["당기순이익"], ["당기순손익"]],
  );
  const netIncome = parseMetric(cells, ["당기순이익", "당기순손익"], []);
  const unitMultiplier = detectUnitMultiplier(documentText);

  const turnaround =
    operating.current !== null &&
    operating.previousYear !== null &&
    operating.current > 0 &&
    operating.previousYear <= 0;
  const operatingSurge =
    operating.current !== null &&
    operating.current > 0 &&
    operating.previousYear !== null &&
    operating.previousYear > 0 &&
    (operating.yoy ?? -Infinity) >= 50;
  const revenueSurge =
    revenue.current !== null && revenue.current > 0 && (revenue.yoy ?? -Infinity) >= 30;
  const netSurge =
    netIncome.current !== null &&
    netIncome.current > 0 &&
    netIncome.previousYear !== null &&
    netIncome.previousYear > 0 &&
    (netIncome.yoy ?? -Infinity) >= 50;

  if (!turnaround && !operatingSurge && !revenueSurge && !netSurge) return null;

  if (turnaround) {
    const currentValue =
      operating.current !== null && unitMultiplier
        ? formatKrw(operating.current * unitMultiplier)
        : operating.current?.toLocaleString("ko-KR") ?? "확인되지 않음";
    const previousValue =
      operating.previousYear !== null && unitMultiplier
        ? formatKrw(operating.previousYear * unitMultiplier)
        : operating.previousYear?.toLocaleString("ko-KR") ?? "확인되지 않음";

    return {
      id: `turnaround-${item.sourceId}`,
      type: "turnaround",
      company: item.company,
      stockCode: item.ticker,
      title: "영업이익 흑자전환 감지",
      summary: `전년동기 ${previousValue} → 당해 ${currentValue}`,
      metricLabel: "영업이익",
      metricValue: "적자 → 흑자",
      filingDate: item.filingDate,
      sourceUrl: item.sourceUrl,
      importance: 100,
    };
  }

  const candidates = [
    { label: "영업이익", value: operating.yoy, thresholdImportance: 94 },
    { label: "매출액", value: revenue.yoy, thresholdImportance: 88 },
    { label: "당기순이익", value: netIncome.yoy, thresholdImportance: 86 },
  ].filter((entry) => entry.value !== null);
  candidates.sort((a, b) => (b.value ?? 0) - (a.value ?? 0));
  const top = candidates[0];
  if (!top || top.value === null) return null;

  const summaryParts: string[] = [];
  if (revenue.yoy !== null) summaryParts.push(`매출 ${formatPercent(revenue.yoy)}`);
  if (operating.yoy !== null) summaryParts.push(`영업이익 ${formatPercent(operating.yoy)}`);
  if (netIncome.yoy !== null) summaryParts.push(`순이익 ${formatPercent(netIncome.yoy)}`);

  return {
    id: `earnings-growth-${item.sourceId}`,
    type: "earnings-growth",
    company: item.company,
    stockCode: item.ticker,
    title: "실적 급증 감지",
    summary: summaryParts.join(" · ") || item.title,
    metricLabel: `${top.label} 전년동기 대비`,
    metricValue: formatPercent(top.value),
    filingDate: item.filingDate,
    sourceUrl: item.sourceUrl,
    importance: top.thresholdImportance + Math.min(5, Math.floor(Math.max(0, top.value - 50) / 50)),
  };
}

function decodeXml(value: string): string {
  return value
    .replaceAll("&amp;", "&")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&quot;", '"')
    .replaceAll("&#39;", "'")
    .trim();
}

function xmlTag(block: string, tag: string): string {
  const match = block.match(new RegExp(`<${tag}>([\\s\\S]*?)<\\/${tag}>`, "i"));
  return match?.[1] ? decodeXml(match[1]).trim() : "";
}

const loadListedCorpMap = unstable_cache(
  async (): Promise<Record<string, string>> => {
    const apiKey = process.env.DART_API_KEY?.trim();
    if (!apiKey) return {};

    const response = await fetch(
      `https://opendart.fss.or.kr/api/corpCode.xml?crtfc_key=${encodeURIComponent(apiKey)}`,
      { cache: "no-store", signal: AbortSignal.timeout(DART_TIMEOUT_MS) },
    );
    if (!response.ok) throw new Error(`OpenDART 고유번호 요청 실패 (${response.status})`);

    const text = unzipTextEntries(Buffer.from(await response.arrayBuffer())).join("\n");
    const map: Record<string, string> = {};
    for (const match of text.matchAll(/<list>([\s\S]*?)<\/list>/gi)) {
      const stockCode = xmlTag(match[1], "stock_code");
      const corpCode = xmlTag(match[1], "corp_code");
      if (/^\d{6}$/.test(stockCode) && /^\d{8}$/.test(corpCode)) map[stockCode] = corpCode;
    }
    return map;
  },
  ["hohaeng-dart-discovery-corp-map-v1"],
  { revalidate: CORP_MAP_CACHE_SECONDS },
);

const loadOwnershipRows = unstable_cache(
  async (corpCode: string, kind: "insider" | "major"): Promise<RawDartRow[]> => {
    const apiKey = process.env.DART_API_KEY?.trim();
    if (!apiKey) throw new Error("DART_API_KEY가 설정되지 않았습니다.");
    const endpoint = kind === "insider" ? "elestock.json" : "majorstock.json";
    const params = new URLSearchParams({ crtfc_key: apiKey, corp_code: corpCode });
    const response = await fetch(`https://opendart.fss.or.kr/api/${endpoint}?${params}`, {
      cache: "no-store",
      signal: AbortSignal.timeout(DART_TIMEOUT_MS),
    });
    if (!response.ok) throw new Error(`OpenDART 지분 요청 실패 (${response.status})`);

    const payload = (await response.json()) as RawDartResponse;
    if (payload.status === "013") return [];
    if (payload.status && payload.status !== "000") {
      throw new Error(payload.message || `OpenDART 상태 ${payload.status}`);
    }
    return payload.list ?? [];
  },
  ["hohaeng-dart-discovery-ownership-v1"],
  { revalidate: DETAIL_CACHE_SECONDS },
);

function ownershipKind(item: DisclosureItem): "insider" | "major" | null {
  const name = item.title.replace(/\s+/g, "");
  if (name.includes("임원") && name.includes("주요주주") && name.includes("소유상황")) return "insider";
  if (name.includes("주식등의대량보유상황보고")) return "major";
  return null;
}

async function analyzeOwnershipCandidate(
  item: DisclosureItem,
  corpCode: string,
): Promise<InvestmentDiscovery | null> {
  if (!item.ticker) return null;
  const kind = ownershipKind(item);
  if (!kind) return null;
  const rows = await loadOwnershipRows(corpCode, kind);
  const row = rows.find((entry) => String(entry.rcept_no ?? "").trim() === item.sourceId);
  if (!row) return null;

  if (kind === "insider") {
    const deltaShares = cleanNumber(row.sp_stock_lmp_irds_cnt);
    const deltaRate = cleanNumber(row.sp_stock_lmp_irds_rate);
    if ((deltaShares ?? 0) === 0 && (deltaRate ?? 0) === 0) return null;
    const reporter = cleanText(row.repror) ?? "임원·주요주주";
    const position = cleanText(row.isu_exctv_ofcps) ?? cleanText(row.isu_main_shrholdr);
    const increased = (deltaShares ?? 0) > 0 || ((deltaShares ?? 0) === 0 && (deltaRate ?? 0) > 0);

    return {
      id: `${increased ? "insider-increase" : "insider-decrease"}-${item.sourceId}`,
      type: increased ? "insider-increase" : "insider-decrease",
      company: item.company,
      stockCode: item.ticker,
      title: increased ? "임원·주요주주 보유 증가" : "임원·주요주주 보유 감소",
      summary: `${reporter}${position ? ` · ${position}` : ""} · 보유비율 ${cleanText(row.sp_stock_lmp_rate) ?? "확인 필요"}%`,
      metricLabel: "특정증권 보유 증감",
      metricValue:
        deltaShares !== null
          ? formatShares(deltaShares)
          : `${deltaRate !== null && deltaRate > 0 ? "+" : ""}${formatPercent(deltaRate)}`,
      filingDate: item.filingDate,
      sourceUrl: item.sourceUrl,
      importance: increased ? 88 : 82,
    };
  }

  const deltaShares = cleanNumber(row.stkqy_irds);
  const deltaRate = cleanNumber(row.stkrt_irds);
  if ((deltaShares ?? 0) === 0 && (deltaRate ?? 0) === 0) return null;
  const reporter = cleanText(row.repror) ?? "대량보유 보고자";
  const reason = cleanText(row.report_resn);

  return {
    id: `major-holder-change-${item.sourceId}`,
    type: "major-holder-change",
    company: item.company,
    stockCode: item.ticker,
    title: "5% 이상 대량보유 변화",
    summary: `${reporter} · 현재 보유비율 ${cleanText(row.stkrt) ?? "확인 필요"}%${reason ? ` · ${reason}` : ""}`,
    metricLabel: "보유비율 증감",
    metricValue:
      deltaRate !== null
        ? `${deltaRate > 0 ? "+" : ""}${formatPercent(deltaRate)}`
        : formatShares(deltaShares),
    filingDate: item.filingDate,
    sourceUrl: item.sourceUrl,
    importance: 90 + Math.min(7, Math.floor(Math.abs(deltaRate ?? 0))),
  };
}

const loadInvestmentDiscoveries = unstable_cache(
  async (): Promise<InvestmentDiscoveryDashboard> => {
    const feed = await getDailyDisclosureFeed();
    const koreaItems = feed.korea.items;

    if (!feed.korea.configured) {
      return {
        configured: false,
        sourceDate: null,
        generatedAt: new Date().toISOString(),
        stats: {
          importantFilings: 0,
          supplyContracts: 0,
          shareholderReturns: 0,
          earningsSurge: 0,
          turnarounds: 0,
          ownershipChanges: 0,
        },
        items: [],
        analyzed: { earningsCandidates: 0, ownershipCandidates: 0 },
        costNote: "DART_API_KEY 연결 후 최근 완료 영업일 후보만 제한적으로 분석합니다.",
        error: null,
      };
    }

    const earningsCandidates = koreaItems
      .filter(isEarningsCandidate)
      .slice(0, MAX_EARNINGS_CANDIDATES);
    const ownershipCandidates = koreaItems
      .filter((item) => Boolean(item.ticker && ownershipKind(item)))
      .slice(0, MAX_OWNERSHIP_CANDIDATES);

    const earningsResults = await Promise.allSettled(
      earningsCandidates.map((item) => analyzeEarningsCandidate(item)),
    );

    let corpMap: Record<string, string> = {};
    try {
      corpMap = ownershipCandidates.length > 0 ? await loadListedCorpMap() : {};
    } catch {
      corpMap = {};
    }

    const ownershipResults = await Promise.allSettled(
      ownershipCandidates.map((item) => {
        const corpCode = item.ticker ? corpMap[item.ticker] : null;
        return corpCode ? analyzeOwnershipCandidate(item, corpCode) : Promise.resolve(null);
      }),
    );

    const earningsItems = earningsResults
      .filter((result): result is PromiseFulfilledResult<InvestmentDiscovery | null> => result.status === "fulfilled")
      .map((result) => result.value)
      .filter((item): item is InvestmentDiscovery => item !== null);
    const ownershipItems = ownershipResults
      .filter((result): result is PromiseFulfilledResult<InvestmentDiscovery | null> => result.status === "fulfilled")
      .map((result) => result.value)
      .filter((item): item is InvestmentDiscovery => item !== null);

    const items = [...earningsItems, ...ownershipItems]
      .sort((left, right) => {
        if (right.importance !== left.importance) return right.importance - left.importance;
        return right.filingDate.localeCompare(left.filingDate);
      })
      .slice(0, 8);

    const importantFilings = koreaItems.filter((item) => item.importance >= 70).length;
    const supplyContracts = koreaItems.filter((item) => {
      const name = item.title.replace(/\s+/g, "");
      return name.includes("단일판매") && name.includes("공급계약");
    }).length;
    const shareholderReturns = koreaItems.filter((item) => {
      const name = item.title.replace(/\s+/g, "");
      return (
        item.category === "shareholder" ||
        name.includes("주식소각") ||
        name.includes("자기주식취득") ||
        name.includes("배당")
      );
    }).length;

    return {
      configured: true,
      sourceDate: feed.korea.sourceDate,
      generatedAt: new Date().toISOString(),
      stats: {
        importantFilings,
        supplyContracts,
        shareholderReturns,
        earningsSurge: earningsItems.filter((item) => item.type === "earnings-growth").length,
        turnarounds: earningsItems.filter((item) => item.type === "turnaround").length,
        ownershipChanges: ownershipItems.length,
      },
      items,
      analyzed: {
        earningsCandidates: earningsCandidates.length,
        ownershipCandidates: ownershipCandidates.length,
      },
      costNote:
        `완료 영업일 공시 중 실적 최대 ${MAX_EARNINGS_CANDIDATES}건, 지분 최대 ${MAX_OWNERSHIP_CANDIDATES}건만 후보로 분석하고 결과를 6시간 캐시합니다. 원문 파일은 저장하지 않습니다.`,
      error: feed.korea.error,
    };
  },
  ["hohaeng-investment-discoveries-v3"],
  { revalidate: DASHBOARD_CACHE_SECONDS },
);

export async function getInvestmentDiscoveryDashboard() {
  return loadInvestmentDiscoveries();
}
