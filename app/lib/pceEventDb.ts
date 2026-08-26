import "server-only";

import { getJhSupabaseAdmin } from "@/app/lib/jhDataSupabase";

const EVENT_KEY = "US_PCE";
const HISTORY_START = "2016-01-01";
const SERIES_START = "2014-01-01";
const FRED_BASE = "https://api.stlouisfed.org/fred";
const HEADLINE_SERIES = "PCEPI";
const CORE_SERIES = "PCEPILFE";
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

type DatePoint = { date: string; value: number };
type ReleaseResponse = { releases?: Array<{ id?: number; name?: string }>; error_message?: string };
type ReleaseDatesResponse = { release_dates?: Array<{ date?: string }>; error_message?: string };
type ObservationResponse = { observations?: Array<{ date?: string; value?: string }>; error_message?: string };
type YahooResponse = { chart?: { result?: Array<{ timestamp?: number[]; indicators?: { quote?: Array<{ close?: Array<number | null> }> } }> } } };

type MetricKey = "headline_yoy" | "headline_mom" | "core_yoy" | "core_mom";

export type PceBackfillResult = {
  eventCount: number;
  metricCount: number;
  reactionCount: number;
  earliestRelease: string | null;
  latestRelease: string | null;
};

export type PceEventView = {
  id: string;
  releaseAt: string;
  referencePeriod: string | null;
  status: string;
  metrics: Array<{
    key: string;
    name: string;
    actual: number | null;
    forecast: number | null;
    previous: number | null;
    surprise: number | null;
  }>;
  reactions: Array<{
    assetKey: string;
    assetName: string;
    close: number | null;
    oneDay: number | null;
    fiveDay: number | null;
  }>;
};

export type PcePageData = {
  latest: PceEventView | null;
  upcoming: PceEventView | null;
  history: PceEventView[];
  totalCount: number;
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

function nyDate(timestampMs: number) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date(timestampMs));
  const map = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${map.year}-${map.month}-${map.day}`;
}

function releaseUtc(date: string) {
  // BEA Personal Income and Outlays is normally released at 08:30 ET.
  // Noon UTC safely maps to the same release date for event identity; reaction calculations use the date only.
  return `${date}T12:30:00.000Z`;
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
  if (payload.error_message) throw new Error(payload.error_message);
  return payload;
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

async function fetchReleaseDates(): Promise<string[]> {
  const release = await fredJson<ReleaseResponse>("series/release", { series_id: HEADLINE_SERIES });
  const releaseId = release.releases?.[0]?.id;
  if (!releaseId) throw new Error("PCE FRED release id를 찾지 못했습니다.");
  const payload = await fredJson<ReleaseDatesResponse>("release/dates", {
    release_id: String(releaseId),
    include_release_dates_with_no_data: "true",
    sort_order: "desc",
    limit: "256",
  });
  return [...new Set((payload.release_dates ?? []).map((item) => item.date ?? "").filter((date) => date >= HISTORY_START))]
    .sort((a, b) => a.localeCompare(b));
}

async function fetchYahooDaily(symbol: string): Promise<DatePoint[]> {
  const period1 = Math.floor(Date.parse(`${HISTORY_START}T00:00:00Z`) / 1000) - 10 * 86_400;
  const period2 = Math.floor((Date.now() + 14 * 86_400_000) / 1000);
  const query = new URLSearchParams({ period1: String(period1), period2: String(period2), interval: "1d", events: "div,splits" });
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
      // fallback host
    }
  }
  return [];
}

function valueMap(points: DatePoint[]) {
  return new Map(points.map((point) => [point.date, point.value]));
}

function metricSnapshot(period: string, headline: Map<string, number>, core: Map<string, number>) {
  const h = headline.get(period) ?? null;
  const h1 = headline.get(monthShift(period, -1)) ?? null;
  const h12 = headline.get(monthShift(period, -12)) ?? null;
  const hp = headline.get(monthShift(period, -1)) ?? null;
  const hp1 = headline.get(monthShift(period, -2)) ?? null;
  const hp12 = headline.get(monthShift(period, -13)) ?? null;

  const c = core.get(period) ?? null;
  const c1 = core.get(monthShift(period, -1)) ?? null;
  const c12 = core.get(monthShift(period, -12)) ?? null;
  const cp = core.get(monthShift(period, -1)) ?? null;
  const cp1 = core.get(monthShift(period, -2)) ?? null;
  const cp12 = core.get(monthShift(period, -13)) ?? null;

  return {
    headline_yoy: { actual: pct(h, h12), previous: pct(hp, hp12) },
    headline_mom: { actual: pct(h, h1), previous: pct(hp, hp1) },
    core_yoy: { actual: pct(c, c12), previous: pct(cp, cp12) },
    core_mom: { actual: pct(c, c1), previous: pct(cp, cp1) },
  } satisfies Record<MetricKey, { actual: number | null; previous: number | null }>;
}

function reactionForDate(date: string, points: DatePoint[]) {
  const eventIndex = points.findIndex((point) => point.date >= date);
  if (eventIndex <= 0) return null;
  const pre = points[eventIndex - 1] ?? null;
  const close = points[eventIndex]?.date === date ? points[eventIndex] : null;
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

export async function runPceHistoricalBackfill(): Promise<PceBackfillResult> {
  const supabase = getJhSupabaseAdmin();
  const [releaseDates, headlinePoints, corePoints, ...assetSeries] = await Promise.all([
    fetchReleaseDates(),
    fetchSeries(HEADLINE_SERIES),
    fetchSeries(CORE_SERIES),
    ...ASSETS.map((asset) => fetchYahooDaily(asset.symbol)),
  ]);

  const headline = valueMap(headlinePoints);
  const core = valueMap(corePoints);
  const now = Date.now();
  let metricCount = 0;
  let reactionCount = 0;

  for (const releaseDate of releaseDates) {
    const releaseAt = releaseUtc(releaseDate);
    const referencePeriod = previousMonth(releaseDate);
    const metrics = metricSnapshot(referencePeriod, headline, core);
    const released = Date.parse(releaseAt) <= now && Object.values(metrics).every((item) => item.actual !== null);

    const { data: eventRow, error: eventError } = await supabase
      .from("economic_events")
      .upsert({
        event_key: EVENT_KEY,
        event_name: "미국 PCE 물가지수",
        country: "US",
        release_at: releaseAt,
        reference_period: referencePeriod,
        status: released ? "released" : "scheduled",
        source_name: "U.S. Bureau of Economic Analysis via FRED",
        source_url: "https://fred.stlouisfed.org/series/PCEPI",
        updated_at: new Date().toISOString(),
      }, { onConflict: "event_key,release_at" })
      .select("id")
      .single();

    if (eventError || !eventRow?.id) throw new Error(`PCE 이벤트 저장 실패: ${eventError?.message ?? "id 없음"}`);
    const eventId = eventRow.id as string;

    const metricDefs: Array<[MetricKey, string, string]> = [
      ["headline_yoy", "헤드라인 PCE YoY", HEADLINE_SERIES],
      ["headline_mom", "헤드라인 PCE MoM", HEADLINE_SERIES],
      ["core_yoy", "근원 PCE YoY", CORE_SERIES],
      ["core_mom", "근원 PCE MoM", CORE_SERIES],
    ];

    for (const [key, name, seriesId] of metricDefs) {
      const current = metrics[key];
      const { data: existing } = await supabase
        .from("economic_event_metrics")
        .select("forecast_value,forecast_source_name,forecast_source_url")
        .eq("event_id", eventId)
        .eq("metric_key", key)
        .maybeSingle();
      const forecast = safeNumber(existing?.forecast_value);
      const { error } = await supabase.from("economic_event_metrics").upsert({
        event_id: eventId,
        metric_key: key,
        metric_name: name,
        unit: "%",
        actual_value: current.actual,
        previous_value: current.previous,
        forecast_value: forecast,
        surprise_value: current.actual !== null && forecast !== null ? round(current.actual - forecast, 2) : null,
        source_series_id: seriesId,
        source_name: "U.S. Bureau of Economic Analysis via FRED",
        source_url: `https://fred.stlouisfed.org/series/${seriesId}`,
        forecast_source_name: existing?.forecast_source_name ?? null,
        forecast_source_url: existing?.forecast_source_url ?? null,
        last_synced_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }, { onConflict: "event_id,metric_key" });
      if (error) throw new Error(`PCE 지표 저장 실패: ${error.message}`);
      metricCount += 1;
    }

    if (!released) continue;
    for (let index = 0; index < ASSETS.length; index += 1) {
      const asset = ASSETS[index];
      const reaction = reactionForDate(releaseDate, assetSeries[index] ?? []);
      if (!reaction) continue;
      const missing = [reaction.returnClose, reaction.return1d, reaction.return5d].filter((value) => value === null).length;
      const { error } = await supabase.from("economic_event_reactions").upsert({
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
        pre_observed_at: `${reaction.pre.date}T20:00:00Z`,
        close_observed_at: `${reaction.close.date}T20:00:00Z`,
        after_1d_observed_at: reaction.oneDay ? `${reaction.oneDay.date}T20:00:00Z` : null,
        after_5d_observed_at: reaction.fiveDay ? `${reaction.fiveDay.date}T20:00:00Z` : null,
        source_name: "Yahoo Finance",
        quality_note: missing ? `장기 일봉 백필 · ${missing}개 구간 미완료` : "장기 일봉 백필 완료",
        last_synced_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }, { onConflict: "event_id,asset_key" });
      if (error) throw new Error(`PCE 시장반응 저장 실패: ${error.message}`);
      reactionCount += 1;
    }
  }

  return {
    eventCount: releaseDates.length,
    metricCount,
    reactionCount,
    earliestRelease: releaseDates[0] ?? null,
    latestRelease: releaseDates.at(-1) ?? null,
  };
}

export async function getPcePageData(): Promise<PcePageData> {
  const supabase = getJhSupabaseAdmin();
  const nowIso = new Date().toISOString();
  const { data: events, error } = await supabase
    .from("economic_events")
    .select("id,release_at,reference_period,status")
    .eq("event_key", EVENT_KEY)
    .order("release_at", { ascending: false })
    .limit(140);
  if (error) throw new Error(`PCE 이벤트 조회 실패: ${error.message}`);
  const rows = (events ?? []) as Array<{ id: string; release_at: string; reference_period: string | null; status: string }>;
  if (!rows.length) return { latest: null, upcoming: null, history: [], totalCount: 0 };

  const ids = rows.map((row) => row.id);
  const [{ data: metricRows }, { data: reactionRows }] = await Promise.all([
    supabase.from("economic_event_metrics").select("event_id,metric_key,metric_name,actual_value,forecast_value,previous_value,surprise_value").in("event_id", ids),
    supabase.from("economic_event_reactions").select("event_id,asset_key,asset_name,return_close_pct,return_1d_pct,return_5d_pct").in("event_id", ids),
  ]);

  const views: PceEventView[] = rows.map((row) => ({
    id: row.id,
    releaseAt: row.release_at,
    referencePeriod: row.reference_period,
    status: row.status,
    metrics: (metricRows ?? []).filter((metric) => metric.event_id === row.id).map((metric) => ({
      key: metric.metric_key,
      name: metric.metric_name,
      actual: safeNumber(metric.actual_value),
      forecast: safeNumber(metric.forecast_value),
      previous: safeNumber(metric.previous_value),
      surprise: safeNumber(metric.surprise_value),
    })),
    reactions: (reactionRows ?? []).filter((reaction) => reaction.event_id === row.id).map((reaction) => ({
      assetKey: reaction.asset_key,
      assetName: reaction.asset_name,
      close: safeNumber(reaction.return_close_pct),
      oneDay: safeNumber(reaction.return_1d_pct),
      fiveDay: safeNumber(reaction.return_5d_pct),
    })),
  }));

  const latest = views.find((view) => view.releaseAt <= nowIso && view.metrics.some((metric) => metric.actual !== null)) ?? null;
  const upcoming = [...views].reverse().find((view) => view.releaseAt > nowIso) ?? null;
  const history = views.filter((view) => view.releaseAt <= nowIso && view.metrics.some((metric) => metric.actual !== null));
  return { latest, upcoming, history, totalCount: rows.length };
}
