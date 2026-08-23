import { NextResponse } from "next/server";

import { archiveDailyDisclosures } from "@/app/lib/disclosureArchive";

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
    return NextResponse.json({
      ok: result.error === null,
      archiveConfigured: result.configured,
      sourceDateUs: result.sourceDateUs,
      sourceDateKr: result.sourceDateKr,
      fetched: result.fetched,
      archived: result.archived,
      skipped: result.skipped,
      factsSaved: result.factsSaved,
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
