import type { Metadata } from "next";
import Link from "next/link";

import {
  DISCLOSURE_CATEGORY_LABELS,
  getDailyDisclosureFeed,
  type DisclosureCategory,
  type DisclosureItem,
  type DisclosureMarket,
} from "@/app/lib/disclosureHub";
import { detectDartAnalysisKind } from "@/app/lib/dartDisclosureDetailV2";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "공시·실적 데이터 | 호행처럼",
  description:
    "한국 OpenDART와 미국 SEC EDGAR의 최근 공시·실적 데이터를 공식 원문 기준으로 정리합니다.",
  alternates: {
    canonical: "/data/disclosures",
  },
};

type PageProps = {
  searchParams: Promise<{
    market?: string;
    category?: string;
    scope?: string;
  }>;
};

const CATEGORIES: Array<DisclosureCategory | "all"> = [
  "all",
  "earnings",
  "major",
  "capital",
  "mna",
  "shareholder",
  "ownership",
];

function categoryLabel(category: DisclosureCategory | "all") {
  return category === "all" ? "전체" : DISCLOSURE_CATEGORY_LABELS[category];
}

function categoryTone(category: DisclosureCategory) {
  if (category === "earnings") return "border-blue-200 bg-blue-50 text-blue-700";
  if (category === "capital") return "border-amber-200 bg-amber-50 text-amber-700";
  if (category === "mna") return "border-violet-200 bg-violet-50 text-violet-700";
  if (category === "shareholder") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (category === "ownership") return "border-cyan-200 bg-cyan-50 text-cyan-700";
  if (category === "proxy") return "border-slate-200 bg-slate-50 text-slate-600";
  if (category === "major") return "border-rose-200 bg-rose-50 text-rose-700";
  return "border-slate-200 bg-white text-slate-500";
}

function sourceTone(source: DisclosureItem["source"]) {
  return source === "SEC"
    ? "border-slate-700 bg-slate-950 text-white"
    : "border-blue-200 bg-white text-blue-700";
}

function formatDate(value: string | null) {
  if (!value) return "확인 중";
  return value.replaceAll("-", ".");
}

function hrefFor(
  market: string,
  category: string,
  scope: string,
) {
  const params = new URLSearchParams();
  if (market !== "all") params.set("market", market);
  if (category !== "all") params.set("category", category);
  if (scope !== "important") params.set("scope", scope);
  const query = params.toString();
  return query ? `/data/disclosures?${query}` : "/data/disclosures";
}

function count(items: DisclosureItem[], category: DisclosureCategory) {
  return items.filter((item) => item.category === category).length;
}

function normalizeInvestmentItem(item: DisclosureItem): DisclosureItem {
  if (item.source !== "DART") return item;
  const title = item.title.replace(/\s+/g, "");

  if (title.includes("주식소각결정")) {
    return {
      ...item,
      category: "shareholder",
      importance: Math.max(item.importance, 94),
    };
  }

  return item;
}

function DisclosureCard({ item }: { item: DisclosureItem }) {
  const dartKind = item.source === "DART" ? detectDartAnalysisKind(item.title) : null;
  const localDetailUrl =
    item.detailUrl ??
    (dartKind && item.ticker
      ? `/data/disclosures/kr/${encodeURIComponent(item.ticker)}/${encodeURIComponent(item.sourceId)}?kind=${encodeURIComponent(dartKind)}`
      : null);

  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className={`rounded-full border px-2 py-0.5 text-[9px] font-black ${sourceTone(item.source)}`}>
              {item.source}
            </span>
            <span className={`rounded-full border px-2 py-0.5 text-[9px] font-black ${categoryTone(item.category)}`}>
              {DISCLOSURE_CATEGORY_LABELS[item.category]}
            </span>
            <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[9px] font-black text-slate-500">
              {item.exchange}
            </span>
            {dartKind && (
              <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[9px] font-black text-emerald-700">
                수치 분석 가능
              </span>
            )}
            {item.amendment && (
              <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[9px] font-black text-amber-700">
                정정
              </span>
            )}
          </div>
          <div className="mt-3 flex flex-wrap items-baseline gap-x-2 gap-y-1">
            <h2 className="text-base font-black text-slate-950 sm:text-lg">{item.company}</h2>
            {item.ticker && (
              <span className="text-xs font-black tracking-wide text-blue-600">{item.ticker}</span>
            )}
          </div>
          <p className="mt-2 text-sm font-bold leading-5 text-slate-700">{item.title}</p>
          <p className="mt-1 text-[11px] text-slate-400">
            {formatDate(item.filingDate)} · {item.form}
          </p>
        </div>

        {item.importance >= 90 && (
          <span className="shrink-0 rounded-full bg-slate-950 px-2.5 py-1 text-[9px] font-black text-white">
            핵심
          </span>
        )}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        {localDetailUrl && (
          <Link
            href={localDetailUrl}
            className="rounded-full bg-blue-600 px-3 py-1.5 text-xs font-black text-white hover:bg-blue-500"
          >
            {item.source === "DART"
              ? "공시 분석 보기 →"
              : item.structuredEarnings
                ? "공식 수치 보기 →"
                : "상세 데이터 →"}
          </Link>
        )}
        <a
          href={item.sourceUrl}
          target="_blank"
          rel="noreferrer"
          className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-black text-slate-600 hover:border-slate-300"
        >
          원문 →
        </a>
      </div>
    </article>
  );
}

export default async function DisclosureHubPage({ searchParams }: PageProps) {
  const query = await searchParams;
  const market = ["all", "kr", "us"].includes(query.market ?? "")
    ? (query.market as "all" | "kr" | "us")
    : "all";
  const category = CATEGORIES.includes((query.category ?? "all") as DisclosureCategory | "all")
    ? ((query.category ?? "all") as DisclosureCategory | "all")
    : "all";
  const scope = query.scope === "all" ? "all" : "important";

  const feed = await getDailyDisclosureFeed();
  const allItems = [...feed.us.items, ...feed.korea.items].map(normalizeInvestmentItem);
  const marketItems = allItems.filter((item) => {
    if (market === "kr") return item.market === "KR";
    if (market === "us") return item.market === "US";
    return true;
  });

  const filtered = marketItems
    .filter((item) => (scope === "important" ? item.importance >= 70 : true))
    .filter((item) => (category === "all" ? true : item.category === category))
    .sort((left, right) => {
      const dateOrder = right.filingDate.localeCompare(left.filingDate);
      if (dateOrder !== 0) return dateOrder;
      return right.importance - left.importance;
    });

  const statItems = marketItems.filter((item) => item.importance >= 70);

  return (
    <main className="min-h-screen bg-[#f6f7f9] pb-20 text-slate-900">
      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-10">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-blue-600">
                OFFICIAL FILINGS DATA
              </p>
              <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">
                공시·실적 데이터
              </h1>
            </div>
            <Link
              href="/data"
              className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-black text-slate-600"
            >
              투자 데이터 ←
            </Link>
          </div>

          <p className="mt-4 max-w-3xl text-sm leading-6 text-slate-600">
            한국 OpenDART와 미국 SEC EDGAR에서 확인되는 최근 완료 영업일 자료를 같은 형식으로 정리합니다.
            자동 문장보다 회사명·종목·공시 종류·공식 수치를 우선하고, 확인되지 않은 값은 추정하지 않습니다.
          </p>

          <div className="mt-4 rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3 text-xs leading-5 text-blue-700">
            한국 공시는 목록에서 전체 원문을 추가 수집하지 않습니다. 구조화 분석 또는 원문 수치 분석이 가능한 공시만 표시하고,
            사용자가 <strong>공시 분석 보기</strong>를 열 때 추가 데이터를 조회해 캐시하는 방식으로 API 사용량을 줄입니다.
          </div>

          <div className="mt-6 grid grid-cols-2 gap-2 sm:grid-cols-4">
            <div className="rounded-2xl bg-slate-950 p-4 text-white">
              <p className="text-[10px] font-bold text-slate-400">중요 공시</p>
              <p className="mt-1 text-2xl font-black tabular-nums">{statItems.length}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-[10px] font-bold text-slate-400">실적·보고서</p>
              <p className="mt-1 text-2xl font-black tabular-nums">{count(statItems, "earnings")}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-[10px] font-bold text-slate-400">자금조달</p>
              <p className="mt-1 text-2xl font-black tabular-nums">{count(statItems, "capital")}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-[10px] font-bold text-slate-400">M&A·주요공시</p>
              <p className="mt-1 text-2xl font-black tabular-nums">
                {count(statItems, "mna") + count(statItems, "major")}
              </p>
            </div>
          </div>

          <div className="mt-4 grid gap-2 text-xs sm:grid-cols-2">
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-slate-600">
              <span className="font-black text-slate-900">SEC</span> · 기준 {formatDate(feed.us.sourceDate)} · {feed.us.items.length}건
              {feed.us.error && <span className="ml-2 text-rose-600">{feed.us.error}</span>}
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-slate-600">
              <span className="font-black text-blue-700">DART</span> · {feed.korea.configured ? `기준 ${formatDate(feed.korea.sourceDate)} · ${feed.korea.items.length}건` : "무료 인증키 연결 대기"}
              {feed.korea.error && <span className="ml-2 text-rose-600">{feed.korea.error}</span>}
            </div>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6">
        {!feed.korea.configured && (
          <section className="mb-5 rounded-2xl border border-blue-200 bg-blue-50 p-4">
            <p className="text-sm font-black text-blue-900">한국 DART 자동수집은 코드 연결까지 준비돼 있습니다.</p>
            <p className="mt-1 text-xs leading-5 text-blue-700">
              Vercel에 DART_API_KEY가 등록되면 코스피·코스닥 최근 완료 영업일 공시가 이 화면에 자동으로 합쳐집니다.
              미국 SEC 데이터는 별도 키 없이 동작합니다.
            </p>
          </section>
        )}

        <section className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm sm:p-4">
          <div className="flex flex-wrap gap-2">
            {(["all", "us", "kr"] as const).map((item) => (
              <Link
                key={item}
                href={hrefFor(item, category, scope)}
                className={`rounded-full px-3 py-1.5 text-xs font-black ${
                  market === item ? "bg-slate-950 text-white" : "bg-slate-100 text-slate-500"
                }`}
              >
                {item === "all" ? "전체 시장" : item === "us" ? "미국 SEC" : "한국 DART"}
              </Link>
            ))}
          </div>

          <div className="mt-3 flex flex-wrap gap-2 border-t border-slate-100 pt-3">
            {CATEGORIES.map((item) => (
              <Link
                key={item}
                href={hrefFor(market, item, scope)}
                className={`rounded-full border px-3 py-1.5 text-[11px] font-black ${
                  category === item
                    ? "border-blue-600 bg-blue-600 text-white"
                    : "border-slate-200 bg-white text-slate-500"
                }`}
              >
                {categoryLabel(item)}
              </Link>
            ))}
          </div>

          <div className="mt-3 flex items-center justify-between gap-3 border-t border-slate-100 pt-3">
            <p className="text-xs font-bold text-slate-500">표시 {filtered.length}건</p>
            <Link
              href={hrefFor(market, category, scope === "important" ? "all" : "important")}
              className="text-xs font-black text-blue-600"
            >
              {scope === "important" ? "전체 공시 보기 →" : "중요 공시만 보기 →"}
            </Link>
          </div>
        </section>

        {filtered.length > 0 ? (
          <section className="mt-4 grid gap-3 md:grid-cols-2">
            {filtered.map((item) => (
              <DisclosureCard key={item.id} item={item} />
            ))}
          </section>
        ) : (
          <section className="mt-4 rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm">
            <p className="text-lg font-black text-slate-900">조건에 맞는 공시가 없습니다.</p>
            <p className="mt-2 text-sm text-slate-500">시장이나 공시 종류 필터를 바꿔보세요.</p>
          </section>
        )}

        <section className="mt-7 rounded-3xl bg-slate-950 p-5 text-white sm:p-6">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-blue-300">DATA → ANALYSIS → OPINION</p>
          <h2 className="mt-2 text-xl font-black">공식 데이터와 해석을 분리합니다.</h2>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-300">
            이 페이지는 공시 원문과 확인 가능한 구조화 수치만 모읍니다. “왜 주가가 움직였는가”, “무엇이 예상과 달랐는가” 같은 해석은 별도의 시황 및 시장 글에서 다루는 구조입니다.
          </p>
          <Link
            href="/blog?category=market"
            className="mt-5 inline-flex rounded-full bg-blue-600 px-4 py-2 text-sm font-black text-white"
          >
            시황 및 시장 →
          </Link>
        </section>
      </div>
    </main>
  );
}
