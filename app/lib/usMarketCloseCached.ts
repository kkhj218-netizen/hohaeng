import "server-only";

import { unstable_cache } from "next/cache";
import { loadTodaySnapshot } from "@/app/lib/todaySnapshotStore";
import * as core from "./usMarketClose";

export type { UsMarketCloseDashboard, UsMarketCloseQuote } from "./usMarketClose";

const loadTodaySnapshotCached = unstable_cache(
  loadTodaySnapshot,
  ["hohaeng-us-close-today-snapshot-v1"],
  { revalidate: 300 },
);

const loadUsMarketCloseDashboard = unstable_cache(
  async () => core.getUsMarketCloseDashboard(),
  ["hohaeng-us-market-close-v1"],
  {
    revalidate: 900,
    tags: ["hohaeng-us-market-close"],
  },
);

/**
 * TODAY 스냅샷에 장마감 데이터가 있으면 DB에 미리 저장된 값을 우선 사용한다.
 * 스냅샷이 아직 없는 초기 상태에서만 기존 15분 캐시 수집으로 fallback한다.
 */
export async function getUsMarketCloseDashboard() {
  try {
    const snapshot = await loadTodaySnapshotCached();
    if (snapshot?.marketClose?.cash?.length || snapshot?.marketClose?.futures?.length) {
      return snapshot.marketClose;
    }
  } catch (error) {
    console.warn("TODAY market-close snapshot read failed:", error);
  }

  return loadUsMarketCloseDashboard();
}
