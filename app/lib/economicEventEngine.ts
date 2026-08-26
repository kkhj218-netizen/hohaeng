import "server-only";

import { getJhSupabaseAdmin } from "@/app/lib/jhDataSupabase";

const CPI_EVENT_KEY = "US_CPI";
const FRED_CPI_RELEASE_ID = 10;
const FETCH_TIMEOUT_MS = 8_000;
const YAHOO_TIMEOUT_MS = 5_000;

const CPI_SERIES = {
  headlineNsa: "CUUR0000SA0",
  headlineSa: "CUSR0000SA0",
  coreNsa: "CUUR0000SA0L1E",
  coreSa: "CUSR0000SA0L1E",
} as const;

const CPI_METRICS = [
  {
    key: "headline_yoy",
    name: "헤드라인 CPI YoY",
    sourceSeriesId: CPI_SERIES.headlineNsa,
  },
  {
    key: "headline_mom",
    name: "헤드라인 CPI MoM",
    sourceSeriesId: CPI_SERIES.headlineSa,
  },
  {
    key: "core_yoy",
    name: "근원 CPI YoY",
    sourceSeriesId: CPI_SERIES.coreNsa,
  },
  {
    key: "core_mom",
    name: "근원 CPI MoM",
    sourceSeriesId: CPI_SERIES.coreSa,
  },
] as const;

const REACTION_ASSETS = [
  { key: "NQ", name: "나스닥100 선물", yahooSymbol: "NQ=F" },
  { key: "RTY", name: "러셀2000 선물", yahooSymbol: "RTY=F" },
  { key: "GC", name: "금 선물", yahooSymbol: "GC=F" },
  { key: "CL", name: "WTI 원유 선물", yahooSymbol: "CL=F" },
  { key: "DXY", name: "달러인덱스", yahooSymbol: "DX-Y.NYB" },
  { key: "ZT", name: "미국 2년물 국채선물", yahooSymbol: "ZT=F" },
  { key: "ZN", name: "미국 10년물 국채선물", yahooSymbol: "ZN=F" },
] as const;

type EconomicEventRow = {
  id: string;
  event_key: string;
  event_name: string;
  country: string;
  release_at: string;
  reference_period: string | null;
  status: "scheduled" | "released" | "completed";
  source_name: string | null;
  source_url: string | null;
};

type EconomicMetricRow = {
  id?: string;
  event_id: string;
  metric_key: string;
  metric_name: string;
  unit: string;
  actual_value: number | string | null;
  forecast_value: number | string | null;
  previous_value: number | string | null;
  surprise_value: number | string | null;
  source_series_id: string | null;
  source_name: string | null;
  source_url: string | null;
  forecast_source_name: string | null;
  forecast_source_url: string | null;
  last_synced_at: string | null;
};

type EconomicReactionRow = {
  id?: string;
  event_id: string;
  asset_key: string;
  asset_name: string;
  yahoo_symbol: string;
  basis_label: string;
  pre_value: number | string | null;
  after_30m_value: number | string | null;
  close_value: number | string | null;
  after_1d_value: number | string | null;
  after_5d_value: number | string | null;
  return_30m_pct: number | string | null;
  return_close_pct: number | string | null;
  return_1d_pct: number | string | null;
  return_5d_pct: number | string | null;
  pre_observed_at: string | null;
  after_30m_observed_at: string | null;
  close_observed_at: string | null;
  after_1d_observed_at: string | null;
  after_5d_observed_at: string | null;
  source_name: string;
  quality_note: string | null;
  last_synced_at: string | null;
};

type BlsPoint = {
  year: string;
  period: string;
  value: string;
};

type BlsResponse = {
  status?: string;
  Results?: {
    series?: Array<{
      seriesID?: string;
      data?: BlsPoint[];
    }>;
  };
};

type FredReleaseResponse = {
  release_dates?: Array<{
    date?: string;
  }>;
};

type YahooChartResponse = {
  chart?: {
    result?: Array<{
      timestamp?: number[];
      indicators?: {
        quote?: Array<{
          close?: Array<number | null>;
        }>;
      };
    }>;
  };
};

type YahooPoint = {
  timestamp: number;
  value: number;
};

export type CpiMetricKey = (typeof CPI_METRICS)[number]["key"];

export type CpiMetricView = {
  key: CpiMetricKey;
  name: string;
  actual: number | null;
  forecast: number | null;
  previous: number | null;
  surprise: number | null;
  forecastSourceName: string | null;
  forecastSourceUrl: string | null;
};

export type CpiReactionView = {
  assetKey: string;
  assetName: string;
  pre: number | null;
  after30m: number | null;
  close: number | null;
  after1d: number | null;
  after5d: number | null;
  return30m: number | null;
  returnClose: number | null;
  return1d: number | null;
  return5d: number | null;
  qualityNote: string | null;
};

export type CpiComparableHorizon = {
  key: "30m" | "close" | "1d" | "5d";
  label: string;
  sampleSize: number;
  positiveCount: number;
  positiveRate: number | null;
  averageReturn: number | null;
  medianReturn: number | null;
};

export type CpiEventAnalysis = {
  event: {
    id: string;
    releaseAt: string;
    referencePeriod: string | null;
    status: string;
    sourceName: string | null;
    sourceUrl: string | null;
  };
  metrics: CpiMetricView[];
  reactions: CpiReactionView[];
  comparable: {
    rule: string;
    eventCount: number;
    horizons: CpiComparableHorizon[];
  } | null;
};

export type CpiAdminEvent = {
  id: string;
  releaseAt: string;
  referencePeriod: string | null;
  status: string;
  metrics: CpiMetricView[];
};

export type CpiSyncResult = {
  eventCount: number;
  metricCount: number;
  reactionCount: number;
  fetchedAt: string;
};

function round(value: number, digits = 2): number {
  const factor = 10 ** digits;
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

function safeNumber(value: number | string | null | undefined): number | null {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function percentChange(value: number | null, base: number | null): number | null {
  if (value === null || base === null || base === 0) return null;
  return round(((value / base) - 1) * 100, 2);
}

function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * 86_400_000);
}

function isoDate(value: Date): string {
  return value.toISOString().slice(0, 10);
}

function previousMonthKey(date: string): string {
  const [year, month] = date.split("-").map(Number);
  const value = new Date(Date.UTC(year, month - 2, 1));
  return `${value.getUTCFullYear()}-${String(value.getUTCMonth() + 1).padStart(2, "0")}`;
}

function shiftMonth(period: string, months: number): string {
  const [year, month] = period.split("-").map(Number);
  const value = new Date(Date.UTC(year, month - 1 + months, 1));
  return `${value.getUTCFullYear()}-${String(value.getUTCMonth() + 1).padStart(2, "0")}`;
}

function periodToBlsKey(period: string): string {
  const [year, month] = period.split("-");
  return `${year}-M${month}`;
}

function zonedLocalTimeToUtc(date: string, time: string, timeZone: string): Date {
  const [year, month, day] = date.split("-").map(Number);
  const [hour, minute] = time.split(":").map(Number);
  const desiredAsUtc = Date.UTC(year, month - 1, day, hour, minute);
  let guess = desiredAsUtc;

  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  });

  for (let index = 0; index < 2; index += 1) {
    const parts = formatter.formatToParts(new Date(guess));
    const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
    const representedAsUtc = Date.UTC(
      Number(values.year),
      Number(values.month) - 1,
      Number(values.day),
      Number(values.hour),
      Number(values.minute),
    );
    guess += desiredAsUtc - representedAsUtc;
  }

  return new Date(guess);
}

function newYorkDate(timestampMs: number): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date(timestampMs));
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function minuteOfDayEt(timestampSeconds: number): number {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/New_York",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(timestampSeconds * 1000));
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return Number(values.hour) * 60 + Number(values.minute);
}

async function fetchFredCpiReleaseDates(): Promise<string[]> {
  const apiKey = process.env.FRED_API_KEY;
  if (!apiKey) {
    throw new Error("FRED_API_KEY 환경변수가 없어 CPI 발표일을 동기화할 수 없습니다.");
  }

  const now = new Date();
  const minimumDate = isoDate(addDays(now, -550));
  const maximumDate = isoDate(addDays(now, 160));
  const query = new URLSearchParams({
    api_key: apiKey,
    file_type: "json",
    release_id: String(FRED_CPI_RELEASE_ID),
    include_release_dates_with_no_data: "true",
    limit: "48",
    sort_order: "desc",
  });

  const response = await fetch(
    `https://api.stlouisfed.org/fred/release/dates?${query.toString()}`,
    {
      cache: "no-store",
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    },
  );

  if (!response.ok) {
    throw new Error(`FRED CPI 발표일 요청 실패: ${response.status}`);
  }

  const payload = (await response.json()) as FredReleaseResponse;
  return (payload.release_dates ?? [])
    .map((item) => item.date)
    .filter(
      (date): date is string =>
        Boolean(date) &&
        /^\d{4}-\d{2}-\d{2}$/.test(date) &&
        date >= minimumDate &&
        date <= maximumDate,
    )
    .sort((left, right) => left.localeCompare(right));
}

async function fetchBlsCpiSeries(startYear: number, endYear: number) {
  const response = await fetch("https://api.bls.gov/publicAPI/v2/timeseries/data/", {
    method: "POST",
    cache: "no-store",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      seriesid: Object.values(CPI_SERIES),
      startyear: String(startYear),
      endyear: String(endYear),
    }),
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });

  if (!response.ok) {
    throw new Error(`BLS CPI 요청 실패: ${response.status}`);
  }

  const payload = (await response.json()) as BlsResponse;
  if (payload.status && payload.status !== "REQUEST_SUCCEEDED") {
    throw new Error(`BLS CPI 응답 오류: ${payload.status}`);
  }

  const seriesMap = new Map<string, Map<string, number>>();
  for (const series of payload.Results?.series ?? []) {
    if (!series.seriesID) continue;
    const points = new Map<string, number>();
    for (const item of series.data ?? []) {
      if (!/^M(0[1-9]|1[0-2])$/.test(item.period)) continue;
      const value = Number(item.value);
      if (!Number.isFinite(value)) continue;
      points.set(`${item.year}-${item.period}`, value);
    }
    seriesMap.set(series.seriesID, points);
  }

  return seriesMap;
}

function indexValue(
  seriesMap: Map<string, Map<string, number>>,
  seriesId: string,
  period: string,
): number | null {
  return seriesMap.get(seriesId)?.get(periodToBlsKey(period)) ?? null;
}

function yoyFromIndex(
  seriesMap: Map<string, Map<string, number>>,
  seriesId: string,
  period: string,
): number | null {
  const current = indexValue(seriesMap, seriesId, period);
  const previousYear = indexValue(seriesMap, seriesId, shiftMonth(period, -12));
  if (current === null || previousYear === null || previousYear === 0) return null;
  return round(((current / previousYear) - 1) * 100, 1);
}

function momFromIndex(
  seriesMap: Map<string, Map<string, number>>,
  seriesId: string,
  period: string,
): number | null {
  const current = indexValue(seriesMap, seriesId, period);
  const previousMonth = indexValue(seriesMap, seriesId, shiftMonth(period, -1));
  if (current === null || previousMonth === null || previousMonth === 0) return null;
  return round(((current / previousMonth) - 1) * 100, 1);
}

function computedCpiMetrics(seriesMap: Map<string, Map<string, number>>, period: string) {
  return new Map<CpiMetricKey, number | null>([
    ["headline_yoy", yoyFromIndex(seriesMap, CPI_SERIES.headlineNsa, period)],
    ["headline_mom", momFromIndex(seriesMap, CPI_SERIES.headlineSa, period)],
    ["core_yoy", yoyFromIndex(seriesMap, CPI_SERIES.coreNsa, period)],
    ["core_mom", momFromIndex(seriesMap, CPI_SERIES.coreSa, period)],
  ]);
}

async function fetchYahooBars(
  yahooSymbol: string,
  interval: "5m" | "30m",
  range: "1mo",
): Promise<YahooPoint[]> {
  const query = `range=${range}&interval=${interval}&includePrePost=true&events=div%2Csplits`;

  for (const host of ["query1.finance.yahoo.com", "query2.finance.yahoo.com"]) {
    try {
      const response = await fetch(
        `https://${host}/v8/finance/chart/${encodeURIComponent(yahooSymbol)}?${query}`,
        {
          cache: "no-store",
          headers: {
            Accept: "application/json,text/plain;q=0.9,*/*;q=0.8",
            "User-Agent":
              "Mozilla/5.0 (compatible; HOHAENG-OS/1.0; +https://hohaeng.vercel.app)",
          },
          signal: AbortSignal.timeout(YAHOO_TIMEOUT_MS),
        },
      );

      if (!response.ok) continue;
      const payload = (await response.json()) as YahooChartResponse;
      const result = payload.chart?.result?.[0];
      if (!result) continue;

      const timestamps = result.timestamp ?? [];
      const closes = result.indicators?.quote?.[0]?.close ?? [];
      return timestamps
        .map((timestamp, index) => {
          const value = closes[index];
          return typeof value === "number" && Number.isFinite(value)
            ? { timestamp, value }
            : null;
        })
        .filter((item): item is YahooPoint => item !== null)
        .sort((left, right) => left.timestamp - right.timestamp);
    } catch {
      // backup host로 재시도
    }
  }

  return [];
}

function closestPoint(
  rows: YahooPoint[],
  targetMs: number,
  toleranceMinutes: number,
): YahooPoint | null {
  const targetSeconds = targetMs / 1000;
  const toleranceSeconds = toleranceMinutes * 60;
  let best: YahooPoint | null = null;
  let bestDistance = Number.POSITIVE_INFINITY;

  for (const row of rows) {
    const distance = Math.abs(row.timestamp - targetSeconds);
    if (distance > toleranceSeconds || distance >= bestDistance) continue;
    best = row;
    bestDistance = distance;
  }

  return best;
}

function previousPoint(
  rows: YahooPoint[],
  targetMs: number,
  toleranceMinutes: number,
): YahooPoint | null {
  const targetSeconds = targetMs / 1000;
  const minimum = targetSeconds - toleranceMinutes * 60;
  let best: YahooPoint | null = null;

  for (const row of rows) {
    if (row.timestamp > targetSeconds || row.timestamp < minimum) continue;
    if (!best || row.timestamp > best.timestamp) best = row;
  }

  return best;
}

function sessionCloses(rows: YahooPoint[]): Array<{ date: string; point: YahooPoint }> {
  const byDate = new Map<string, YahooPoint[]>();
  for (const row of rows) {
    const date = newYorkDate(row.timestamp * 1000);
    const list = byDate.get(date) ?? [];
    list.push(row);
    byDate.set(date, list);
  }

  const result: Array<{ date: string; point: YahooPoint }> = [];
  for (const [date, list] of byDate.entries()) {
    const candidates = list
      .map((point) => ({ point, distance: Math.abs(minuteOfDayEt(point.timestamp) - 16 * 60) }))
      .filter((item) => item.distance <= 60)
      .sort((left, right) => left.distance - right.distance || right.point.timestamp - left.point.timestamp);
    if (candidates[0]) result.push({ date, point: candidates[0].point });
  }

  return result.sort((left, right) => left.date.localeCompare(right.date));
}

function pointIso(point: YahooPoint | null): string | null {
  return point ? new Date(point.timestamp * 1000).toISOString() : null;
}

async function syncCpiEventsAndMetrics(): Promise<{
  events: EconomicEventRow[];
  metricCount: number;
}> {
  const supabase = getJhSupabaseAdmin();
  const releaseDates = await fetchFredCpiReleaseDates();
  if (releaseDates.length === 0) return { events: [], metricCount: 0 };

  const years = releaseDates.map((date) => Number(date.slice(0, 4)));
  const startYear = Math.min(...years) - 1;
  const endYear = Math.max(...years);
  const seriesMap = await fetchBlsCpiSeries(startYear, endYear);
  const nowIso = new Date().toISOString();
  const nowMs = Date.now();
  const events: EconomicEventRow[] = [];
  let metricCount = 0;

  for (const releaseDate of releaseDates) {
    const releaseAt = zonedLocalTimeToUtc(releaseDate, "08:30", "America/New_York");
    const referencePeriod = previousMonthKey(releaseDate);
    const actualMetrics = computedCpiMetrics(seriesMap, referencePeriod);
    const hasActual = Array.from(actualMetrics.values()).some((value) => value !== null);
    const status: EconomicEventRow["status"] =
      releaseAt.getTime() > nowMs ? "scheduled" : hasActual ? "released" : "scheduled";

    const { data: eventData, error: eventError } = await supabase
      .from("economic_events")
      .upsert(
        {
          event_key: CPI_EVENT_KEY,
          event_name: "미국 소비자물가지수(CPI)",
          country: "US",
          release_at: releaseAt.toISOString(),
          reference_period: referencePeriod,
          status,
          source_name: "U.S. Bureau of Labor Statistics + FRED",
          source_url: "https://www.bls.gov/cpi/",
          updated_at: nowIso,
        },
        { onConflict: "event_key,release_at" },
      )
      .select(
        "id,event_key,event_name,country,release_at,reference_period,status,source_name,source_url",
      )
      .single();

    if (eventError || !eventData) {
      throw new Error(`CPI 이벤트 저장 실패: ${eventError?.message ?? "unknown"}`);
    }

    const event = eventData as EconomicEventRow;
    events.push(event);

    const { data: existingMetricData, error: existingMetricError } = await supabase
      .from("economic_event_metrics")
      .select("*")
      .eq("event_id", event.id);

    if (existingMetricError) {
      throw new Error(`CPI 기존 컨센서스 조회 실패: ${existingMetricError.message}`);
    }

    const existingMetrics = new Map(
      ((existingMetricData ?? []) as EconomicMetricRow[]).map((metric) => [metric.metric_key, metric]),
    );
    const previousPeriod = shiftMonth(referencePeriod, -1);
    const previousMetrics = computedCpiMetrics(seriesMap, previousPeriod);

    const metricRows = CPI_METRICS.map((definition) => {
      const existing = existingMetrics.get(definition.key);
      const actual = actualMetrics.get(definition.key) ?? null;
      const forecast = safeNumber(existing?.forecast_value);
      const previous = previousMetrics.get(definition.key) ?? null;
      return {
        event_id: event.id,
        metric_key: definition.key,
        metric_name: definition.name,
        unit: "%",
        actual_value: actual,
        forecast_value: forecast,
        previous_value: previous,
        surprise_value:
          actual !== null && forecast !== null ? round(actual - forecast, 2) : null,
        source_series_id: definition.sourceSeriesId,
        source_name: "U.S. Bureau of Labor Statistics",
        source_url: "https://www.bls.gov/cpi/",
        forecast_source_name: existing?.forecast_source_name ?? null,
        forecast_source_url: existing?.forecast_source_url ?? null,
        last_synced_at: nowIso,
        updated_at: nowIso,
      };
    });

    const { error: metricError } = await supabase
      .from("economic_event_metrics")
      .upsert(metricRows, { onConflict: "event_id,metric_key" });

    if (metricError) {
      throw new Error(`CPI 지표 저장 실패: ${metricError.message}`);
    }
    metricCount += metricRows.length;
  }

  return { events, metricCount };
}

async function syncRecentCpiReactions(events: EconomicEventRow[]): Promise<number> {
  const nowMs = Date.now();
  const recentEvents = events.filter((event) => {
    const releaseMs = Date.parse(event.release_at);
    const ageDays = (nowMs - releaseMs) / 86_400_000;
    return releaseMs <= nowMs && ageDays >= 0 && ageDays <= 28;
  });

  if (recentEvents.length === 0) return 0;

  const supabase = getJhSupabaseAdmin();
  const eventIds = recentEvents.map((event) => event.id);
  const { data: existingReactionData, error: existingReactionError } = await supabase
    .from("economic_event_reactions")
    .select("*")
    .in("event_id", eventIds);

  if (existingReactionError) {
    throw new Error(`기존 이벤트 반응 조회 실패: ${existingReactionError.message}`);
  }

  const existingMap = new Map(
    ((existingReactionData ?? []) as EconomicReactionRow[]).map((row) => [
      `${row.event_id}:${row.asset_key}`,
      row,
    ]),
  );

  const nowIso = new Date().toISOString();
  const reactionRows: Record<string, unknown>[] = [];

  for (const asset of REACTION_ASSETS) {
    const [fiveMinuteRows, thirtyMinuteRows] = await Promise.all([
      fetchYahooBars(asset.yahooSymbol, "5m", "1mo"),
      fetchYahooBars(asset.yahooSymbol, "30m", "1mo"),
    ]);
    const closes = sessionCloses(thirtyMinuteRows);

    for (const event of recentEvents) {
      const releaseMs = Date.parse(event.release_at);
      const eventDate = newYorkDate(releaseMs);
      const pre = previousPoint(fiveMinuteRows, releaseMs, 15);
      const after30 = closestPoint(fiveMinuteRows, releaseMs + 30 * 60_000, 10);
      const eventClose = closes.find((item) => item.date === eventDate)?.point ?? null;
      const futureCloses = closes.filter((item) => item.date > eventDate);
      const after1d = futureCloses[0]?.point ?? null;
      const after5d = futureCloses[4]?.point ?? null;
      const existing = existingMap.get(`${event.id}:${asset.key}`);

      const preValue = pre?.value ?? safeNumber(existing?.pre_value);
      const after30Value = after30?.value ?? safeNumber(existing?.after_30m_value);
      const closeValue = eventClose?.value ?? safeNumber(existing?.close_value);
      const after1dValue = after1d?.value ?? safeNumber(existing?.after_1d_value);
      const after5dValue = after5d?.value ?? safeNumber(existing?.after_5d_value);
      const missing: string[] = [];
      if (preValue === null) missing.push("발표 직전");
      if (after30Value === null) missing.push("30분");
      if (closeValue === null) missing.push("당일 16ET");
      if (after1dValue === null) missing.push("+1D");
      if (after5dValue === null) missing.push("+5D");

      reactionRows.push({
        event_id: event.id,
        asset_key: asset.key,
        asset_name: asset.name,
        yahoo_symbol: asset.yahooSymbol,
        basis_label: "발표 직전 대비 · 당일/+1D/+5D는 16:00 ET 근접값",
        pre_value: preValue,
        after_30m_value: after30Value,
        close_value: closeValue,
        after_1d_value: after1dValue,
        after_5d_value: after5dValue,
        return_30m_pct: percentChange(after30Value, preValue),
        return_close_pct: percentChange(closeValue, preValue),
        return_1d_pct: percentChange(after1dValue, preValue),
        return_5d_pct: percentChange(after5dValue, preValue),
        pre_observed_at: pointIso(pre) ?? existing?.pre_observed_at ?? null,
        after_30m_observed_at: pointIso(after30) ?? existing?.after_30m_observed_at ?? null,
        close_observed_at: pointIso(eventClose) ?? existing?.close_observed_at ?? null,
        after_1d_observed_at: pointIso(after1d) ?? existing?.after_1d_observed_at ?? null,
        after_5d_observed_at: pointIso(after5d) ?? existing?.after_5d_observed_at ?? null,
        source_name: "Yahoo Finance",
        quality_note:
          missing.length === 0
            ? "Yahoo 5분/30분봉으로 발표 전후 및 16:00 ET 동시점 계산"
            : `일부 시점 미확보: ${missing.join(", ")}`,
        last_synced_at: nowIso,
        updated_at: nowIso,
      });
    }
  }

  if (reactionRows.length === 0) return 0;
  const { error } = await supabase
    .from("economic_event_reactions")
    .upsert(reactionRows, { onConflict: "event_id,asset_key" });

  if (error) {
    throw new Error(`이벤트 시장 반응 저장 실패: ${error.message}`);
  }

  return reactionRows.length;
}

export async function syncCpiEconomicEventDb(): Promise<CpiSyncResult> {
  const eventSync = await syncCpiEventsAndMetrics();
  const reactionCount = await syncRecentCpiReactions(eventSync.events);

  return {
    eventCount: eventSync.events.length,
    metricCount: eventSync.metricCount,
    reactionCount,
    fetchedAt: new Date().toISOString(),
  };
}

function metricView(row: EconomicMetricRow): CpiMetricView {
  return {
    key: row.metric_key as CpiMetricKey,
    name: row.metric_name,
    actual: safeNumber(row.actual_value),
    forecast: safeNumber(row.forecast_value),
    previous: safeNumber(row.previous_value),
    surprise: safeNumber(row.surprise_value),
    forecastSourceName: row.forecast_source_name,
    forecastSourceUrl: row.forecast_source_url,
  };
}

function reactionView(row: EconomicReactionRow): CpiReactionView {
  return {
    assetKey: row.asset_key,
    assetName: row.asset_name,
    pre: safeNumber(row.pre_value),
    after30m: safeNumber(row.after_30m_value),
    close: safeNumber(row.close_value),
    after1d: safeNumber(row.after_1d_value),
    after5d: safeNumber(row.after_5d_value),
    return30m: safeNumber(row.return_30m_pct),
    returnClose: safeNumber(row.return_close_pct),
    return1d: safeNumber(row.return_1d_pct),
    return5d: safeNumber(row.return_5d_pct),
    qualityNote: row.quality_note,
  };
}

function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[middle - 1] + sorted[middle]) / 2
    : sorted[middle];
}

function horizonSummary(
  key: CpiComparableHorizon["key"],
  label: string,
  values: number[],
): CpiComparableHorizon {
  const positiveCount = values.filter((value) => value > 0).length;
  return {
    key,
    label,
    sampleSize: values.length,
    positiveCount,
    positiveRate: values.length > 0 ? round((positiveCount / values.length) * 100, 1) : null,
    averageReturn:
      values.length > 0 ? round(values.reduce((sum, value) => sum + value, 0) / values.length, 2) : null,
    medianReturn: values.length > 0 ? round(median(values) ?? 0, 2) : null,
  };
}

export async function getCpiEventAnalysis(): Promise<CpiEventAnalysis | null> {
  const supabase = getJhSupabaseAdmin();
  const { data: eventData, error: eventError } = await supabase
    .from("economic_events")
    .select("id,event_key,event_name,country,release_at,reference_period,status,source_name,source_url")
    .eq("event_key", CPI_EVENT_KEY)
    .lte("release_at", new Date().toISOString())
    .order("release_at", { ascending: false })
    .limit(24);

  if (eventError) throw new Error(`CPI 이벤트 조회 실패: ${eventError.message}`);
  const events = (eventData ?? []) as EconomicEventRow[];
  if (events.length === 0) return null;

  const eventIds = events.map((event) => event.id);
  const [{ data: metricData, error: metricError }, { data: reactionData, error: reactionError }] =
    await Promise.all([
      supabase.from("economic_event_metrics").select("*").in("event_id", eventIds),
      supabase.from("economic_event_reactions").select("*").in("event_id", eventIds),
    ]);

  if (metricError) throw new Error(`CPI 지표 조회 실패: ${metricError.message}`);
  if (reactionError) throw new Error(`CPI 반응 조회 실패: ${reactionError.message}`);

  const metrics = (metricData ?? []) as EconomicMetricRow[];
  const reactions = (reactionData ?? []) as EconomicReactionRow[];
  const latest = events.find((event) =>
    metrics.some((metric) => metric.event_id === event.id && safeNumber(metric.actual_value) !== null),
  ) ?? events[0];

  const latestMetrics = metrics.filter((metric) => metric.event_id === latest.id);
  const latestReactions = reactions.filter((reaction) => reaction.event_id === latest.id);
  const headline = latestMetrics.find((metric) => metric.metric_key === "headline_yoy");
  const latestSurprise = safeNumber(headline?.surprise_value);
  let comparable: CpiEventAnalysis["comparable"] = null;

  if (latestSurprise !== null) {
    const olderHeadline = metrics.filter((metric) => {
      if (metric.event_id === latest.id || metric.metric_key !== "headline_yoy") return false;
      const surprise = safeNumber(metric.surprise_value);
      if (surprise === null) return false;
      return Math.sign(surprise) === Math.sign(latestSurprise) && Math.abs(surprise - latestSurprise) <= 0.15;
    });

    const relaxedHeadline = olderHeadline.length >= 3
      ? olderHeadline
      : metrics.filter((metric) => {
          if (metric.event_id === latest.id || metric.metric_key !== "headline_yoy") return false;
          const surprise = safeNumber(metric.surprise_value);
          return surprise !== null && Math.sign(surprise) === Math.sign(latestSurprise);
        });

    const comparableIds = new Set(relaxedHeadline.map((metric) => metric.event_id));
    const nqReactions = reactions.filter(
      (reaction) => comparableIds.has(reaction.event_id) && reaction.asset_key === "NQ",
    );
    const values30m = nqReactions.map((row) => safeNumber(row.return_30m_pct)).filter((v): v is number => v !== null);
    const valuesClose = nqReactions.map((row) => safeNumber(row.return_close_pct)).filter((v): v is number => v !== null);
    const values1d = nqReactions.map((row) => safeNumber(row.return_1d_pct)).filter((v): v is number => v !== null);
    const values5d = nqReactions.map((row) => safeNumber(row.return_5d_pct)).filter((v): v is number => v !== null);

    comparable = {
      rule:
        olderHeadline.length >= 3
          ? `헤드라인 CPI 서프라이즈가 현재값(${latestSurprise > 0 ? "+" : ""}${latestSurprise.toFixed(2)}%p)과 ±0.15%p 이내인 과거 사례`
          : `헤드라인 CPI 서프라이즈 방향이 같은 과거 사례`,
      eventCount: comparableIds.size,
      horizons: [
        horizonSummary("30m", "발표 30분", values30m),
        horizonSummary("close", "당일 16:00 ET", valuesClose),
        horizonSummary("1d", "+1거래일", values1d),
        horizonSummary("5d", "+5거래일", values5d),
      ],
    };
  }

  return {
    event: {
      id: latest.id,
      releaseAt: latest.release_at,
      referencePeriod: latest.reference_period,
      status: latest.status,
      sourceName: latest.source_name,
      sourceUrl: latest.source_url,
    },
    metrics: latestMetrics.map(metricView).sort(
      (left, right) =>
        CPI_METRICS.findIndex((item) => item.key === left.key) -
        CPI_METRICS.findIndex((item) => item.key === right.key),
    ),
    reactions: latestReactions.map(reactionView).sort(
      (left, right) =>
        REACTION_ASSETS.findIndex((item) => item.key === left.assetKey) -
        REACTION_ASSETS.findIndex((item) => item.key === right.assetKey),
    ),
    comparable,
  };
}

export async function listCpiEventsForAdmin(limit = 16): Promise<CpiAdminEvent[]> {
  const supabase = getJhSupabaseAdmin();
  const { data: eventData, error: eventError } = await supabase
    .from("economic_events")
    .select("id,event_key,event_name,country,release_at,reference_period,status,source_name,source_url")
    .eq("event_key", CPI_EVENT_KEY)
    .order("release_at", { ascending: false })
    .limit(limit);

  if (eventError) throw new Error(`CPI 관리자 이벤트 조회 실패: ${eventError.message}`);
  const events = (eventData ?? []) as EconomicEventRow[];
  if (events.length === 0) return [];

  const { data: metricData, error: metricError } = await supabase
    .from("economic_event_metrics")
    .select("*")
    .in("event_id", events.map((event) => event.id));

  if (metricError) throw new Error(`CPI 관리자 지표 조회 실패: ${metricError.message}`);
  const metrics = (metricData ?? []) as EconomicMetricRow[];

  return events.map((event) => ({
    id: event.id,
    releaseAt: event.release_at,
    referencePeriod: event.reference_period,
    status: event.status,
    metrics: metrics
      .filter((metric) => metric.event_id === event.id)
      .map(metricView)
      .sort(
        (left, right) =>
          CPI_METRICS.findIndex((item) => item.key === left.key) -
          CPI_METRICS.findIndex((item) => item.key === right.key),
      ),
  }));
}

export async function saveCpiForecasts(input: {
  eventId: string;
  forecasts: Partial<Record<CpiMetricKey, number | null>>;
  sourceName?: string | null;
  sourceUrl?: string | null;
}) {
  const supabase = getJhSupabaseAdmin();
  const { data: existingData, error: existingError } = await supabase
    .from("economic_event_metrics")
    .select("*")
    .eq("event_id", input.eventId);

  if (existingError) throw new Error(`CPI 컨센서스 대상 조회 실패: ${existingError.message}`);
  const existingMetrics = (existingData ?? []) as EconomicMetricRow[];
  if (existingMetrics.length === 0) {
    throw new Error("먼저 CPI 이벤트 동기화를 실행해 주세요.");
  }

  const nowIso = new Date().toISOString();
  const rows = existingMetrics.map((metric) => {
    const metricKey = metric.metric_key as CpiMetricKey;
    const requested = Object.prototype.hasOwnProperty.call(input.forecasts, metricKey)
      ? input.forecasts[metricKey]
      : safeNumber(metric.forecast_value);
    const forecast = requested === null || requested === undefined ? null : Number(requested);
    const normalizedForecast = forecast !== null && Number.isFinite(forecast) ? forecast : null;
    const actual = safeNumber(metric.actual_value);
    return {
      event_id: metric.event_id,
      metric_key: metric.metric_key,
      metric_name: metric.metric_name,
      unit: metric.unit,
      actual_value: actual,
      forecast_value: normalizedForecast,
      previous_value: safeNumber(metric.previous_value),
      surprise_value:
        actual !== null && normalizedForecast !== null
          ? round(actual - normalizedForecast, 2)
          : null,
      source_series_id: metric.source_series_id,
      source_name: metric.source_name,
      source_url: metric.source_url,
      forecast_source_name: input.sourceName ?? metric.forecast_source_name,
      forecast_source_url: input.sourceUrl ?? metric.forecast_source_url,
      last_synced_at: metric.last_synced_at,
      updated_at: nowIso,
    };
  });

  const { error } = await supabase
    .from("economic_event_metrics")
    .upsert(rows, { onConflict: "event_id,metric_key" });

  if (error) throw new Error(`CPI 컨센서스 저장 실패: ${error.message}`);
  return { saved: rows.length };
}
