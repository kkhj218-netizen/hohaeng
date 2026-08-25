import "server-only";

import {
  applyMarketRiskRatesToDashboard,
  getMarketRiskRatesSnapshot,
} from "@/app/lib/marketRiskRates";
import {
  getPublicMarketDashboard as getBasePublicMarketDashboard,
} from "@/app/lib/publicMarketBase";

export * from "@/app/lib/publicMarketBase";

export async function getPublicMarketDashboard() {
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
