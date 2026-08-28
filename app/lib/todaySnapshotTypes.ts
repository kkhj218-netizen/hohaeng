import type { CnnFearGreedReading } from "@/app/lib/cnnFearGreed";
import type { EarningsRiskSnapshot } from "@/app/lib/earningsRiskTypes";
import type { JhDashboardData } from "@/app/lib/jhMarketTypes";
import type { MajorFutureQuote } from "@/app/lib/majorFutures";
import type { PublicPost } from "@/app/lib/publicMarketBase";
import type { UsMarketCloseDashboard } from "@/app/lib/usMarketClose";

export type TodaySnapshot = {
  version: 1;
  generatedAt: string;
  asOfDate: string;
  dashboard: JhDashboardData | null;
  posts: PublicPost[];
  marketClose: UsMarketCloseDashboard;
  majorFutures: MajorFutureQuote[];
  fearGreed: CnnFearGreedReading | null;
  earningsRisk: EarningsRiskSnapshot | null;
};
