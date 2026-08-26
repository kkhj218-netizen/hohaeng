import "server-only";

import { getJhSupabaseAdmin } from "@/app/lib/jhDataSupabase";

const EVENT_KEY = "US_NFP";
const HISTORY_START = "2016-01-01";
const SERIES_START = "2014-01-01";
const FRED_BASE = "https://api.stlouisfed.org/fred";
const PAYROLL_SERIES = "PAYEMS";
const UNEMPLOYMENT_SERIES = "UNRATE";
const AHE_SERIES = "CES0500000003";
const TIMEOUT_MS = 20_000;

const ASSETS = [
  { key: "NQ", name: "나스닥100 선물", symbol: "NQ=F" },
  { key: "RTY", name: "러셀2000 선물", symbol: "RTY=F" },
  { key: "GC", name: "금 선물", symbol: "GC=F" },
  { key: "CL", name: "WTI 원유 선물", symbol: "CL=F" },
  { key: "DXY", name: "달러인덱스", symbol: "DX-Y.NYB" },
  { key: "ZT", name: "미국 2년물 국채선물", symbol: "ZT=F" },
  { key: "ZN", name: "미국 10년물 국채선물", symbol: "ZN=F" },
] as const;

const METRICS = [
  { key: "payroll_change", name: "비농업고용 증감", seriesId: PAYROLL_SERIES, unit: "천명" },
  { key: "unemployment_rate", name: "실업률", seriesId: UNEMPLOYMENT_SERIES, unit: "%" },
  { key: "ahe_mom", name: "시간당임금 MoM", seriesId: AHE_SERIES, unit: "%" },
  { key: "ahe_yoy", name: "시간당임금 YoY", seriesId: AHE_SERIES, unit: "%" },
] as const;

type MetricKey = (typeof METRICS)[number]["key"];
type DatePoint = { date: string; value: number };
type ReleaseResponse = { releases?: Array<{ id?: number }>; error_message?: string };
type ReleaseDatesResponse = { release_dates?: Array<{ date?: string }>; error_message?: string };
type ObservationResponse = { observations?: Array<{ date?: string; value?: string }>; error_message?: string };
type YahooResponse = {
  chart?: {
    result?: Array<{
      timestamp?: number[];
      indicators?: { quote?: Array<{ close?: Array<number | null> }> };
    }>;
  };
};

type MetricSnapshot = Record<MetricKey, { actual: number | null; previous: number | null }>;
type ExistingMetric = {
  event_id: string;
  metric_key: string;
  forecast_value: number | string | null;
  forecast_source_name: string | null;
  forecast_source_url: string | null;
};

export type NfpFastBackfillResult = {
  eventCount: number;
  metricCount: number;
  reactionCount: number;
  earliestRelease: string | null;
  latestRelease: string | null;
  mode: "batch";
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

function pct(value: number | null, base: number | null) {
  if (value === null || base === null || base === 0) return null;
  return round(((value / base) - 1) * 100, 2);
}

function monthShift(period: string, offset: number) {
  const [year, month] = period.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1 + offset, 1));
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

function previousMonth(date: string) {
  return monthShift(date.slice(0, 7), -1);
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

function releaseUtc(date: string) {
  return zonedLocalTimeToUtc(date, "08:30", "America/New_York").toISOString();
}

function marketCloseUtc(date: string) {
  return zonedLocalTimeToUtc(date, "16:00", "America/New_York").toISOString();
}

function nyDate(timestampMs: number) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date(timestampMs));
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function fredKey() {
  const key = process.env.FRED_API_KEY;
  if (!key) throw new Error("FRED_API_KEY 환경변수가 없습니다.");
  return key;
}

async function fredJson<T extends { error_message?: string }>(path: string, params: Record<string, string>): Promise<T> {
  const query = new URLSearchParams({ ...params, api_key: fredKey(), file_type: "json" });
  const response = await fetch(`${FRED_BASE}/${path}?${query.toString()}`, {
    cache: "no-store",
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!response.ok) throw new Error(`FRED ${path} 요청 실패 (${response.status})`);
  const payload = (await response.json()) as T;
  if (payload.error_message) throw new Error(`FRED ${path}: ${payload.error_message}`);
  return payload;
}

async function fetchReleaseDates() {
  const release = await fredJson<ReleaseResponse>("series/release", { series_id: PAYROLL_SERIES });
  const releaseId = release.releases?.[0]?.id;
  if (!releaseId) throw new Error("고용보고서 FRED release id를 찾지 못했습니다.");

  const payload = await fredJson<ReleaseDatesResponse>("release/dates", {
    release_id: String(releaseId),
    include_release_dates_with_no_data: "true",
    sort_order: "desc",
    limit: "256",
  });

  const dates = [...new Set(
    (payload.release_dates ?? [])
      .map((item) => item.date ?? "")
      .filter((date) => /^\d{4}-\d{2}-\d{2}$/.test(date) && date >= HISTORY_START),
  )].sort((a, b) => a.localeCompare(b));

  if (!dates.length) throw new Error("2016년 이후 고용보고서 발표일을 찾지 못했습니다.");
  return dates;
}

async function fetchSeries(seriesId: string): Promise<DatePoint[]> {
  const payload = await fredJson<ObservationResponse>("series/observations", {
    series_id: seriesId,
    observation_start: SERIES_START,
    sort_order: "asc",
    limit: "100000",
  });
  return (payload.observations ?? [])
    .map((item) => ({ date: (item.date ?? "").slice(0, 7), value: Number(item.value) }))
    .filter((item) => /^\d{4}-\d{2}$/.test(item.date) && Number.isFinite(item.value));
}

async function fetchYahooDaily(symbol: string): Promise<DatePoint[]> {
  const period1 = Math.floor(Date.parse(`${HISTORY_START}T00:00:00Z`) / 1000) - 10 * 86_400;
  const period2 = Math.floor((Date.now() + 14 * 86_400_000) / 1000);
  const query = new URLSearchParams({
    period1: String(period1),
    period2: String(period2),
    interval: "1d",
    events: "div,splits",
  });

  for (const host of ["query1.finance.yahoo.com", "query2.finance.yahoo.com"]) {
    try {
      const response = await fetch(`https://${host}/v8/finance/chart/${encodeURIComponent(symbol)}?${query.toString()}`, {
        cache: "no-store",
        headers: { "User-Agent": "Mozilla/5.0 (compatible; HOHAENG-OS/1.0; +https://hohaeng.vercel.app)" },
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
      if (!response.ok) continue;
      const payload = (await response.json()) as YahooResponse;
      const result = payload.chart?.result?.[0];
      if (!result) continue;
      const timestamps = result.timestamp ?? [];
      const closes = result.indicators?.quote?.[0]?.close ?? [];
      return timestamps
        .map((timestamp, index) => {
          const value = closes[index];
          return typeof value === "number" && Number.isFinite(value)
            ? { date: nyDate(timestamp * 1000), value }
            : null;
        })
        .filter((item): item is DatePoint => item !== null)
        .sort((a, b) => a.date.localeCompare(b.date));
    } catch {
      // query2 fallback
    }
  }
  return [];
}

function valueMap(points: DatePoint[]) {
  return new Map(points.map((point) => [point.date, point.value]));
}

function metricSnapshot(
  period: string,
  payroll: Map<string, number>,
  unemployment: Map<string, number>,
  earnings: Map<string, number>,
): MetricSnapshot {
  const p0 = payroll.get(period) ?? null;
  const p1 = payroll.get(monthShift(period, -1)) ?? null;
  const p2 = payroll.get(monthShift(period, -2)) ?? null;

  const u0 = unemployment.get(period) ?? null;
  const u1 = unemployment.get(monthShift(period, -1)) ?? null;

  const a0 = earnings.get(period) ?? null;
  const a1 = earnings.get(monthShift(period, -1)) ?? null;
  const a2 = earnings.get(monthShift(period, -2)) ?? null;
  const a12 = earnings.get(monthShift(period, -12)) ?? null;
  const a13 = earnings.get(monthShift(period, -13)) ?? null;

  return {
    payroll_change: {
      actual: p0 !== null && p1 !== null ? round(p0 - p1, 0) : null,
      previous: p1 !== null && p2 !== null ? round(p1 - p2, 0) : null,
    },
    unemployment_rate: { actual: u0, previous: u1 },
    ahe_mom: { actual: pct(a0, a1), previous: pct(a1, a2) },
    ahe_yoy: { actual: pct(a0, a12), previous: pct(a1, a13) },
  };
}

function reactionForDate(date: string, points: DatePoint[]) {
  const eventIndex = points.findIndex((point) => point.date >= date);
  if (eventIndex <= 0 || points[eventIndex]?.date !== date) return null;
  const pre = points[eventIndex - 1];
  const close = points[eventIndex];
  if (!pre || !close) return null;
  const oneDay = points[eventIndex + 1] ?? null;
  const fiveDay = points[eventIndex + 5] ?? null;
  return {
    pre,
    close,
    oneDay,
    fiveDay,
    returnClose: pct(close.value, pre.value),
    return1d: oneDay ? pct(oneDay.value, pre.value) : null,
    return5d: fiveDay ? pct(fiveDay.value, pre.value) : null,
  };
}

function chunks<T>(rows: T[], size: number): T[][] {
  const result: T[][] = [];
  for (let index = 0; index < rows.length; index += size) result.push(rows.slice(index, index + size));
  return result;
}

export async function runNfpHistoricalBackfillFast(): Promise<NfpFastBackfillResult> {
  const supabase = getJhSupabaseAdmin();
  const [releaseDates, payrollPoints, unemploymentPoints, earningsPoints, ...assetSeries] = await Promise.all([
    fetchReleaseDates(),
    fetchSeries(PAYROLL_SERIES),
    fetchSeries(UNEMPLOYMENT_SERIES),
    fetchSeries(AHE_SERIES),
    ...ASSETS.map((asset) => fetchYahooDaily(asset.symbol)),
  ]);

  const payroll = valueMap(payrollPoints);
  const unemployment = valueMap(unemploymentPoints);
  const earnings = valueMap(earningsPoints);
  const now = Date.now();
  const updatedAt = new Date().toISOString();

  const specs = releaseDates.map((releaseDate) => {
    const releaseAt = releaseUtc(releaseDate);
    const referencePeriod = previousMonth(releaseDate);
    const metrics = metricSnapshot(referencePeriod, payroll, unemployment, earnings);
    const released = Date.parse(releaseAt) <= now && Object.values(metrics).every((item) => item.actual !== null);
    return { releaseDate, releaseAt, referencePeriod, metrics, released };
  });

  const eventRows = specs.map((spec) => ({
    event_key: EVENT_KEY,
    event_name: "미국 고용보고서",
    country: "US",
    release_at: spec.releaseAt,
    reference_period: spec.referencePeriod,
    status: spec.released ? "released" : "scheduled",
    source_name: "U.S. Bureau of Labor Statistics via FRED",
    source_url: "https://fred.stlouisfed.org/series/PAYEMS",
    updated_at: updatedAt,
  }));

  const { data: storedEvents, error: eventError } = await supabase
    .from("economic_events")
    .upsert(eventRows, { onConflict: "event_key,release_at" })
    .select("id,release_at");
  if (eventError) throw new Error(`고용보고서 이벤트 일괄 저장 실패: ${eventError.message}`);

  const eventIdByDate = new Map<string, string>();
  for (const row of storedEvents ?? []) {
    if (row.id && row.release_at) eventIdByDate.set(String(row.release_at).slice(0, 10), String(row.id));
  }
  if (eventIdByDate.size !== specs.length) {
    throw new Error(`고용보고서 이벤트 ID 확인 실패: ${eventIdByDate.size}/${specs.length}건`);
  }

  const eventIds = [...eventIdByDate.values()];
  const { data: existingRows, error: existingError } = await supabase
    .from("economic_event_metrics")
    .select("event_id,metric_key,forecast_value,forecast_source_name,forecast_source_url")
    .in("event_id", eventIds);
  if (existingError) throw new Error(`고용보고서 기존 컨센서스 조회 실패: ${existingError.message}`);

  const existingByKey = new Map<string, ExistingMetric>();
  for (const row of (existingRows ?? []) as ExistingMetric[]) {
    existingByKey.set(`${row.event_id}:${row.metric_key}`, row);
  }

  const metricRows = specs.flatMap((spec) => {
    const eventId = eventIdByDate.get(spec.releaseDate)!;
    return METRICS.map((definition) => {
      const current = spec.metrics[definition.key];
      const existing = existingByKey.get(`${eventId}:${definition.key}`);
      const forecast = safeNumber(existing?.forecast_value);
      return {
        event_id: eventId,
        metric_key: definition.key,
        metric_name: definition.name,
        unit: definition.unit,
        actual_value: current.actual,
        previous_value: current.previous,
        forecast_value: forecast,
        surprise_value: current.actual !== null && forecast !== null ? round(current.actual - forecast, definition.key === "payroll_change" ? 0 : 2) : null,
        source_series_id: definition.seriesId,
        source_name: "U.S. Bureau of Labor Statistics via FRED",
        source_url: `https://fred.stlouisfed.org/series/${definition.seriesId}`,
        forecast_source_name: existing?.forecast_source_name ?? null,
        forecast_source_url: existing?.forecast_source_url ?? null,
        last_synced_at: updatedAt,
        updated_at: updatedAt,
      };
    });
  });

  for (const batch of chunks(metricRows, 500)) {
    const { error } = await supabase
      .from("economic_event_metrics")
      .upsert(batch, { onConflict: "event_id,metric_key" });
    if (error) throw new Error(`고용보고서 지표 일괄 저장 실패: ${error.message}`);
  }

  const reactionRows: Array<Record<string, unknown>> = [];
  for (const spec of specs) {
    if (!spec.released) continue;
    const eventId = eventIdByDate.get(spec.releaseDate)!;

    for (let index = 0; index < ASSETS.length; index += 1) {
      const asset = ASSETS[index];
      const reaction = reactionForDate(spec.releaseDate, assetSeries[index] ?? []);
      if (!reaction) continue;
      const missing = [reaction.returnClose, reaction.return1d, reaction.return5d].filter((value) => value === null).length;
      reactionRows.push({
        event_id: eventId,
        asset_key: asset.key,
        asset_name: asset.name,
        yahoo_symbol: asset.symbol,
        basis_label: "발표 전 거래일 종가 대비 · 일봉 기준",
        pre_value: reaction.pre.value,
        close_value: reaction.close.value,
        after_1d_value: reaction.oneDay?.value ?? null,
        after_5d_value: reaction.fiveDay?.value ?? null,
        return_close_pct: reaction.returnClose,
        return_1d_pct: reaction.return1d,
        return_5d_pct: reaction.return5d,
        pre_observed_at: marketCloseUtc(reaction.pre.date),
        close_observed_at: marketCloseUtc(reaction.close.date),
        after_1d_observed_at: reaction.oneDay ? marketCloseUtc(reaction.oneDay.date) : null,
        after_5d_observed_at: reaction.fiveDay ? marketCloseUtc(reaction.fiveDay.date) : null,
        source_name: "Yahoo Finance",
        quality_note: missing ? `장기 일봉 백필 · ${missing}개 구간 미완료` : "장기 일봉 백필 완료",
        last_synced_at: updatedAt,
        updated_at: updatedAt,
      });
    }
  }

  for (const batch of chunks(reactionRows, 500)) {
    const { error } = await supabase
      .from("economic_event_reactions")
      .upsert(batch, { onConflict: "event_id,asset_key" });
    if (error) throw new Error(`고용보고서 시장반응 일괄 저장 실패: ${error.message}`);
  }

  return {
    eventCount: specs.length,
    metricCount: metricRows.length,
    reactionCount: reactionRows.length,
    earliestRelease: releaseDates[0] ?? null,
    latestRelease: releaseDates[releaseDates.length - 1] ?? null,
    mode: "batch",
  };
}
