import type { Metadata } from "next";
import Link from "next/link";

import PwaInstallButton from "@/app/components/PwaInstallButton";
import TodayPageView from "@/app/today/TodayPageView";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "호행처럼 무료 투자 대시보드 앱",
  description:
    "미국 증시, 시장맵, 섹터 등락, 경제 일정, 금리와 원자재를 한눈에 보고 호행처럼을 홈 화면에 무료로 설치하세요.",
  alternates: { canonical: "/app" },
  openGraph: {
    title: "호행처럼 무료 투자 대시보드 앱",
    description: "오늘 시장을 한눈에. 설치 없이도 보고, 홈 화면에 무료로 저장할 수 있습니다.",
    url: "/app",
    type: "website",
  },
};

const FEATURES = [
  ["📈", "미국 증시", "주요 지수와 시장 흐름"],
  ["🗺️", "S&P500 · Nasdaq 시장맵", "종목별 강약을 한눈에"],
  ["📊", "섹터 등락", "어느 업종이 움직였는지 확인"],
  ["📅", "CPI · FOMC · 실적 발표", "중요 일정을 미리 체크"],
  ["💵", "금리 · 달러 · 원자재", "핵심 투자 데이터 모음"],
  ["📰", "전일 시황 정리", "시장을 짧고 빠르게 복기"],
] as const;

export default function AppInstallPage() {
  return (
    <>
      <section className="border-b border-slate-800 bg-slate-950 text-white">
        <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 sm:py-14">
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-xs font-black uppercase tracking-[0.2em] text-blue-300">
              HOHAENG PWA
            </p>
            <h1 className="mt-3 text-3xl font-black tracking-tight sm:text-5xl">
              오늘 시장을 한눈에.
            </h1>
            <p className="mx-auto mt-4 max-w-2xl text-sm leading-7 text-slate-300 sm:text-base">
              미국 증시부터 시장맵, 주요 일정과 투자 데이터까지 한곳에서 확인하세요.
              회원가입 없이 무료로 보고, 자주 본다면 홈 화면에 앱처럼 저장할 수 있습니다.
            </p>

            <div className="mx-auto mt-7 grid max-w-xl gap-3 sm:grid-cols-2">
              <Link
                href="/today"
                className="flex items-center justify-center rounded-2xl border border-white/15 bg-white/10 px-5 py-4 text-base font-black text-white transition hover:bg-white/15"
              >
                📊 대시보드 바로 보기
              </Link>
              <PwaInstallButton variant="hero" source="app_landing" />
            </div>

            <p className="mt-3 text-xs font-semibold text-slate-500">
              무료 · 회원가입 없음 · 설치 후에도 같은 TODAY 대시보드를 사용합니다
            </p>
          </div>

          <div className="mt-9 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map(([emoji, title, description]) => (
              <div
                key={title}
                className="rounded-2xl border border-white/10 bg-white/[0.05] p-4 text-left"
              >
                <div className="flex items-start gap-3">
                  <span className="text-xl" aria-hidden="true">{emoji}</span>
                  <div>
                    <h2 className="text-sm font-black text-white">{title}</h2>
                    <p className="mt-1 text-xs leading-5 text-slate-400">{description}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-8 rounded-2xl border border-blue-400/20 bg-blue-500/10 px-4 py-4 text-sm leading-6 text-blue-50 sm:px-5">
            <strong>아래는 실제 호행처럼 TODAY입니다.</strong> 설치 전에도 그대로 사용할 수 있고,
            설치하면 다음부터 휴대폰 홈 화면에서 바로 이 화면으로 들어올 수 있습니다.
          </div>
        </div>
      </section>

      <TodayPageView />
    </>
  );
}
