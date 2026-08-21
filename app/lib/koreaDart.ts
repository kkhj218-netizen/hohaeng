import "server-only";

export type KoreaDisclosure = {
  corpName: string;
  corpCode: string;
  stockCode: string | null;
  reportName: string;
  receiptNo: string;
  receiptDate: string;
  market: "KOSPI" | "KOSDAQ" | "KONEX" | "OTHER";
  importance: number;
  url: string;
};

export type KoreaDisclosureFeed = {
  configured: boolean;
  disclosures: KoreaDisclosure[];
  error: string | null;
};

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
  list?: DartListItem[];
};

const IMPORTANT_KEYWORDS: Array<{ keyword: string; score: number }> = [
  { keyword: "단일판매", score: 100 },
  { keyword: "공급계약", score: 100 },
  { keyword: "유상증자", score: 95 },
  { keyword: "무상증자", score: 90 },
  { keyword: "전환사채", score: 90 },
  { keyword: "신주인수권", score: 90 },
  { keyword: "자기주식", score: 85 },
  { keyword: "최대주주", score: 85 },
  { keyword: "합병", score: 85 },
  { keyword: "분할", score: 85 },
  { keyword: "배당", score: 80 },
  { keyword: "영업(잠정)실적", score: 80 },
  { keyword: "매출액또는손익구조", score: 80 },
  { keyword: "주요사항보고서", score: 70 },
];

function koreaDate(value = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(value);
  const map = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${map.year}${map.month}${map.day}`;
}

function daysAgo(days: number): string {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() - days);
  return koreaDate(date);
}

function marketLabel(value: string | undefined): KoreaDisclosure["market"] {
  if (value === "Y") return "KOSPI";
  if (value === "K") return "KOSDAQ";
  if (value === "N") return "KONEX";
  return "OTHER";
}

function disclosureScore(reportName: string): number {
  for (const item of IMPORTANT_KEYWORDS) {
    if (reportName.includes(item.keyword)) return item.score;
  }
  return 20;
}

export async function getKoreaDisclosures(limit = 8): Promise<KoreaDisclosureFeed> {
  const apiKey = process.env.DART_API_KEY;
  if (!apiKey) {
    return { configured: false, disclosures: [], error: null };
  }

  const params = new URLSearchParams({
    crtfc_key: apiKey,
    bgn_de: daysAgo(7),
    end_de: koreaDate(),
    page_no: "1",
    page_count: "100",
    sort: "date",
    sort_mth: "desc",
  });

  try {
    const response = await fetch(`https://opendart.fss.or.kr/api/list.json?${params}`, {
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    });

    if (!response.ok) {
      return {
        configured: true,
        disclosures: [],
        error: `OpenDART 요청 실패 (${response.status})`,
      };
    }

    const payload = (await response.json()) as DartListResponse;
    if (payload.status && payload.status !== "000") {
      return {
        configured: true,
        disclosures: [],
        error: payload.message || `OpenDART 상태 ${payload.status}`,
      };
    }

    const disclosures = (payload.list ?? [])
      .map((item) => {
        const reportName = item.report_nm?.trim() ?? "";
        const receiptNo = item.rcept_no?.trim() ?? "";
        const market = marketLabel(item.corp_cls);
        if (!reportName || !receiptNo || (market !== "KOSPI" && market !== "KOSDAQ")) {
          return null;
        }

        return {
          corpName: item.corp_name?.trim() || "기업명 미확인",
          corpCode: item.corp_code?.trim() || "",
          stockCode: item.stock_code?.trim() || null,
          reportName,
          receiptNo,
          receiptDate: item.rcept_dt?.trim() || "",
          market,
          importance: disclosureScore(reportName),
          url: `https://dart.fss.or.kr/dsaf001/main.do?rcpNo=${encodeURIComponent(receiptNo)}`,
        } satisfies KoreaDisclosure;
      })
      .filter((item): item is KoreaDisclosure => item !== null)
      .sort((left, right) => {
        const dateOrder = right.receiptDate.localeCompare(left.receiptDate);
        if (dateOrder !== 0) return dateOrder;
        return right.importance - left.importance;
      });

    const important = disclosures.filter((item) => item.importance >= 70);
    return {
      configured: true,
      disclosures: (important.length > 0 ? important : disclosures).slice(0, limit),
      error: null,
    };
  } catch (error) {
    return {
      configured: true,
      disclosures: [],
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
