import "server-only";

import { unstable_cache } from "next/cache";

import {
  applyMarketRiskRatesToDashboard,
  getMarketRiskRatesSnapshot,
} from "@/app/lib/marketRiskRates";
import {
  getLatestInvestmentPosts as getBaseLatestInvestmentPosts,
  getPublicMarketDashboard as getBasePublicMarketDashboard,
} from "@/app/lib/publicMarketBase";
import { loadTodaySnapshot } from "@/app/lib/todaySnapshotStore";

export * from "@/app/lib/publicMarketBase";

const getCachedTodaySnapshot = unstable_cache(
  loadTodaySnapshot,
  ["today-traffic-safe-snapshot-v1"],
  { revalidate: 300 },
);

export async function getLivePublicMarketDashboard() {
  const dashboard = await getBasePublicMarketDashboard();
  if (!dashboard) return null;

  try {
    const snapshot = await getMarketRiskRatesSnapshot();
    return applyMarketRiskRatesToDashboard(dashboard, snapshot);
  } catch (error) {
    console.error("VIX·미국채 최신값 보강 오류:", error);
    return dashboard;
  }
}

export async function getLiveLatestInvestmentPosts(limit = 5) {
  return getBaseLatestInvestmentPosts(limit);
}

export async function getPublicMarketDashboard() {
  try {
    const snapshot = await getCachedTodaySnapshot();
    if (snapshot?.dashboard) return snapshot.dashboard;
  } catch (error) {
    console.warn("TODAY snapshot dashboard read failed:", error);
  }

  return getLivePublicMarketDashboard();
}

export async function getLatestInvestmentPosts(limit = 5) {
  try {
    const snapshot = await getCachedTodaySnapshot();
    if (snapshot?.posts?.length) return snapshot.posts.slice(0, limit);
  } catch (error) {
    console.warn("TODAY snapshot posts read failed:", error);
  }

  return getLiveLatestInvestmentPosts(limit);
}
