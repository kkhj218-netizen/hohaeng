import { NextResponse } from "next/server";
import { revalidatePath, revalidateTag } from "next/cache";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  revalidateTag("hohaeng-disclosure-feed", "max");
  revalidatePath("/data");
  revalidatePath("/data/disclosures");

  return NextResponse.json(
    {
      ok: true,
      message: "DART 공시/투자데이터 캐시를 갱신 대상으로 표시했습니다. /data를 다시 열어주세요.",
    },
    { headers: { "Cache-Control": "no-store, max-age=0" } },
  );
}
