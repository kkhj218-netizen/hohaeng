import "server-only";

import { unstable_cache } from "next/cache";
import { loadTodaySnapshot } from "@/app/lib/todaySnapshotStore";
import * as core from "./publicMarket";

export type { PublicPost, PublicRelease } from "./publicMarket";
export {
  buildUpcomingReleases,
  categoryMetric,
  changeTone,
  firstChange,
  formatChange,
  formatMetricValue,
  formatObservedDate,
  formatSeoulDate,
  freshnessLabel,
  metricBySymbol,
  pickMetrics,
  publicCategoryLabel,
} from "./publicMarket";

const loadTodaySnapshotCached = unstable_cache(
  loadTodaySnapshot,
  ["hohaeng-public-today-snapshot-v1"],
  { revalidate: 300 },
);

const loadPublicMarketDashboard = unstable_cache(
  async () => core.getPublicMarketDashboard(),
  ["hohaeng-public-market-dashboard-v1"],
  {
    revalidate: 900,
    tags: ["hohaeng-public-market-dashboard"],
  },
);

const loadLatestInvestmentPosts = unstable_cache(
  async (limit: number) => core.getLatestInvestmentPosts(limit),
  ["hohaeng-latest-investment-posts-v1"],
  {
    revalidate: 1800,
    tags: ["hohaeng-latest-investment-posts"],
  },
);

/**
 * 공개 TODAY는 미리 저장된 완성 스냅샷을 우선 사용한다.
 * 스냅샷이 아직 없는 초기 상태에서만 기존 15분 캐시 계산으로 fallback한다.
 */
export async function getPublicMarketDashboard() {
  try {
    const snapshot = await loadTodaySnapshotCached();
    if (snapshot?.dashboard) return snapshot.dashboard;
  } catch (error) {
    console.warn("TODAY dashboard snapshot read failed:", error);
  }

  return loadPublicMarketDashboard();
}

/** 최신 투자 글도 TODAY 스냅샷을 우선 사용하고 없을 때만 기존 30분 캐시를 사용한다. */
export async function getLatestInvestmentPosts(limit = 5) {
  try {
    const snapshot = await loadTodaySnapshotCached();
    if (snapshot?.posts?.length) return snapshot.posts.slice(0, limit);
  } catch (error) {
    console.warn("TODAY post snapshot read failed:", error);
  }

  return loadLatestInvestmentPosts(limit);
}
