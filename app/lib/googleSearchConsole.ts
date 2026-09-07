// HOHAENG Search Console v5: current vs previous period + Rank Predictor helpers
import "server-only";

import { createSign } from "node:crypto";

import type { AnalyticsPeriod } from "./googleAnalytics";

const clientEmail = process.env.GOOGLE_CLIENT_EMAIL;
const privateKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n");
const siteUrl = process.env.SEARCH_CONSOLE_SITE_URL;

type SearchConsoleRow = {
  keys?: string[];
  clicks?: number;
  impressions?: number;
  ctr?: number;
  position?: number;
};

type SearchConsoleResponse = {
  rows?: SearchConsoleRow[];
};

type KeywordMetric = {
  query: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
};

export type SearchConsoleKeywordSnapshot = KeywordMetric;

export type SearchConsolePageMetric = {
  page: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
};

function base64Url(value: string | Buffer) {
  return Buffer.from(value)
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

async function getAccessToken() {
  if (!clientEmail) throw new Error("GOOGLE_CLIENT_EMAIL 환경변수가 없습니다.");
  if (!privateKey) throw new Error("GOOGLE_PRIVATE_KEY 환경변수가 없습니다.");

  const now = Math.floor(Date.now() / 1000);
  const header = base64Url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const payload = base64Url(
    JSON.stringify({
      iss: clientEmail,
      scope: "https://www.googleapis.com/auth/webmasters.readonly",
      aud: "https://oauth2.googleapis.com/token",
      iat: now,
      exp: now + 3600,
    }),
  );
  const unsignedToken = `${header}.${payload}`;
  const signer = createSign("RSA-SHA256");
  signer.update(unsignedToken);
  signer.end();
  const assertion = `${unsignedToken}.${base64Url(signer.sign(privateKey))}`;

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }),
    cache: "no-store",
  });
  const result = (await response.json()) as {
    access_token?: string;
    error_description?: string;
  };
  if (!response.ok || !result.access_token) {
    throw new Error(
      result.error_description || "Google 액세스 토큰을 받지 못했습니다.",
    );
  }
  return result.access_token;
}

function formatDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function makeDateWindow(days: number) {
  const safeDays = Math.max(1, Math.min(480, Math.round(days)));
  const endDate = new Date();
  endDate.setUTCDate(endDate.getUTCDate() - 1);
  const startDate = new Date(endDate);
  startDate.setUTCDate(startDate.getUTCDate() - safeDays + 1);
  return { startDate, endDate };
}

function getSearchAnalyticsEndpoint() {
  if (!siteUrl) throw new Error("SEARCH_CONSOLE_SITE_URL 환경변수가 없습니다.");
  return `https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(siteUrl)}/searchAnalytics/query`;
}

async function queryKeywords(
  endpoint: string,
  accessToken: string,
  startDate: Date,
  endDate: Date,
): Promise<KeywordMetric[]> {
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      startDate: formatDate(startDate),
      endDate: formatDate(endDate),
      dimensions: ["query"],
      rowLimit: 100,
      dataState: "final",
    }),
    cache: "no-store",
  });
  const result = (await response.json()) as SearchConsoleResponse & {
    error?: { message?: string };
  };
  if (!response.ok) {
    throw new Error(
      result.error?.message || "Search Console 데이터를 불러오지 못했습니다.",
    );
  }

  return (result.rows ?? []).map((row) => ({
    query: row.keys?.[0] || "(검색어 없음)",
    clicks: row.clicks ?? 0,
    impressions: row.impressions ?? 0,
    ctr: row.ctr ?? 0,
    position: row.position ?? 0,
  }));
}

export async function getSearchConsoleData(days: AnalyticsPeriod = 30) {
  if (!siteUrl) throw new Error("SEARCH_CONSOLE_SITE_URL 환경변수가 없습니다.");

  // Search Console 데이터는 처리 지연을 고려해 어제까지 조회합니다.
  const endDate = new Date();
  endDate.setUTCDate(endDate.getUTCDate() - 1);
  const startDate = new Date(endDate);
  startDate.setUTCDate(startDate.getUTCDate() - days + 1);
  const previousEndDate = new Date(startDate);
  previousEndDate.setUTCDate(previousEndDate.getUTCDate() - 1);
  const previousStartDate = new Date(previousEndDate);
  previousStartDate.setUTCDate(previousStartDate.getUTCDate() - days + 1);

  const accessToken = await getAccessToken();
  const endpoint = getSearchAnalyticsEndpoint();
  const [currentKeywords, previousKeywords] = await Promise.all([
    queryKeywords(endpoint, accessToken, startDate, endDate),
    queryKeywords(endpoint, accessToken, previousStartDate, previousEndDate),
  ]);
  const previousByQuery = new Map(
    previousKeywords.map((keyword) => [keyword.query, keyword]),
  );

  return {
    connected: true,
    keywords: currentKeywords.map((keyword) => {
      const previous = previousByQuery.get(keyword.query);
      return {
        ...keyword,
        previousPosition: previous?.position ?? null,
        positionChange: previous ? previous.position - keyword.position : null,
        clicksChange: previous ? keyword.clicks - previous.clicks : null,
        impressionsChange: previous
          ? keyword.impressions - previous.impressions
          : null,
        isNew: !previous,
      };
    }),
  };
}

export async function getSearchConsoleKeywordUniverse(
  days = 90,
  rowLimit = 5000,
): Promise<SearchConsoleKeywordSnapshot[]> {
  const accessToken = await getAccessToken();
  const endpoint = getSearchAnalyticsEndpoint();
  const { startDate, endDate } = makeDateWindow(days);
  const safeRowLimit = Math.max(100, Math.min(25000, Math.round(rowLimit)));

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      startDate: formatDate(startDate),
      endDate: formatDate(endDate),
      dimensions: ["query"],
      rowLimit: safeRowLimit,
      dataState: "final",
    }),
    cache: "no-store",
  });
  const result = (await response.json()) as SearchConsoleResponse & {
    error?: { message?: string };
  };

  if (!response.ok) {
    throw new Error(
      result.error?.message || "Search Console 키워드 데이터를 불러오지 못했습니다.",
    );
  }

  return (result.rows ?? []).map((row) => ({
    query: row.keys?.[0] || "(검색어 없음)",
    clicks: row.clicks ?? 0,
    impressions: row.impressions ?? 0,
    ctr: row.ctr ?? 0,
    position: row.position ?? 0,
  }));
}

export async function getSearchConsolePageMetric(
  pageUrl: string,
  days = 28,
): Promise<SearchConsolePageMetric | null> {
  const normalizedPage = pageUrl.trim();
  if (!normalizedPage) return null;

  const accessToken = await getAccessToken();
  const endpoint = getSearchAnalyticsEndpoint();
  const { startDate, endDate } = makeDateWindow(days);

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      startDate: formatDate(startDate),
      endDate: formatDate(endDate),
      dimensions: ["page"],
      dimensionFilterGroups: [
        {
          groupType: "and",
          filters: [
            {
              dimension: "page",
              operator: "equals",
              expression: normalizedPage,
            },
          ],
        },
      ],
      rowLimit: 10,
      dataState: "final",
    }),
    cache: "no-store",
  });

  const result = (await response.json()) as SearchConsoleResponse & {
    error?: { message?: string };
  };

  if (!response.ok) {
    throw new Error(
      result.error?.message || "Search Console 페이지 데이터를 불러오지 못했습니다.",
    );
  }

  const row = result.rows?.[0];
  if (!row) return null;

  return {
    page: row.keys?.[0] || normalizedPage,
    clicks: row.clicks ?? 0,
    impressions: row.impressions ?? 0,
    ctr: row.ctr ?? 0,
    position: row.position ?? 0,
  };
}
