export type EarningsRiskSession = "pre_market" | "after_hours" | "unknown";
export type EarningsRiskConfidence = "confirmed" | "estimated";
export type EarningsRiskLevel = "high" | "important" | "watch";
export type EarningsRiskIndexKey = "nasdaq100" | "sp500";

export type EarningsRiskIndexImpact = {
  indexKey: EarningsRiskIndexKey;
  indexName: string;
  rank: number;
  marketCapShare: number;
};

export type EarningsRiskEvent = {
  symbol: string;
  name: string;
  reportDate: string;
  daysAway: number;
  session: EarningsRiskSession;
  sessionLabel: string;
  confidence: EarningsRiskConfidence;
  confidenceLabel: string;
  fiscalQuarterEnding: string | null;
  epsForecast: string | null;
  marketCap: number;
  sector: string;
  impactScore: number;
  impactLabel: string;
  riskLevel: EarningsRiskLevel;
  indices: EarningsRiskIndexImpact[];
  sourceName: string;
  sourceUrl: string;
};

export type EarningsRiskSnapshot = {
  asOfDate: string;
  generatedAt: string;
  windowDays: number;
  events: EarningsRiskEvent[];
  highRiskCount: number;
  importantCount: number;
  sourceNote: string;
};
