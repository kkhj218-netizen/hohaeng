import "server-only";

import { inflateRawSync } from "node:zlib";
import { unstable_cache } from "next/cache";

import {
  detectDartAnalysisKind as detectV1DartAnalysisKind,
  getDartDisclosureAnalysis as getV1DartDisclosureAnalysis,
  isDartAnalysisKind as isV1DartAnalysisKind,
  type DartAnalysisKind as DartAnalysisKindV1,
  type DartDisclosureAnalysis,
} from "@/app/lib/dartDisclosureDetail";

export type DartAnalysisKind =
  | DartAnalysisKindV1
  | "supply-contract"
  | "stock-cancellation"
  | "treasury-trust"
  | "treasury-trust-cancel";

export type DartDisclosureAnalysisV2 = Omit<DartDisclosureAnalysis, "kind"> & {
  kind: DartAnalysisKind;
  dataMode: "structured" | "document";
};

type RawDartRow = Record<string, string | number | null | undefined>;
type RawDartResponse = {
  status?: string;
  message?: string;
  list?: RawDartRow[];
};

const DART_TIMEOUT_MS = 12_000;
const DETAIL_CACHE_SECONDS = 7 * 24 * 60 * 60;
const CORP_MAP_CACHE_SECONDS = 7 * 24 * 60 * 60;

const EXTRA_KIND_LABELS = {
  "supply-contract": "단일판매·공급계약",
  "stock-cancellation": "주식소각",
  "treasury-trust": "자기주식 신탁계약 체결",
  "treasury-trust-cancel": "자기주식 신탁계약 해지",
} as const;

const STRUCTURED_ENDPOINTS: Partial<Record<DartAnalysisKind, string>> = {
  "treasury-trust": "tsstkAqTrctrCnsDecsn.json",
  "treasury-trust-cancel": "tsstkAqTrctrCcDecsn.json",
};

export function detectDartAnalysisKind(reportName: string): DartAnalysisKind | null {
  const name = reportName.replace(/\s+/g, "");

  if (name.includes("단일판매") && name.includes("공급계약")) {
    return "supply-contract";
  }
  if (name.includes("주식소각결정")) return "stock-cancellation";
  if (name.includes("자기주식취득신탁계약체결")) return "treasury-trust";
  if (name.includes("자기주식취득신탁계약해지")) return "treasury-trust-cancel";

  return detectV1DartAnalysisKind(reportName);
}

export function isDartAnalysisKind(value: string | undefined): value is DartAnalysisKind {
  if (!value) return false;
  if (value in EXTRA_KIND_LABELS) return true;
  return isV1DartAnalysisKind(value);
}

function cleanNumber(value: unknown): number | null {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value !== "string") return null;
  const match = value.replaceAll(",", "").match(/-?\d+(?:\.\d+)?/);
  if (!match) return null;
  const parsed = Number(match[0]);
  return Number.isFinite(parsed) ? parsed : null;
}

function cleanText(value: unknown): string | null {
  if (typeof value !== "string" && typeof value !== "number") return null;
  const text = String(value).replace(/\s+/g, " ").trim();
  return text && text !== "-" ? text : null;
}

function percentValue(value: unknown): number | null {
  return cleanNumber(value);
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
  return `${sign}${absolute.toLocaleString("ko-KR")}원`;
}

function formatShares(value: number | null): string {
  return value === null ? "확인되지 않음" : `${value.toLocaleString("ko-KR")}주`;
}

function formatPercent(value: number | null): string {
  return value === null
    ? "확인되지 않음"
    : `${value.toLocaleString("ko-KR", { maximumFractionDigits: 2 })}%`;
}

function compactDateFromReceipt(receiptNo: string): string | null {
  const digits = receiptNo.replace(/\D/g, "");
  if (digits.length < 8) return null;
  const date = digits.slice(0, 8);
  return /^20\d{6}$/.test(date) ? date : null;
}

function displayDate(compact: string): string {
  return `${compact.slice(0, 4)}-${compact.slice(4, 6)}-${compact.slice(6, 8)}`;
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
  return value.replace(/\s+/g, "").replace(/[()（）\[\]ㆍ·:：]/g, "").toLowerCase();
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
    return [decodeTextBuffer(buffer)];
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
  const texts: string[] = [];

  for (let index = 0; index < entryCount; index += 1) {
    if (centralOffset + 46 > buffer.length || buffer.readUInt32LE(centralOffset) !== 0x02014b50) break;

    const compression = buffer.readUInt16LE(centralOffset + 10);
    const compressedSize = buffer.readUInt32LE(centralOffset + 20);
    const filenameLength = buffer.readUInt16LE(centralOffset + 28);
    const extraLength = buffer.readUInt16LE(centralOffset + 30);
    const commentLength = buffer.readUInt16LE(centralOffset + 32);
    const localOffset = buffer.readUInt32LE(centralOffset + 42);

    if (localOffset + 30 <= buffer.length && buffer.readUInt32LE(localOffset) === 0x04034b50) {
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
      if (decoded) texts.push(decodeTextBuffer(decoded));
    }

    centralOffset += 46 + filenameLength + extraLength + commentLength;
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

function nextText(cells: string[], index: number, maxLookahead = 8): string | null {
  for (let offset = 1; offset <= maxLookahead && index + offset < cells.length; offset += 1) {
    const value = cleanText(cells[index + offset]);
    if (value) return value;
  }
  return null;
}

function nextNumber(cells: string[], index: number, maxLookahead = 8): number | null {
  for (let offset = 1; offset <= maxLookahead && index + offset < cells.length; offset += 1) {
    const value = cleanNumber(cells[index + offset]);
    if (value !== null) return value;
  }
  return null;
}

function fieldText(cells: string[], labels: string[], maxLookahead = 8): string | null {
  const index = findLabelIndex(cells, labels);
  return index >= 0 ? nextText(cells, index, maxLookahead) : null;
}

function fieldNumber(cells: string[], labels: string[], maxLookahead = 8): number | null {
  const index = findLabelIndex(cells, labels);
  return index >= 0 ? nextNumber(cells, index, maxLookahead) : null;
}

function nestedText(
  cells: string[],
  sectionLabels: string[],
  fieldLabels: string[],
  sectionWindow = 24,
): string | null {
  const sectionIndex = findLabelIndex(cells, sectionLabels);
  if (sectionIndex < 0) return null;
  const fieldIndex = findLabelIndex(cells, fieldLabels, sectionIndex + 1, sectionIndex + sectionWindow);
  return fieldIndex >= 0 ? nextText(cells, fieldIndex, 6) : null;
}

function nestedNumber(
  cells: string[],
  sectionLabels: string[],
  fieldLabels: string[],
  sectionWindow = 24,
): number | null {
  const sectionIndex = findLabelIndex(cells, sectionLabels);
  if (sectionIndex < 0) return null;
  const fieldIndex = findLabelIndex(cells, fieldLabels, sectionIndex + 1, sectionIndex + sectionWindow);
  return fieldIndex >= 0 ? nextNumber(cells, fieldIndex, 6) : null;
}

function extractCompanyName(documentText: string, stockCode: string): string {
  const patterns = [
    /<COMPANY-NAME\b[^>]*>([\s\S]*?)<\/COMPANY-NAME>/i,
    /<CORP-NAME\b[^>]*>([\s\S]*?)<\/CORP-NAME>/i,
  ];
  for (const pattern of patterns) {
    const match = documentText.match(pattern);
    const value = match?.[1] ? normalizeCell(match[1]) : "";
    if (value) return value;
  }
  return stockCode;
}

async function fetchDocumentText(receiptNo: string): Promise<string> {
  const apiKey = process.env.DART_API_KEY?.trim();
  if (!apiKey) throw new Error("DART_API_KEY가 설정되지 않았습니다.");

  const params = new URLSearchParams({ crtfc_key: apiKey, rcept_no: receiptNo });
  const response = await fetch(`https://opendart.fss.or.kr/api/document.xml?${params}`, {
    cache: "no-store",
    signal: AbortSignal.timeout(DART_TIMEOUT_MS),
  });
  if (!response.ok) throw new Error(`OpenDART 원문 요청 실패 (${response.status})`);

  const buffer = Buffer.from(await response.arrayBuffer());
  const texts = unzipTextEntries(buffer);
  const joined = texts.join("\n");
  if (/<(?:status)>0(?:10|11|12|13|14|20|21|100|101|800|900|901)<\/(?:status)>/i.test(joined)) {
    throw new Error("OpenDART 원문을 불러오지 못했습니다.");
  }
  return joined;
}

function buildSupplyContract(
  stockCode: string,
  receiptNo: string,
  filingDate: string,
  documentText: string,
): DartDisclosureAnalysisV2 {
  const cells = extractCells(documentText);
  const contractAmount = fieldNumber(cells, ["계약금액(원)", "계약금액"]);
  const recentSales = fieldNumber(cells, ["최근매출액(원)", "최근 매출액(원)", "최근매출액"]);
  const reportedRatio = fieldNumber(cells, ["매출액대비(%)", "매출액 대비(%)", "매출액대비"]);
  const calculatedRatio =
    contractAmount !== null && recentSales !== null && recentSales !== 0
      ? (contractAmount / recentSales) * 100
      : null;
  const counterparty = fieldText(cells, ["계약상대", "계약상대방"]);
  const contractContent = fieldText(cells, ["계약내용", "판매ㆍ공급계약내용", "판매·공급계약내용"]);
  const startDate = nestedText(cells, ["계약기간"], ["시작일"]);
  const endDate = nestedText(cells, ["계약기간"], ["종료일"]);
  const ratio = calculatedRatio ?? reportedRatio;

  return {
    kind: "supply-contract",
    kindLabel: EXTRA_KIND_LABELS["supply-contract"],
    company: extractCompanyName(documentText, stockCode),
    stockCode,
    receiptNo,
    filingDate,
    sourceUrl: `https://dart.fss.or.kr/dsaf001/main.do?rcpNo=${encodeURIComponent(receiptNo)}`,
    headline:
      ratio !== null
        ? `최근 매출 대비 계약 규모 ${formatPercent(ratio)}`
        : contractAmount !== null
          ? `계약금액 ${formatKrw(contractAmount)}`
          : "단일판매·공급계약 체결",
    metrics: [
      { label: "계약금액", value: formatKrw(contractAmount), attention: true },
      { label: "최근 매출액", value: formatKrw(recentSales) },
      {
        label: "매출 대비 계약 규모",
        value: formatPercent(calculatedRatio ?? reportedRatio),
        description:
          calculatedRatio !== null
            ? "계약금액 ÷ 최근 매출액으로 다시 계산한 값"
            : "공시 원문에 기재된 비율",
        attention: true,
      },
      { label: "공시 기재 비율", value: formatPercent(reportedRatio) },
      { label: "계약상대방", value: counterparty ?? "공시 원문 확인" },
      {
        label: "계약기간",
        value: startDate && endDate ? `${startDate} ~ ${endDate}` : "공시 원문 확인",
      },
    ],
    fundingPurposes: [],
    checkpoints: [
      contractContent ? `계약 내용: ${contractContent}` : "계약 내용과 공급 품목을 원문에서 확인하세요.",
      "매출 대비 계약 규모가 크더라도 계약기간이 길면 연간 실적 기여도는 달라질 수 있습니다.",
      "계약 상대방, 계약 해지·변경 조건, 정정공시 여부를 함께 확인하세요.",
    ],
    cacheNote:
      "공급계약 원문은 사용자가 상세 분석을 열 때만 OpenDART에서 일시적으로 읽고, 파일 자체는 저장하지 않으며 동일 공시는 7일간 캐시합니다.",
    dataMode: "document",
  };
}

function buildStockCancellation(
  stockCode: string,
  receiptNo: string,
  filingDate: string,
  documentText: string,
): DartDisclosureAnalysisV2 {
  const cells = extractCells(documentText);
  const cancelShares = nestedNumber(
    cells,
    ["소각할주식의종류와수", "소각할 주식의 종류와 수"],
    ["보통주식(주)", "보통주식"],
  );
  const totalShares = nestedNumber(
    cells,
    ["발행주식총수", "발행 주식 총수"],
    ["보통주식(주)", "보통주식"],
  );
  const cancellationRatio =
    cancelShares !== null && totalShares !== null && totalShares !== 0
      ? (cancelShares / totalShares) * 100
      : null;
  const cancellationAmount = fieldNumber(cells, ["소각예정금액(원)", "소각 예정금액(원)"]);
  const cancellationDate = fieldText(cells, ["소각예정일", "소각 예정일"]);
  const acquisitionMethod = fieldText(cells, ["소각할주식의취득방법", "소각할 주식의 취득방법"]);

  return {
    kind: "stock-cancellation",
    kindLabel: EXTRA_KIND_LABELS["stock-cancellation"],
    company: extractCompanyName(documentText, stockCode),
    stockCode,
    receiptNo,
    filingDate,
    sourceUrl: `https://dart.fss.or.kr/dsaf001/main.do?rcpNo=${encodeURIComponent(receiptNo)}`,
    headline:
      cancellationRatio !== null
        ? `발행주식총수 대비 ${formatPercent(cancellationRatio)} 소각`
        : cancelShares !== null
          ? `${formatShares(cancelShares)} 소각 결정`
          : "주식소각 결정",
    metrics: [
      { label: "소각 예정 주식", value: formatShares(cancelShares), attention: true },
      { label: "발행주식총수", value: formatShares(totalShares) },
      {
        label: "발행주식 대비 소각 비율",
        value: formatPercent(cancellationRatio),
        description: "소각 예정 주식수 ÷ 발행주식총수",
        attention: true,
      },
      { label: "소각 예정금액", value: formatKrw(cancellationAmount) },
      { label: "소각 예정일", value: cancellationDate ?? "공시 원문 확인" },
      { label: "취득 방법", value: acquisitionMethod ?? "공시 원문 확인" },
    ],
    fundingPurposes: [],
    checkpoints: [
      "기취득 자기주식 소각인지, 감자를 수반하는 소각인지 원문 설명을 확인하세요.",
      "발행주식수 감소 폭은 주당 지표 변화에 영향을 줄 수 있지만 주가 상승을 보장하는 신호는 아닙니다.",
      "소각 예정일과 실제 소각 완료 여부, 정정공시를 함께 확인하세요.",
    ],
    cacheNote:
      "주식소각 원문은 상세 분석을 열 때만 OpenDART에서 일시적으로 읽고, 원본 파일은 DB에 저장하지 않으며 동일 공시는 7일간 캐시합니다.",
    dataMode: "document",
  };
}

function xmlTag(block: string, tag: string): string {
  const match = block.match(new RegExp(`<${tag}>([\\s\\S]*?)<\\/${tag}>`, "i"));
  return match?.[1] ? normalizeCell(match[1]) : "";
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
  ["hohaeng-dart-listed-corp-map-v2"],
  { revalidate: CORP_MAP_CACHE_SECONDS },
);

async function fetchStructuredRows(
  corpCode: string,
  date: string,
  kind: "treasury-trust" | "treasury-trust-cancel",
): Promise<RawDartRow[]> {
  const apiKey = process.env.DART_API_KEY?.trim();
  if (!apiKey) throw new Error("DART_API_KEY가 설정되지 않았습니다.");

  const endpoint = STRUCTURED_ENDPOINTS[kind];
  if (!endpoint) return [];

  const params = new URLSearchParams({
    crtfc_key: apiKey,
    corp_code: corpCode,
    bgn_de: date,
    end_de: date,
  });
  const response = await fetch(`https://opendart.fss.or.kr/api/${endpoint}?${params}`, {
    cache: "no-store",
    signal: AbortSignal.timeout(DART_TIMEOUT_MS),
  });
  if (!response.ok) throw new Error(`OpenDART 상세 요청 실패 (${response.status})`);

  const payload = (await response.json()) as RawDartResponse;
  if (payload.status === "013") return [];
  if (payload.status && payload.status !== "000") {
    throw new Error(payload.message || `OpenDART 상태 ${payload.status}`);
  }
  return payload.list ?? [];
}

function buildTrust(
  row: RawDartRow,
  stockCode: string,
  receiptNo: string,
  filingDate: string,
): DartDisclosureAnalysisV2 {
  const amount = cleanNumber(row.ctr_prc);
  const purpose = cleanText(row.ctr_pp);
  const institution = cleanText(row.ctr_cns_int);
  const existingTreasuryRatio = percentValue(row.aq_wtn_div_ostk_rt);

  return {
    kind: "treasury-trust",
    kindLabel: EXTRA_KIND_LABELS["treasury-trust"],
    company: cleanText(row.corp_name) ?? stockCode,
    stockCode,
    receiptNo,
    filingDate,
    sourceUrl: `https://dart.fss.or.kr/dsaf001/main.do?rcpNo=${encodeURIComponent(receiptNo)}`,
    headline: amount !== null ? `신탁계약 금액 ${formatKrw(amount)}` : "자기주식 취득 신탁계약 체결",
    metrics: [
      { label: "계약금액", value: formatKrw(amount), attention: true },
      { label: "계약기관", value: institution ?? "공시 원문 확인" },
      {
        label: "계약기간",
        value:
          cleanText(row.ctr_pd_bgd) && cleanText(row.ctr_pd_edd)
            ? `${cleanText(row.ctr_pd_bgd)} ~ ${cleanText(row.ctr_pd_edd)}`
            : "공시 원문 확인",
      },
      { label: "체결 예정일", value: cleanText(row.ctr_cns_prd) ?? "공시 원문 확인" },
      { label: "계약 전 자기주식 비율", value: formatPercent(existingTreasuryRatio) },
      { label: "위탁투자중개업자", value: cleanText(row.cs_iv_bk) ?? "공시 원문 확인" },
    ],
    fundingPurposes: [],
    checkpoints: [
      purpose ? `계약 목적: ${purpose}` : "신탁계약 체결 목적을 확인하세요.",
      "신탁계약 체결 금액은 실제 자기주식 취득 완료 금액과 다를 수 있어 후속 취득 결과를 함께 봐야 합니다.",
      "계약기간, 계약기관, 기존 자기주식 보유비율을 함께 확인하면 주주환원 규모를 이해하기 쉽습니다.",
    ],
    cacheNote: "신탁계약 상세 수치는 사용자가 열 때만 OpenDART 구조화 API를 조회하고 동일 공시는 7일간 캐시합니다.",
    dataMode: "structured",
  };
}

function buildTrustCancel(
  row: RawDartRow,
  stockCode: string,
  receiptNo: string,
  filingDate: string,
): DartDisclosureAnalysisV2 {
  const beforeAmount = cleanNumber(row.ctr_prc_bfcc);
  const afterAmount = cleanNumber(row.ctr_prc_atcc);
  const releasedAmount =
    beforeAmount !== null && afterAmount !== null ? Math.max(0, beforeAmount - afterAmount) : null;
  const purpose = cleanText(row.cc_pp);

  return {
    kind: "treasury-trust-cancel",
    kindLabel: EXTRA_KIND_LABELS["treasury-trust-cancel"],
    company: cleanText(row.corp_name) ?? stockCode,
    stockCode,
    receiptNo,
    filingDate,
    sourceUrl: `https://dart.fss.or.kr/dsaf001/main.do?rcpNo=${encodeURIComponent(receiptNo)}`,
    headline:
      releasedAmount !== null
        ? `해지되는 신탁계약 규모 ${formatKrw(releasedAmount)}`
        : "자기주식 취득 신탁계약 해지",
    metrics: [
      { label: "해지 전 계약금액", value: formatKrw(beforeAmount), attention: true },
      { label: "해지 후 계약금액", value: formatKrw(afterAmount) },
      {
        label: "단순 해지 규모",
        value: formatKrw(releasedAmount),
        description: "해지 전 계약금액 - 해지 후 계약금액",
        attention: true,
      },
      { label: "해지기관", value: cleanText(row.cc_int) ?? "공시 원문 확인" },
      { label: "해지 예정일", value: cleanText(row.cc_prd) ?? "공시 원문 확인" },
      { label: "신탁재산 반환방법", value: cleanText(row.tp_rm_atcc) ?? "공시 원문 확인" },
    ],
    fundingPurposes: [],
    checkpoints: [
      purpose ? `해지 목적: ${purpose}` : "신탁계약 해지 목적을 확인하세요.",
      "신탁계약 해지가 곧 자기주식 매도를 뜻하는 것은 아니므로 신탁재산 반환방법과 보유 주식 처리 계획을 확인하세요.",
      "해지 전 자기주식 보유현황과 후속 자기주식 처분·소각 공시를 함께 보는 것이 좋습니다.",
    ],
    cacheNote: "신탁계약 해지 상세 수치는 사용자가 열 때만 OpenDART 구조화 API를 조회하고 동일 공시는 7일간 캐시합니다.",
    dataMode: "structured",
  };
}

const loadRawAnalysis = unstable_cache(
  async (
    stockCode: string,
    receiptNo: string,
    kind: "supply-contract" | "stock-cancellation",
  ): Promise<DartDisclosureAnalysisV2 | null> => {
    if (!/^\d{6}$/.test(stockCode)) return null;
    const date = compactDateFromReceipt(receiptNo);
    if (!date) return null;

    const documentText = await fetchDocumentText(receiptNo);
    const filingDate = displayDate(date);
    return kind === "supply-contract"
      ? buildSupplyContract(stockCode, receiptNo, filingDate, documentText)
      : buildStockCancellation(stockCode, receiptNo, filingDate, documentText);
  },
  ["hohaeng-dart-raw-disclosure-analysis-v2"],
  { revalidate: DETAIL_CACHE_SECONDS },
);

const loadTrustAnalysis = unstable_cache(
  async (
    stockCode: string,
    receiptNo: string,
    kind: "treasury-trust" | "treasury-trust-cancel",
  ): Promise<DartDisclosureAnalysisV2 | null> => {
    if (!/^\d{6}$/.test(stockCode)) return null;
    const date = compactDateFromReceipt(receiptNo);
    if (!date) return null;

    const corpMap = await loadListedCorpMap();
    const corpCode = corpMap[stockCode];
    if (!corpCode) return null;

    const rows = await fetchStructuredRows(corpCode, date, kind);
    const row = rows.find((item) => String(item.rcept_no ?? "").trim() === receiptNo) ?? null;
    if (!row) return null;

    const filingDate = displayDate(date);
    return kind === "treasury-trust"
      ? buildTrust(row, stockCode, receiptNo, filingDate)
      : buildTrustCancel(row, stockCode, receiptNo, filingDate);
  },
  ["hohaeng-dart-trust-disclosure-analysis-v2"],
  { revalidate: DETAIL_CACHE_SECONDS },
);

export async function getDartDisclosureAnalysis(
  stockCode: string,
  receiptNo: string,
  kind: DartAnalysisKind,
): Promise<DartDisclosureAnalysisV2 | null> {
  if (isV1DartAnalysisKind(kind)) {
    const legacy = await getV1DartDisclosureAnalysis(stockCode, receiptNo, kind);
    return legacy ? { ...legacy, dataMode: "structured" } : null;
  }
  if (kind === "supply-contract" || kind === "stock-cancellation") {
    return loadRawAnalysis(stockCode, receiptNo, kind);
  }
  return loadTrustAnalysis(stockCode, receiptNo, kind);
}
