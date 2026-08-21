import "server-only";

import type {
  JhDashboardData,
  JhMarketMetric,
  JhPeriodChange,
} from "@/app/lib/jhMarketTypes";

type LiveOverlayConfig = {
  stooqSymbol: string;
  label: string;
  transform?: (value: number) => number;
};

type StooqQuote = {
  date: string;
  time: string | null;
  close: number;
  previous: number | null;
};

const COPPER_POUNDS_PER_METRIC_TON = 2204.6226218;

const LIVE_OVERLAYS: Record<string, LiveOverlayConfig> = {
  DEXKOUS: {
    stooqSymbol: "usdkrw",
    label: "원·달러 시장환율",
  },
  DEXJPUS: {
    stooqSymbol: "usdjpy",
    label: "엔·달러 시장환율",
  },
  DEXUSEU: {
    stooqSymbol: "eurusd",
    label: "유로·달러 시장환율",
  },
  DCOILWTICO: {
    stooqSymbol: "cl.f",
    label: "WTI 선물 시장가격",
  },
  PCOPPUSDM: {
    stooqSymbol: "hg.f",
    label: "구리 선물 시장가격",
    transform: copperToMetricTon,
  },
};

function copperToMetricTon(value: number): number {
  // COMEX 구리 선물은 보통 USD/lb 단위로 표시된다.
  // 일부 제공처가 cents/lb로 주는 경우도 있어 값 범위로 안전하게 보정한다.
  if (value > 2_000) return value;
  const dollarsPerPound = value > 50 ? value / 100 : value;
  return dollarsPerPound * COPPER_POUNDS_PER_METRIC_TON;
}

function normalizeDate(value: string): string | null {
  const trimmed = value.trim();

  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return trimmed;
  }

  if (/^\d{8}$/.test(trimmed)) {
    return `${trimmed.slice(0, 4)}-${trimmed.slice(4, 6)}-${trimmed.slice(6, 8)}`;
  }

  return null;
}

function safeNumber(value: string | undefined): number | null {
  if (!value || value === "N/D" || value === "-") return null;
  const parsed = Number(value.replace(/,/g, ""));
  return Number.isFinite(parsed) ? parsed : null;
}

function parseCsvRow(line: string): string[] {
  const values: string[] = [];
  let current = "";
  let quoted = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];

    if (char === '"') {
      if (quoted && line[index + 1] === '"') {
        current += '"';
        index += 1;
      } else {
        quoted = !quoted;
      }
      continue;
    }

    if (char === "," && !quoted) {
      values.push(current);
      current = "";
      continue;
    }

    current += char;
  }

  values.push(current);
  return values;
}

function parseStooqQuote(text: string): StooqQuote | null {
  if (!text || /Exceeded|apikey/i.test(text)) return null;

  const lines = text
    .trim()
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length < 2) return null;

  const headers = parseCsvRow(lines[0]).map((header) => header.trim().toLowerCase());
  const values = parseCsvRow(lines[1]);
  const row = Object.fromEntries(
    headers.map((header, index) => [header, values[index] ?? ""])
  );

  const date = normalizeDate(row.date ?? "");
  const close = safeNumber(row.close);
  const previous = safeNumber(row.prev ?? row.previous);

  if (!date || close === null) return null;

  return {
    date,
    time: row.time?.trim() || null,
    close,
    previous,
  };
}

async function fetchStooqQuote(symbol: string): Promise<StooqQuote | null> {
  const url = new URL("https://stooq.com/q/l/");
  url.searchParams.set("s", symbol);
  url.searchParams.set("f", "sd2t2ohlcvp");
  url.searchParams.set("h", "");
  url.searchParams.set("e", "csv");

  try {
    const response = await fetch(url, {
      cache: "no-store",
      headers: {
        Accept: "text/csv,text/plain;q=0.9,*/*;q=0.8",
        "User-Agent": "HOHAENG-OS/1.0 (+https://hohaeng.vercel.app)",
      },
      signal: AbortSignal.timeout(8_000),
    });

    if (!response.ok) return null;
    return parseStooqQuote(await response.text());
  } catch {
    return null;
  }
}

function round(value: number, digits = 2): number {
  const factor = 10 ** digits;
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

function roundCurrent(value: number): number {
  if (Math.abs(value) >= 10_000) return round(value, 1);
  if (Math.abs(value) >= 100) return round(value, 2);
  return round(value, 3);
}

function daysBetween(from: string, to: string): number {
  const fromTime = new Date(`${from}T00:00:00.000Z`).getTime();
  const toTime = new Date(`${to}T00:00:00.000Z`).getTime();

  if (!Number.isFinite(fromTime) || !Number.isFinite(toTime)) return 0;
  return Math.max(0, Math.floor((toTime - fromTime) / 86_400_000));
}

function koreanToday(): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function oneDayChange(
  current: number,
  previous: number | null
): JhPeriodChange | null {
  if (previous === null || previous === 0) return null;

  return {
    key: "short",
    label: "1D",
    value: round(((current / previous) - 1) * 100, 2),
    unit: "%",
  };
}

function overlayMetric(
  metric: JhMarketMetric,
  config: LiveOverlayConfig,
  quote: StooqQuote,
  asOfDate: string
): JhMarketMetric {
  const transform = config.transform ?? ((value: number) => value);
  const current = transform(quote.close);
  const previous = quote.previous === null ? null : transform(quote.previous);
  const shortChange = oneDayChange(current, previous);
  const changes = metric.changes.map((change, index) =>
    index === 0 && shortChange ? shortChange : change
  );
  const ageDays = daysBetween(quote.date, asOfDate);
  const observedAt =
    !metric.observedAt || quote.date >= metric.observedAt
      ? quote.date
      : metric.observedAt;

  if (observedAt !== quote.date) {
    return metric;
  }

  return {
    ...metric,
    observedAt,
    currentValue: roundCurrent(current),
    changes,
    sourceCode: "STOOQ+FRED",
    sourceName: "Stooq market quote + FRED history",
    provider:
      metric.category === "commodities"
        ? "Stooq market quote (commodity feed) + FRED"
        : "Stooq market quote + FRED",
    stale: ageDays > 4,
    staleDays: ageDays,
    sourceAgeDays: ageDays,
    sourceUpdatedAt: `${quote.date}T00:00:00.000Z`,
    checkedAt: new Date().toISOString(),
    freshnessStatus: ageDays > 4 ? "delayed" : "fresh",
    freshnessLabel:
      ageDays > 4
        ? `${config.label} 확인 필요 · FRED 이력 유지`
        : `${config.label} 최신 · FRED 이력 병합`,
    error: null,
  };
}

function prependCopyPack(
  dashboard: JhDashboardData,
  overlaidMetrics: JhMarketMetric[]
): string {
  if (overlaidMetrics.length === 0) return dashboard.copyPack;

  const lines = [
    "### LIVE MARKET OVERRIDE — 아래 값 우선 적용",
    "환율·원자재의 최신값과 1D 변화는 시장시세 보강값이며, 장기 이력·백분위·Z-score는 FRED 이력을 사용한다.",
    ...overlaidMetrics.map((metric) => {
      const short = metric.changes[0];
      const shortValue =
        short?.value === null || short?.value === undefined
          ? "N/A"
          : `${short.value > 0 ? "+" : ""}${short.value.toFixed(2)}%`;
      return `- ${metric.nameKo} (${metric.sourceSeriesCode}): ${metric.currentValue ?? "N/A"} ${metric.currentUnit} | 1D ${shortValue} | Observation ${metric.observedAt ?? "N/A"} | Source STOOQ+FRED`;
    }),
    "",
    "IMPORTANT: 아래 기존 FRED 섹션에서 같은 심볼의 현재값이 다르면 LIVE MARKET OVERRIDE를 우선한다.",
    "",
  ];

  return `${lines.join("\n")}\n${dashboard.copyPack}`;
}

export async function applyLiveMarketOverlay(
  dashboard: JhDashboardData
): Promise<JhDashboardData> {
  const today = koreanToday();

  // 과거 날짜 조회는 당시 보관된 공식 스냅샷을 그대로 보여준다.
  if (dashboard.asOfDate !== today) return dashboard;

  const targets = dashboard.metrics
    .map((metric) => {
      const config = LIVE_OVERLAYS[metric.sourceSeriesCode];
      return config ? { metric, config } : null;
    })
    .filter(
      (item): item is { metric: JhMarketMetric; config: LiveOverlayConfig } =>
        item !== null
    );

  if (targets.length === 0) return dashboard;

  const quoteResults = await Promise.all(
    targets.map(async ({ metric, config }) => ({
      metric,
      config,
      quote: await fetchStooqQuote(config.stooqSymbol),
    }))
  );

  const overlayById = new Map<string, JhMarketMetric>();

  for (const result of quoteResults) {
    if (!result.quote) continue;
    overlayById.set(
      result.metric.id,
      overlayMetric(
        result.metric,
        result.config,
        result.quote,
        dashboard.asOfDate
      )
    );
  }

  if (overlayById.size === 0) return dashboard;

  const metrics = dashboard.metrics.map(
    (metric) => overlayById.get(metric.id) ?? metric
  );
  const overlaidMetrics = metrics.filter((metric) => overlayById.has(metric.id));
  const datedMetrics = metrics.filter(
    (metric): metric is JhMarketMetric & { observedAt: string } =>
      metric.observedAt !== null
  );
  const latestDataUpdate =
    datedMetrics.length > 0
      ? datedMetrics.reduce(
          (latest, metric) =>
            metric.observedAt > latest ? metric.observedAt : latest,
          datedMetrics[0].observedAt
        )
      : dashboard.latestDataUpdate;
  const freshSeries = metrics.filter(
    (metric) =>
      metric.currentValue !== null && metric.freshnessStatus === "fresh"
  ).length;
  const awaitingReleaseSeries = metrics.filter(
    (metric) =>
      metric.currentValue !== null &&
      metric.freshnessStatus === "awaiting_release"
  ).length;
  const staleSeries = metrics.filter(
    (metric) => metric.currentValue !== null && metric.stale
  ).length;
  const seriesWithData = metrics.filter(
    (metric) => metric.currentValue !== null
  ).length;

  const nextDashboard: JhDashboardData = {
    ...dashboard,
    generatedAt: new Date().toISOString(),
    latestDataUpdate,
    marketStatus: `FRED 공식 이력 + 시장시세 ${overlaidMetrics.length}개 최신 보강`,
    coverage: {
      ...dashboard.coverage,
      seriesWithData,
      freshSeries,
      awaitingReleaseSeries,
      staleSeries,
      unavailableSeries: metrics.length - seriesWithData,
    },
    metrics,
  };

  return {
    ...nextDashboard,
    copyPack: prependCopyPack(nextDashboard, overlaidMetrics),
  };
}
