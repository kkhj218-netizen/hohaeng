import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const DART_ENV_ALIASES = [
  "DART_API_KEY",
  "OPENDART_API_KEY",
  "OPEN_DART_API_KEY",
  "DART_KEY",
  "DART_CRTFC_KEY",
] as const;

export async function GET() {
  const matched = DART_ENV_ALIASES.find((name) => Boolean(process.env[name]?.trim())) ?? null;

  return NextResponse.json(
    {
      configured: Boolean(matched),
      matchedVariable: matched,
      checkedVariables: DART_ENV_ALIASES,
      note: matched
        ? "OpenDART 인증키 환경변수가 감지되었습니다. 키 값은 응답에 포함하지 않습니다."
        : "OpenDART 인증키 환경변수가 감지되지 않았습니다.",
    },
    {
      headers: {
        "Cache-Control": "no-store, max-age=0",
      },
    },
  );
}
