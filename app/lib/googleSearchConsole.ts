import 'server-only';

import { createSign } from 'node:crypto';

import type { AnalyticsPeriod } from './googleAnalytics';

const clientEmail = process.env.GOOGLE_CLIENT_EMAIL;
const privateKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n');
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

function base64Url(value: string | Buffer) {
  return Buffer.from(value)
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

async function getAccessToken() {
  if (!clientEmail) throw new Error('GOOGLE_CLIENT_EMAIL 환경변수가 없습니다.');
  if (!privateKey) throw new Error('GOOGLE_PRIVATE_KEY 환경변수가 없습니다.');

  const now = Math.floor(Date.now() / 1000);
  const header = base64Url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const payload = base64Url(
    JSON.stringify({
      iss: clientEmail,
      scope: 'https://www.googleapis.com/auth/webmasters.readonly',
      aud: 'https://oauth2.googleapis.com/token',
      iat: now,
      exp: now + 3600,
    })
  );
  const unsignedToken = `${header}.${payload}`;
  const signer = createSign('RSA-SHA256');
  signer.update(unsignedToken);
  signer.end();
  const assertion = `${unsignedToken}.${base64Url(signer.sign(privateKey))}`;

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion,
    }),
    cache: 'no-store',
  });
  const result = (await response.json()) as { access_token?: string; error_description?: string };
  if (!response.ok || !result.access_token) {
    throw new Error(result.error_description || 'Google 액세스 토큰을 받지 못했습니다.');
  }
  return result.access_token;
}

function formatDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

export async function getSearchConsoleData(days: AnalyticsPeriod = 30) {
  if (!siteUrl) throw new Error('SEARCH_CONSOLE_SITE_URL 환경변수가 없습니다.');

  // Search Console 데이터는 처리 지연을 고려해 어제까지 조회합니다.
  const endDate = new Date();
  endDate.setUTCDate(endDate.getUTCDate() - 1);
  const startDate = new Date(endDate);
  startDate.setUTCDate(startDate.getUTCDate() - days + 1);

  const accessToken = await getAccessToken();
  const endpoint = `https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(siteUrl)}/searchAnalytics/query`;
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      startDate: formatDate(startDate),
      endDate: formatDate(endDate),
      dimensions: ['query'],
      rowLimit: 10,
      dataState: 'final',
    }),
    cache: 'no-store',
  });
  const result = (await response.json()) as SearchConsoleResponse & {
    error?: { message?: string };
  };
  if (!response.ok) {
    throw new Error(result.error?.message || 'Search Console 데이터를 불러오지 못했습니다.');
  }

  return {
    connected: true,
    keywords: (result.rows ?? []).map((row) => ({
      query: row.keys?.[0] || '(검색어 없음)',
      clicks: row.clicks ?? 0,
      impressions: row.impressions ?? 0,
      ctr: row.ctr ?? 0,
      position: row.position ?? 0,
    })),
  };
}