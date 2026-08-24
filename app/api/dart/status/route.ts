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

const DART_TIMEOUT_MS = 10_000;

export async function GET() {
  const matched = DART_ENV_ALIASES.find((name) => Boolean(process.env[name]?.trim())) ?? null;
  const apiKey = matched ? process.env[matched]?.trim() ?? "" : "";

  if (!apiKey) {
    return NextResponse.json(
      {
        configured: false,
        apiReachable: null,
        apiValid: null,
        matchedVariable: null,
        checkedVariables: DART_ENV_ALIASES,
        note: "OpenDART 인증키 환경변수가 감지되지 않았습니다.",
      },
      {
        headers: {
          "Cache-Control": "no-store, max-age=0",
        },
      },
    );
  }

  try {
    const params = new URLSearchParams({
      crtfc_key: apiKey,
      page_count: "1",
    });
    const response = await fetch(`https://opendart.fss.or.kr/api/list.json?${params}`, {
      cache: "no-store",
      signal: AbortSignal.timeout(DART_TIMEOUT_MS),
    });

    const payload = (await response.json().catch(() => ({}))) as {
      status?: string;
      message?: string;
    };
    const validStatuses = new Set(["000", "013"]);
    const apiValid = response.ok && Boolean(payload.status && validStatuses.has(payload.status));

    return NextResponse.json(
      {
        configured: true,
        apiReachable: response.ok,
        apiValid,
        matchedVariable: matched,
        dartStatus: payload.status ?? null,
        dartMessage: payload.message ?? null,
        note: apiValid
          ? "OpenDART 인증키가 실제 API 호출까지 정상 연결되었습니다. 키 값은 응답에 포함하지 않습니다."
          : "인증키 환경변수는 감지됐지만 OpenDART API 인증 확인이 필요합니다.",
      },
      {
        headers: {
          "Cache-Control": "no-store, max-age=0",
        },
      },
    );
  } catch (error) {
    return NextResponse.json(
      {
        configured: true,
        apiReachable: false,
        apiValid: null,
        matchedVariable: matched,
        dartStatus: null,
        dartMessage: null,
        note: "인증키는 감지됐지만 OpenDART 서버 연결 확인 중 오류가 발생했습니다.",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      {
        headers: {
          "Cache-Control": "no-store, max-age=0",
        },
      },
    );
  }
}
