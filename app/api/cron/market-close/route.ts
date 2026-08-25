import { NextRequest, NextResponse } from "next/server";

import { getCnnFearGreed } from "@/app/lib/cnnFearGreed";
import { getMajorFuturesSnapshot } from "@/app/lib/majorFutures";
import { getMarketRiskRatesSnapshot } from "@/app/lib/marketRiskRates";
import { getUsMarketCloseDashboard } from "@/app/lib/usMarketClose";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

function isAuthorized(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) return false;
  return request.headers.get("authorization") === `Bearer ${cronSecret}`;
}

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const startedAt = new Date().toISOString();

  try {
    const [marketClose, futures, fearGreed, riskRates] = await Promise.all([
      getUsMarketCloseDashboard(),
      getMajorFuturesSnapshot(),
      getCnnFearGreed(),
      getMarketRiskRatesSnapshot(),
    ]);

    const dates = [
      ...marketClose.cash,
      ...marketClose.futures,
      ...futures,
      ...riskRates.quotes,
    ]
      .map((item) => item.date)
      .filter(Boolean)
      .sort((a, b) => b.localeCompare(a));

    return NextResponse.json({
      ok: true,
      startedAt,
      completedAt: new Date().toISOString(),
      latestMarketDate: dates[0] ?? null,
      cashCount: marketClose.cash.length,
      indexFutureCount: futures.filter((item) => item.group === "index").length,
      commodityFutureCount: futures.filter((item) => item.group === "commodity").length,
      volatilityCount: futures.filter((item) => item.group === "volatility").length,
      treasuryFutureCount: futures.filter((item) => item.group === "rates").length,
      officialRateCount: riskRates.quotes.filter((item) => item.sourceKind === "treasury").length,
      fearGreed: fearGreed?.score ?? null,
      schedule: "07:00 KST",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      {
        ok: false,
        startedAt,
        completedAt: new Date().toISOString(),
        error: message,
      },
      { status: 500 },
    );
  }
}
