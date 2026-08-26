import "server-only";

import { getJhSupabaseAdmin } from "@/app/lib/jhDataSupabase";

const CPI_EVENT_KEY = "US_CPI";
const FRED_CPI_RELEASE_ID = 10;
const BACKFILL_START = "2016-01-01";
const FETCH_TIMEOUT_MS = 12_000;
const YAHOO_TIMEOUT_MS = 8_000;

const CPI_SERIES = {
  headlineNsa: "CUUR0000SA0",
  headlineSa: "CUSR0000SA0",
  coreNsa: "CUUR0000SA0L1E",
  coreSa: "CUSR0000SA0L1E",
} as const;

const CPI_METRICS = [
  { key: "headline_yoy", name: "헤드라인 CPI YoY", sourceSeriesId: CPI_SERIES.headlineNsa },
  { key: "headline_mom", name: "헤드라인 CPI MoM", sourceSeriesId: CPI_SERIES.headlineSa },
  { key: "core_yoy", name: "근원 CPI YoY", sourceSeriesId: CPI_SERIES.coreNsa },
  { key: "core_mom", name: "근원 CPI MoM", sourceSeriesId: CPI_SERIES.coreSa },
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

type BlsPoint = { year: string; period: string; value: string };
type BlsResponse = {
  status?: string;
  Results?: { series?: Array<{ seriesID?: string; data?: BlsPoint[] }> };
};
type FredReleaseResponse = { release_dates?: Array<{ date?: string }> };
type YahooChartResponse = {
  chart?: {
    result?: Array<{
      timestamp?: number[];
      indicators?: { quote?: Array<{ close?: Array<number | null> }> };
    }>;
  };
};
type YahooPoint = { timestamp: number; value: number; date: string };

type EventRow = {
  id: string;
  release_at: string;
  reference_period: string | null;
  status: string;
};

type MetricDbRow = {
  event_id: string;
  metric_key: string;
  actual_value: number | string | null;
  forecast_value: number | string | null;
  previous_value: number | string | null;
  surprise_value: number | string | null;
  forecast_source_name: string | null;
  forecast_source_url: string | null;
};

type ReactionDbRow = {
  event_id: string;
  asset_key: string;
  basis_label: string | null;
  pre_value: number | string | null;
  after_30m_value: number | string | null;
  close_value: number | string | null;
  after_1d_value: number | string | null;
  after_5d_value: number | string | null;
  pre_observed_at: string | null;
  after_30m_observed_at: string | null;
  close_observed_at: string | null;
  after_1d_observed_at: string | null;
  after_5d_observed_at: string | null;
};

export type CpiHistoryArchiveItem = {
  id: string;
  releaseAt: string;
  referencePeriod: string | null;
  headlineYoy: number | null;
  headlineMom: number | null;
  coreYoy: number | null;
  coreMom: number | null;
  headlineForecast: number | null;
  headlineSurprise: number | null;
  nqClose: number | null;
  nq1d: number | null;
  nq5d: number | null;
  reactionBasis: string | null;
};

export type CpiHistoryDetail = {
  event: { id: string; releaseAt: string; referencePeriod: string | null; status: string };
  metrics: Array<{
    key: string;
    name: string;
    actual: number | null;
    forecast: number | null;
    previous: number | null;
    surprise: number | null;
    forecastSourceName: string | null;
    forecastSourceUrl: string | null;
  }>;
  reactions: Array<{
    assetKey: string;
    assetName: string;
    basisLabel: string;
    closeReturn: number | null;
    oneDayReturn: number | null;
    fiveDayReturn: number | null;
    thirtyMinuteReturn: number | null;
    qualityNote: string | null;
  }>;
};

function round(value: number, digits = 2) {
  const factor = 10 ** digits;
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

function safeNumber(value: number | string | null | undefined): number | null {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function percentChange(value: number | null, base: number | null) {
  if (value === null || base === null || base === 0) return null;
  return round(((value / base) - 1) * 100, 2);
}

function shiftMonth(period: string, months: number) {
  const [year, month] = period.split("-").map(Number);
  const value = new Date(Date.UTC(year, month - 1 + months, 1));
  return `${value.getUTCFullYear()}-${String(value.getUTCMonth() + 1).padStart(2, "0")}`;
}

function previousMonthKey(date: string) {
  const [year, month] = date.split("-").map(Number);
  const value = new Date(Date.UTC(year, month - 2, 1));
  return `${value.getUTCFullYear()}-${String(value.getUTCMonth() + 1).padStart(2, "0")}`;
}

function periodToBlsKey(period: string) {
  const [year, month] = period.split("-");
  return `${year}-M${month}`;
}

function zonedLocalTimeToUtc(date: string, time: string, timeZone: string) {
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
      Number(values.year), Number(values.month) - 1, Number(values.day), Number(values.hour), Number(values.minute),
    );
    guess += desiredAsUtc - representedAsUtc;
  }
  return new Date(guess);
}

function newYorkDate(timestampMs: number) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date(timestampMs));
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

async function fetchFredReleaseDates() {
  const apiKey = process.env.FRED_API_KEY;
  if (!apiKey) throw new Error("FRED_API_KEY 환경변수가 없습니다.");
  const future = new Date(Date.now() + 180 * 86_400_000).toISOString().slice(0, 10);
  const query = new URLSearchParams({
    api_key: apiKey,
    file_type: "json",
    release_id: String(FRED_CPI_RELEASE_ID),
    include_release_dates_with_no_data: "true",
    limit: "256",
    sort_order: "asc",
    realtime_start: "1776-07-04",
    realtime_end: "9999-12-31",
  });
  const response = await fetch(`https://api.stlouisfed.org/fred/release/dates?${query.toString()}`, {
    cache: "no-store",
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });
  if (!response.ok) throw new Error(`FRED CPI 발표일 요청 실패: ${response.status}`);
  const payload = (await response.json()) as FredReleaseResponse;
  return (payload.release_dates ?? [])
    .map((item) => item.date)
    .filter((date): date is string => Boolean(date) && /^\d{4}-\d{2}-\d{2}$/.test(date) && date >= BACKFILL_START && date <= future)
    .sort((a, b) => a.localeCompare(b));
}

async function fetchBlsChunk(startYear: number, endYear: number) {
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
  if (!response.ok) throw new Error(`BLS CPI 요청 실패: ${response.status}`);
  const payload = (await response.json()) as BlsResponse;
  if (payload.status && payload.status !== "REQUEST_SUCCEEDED") {
    throw new Error(`BLS CPI 응답 오류: ${payload.status}`);
  }
  const result = new Map<string, Map<string, number>>();
  for (const series of payload.Results?.series ?? []) {
    if (!series.seriesID) continue;
    const points = new Map<string, number>();
    for (const item of series.data ?? []) {
      if (!/^M(0[1-9]|1[0-2])$/.test(item.period)) continue;
      const value = Number(item.value);
      if (Number.isFinite(value)) points.set(`${item.year}-${item.period}`, value);
    }
    result.set(series.seriesID, points);
  }
  return result;
}

async function fetchBlsSeries(startYear: number, endYear: number) {
  const merged = new Map<string, Map<string, number>>();
  for (let chunkStart = startYear; chunkStart <= endYear; chunkStart += 10) {
    const chunkEnd = Math.min(chunkStart + 9, endYear);
    const chunk = await fetchBlsChunk(chunkStart, chunkEnd);
    for (const [seriesId, points] of chunk.entries()) {
      const target = merged.get(seriesId) ?? new Map<string, number>();
      for (const [key, value] of points.entries()) target.set(key, value);
      merged.set(seriesId, target);
    }
  }
  return merged;
}

function indexValue(seriesMap: Map<string, Map<string, number>>, seriesId: string, period: string) {
  return seriesMap.get(seriesId)?.get(periodToBlsKey(period)) ?? null;
}

function yoy(seriesMap: Map<string, Map<string, number>>, seriesId: string, period: string) {
  const current = indexValue(seriesMap, seriesId, period);
  const old = indexValue(seriesMap, seriesId, shiftMonth(period, -12));
  if (current === null || old === null || old === 0) return null;
  return round(((current / old) - 1) * 100, 1);
}

function mom(seriesMap: Map<string, Map<string, number>>, seriesId: string, period: string) {
  const current = indexValue(seriesMap, seriesId, period);
  const old = indexValue(seriesMap, seriesId, shiftMonth(period, -1));
  if (current === null || old === null || old === 0) return null;
  return round(((current / old) - 1) * 100, 1);
}

function computedMetrics(seriesMap: Map<string, Map<string, number>>, period: string) {
  return new Map([
    ["headline_yoy", yoy(seriesMap, CPI_SERIES.headlineNsa, period)],
    ["headline_mom", mom(seriesMap, CPI_SERIES.headlineSa, period)],
    ["core_yoy", yoy(seriesMap, CPI_SERIES.coreNsa, period)],
    ["core_mom", mom(seriesMap, CPI_SERIES.coreSa, period)],
  ] as const);
}

async function fetchYahooDaily(symbol: string, startDate: string, endDate: string) {
  const period1 = Math.floor(Date.parse(`${startDate}T00:00:00Z`) / 1000);
  const period2 = Math.floor(Date.parse(`${endDate}T23:59:59Z`) / 1000);
  const query = new URLSearchParams({
    period1: String(period1), period2: String(period2), interval: "1d", includePrePost: "false", events: "div,splits",
  });
  for (const host of ["query1.finance.yahoo.com", "query2.finance.yahoo.com"]) {
    try {
      const response = await fetch(`https://${host}/v8/finance/chart/${encodeURIComponent(symbol)}?${query.toString()}`, {
        cache: "no-store",
        headers: {
          Accept: "application/json,text/plain;q=0.9,*/*;q=0.8",
          "User-Agent": "Mozilla/5.0 (compatible; HOHAENG-OS/1.0; +https://hohaeng.vercel.app)",
        },
        signal: AbortSignal.timeout(YAHOO_TIMEOUT_MS),
      });
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
            ? { timestamp, value, date: newYorkDate(timestamp * 1000) }
            : null;
        })
        .filter((item): item is YahooPoint => item !== null)
        .sort((a, b) => a.date.localeCompare(b.date));
    } catch {
      // backup host retry
    }
  }
  return [] as YahooPoint[];
}

async function upsertChunks(table: string, rows: Record<string, unknown>[], onConflict: string, size = 250) {
  const supabase = getJhSupabaseAdmin();
  for (let index = 0; index < rows.length; index += size) {
    const chunk = rows.slice(index, index + size);
    const { error } = await supabase.from(table).upsert(chunk, { onConflict });
    if (error) throw new Error(`${table} 저장 실패: ${error.message}`);
  }
}

export async function runCpiHistoricalBackfill() {
  const supabase = getJhSupabaseAdmin();
  const releaseDates = await fetchFredReleaseDates();
  if (releaseDates.length === 0) throw new Error("2016년 이후 CPI 발표일을 찾지 못했습니다.");

  const minYear = Number(releaseDates[0].slice(0, 4)) - 2;
  const maxYear = Number(releaseDates[releaseDates.length - 1].slice(0, 4));
  const seriesMap = await fetchBlsSeries(minYear, maxYear);
  const nowIso = new Date().toISOString();
  const nowMs = Date.now();

  const pendingEvents = releaseDates.map((releaseDate) => {
    const releaseAt = zonedLocalTimeToUtc(releaseDate, "08:30", "America/New_York");
    const referencePeriod = previousMonthKey(releaseDate);
    const actual = computedMetrics(seriesMap, referencePeriod);
    const hasActual = Array.from(actual.values()).some((value) => value !== null);
    return {
      event_key: CPI_EVENT_KEY,
      event_name: "미국 소비자물가지수(CPI)",
      country: "US",
      release_at: releaseAt.toISOString(),
      reference_period: referencePeriod,
      status: releaseAt.getTime() > nowMs ? "scheduled" : hasActual ? "released" : "scheduled",
      source_name: "U.S. Bureau of Labor Statistics + FRED",
      source_url: "https://www.bls.gov/cpi/",
      updated_at: nowIso,
    };
  });

  const { data: eventData, error: eventError } = await supabase
    .from("economic_events")
    .upsert(pendingEvents, { onConflict: "event_key,release_at" })
    .select("id,release_at,reference_period,status");
  if (eventError) throw new Error(`CPI 이벤트 일괄 저장 실패: ${eventError.message}`);
  const events = (eventData ?? []) as EventRow[];
  const ids = events.map((event) => event.id);

  const { data: existingMetricData, error: metricReadError } = await supabase
    .from("economic_event_metrics")
    .select("event_id,metric_key,actual_value,forecast_value,previous_value,surprise_value,forecast_source_name,forecast_source_url")
    .in("event_id", ids);
  if (metricReadError) throw new Error(`기존 CPI 지표 조회 실패: ${metricReadError.message}`);
  const existingMetrics = new Map(
    ((existingMetricData ?? []) as MetricDbRow[]).map((row) => [`${row.event_id}:${row.metric_key}`, row]),
  );

  const metricRows: Record<string, unknown>[] = [];
  for (const event of events) {
    if (!event.reference_period) continue;
    const current = computedMetrics(seriesMap, event.reference_period);
    const previous = computedMetrics(seriesMap, shiftMonth(event.reference_period, -1));
    for (const definition of CPI_METRICS) {
      const existing = existingMetrics.get(`${event.id}:${definition.key}`);
      const actual = current.get(definition.key) ?? null;
      const forecast = safeNumber(existing?.forecast_value);
      metricRows.push({
        event_id: event.id,
        metric_key: definition.key,
        metric_name: definition.name,
        unit: "%",
        actual_value: actual,
        forecast_value: forecast,
        previous_value: previous.get(definition.key) ?? null,
        surprise_value: actual !== null && forecast !== null ? round(actual - forecast, 2) : null,
        source_series_id: definition.sourceSeriesId,
        source_name: "U.S. Bureau of Labor Statistics",
        source_url: "https://www.bls.gov/cpi/",
        forecast_source_name: existing?.forecast_source_name ?? null,
        forecast_source_url: existing?.forecast_source_url ?? null,
        last_synced_at: nowIso,
        updated_at: nowIso,
      });
    }
  }
  await upsertChunks("economic_event_metrics", metricRows, "event_id,metric_key");

  const pastEvents = events.filter((event) => Date.parse(event.release_at) <= nowMs);
  const pastIds = pastEvents.map((event) => event.id);
  const { data: existingReactionData, error: reactionReadError } = await supabase
    .from("economic_event_reactions")
    .select("event_id,asset_key,basis_label,pre_value,after_30m_value,close_value,after_1d_value,after_5d_value,pre_observed_at,after_30m_observed_at,close_observed_at,after_1d_observed_at,after_5d_observed_at")
    .in("event_id", pastIds);
  if (reactionReadError) throw new Error(`기존 CPI 반응 조회 실패: ${reactionReadError.message}`);
  const existingReactions = new Map(
    ((existingReactionData ?? []) as ReactionDbRow[]).map((row) => [`${row.event_id}:${row.asset_key}`, row]),
  );

  const yahooEnd = new Date(Date.now() + 10 * 86_400_000).toISOString().slice(0, 10);
  const reactionRows: Record<string, unknown>[] = [];
  const assetCoverage: Record<string, number> = {};

  for (const asset of REACTION_ASSETS) {
    const daily = await fetchYahooDaily(asset.yahooSymbol, "2015-12-01", yahooEnd);
    const byDate = new Map(daily.map((point) => [point.date, point]));
    const dates = [...byDate.keys()].sort((a, b) => a.localeCompare(b));
    let covered = 0;

    for (const event of pastEvents) {
      const existing = existingReactions.get(`${event.id}:${asset.key}`);
      const preservePrecise = Boolean(
        existing?.pre_value !== null && existing?.pre_value !== undefined &&
        (existing?.basis_label ?? "").includes("발표 직전 대비"),
      );
      if (preservePrecise) continue;

      const eventDate = newYorkDate(Date.parse(event.release_at));
      const eventIndex = dates.indexOf(eventDate);
      if (eventIndex <= 0) continue;
      const previousClose = byDate.get(dates[eventIndex - 1]) ?? null;
      const eventClose = byDate.get(dates[eventIndex]) ?? null;
      const oneDay = byDate.get(dates[eventIndex + 1]) ?? null;
      const fiveDay = byDate.get(dates[eventIndex + 5]) ?? null;
      if (!previousClose || !eventClose) continue;

      reactionRows.push({
        event_id: event.id,
        asset_key: asset.key,
        asset_name: asset.name,
        yahoo_symbol: asset.yahooSymbol,
        basis_label: "과거 백필 · Yahoo 일봉 전 거래일 종가 대비",
        pre_value: previousClose.value,
        after_30m_value: null,
        close_value: eventClose.value,
        after_1d_value: oneDay?.value ?? null,
        after_5d_value: fiveDay?.value ?? null,
        return_30m_pct: null,
        return_close_pct: percentChange(eventClose.value, previousClose.value),
        return_1d_pct: percentChange(oneDay?.value ?? null, previousClose.value),
        return_5d_pct: percentChange(fiveDay?.value ?? null, previousClose.value),
        pre_observed_at: new Date(previousClose.timestamp * 1000).toISOString(),
        after_30m_observed_at: null,
        close_observed_at: new Date(eventClose.timestamp * 1000).toISOString(),
        after_1d_observed_at: oneDay ? new Date(oneDay.timestamp * 1000).toISOString() : null,
        after_5d_observed_at: fiveDay ? new Date(fiveDay.timestamp * 1000).toISOString() : null,
        source_name: "Yahoo Finance",
        quality_note: "2016~ 과거 백필. 무료 장기 일봉 기준으로 전 거래일 종가 대비 당일/+1D/+5D를 계산했습니다. 발표 직전·+30분은 장기 분봉 미제공으로 비워둡니다.",
        last_synced_at: nowIso,
        updated_at: nowIso,
      });
      covered += 1;
    }
    assetCoverage[asset.key] = covered;
  }

  await upsertChunks("economic_event_reactions", reactionRows, "event_id,asset_key");

  return {
    startDate: BACKFILL_START,
    releaseCount: releaseDates.length,
    storedEventCount: events.length,
    metricRowCount: metricRows.length,
    reactionRowCount: reactionRows.length,
    assetCoverage,
    fetchedAt: nowIso,
  };
}

export async function getCpiHistoryArchive(): Promise<CpiHistoryArchiveItem[]> {
  const supabase = getJhSupabaseAdmin();
  const { data: eventsData, error: eventError } = await supabase
    .from("economic_events")
    .select("id,release_at,reference_period,status")
    .eq("event_key", CPI_EVENT_KEY)
    .gte("release_at", `${BACKFILL_START}T00:00:00Z`)
    .lte("release_at", new Date().toISOString())
    .order("release_at", { ascending: false })
    .limit(140);
  if (eventError) throw new Error(`CPI 아카이브 조회 실패: ${eventError.message}`);
  const events = (eventsData ?? []) as EventRow[];
  if (events.length === 0) return [];
  const ids = events.map((event) => event.id);

  const [{ data: metricData, error: metricError }, { data: reactionData, error: reactionError }] = await Promise.all([
    supabase.from("economic_event_metrics").select("event_id,metric_key,actual_value,forecast_value,previous_value,surprise_value,forecast_source_name,forecast_source_url").in("event_id", ids),
    supabase.from("economic_event_reactions").select("event_id,asset_key,basis_label,return_close_pct,return_1d_pct,return_5d_pct").in("event_id", ids).eq("asset_key", "NQ"),
  ]);
  if (metricError) throw new Error(`CPI 아카이브 지표 조회 실패: ${metricError.message}`);
  if (reactionError) throw new Error(`CPI 아카이브 반응 조회 실패: ${reactionError.message}`);

  const metricMap = new Map<string, MetricDbRow>();
  for (const row of (metricData ?? []) as MetricDbRow[]) metricMap.set(`${row.event_id}:${row.metric_key}`, row);
  const reactionMap = new Map<string, any>();
  for (const row of reactionData ?? []) reactionMap.set(row.event_id, row);

  return events.map((event) => {
    const headline = metricMap.get(`${event.id}:headline_yoy`);
    const nq = reactionMap.get(event.id);
    return {
      id: event.id,
      releaseAt: event.release_at,
      referencePeriod: event.reference_period,
      headlineYoy: safeNumber(headline?.actual_value),
      headlineMom: safeNumber(metricMap.get(`${event.id}:headline_mom`)?.actual_value),
      coreYoy: safeNumber(metricMap.get(`${event.id}:core_yoy`)?.actual_value),
      coreMom: safeNumber(metricMap.get(`${event.id}:core_mom`)?.actual_value),
      headlineForecast: safeNumber(headline?.forecast_value),
      headlineSurprise: safeNumber(headline?.surprise_value),
      nqClose: safeNumber(nq?.return_close_pct),
      nq1d: safeNumber(nq?.return_1d_pct),
      nq5d: safeNumber(nq?.return_5d_pct),
      reactionBasis: nq?.basis_label ?? null,
    };
  });
}

export async function getCpiHistoryDetail(id: string): Promise<CpiHistoryDetail | null> {
  const supabase = getJhSupabaseAdmin();
  const { data: eventData, error: eventError } = await supabase
    .from("economic_events")
    .select("id,release_at,reference_period,status")
    .eq("id", id)
    .eq("event_key", CPI_EVENT_KEY)
    .maybeSingle();
  if (eventError) throw new Error(`CPI 상세 이벤트 조회 실패: ${eventError.message}`);
  if (!eventData) return null;

  const [{ data: metricData, error: metricError }, { data: reactionData, error: reactionError }] = await Promise.all([
    supabase.from("economic_event_metrics").select("metric_key,metric_name,actual_value,forecast_value,previous_value,surprise_value,forecast_source_name,forecast_source_url").eq("event_id", id),
    supabase.from("economic_event_reactions").select("asset_key,asset_name,basis_label,return_30m_pct,return_close_pct,return_1d_pct,return_5d_pct,quality_note").eq("event_id", id).order("asset_key"),
  ]);
  if (metricError) throw new Error(`CPI 상세 지표 조회 실패: ${metricError.message}`);
  if (reactionError) throw new Error(`CPI 상세 반응 조회 실패: ${reactionError.message}`);

  const metricOrder = new Map(CPI_METRICS.map((item, index) => [item.key, index]));
  return {
    event: { id: eventData.id, releaseAt: eventData.release_at, referencePeriod: eventData.reference_period, status: eventData.status },
    metrics: (metricData ?? []).map((row: any) => ({
      key: row.metric_key,
      name: row.metric_name,
      actual: safeNumber(row.actual_value),
      forecast: safeNumber(row.forecast_value),
      previous: safeNumber(row.previous_value),
      surprise: safeNumber(row.surprise_value),
      forecastSourceName: row.forecast_source_name ?? null,
      forecastSourceUrl: row.forecast_source_url ?? null,
    })).sort((a, b) => (metricOrder.get(a.key as any) ?? 99) - (metricOrder.get(b.key as any) ?? 99)),
    reactions: (reactionData ?? []).map((row: any) => ({
      assetKey: row.asset_key,
      assetName: row.asset_name,
      basisLabel: row.basis_label,
      closeReturn: safeNumber(row.return_close_pct),
      oneDayReturn: safeNumber(row.return_1d_pct),
      fiveDayReturn: safeNumber(row.return_5d_pct),
      thirtyMinuteReturn: safeNumber(row.return_30m_pct),
      qualityNote: row.quality_note ?? null,
    })),
  };
}
