import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { getSecFilingDetail, type SecCoreMetric } from "@/app/lib/secFilingDetail";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{
    cik: string;
    accession: string;
  }>;
};

const DISCLOSURE_LIST_HREF = "/data/disclosures?market=us";

function formatUsd(value: number) {
  const absolute = Math.abs(value);
  const sign = value < 0 ? "-" : "";
  if (absolute >= 1_000_000_000) return `${sign}$${(absolute / 1_000_000_000).toFixed(2)}B`;
  if (absolute >= 1_000_000) return `${sign}$${(absolute / 1_000_000).toFixed(1)}M`;
  if (absolute >= 1_000) return `${sign}$${(absolute / 1_000).toFixed(1)}K`;
  return `${sign}$${absolute.toLocaleString("en-US", { maximumFractionDigits: 2 })}`;
}

function formatMetric(metric: SecCoreMetric) {
  if (metric.unit === "USD/shares") {
    return `$${metric.value.toLocaleString("en-US", { maximumFractionDigits: 3 })}`;
  }
  return formatUsd(metric.value);
}

function formatDate(value: string | null) {
  if (!value) return "확인 중";
  return value.slice(0, 10).replaceAll("-", ".");
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { cik, accession } = await params;
  const detail = await getSecFilingDetail(cik, accession);

  return {
    title: detail
      ? `${detail.company} ${detail.form} 공식 데이터 | 호행처럼`
      : "SEC 공시 상세 | 호행처럼",
    description: detail
      ? `${detail.company}의 ${detail.form} 공시와 SEC XBRL에서 확인되는 공식 재무 수치를 정리합니다.`
      : "SEC 공시 상세 데이터",
    robots: {
      index: false,
      follow: true,
    },
  };
}

export default async function SecDisclosureDetailPage({ params }: PageProps) {
  const { cik, accession } = await params;
  const detail = await getSecFilingDetail(cik, accession);
  if (!detail) notFound();

  const isEarnings8K = detail.form.toUpperCase().startsWith("8-K") && detail.items.includes("2.02");

  return (
    <main className="min-h-screen bg-[#f6f7f9] pb-32 text-slate-900 sm:pb-20">
      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 sm:py-10">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Link
              href={DISCLOSURE_LIST_HREF}
              className="inline-flex items-center rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-black text-slate-700 shadow-sm transition hover:border-blue-300 hover:text-blue-600"
            >
              ← 공시 목록으로
            </Link>
            <Link
              href="/data"
              className="text-xs font-black text-slate-400 transition hover:text-blue-600"
            >
              투자 데이터 →
            </Link>
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-slate-950 px-2.5 py-1 text-[10px] font-black text-white">SEC</span>
            <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[10px] font-black text-slate-600">
              {detail.form}
            </span>
            {isEarnings8K && (
              <span className="rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 text-[10px] font-black text-blue-700">
                2.02 실적 발표
              </span>
            )}
          </div>

          <div className="mt-4 flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <h1 className="text-3xl font-black tracking-tight sm:text-4xl">{detail.company}</h1>
            {detail.ticker && <span className="text-lg font-black text-blue-600">{detail.ticker}</span>}
          </div>

          <p className="mt-3 text-sm text-slate-500">
            제출 {formatDate(detail.filingDate)}
            {detail.reportDate ? ` · 보고기간 ${formatDate(detail.reportDate)}` : ""}
            {detail.items.length > 0 ? ` · Item ${detail.items.join(", ")}` : ""}
          </p>
        </div>
      </section>

      <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6">
        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.16em] text-blue-600">OFFICIAL XBRL FACTS</p>
              <h2 className="mt-1 text-xl font-black">공식 재무 수치</h2>
            </div>
            <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[10px] font-black text-emerald-700">
              추정값 없음
            </span>
          </div>

          {detail.metrics.length > 0 ? (
            <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {detail.metrics.map((metric) => (
                <div key={metric.key} className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-[11px] font-black text-slate-500">{metric.label}</p>
                  <p className="mt-2 text-xl font-black tabular-nums text-slate-950">{formatMetric(metric)}</p>
                  {(metric.start || metric.end) && (
                    <p className="mt-2 text-[9px] leading-4 text-slate-400">
                      {metric.start ? formatDate(metric.start) : ""}
                      {metric.start && metric.end ? " ~ " : ""}
                      {metric.end ? formatDate(metric.end) : ""}
                    </p>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="mt-5 rounded-2xl bg-slate-50 p-5">
              <p className="text-sm font-black text-slate-700">이 공시에서 동일 접수번호로 확인되는 표준 XBRL 핵심 수치가 없습니다.</p>
              <p className="mt-2 text-xs leading-5 text-slate-500">
                8-K의 실적 보도자료, 회사별 특수 KPI, 가이던스는 표준 XBRL 항목이 아닐 수 있어 임의 추출하지 않습니다.
              </p>
            </div>
          )}

          <div className="mt-5 border-t border-slate-100 pt-4">
            <a
              href={detail.sourceUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex rounded-full bg-slate-950 px-4 py-2 text-sm font-black text-white"
            >
              SEC 원문 확인 →
            </a>
          </div>
        </section>

        <section className="mt-4 rounded-3xl border border-slate-200 bg-white p-5 sm:p-6">
          <h2 className="text-lg font-black">이 페이지에서 일부러 하지 않는 것</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="text-xs font-black text-slate-900">컨센서스 추정</p>
              <p className="mt-2 text-xs leading-5 text-slate-500">SEC 공식 공시에는 시장 컨센서스가 없으므로 신뢰할 별도 소스를 연결하기 전에는 표시하지 않습니다.</p>
            </div>
            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="text-xs font-black text-slate-900">회사별 KPI 추정</p>
              <p className="mt-2 text-xs leading-5 text-slate-500">데이터센터 매출처럼 회사마다 정의가 다른 지표는 표준 항목으로 확인되지 않으면 자동 생성하지 않습니다.</p>
            </div>
            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="text-xs font-black text-slate-900">주가 반응 해석</p>
              <p className="mt-2 text-xs leading-5 text-slate-500">좋았다·나빴다 같은 해석은 이 데이터 페이지가 아니라 별도의 시황 및 시장 콘텐츠에서 다룹니다.</p>
            </div>
          </div>
        </section>

        <section className="mt-4 rounded-3xl bg-slate-950 p-5 text-white sm:p-6">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-blue-300">NEXT STEP</p>
          <h2 className="mt-2 text-xl font-black">Data → Analysis</h2>
          <p className="mt-3 text-sm leading-6 text-slate-300">
            공식 수치와 원문을 먼저 확인하고, 시장 기대·주가 반응·가이던스의 의미는 시황 및 시장 글에서 별도로 해석합니다.
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            <Link
              href={DISCLOSURE_LIST_HREF}
              className="inline-flex rounded-full bg-white px-4 py-2 text-sm font-black text-slate-950"
            >
              ← 공시 목록으로
            </Link>
            <Link href="/blog?category=market" className="inline-flex rounded-full bg-blue-600 px-4 py-2 text-sm font-black">
              시황 및 시장 →
            </Link>
          </div>
        </section>
      </div>

      <div className="fixed inset-x-0 bottom-20 z-40 px-4 sm:hidden">
        <div className="mx-auto max-w-md rounded-2xl border border-slate-200 bg-white/95 p-2 shadow-xl backdrop-blur">
          <Link
            href={DISCLOSURE_LIST_HREF}
            className="flex min-h-12 items-center justify-center rounded-xl bg-slate-950 px-4 text-sm font-black text-white"
          >
            ← 공시 목록으로 돌아가기
          </Link>
        </div>
      </div>
    </main>
  );
}
