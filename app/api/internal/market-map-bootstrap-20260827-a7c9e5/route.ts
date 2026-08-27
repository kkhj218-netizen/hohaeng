import { NextResponse } from "next/server";

import { warmMarketMapCache } from "@/app/lib/marketMap";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

export async function GET() {
  try {
    const result = await warmMarketMapCache();
    return NextResponse.json({ ok: true, ...result }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : String(error) },
      { status: 500, headers: { "Cache-Control": "no-store" } },
    );
  }
}
