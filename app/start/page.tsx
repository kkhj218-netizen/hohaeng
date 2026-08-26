import type { Metadata } from "next";
import Link from "next/link";

import PwaInstallButton from "@/app/components/PwaInstallButton";
import SocialFunnelTracker from "@/app/components/SocialFunnelTracker";

export const metadata: Metadata = {
  title: "호행처럼 시작하기 | 오늘 시장부터 과거 데이터까지",
  description:
    "SNS에서 본 투자 데이터의 원본을 확인하고, 오늘의 투자 대시보드·CPI/PCE EVENT DB·투자 데이터를 앱처럼 저장해 반복해서 이용하세요.",
  alternates: { canonical: "/start" },
  robots: {
    index: false,
    follow: true,
  },
};

type SearchParams = Record<string, string | string[] | undefined>;

type SourceKey = "instagram" | "threads" | "x" | "social";

type SourceCopy = {
  eyebrow: string;
  title: string;
  description: string;
  accent: string;
};

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function normalizeSource(value?: string): SourceKey {
  const source = (value ?? "").toLowerCase();
  if (source.includes("instagram") || source === "ig") return "instagram";
  if (source.includes("threads")) return "threads";
  if (source === "x" || source.includes("twitter")) return "x";
  return "social";
}

const COPY: Record<SourceKey, SourceCopy> = {
  instagram: {
    eyebrow: "INSTAGRAM → HOHAENG OS",
    title: "카드에서 본 숫자, 여기서 직접 확인하세요.",
    description:
      "인스타에서는 핵심만 빠르게 보고, 호행처럼에서는 원본 데이터·과거 유사 사례·시장환경까지 이어서 확인할 수 있습니다.",
    accent: "인스타에서 오셨군요 👋",
  },
  threads: {
    eyebrow: "THREADS → HOHAENG OS",
    title: "대화에서 나온 시장 아이디어를 데이터로 확인하세요.",
    description:
      "Threads에서는 생각과 질문을 나누고, 호행처럼에서는 그 생각이 과거 데이터에서도 반복됐는지 직접 확인합니다.",
    accent: "Threads에서 이어서 보기",
  },
  x: {
    eyebrow: "X → HOHAENG OS",
    title: "짧은 데이터 포스트의 원본과 과거 사례를 확인하세요.",
    description:
      "X에서는 빠른 숫자와 변화만 보고, 호행처럼에서는 같은 지표의 전체 맥락과 이벤트 이후 실제 시장 반응까지 확인합니다.",
    accent: "X에서 본 데이터 더 보기",
  },
  social: {
    eyebrow: "SOCIAL → HOHAENG OS",
    title: "오늘 시장을 30초 안에 보고, 필요할 때 깊게 들어가세요.",
    description:
      "호행처럼은 무엇을 사라고 말하기보다 지금 시장을 판단하는 데 필요한 데이터와 과거 사례를 정리합니다.",
    accent: "처음 오셨다면 여기부터",
  },
};

const START_CARDS = [
  {
    step: "01",
    label: "매일 보는 화면",
    title: "TODAY · 오늘의 투자 대시보드",
    description: "미국시장 마감, 주요 선물, 금리·VIX·달러, 오늘의 일정과 시장 국면을 한 화면에서 봅니다.",
    href: "/today",
    cta: "30초 대시보드 보기 →",
  },
  {
    step: "02",
    label: "과거와 비교",
    title: "EVENT DB · CPI/PCE",
    description: "이번 발표와 비슷했던 과거, 발표 뒤 NQ·금·WTI·달러·국채가 어떻게 움직였는지 확인합니다.",
    href: "/data/events",
    cta: "과거 유사 사례 보기 →",
  },
  {
    step: "03",
    label: "필요할 때 깊게",
    title: "투자 DATA HUB",
    description: "거시 데이터, 공시, 발표 일정과 개별 데이터 페이지를 필요할 때 골라서 확인합니다.",
    href: "/data",
    cta: "투자 데이터 열기 →",
  },
];

export default async function SocialStartPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const params = await searchParams;
  const source = normalizeSource(first(params.utm_source) ?? first(params.from));
  const copy = COPY[source];

  return (
    <main className="min-h-screen bg-[#f5f7fb] pb-20 text-slate-950">
      <SocialFunnelTracker source={source} />

      <section className="overflow-hidden border-b border-slate-800 bg-slate-950 text-white">
        <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 sm:py-14">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs font-black uppercase tracking-[0.22em] text-blue-300">{copy.eyebrow}</p>
            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-bold text-slate-300">
              {copy.accent}
            </span>
          </div>

          <h1 className="mt-5 max-w-4xl text-4xl font-black leading-tight tracking-tight sm:text-5xl">
            {copy.title}
          </h1>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-300 sm:text-base">{copy.description}</p>

          <div className="mt-7 grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-4">
              <p className="text-xs font-black text-blue-300">30초</p>
              <p className="mt-1 text-sm font-black">오늘 시장 확인</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-4">
              <p className="text-xs font-black text-violet-300">2016~현재</p>
              <p className="mt-1 text-sm font-black">이벤트 과거 비교</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-4">
              <p className="text-xs font-black text-emerald-300">PWA</p>
              <p className="mt-1 text-sm font-black">앱처럼 반복 사용</p>
            </div>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-5xl space-y-8 px-4 py-8 sm:px-6">
        <section>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-blue-600">START HERE</p>
          <h2 className="mt-2 text-2xl font-black sm:text-3xl">처음에는 이 순서로 보면 됩니다.</h2>
          <p className="mt-2 text-sm leading-6 text-slate-500">SNS에서 모든 걸 보려고 하지 말고, 관심이 생긴 순간에만 호행처럼으로 들어오면 돼요.</p>

          <div className="mt-5 grid gap-4 lg:grid-cols-3">
            {START_CARDS.map((card) => (
              <Link
                key={card.step}
                href={card.href}
                className="group rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-blue-300 hover:shadow-md"
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="text-xs font-black text-blue-600">{card.step} · {card.label}</span>
                  <span className="text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-blue-600">→</span>
                </div>
                <h3 className="mt-3 text-xl font-black">{card.title}</h3>
                <p className="mt-3 text-sm leading-6 text-slate-500">{card.description}</p>
                <p className="mt-5 text-sm font-black text-blue-600">{card.cta}</p>
              </Link>
            ))}
          </div>
        </section>

        <section className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-3xl bg-slate-950 p-6 text-white shadow-xl sm:p-7">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-blue-300">RETURN LOOP</p>
            <h2 className="mt-2 text-2xl font-black">한 번 보고 끝내지 말고, 홈 화면에서 바로 들어오세요.</h2>
            <p className="mt-3 text-sm leading-7 text-slate-300">
              호행처럼의 핵심은 매일 새 글을 읽는 것보다 TODAY와 EVENT DB를 필요할 때 반복해서 확인하는 데 있습니다.
              홈 화면에 저장하면 주소를 다시 찾지 않고 바로 TODAY로 들어갈 수 있습니다.
            </p>
            <div className="mt-5">
              <PwaInstallButton variant="hero" source={`social_start_${source}`} />
            </div>
            <p className="mt-3 text-xs leading-5 text-slate-500">
              iPhone은 Safari의 ‘홈 화면에 추가’ 안내가 표시되고, 지원되는 Android/Chrome에서는 설치창을 바로 띄웁니다.
            </p>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-7">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-600">HOHAENG PRINCIPLE</p>
            <h2 className="mt-2 text-2xl font-black">매수·매도 추천보다 판단할 데이터를 정리합니다.</h2>
            <div className="mt-5 space-y-3 text-sm leading-6 text-slate-600">
              <p>• 오늘 시장이 어떤 환경인지 먼저 봅니다.</p>
              <p>• 중요한 발표는 과거 비슷했던 사례와 비교합니다.</p>
              <p>• 한 번의 결과보다 TOP5·10·20 전체 분포를 봅니다.</p>
              <p>• 실제 결과가 나온 뒤 과거 패턴과 달랐는지도 복기합니다.</p>
            </div>
          </div>
        </section>

        <section className="rounded-3xl border border-blue-100 bg-blue-50 p-5 sm:p-6">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-blue-600">NEXT VISIT</p>
          <div className="mt-2 flex flex-wrap items-end justify-between gap-4">
            <div>
              <h2 className="text-xl font-black">내일부터는 `/today`만 열어도 됩니다.</h2>
              <p className="mt-2 text-sm leading-6 text-blue-900/70">SNS는 새로운 아이디어를 발견하는 곳, 호행처럼은 그 아이디어를 확인하고 다시 찾아오는 곳으로 역할을 나눕니다.</p>
            </div>
            <Link href="/today" className="rounded-xl bg-blue-600 px-4 py-3 text-sm font-black text-white shadow-sm hover:bg-blue-700">TODAY 열기 →</Link>
          </div>
        </section>
      </div>
    </main>
  );
}
