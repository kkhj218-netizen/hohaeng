import "server-only";

import type { GoogleRankAnalysis } from "@/app/lib/googleRankPredictor";
import { getSearchConsolePageMetric } from "@/app/lib/googleSearchConsole";
import { getJhSupabaseAdmin } from "@/app/lib/jhDataSupabase";

export type GoogleRankPredictionHistory = {
  id: string;
  createdAt: string;
  title: string;
  url: string | null;
  primaryKeyword: string;
  opportunityScore: number;
  serpDifficulty: number;
  siteAuthority: number;
  predictedMin: number;
  predictedMax: number;
  top10Probability: number;
  confidence: string;
  serpConnected: boolean;
  gscConnected: boolean;
  actualPosition7d: number | null;
  actualPosition14d: number | null;
  actualPosition30d: number | null;
  actualPosition60d: number | null;
  predictionError30d: number | null;
  lastCheckedAt: string | null;
};

type PredictionRow = {
  id: string;
  created_at: string;
  title: string;
  url: string | null;
  primary_keyword: string;
  opportunity_score: number;
  serp_difficulty: number;
  site_authority: number;
  predicted_min: number;
  predicted_max: number;
  top10_probability: number;
  confidence: string;
  serp_connected: boolean;
  gsc_connected: boolean;
  actual_position_7d: number | null;
  actual_position_14d: number | null;
  actual_position_30d: number | null;
  actual_position_60d: number | null;
  prediction_error_30d: number | null;
  last_checked_at: string | null;
};

function toHistory(row: PredictionRow): GoogleRankPredictionHistory {
  return {
    id: row.id,
    createdAt: row.created_at,
    title: row.title,
    url: row.url,
    primaryKeyword: row.primary_keyword,
    opportunityScore: row.opportunity_score,
    serpDifficulty: row.serp_difficulty,
    siteAuthority: row.site_authority,
    predictedMin: row.predicted_min,
    predictedMax: row.predicted_max,
    top10Probability: row.top10_probability,
    confidence: row.confidence,
    serpConnected: row.serp_connected,
    gscConnected: row.gsc_connected,
    actualPosition7d: row.actual_position_7d,
    actualPosition14d: row.actual_position_14d,
    actualPosition30d: row.actual_position_30d,
    actualPosition60d: row.actual_position_60d,
    predictionError30d: row.prediction_error_30d,
    lastCheckedAt: row.last_checked_at,
  };
}

export async function saveGoogleRankPrediction(analysis: GoogleRankAnalysis) {
  const supabase = getJhSupabaseAdmin();
  const { data, error } = await supabase
    .from("seo_rank_predictions")
    .insert({
      title: analysis.title,
      url: analysis.url,
      primary_keyword: analysis.keyword.primary,
      secondary_keywords: analysis.keyword.secondary,
      search_intent: analysis.keyword.intent,
      content_role: analysis.keyword.contentRole,
      opportunity_score: analysis.scores.opportunity,
      serp_difficulty: analysis.scores.serpDifficulty,
      site_authority: analysis.scores.siteAuthority,
      title_score: analysis.scores.titleSeo,
      predicted_min: analysis.prediction.min,
      predicted_max: analysis.prediction.max,
      top10_probability: analysis.prediction.top10Probability,
      confidence: analysis.prediction.confidence,
      model_version: analysis.modelVersion,
      serp_connected: analysis.serp.connected,
      gsc_connected: analysis.gsc.connected,
      gsc_avg_position: analysis.gsc.averagePosition,
      gsc_impressions: analysis.gsc.totalImpressions,
      gsc_clicks: analysis.gsc.totalClicks,
      analysis,
      published_at: analysis.url ? analysis.generatedAt : null,
    })
    .select(
      "id,created_at,title,url,primary_keyword,opportunity_score,serp_difficulty,site_authority,predicted_min,predicted_max,top10_probability,confidence,serp_connected,gsc_connected,actual_position_7d,actual_position_14d,actual_position_30d,actual_position_60d,prediction_error_30d,last_checked_at",
    )
    .single();

  if (error) throw new Error(`예측 결과 저장 실패: ${error.message}`);
  return toHistory(data as PredictionRow);
}

export async function listGoogleRankPredictions(limit = 20) {
  const supabase = getJhSupabaseAdmin();
  const safeLimit = Math.max(1, Math.min(100, Math.round(limit)));
  const { data, error } = await supabase
    .from("seo_rank_predictions")
    .select(
      "id,created_at,title,url,primary_keyword,opportunity_score,serp_difficulty,site_authority,predicted_min,predicted_max,top10_probability,confidence,serp_connected,gsc_connected,actual_position_7d,actual_position_14d,actual_position_30d,actual_position_60d,prediction_error_30d,last_checked_at",
    )
    .order("created_at", { ascending: false })
    .limit(safeLimit);

  if (error) throw new Error(`예측 이력 조회 실패: ${error.message}`);
  return ((data ?? []) as PredictionRow[]).map(toHistory);
}

function ageInDays(createdAt: string) {
  const created = new Date(createdAt).getTime();
  if (!Number.isFinite(created)) return 0;
  return Math.floor((Date.now() - created) / 86_400_000);
}

export async function calibrateGoogleRankPredictions(limit = 20) {
  const supabase = getJhSupabaseAdmin();
  const safeLimit = Math.max(1, Math.min(50, Math.round(limit)));
  const cutoff = new Date(Date.now() - 7 * 86_400_000).toISOString();

  const { data, error } = await supabase
    .from("seo_rank_predictions")
    .select(
      "id,created_at,title,url,primary_keyword,opportunity_score,serp_difficulty,site_authority,predicted_min,predicted_max,top10_probability,confidence,serp_connected,gsc_connected,actual_position_7d,actual_position_14d,actual_position_30d,actual_position_60d,prediction_error_30d,last_checked_at",
    )
    .not("url", "is", null)
    .lte("created_at", cutoff)
    .or(
      "actual_position_7d.is.null,actual_position_14d.is.null,actual_position_30d.is.null,actual_position_60d.is.null",
    )
    .order("created_at", { ascending: true })
    .limit(safeLimit);

  if (error) throw new Error(`보정 대상 조회 실패: ${error.message}`);

  let checked = 0;
  let updated = 0;
  let noData = 0;
  const failures: Array<{ id: string; error: string }> = [];

  for (const rawRow of (data ?? []) as PredictionRow[]) {
    const row = toHistory(rawRow);
    if (!row.url) continue;
    checked += 1;

    try {
      const metric = await getSearchConsolePageMetric(row.url, 7);
      const now = new Date().toISOString();
      if (!metric || metric.position <= 0) {
        noData += 1;
        await supabase
          .from("seo_rank_predictions")
          .update({ last_checked_at: now, updated_at: now })
          .eq("id", row.id);
        continue;
      }

      const age = ageInDays(row.createdAt);
      const update: Record<string, string | number | null> = {
        last_checked_at: now,
        updated_at: now,
      };

      if (age >= 7 && row.actualPosition7d === null) {
        update.actual_position_7d = metric.position;
      }
      if (age >= 14 && row.actualPosition14d === null) {
        update.actual_position_14d = metric.position;
      }
      if (age >= 30 && row.actualPosition30d === null) {
        update.actual_position_30d = metric.position;
        const predictedMidpoint = (row.predictedMin + row.predictedMax) / 2;
        update.prediction_error_30d = Math.abs(metric.position - predictedMidpoint);
      }
      if (age >= 60 && row.actualPosition60d === null) {
        update.actual_position_60d = metric.position;
      }

      const { error: updateError } = await supabase
        .from("seo_rank_predictions")
        .update(update)
        .eq("id", row.id);
      if (updateError) throw updateError;
      updated += 1;
    } catch (calibrationError) {
      failures.push({
        id: row.id,
        error:
          calibrationError instanceof Error
            ? calibrationError.message
            : String(calibrationError),
      });
    }
  }

  return { checked, updated, noData, failures };
}
