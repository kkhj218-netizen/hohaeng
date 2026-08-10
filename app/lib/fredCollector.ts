import "server-only";

import { getJhSupabaseAdmin } from "@/app/lib/jhDataSupabase";

export type FredCollectionMode = "daily" | "backfill";
export type FredCollectionRequestMode = FredCollectionMode | "auto";
export type FredCollectionRunMode = FredCollectionMode | "mixed";

type MarketSeries = {
  id: string;
  source_series_code: string;
  frequency: string;
};

type FredObservation = {
  realtime_start: string;
  realtime_end: string;
  date: string;
  value: string;
};

type FredObservationsResponse = {
  observations?: FredObservation[];
  error_message?: string;
};

type FredSeriesInfo = {
  id: string;
  observation_end?: string;
  frequency?: string;
  last_updated?: string;
};

type FredSeriesResponse = {
  seriess?: FredSeriesInfo[];
  error_message?: string;
};

type FredRelease = {
  id: number;
  name: string;
};

type FredReleaseResponse = {
  releases?: FredRelease[];
  error_message?: string;
};

type FredReleaseDatesResponse = {
  release_dates?: Array<{ release_id: number; date: string }>;
  error_message?: string;
};

type PreviousSeriesState = {
  mode: FredCollectionMode | null;
  error: string | null;
  historyComplete: boolean;
  latestObservationDate: string | null;
  sourceLastUpdatedAt: string | null;
  releaseId: number | null;
  releaseName: string | null;
  nextReleaseDate: string | null;
};

type PreparedSeries = {
  series: MarketSeries;
  mode: FredCollectionMode;
  historyComplete: boolean;
  previous: PreviousSeriesState | null;
  sourceLastUpdatedAt: string | null;
  sourceObservationEnd: string | null;
  releaseId: number | null;
  releaseName: string | null;
  metadataWarnings: string[];
  error?: string;
};

type SeriesResult = {
  code: string;
  mode: FredCollectionMode;
  historyComplete: boolean;
  fetched: number;
  saved: number;
  latestObservationDate: string | null;
  sourceLastUpdatedAt: string | null;
  sourceObservationEnd: string | null;
  releaseId: number | null;
  releaseName: string | null;
  nextReleaseDate: string | null;
  checkedAt: string;
  unchanged: boolean;
  metadataWarning?: string;
  error?: string;
};

export type FredCollectionResult = {
  runId: number;
  mode: FredCollectionRunMode;
  status: "success" | "partial";
  seriesCount: number;
  seriesSucceeded: number;
  seriesFailed: number;
  seriesUpdated: number;
  seriesUnchanged: number;
  metadataWarnings: number;
  recordsFetched: number;
  recordsSaved: number;
  failures: Array<{ code: string; error: string }>;
};

const FRED_API_BASE_URL = "https://api.stlouisfed.org/fred";
const UPSERT_BATCH_SIZE = 500;
const FETCH_CONCURRENCY = 6;
const RELEASE_CONCURRENCY = 6;

function getFredApiKey(): string {
  const apiKey = process.env.FRED_API_KEY;

  if (!apiKey) {
    throw new Error("FRED_API_KEY 환경변수가 없습니다.");
  }

  return apiKey;
}

function formatDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function dateInNewYork(): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function daysAgo(days: number): string {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() - days);
  return formatDate(date);
}

function getObservationStart(
  frequency: string,
  mode: FredCollectionMode
): string {
  const normalized = frequency.toLowerCase();

  if (mode === "backfill") {
    if (normalized === "daily") return daysAgo(366 * 5);
    if (normalized === "weekly") return daysAgo(366 * 10);
    if (normalized === "monthly") return daysAgo(366 * 20);
    return daysAgo(366 * 35);
  }

  if (normalized === "daily") return daysAgo(45);
  if (normalized === "weekly") return daysAgo(180);
  if (normalized === "monthly") return daysAgo(550);
  return daysAgo(1_600);
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function jsonObject(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function stringValue(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function numberValue(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.length > 0) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function normalizeFredTimestamp(value: string | undefined): string | null {
  if (!value) return null;
  const isoLike = value
    .replace(" ", "T")
    .replace(/([+-]\d{2})$/, "$1:00");
  const parsed = new Date(isoLike);
  return Number.isNaN(parsed.getTime()) ? value : parsed.toISOString();
}

async function fetchFredJson<T extends { error_message?: string }>(
  path: string,
  params: Record<string, string>
): Promise<T> {
  const url = new URL(`${FRED_API_BASE_URL}/${path}`);
  url.search = new URLSearchParams({
    ...params,
    api_key: getFredApiKey(),
    file_type: "json",
  }).toString();

  const response = await fetch(url, {
    cache: "no-store",
    signal: AbortSignal.timeout(30_000),
  });

  if (!response.ok) {
    throw new Error(`FRED ${path} 요청 실패 (${response.status})`);
  }

  const payload = (await response.json()) as T;
  if (payload.error_message) {
    throw new Error(`FRED ${path}: ${payload.error_message}`);
  }
  return payload;
}

async function resolveSeriesMode(
  series: MarketSeries,
  requestedMode: FredCollectionRequestMode,
  previous: PreviousSeriesState | null
): Promise<{ mode: FredCollectionMode; historyComplete: boolean }> {
  if (requestedMode === "backfill") {
    return { mode: "backfill", historyComplete: false };
  }

  if (requestedMode === "daily") {
    return {
      mode: "daily",
      historyComplete: previous?.historyComplete ?? false,
    };
  }

  // A successful earlier run already proved that the backfill window exists.
  // Reusing that fact avoids forty separate COUNT queries on every refresh.
  if (
    previous &&
    previous.error === null &&
    previous.historyComplete &&
    previous.latestObservationDate &&
    (previous.mode === "daily" || previous.mode === "backfill")
  ) {
    return { mode: "daily", historyComplete: true };
  }

  const minimumHistoryCount =
    series.frequency.toLowerCase() === "daily"
      ? 270
      : series.frequency.toLowerCase() === "weekly"
        ? 110
        : series.frequency.toLowerCase() === "monthly"
          ? 140
          : 85;
  const { count, error } = await getJhSupabaseAdmin()
    .from("historical_data")
    .select("id", { count: "exact", head: true })
    .eq("series_id", series.id);

  if (error) {
    throw new Error(
      `${series.source_series_code} 기존 시계열 확인 실패: ${error.message}`
    );
  }

  return (count ?? 0) >= minimumHistoryCount
    ? { mode: "daily", historyComplete: true }
    : { mode: "backfill", historyComplete: false };
}

async function fetchFredSeriesInfo(code: string): Promise<FredSeriesInfo> {
  const payload = await fetchFredJson<FredSeriesResponse>("series", {
    series_id: code,
  });
  const info = payload.seriess?.[0];
  if (!info) throw new Error(`${code} FRED 시리즈 메타데이터가 없습니다.`);
  return info;
}

async function fetchFredRelease(code: string): Promise<FredRelease | null> {
  const payload = await fetchFredJson<FredReleaseResponse>("series/release", {
    series_id: code,
  });
  return payload.releases?.[0] ?? null;
}

async function fetchNextReleaseDate(releaseId: number): Promise<string | null> {
  const payload = await fetchFredJson<FredReleaseDatesResponse>("release/dates", {
    release_id: String(releaseId),
    include_release_dates_with_no_data: "true",
    sort_order: "desc",
    limit: "1000",
  });
  const sourceToday = dateInNewYork();
  const futureDates = (payload.release_dates ?? [])
    .map((item) => item.date)
    .filter((date) => date >= sourceToday)
    .sort((left, right) => left.localeCompare(right));
  return futureDates[0] ?? null;
}

async function fetchFredObservations(
  series: MarketSeries,
  mode: FredCollectionMode
): Promise<FredObservation[]> {
  const payload = await fetchFredJson<FredObservationsResponse>(
    "series/observations",
    {
      series_id: series.source_series_code,
      sort_order: "asc",
      limit: "100000",
      observation_start: getObservationStart(series.frequency, mode),
    }
  );

  return (payload.observations ?? []).filter(
    (observation) =>
      observation.value !== "." && Number.isFinite(Number(observation.value))
  );
}

function previousSeriesStates(
  metadata: unknown
): Map<string, PreviousSeriesState> {
  const map = new Map<string, PreviousSeriesState>();
  const results = jsonObject(metadata)?.series_results;
  if (!Array.isArray(results)) return map;

  for (const value of results) {
    const row = jsonObject(value);
    const code = stringValue(row?.code);
    if (!row || !code) continue;
    const mode = stringValue(row.mode);
    const error = stringValue(row.error);
    map.set(code, {
      mode: mode === "daily" || mode === "backfill" ? mode : null,
      error,
      historyComplete:
        row.history_complete === true || (mode === "backfill" && error === null),
      latestObservationDate: stringValue(row.latest_observation_date),
      sourceLastUpdatedAt: stringValue(row.source_last_updated_at),
      releaseId: numberValue(row.release_id),
      releaseName: stringValue(row.release_name),
      nextReleaseDate: stringValue(row.next_release_date),
    });
  }

  return map;
}

async function prepareSeries(
  series: MarketSeries,
  requestedMode: FredCollectionRequestMode,
  previous: PreviousSeriesState | null
): Promise<PreparedSeries> {
  let mode: FredCollectionMode =
    requestedMode === "backfill" ? "backfill" : "daily";
  let historyComplete = previous?.historyComplete ?? false;

  try {
    const resolution = await resolveSeriesMode(
      series,
      requestedMode,
      previous
    );
    mode = resolution.mode;
    historyComplete = resolution.historyComplete;
  } catch (error) {
    return {
      series,
      mode,
      historyComplete,
      previous,
      sourceLastUpdatedAt: null,
      sourceObservationEnd: null,
      releaseId: previous?.releaseId ?? null,
      releaseName: previous?.releaseName ?? null,
      metadataWarnings: [],
      error: errorMessage(error),
    };
  }

  const metadataWarnings: string[] = [];
  let sourceLastUpdatedAt: string | null = null;
  let sourceObservationEnd: string | null = null;
  let releaseId = previous?.releaseId ?? null;
  let releaseName = previous?.releaseName ?? null;

  const [seriesInfoResult, releaseResult] = await Promise.allSettled([
    fetchFredSeriesInfo(series.source_series_code),
    releaseId === null &&
    ["monthly", "quarterly"].includes(series.frequency.toLowerCase())
      ? fetchFredRelease(series.source_series_code)
      : Promise.resolve(null),
  ]);

  if (seriesInfoResult.status === "fulfilled") {
    sourceLastUpdatedAt = normalizeFredTimestamp(
      seriesInfoResult.value.last_updated
    );
    sourceObservationEnd = seriesInfoResult.value.observation_end ?? null;
  } else {
    metadataWarnings.push(
      `원천 갱신시각 확인 실패: ${errorMessage(seriesInfoResult.reason)}`
    );
  }

  if (releaseResult.status === "fulfilled" && releaseResult.value) {
    releaseId = releaseResult.value.id;
    releaseName = releaseResult.value.name;
  } else if (releaseResult.status === "rejected") {
    metadataWarnings.push(
      `발표정보 확인 실패: ${errorMessage(releaseResult.reason)}`
    );
  }

  return {
    series,
    mode,
    historyComplete,
    previous,
    sourceLastUpdatedAt,
    sourceObservationEnd,
    releaseId,
    releaseName,
    metadataWarnings,
  };
}

function shouldSkipUnchanged(prepared: PreparedSeries): boolean {
  const previous = prepared.previous;
  if (prepared.mode !== "daily" || !previous) return false;
  if (!prepared.sourceLastUpdatedAt || !previous.sourceLastUpdatedAt) return false;

  const currentObservationEnd = prepared.sourceObservationEnd;
  const previousObservationEnd = previous.latestObservationDate;
  if (!currentObservationEnd || !previousObservationEnd) return false;

  return (
    prepared.sourceLastUpdatedAt <= previous.sourceLastUpdatedAt &&
    currentObservationEnd <= previousObservationEnd
  );
}

async function collectPreparedSeries(
  prepared: PreparedSeries,
  nextReleaseDate: string | null,
  checkedAt: string
): Promise<SeriesResult> {
  const { series, mode } = prepared;
  const metadataWarning =
    prepared.metadataWarnings.length > 0
      ? prepared.metadataWarnings.join(" | ")
      : undefined;

  if (prepared.error) {
    return {
      code: series.source_series_code,
      mode,
      historyComplete: prepared.historyComplete,
      fetched: 0,
      saved: 0,
      latestObservationDate:
        prepared.sourceObservationEnd ??
        prepared.previous?.latestObservationDate ??
        null,
      sourceLastUpdatedAt: prepared.sourceLastUpdatedAt,
      sourceObservationEnd: prepared.sourceObservationEnd,
      releaseId: prepared.releaseId,
      releaseName: prepared.releaseName,
      nextReleaseDate,
      checkedAt,
      unchanged: false,
      metadataWarning,
      error: prepared.error,
    };
  }

  if (shouldSkipUnchanged(prepared)) {
    return {
      code: series.source_series_code,
      mode,
      historyComplete: prepared.historyComplete,
      fetched: 0,
      saved: 0,
      latestObservationDate:
        prepared.sourceObservationEnd ??
        prepared.previous?.latestObservationDate ??
        null,
      sourceLastUpdatedAt: prepared.sourceLastUpdatedAt,
      sourceObservationEnd: prepared.sourceObservationEnd,
      releaseId: prepared.releaseId,
      releaseName: prepared.releaseName,
      nextReleaseDate,
      checkedAt,
      unchanged: true,
      metadataWarning,
    };
  }

  try {
    const observations = await fetchFredObservations(series, mode);
    const supabase = getJhSupabaseAdmin();
    let saved = 0;

    for (let index = 0; index < observations.length; index += UPSERT_BATCH_SIZE) {
      const batch = observations
        .slice(index, index + UPSERT_BATCH_SIZE)
        .map((observation) => ({
          series_id: series.id,
          observed_at: `${observation.date}T00:00:00.000Z`,
          value: observation.value,
          data_quality: "official",
          metadata: {
            source: "FRED",
            source_series_code: series.source_series_code,
            realtime_start: observation.realtime_start,
            realtime_end: observation.realtime_end,
            collected_at: checkedAt,
            source_last_updated_at: prepared.sourceLastUpdatedAt,
            release_id: prepared.releaseId,
            release_name: prepared.releaseName,
            next_release_date: nextReleaseDate,
          },
        }));

      const { error } = await supabase.from("historical_data").upsert(batch, {
        onConflict: "series_id,observed_at",
      });

      if (error) {
        throw new Error(
          `Supabase 저장 실패 (${series.source_series_code}): ${error.message}`
        );
      }

      saved += batch.length;
    }

    return {
      code: series.source_series_code,
      mode,
      historyComplete: mode === "backfill" || prepared.historyComplete,
      fetched: observations.length,
      saved,
      latestObservationDate:
        observations.at(-1)?.date ??
        prepared.sourceObservationEnd ??
        prepared.previous?.latestObservationDate ??
        null,
      sourceLastUpdatedAt: prepared.sourceLastUpdatedAt,
      sourceObservationEnd: prepared.sourceObservationEnd,
      releaseId: prepared.releaseId,
      releaseName: prepared.releaseName,
      nextReleaseDate,
      checkedAt,
      unchanged: false,
      metadataWarning,
    };
  } catch (error) {
    return {
      code: series.source_series_code,
      mode,
      historyComplete: prepared.historyComplete,
      fetched: 0,
      saved: 0,
      latestObservationDate:
        prepared.sourceObservationEnd ??
        prepared.previous?.latestObservationDate ??
        null,
      sourceLastUpdatedAt: prepared.sourceLastUpdatedAt,
      sourceObservationEnd: prepared.sourceObservationEnd,
      releaseId: prepared.releaseId,
      releaseName: prepared.releaseName,
      nextReleaseDate,
      checkedAt,
      unchanged: false,
      metadataWarning,
      error: errorMessage(error),
    };
  }
}

async function mapWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  worker: (item: T) => Promise<R>
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let nextIndex = 0;

  async function runWorker(): Promise<void> {
    while (true) {
      const currentIndex = nextIndex;
      nextIndex += 1;

      if (currentIndex >= items.length) return;
      results[currentIndex] = await worker(items[currentIndex]);
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(concurrency, items.length) }, runWorker)
  );

  return results;
}

async function releaseCalendar(
  preparedSeries: PreparedSeries[]
): Promise<Map<number, { date: string | null; warning?: string }>> {
  const releaseIds = Array.from(
    new Set(
      preparedSeries
        .filter((item) =>
          ["monthly", "quarterly"].includes(
            item.series.frequency.toLowerCase()
          )
        )
        .map((item) => item.releaseId)
        .filter((value): value is number => value !== null)
    )
  );
  const entries = await mapWithConcurrency(
    releaseIds,
    RELEASE_CONCURRENCY,
    async (releaseId) => {
      try {
        return {
          releaseId,
          date: await fetchNextReleaseDate(releaseId),
        };
      } catch (error) {
        return {
          releaseId,
          date: null,
          warning: errorMessage(error),
        };
      }
    }
  );

  return new Map(
    entries.map((entry) => [
      entry.releaseId,
      { date: entry.date, warning: entry.warning },
    ])
  );
}

export async function collectFredData(
  requestedMode: FredCollectionRequestMode
): Promise<FredCollectionResult> {
  const supabase = getJhSupabaseAdmin();
  const startedAt = new Date().toISOString();
  const previousRunResult = await supabase
    .from("collection_runs")
    .select("metadata")
    .eq("source_code", "FRED")
    .in("status", ["success", "partial"])
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  const previousStates = previousSeriesStates(previousRunResult.data?.metadata);

  const { data: run, error: runError } = await supabase
    .from("collection_runs")
    .insert({
      source_code: "FRED",
      started_at: startedAt,
      status: "running",
      records_fetched: 0,
      records_saved: 0,
      metadata: {
        requested_mode: requestedMode,
        source_checked_at: startedAt,
      },
    })
    .select("id")
    .single();

  if (runError || !run) {
    throw new Error(
      `수집 실행 기록 생성 실패: ${runError?.message ?? "알 수 없는 오류"}`
    );
  }

  const runId = Number(run.id);

  try {
    const { data: fredSource, error: sourceError } = await supabase
      .from("source_registry")
      .select("id")
      .eq("source_code", "FRED")
      .single();

    if (sourceError || !fredSource) {
      throw new Error(
        `FRED 출처 조회 실패: ${sourceError?.message ?? "등록 정보 없음"}`
      );
    }

    const { data: series, error: seriesError } = await supabase
      .from("market_series")
      .select("id, source_series_code, frequency")
      .eq("source_id", fredSource.id)
      .eq("is_active", true)
      .not("source_series_code", "is", null)
      .order("display_order", { ascending: true });

    if (seriesError) {
      throw new Error(`지표 목록 조회 실패: ${seriesError.message}`);
    }

    const activeSeries = (series ?? []) as MarketSeries[];

    if (activeSeries.length === 0) {
      throw new Error("수집할 활성 FRED 지표가 없습니다.");
    }

    const prepared = await mapWithConcurrency(
      activeSeries,
      FETCH_CONCURRENCY,
      (item) =>
        prepareSeries(
          item,
          requestedMode,
          previousStates.get(item.source_series_code) ?? null
        )
    );
    const calendar = await releaseCalendar(prepared);
    const checkedAt = new Date().toISOString();
    const results = await mapWithConcurrency(
      prepared,
      FETCH_CONCURRENCY,
      (item) => {
        const release =
          item.releaseId === null ? undefined : calendar.get(item.releaseId);
        if (release?.warning) {
          item.metadataWarnings.push(
            `다음 발표일 확인 실패: ${release.warning}`
          );
        }
        const previousNextRelease = item.previous?.nextReleaseDate;
        const fallbackNextRelease =
          previousNextRelease && previousNextRelease >= dateInNewYork()
            ? previousNextRelease
            : null;
        return collectPreparedSeries(
          item,
          release?.date ?? fallbackNextRelease,
          checkedAt
        );
      }
    );

    const successfulModes = new Set(
      results.filter((result) => !result.error).map((result) => result.mode)
    );
    const mode: FredCollectionRunMode =
      requestedMode === "auto"
        ? successfulModes.size === 1
          ? [...successfulModes][0]
          : "mixed"
        : requestedMode;

    const recordsFetched = results.reduce(
      (sum, result) => sum + result.fetched,
      0
    );
    const recordsSaved = results.reduce(
      (sum, result) => sum + result.saved,
      0
    );
    const failures = results
      .filter((result) => result.error)
      .map((result) => ({ code: result.code, error: result.error! }));
    const successfulResults = results.filter((result) => !result.error);
    const seriesUnchanged = successfulResults.filter(
      (result) => result.unchanged
    ).length;
    const seriesUpdated = successfulResults.length - seriesUnchanged;
    const metadataWarnings = results.filter(
      (result) => result.metadataWarning
    ).length;
    const status = failures.length === 0 ? "success" : "partial";

    const { error: finishError } = await supabase
      .from("collection_runs")
      .update({
        finished_at: new Date().toISOString(),
        status,
        records_fetched: recordsFetched,
        records_saved: recordsSaved,
        error_message:
          failures.length > 0
            ? `${failures.length}개 지표 수집 실패`
            : null,
        metadata: {
          requested_mode: requestedMode,
          mode,
          source_checked_at: checkedAt,
          previous_run_warning: previousRunResult.error?.message ?? null,
          series_count: activeSeries.length,
          series_succeeded: activeSeries.length - failures.length,
          series_failed: failures.length,
          series_updated: seriesUpdated,
          series_unchanged: seriesUnchanged,
          metadata_warnings: metadataWarnings,
          failures,
          series_results: results.map((result) => ({
            code: result.code,
            mode: result.mode,
            history_complete: result.historyComplete,
            fetched: result.fetched,
            saved: result.saved,
            unchanged: result.unchanged,
            latest_observation_date: result.latestObservationDate,
            source_last_updated_at: result.sourceLastUpdatedAt,
            source_observation_end: result.sourceObservationEnd,
            release_id: result.releaseId,
            release_name: result.releaseName,
            next_release_date: result.nextReleaseDate,
            checked_at: result.checkedAt,
            metadata_warning: result.metadataWarning ?? null,
            error: result.error ?? null,
          })),
        },
      })
      .eq("id", runId);

    if (finishError) {
      throw new Error(`수집 실행 기록 완료 처리 실패: ${finishError.message}`);
    }

    return {
      runId,
      mode,
      status,
      seriesCount: activeSeries.length,
      seriesSucceeded: activeSeries.length - failures.length,
      seriesFailed: failures.length,
      seriesUpdated,
      seriesUnchanged,
      metadataWarnings,
      recordsFetched,
      recordsSaved,
      failures,
    };
  } catch (error) {
    const message = errorMessage(error);

    await supabase
      .from("collection_runs")
      .update({
        finished_at: new Date().toISOString(),
        status: "failed",
        error_message: message,
        metadata: {
          requested_mode: requestedMode,
          source_checked_at: startedAt,
        },
      })
      .eq("id", runId);

    throw error;
  }
}
