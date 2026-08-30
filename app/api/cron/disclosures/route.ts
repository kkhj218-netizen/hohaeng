import { NextResponse } from "next/server";

import { archiveDailyDisclosures } from "@/app/lib/disclosureArchive";
import { getInvestmentDiscoveryDashboard } from "@/app/lib/dartInvestmentDiscoveries";
import { getUsInvestmentDiscoveryDashboard } from "@/app/lib/usInvestmentDiscoveries";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

function authorized(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  return request.headers.get("authorization") === `Bearer ${secret}`;
}

export async function GET(request: Request) {
  if (!authorized(request)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await archiveDailyDisclosures();

    // 실제 사용자가 /data를 열기 전에 국내·미국 투자 변화 탐지를 미리 계산해 캐시에 넣는다.
    // 공시 수집이 끝난 뒤 두 분석을 병렬로 실행해 Cron 총 대기시간을 줄인다.
    const [discovery, usDiscovery] = await Promise.all([
      getInvestmentDiscoveryDashboard(),
      getUsInvestmentDiscoveryDashboard(),
    ]);

    return NextResponse.json({
      ok: result.error === null,
      archiveConfigured: result.configured,
      sourceDateUs: result.sourceDateUs,
      sourceDateKr: result.sourceDateKr,
      fetched: result.fetched,
      archived: result.archived,
      skipped: result.skipped,
      factsSaved: result.factsSaved,
      discoveryPrewarmed: discovery.configured,
      discoverySourceDate: discovery.sourceDate,
      discoveryItems: discovery.items.length,
      usDiscoveryPrewarmed: usDiscovery.configured,
      usDiscoverySourceDate: usDiscovery.sourceDate,
      usDiscoveryItems: usDiscovery.items.length,
      error: result.error,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}
