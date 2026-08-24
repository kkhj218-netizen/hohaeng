import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import {
  getDartDisclosureAnalysis,
  isDartAnalysisKind,
} from "@/app/lib/dartDisclosureDetailV2";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type PageProps = {
  params: Promise<{
    stockCode: string;
    receiptNo: string;
  }>;
  searchParams: Promise<{
    kind?: string;
  }>;
};

const LIST_HREF = "/data/disclosures?market=kr";

export async function generateMetadata({ params, searchParams }: PageProps): Promise<Metadata> {
  const { stockCode, receiptNo } = await params;
  const query = await searchParams;
  if (!isDartAnalysisKind(query.kind)) {
    return {
      title: "DART 공시 분석 | 호행처럼",
      robots: { index: false, follow: true },
    };
  }

  const detail = await getDartDisclosureAnalysis(stockCode, receiptNo, query.kind);
  return {
    title: detail
      ? `${detail.company} ${detail.kindLabel} 공시 분석 | 호행처럼`
      : "DART 공시 분석 | 호행처럼",
    description: detail
      ? `${detail.company} ${detail.kindLabel} 공시의 핵심 수치와 투자자가 확인할 포인트를 OpenDART 공식 데이터 기준으로 정리합니다.`
      : "OpenDART 공식 데이터를 이용한 공시 분석 페이지입니다.",
    robots: { index: false, follow: true },
  };
}

export default async function DartDisclosureDetailPage({ params, searchParams }: PageProps) {
  const { stockCode, receiptNo } = await params;
  const query = await searchParams;
  if (!isDartAnalysisKind(query.kind)) notFound();

  const detail = await getDartDisclosureAnalysis(stockCode, receiptNo, query.kind);
  if (!detail) notFound();

  return (
    <main className="min-h-screen bg-[#f6f7f9] pb-24 text-slate-900">
      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 sm:py-10">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Link
              href={LIST_HREF}
              className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-black text-slate-700"
            >
              ← 한국 공시 목록
            </Link>
            <Link href="/data" className="text-xs font-black text-slate-400 hover:text-blue-600">
              투자 데이터 →
            </Link>
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-blue-600 px-2.5 py-1 text-[10px] font-black text-white">
              OpenDART
            </span>
            <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[10px] font-black text-slate-600">
              {detail.kindLabel}
            </span>
            <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[10px] font-black text-emerald-700">
              {detail.dataMode === "document" ? "공식 공시 원문 수치" : "공식 구조화 데이터"}
            </span>
          </div>

          <div className="mt-4 flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <h1 className="text-3xl font-black tracking-tight sm:text-4xl">{detail.company}</h1>
            <span className="text-lg font-black text-blue-600">{detail.stockCode}</span>
          </div>
          <p className="mt-3 text-sm text-slate-500">
            접수 {detail.filingDate} · {detail.receiptNo}
          </p>
        </div>
      </section>

      <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6">
        <section className="rounded-3xl bg-slate-950 p-5 text-white shadow-sm sm:p-6">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-blue-300">KEY FACT</p>
          <h2 className="mt-2 text-2xl font-black leading-tight sm:text-3xl">{detail.headline}</h2>
          <p className="mt-3 max-w-3xl text-xs leading-5 text-slate-400">
            이 문구는 주가 전망이나 매수·매도 의견이 아니라 공시된 수치에서 뽑은 핵심 사실입니다.
          </p>
        </section>

        <section className="mt-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.16em] text-blue-600">OFFICIAL + DERIVED</p>
              <h2 className="mt-1 text-xl font-black">핵심 데이터</h2>
            </div>
            <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[10px] font-black text-slate-500">
              추정 추천 없음
            </span>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {detail.metrics.map((metric) => (
              <div
                key={`${metric.label}-${metric.value}`}
                className={`rounded-2xl border p-4 ${
                  metric.attention
                    ? "border-amber-200 bg-amber-50"
                    : "border-slate-100 bg-slate-50"
                }`}
              >
                <p className="text-[11px] font-black text-slate-500">{metric.label}</p>
                <p className="mt-2 break-words text-xl font-black tabular-nums text-slate-950">
                  {metric.value}
                </p>
                {metric.description && (
                  <p className="mt-2 text-[10px] leading-4 text-slate-400">{metric.description}</p>
                )}
              </div>
            ))}
          </div>
        </section>

        {detail.fundingPurposes.length > 0 && (
          <section className="mt-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <h2 className="text-xl font-black">자금 사용 목적</h2>
            <div className="mt-4 divide-y divide-slate-100 rounded-2xl border border-slate-100">
              {detail.fundingPurposes.map((item) => (
                <div key={item.label} className="flex items-center justify-between gap-4 px-4 py-3">
                  <span className="text-sm font-bold text-slate-600">{item.label}</span>
                  <span className="text-sm font-black tabular-nums text-slate-950">{item.value}</span>
                </div>
              ))}
            </div>
          </section>
        )}

        <section className="mt-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <h2 className="text-xl font-black">투자자가 확인할 포인트</h2>
          <div className="mt-4 space-y-3">
            {detail.checkpoints.map((checkpoint, index) => (
              <div key={checkpoint} className="flex gap-3 rounded-2xl bg-slate-50 p-4">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-950 text-[10px] font-black text-white">
                  {index + 1}
                </span>
                <p className="text-sm leading-6 text-slate-600">{checkpoint}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-4 rounded-3xl border border-blue-200 bg-blue-50 p-5 sm:p-6">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-blue-700">LOW-COST ARCHITECTURE</p>
          <h2 className="mt-2 text-lg font-black text-blue-950">필요할 때만 상세 데이터를 조회합니다.</h2>
          <p className="mt-2 text-xs leading-5 text-blue-700">{detail.cacheNote}</p>
          <p className="mt-2 text-xs leading-5 text-blue-700">
            공시 원문·PDF·XBRL 파일을 호행처럼 DB에 복사해 쌓지 않고 공식 원문 링크를 유지해 저장공간 사용을 최소화합니다.
          </p>
        </section>

        <section className="mt-4 rounded-3xl bg-white p-5 shadow-sm sm:p-6">
          <h2 className="text-lg font-black">공식 원문 교차확인</h2>
          <p className="mt-2 text-xs leading-5 text-slate-500">
            정정공시나 특수 조건이 있을 수 있으므로 최종 판단 전에는 DART 원문도 함께 확인하세요.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <a
              href={detail.sourceUrl}
              target="_blank"
              rel="noreferrer"
              className="rounded-full bg-slate-950 px-4 py-2 text-sm font-black text-white"
            >
              DART 원문 →
            </a>
            <Link
              href={LIST_HREF}
              className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-black text-slate-600"
            >
              다른 공시 보기 →
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
