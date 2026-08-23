import "server-only";

import { unstable_cache } from "next/cache";
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
 * 공개 대시보드 전체 계산은 Supabase 다중 시계열 조회 + 시장시세 보강을 포함한다.
 * 방문자마다 다시 계산하지 않고 15분 동안 서버 Data Cache 결과를 공유한다.
 */
export async function getPublicMarketDashboard() {
  return loadPublicMarketDashboard();
}

/** 최신 투자 글은 시장 데이터보다 덜 자주 변하므로 30분 캐시한다. */
export async function getLatestInvestmentPosts(limit = 5) {
  return loadLatestInvestmentPosts(limit);
}
