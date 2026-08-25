import "server-only";

import { unstable_cache } from "next/cache";

export type PolicyRateObservation = {
  date: string;
  value: number;
};

export type GlobalPolicyRate = {
  code: string;
  flag: string;
  countryKo: string;
  bankKo: string;
  bankEn: string;
  currentRate: number | null;
  observedAt: string | null;
  lastChangeBp: number | null;
  lastChangeDate: string | null;
  oneYearChangeBp: number | null;
  oneYearAgoRate: number | null;
  trend: "easing" | "steady" | "hiking" | "unknown";
  trendLabel: string;
  nextMeeting: string | null;
  meetingSourceUrl: string;
  history: PolicyRateObservation[];
  source: "BIS";
  error: string | null;
};

type Definition = {
  code: string;
  flag: string;
  countryKo: string;
  bankKo: string;
  bankEn: string;
  meetings: string[];
  meetingSourceUrl: string;
};

const DEFINITIONS: Definition[] = [
  {
    code: "US",
    flag: "🇺🇸",
    countryKo: "미국",
    bankKo: "연방준비제도",
    bankEn: "Federal Reserve",
    meetings: ["2026-09-16", "2026-10-28", "2026-12-09"],
    meetingSourceUrl: "https://www.federalreserve.gov/monetarypolicy/fomccalendars.htm",
  },
  {
    code: "KR",
    flag: "🇰🇷",
    countryKo: "한국",
    bankKo: "한국은행",
    bankEn: "Bank of Korea",
    meetings: ["2026-08-27", "2026-10-22", "2026-11-26"],
    meetingSourceUrl: "https://www.bok.or.kr/portal/singl/crncyPolicyDrcMtg/listYear.do?menuNo=200755&mtgSe=A",
  },
  {
    code: "XM",
    flag: "🇪🇺",
    countryKo: "유로존",
    bankKo: "유럽중앙은행",
    bankEn: "European Central Bank",
    meetings: ["2026-09-10", "2026-10-29", "2026-12-17"],
    meetingSourceUrl: "https://www.ecb.europa.eu/press/calendars/mgcgc/html/index.en.html",
  },
  {
    code: "JP",
    flag: "🇯🇵",
    countryKo: "일본",
    bankKo: "일본은행",
    bankEn: "Bank of Japan",
    meetings: ["2026-09-18", "2026-10-30", "2026-12-18"],
    meetingSourceUrl: "https://www.boj.or.jp/en/mopo/mpmsche_minu/index.htm",
  },
  {
    code: "GB",
    flag: "🇬🇧",
    countryKo: "영국",
    bankKo: "영란은행",
    bankEn: "Bank of England",
    meetings: ["2026-09-17", "2026-11-05", "2026-12-17"],
    meetingSourceUrl: "https://www.bankofengland.co.uk/news/2025/september/monetary-policy-committee-dates-for-2026",
  },
  {
    code: "CA",
    flag: "🇨🇦",
    countryKo: "캐나다",
    bankKo: "캐나다은행",
    bankEn: "Bank of Canada",
    meetings: ["2026-09-02", "2026-10-28", "2026-12-09"],
    meetingSourceUrl: "https://www.bankofcanada.ca/core-functions/monetary-policy/key-interest-rate/",
  },
  {
    code: "AU",
    flag: "🇦🇺",
    countryKo: "호주",
    bankKo: "호주중앙은행",
    bankEn: "Reserve Bank of Australia",
    meetings: ["2026-09-29", "2026-11-03", "2026-12-08"],
    meetingSourceUrl: "https://www.rba.gov.au/schedules-events/board-meeting-schedules.html",
  },
  {
    code: "CH",
    flag: "🇨🇭",
    countryKo: "스위스",
    bankKo: "스위스국립은행",
    bankEn: "Swiss National Bank",
    meetings: ["2026-09-24", "2026-12-10"],
    meetingSourceUrl: "https://www.snb.ch/en/services-events/digital-services/event-schedule",
  },
];

const CACHE_SECONDS = 60 * 60 * 12;
const BIS_BASE = "https://stats.bis.org/api/v1/data/WS_CBPOL";

function parseCsvRow(line: string): string[] {
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
      values.push(current);
      current = "";
      continue;
    }
    current += char;
  }

  values.push(current);
  return values;
}

function safeNumber(value: string | undefined): number | null {
  if (!value || value === "N/A" || value === "NaN" || value === "-") return null;
  const parsed = Number(value.replace(/,/g, ""));
  return Number.isFinite(parsed) ? parsed : null;
}

function dateOnly(date = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function addDays(date: string, days: number): string {
  const base = new Date(`${date}T12:00:00.000Z`);
  base.setUTCDate(base.getUTCDate() + days);
  return base.toISOString().slice(0, 10);
}

function nextMeeting(definition: Definition): string | null {
  const today = dateOnly();
  return definition.meetings.find((date) => date >= today) ?? null;
}

function downsample(history: PolicyRateObservation[], maxPoints = 72): PolicyRateObservation[] {
  if (history.length <= maxPoints) return history;
  const step = Math.max(1, Math.floor(history.length / maxPoints));
  const sampled = history.filter((_, index) => index % step === 0);
  const latest = history[history.length - 1];
  if (sampled[sampled.length - 1]?.date !== latest.date) sampled.push(latest);
  return sampled.slice(-maxPoints);
}

function derive(definition: Definition, observations: PolicyRateObservation[]): GlobalPolicyRate {
  const sorted = [...observations].sort((a, b) => a.date.localeCompare(b.date));
  const latest = sorted[sorted.length - 1] ?? null;

  if (!latest) {
    return {
      ...definition,
      currentRate: null,
      observedAt: null,
      lastChangeBp: null,
      lastChangeDate: null,
      oneYearChangeBp: null,
      oneYearAgoRate: null,
      trend: "unknown",
      trendLabel: "데이터 확인 중",
      nextMeeting: nextMeeting(definition),
      history: [],
      source: "BIS",
      error: "BIS 정책금리 관측값 없음",
    };
  }

  let previousDifferent: PolicyRateObservation | null = null;
  let lastChangeDate: string | null = null;
  for (let index = sorted.length - 2; index >= 0; index -= 1) {
    if (Math.abs(sorted[index].value - latest.value) > 0.0001) {
      previousDifferent = sorted[index];
      lastChangeDate = sorted[index + 1]?.date ?? latest.date;
      break;
    }
  }

  const oneYearCutoff = addDays(latest.date, -365);
  const oneYearPoint = [...sorted].reverse().find((point) => point.date <= oneYearCutoff) ?? null;
  const oneYearChangeBp = oneYearPoint ? Math.round((latest.value - oneYearPoint.value) * 100) : null;
  const lastChangeBp = previousDifferent ? Math.round((latest.value - previousDifferent.value) * 100) : null;

  let trend: GlobalPolicyRate["trend"] = "steady";
  if (oneYearChangeBp !== null && oneYearChangeBp <= -5) trend = "easing";
  else if (oneYearChangeBp !== null && oneYearChangeBp >= 5) trend = "hiking";

  const trendLabel = trend === "easing" ? "인하 사이클 ↓" : trend === "hiking" ? "인상 사이클 ↑" : "동결 구간 →";
  const fiveYearCutoff = addDays(latest.date, -365 * 5 - 10);
  const fiveYearHistory = sorted.filter((point) => point.date >= fiveYearCutoff);

  return {
    ...definition,
    currentRate: latest.value,
    observedAt: latest.date,
    lastChangeBp,
    lastChangeDate,
    oneYearChangeBp,
    oneYearAgoRate: oneYearPoint?.value ?? null,
    trend,
    trendLabel,
    nextMeeting: nextMeeting(definition),
    history: downsample(fiveYearHistory),
    source: "BIS",
    error: null,
  };
}

async function fetchBisCountry(definition: Definition): Promise<GlobalPolicyRate> {
  const paths = [
    `${BIS_BASE}/D.${definition.code}?lastNObservations=2000&format=csv`,
    `${BIS_BASE}/D.${definition.code}/all?lastNObservations=2000&format=csv`,
  ];

  let lastError = "BIS 요청 실패";

  for (const url of paths) {
    try {
      const response = await fetch(url, {
        cache: "no-store",
        headers: {
          Accept: "text/csv,text/plain;q=0.9,*/*;q=0.8",
          "User-Agent": "HOHAENG-OS/1.0 (+https://hohaeng.vercel.app)",
        },
        signal: AbortSignal.timeout(8_000),
      });

      if (!response.ok) {
        lastError = `BIS ${response.status}`;
        continue;
      }

      const text = await response.text();
      const lines = text
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean);

      if (lines.length < 2) {
        lastError = "BIS CSV 비어 있음";
        continue;
      }

      const headers = parseCsvRow(lines[0]).map((header) => header.replace(/^\uFEFF/, "").trim().toUpperCase());
      const dateIndex = headers.indexOf("TIME_PERIOD");
      const valueIndex = headers.indexOf("OBS_VALUE");
      if (dateIndex < 0 || valueIndex < 0) {
        lastError = "BIS CSV 컬럼 확인 필요";
        continue;
      }

      const byDate = new Map<string, number>();
      for (const line of lines.slice(1)) {
        const cells = parseCsvRow(line);
        const date = (cells[dateIndex] ?? "").slice(0, 10);
        const value = safeNumber(cells[valueIndex]);
        if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || value === null) continue;
        byDate.set(date, value);
      }

      const observations = Array.from(byDate.entries()).map(([date, value]) => ({ date, value }));
      if (observations.length > 0) return derive(definition, observations);
      lastError = "BIS 관측값 파싱 실패";
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error);
    }
  }

  return {
    ...definition,
    currentRate: null,
    observedAt: null,
    lastChangeBp: null,
    lastChangeDate: null,
    oneYearChangeBp: null,
    oneYearAgoRate: null,
    trend: "unknown",
    trendLabel: "데이터 확인 중",
    nextMeeting: nextMeeting(definition),
    history: [],
    source: "BIS",
    error: lastError,
  };
}

async function buildGlobalPolicyRates(): Promise<GlobalPolicyRate[]> {
  return Promise.all(DEFINITIONS.map((definition) => fetchBisCountry(definition)));
}

const cachedGlobalPolicyRates = unstable_cache(
  buildGlobalPolicyRates,
  ["global-policy-rates-bis-v1"],
  {
    revalidate: CACHE_SECONDS,
    tags: ["global-policy-rates"],
  },
);

export async function getGlobalPolicyRates(): Promise<GlobalPolicyRate[]> {
  return cachedGlobalPolicyRates();
}
