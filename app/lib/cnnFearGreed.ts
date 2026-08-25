import "server-only";

import { unstable_cache } from "next/cache";

export type FearGreedRating =
  | "extreme fear"
  | "fear"
  | "neutral"
  | "greed"
  | "extreme greed";

export type CnnFearGreedReading = {
  score: number;
  rating: FearGreedRating;
  timestamp: string | null;
  previousClose: number | null;
  previousWeek: number | null;
  previousMonth: number | null;
  previousYear: number | null;
  sourceUrl: string;
};

type CnnFearGreedPayload = {
  fear_and_greed?: {
    score?: number;
    rating?: string;
    timestamp?: string;
    previous_close?: number;
    previous_1_week?: number;
    previous_1_month?: number;
    previous_1_year?: number;
  };
};

const CACHE_SECONDS = 60 * 60;
const FETCH_TIMEOUT_MS = 7_000;
const SOURCE_URL = "https://www.cnn.com/markets/fear-and-greed";
const ENDPOINTS = [
  "https://production.dataviz.cnn.io/index/fearandgreed/graphdata",
  "https://production.dataviz.cnn.io/index/fearandgreed/graphdata/2021-02-01",
];

const USER_AGENT =
  process.env.CNN_FETCH_USER_AGENT ??
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

function numeric(value: unknown): number | null {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function clampScore(value: number): number {
  return Math.max(0, Math.min(100, value));
}

function normalizeRating(value: unknown, score: number): FearGreedRating {
  const normalized = String(value ?? "")
    .trim()
    .toLowerCase()
    .replaceAll("_", " ");

  if (normalized === "extreme fear") return "extreme fear";
  if (normalized === "fear") return "fear";
  if (normalized === "neutral") return "neutral";
  if (normalized === "greed") return "greed";
  if (normalized === "extreme greed") return "extreme greed";

  if (score < 25) return "extreme fear";
  if (score < 45) return "fear";
  if (score < 55) return "neutral";
  if (score < 75) return "greed";
  return "extreme greed";
}

function parsePayload(payload: CnnFearGreedPayload): CnnFearGreedReading {
  const headline = payload.fear_and_greed;
  const rawScore = numeric(headline?.score);
  if (rawScore === null) {
    throw new Error("CNN Fear & Greed 점수를 확인할 수 없습니다.");
  }

  const score = clampScore(rawScore);
  return {
    score,
    rating: normalizeRating(headline?.rating, score),
    timestamp: headline?.timestamp?.trim() || null,
    previousClose: numeric(headline?.previous_close),
    previousWeek: numeric(headline?.previous_1_week),
    previousMonth: numeric(headline?.previous_1_month),
    previousYear: numeric(headline?.previous_1_year),
    sourceUrl: SOURCE_URL,
  };
}

async function requestEndpoint(url: string): Promise<CnnFearGreedReading> {
  let lastError: unknown = null;

  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const response = await fetch(url, {
        cache: "no-store",
        headers: {
          Accept: "application/json, text/plain, */*",
          "Accept-Language": "en-US,en;q=0.9",
          Origin: "https://www.cnn.com",
          Referer: SOURCE_URL,
          "User-Agent": USER_AGENT,
        },
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      });

      if (!response.ok) {
        throw new Error(`CNN Fear & Greed 요청 실패 (${response.status})`);
      }

      const payload = (await response.json()) as CnnFearGreedPayload;
      return parsePayload(payload);
    } catch (error) {
      lastError = error;
      if (attempt === 0) {
        await new Promise((resolve) => setTimeout(resolve, 250));
      }
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error("CNN Fear & Greed 요청 실패");
}

const loadCnnFearGreed = unstable_cache(
  async (): Promise<CnnFearGreedReading> => {
    let lastError: unknown = null;

    for (const endpoint of ENDPOINTS) {
      try {
        return await requestEndpoint(endpoint);
      } catch (error) {
        lastError = error;
      }
    }

    throw lastError instanceof Error
      ? lastError
      : new Error("CNN Fear & Greed 데이터를 불러오지 못했습니다.");
  },
  ["hohaeng-cnn-fear-greed-v1"],
  {
    revalidate: CACHE_SECONDS,
    tags: ["hohaeng-cnn-fear-greed"],
  },
);

export async function getCnnFearGreed(): Promise<CnnFearGreedReading | null> {
  try {
    return await loadCnnFearGreed();
  } catch (error) {
    console.error("CNN Fear & Greed 불러오기 오류:", error);
    return null;
  }
}
