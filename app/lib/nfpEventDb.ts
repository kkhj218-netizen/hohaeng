import "server-only";

import { getJhSupabaseAdmin } from "@/app/lib/jhDataSupabase";

const EVENT_KEY = "US_NFP";

export type NfpEventMetricView = {
  key: string;
  name: string;
  unit: string;
  actual: number | null;
  forecast: number | null;
  previous: number | null;
  surprise: number | null;
};

export type NfpEventView = {
  id: string;
  releaseAt: string;
  referencePeriod: string | null;
  status: string;
  metrics: NfpEventMetricView[];
  reactions: Array<{
    assetKey: string;
    assetName: string;
    close: number | null;
    oneDay: number | null;
    fiveDay: number | null;
  }>;
};

export type NfpPageData = {
  latest: NfpEventView | null;
  upcoming: NfpEventView | null;
  history: NfpEventView[];
  totalCount: number;
};

function safeNumber(value: number | string | null | undefined): number | null {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export async function getNfpPageData(): Promise<NfpPageData> {
  const supabase = getJhSupabaseAdmin();
  const nowIso = new Date().toISOString();
  const { data: events, error } = await supabase
    .from("economic_events")
    .select("id,release_at,reference_period,status")
    .eq("event_key", EVENT_KEY)
    .order("release_at", { ascending: false })
    .limit(140);
  if (error) throw new Error(`고용보고서 이벤트 조회 실패: ${error.message}`);

  const rows = (events ?? []) as Array<{
    id: string;
    release_at: string;
    reference_period: string | null;
    status: string;
  }>;
  if (!rows.length) return { latest: null, upcoming: null, history: [], totalCount: 0 };

  const ids = rows.map((row) => row.id);
  const [{ data: metricRows, error: metricError }, { data: reactionRows, error: reactionError }] = await Promise.all([
    supabase
      .from("economic_event_metrics")
      .select("event_id,metric_key,metric_name,unit,actual_value,forecast_value,previous_value,surprise_value")
      .in("event_id", ids),
    supabase
      .from("economic_event_reactions")
      .select("event_id,asset_key,asset_name,return_close_pct,return_1d_pct,return_5d_pct")
      .in("event_id", ids),
  ]);
  if (metricError) throw new Error(`고용보고서 지표 조회 실패: ${metricError.message}`);
  if (reactionError) throw new Error(`고용보고서 반응 조회 실패: ${reactionError.message}`);

  const views: NfpEventView[] = rows.map((row) => ({
    id: row.id,
    releaseAt: row.release_at,
    referencePeriod: row.reference_period,
    status: row.status,
    metrics: (metricRows ?? [])
      .filter((metric) => metric.event_id === row.id)
      .map((metric) => ({
        key: metric.metric_key,
        name: metric.metric_name,
        unit: metric.unit ?? "",
        actual: safeNumber(metric.actual_value),
        forecast: safeNumber(metric.forecast_value),
        previous: safeNumber(metric.previous_value),
        surprise: safeNumber(metric.surprise_value),
      })),
    reactions: (reactionRows ?? [])
      .filter((reaction) => reaction.event_id === row.id)
      .map((reaction) => ({
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
