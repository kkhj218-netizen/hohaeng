import "server-only";

import { inflateRawSync } from "node:zlib";
import { unstable_cache } from "next/cache";

export type DartAnalysisKind =
  | "treasury-acquire"
  | "treasury-dispose"
  | "rights-offering"
  | "convertible-bond"
  | "bond-with-warrant";

export type DartAnalysisMetric = {
  label: string;
  value: string;
  description?: string;
  attention?: boolean;
};

export type DartDisclosureAnalysis = {
  kind: DartAnalysisKind;
  kindLabel: string;
  company: string;
  stockCode: string;
  receiptNo: string;
  filingDate: string;
  sourceUrl: string;
  headline: string;
  metrics: DartAnalysisMetric[];
  fundingPurposes: Array<{ label: string; value: string }>;
  checkpoints: string[];
  cacheNote: string;
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

const KIND_LABELS: Record<DartAnalysisKind, string> = {
  "treasury-acquire": "자기주식 취득",
  "treasury-dispose": "자기주식 처분",
  "rights-offering": "유상증자",
  "convertible-bond": "전환사채(CB)",
  "bond-with-warrant": "신주인수권부사채(BW)",
};

const ENDPOINTS: Record<DartAnalysisKind, string> = {
  "treasury-acquire": "tsstkAqDecsn.json",
  "treasury-dispose": "tsstkDpDecsn.json",
  "rights-offering": "piicDecsn.json",
  "convertible-bond": "cvbdIsDecsn.json",
  "bond-with-warrant": "bdwtIsDecsn.json",
};

export function detectDartAnalysisKind(reportName: string): DartAnalysisKind | null {
  const name = reportName.replaceAll(" ", "");

  if (name.includes("자기주식취득") && !name.includes("신탁계약")) {
    return "treasury-acquire";
  }
  if (name.includes("자기주식처분")) return "treasury-dispose";
  if (name.includes("유상증자") && !name.includes("유무상증자")) {
    return "rights-offering";
  }
  if (name.includes("전환사채권발행") || name.includes("전환사채발행")) {
    return "convertible-bond";
  }
  if (name.includes("신주인수권부사채권발행") || name.includes("신주인수권부사채발행")) {
    return "bond-with-warrant";
  }

  return null;
}

export function isDartAnalysisKind(value: string | undefined): value is DartAnalysisKind {
  return Boolean(value && value in KIND_LABELS);
}

function cleanNumber(value: unknown): number | null {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value !== "string") return null;
  const cleaned = value.replaceAll(",", "").replaceAll("원", "").replaceAll("주", "").trim();
  if (!cleaned || cleaned === "-" || cleaned === "-") return null;
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : null;
}

function cleanText(value: unknown): string | null {
  if (typeof value !== "string" && typeof value !== "number") return null;
  const text = String(value).trim();
  return text && text !== "-" ? text : null;
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

function formatShares(value: number | null): string {
  return value === null ? "확인되지 않음" : `${value.toLocaleString("ko-KR")}주`;
}

function formatPercent(value: number | null): string {
  return value === null
    ? "확인되지 않음"
    : `${value.toLocaleString("ko-KR", { maximumFractionDigits: 2 })}%`;
}

function percentValue(value: unknown): number | null {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value !== "string") return null;
  const cleaned = value.replace("%", "").replaceAll(",", "").trim();
  if (!cleaned || cleaned === "-") return null;
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : null;
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
  return match?.[1] ? decodeXml(match[1]) : "";
}

function unzipFirstXml(buffer: Buffer): string {
  let eocdOffset = -1;
  for (let offset = buffer.length - 22; offset >= Math.max(0, buffer.length - 65_557); offset -= 1) {
    if (buffer.readUInt32LE(offset) === 0x06054b50) {
      eocdOffset = offset;
      break;
    }
  }
  if (eocdOffset < 0) throw new Error("OpenDART 고유번호 ZIP 구조를 읽을 수 없습니다.");

  const centralOffset = buffer.readUInt32LE(eocdOffset + 16);
  if (buffer.readUInt32LE(centralOffset) !== 0x02014b50) {
    throw new Error("OpenDART 고유번호 중앙 디렉터리를 찾지 못했습니다.");
  }

  const compression = buffer.readUInt16LE(centralOffset + 10);
  const compressedSize = buffer.readUInt32LE(centralOffset + 20);
  const localOffset = buffer.readUInt32LE(centralOffset + 42);
  if (buffer.readUInt32LE(localOffset) !== 0x04034b50) {
    throw new Error("OpenDART 고유번호 파일 헤더를 찾지 못했습니다.");
  }

  const filenameLength = buffer.readUInt16LE(localOffset + 26);
  const extraLength = buffer.readUInt16LE(localOffset + 28);
  const dataStart = localOffset + 30 + filenameLength + extraLength;
  const compressed = buffer.subarray(dataStart, dataStart + compressedSize);

  const uncompressed = compression === 0 ? compressed : compression === 8 ? inflateRawSync(compressed) : null;
  if (!uncompressed) throw new Error(`지원하지 않는 OpenDART ZIP 압축 방식입니다. (${compression})`);
  return new TextDecoder("utf-8").decode(uncompressed);
}

const loadListedCorpMap = unstable_cache(
  async (): Promise<Record<string, string>> => {
    const apiKey = process.env.DART_API_KEY?.trim();
    if (!apiKey) return {};

    const response = await fetch(
      `https://opendart.fss.or.kr/api/corpCode.xml?crtfc_key=${encodeURIComponent(apiKey)}`,
      {
        cache: "no-store",
        signal: AbortSignal.timeout(DART_TIMEOUT_MS),
      },
    );
    if (!response.ok) throw new Error(`OpenDART 고유번호 요청 실패 (${response.status})`);

    const xml = unzipFirstXml(Buffer.from(await response.arrayBuffer()));
    const map: Record<string, string> = {};
    for (const match of xml.matchAll(/<list>([\s\S]*?)<\/list>/gi)) {
      const block = match[1];
      const stockCode = xmlTag(block, "stock_code");
      const corpCode = xmlTag(block, "corp_code");
      if (/^\d{6}$/.test(stockCode) && /^\d{8}$/.test(corpCode)) {
        map[stockCode] = corpCode;
      }
    }
    return map;
  },
  ["hohaeng-dart-listed-corp-map-v1"],
  { revalidate: CORP_MAP_CACHE_SECONDS },
);

async function fetchStructuredRows(
  corpCode: string,
  date: string,
  kind: DartAnalysisKind,
): Promise<RawDartRow[]> {
  const apiKey = process.env.DART_API_KEY?.trim();
  if (!apiKey) throw new Error("DART_API_KEY가 설정되지 않았습니다.");

  const params = new URLSearchParams({
    crtfc_key: apiKey,
    corp_code: corpCode,
    bgn_de: date,
    end_de: date,
  });

  const response = await fetch(
    `https://opendart.fss.or.kr/api/${ENDPOINTS[kind]}?${params}`,
    {
      cache: "no-store",
      signal: AbortSignal.timeout(DART_TIMEOUT_MS),
    },
  );
  if (!response.ok) throw new Error(`OpenDART 상세 요청 실패 (${response.status})`);

  const payload = (await response.json()) as RawDartResponse;
  if (payload.status === "013") return [];
  if (payload.status && payload.status !== "000") {
    throw new Error(payload.message || `OpenDART 상태 ${payload.status}`);
  }
  return payload.list ?? [];
}

function fundingPurposes(row: RawDartRow) {
  const items: Array<[string, unknown]> = [
    ["시설자금", row.fdpp_fclt],
    ["영업양수자금", row.fdpp_bsninh],
    ["운영자금", row.fdpp_op],
    ["채무상환자금", row.fdpp_dtrp],
    ["타법인 증권 취득", row.fdpp_ocsa],
    ["기타", row.fdpp_etc],
  ];

  return items
    .map(([label, raw]) => ({ label, amount: cleanNumber(raw) }))
    .filter((item): item is { label: string; amount: number } => Boolean(item.amount && item.amount > 0))
    .map((item) => ({ label: item.label, value: formatKrw(item.amount) }));
}

function buildTreasuryAcquire(
  row: RawDartRow,
  base: Omit<DartDisclosureAnalysis, "headline" | "metrics" | "fundingPurposes" | "checkpoints">,
): DartDisclosureAnalysis {
  const shares = cleanNumber(row.aqpln_stk_ostk);
  const amount = cleanNumber(row.aqpln_prc_ostk);
  const purpose = cleanText(row.aq_pp);
  const method = cleanText(row.aq_mth);
  const previousRatio = percentValue(row.aq_wtn_div_ostk_rt);

  return {
    ...base,
    headline: amount !== null ? `취득예정금액 ${formatKrw(amount)}` : "자기주식 취득 결정",
    metrics: [
      { label: "취득예정주식", value: formatShares(shares) },
      { label: "취득예정금액", value: formatKrw(amount), attention: true },
      { label: "취득 전 자기주식 비율", value: formatPercent(previousRatio) },
      { label: "취득방법", value: method ?? "공시 원문 확인" },
    ],
    fundingPurposes: [],
    checkpoints: [
      purpose ? `취득 목적: ${purpose}` : "취득 목적은 공시 원문에서 확인하세요.",
      row.aqexpd_bgd && row.aqexpd_edd
        ? `예상 취득기간: ${String(row.aqexpd_bgd)} ~ ${String(row.aqexpd_edd)}`
        : "예상 취득기간을 확인하세요.",
      "자기주식 취득 결정은 실제 취득 완료와 다를 수 있으므로 후속 결과 공시도 함께 확인해야 합니다.",
    ],
  };
}

function buildTreasuryDispose(
  row: RawDartRow,
  base: Omit<DartDisclosureAnalysis, "headline" | "metrics" | "fundingPurposes" | "checkpoints">,
): DartDisclosureAnalysis {
  const shares = cleanNumber(row.dppln_stk_ostk);
  const amount = cleanNumber(row.dppln_prc_ostk);
  const purpose = cleanText(row.dp_pp);
  const previousRatio = percentValue(row.aq_wtn_div_ostk_rt);

  return {
    ...base,
    headline: amount !== null ? `처분예정금액 ${formatKrw(amount)}` : "자기주식 처분 결정",
    metrics: [
      { label: "처분예정주식", value: formatShares(shares) },
      { label: "처분예정금액", value: formatKrw(amount), attention: true },
      { label: "처분 전 자기주식 비율", value: formatPercent(previousRatio) },
      { label: "처분 대상 주식가격", value: formatKrw(cleanNumber(row.dpstk_prc_ostk)) },
    ],
    fundingPurposes: [],
    checkpoints: [
      purpose ? `처분 목적: ${purpose}` : "처분 목적은 공시 원문에서 확인하세요.",
      row.dpprpd_bgd && row.dpprpd_edd
        ? `예상 처분기간: ${String(row.dpprpd_bgd)} ~ ${String(row.dpprpd_edd)}`
        : "예상 처분기간을 확인하세요.",
      "처분 방식과 실제 처분 완료 여부는 후속 공시에서 다시 확인하는 것이 좋습니다.",
    ],
  };
}

function buildRightsOffering(
  row: RawDartRow,
  base: Omit<DartDisclosureAnalysis, "headline" | "metrics" | "fundingPurposes" | "checkpoints">,
): DartDisclosureAnalysis {
  const newShares = (cleanNumber(row.nstk_ostk_cnt) ?? 0) + (cleanNumber(row.nstk_estk_cnt) ?? 0);
  const existingShares =
    (cleanNumber(row.bfic_tisstk_ostk) ?? 0) + (cleanNumber(row.bfic_tisstk_estk) ?? 0);
  const newToExisting = existingShares > 0 ? (newShares / existingShares) * 100 : null;
  const dilution = existingShares + newShares > 0 ? (newShares / (existingShares + newShares)) * 100 : null;
  const purposes = fundingPurposes(row);
  const totalFunding = purposes.reduce((sum, item) => {
    const raw = item.value.replaceAll(",", "");
    return sum + (Number(raw.replace(/[^0-9.]/g, "")) || 0);
  }, 0);

  return {
    ...base,
    headline: newToExisting !== null
      ? `기존 발행주식 대비 신주 ${formatPercent(newToExisting)}`
      : "유상증자 결정",
    metrics: [
      { label: "신규 발행주식", value: formatShares(newShares || null), attention: true },
      { label: "증자 전 발행주식", value: formatShares(existingShares || null) },
      {
        label: "기존주식 대비 신주 비율",
        value: formatPercent(newToExisting),
        description: "신규 발행주식 ÷ 증자 전 발행주식",
        attention: true,
      },
      {
        label: "단순 추정 지분 희석폭",
        value: formatPercent(dilution),
        description: "신주가 전량 발행된다고 가정한 단순 계산",
        attention: true,
      },
      { label: "증자방식", value: cleanText(row.ic_mthn) ?? "공시 원문 확인" },
      ...(totalFunding > 0 ? [] : []),
    ],
    fundingPurposes: purposes,
    checkpoints: [
      "희석률 계산은 공시된 발행주식수만 이용한 단순 계산이며 실제 주주별 영향은 배정방식에 따라 달라집니다.",
      "발행가액·납입일·신주 상장일과 자금 사용 목적을 함께 확인하세요.",
      "정정공시가 나오면 발행주식수와 조건이 바뀔 수 있습니다.",
    ],
  };
}

function buildConvertibleBond(
  row: RawDartRow,
  base: Omit<DartDisclosureAnalysis, "headline" | "metrics" | "fundingPurposes" | "checkpoints">,
): DartDisclosureAnalysis {
  const amount = cleanNumber(row.bd_fta);
  const conversionShares = cleanNumber(row.cvisstk_cnt);
  const conversionRatio = percentValue(row.cvisstk_tisstk_vs);
  const conversionPrice = cleanNumber(row.cv_prc);
  const lowerPrice = cleanNumber(row.act_mktprcfl_cvprc_lwtrsprc);

  return {
    ...base,
    headline: conversionRatio !== null
      ? `전환 가능 주식총수 비율 ${formatPercent(conversionRatio)}`
      : amount !== null
        ? `발행총액 ${formatKrw(amount)}`
        : "전환사채 발행 결정",
    metrics: [
      { label: "사채 발행총액", value: formatKrw(amount), attention: true },
      { label: "전환가액", value: formatKrw(conversionPrice) },
      { label: "전환 가능 주식수", value: formatShares(conversionShares) },
      { label: "주식총수 대비 비율", value: formatPercent(conversionRatio), attention: true },
      { label: "표면이자율", value: cleanText(row.bd_intr_ex) ? `${cleanText(row.bd_intr_ex)}%` : "확인되지 않음" },
      { label: "최저 조정가액", value: formatKrw(lowerPrice) },
    ],
    fundingPurposes: fundingPurposes(row),
    checkpoints: [
      cleanText(row.bd_mtd) ? `사채 만기일: ${cleanText(row.bd_mtd)}` : "사채 만기일을 확인하세요.",
      "주식총수 대비 비율은 전환이 실제로 이뤄질 경우의 잠재 주식수 증가를 판단하는 핵심 값입니다.",
      lowerPrice !== null
        ? "리픽싱(전환가액 조정) 조건이 있으므로 최저 조정가액과 조정 조건을 함께 확인하세요."
        : "전환가액 조정 조건 유무를 공시 원문에서 확인하세요.",
    ],
  };
}

function buildBondWithWarrant(
  row: RawDartRow,
  base: Omit<DartDisclosureAnalysis, "headline" | "metrics" | "fundingPurposes" | "checkpoints">,
): DartDisclosureAnalysis {
  const amount = cleanNumber(row.bd_fta);
  const exerciseShares = cleanNumber(row.nstk_isstk_cnt);
  const exerciseRatio = percentValue(row.nstk_isstk_tisstk_vs);
  const exercisePrice = cleanNumber(row.ex_prc);
  const lowerPrice = cleanNumber(row.act_mktprcfl_cvprc_lwtrsprc);

  return {
    ...base,
    headline: exerciseRatio !== null
      ? `신주인수권 행사 가능 비율 ${formatPercent(exerciseRatio)}`
      : amount !== null
        ? `발행총액 ${formatKrw(amount)}`
        : "신주인수권부사채 발행 결정",
    metrics: [
      { label: "사채 발행총액", value: formatKrw(amount), attention: true },
      { label: "행사가액", value: formatKrw(exercisePrice) },
      { label: "행사 가능 주식수", value: formatShares(exerciseShares) },
      { label: "주식총수 대비 비율", value: formatPercent(exerciseRatio), attention: true },
      { label: "표면이자율", value: cleanText(row.bd_intr_ex) ? `${cleanText(row.bd_intr_ex)}%` : "확인되지 않음" },
      { label: "최저 조정가액", value: formatKrw(lowerPrice) },
    ],
    fundingPurposes: fundingPurposes(row),
    checkpoints: [
      cleanText(row.bd_mtd) ? `사채 만기일: ${cleanText(row.bd_mtd)}` : "사채 만기일을 확인하세요.",
      cleanText(row.bdwt_div_atn)
        ? `사채와 신주인수권 분리 여부: ${cleanText(row.bdwt_div_atn)}`
        : "사채와 신주인수권 분리 여부를 확인하세요.",
      "주식총수 대비 비율과 행사가액 조정 조건은 기존 주주의 잠재 희석을 판단할 때 핵심적으로 볼 수치입니다.",
    ],
  };
}

const loadAnalysis = unstable_cache(
  async (
    stockCode: string,
    receiptNo: string,
    kind: DartAnalysisKind,
  ): Promise<DartDisclosureAnalysis | null> => {
    if (!/^\d{6}$/.test(stockCode)) return null;
    const date = compactDateFromReceipt(receiptNo);
    if (!date) return null;

    const corpMap = await loadListedCorpMap();
    const corpCode = corpMap[stockCode];
    if (!corpCode) return null;

    const rows = await fetchStructuredRows(corpCode, date, kind);
    const row = rows.find((item) => String(item.rcept_no ?? "").trim() === receiptNo) ?? null;
    if (!row) return null;

    const company = cleanText(row.corp_name) ?? stockCode;
    const base = {
      kind,
      kindLabel: KIND_LABELS[kind],
      company,
      stockCode,
      receiptNo,
      filingDate: displayDate(date),
      sourceUrl: `https://dart.fss.or.kr/dsaf001/main.do?rcpNo=${encodeURIComponent(receiptNo)}`,
      cacheNote: "상세 분석은 사용자가 열 때만 OpenDART를 조회하고 동일 공시는 7일간 캐시합니다.",
    };

    if (kind === "treasury-acquire") return buildTreasuryAcquire(row, base);
    if (kind === "treasury-dispose") return buildTreasuryDispose(row, base);
    if (kind === "rights-offering") return buildRightsOffering(row, base);
    if (kind === "convertible-bond") return buildConvertibleBond(row, base);
    return buildBondWithWarrant(row, base);
  },
  ["hohaeng-dart-disclosure-analysis-v1"],
  { revalidate: DETAIL_CACHE_SECONDS },
);

export async function getDartDisclosureAnalysis(
  stockCode: string,
  receiptNo: string,
  kind: DartAnalysisKind,
) {
  return loadAnalysis(stockCode, receiptNo, kind);
}
