import "server-only";

import { getJhSupabaseAdmin } from "@/app/lib/jhDataSupabase";

export type EventHubItem = {
  key: string;
  name: string;
  description: string;
  href: string;
  status: "active" | "planned";
  latestReleaseAt: string | null;
  eventCount: number;
};

const DEFINITIONS = [
  {
    key: "US_CPI",
    name: "미국 CPI",
    description: "발표값·과거 유사 사례·시장환경·Cross Asset 반응 유형까지 연결합니다.",
    href: "/data/events/cpi",
    status: "active" as const,
  },
  {
    key: "US_PCE",
    name: "미국 PCE",
    description: "헤드라인·근원 PCE YoY/MoM과 7개 자산의 발표 후 반응을 축적합니다.",
    href: "/data/events/pce",
    status: "active" as const,
  },
  {
    key: "US_NFP",
    name: "미국 고용보고서",
    description: "비농업고용·실업률·임금과 시장 반응을 연결할 예정입니다.",
    href: "#",
    status: "planned" as const,
  },
  {
    key: "US_FOMC",
    name: "FOMC",
    description: "금리결정·점도표·성명 변화와 자산 반응을 축적할 예정입니다.",
    href: "#",
    status: "planned" as const,
  },
] as const;

export async function getEventHubItems(): Promise<EventHubItem[]> {
  const supabase = getJhSupabaseAdmin();
  const keys = DEFINITIONS.map((item) => item.key);
  const { data, error } = await supabase
    .from("economic_events")
    .select("event_key,release_at")
    .in("event_key", keys)
    .order("release_at", { ascending: false });

  if (error) throw new Error(`EVENT DB 조회 실패: ${error.message}`);
  const rows = (data ?? []) as Array<{ event_key: string; release_at: string }>;

  return DEFINITIONS.map((definition) => {
    const matched = rows.filter((row) => row.event_key === definition.key);
    return {
      ...definition,
      latestReleaseAt: matched[0]?.release_at ?? null,
      eventCount: matched.length,
    };
  });
}
