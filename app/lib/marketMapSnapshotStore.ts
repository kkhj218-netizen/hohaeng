import "server-only";

import { getJhSupabaseAdmin } from "@/app/lib/jhDataSupabase";
import type { MarketMapIndexKey, MarketMapSnapshot } from "@/app/lib/marketMapTypes";

const FALLBACK_EVENT_KEYS: Record<MarketMapIndexKey, string> = {
  nasdaq100: "INTERNAL_MARKET_MAP_NASDAQ100",
  sp500: "INTERNAL_MARKET_MAP_SP500",
};

let dedicatedTableAvailable: boolean | null = null;

function isSnapshot(value: unknown, indexKey: MarketMapIndexKey): value is MarketMapSnapshot {
  if (!value || typeof value !== "object") return false;
  const snapshot = value as Partial<MarketMapSnapshot>;
  return (
    snapshot.indexKey === indexKey &&
    typeof snapshot.indexName === "string" &&
    Array.isArray(snapshot.stocks) &&
    Array.isArray(snapshot.sectors) &&
    typeof snapshot.generatedAt === "string"
  );
}

function relationUnavailable(error: { code?: string | null; message?: string | null } | null) {
  if (!error) return false;
  return (
    error.code === "42P01" ||
    error.code === "42501" ||
    error.message?.includes("market_map_snapshots") === true
  );
}

async function readDedicated(indexKey: MarketMapIndexKey): Promise<MarketMapSnapshot | null> {
  if (dedicatedTableAvailable === false) return null;

  const supabase = getJhSupabaseAdmin();
  const { data, error } = await supabase
    .from("market_map_snapshots")
    .select("snapshot")
    .eq("index_key", indexKey)
    .order("market_date", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    if (relationUnavailable(error)) {
      dedicatedTableAvailable = false;
      return null;
    }
    throw error;
  }

  dedicatedTableAvailable = true;
  return isSnapshot(data?.snapshot, indexKey) ? data.snapshot : null;
}

async function writeDedicated(snapshot: MarketMapSnapshot): Promise<boolean> {
  if (dedicatedTableAvailable === false) return false;
  if (!snapshot.marketDate) return false;

  const supabase = getJhSupabaseAdmin();
  const { error } = await supabase
    .from("market_map_snapshots")
    .upsert(
      {
        index_key: snapshot.indexKey,
        market_date: snapshot.marketDate,
        snapshot,
        source_name: "HOHAENG MARKET MAP",
        generated_at: snapshot.generatedAt,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "index_key,market_date" },
    );

  if (error) {
    if (relationUnavailable(error)) {
      dedicatedTableAvailable = false;
      return false;
    }
    throw error;
  }

  dedicatedTableAvailable = true;
  return true;
}

function fallbackReleaseAt(marketDate: string) {
  // 내부 스냅샷 식별용 시각. 실제 경제지표 발표시각으로 사용하지 않는다.
  return `${marketDate}T12:00:00.000Z`;
}

async function readCompatibilitySnapshot(
  indexKey: MarketMapIndexKey,
): Promise<MarketMapSnapshot | null> {
  const supabase = getJhSupabaseAdmin();
  const eventKey = FALLBACK_EVENT_KEYS[indexKey];

  const { data: event, error: eventError } = await supabase
    .from("economic_events")
    .select("id")
    .eq("event_key", eventKey)
    .order("release_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (eventError) throw eventError;
  if (!event?.id) return null;

  const { data: note, error: noteError } = await supabase
    .from("economic_event_notes")
    .select("review")
    .eq("event_id", event.id)
    .maybeSingle();

  if (noteError) throw noteError;
  if (!note?.review) return null;

  try {
    const parsed = JSON.parse(note.review) as unknown;
    return isSnapshot(parsed, indexKey) ? parsed : null;
  } catch {
    return null;
  }
}

async function writeCompatibilitySnapshot(snapshot: MarketMapSnapshot) {
  if (!snapshot.marketDate) return;

  const supabase = getJhSupabaseAdmin();
  const eventKey = FALLBACK_EVENT_KEYS[snapshot.indexKey];
  const releaseAt = fallbackReleaseAt(snapshot.marketDate);

  const { data: event, error: eventError } = await supabase
    .from("economic_events")
    .upsert(
      {
        event_key: eventKey,
        event_name: `${snapshot.indexName} MARKET MAP snapshot`,
        country: "US",
        release_at: releaseAt,
        reference_period: snapshot.marketDate,
        status: "completed",
        source_name: "HOHAENG MARKET MAP",
        source_url: null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "event_key,release_at" },
    )
    .select("id")
    .single();

  if (eventError) throw eventError;

  const { error: noteError } = await supabase
    .from("economic_event_notes")
    .upsert(
      {
        event_id: event.id,
        market_view: snapshot.indexName,
        key_driver: "MARKET MAP persistent snapshot",
        watch_points: snapshot.marketDate,
        review: JSON.stringify(snapshot),
        updated_at: new Date().toISOString(),
      },
      { onConflict: "event_id" },
    );

  if (noteError) throw noteError;
}

export async function loadMarketMapSnapshot(
  indexKey: MarketMapIndexKey,
): Promise<MarketMapSnapshot | null> {
  try {
    const dedicated = await readDedicated(indexKey);
    if (dedicated) return dedicated;
  } catch (error) {
    console.warn("MARKET MAP 전용 스냅샷 조회 실패:", error);
  }

  try {
    return await readCompatibilitySnapshot(indexKey);
  } catch (error) {
    console.warn("MARKET MAP 호환 스냅샷 조회 실패:", error);
    return null;
  }
}

export async function saveMarketMapSnapshot(snapshot: MarketMapSnapshot) {
  try {
    const stored = await writeDedicated(snapshot);
    if (stored) return { storage: "market_map_snapshots" as const };
  } catch (error) {
    console.warn("MARKET MAP 전용 스냅샷 저장 실패:", error);
  }

  await writeCompatibilitySnapshot(snapshot);
  return { storage: "economic_event_notes_compat" as const };
}
