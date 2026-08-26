import type { Metadata } from "next";
import Link from "next/link";

import { getEventHubItems } from "@/app/lib/eventHub";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "경제지표 EVENT DB | CPI·PCE·고용·FOMC | 호행처럼",
  description:
    "CPI와 PCE를 시작으로 주요 미국 경제지표의 발표값, 과거 사례, 시장환경, 자산 반응을 하나의 EVENT DB로 축적합니다.",
  alternates: { canonical: "/data/events" },
};

function formatDate(value: string | null) {
  if (!value) return "아직 데이터 없음";
  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(value));
}

export default async function EventDbHubPage() {
  const items = await getEventHubItems();
  const active = items.filter((item) => item.status === "active");
  const planned = items.filter((item) => item.status === "planned");

  return (
    <main className="min-h-screen bg-[#f6f7f9] pb-16 text-slate-900">
      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-6xl px-4 py-9 sm:px-6">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-blue-600">HOHAENG EVENT DB</p>
          <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">경제지표가 발표된 뒤 시장은 실제로 어떻게 움직였나?</h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
            발표 숫자만 모으지 않습니다. 실제값·이전값·컨센서스와 발표 후 자산 반응을 같은 이벤트 단위로 저장해,
            시간이 지날수록 과거 비교가 쉬워지는 데이터베이스를 만듭니다.
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            <Link href="/data" className="rounded-full bg-slate-950 px-4 py-2 text-sm font-black text-white">투자 데이터 홈 →</Link>
            <Link href="/data/calendar" className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-black text-blue-600">발표 일정 →</Link>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-6xl space-y-9 px-4 py-7 sm:px-6">
        <section>
          <div className="mb-4">
            <p className="text-xs font-black uppercase tracking-wider text-emerald-600">ACTIVE DATABASES</p>
            <h2 className="mt-1 text-2xl font-black">현재 사용할 수 있는 EVENT DB</h2>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {active.map((item) => (
              <Link
                key={item.key}
                href={item.href}
                className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-blue-300 hover:shadow-md sm:p-6"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <span className="rounded-full bg-emerald-50 px-3 py-1 text-[11px] font-black text-emerald-700">ACTIVE</span>
                    <h3 className="mt-3 text-2xl font-black">{item.name}</h3>
                    <p className="mt-2 text-sm leading-6 text-slate-600">{item.description}</p>
                  </div>
                  <span className="text-2xl text-slate-300">→</span>
                </div>
                <div className="mt-5 grid grid-cols-2 gap-2 border-t border-slate-100 pt-4 text-sm">
                  <div>
                    <p className="text-xs font-bold text-slate-400">저장 이벤트</p>
                    <p className="mt-1 text-lg font-black">{item.eventCount}건</p>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-400">최근 등록 발표</p>
                    <p className="mt-1 font-black">{formatDate(item.latestReleaseAt)}</p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>

        <section>
          <div className="mb-4">
            <p className="text-xs font-black uppercase tracking-wider text-slate-400">NEXT</p>
            <h2 className="mt-1 text-2xl font-black">다음 확장 순서</h2>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {planned.map((item, index) => (
              <div key={item.key} className="rounded-3xl border border-dashed border-slate-300 bg-white/70 p-5">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-black text-slate-400">NEXT {index + 1}</p>
                    <h3 className="mt-1 text-xl font-black">{item.name}</h3>
                  </div>
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-black text-slate-500">PLANNED</span>
                </div>
                <p className="mt-3 text-sm leading-6 text-slate-500">{item.description}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-3xl bg-slate-950 p-6 text-white">
          <p className="text-xs font-black uppercase tracking-wider text-orange-300">WHY THIS MATTERS</p>
          <h2 className="mt-1 text-2xl font-black">한 이벤트를 깊게 만든 뒤 옆으로 확장합니다.</h2>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-300">
            CPI에서 만든 10년 아카이브·유사 사례·시장환경·반응 유형 구조를 공통 패턴으로 사용합니다.
            PCE → 고용보고서 → FOMC로 늘어날수록 서로 다른 이벤트가 같은 시장환경에서 어떤 반응을 만들었는지 비교할 수 있게 됩니다.
          </p>
        </section>
      </div>
    </main>
  );
}
