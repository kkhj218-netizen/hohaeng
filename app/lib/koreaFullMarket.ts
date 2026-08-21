import "server-only";

export type KoreaFullMarketStock = {
  code: string;
  name: string;
  market: "KOSPI" | "KOSDAQ";
  date: string;
  close: number;
  change: number;
  changePercent: number;
  open: number;
  high: number;
  low: number;
  volume: number;
  tradingValue: number;
  listedShares: number | null;
  marketCap: number | null;
};

export type KoreaMarketBreadth = {
  rising: number;
  falling: number;
  flat: number;
  upperLimit: number;
  lowerLimit: number;
};

export type KoreaFullMarketSnapshot = {
  configured: boolean;
  available: boolean;
  date: string | null;
  source: "금융위원회 공공데이터";
  totalStocks: number;
  breadth: KoreaMarketBreadth | null;
  turnoverTop: KoreaFullMarketStock[];
  volumeTop: KoreaFullMarketStock[];
  gainers: KoreaFullMarketStock[];
  losers: KoreaFullMarketStock[];
  marketCapTop: KoreaFullMarketStock[];
  error: string | null;
};

type PublicDataItem = {
  basDt?: string | number;
  srtnCd?: string | number;
  itmsNm?: string;
  mrktCtg?: string;
  clpr?: string | number;
  vs?: string | number;
  fltRt?: string | number;
  mkp?: string | number;
  hipr?: string | number;
  lopr?: string | number;
  trqu?: string | number;
  trPrc?: string | number;
  lstgStCnt?: string | number;
  mrktTotAmt?: string | number;
};

type PublicDataResponse = {
  response?: {
    header?: {
      resultCode?: string;
      resultMsg?: string;
    };
    body?: {
      totalCount?: number | string;
      items?: {
        item?: PublicDataItem[] | PublicDataItem;
      };
    };
  };
};

const ENDPOINT =
  "https://apis.data.go.kr/1160100/service/GetStockSecuritiesInfoService/getStockPriceInfo";

function numberValue(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value !== "string") return 0;
  const parsed = Number(value.replaceAll(",", "").trim());
  return Number.isFinite(parsed) ? parsed : 0;
}

function optionalNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const parsed = numberValue(value);
  return Number.isFinite(parsed) ? parsed : null;
}

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

function candidateDates(days = 9): string[] {
  const now = new Date();
  const result: string[] = [];
  for (let offset = 0; offset < days; offset += 1) {
    const date = new Date(now.getTime() - offset * 86_400_000);
    result.push(koreaDate(date));
  }
  return result;
}

function normalizeItem(item: PublicDataItem): KoreaFullMarketStock | null {
  const market = item.mrktCtg?.trim();
  if (market !== "KOSPI" && market !== "KOSDAQ") return null;

  const code = String(item.srtnCd ?? "").trim().padStart(6, "0");
  const name = item.itmsNm?.trim() ?? "";
  const date = String(item.basDt ?? "").trim();
  if (!code || !name || date.length !== 8) return null;

  return {
    code,
    name,
    market,
    date: `${date.slice(0, 4)}-${date.slice(4, 6)}-${date.slice(6, 8)}`,
    close: numberValue(item.clpr),
    change: numberValue(item.vs),
    changePercent: numberValue(item.fltRt),
    open: numberValue(item.mkp),
    high: numberValue(item.hipr),
    low: numberValue(item.lopr),
    volume: numberValue(item.trqu),
    tradingValue: numberValue(item.trPrc),
    listedShares: optionalNumber(item.lstgStCnt),
    marketCap: optionalNumber(item.mrktTotAmt),
  };
}

function serviceKey(): string | null {
  return (
    process.env.DATA_GO_KR_SERVICE_KEY ||
    process.env.PUBLIC_DATA_SERVICE_KEY ||
    null
  );
}

function serviceKeyPart(key: string): string {
  // 공공데이터포털은 Encoding/Decoding 키를 모두 보여준다. 이미 URL 인코딩된 키는
  // 다시 encodeURIComponent 하지 않아야 한다.
  return key.includes("%") ? key : encodeURIComponent(key);
}

async function fetchDate(key: string, date: string): Promise<{
  rows: KoreaFullMarketStock[];
  error: string | null;
}> {
  const url = `${ENDPOINT}?serviceKey=${serviceKeyPart(
    key,
  )}&numOfRows=4000&pageNo=1&resultType=json&basDt=${date}`;

  try {
    const response = await fetch(url, {
      next: { revalidate: 21_600 },
      headers: {
        Accept: "application/json",
        "User-Agent": "HOHAENG-OS/1.0 (+https://hohaeng.vercel.app)",
      },
      signal: AbortSignal.timeout(12_000),
    });

    if (!response.ok) {
      return { rows: [], error: `공공데이터 요청 실패 (${response.status})` };
    }

    const payload = (await response.json()) as PublicDataResponse;
    const resultCode = payload.response?.header?.resultCode;
    if (resultCode && resultCode !== "00") {
      return {
        rows: [],
        error:
          payload.response?.header?.resultMsg || `공공데이터 상태 ${resultCode}`,
      };
    }

    const item = payload.response?.body?.items?.item;
    const items = Array.isArray(item) ? item : item ? [item] : [];
    const rows = items
      .map(normalizeItem)
      .filter((row): row is KoreaFullMarketStock => row !== null);

    return { rows, error: null };
  } catch (error) {
    return {
      rows: [],
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

function rankBy(
  rows: KoreaFullMarketStock[],
  selector: (row: KoreaFullMarketStock) => number,
  direction: "asc" | "desc" = "desc",
  limit = 10,
): KoreaFullMarketStock[] {
  return [...rows]
    .sort((left, right) => {
      const diff = selector(right) - selector(left);
      return direction === "desc" ? diff : -diff;
    })
    .slice(0, limit);
}

function buildBreadth(rows: KoreaFullMarketStock[]): KoreaMarketBreadth {
  return rows.reduce<KoreaMarketBreadth>(
    (result, row) => {
      if (row.changePercent > 0) result.rising += 1;
      else if (row.changePercent < 0) result.falling += 1;
      else result.flat += 1;

      if (row.changePercent >= 29.5) result.upperLimit += 1;
      if (row.changePercent <= -29.5) result.lowerLimit += 1;
      return result;
    },
    { rising: 0, falling: 0, flat: 0, upperLimit: 0, lowerLimit: 0 },
  );
}

export async function getKoreaFullMarketSnapshot(): Promise<KoreaFullMarketSnapshot> {
  const key = serviceKey();
  if (!key) {
    return {
      configured: false,
      available: false,
      date: null,
      source: "금융위원회 공공데이터",
      totalStocks: 0,
      breadth: null,
      turnoverTop: [],
      volumeTop: [],
      gainers: [],
      losers: [],
      marketCapTop: [],
      error: null,
    };
  }

  let lastError: string | null = null;

  for (const date of candidateDates()) {
    const result = await fetchDate(key, date);
    if (result.error) lastError = result.error;
    if (result.rows.length === 0) continue;

    const rows = result.rows.filter(
      (row) => row.close > 0 && row.marketCap !== 0 && row.name.length > 0,
    );
    const asOfDate = rows[0]?.date ?? null;

    return {
      configured: true,
      available: rows.length > 0,
      date: asOfDate,
      source: "금융위원회 공공데이터",
      totalStocks: rows.length,
      breadth: buildBreadth(rows),
      turnoverTop: rankBy(rows, (row) => row.tradingValue, "desc", 10),
      volumeTop: rankBy(rows, (row) => row.volume, "desc", 10),
      gainers: rankBy(
        rows.filter((row) => row.changePercent > 0),
        (row) => row.changePercent,
        "desc",
        10,
      ),
      losers: rankBy(
        rows.filter((row) => row.changePercent < 0),
        (row) => row.changePercent,
        "asc",
        10,
      ),
      marketCapTop: rankBy(rows, (row) => row.marketCap ?? 0, "desc", 10),
      error: null,
    };
  }

  return {
    configured: true,
    available: false,
    date: null,
    source: "금융위원회 공공데이터",
    totalStocks: 0,
    breadth: null,
    turnoverTop: [],
    volumeTop: [],
    gainers: [],
    losers: [],
    marketCapTop: [],
    error: lastError || "최근 영업일 전체시장 데이터를 찾지 못했습니다.",
  };
}
