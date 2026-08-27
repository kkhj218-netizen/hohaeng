"use client";

import { useEffect, useMemo, useState } from "react";

import type { EarningsRiskEvent, EarningsRiskSnapshot } from "@/app/lib/earningsRiskTypes";
import type { MarketMapStock } from "@/app/lib/marketMapTypes";

type Rect = { x: number; y: number; width: number; height: number };
type LayoutItem<T> = { item: T; rect: Rect };
type Weighted<T> = { item: T; weight: number };

type MarketTreemapProps = {
  stocks: MarketMapStock[];
  compact?: boolean;
  showDetail?: boolean;
};

type EarningsApiResponse = {
  ok?: boolean;
  snapshot?: EarningsRiskSnapshot | null;
};

function sumWeight<T>(items: Weighted<T>[]) {
  return items.reduce((sum, entry) => sum + Math.max(entry.weight, 1), 0);
}

function binaryLayout<T>(items: Weighted<T>[], rect: Rect): LayoutItem<T>[] {
  if (items.length === 0) return [];
  if (items.length === 1) return [{ item: items[0].item, rect }];

  const sorted = [...items].sort((a, b) => b.weight - a.weight);
  const total = sumWeight(sorted);
  let running = 0;
  let splitIndex = 1;
  let bestDistance = Number.POSITIVE_INFINITY;

  for (let index = 1; index < sorted.length; index += 1) {
    running += Math.max(sorted[index - 1].weight, 1);
    const distance = Math.abs(total / 2 - running);
    if (distance < bestDistance) {
      bestDistance = distance;
      splitIndex = index;
    }
  }

  const first = sorted.slice(0, splitIndex);
  const second = sorted.slice(splitIndex);
  const firstWeight = sumWeight(first);
  const ratio = Math.max(0.06, Math.min(0.94, firstWeight / total));

  if (rect.width >= rect.height) {
    const firstWidth = rect.width * ratio;
    return [
      ...binaryLayout(first, { ...rect, width: firstWidth }),
      ...binaryLayout(second, {
        x: rect.x + firstWidth,
        y: rect.y,
        width: rect.width - firstWidth,
        height: rect.height,
      }),
    ];
  }

  const firstHeight = rect.height * ratio;
  return [
    ...binaryLayout(first, { ...rect, height: firstHeight }),
    ...binaryLayout(second, {
      x: rect.x,
      y: rect.y + firstHeight,
      width: rect.width,
      height: rect.height - firstHeight,
    }),
  ];
}

function inset(rect: Rect, amount: number): Rect {
  return {
    x: rect.x + amount,
    y: rect.y + amount,
    width: Math.max(0.1, rect.width - amount * 2),
    height: Math.max(0.1, rect.height - amount * 2),
  };
}

function background(change: number) {
  if (change >= 3) return "#087a35";
  if (change >= 2) return "#0f9842";
  if (change >= 1) return "#18a957";
  if (change >= 0.25) return "#268a4f";
  if (change > -0.25) return "#475569";
  if (change > -1) return "#a94f58";
  if (change > -2) return "#c53e49";
  if (change > -3) return "#ad2836";
  return "#7f1d2d";
}

function signedPercent(value: number) {
  return `${value > 0 ? "+" : ""}${value.toFixed(2)}%`;
}

function formatPrice(value: number | null) {
  if (value === null) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: value >= 100 ? 2 : 3,
  }).format(value);
}

function formatMarketCap(value: number) {
  if (value >= 1_000_000_000_000) return `$${(value / 1_000_000_000_000).toFixed(2)}T`;
  if (value >= 1_000_000_000) return `$${(value / 1_000_000_000).toFixed(1)}B`;
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(0)}M`;
  return `$${Math.round(value).toLocaleString("en-US")}`;
}

function normalizeSymbol(value: string) {
  return value.trim().toUpperCase().replaceAll(".", "/");
}

function earningsDday(event: EarningsRiskEvent) {
  if (event.daysAway <= 0) return "오늘";
  return `D-${event.daysAway}`;
}

export default function MarketTreemap({
  stocks,
  compact = false,
  showDetail = true,
}: MarketTreemapProps) {
  const [selectedSymbol, setSelectedSymbol] = useState<string | null>(null);
  const [earningsEvents, setEarningsEvents] = useState<EarningsRiskEvent[]>([]);

  useEffect(() => {
    if (compact) return;
    let cancelled = false;

    async function loadEarnings() {
      try {
        const response = await fetch("/api/public/earnings-risk", { cache: "no-store" });
        if (!response.ok) return;
        const payload = (await response.json()) as EarningsApiResponse;
        if (!cancelled && payload.snapshot?.events) {
          setEarningsEvents(payload.snapshot.events);
        }
      } catch {
        // MARKET MAP 자체 표시를 방해하지 않는다.
      }
    }

    void loadEarnings();
    return () => {
      cancelled = true;
    };
  }, [compact]);

  const earningsMap = useMemo(
    () => new Map(earningsEvents.map((event) => [normalizeSymbol(event.symbol), event])),
    [earningsEvents],
  );

  const layout = useMemo(() => {
    const sectorMap = new Map<string, MarketMapStock[]>();
    for (const stock of stocks) {
      const members = sectorMap.get(stock.sector) ?? [];
      members.push(stock);
      sectorMap.set(stock.sector, members);
    }

    const sectors = Array.from(sectorMap.entries()).map(([sector, members]) => ({
      sector,
      members,
      marketCap: members.reduce((sum, stock) => sum + Math.max(stock.marketCap, 1), 0),
    }));

    const sectorRects = binaryLayout(
      sectors.map((sector) => ({ item: sector, weight: sector.marketCap })),
      { x: 0, y: 0, width: 100, height: 100 },
    );

    return sectorRects.map(({ item: sector, rect }) => {
      const outer = inset(rect, compact ? 0.18 : 0.28);
      const headerHeight = compact ? 0 : outer.height >= 10 && outer.width >= 12 ? 3.1 : 0;
      const stockRect: Rect = {
        x: outer.x,
        y: outer.y + headerHeight,
        width: outer.width,
        height: Math.max(0.1, outer.height - headerHeight),
      };
      const cells = binaryLayout(
        sector.members.map((stock) => ({ item: stock, weight: Math.max(stock.marketCap, 1) })),
        stockRect,
      ).map((entry) => ({ ...entry, rect: inset(entry.rect, compact ? 0.08 : 0.12) }));
      return { sector: sector.sector, rect: outer, headerHeight, cells };
    });
  }, [compact, stocks]);

  const selected = selectedSymbol
    ? stocks.find((stock) => stock.symbol === selectedSymbol) ?? null
    : null;
  const selectedEarnings = selected
    ? earningsMap.get(normalizeSymbol(selected.symbol)) ?? null
    : null;

  if (stocks.length === 0) {
    return (
      <div className="flex min-h-72 items-center justify-center rounded-2xl bg-slate-950 text-sm font-bold text-slate-400">
        표시할 종목 데이터가 없습니다.
      </div>
    );
  }

  return (
    <div>
      <div
        className={`relative w-full overflow-hidden rounded-2xl bg-slate-950 shadow-inner ${
          compact
            ? "h-[300px] sm:h-[340px]"
            : "aspect-square sm:aspect-[16/10] lg:aspect-[16/9]"
        }`}
        role="img"
        aria-label="시가총액 크기와 등락률 색상으로 표시한 미국 주식 시장 히트맵"
      >
        {layout.map((sector) => (
          <div key={sector.sector}>
            {sector.headerHeight > 0 && (
              <div
                className="pointer-events-none absolute z-20 overflow-hidden px-1 text-[9px] font-black uppercase tracking-wide text-slate-300 sm:text-[10px]"
                style={{
                  left: `${sector.rect.x}%`,
                  top: `${sector.rect.y}%`,
                  width: `${sector.rect.width}%`,
                  height: `${sector.headerHeight}%`,
                }}
              >
                {sector.sector}
              </div>
            )}

            {sector.cells.map(({ item: stock, rect }) => {
              const area = rect.width * rect.height;
              const showSymbol = compact ? area >= 22 : area >= 10;
              const showChange = compact ? area >= 48 : area >= 24;
              const symbolSize = Math.max(8, Math.min(compact ? 16 : 22, Math.sqrt(area) * 1.5));
              const earnings = earningsMap.get(normalizeSymbol(stock.symbol));
              const showEarnings = !compact && Boolean(earnings) && area >= 28;
              return (
                <button
                  type="button"
                  key={stock.symbol}
                  onClick={() => setSelectedSymbol(stock.symbol)}
                  className="absolute flex items-center justify-center overflow-hidden border border-black/25 p-0.5 text-center text-white transition hover:z-30 hover:brightness-110 focus:z-30 focus:outline-none focus:ring-2 focus:ring-white/80"
                  style={{
                    left: `${rect.x}%`,
                    top: `${rect.y}%`,
                    width: `${rect.width}%`,
                    height: `${rect.height}%`,
                    backgroundColor: background(stock.changePercent),
                  }}
                  title={`${stock.displaySymbol} ${stock.name} ${signedPercent(stock.changePercent)}${earnings ? ` · 실적 ${earningsDday(earnings)}` : ""}`}
                >
                  {showEarnings && earnings && (
                    <span className="absolute right-1 top-1 z-20 rounded-full bg-amber-300 px-1.5 py-0.5 text-[8px] font-black text-slate-950 shadow-sm sm:text-[9px]">
                      ⚠ {earningsDday(earnings)}
                    </span>
                  )}
                  {showSymbol && (
                    <span className="leading-tight drop-shadow-sm">
                      <strong className="block font-black" style={{ fontSize: `${symbolSize}px` }}>
                        {stock.displaySymbol}
                      </strong>
                      {showChange && (
                        <span className="mt-0.5 block text-[9px] font-bold sm:text-[10px]">
                          {signedPercent(stock.changePercent)}
                        </span>
                      )}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        ))}
      </div>

      {showDetail && selected && (
        <div className="mt-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <strong className="text-lg font-black text-slate-950">{selected.displaySymbol}</strong>
                <span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-bold text-slate-500">
                  {selected.sector}
                </span>
              </div>
              <p className="mt-1 text-sm font-semibold text-slate-600">{selected.name}</p>
              <p className="mt-1 text-[11px] text-slate-400">{selected.industry}</p>
            </div>
            <div className="text-right">
              <p className={`text-xl font-black ${selected.changePercent >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                {signedPercent(selected.changePercent)}
              </p>
              <p className="mt-1 text-xs font-bold text-slate-500">{formatPrice(selected.price)}</p>
            </div>
          </div>

          {selectedEarnings && (
            <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs text-amber-900">
              <div className="flex flex-wrap items-center gap-2 font-black">
                <span>⚠ 실적 {earningsDday(selectedEarnings)}</span>
                <span>· {selectedEarnings.sessionLabel}</span>
                <span>· 영향도 {selectedEarnings.impactScore}</span>
              </div>
              <p className="mt-1 text-[10px] font-semibold text-amber-700">
                {selectedEarnings.reportDate} · {selectedEarnings.confidenceLabel} 일정
              </p>
            </div>
          )}

          <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
            <div className="rounded-xl bg-slate-50 p-3">
              <p className="font-semibold text-slate-400">시가총액</p>
              <p className="mt-1 font-black text-slate-800">{formatMarketCap(selected.marketCap)}</p>
            </div>
            <div className="rounded-xl bg-slate-50 p-3">
              <p className="font-semibold text-slate-400">거래량</p>
              <p className="mt-1 font-black text-slate-800">
                {selected.volume === null ? "—" : selected.volume.toLocaleString("en-US")}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
