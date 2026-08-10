export type JhSignalType =
  | "divergence"
  | "extreme"
  | "trend"
  | "release"
  | "surprise";

export type JhSignalSeverity = "low" | "medium" | "high" | "critical";

export type JhRegime = "Risk-On" | "Neutral" | "Risk-Off";

export type JhFreshnessStatus =
  | "fresh"
  | "awaiting_release"
  | "delayed"
  | "unavailable";

export type JhPeriodChange = {
  key: "short" | "medium" | "long" | "extended";
  label: string;
  value: number | null;
  unit: "%" | "bp" | "pp" | "pt" | "value";
};

export type JhMarketMetric = {
  id: string;
  symbol: string;
  sourceSeriesCode: string;
  nameKo: string;
  nameEn: string;
  category: string;
  country: string | null;
  market: string | null;
  unit: string;
  frequency: string;
  description: string | null;
  displayOrder: number;
  sourceCode: string;
  sourceName: string;
  provider: string;
  observedAt: string | null;
  currentValue: number | null;
  currentUnit: string;
  changes: JhPeriodChange[];
  percentile: number | null;
  zScore: number | null;
  distanceFromHigh: number | null;
  trend: "up" | "down" | "flat" | "unknown";
  trendLabel: string;
  consecutiveDirection: "up" | "down" | "flat";
  consecutiveCount: number;
  surprisePercentile: number | null;
  importanceScore: number;
  stale: boolean;
  staleDays: number | null;
  sourceAgeDays?: number | null;
  sourceUpdatedAt?: string | null;
  checkedAt?: string | null;
  nextReleaseDate?: string | null;
  releaseName?: string | null;
  freshnessStatus?: JhFreshnessStatus;
  freshnessLabel?: string;
  error: string | null;
};

export type JhMarketSignal = {
  id: string;
  type: JhSignalType;
  severity: JhSignalSeverity;
  title: string;
  description: string;
  importanceScore: number;
  relatedSymbols: string[];
};

export type JhBiggestChange = {
  rank: number;
  symbol: string;
  name: string;
  observedAt: string;
  changeLabel: string;
  changeValue: number;
  changeUnit: JhPeriodChange["unit"];
  surprisePercentile: number;
  importanceScore: number;
  explanation: string;
};

export type JhRelativeStrength = {
  id: string;
  label: string;
  leader: string;
  laggard: string;
  short: number | null;
  medium: number | null;
  long: number | null;
  shortLabel: string;
  mediumLabel: string;
  longLabel: string;
  interpretation: string;
};

export type JhCollectionRun = {
  id: number;
  startedAt: string;
  finishedAt: string | null;
  status: string;
  recordsFetched: number;
  recordsSaved: number;
  errorMessage: string | null;
  seriesSucceeded: number | null;
  seriesFailed: number | null;
  seriesUpdated: number | null;
  seriesUnchanged: number | null;
  metadataWarnings: number | null;
};

export type JhDashboardData = {
  asOfDate: string;
  generatedAt: string;
  latestDataUpdate: string | null;
  sourceCheckedAt: string | null;
  marketStatus: string;
  regime: JhRegime;
  regimeScore: number;
  regimeConfidence: number;
  coverage: {
    totalSeries: number;
    seriesWithData: number;
    staleSeries: number;
    failedSeries: number;
    freshSeries?: number;
    awaitingReleaseSeries?: number;
    unavailableSeries?: number;
  };
  categoryOrder: string[];
  categoryLabels: Record<string, string>;
  metrics: JhMarketMetric[];
  biggestChanges: JhBiggestChange[];
  anomalies: JhMarketSignal[];
  relativeStrength: JhRelativeStrength[];
  archiveDates: string[];
  collectionRun: JhCollectionRun | null;
  copyPack: string;
};

export type JhCollectionApiResult = {
  ok: boolean;
  runId?: number;
  mode?: "daily" | "backfill" | "mixed";
  status?: "success" | "partial";
  seriesCount?: number;
  seriesSucceeded?: number;
  seriesFailed?: number;
  seriesUpdated?: number;
  seriesUnchanged?: number;
  metadataWarnings?: number;
  recordsFetched?: number;
  recordsSaved?: number;
  archiveSaved?: boolean;
  archiveWarning?: string;
  dashboard?: JhDashboardData;
  error?: string;
};
