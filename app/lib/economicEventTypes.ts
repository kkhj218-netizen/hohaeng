export type CpiMetricKey =
  | "headline_yoy"
  | "headline_mom"
  | "core_yoy"
  | "core_mom";

export type CpiMetricView = {
  key: CpiMetricKey;
  name: string;
  actual: number | null;
  forecast: number | null;
  previous: number | null;
  surprise: number | null;
  forecastSourceName: string | null;
  forecastSourceUrl: string | null;
};

export type CpiReactionView = {
  assetKey: string;
  assetName: string;
  pre: number | null;
  after30m: number | null;
  close: number | null;
  after1d: number | null;
  after5d: number | null;
  return30m: number | null;
  returnClose: number | null;
  return1d: number | null;
  return5d: number | null;
  qualityNote: string | null;
};

export type CpiComparableHorizon = {
  key: "30m" | "close" | "1d" | "5d";
  label: string;
  sampleSize: number;
  positiveCount: number;
  positiveRate: number | null;
  averageReturn: number | null;
  medianReturn: number | null;
};

export type CpiEventAnalysis = {
  event: {
    id: string;
    releaseAt: string;
    referencePeriod: string | null;
    status: string;
    sourceName: string | null;
    sourceUrl: string | null;
  };
  metrics: CpiMetricView[];
  reactions: CpiReactionView[];
  comparable: {
    rule: string;
    eventCount: number;
    horizons: CpiComparableHorizon[];
  } | null;
};

export type CpiAdminEvent = {
  id: string;
  releaseAt: string;
  referencePeriod: string | null;
  status: string;
  metrics: CpiMetricView[];
};

export type CpiSyncResult = {
  eventCount: number;
  metricCount: number;
  reactionCount: number;
  fetchedAt: string;
};
