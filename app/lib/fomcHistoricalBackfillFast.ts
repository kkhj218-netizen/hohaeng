import "server-only";

import { getJhSupabaseAdmin } from "@/app/lib/jhDataSupabase";

const EVENT_KEY = "US_FOMC";
const HISTORY_START = "2016-01-01";
const SERIES_START = "2015-01-01";
const FRED_BASE = "https://api.stlouisfed.org/fred";
const LOWER_SERIES = "DFEDTARL";
const UPPER_SERIES = "DFEDTARU";
const SEP_LONG_RUN_SERIES = "FEDTARMDLR";
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

type MeetingSpec = {
  date: string;
  sep?: boolean;
  emergency?: boolean;
  timeEt?: string;
};

const MEETINGS: MeetingSpec[] = [
  { date: "2016-01-27" }, { date: "2016-03-16", sep: true }, { date: "2016-04-27" }, { date: "2016-06-15", sep: true },
  { date: "2016-07-27" }, { date: "2016-09-21", sep: true }, { date: "2016-11-02" }, { date: "2016-12-14", sep: true },
  { date: "2017-02-01" }, { date: "2017-03-15", sep: true }, { date: "2017-05-03" }, { date: "2017-06-14", sep: true },
  { date: "2017-07-26" }, { date: "2017-09-20", sep: true }, { date: "2017-11-01" }, { date: "2017-12-13", sep: true },
  { date: "2018-01-31" }, { date: "2018-03-21", sep: true }, { date: "2018-05-02" }, { date: "2018-06-13", sep: true },
  { date: "2018-08-01" }, { date: "2018-09-26", sep: true }, { date: "2018-11-08" }, { date: "2018-12-19", sep: true },
  { date: "2019-01-30" }, { date: "2019-03-20", sep: true }, { date: "2019-05-01" }, { date: "2019-06-19", sep: true },
  { date: "2019-07-31" }, { date: "2019-09-18", sep: true }, { date: "2019-10-30" }, { date: "2019-12-11", sep: true },
  { date: "2020-01-29" },
  { date: "2020-03-03", emergency: true, timeEt: "10:00" },
  { date: "2020-03-15", emergency: true, timeEt: "17:00" },
  { date: "2020-04-29" }, { date: "2020-06-10", sep: true }, { date: "2020-07-29" }, { date: "2020-09-16", sep: true },
  { date: "2020-11-05" }, { date: "2020-12-16", sep: true },
  { date: "2021-01-27" }, { date: "2021-03-17", sep: true }, { date: "2021-04-28" }, { date: "2021-06-16", sep: true },
  { date: "2021-07-28" }, { date: "2021-09-22", sep: true }, { date: "2021-11-03" }, { date: "2021-12-15", sep: true },
  { date: "2022-01-26" }, { date: "2022-03-16", sep: true }, { date: "2022-05-04" }, { date: "2022-06-15", sep: true },
  { date: "2022-07-27" }, { date: "2022-09-21", sep: true }, { date: "2022-11-02" }, { date: "2022-12-14", sep: true },
  { date: "2023-02-01" }, { date: "2023-03-22", sep: true }, { date: "2023-05-03" }, { date: "2023-06-14", sep: true },
  { date: "2023-07-26" }, { date: "2023-09-20", sep: true }, { date: "2023-11-01" }, { date: "2023-12-13", sep: true },
  { date: "2024-01-31" }, { date: "2024-03-20", sep: true }, { date: "2024-05-01" }, { date: "2024-06-12", sep: true },
  { date: "2024-07-31" }, { date: "2024-09-18", sep: true }, { date: "2024-11-07" }, { date: "2024-12-18", sep: true },
  { date: "2025-01-29" }, { date: "2025-03-19", sep: true }, { date: "2025-05-07" }, { date: "2025-06-18", sep: true },
  { date: "2025-07-30" }, { date: "2025-09-17", sep: true }, { date: "2025-10-29" }, { date: "2025-12-10", sep: true },
  { date: "2026-01-28" }, { date: "2026-03-18", sep: true }, { date: "2026-04-29" }, { date: "2026-06-17", sep: true },
  { date: "2026-07-29" }, { date: "2026-09-16", sep: true }, { date: "2026-10-28" }, { date: "2026-12-09", sep: true },
  { date: "2027-01-27" }, { date: "2027-03-17", sep: true }, { date: "2027-04-28" }, { date: "2027-06-09", sep: true },
  { date: "2027-07-28" }, { date: "2027-09-15", sep: true }, { date: "2027-10-27" }, { date: "2027-12-08", sep: true },
];

const METRICS = [
  { key: "target_lower", name: "기준금리 하단", unit: "%", seriesId: LOWER_SERIES },
  { key: "target_upper", name: "기준금리 상단", unit: "%", seriesId: UPPER_SERIES },
  { key: "target_midpoint", name: "기준금리 중간값", unit: "%", seriesId: "CALCULATED" },
  { key: "decision_change_bp", name: "금리결정 변화폭", unit: "bp", seriesId: "CALCULATED" },
  { key: "sep_long_run_rate", name: "SEP 장기금리 중앙값", unit: "%", seriesId: SEP_LONG_RUN_SERIES },
] as const;

type MetricKey = (typeof METRICS)[number]["key"];
type DatePoint = { date: string; value: number };
type ObservationResponse = { observations?: Array<{ date?: string; value?: string }>; error_message?: string };
type YahooResponse = {
  chart?: {
    result?: Array<{
      timestamp?: number[];
      indicators?: { quote?: Array<{ close?: Array<number | null> }> };
    }>;
  };
};
type ExistingMetric = {
  event_id: string;
  metric_key: string;
  forecast_value: number | string | null;
  forecast_source_name: string | null;
  forecast_source_url: string | null;
};

type MeetingSnapshot = {
  lower: number | null;
  upper: number | null;
  midpoint: number | null;
  changeBp: number | null;
  preLower: number | null;
  preUpper: number | null;
  preMidpoint: number | null;
  sepLongRun: number | null;
  previousSepLongRun: number | null;
};

export type FomcFastBackfillResult = {
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

function addDays(date: string, offset: number) {
  const instant = new Date(`${date}T12:00:00Z`);
  instant.setUTCDate(instant.getUTCDate() + offset);
  return instant.toISOString().slice(0, 10);
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

function releaseUtc(meeting: MeetingSpec) {
  return zonedLocalTimeToUtc(meeting.date, meeting.timeEt ?? "14:00", "America/New_York").toISOString();
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

async function fetchSeries(seriesId: string): Promise<DatePoint[]> {
  const payload = await fredJson<ObservationResponse>("series/observations", {
    series_id: seriesId,
    observation_start: SERIES_START,
    sort_order: "asc",
    limit: "100000",
  });
  return (payload.observations ?? [])
    .map((item) => ({ date: item.date ?? "", value: Number(item.value) }))
    .filter((item) => /^\d{4}-\d{2}-\d{2}$/.test(item.date) && Number.isFinite(item.value));
}

async function fetchYahooDaily(symbol: string): Promise<DatePoint[]> {
  const period1 = Math.floor(Date.parse(`${HISTORY_START}T00:00:00Z`) / 1000) - 10 * 86_400;
  const period2 = Math.floor((Date.now() + 550 * 86_400_000) / 1000);
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

function previousPoint(points: DatePoint[], date: string) {
  const eligible = points.filter((point) => point.date < date);
  return eligible[eligible.length - 1] ?? null;
}

function meetingSnapshot(
  meeting: MeetingSpec,
  lower: Map<string, number>,
  upper: Map<string, number>,
  sepPoints: DatePoint[],
): MeetingSnapshot {
  const preLower = lower.get(meeting.date) ?? null;
  const preUpper = upper.get(meeting.date) ?? null;
  const effectiveDate = addDays(meeting.date, 1);
  const postLower = lower.get(effectiveDate) ?? null;
  const postUpper = upper.get(effectiveDate) ?? null;
  const preMidpoint = preLower !== null && preUpper !== null ? round((preLower + preUpper) / 2, 3) : null;
  const midpoint = postLower !== null && postUpper !== null ? round((postLower + postUpper) / 2, 3) : null;
  const changeBp = midpoint !== null && preMidpoint !== null ? round((midpoint - preMidpoint) * 100, 0) : null;
  const sepMap = valueMap(sepPoints);
  const sepLongRun = meeting.sep ? sepMap.get(meeting.date) ?? null : null;
  const previousSepLongRun = meeting.sep ? previousPoint(sepPoints, meeting.date)?.value ?? null : null;
  return {
    lower: postLower,
    upper: postUpper,
    midpoint,
    changeBp,
    preLower,
    preUpper,
    preMidpoint,
    sepLongRun,
    previousSepLongRun,
  };
}

function reactionForDecisionDate(date: string, points: DatePoint[]) {
  const eventIndex = points.findIndex((point) => point.date >= date);
  if (eventIndex <= 0) return null;
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

export async function runFomcHistoricalBackfillFast(): Promise<FomcFastBackfillResult> {
  const supabase = getJhSupabaseAdmin();
  const [lowerPoints, upperPoints, sepPoints, ...assetSeries] = await Promise.all([
    fetchSeries(LOWER_SERIES),
    fetchSeries(UPPER_SERIES),
    fetchSeries(SEP_LONG_RUN_SERIES),
    ...ASSETS.map((asset) => fetchYahooDaily(asset.symbol)),
  ]);

  const lower = valueMap(lowerPoints);
  const upper = valueMap(upperPoints);
  const now = Date.now();
  const updatedAt = new Date().toISOString();

  const specs = MEETINGS.map((meeting) => {
    const releaseAt = releaseUtc(meeting);
    const snapshot = meetingSnapshot(meeting, lower, upper, sepPoints);
    const released = Date.parse(releaseAt) <= now && snapshot.lower !== null && snapshot.upper !== null;
    const referencePeriod = meeting.emergency ? "EMERGENCY" : meeting.sep ? "SEP" : "REGULAR";
    return { meeting, releaseAt, snapshot, released, referencePeriod };
  });

  const eventRows = specs.map((spec) => ({
    event_key: EVENT_KEY,
    event_name: "FOMC 기준금리 결정",
    country: "US",
    release_at: spec.releaseAt,
    reference_period: spec.referencePeriod,
    status: spec.released ? "released" : "scheduled",
    source_name: "Federal Reserve Board / FRED",
    source_url: "https://www.federalreserve.gov/monetarypolicy/fomccalendars.htm",
    updated_at: updatedAt,
  }));

  const { data: storedEvents, error: eventError } = await supabase
    .from("economic_events")
    .upsert(eventRows, { onConflict: "event_key,release_at" })
    .select("id,release_at");
  if (eventError) throw new Error(`FOMC 이벤트 일괄 저장 실패: ${eventError.message}`);

  const eventIdByDate = new Map<string, string>();
  for (const row of storedEvents ?? []) {
    if (row.id && row.release_at) eventIdByDate.set(String(row.release_at).slice(0, 10), String(row.id));
  }
  if (eventIdByDate.size !== specs.length) {
    throw new Error(`FOMC 이벤트 ID 확인 실패: ${eventIdByDate.size}/${specs.length}건`);
  }

  const eventIds = [...eventIdByDate.values()];
  const { data: existingRows, error: existingError } = await supabase
    .from("economic_event_metrics")
    .select("event_id,metric_key,forecast_value,forecast_source_name,forecast_source_url")
    .in("event_id", eventIds);
  if (existingError) throw new Error(`FOMC 기존 컨센서스 조회 실패: ${existingError.message}`);

  const existingByKey = new Map<string, ExistingMetric>();
  for (const row of (existingRows ?? []) as ExistingMetric[]) {
    existingByKey.set(`${row.event_id}:${row.metric_key}`, row);
  }

  const releasedSpecs = specs.filter((spec) => spec.released);
  const previousChangeByDate = new Map<string, number | null>();
  releasedSpecs.forEach((spec, index) => {
    previousChangeByDate.set(spec.meeting.date, index > 0 ? releasedSpecs[index - 1].snapshot.changeBp : null);
  });

  const metricRows = specs.flatMap((spec) => {
    const eventId = eventIdByDate.get(spec.meeting.date)!;
    const values: Record<MetricKey, { actual: number | null; previous: number | null }> = {
      target_lower: { actual: spec.snapshot.lower, previous: spec.snapshot.preLower },
      target_upper: { actual: spec.snapshot.upper, previous: spec.snapshot.preUpper },
      target_midpoint: { actual: spec.snapshot.midpoint, previous: spec.snapshot.preMidpoint },
      decision_change_bp: { actual: spec.snapshot.changeBp, previous: previousChangeByDate.get(spec.meeting.date) ?? null },
      sep_long_run_rate: { actual: spec.snapshot.sepLongRun, previous: spec.snapshot.previousSepLongRun },
    };

    return METRICS.map((definition) => {
      const current = values[definition.key];
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
        surprise_value: current.actual !== null && forecast !== null ? round(current.actual - forecast, definition.unit === "bp" ? 0 : 2) : null,
        source_series_id: definition.seriesId,
        source_name: definition.seriesId === "CALCULATED" ? "HOHAENG calculation from Federal Reserve target range" : "Federal Reserve Board via FRED",
        source_url: definition.seriesId === "CALCULATED"
          ? "https://www.federalreserve.gov/monetarypolicy/fomccalendars.htm"
          : `https://fred.stlouisfed.org/series/${definition.seriesId}`,
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
    if (error) throw new Error(`FOMC 지표 일괄 저장 실패: ${error.message}`);
  }

  const reactionRows: Array<Record<string, unknown>> = [];
  for (const spec of specs) {
    if (!spec.released) continue;
    const eventId = eventIdByDate.get(spec.meeting.date)!;

    for (let index = 0; index < ASSETS.length; index += 1) {
      const asset = ASSETS[index];
      const reaction = reactionForDecisionDate(spec.meeting.date, assetSeries[index] ?? []);
      if (!reaction) continue;
      const missing = [reaction.returnClose, reaction.return1d, reaction.return5d].filter((value) => value === null).length;
      reactionRows.push({
        event_id: eventId,
        asset_key: asset.key,
        asset_name: asset.name,
        yahoo_symbol: asset.symbol,
        basis_label: spec.meeting.emergency
          ? "결정 직전 거래일 종가 대비 · 다음 거래일 일봉 기준"
          : "결정 직전 거래일 종가 대비 · 결정일 종가/+1D/+5D",
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
        quality_note: `${spec.meeting.emergency ? "긴급회의 · " : ""}장기 일봉 백필${missing ? ` · ${missing}개 구간 미완료` : " 완료"}`,
        last_synced_at: updatedAt,
        updated_at: updatedAt,
      });
    }
  }

  for (const batch of chunks(reactionRows, 500)) {
    const { error } = await supabase
      .from("economic_event_reactions")
      .upsert(batch, { onConflict: "event_id,asset_key" });
    if (error) throw new Error(`FOMC 시장반응 일괄 저장 실패: ${error.message}`);
  }

  return {
    eventCount: specs.length,
    metricCount: metricRows.length,
    reactionCount: reactionRows.length,
    earliestRelease: specs[0]?.meeting.date ?? null,
    latestRelease: specs[specs.length - 1]?.meeting.date ?? null,
    mode: "batch",
  };
}
