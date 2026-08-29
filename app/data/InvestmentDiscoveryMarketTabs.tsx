"use client";

import Link from "next/link";
import { useState } from "react";

import InvestmentDiscoveryExplorer, {
  type DiscoveryCompanyGroup,
  type DiscoveryDetectedItem,
  type DiscoveryKey,
  type DiscoveryStatItem,
} from "@/app/data/InvestmentDiscoveryExplorer";

export type InvestmentDiscoveryPanel = {
  market: "kr" | "us";
  tabLabel: string;
  tabNote: string;
  description: string;
  detailHref: string;
  detailLabel: string;
  badges: string[];
  stats: DiscoveryStatItem[];
  companyLists: Partial<Record<DiscoveryKey, DiscoveryCompanyGroup[]>>;
  detectedItems: DiscoveryDetectedItem[];
  sourceLabel: string;
  idleTitle: string;
  idleHint: string;
  available: boolean;
  error: string | null;
  footnote: string;
};

type Props = {
  korea: InvestmentDiscoveryPanel;
  us: InvestmentDiscoveryPanel;
};

export default function InvestmentDiscoveryMarketTabs({ korea, us }: Props) {
  const [market, setMarket] = useState<"kr" | "us">("kr");
  const active = market === "kr" ? korea : us;

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.16em] text-blue-600">
            TODAY&apos;S DISCOVERIES
          </p>
          <h2 className="mt-2 text-2xl font-black tracking-tight">오늘 발견된 투자 데이터</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">{active.description}</p>
        </div>
        <Link
          href={active.detailHref}
          className="rounded-full bg-slate-950 px-4 py-2 text-sm font-black text-white hover:bg-slate-800"
        >
          {active.detailLabel} →
        </Link>
      </div>

      <div className="mt-5 grid grid-cols-2 rounded-2xl bg-slate-100 p-1">
        {[korea, us].map((panel) => {
          const selected = market === panel.market;
          return (
            <button
              key={panel.market}
              type="button"
              onClick={() => setMarket(panel.market)}
              aria-pressed={selected}
              className={`rounded-xl px-3 py-2.5 text-left transition ${
                selected
                  ? "bg-white text-slate-950 shadow-sm ring-1 ring-slate-200"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              <span className="block text-sm font-black">{panel.tabLabel}</span>
              <span className={`mt-0.5 block text-[9px] font-bold ${selected ? "text-blue-600" : "text-slate-400"}`}>
                {panel.tabNote}
              </span>
            </button>
          );
        })}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2 text-[10px] font-bold text-slate-400">
        {active.badges.map((badge) => (
          <span key={badge} className="rounded-full bg-slate-100 px-2.5 py-1">
            {badge}
          </span>
        ))}
      </div>

      {active.available ? (
        <InvestmentDiscoveryExplorer
          key={active.market}
          stats={active.stats}
          companyLists={active.companyLists}
          detectedItems={active.detectedItems}
          sourceLabel={active.sourceLabel}
          idleTitle={active.idleTitle}
          idleHint={active.idleHint}
        />
      ) : (
        <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-5">
          <p className="text-sm font-black text-amber-900">
            {active.market === "us" ? "미국 SEC 공시를 불러오지 못했습니다." : "국내 DART 공시를 불러오지 못했습니다."}
          </p>
          <p className="mt-1 text-xs leading-5 text-amber-700">
            {active.error || "잠시 뒤 다시 확인해주세요."}
          </p>
        </div>
      )}

      <div className="mt-5 rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3">
        <p className="text-[11px] font-black text-blue-800">
          {active.market === "us" ? "SEC 데이터 기준" : "운영 보호장치"}
        </p>
        <p className="mt-1 text-[10px] leading-5 text-blue-700">{active.footnote}</p>
      </div>
    </section>
  );
}
