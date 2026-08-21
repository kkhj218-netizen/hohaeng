import type { JhMarketMetric } from "@/app/lib/jhMarketTypes";

type BadgeInfo = {
  label: string;
  className: string;
  title: string;
};

export function marketDataBadgeInfo(metric: JhMarketMetric): BadgeInfo {
  const source = `${metric.sourceCode} ${metric.sourceName}`.toUpperCase();
  const status = metric.freshnessStatus ?? (metric.stale ? "delayed" : "fresh");

  if (source.includes("YAHOO") || source.includes("STOOQ")) {
    return {
      label: "LIVE",
      className: "border-emerald-200 bg-emerald-50 text-emerald-700",
      title: "최근 시장시세로 보강된 값",
    };
  }

  if (status === "awaiting_release") {
    return {
      label: "발표 대기",
      className: "border-amber-200 bg-amber-50 text-amber-700",
      title: "현재 값은 공식 최신값이며 다음 발표를 기다리는 중",
    };
  }

  if (status === "delayed" || metric.stale) {
    return {
      label: "확인 필요",
      className: "border-rose-200 bg-rose-50 text-rose-700",
      title: "원천 데이터 갱신 여부 확인이 필요한 값",
    };
  }

  if (source.includes("FRED")) {
    return {
      label: "FRED",
      className: "border-blue-200 bg-blue-50 text-blue-700",
      title: "FRED 원천의 공식 최신 관측값",
    };
  }

  return {
    label: "DATA",
    className: "border-slate-200 bg-slate-50 text-slate-600",
    title: "연결된 원천 데이터",
  };
}

export default function MarketDataBadge({
  metric,
  compact = false,
}: {
  metric: JhMarketMetric;
  compact?: boolean;
}) {
  const badge = marketDataBadgeInfo(metric);

  return (
    <span
      title={badge.title}
      className={`inline-flex shrink-0 items-center rounded-full border font-black tracking-wide ${badge.className} ${
        compact ? "px-1.5 py-0.5 text-[9px]" : "px-2 py-0.5 text-[10px]"
      }`}
    >
      {badge.label}
    </span>
  );
}
