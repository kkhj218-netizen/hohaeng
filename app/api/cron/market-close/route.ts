import { NextRequest, NextResponse } from "next/server";

import { getCnnFearGreed } from "@/app/lib/cnnFearGreed";
import { syncCpiEconomicEventDb } from "@/app/lib/economicEventEngine";
import { getGlobalPolicyRates } from "@/app/lib/globalPolicyRates";
import { getMajorFuturesSnapshot } from "@/app/lib/majorFutures";
import { getMarketRiskRatesSnapshot } from "@/app/lib/marketRiskRates";
import { getUsMarketCloseDashboard } from "@/app/lib/usMarketClose";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 180;

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
    const [marketClose, futures, fearGreed, policyRates, riskRates] = await Promise.all([
      getUsMarketCloseDashboard(),
      getMajorFuturesSnapshot(),
      getCnnFearGreed(),
      getGlobalPolicyRates(),
      getMarketRiskRatesSnapshot(),
    ]);

    let economicEvents: Awaited<ReturnType<typeof syncCpiEconomicEventDb>> | null = null;
    let economicEventsWarning: string | null = null;

    try {
      economicEvents = await syncCpiEconomicEventDb();
    } catch (error) {
      economicEventsWarning = error instanceof Error ? error.message : String(error);
    }

    const dates = [...marketClose.cash, ...marketClose.futures, ...futures]
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
      fearGreed: fearGreed?.score ?? null,
      policyRateCount: policyRates.filter((item) => item.currentRate !== null).length,
      marketRiskRateCount: riskRates.quotes.length,
      cpiEventDb: economicEvents,
      cpiEventDbWarning: economicEventsWarning,
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
