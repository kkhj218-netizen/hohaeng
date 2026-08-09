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

type FredResponse = {
  observations?: FredObservation[];
  error_message?: string;
};

type SeriesResult = {
  code: string;
  mode: FredCollectionMode;
  fetched: number;
  saved: number;
  latestObservationDate: string | null;
  error?: string;
};

export type FredCollectionResult = {
  runId: number;
  mode: FredCollectionRunMode;
  status: "success" | "partial";
  seriesCount: number;
  seriesSucceeded: number;
  seriesFailed: number;
  recordsFetched: number;
  recordsSaved: number;
  failures: Array<{ code: string; error: string }>;
};

const FRED_OBSERVATIONS_URL =
  "https://api.stlouisfed.org/fred/series/observations";
const UPSERT_BATCH_SIZE = 500;
const FETCH_CONCURRENCY = 4;

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

async function resolveSeriesMode(
  series: MarketSeries,
  requestedMode: FredCollectionRequestMode
): Promise<FredCollectionMode> {
  if (requestedMode !== "auto") {
    return requestedMode;
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

  return (count ?? 0) >= minimumHistoryCount ? "daily" : "backfill";
}

async function fetchFredObservations(
  series: MarketSeries,
  mode: FredCollectionMode
): Promise<FredObservation[]> {
  const params = new URLSearchParams({
    series_id: series.source_series_code,
    api_key: getFredApiKey(),
    file_type: "json",
    sort_order: "asc",
    limit: "100000",
    observation_start: getObservationStart(series.frequency, mode),
  });

  const response = await fetch(`${FRED_OBSERVATIONS_URL}?${params}`, {
    cache: "no-store",
    signal: AbortSignal.timeout(30_000),
  });

  if (!response.ok) {
    throw new Error(
      `FRED ${series.source_series_code} 요청 실패 (${response.status})`
    );
  }

  const payload = (await response.json()) as FredResponse;

  if (payload.error_message) {
    throw new Error(
      `FRED ${series.source_series_code}: ${payload.error_message}`
    );
  }

  return (payload.observations ?? []).filter(
    (observation) =>
      observation.value !== "." && Number.isFinite(Number(observation.value))
  );
}

async function collectSeries(
  series: MarketSeries,
  requestedMode: FredCollectionRequestMode
): Promise<SeriesResult> {
  let mode: FredCollectionMode =
    requestedMode === "backfill" ? "backfill" : "daily";

  try {
    mode = await resolveSeriesMode(series, requestedMode);
    const observations = await fetchFredObservations(series, mode);
    const supabase = getJhSupabaseAdmin();
    const collectedAt = new Date().toISOString();
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
            collected_at: collectedAt,
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
      fetched: observations.length,
      saved,
      latestObservationDate:
        observations.length > 0
          ? observations[observations.length - 1].date
          : null,
    };
  } catch (error) {
    return {
      code: series.source_series_code,
      mode,
      fetched: 0,
      saved: 0,
      latestObservationDate: null,
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

export async function collectFredData(
  requestedMode: FredCollectionRequestMode
): Promise<FredCollectionResult> {
  const supabase = getJhSupabaseAdmin();
  const startedAt = new Date().toISOString();

  const { data: run, error: runError } = await supabase
    .from("collection_runs")
    .insert({
      source_code: "FRED",
      started_at: startedAt,
      status: "running",
      records_fetched: 0,
      records_saved: 0,
      metadata: { requested_mode: requestedMode },
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

    const results = await mapWithConcurrency(
      activeSeries,
      FETCH_CONCURRENCY,
      (item) => collectSeries(item, requestedMode)
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
          series_count: activeSeries.length,
          series_succeeded: activeSeries.length - failures.length,
          series_failed: failures.length,
          failures,
          series_results: results.map((result) => ({
            code: result.code,
            mode: result.mode,
            fetched: result.fetched,
            saved: result.saved,
            latest_observation_date: result.latestObservationDate,
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
        metadata: { requested_mode: requestedMode },
      })
      .eq("id", runId);

    throw error;
  }
}
