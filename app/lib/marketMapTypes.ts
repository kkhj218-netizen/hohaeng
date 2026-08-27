export type MarketMapIndexKey = "nasdaq100" | "sp500";

export type MarketMapStock = {
  symbol: string;
  displaySymbol: string;
  name: string;
  sector: string;
  industry: string;
  price: number | null;
  changePercent: number;
  marketCap: number;
  volume: number | null;
};

export type MarketMapSector = {
  name: string;
  stockCount: number;
  marketCap: number;
  weightedChange: number;
  advancers: number;
  decliners: number;
};

export type MarketMapSnapshot = {
  indexKey: MarketMapIndexKey;
  indexName: string;
  marketDate: string | null;
  generatedAt: string;
  stocks: MarketMapStock[];
  sectors: MarketMapSector[];
  totalCount: number;
  advancers: number;
  decliners: number;
  unchanged: number;
  advanceRatio: number;
  advanceMarketCapShare: number;
  marketCapWeightedChange: number;
  breadthLabel: "강한 확산" | "중립" | "약한 확산";
  strongestSector: MarketMapSector | null;
  weakestSector: MarketMapSector | null;
  sourceNote: string;
};
