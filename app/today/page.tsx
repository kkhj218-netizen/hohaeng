import type { Metadata } from "next";

import TodayPageView from "@/app/today/TodayPageView";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "오늘의 투자 대시보드 | 호행처럼",
  description:
    "미국 현물 정규장 마감, 같은 시점의 주요 지수선물, 경제 일정과 핵심 투자 데이터를 한 화면에서 확인합니다.",
  alternates: { canonical: "/today" },
  openGraph: {
    title: "오늘의 투자 대시보드 | 호행처럼",
    description:
      "미국 현물 장마감과 NQ·ES·YM·RTY 선물의 장마감 동시점 데이터를 함께 확인하세요.",
    url: "/today",
    type: "website",
  },
};

export default function TodayPage() {
  return <TodayPageView />;
}
