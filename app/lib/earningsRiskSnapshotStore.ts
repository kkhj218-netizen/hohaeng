import "server-only";

import { getJhSupabaseAdmin } from "@/app/lib/jhDataSupabase";
import type { EarningsRiskSnapshot } from "@/app/lib/earningsRiskTypes";

const EVENT_KEY = "INTERNAL_EARNINGS_RISK_RADAR";

function isSnapshot(value: unknown): value is EarningsRiskSnapshot {
  if (!value || typeof value !== "object") return false;
  const snapshot = value as Partial<EarningsRiskSnapshot>;
  return (
    typeof snapshot.asOfDate === "string" &&
    typeof snapshot.generatedAt === "string" &&
    typeof snapshot.windowDays === "number" &&
    Array.isArray(snapshot.events)
  );
}

function snapshotReleaseAt(asOfDate: string) {
  return `${asOfDate}T12:00:00.000Z`;
}

export async function loadEarningsRiskSnapshot(): Promise<EarningsRiskSnapshot | null> {
  const supabase = getJhSupabaseAdmin();
  const { data: event, error: eventError } = await supabase
    .from("economic_events")
    .select("id")
    .eq("event_key", EVENT_KEY)
    .order("release_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (eventError) {
    console.warn("EARNINGS RISK 스냅샷 이벤트 조회 실패:", eventError);
    return null;
  }
  if (!event?.id) return null;

  const { data: note, error: noteError } = await supabase
    .from("economic_event_notes")
    .select("review")
    .eq("event_id", event.id)
    .maybeSingle();

  if (noteError || !note?.review) {
    if (noteError) console.warn("EARNINGS RISK 스냅샷 노트 조회 실패:", noteError);
    return null;
  }

  try {
    const parsed = JSON.parse(note.review) as unknown;
    return isSnapshot(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export async function saveEarningsRiskSnapshot(snapshot: EarningsRiskSnapshot) {
  const supabase = getJhSupabaseAdmin();
  const releaseAt = snapshotReleaseAt(snapshot.asOfDate);

  const { data: event, error: eventError } = await supabase
    .from("economic_events")
    .upsert(
      {
        event_key: EVENT_KEY,
        event_name: "HOHAENG EARNINGS RISK RADAR snapshot",
        country: "US",
        release_at: releaseAt,
        reference_period: snapshot.asOfDate,
        status: "completed",
        source_name: "NASDAQ Earnings Calendar / HOHAENG",
        source_url: "https://www.nasdaq.com/market-activity/earnings",
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
        market_view: "EARNINGS RISK RADAR",
        key_driver: "Upcoming mega-cap earnings risk",
        watch_points: `${snapshot.events.length} events / ${snapshot.windowDays} days`,
        review: JSON.stringify(snapshot),
        updated_at: new Date().toISOString(),
      },
      { onConflict: "event_id" },
    );

  if (noteError) throw noteError;
}
