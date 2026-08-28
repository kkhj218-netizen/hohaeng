import "server-only";

import { unstable_cache } from "next/cache";

import { getCnnFearGreed } from "@/app/lib/cnnFearGreed";
import { getEarningsRiskSnapshot } from "@/app/lib/earningsRisk";
import { getMajorFuturesSnapshot } from "@/app/lib/majorFutures";
import { loadTodaySnapshot, saveTodaySnapshot } from "@/app/lib/todaySnapshotStore";
import type { TodaySnapshot } from "@/app/lib/todaySnapshotTypes";
import {
  getLiveLatestInvestmentPosts,
  getLivePublicMarketDashboard,
} from "./publicMarket";
import { getUsMarketCloseDashboard } from "./usMarketClose";

const cachedTodaySnapshot = unstable_cache(
  loadTodaySnapshot,
  ["today-snapshot-persistent-v1"],
  { revalidate: 300 },
);

function koreanToday() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

export async function buildFreshTodaySnapshot(): Promise<TodaySnapshot> {
  const [dashboardResult, postsResult, marketResult, futuresResult, fearGreedResult, earningsResult] =
    await Promise.allSettled([
      getLivePublicMarketDashboard(),
      getLiveLatestInvestmentPosts(5),
      getUsMarketCloseDashboard(),
      getMajorFuturesSnapshot(),
      getCnnFearGreed(),
      getEarningsRiskSnapshot(),
    ]);

  const dashboard = dashboardResult.status === "fulfilled" ? dashboardResult.value : null;
  const posts = postsResult.status === "fulfilled" ? postsResult.value : [];
  const marketClose =
    marketResult.status === "fulfilled"
      ? marketResult.value
      : { generatedAt: new Date().toISOString(), cash: [], futures: [] };
  const majorFutures = futuresResult.status === "fulfilled" ? futuresResult.value : [];
  const fearGreed = fearGreedResult.status === "fulfilled" ? fearGreedResult.value : null;
  const earningsRisk = earningsResult.status === "fulfilled" ? earningsResult.value : null;

  const snapshot: TodaySnapshot = {
    version: 1,
    generatedAt: new Date().toISOString(),
    asOfDate: dashboard?.asOfDate ?? koreanToday(),
    dashboard,
    posts,
    marketClose,
    majorFutures,
    fearGreed,
    earningsRisk,
  };

  await saveTodaySnapshot(snapshot);
  return snapshot;
}

export async function getTodaySnapshot(): Promise<TodaySnapshot | null> {
  return cachedTodaySnapshot();
}

export async function getTodaySnapshotOrBootstrap(): Promise<TodaySnapshot> {
  const stored = await cachedTodaySnapshot();
  if (stored) return stored;
  return buildFreshTodaySnapshot();
}

export async function warmTodaySnapshot() {
  const snapshot = await buildFreshTodaySnapshot();
  return {
    generatedAt: snapshot.generatedAt,
    asOfDate: snapshot.asOfDate,
    dashboardReady: Boolean(snapshot.dashboard),
    postCount: snapshot.posts.length,
    cashCount: snapshot.marketClose.cash.length,
    futureCount: snapshot.majorFutures.length,
    fearGreedReady: Boolean(snapshot.fearGreed),
    earningsEventCount: snapshot.earningsRisk?.events.length ?? 0,
  };
}
