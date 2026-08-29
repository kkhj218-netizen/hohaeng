"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

type GtagWindow = Window & {
  gtag?: (...args: unknown[]) => void;
};

function track(eventName: string, params: Record<string, string>) {
  (window as GtagWindow).gtag?.("event", eventName, params);
}

export default function InvestmentPostPwaCta() {
  const pathname = usePathname();
  const [isInvestmentPost, setIsInvestmentPost] = useState(false);

  useEffect(() => {
    if (!/^\/blog\/[^/]+$/.test(pathname)) {
      setIsInvestmentPost(false);
      return;
    }

    const categoryLink = document.querySelector<HTMLAnchorElement>(
      'article header a[href^="/blog?category="]',
    );

    const href = categoryLink?.getAttribute("href")?.toLowerCase() || "";
    const label = categoryLink?.textContent?.trim() || "";

    const investment =
      href.includes("category=market") ||
      href.includes("category=investment-data") ||
      href.includes("investment") ||
      label.includes("투자") ||
      label.includes("시황") ||
      label.includes("시장");

    setIsInvestmentPost(investment);
  }, [pathname]);

  if (!isInvestmentPost) return null;

  return (
    <section className="bg-[#f6f7f9] px-4 pb-12 sm:px-6">
      <div className="mx-auto max-w-[812px] rounded-3xl border border-blue-100 bg-gradient-to-br from-blue-50 to-white p-5 text-slate-900 shadow-sm sm:p-7">
        <p className="text-xs font-black uppercase tracking-[0.14em] text-blue-600">
          HOHAENG TODAY
        </p>
        <h2 className="mt-2 text-xl font-black tracking-tight text-slate-950 sm:text-2xl">
          매일 이런 시장 데이터를 확인하고 싶다면
        </h2>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          호행처럼 투자 대시보드는 무료입니다. 홈 화면에 저장해두면 다음부터 TODAY와 투자 데이터를 앱처럼 바로 열 수 있어요.
        </p>
        <div className="mt-5 flex flex-col gap-2 sm:flex-row">
          <Link
            href="/app"
            onClick={() => track("investment_post_pwa_cta_click", { path: pathname })}
            className="inline-flex flex-1 items-center justify-center rounded-2xl bg-blue-600 px-5 py-3.5 text-sm font-black text-white transition hover:bg-blue-700"
          >
            📱 호행처럼 무료 설치
          </Link>
          <Link
            href="/today"
            onClick={() => track("investment_post_today_click", { path: pathname })}
            className="inline-flex flex-1 items-center justify-center rounded-2xl border border-slate-200 bg-white px-5 py-3.5 text-sm font-black text-slate-700 transition hover:border-blue-200 hover:text-blue-700"
          >
            📊 TODAY 먼저 보기
          </Link>
        </div>
      </div>
    </section>
  );
}
