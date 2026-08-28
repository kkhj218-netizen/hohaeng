import "server-only";

import { getJhSupabaseAdmin } from "@/app/lib/jhDataSupabase";
import type { TodaySnapshot } from "@/app/lib/todaySnapshotTypes";

const EVENT_KEY = "INTERNAL_TODAY_SNAPSHOT";

function isTodaySnapshot(value: unknown): value is TodaySnapshot {
  if (!value || typeof value !== "object") return false;
  const snapshot = value as Partial<TodaySnapshot>;
  return (
    snapshot.version === 1 &&
    typeof snapshot.generatedAt === "string" &&
    typeof snapshot.asOfDate === "string" &&
    Array.isArray(snapshot.posts) &&
    Boolean(snapshot.marketClose) &&
    Array.isArray(snapshot.majorFutures)
  );
}

function releaseAt(asOfDate: string) {
  // 내부 스냅샷 식별용 고정 시각이며 실제 경제지표 발표시각이 아니다.
  return `${asOfDate}T12:25:00.000Z`;
}

export async function loadTodaySnapshot(): Promise<TodaySnapshot | null> {
  const supabase = getJhSupabaseAdmin();

  const { data: event, error: eventError } = await supabase
    .from("economic_events")
    .select("id")
    .eq("event_key", EVENT_KEY)
    .order("release_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (eventError) {
    console.warn("TODAY snapshot event read failed:", eventError);
    return null;
  }
  if (!event?.id) return null;

  const { data: note, error: noteError } = await supabase
    .from("economic_event_notes")
    .select("review")
    .eq("event_id", event.id)
    .maybeSingle();

  if (noteError) {
    console.warn("TODAY snapshot note read failed:", noteError);
    return null;
  }
  if (!note?.review) return null;

  try {
    const parsed = JSON.parse(note.review) as unknown;
    return isTodaySnapshot(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export async function saveTodaySnapshot(snapshot: TodaySnapshot) {
  const supabase = getJhSupabaseAdmin();
  const snapshotReleaseAt = releaseAt(snapshot.asOfDate);

  const { data: event, error: eventError } = await supabase
    .from("economic_events")
    .upsert(
      {
        event_key: EVENT_KEY,
        event_name: "HOHAENG TODAY persistent snapshot",
        country: "US",
        release_at: snapshotReleaseAt,
        reference_period: snapshot.asOfDate,
        status: "completed",
        source_name: "HOHAENG TODAY",
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
        market_view: "TODAY SNAPSHOT",
        key_driver: "Traffic-safe precomputed TODAY payload",
        watch_points: snapshot.asOfDate,
        review: JSON.stringify(snapshot),
        updated_at: new Date().toISOString(),
      },
      { onConflict: "event_id" },
    );

  if (noteError) throw noteError;
}
