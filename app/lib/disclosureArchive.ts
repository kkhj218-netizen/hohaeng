import "server-only";

import { getDailyDisclosureFeed, type DisclosureItem } from "@/app/lib/disclosureHub";
import { getJhSupabaseAdmin } from "@/app/lib/jhDataSupabase";
import { getSecFilingDetail } from "@/app/lib/secFilingDetail";

const ARCHIVE_MIN_IMPORTANCE = 70;
const FACT_BACKFILL_LIMIT = 12;
const FACT_CONCURRENCY = 3;

export type DisclosureArchiveSnapshot = {
  configured: boolean;
  items: DisclosureItem[];
  error: string | null;
};

export type DisclosureArchiveRunResult = {
  configured: boolean;
  fetched: number;
  archived: number;
  skipped: number;
  factsSaved: number;
  sourceDateUs: string | null;
  sourceDateKr: string | null;
  error: string | null;
};

type DisclosureDbRow = {
  id: number;
  source: "SEC" | "DART";
  source_id: string;
  source_entity_id: string | null;
  market: "US" | "KR";
  exchange: string;
  ticker: string | null;
  company: string;
  category: DisclosureItem["category"];
  importance: number;
  title: string;
  form: string;
  filing_date: string;
  source_url: string;
  detail_url: string | null;
  amendment: boolean;
  structured_earnings: boolean;
};

function isMissingTableError(error: { code?: string | null; message?: string | null } | null) {
  if (!error) return false;
  return (
    error.code === "42P01" ||
    error.code === "PGRST205" ||
    /investment_disclosures|investment_disclosure_facts|disclosure_collection_runs/i.test(
      error.message ?? "",
    )
  );
}

function archiveKey(source: string, sourceId: string) {
  return `${source}:${sourceId}`;
}

function secCik(item: DisclosureItem): string | null {
  if (item.source !== "SEC" || !item.detailUrl) return null;
  const match = item.detailUrl.match(/\/data\/disclosures\/us\/([^/]+)\//i);
  return match?.[1] ? decodeURIComponent(match[1]) : null;
}

function toArchiveRow(item: DisclosureItem) {
  return {
    source: item.source,
    source_id: item.sourceId,
    source_entity_id: secCik(item),
    market: item.market,
    exchange: item.exchange,
    ticker: item.ticker,
    company: item.company,
    category: item.category,
    importance: item.importance,
    title: item.title,
    form: item.form,
    filing_date: item.filingDate,
    source_url: item.sourceUrl,
    detail_url: item.detailUrl,
    amendment: item.amendment,
    structured_earnings: item.structuredEarnings,
    last_seen_at: new Date().toISOString(),
  };
}

function fromArchiveRow(row: DisclosureDbRow): DisclosureItem {
  return {
    id: `${row.source}-${row.source_id}`,
    market: row.market,
    exchange: row.exchange,
    ticker: row.ticker,
    company: row.company,
    category: row.category,
    importance: row.importance,
    title: row.title,
    form: row.form,
    filingDate: row.filing_date,
    source: row.source,
    sourceUrl: row.source_url,
    detailUrl: row.detail_url,
    sourceId: row.source_id,
    amendment: row.amendment,
    structuredEarnings: row.structured_earnings,
  };
}

async function mapWithConcurrency<T, R>(
  values: T[],
  concurrency: number,
  worker: (value: T) => Promise<R>,
): Promise<R[]> {
  const results: R[] = [];
  let cursor = 0;

  async function run() {
    while (cursor < values.length) {
      const index = cursor;
      cursor += 1;
      results[index] = await worker(values[index]);
    }
  }

  await Promise.all(Array.from({ length: Math.min(concurrency, values.length) }, run));
  return results;
}

export async function getArchivedDisclosureItems(
  days = 45,
  limit = 600,
): Promise<DisclosureArchiveSnapshot> {
  const since = new Date(Date.now() - days * 86_400_000).toISOString().slice(0, 10);
  const { data, error } = await getJhSupabaseAdmin()
    .from("investment_disclosures")
    .select(
      "id,source,source_id,source_entity_id,market,exchange,ticker,company,category,importance,title,form,filing_date,source_url,detail_url,amendment,structured_earnings",
    )
    .gte("filing_date", since)
    .order("filing_date", { ascending: false })
    .order("importance", { ascending: false })
    .limit(limit);

  if (error) {
    if (isMissingTableError(error)) {
      return { configured: false, items: [], error: null };
    }
    return { configured: true, items: [], error: error.message };
  }

  return {
    configured: true,
    items: ((data ?? []) as DisclosureDbRow[]).map(fromArchiveRow),
    error: null,
  };
}

async function saveMissingSecFacts(): Promise<number> {
  const supabase = getJhSupabaseAdmin();
  const { data: disclosures, error } = await supabase
    .from("investment_disclosures")
    .select("id,source_id,source_entity_id")
    .eq("source", "SEC")
    .eq("structured_earnings", true)
    .not("source_entity_id", "is", null)
    .order("filing_date", { ascending: false })
    .limit(80);

  if (error) {
    if (isMissingTableError(error)) return 0;
    throw new Error(`SEC Fact 대상 조회 실패: ${error.message}`);
  }

  const disclosureRows = (disclosures ?? []) as Array<{
    id: number;
    source_id: string;
    source_entity_id: string;
  }>;
  if (disclosureRows.length === 0) return 0;

  const ids = disclosureRows.map((row) => row.id);
  const { data: existingFacts, error: factsError } = await supabase
    .from("investment_disclosure_facts")
    .select("disclosure_id")
    .in("disclosure_id", ids);

  if (factsError) {
    if (isMissingTableError(factsError)) return 0;
    throw new Error(`기존 SEC Fact 조회 실패: ${factsError.message}`);
  }

  const completed = new Set(
    (existingFacts ?? []).map((row) => Number((row as { disclosure_id: number }).disclosure_id)),
  );
  const pending = disclosureRows.filter((row) => !completed.has(row.id)).slice(0, FACT_BACKFILL_LIMIT);

  const savedPerDisclosure = await mapWithConcurrency(pending, FACT_CONCURRENCY, async (row) => {
    try {
      const detail = await getSecFilingDetail(row.source_entity_id, row.source_id);
      if (!detail || detail.metrics.length === 0) return 0;

      const factRows = detail.metrics.map((metric) => ({
        disclosure_id: row.id,
        fact_key: metric.key,
        label: metric.label,
        value: metric.value,
        unit: metric.unit,
        period_start: metric.start,
        period_end: metric.end,
        concept: metric.concept,
        source: "SEC_XBRL",
        updated_at: new Date().toISOString(),
      }));

      const { error: saveError } = await supabase
        .from("investment_disclosure_facts")
        .upsert(factRows, { onConflict: "disclosure_id,fact_key" });
      if (saveError) throw saveError;
      return factRows.length;
    } catch (error) {
      console.error("SEC 핵심 Fact 저장 실패:", row.source_id, error);
      return 0;
    }
  });

  return savedPerDisclosure.reduce((sum, count) => sum + count, 0);
}

export async function archiveDailyDisclosures(): Promise<DisclosureArchiveRunResult> {
  const startedAt = new Date().toISOString();
  const feed = await getDailyDisclosureFeed();
  const all = [...feed.us.items, ...feed.korea.items];
  const candidates = all.filter(
    (item) => item.importance >= ARCHIVE_MIN_IMPORTANCE && item.category !== "other",
  );

  const result: DisclosureArchiveRunResult = {
    configured: true,
    fetched: all.length,
    archived: 0,
    skipped: all.length - candidates.length,
    factsSaved: 0,
    sourceDateUs: feed.us.sourceDate,
    sourceDateKr: feed.korea.sourceDate,
    error: null,
  };

  const supabase = getJhSupabaseAdmin();
  const runInsert = await supabase
    .from("disclosure_collection_runs")
    .insert({
      started_at: startedAt,
      status: "running",
      source_date_us: feed.us.sourceDate,
      source_date_kr: feed.korea.sourceDate,
      fetched_count: all.length,
      skipped_count: result.skipped,
    })
    .select("id")
    .single();

  if (runInsert.error && isMissingTableError(runInsert.error)) {
    return {
      ...result,
      configured: false,
      error: "공시 아카이브 DB 스키마가 아직 적용되지 않았습니다.",
    };
  }
  if (runInsert.error) {
    return { ...result, error: runInsert.error.message };
  }

  const runId = Number((runInsert.data as { id: number }).id);

  try {
    if (candidates.length > 0) {
      const { data, error } = await supabase
        .from("investment_disclosures")
        .upsert(candidates.map(toArchiveRow), { onConflict: "source,source_id" })
        .select("id,source,source_id");
      if (error) throw error;
      result.archived = data?.length ?? 0;
    }

    result.factsSaved = await saveMissingSecFacts();

    await supabase
      .from("disclosure_collection_runs")
      .update({
        finished_at: new Date().toISOString(),
        status: "success",
        archived_count: result.archived,
        skipped_count: result.skipped,
        facts_saved: result.factsSaved,
        error: null,
      })
      .eq("id", runId);

    return result;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    result.error = message;
    await supabase
      .from("disclosure_collection_runs")
      .update({
        finished_at: new Date().toISOString(),
        status: "partial",
        archived_count: result.archived,
        skipped_count: result.skipped,
        facts_saved: result.factsSaved,
        error: message,
      })
      .eq("id", runId);
    return result;
  }
}

export function mergeDisclosureItems(live: DisclosureItem[], archived: DisclosureItem[]) {
  const map = new Map<string, DisclosureItem>();
  for (const item of archived) map.set(archiveKey(item.source, item.sourceId), item);
  for (const item of live) map.set(archiveKey(item.source, item.sourceId), item);
  return Array.from(map.values()).sort((left, right) => {
    const dateOrder = right.filingDate.localeCompare(left.filingDate);
    if (dateOrder !== 0) return dateOrder;
    return right.importance - left.importance;
  });
}
