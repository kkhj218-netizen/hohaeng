import { NextRequest, NextResponse } from "next/server";

import { verifyAdminRequest } from "@/app/lib/adminAuth";
import {
  listCpiEventsForAdmin,
  saveCpiForecasts,
  syncCpiEconomicEventDb,
  type CpiMetricKey,
} from "@/app/lib/economicEventEngine";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 180;

function unauthorized() {
  return NextResponse.json(
    { ok: false, error: "관리자 로그인이 필요합니다." },
    { status: 401, headers: { "Cache-Control": "no-store" } },
  );
}

function serverError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  return NextResponse.json(
    { ok: false, error: message },
    { status: 500, headers: { "Cache-Control": "no-store" } },
  );
}

export async function GET(request: NextRequest) {
  if (!(await verifyAdminRequest(request))) return unauthorized();

  try {
    const events = await listCpiEventsForAdmin();
    return NextResponse.json(
      { ok: true, events },
      { headers: { "Cache-Control": "private, no-store, max-age=0" } },
    );
  } catch (error) {
    return serverError(error);
  }
}

export async function POST(request: NextRequest) {
  if (!(await verifyAdminRequest(request))) return unauthorized();

  try {
    const body = (await request.json()) as {
      action?: "sync" | "forecast";
      eventId?: string;
      forecasts?: Partial<Record<CpiMetricKey, number | null>>;
      sourceName?: string | null;
      sourceUrl?: string | null;
    };

    if (body.action === "sync") {
      const result = await syncCpiEconomicEventDb();
      const events = await listCpiEventsForAdmin();
      return NextResponse.json(
        { ok: true, result, events },
        { headers: { "Cache-Control": "private, no-store, max-age=0" } },
      );
    }

    if (body.action === "forecast") {
      if (!body.eventId || !body.forecasts) {
        return NextResponse.json(
          { ok: false, error: "eventId와 forecasts가 필요합니다." },
          { status: 400, headers: { "Cache-Control": "no-store" } },
        );
      }

      const result = await saveCpiForecasts({
        eventId: body.eventId,
        forecasts: body.forecasts,
        sourceName: body.sourceName,
        sourceUrl: body.sourceUrl,
      });
      const events = await listCpiEventsForAdmin();
      return NextResponse.json(
        { ok: true, result, events },
        { headers: { "Cache-Control": "private, no-store, max-age=0" } },
      );
    }

    return NextResponse.json(
      { ok: false, error: "지원하지 않는 action입니다." },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return serverError(error);
  }
}
