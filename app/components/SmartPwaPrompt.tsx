"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

type NavigatorWithStandalone = Navigator & {
  standalone?: boolean;
};

type GtagWindow = Window & {
  gtag?: (...args: unknown[]) => void;
};

const DISMISS_KEY = "hohaeng_pwa_prompt_dismissed_until";
const VISIT_KEY = "hohaeng_visit_count";
const READ_KEY = "hohaeng_blog_read_count";
const DASHBOARD_KEY = "hohaeng_dashboard_view_count";
const SESSION_KEY = "hohaeng_session_seen";
const DISMISS_MS = 7 * 24 * 60 * 60 * 1000;

function isStandaloneMode() {
  const iosStandalone = Boolean((navigator as NavigatorWithStandalone).standalone);
  const displayStandalone = window.matchMedia("(display-mode: standalone)").matches;
  return iosStandalone || displayStandalone;
}

function track(eventName: string, params: Record<string, string | boolean | number>) {
  (window as GtagWindow).gtag?.("event", eventName, params);
}

function readNumber(key: string) {
  const parsed = Number(window.localStorage.getItem(key) || "0");
  return Number.isFinite(parsed) ? parsed : 0;
}

export default function SmartPwaPrompt() {
  const pathname = usePathname();
  const [visible, setVisible] = useState(false);

  const isExcludedPath = useMemo(
    () => pathname.startsWith("/admin") || pathname === "/app",
    [pathname],
  );

  useEffect(() => {
    if (isExcludedPath || isStandaloneMode()) return;

    const dismissedUntil = Number(window.localStorage.getItem(DISMISS_KEY) || "0");
    if (dismissedUntil > Date.now()) return;

    if (!window.sessionStorage.getItem(SESSION_KEY)) {
      window.sessionStorage.setItem(SESSION_KEY, "1");
      const visits = readNumber(VISIT_KEY) + 1;
      window.localStorage.setItem(VISIT_KEY, String(visits));
    }

    if (/^\/blog\/[^/]+$/.test(pathname)) {
      const reads = readNumber(READ_KEY) + 1;
      window.localStorage.setItem(READ_KEY, String(reads));
    }

    if (
      pathname === "/today" ||
      pathname === "/data" ||
      pathname.startsWith("/data/")
    ) {
      const dashboardViews = readNumber(DASHBOARD_KEY) + 1;
      window.localStorage.setItem(DASHBOARD_KEY, String(dashboardViews));
    }

    const qualifiesNow = () =>
      readNumber(VISIT_KEY) >= 2 ||
      readNumber(READ_KEY) >= 2 ||
      readNumber(DASHBOARD_KEY) >= 2;

    if (qualifiesNow()) {
      setVisible(true);
      track("pwa_prompt_view", { trigger: "return_or_engagement", path: pathname });
      return;
    }

    const handleMarketMapClick = (event: MouseEvent) => {
      const target = event.target as Element | null;
      const link = target?.closest<HTMLAnchorElement>("a[href]");
      const href = link?.getAttribute("href") || "";

      if (!href.includes("market-map")) return;
      if (isStandaloneMode()) return;

      const nextDismissedUntil = Number(window.localStorage.getItem(DISMISS_KEY) || "0");
      if (nextDismissedUntil > Date.now()) return;

      setVisible(true);
      track("pwa_prompt_view", { trigger: "market_map_click", path: pathname });
    };

    document.addEventListener("click", handleMarketMapClick);

    const timer = window.setTimeout(() => {
      if (isStandaloneMode()) return;
      const nextDismissedUntil = Number(window.localStorage.getItem(DISMISS_KEY) || "0");
      if (nextDismissedUntil > Date.now()) return;
      setVisible(true);
      track("pwa_prompt_view", { trigger: "30_seconds", path: pathname });
    }, 30_000);

    return () => {
      document.removeEventListener("click", handleMarketMapClick);
      window.clearTimeout(timer);
    };
  }, [isExcludedPath, pathname]);

  if (!visible || isExcludedPath) return null;

  return (
    <aside className="fixed inset-x-3 bottom-4 z-[110] mx-auto max-w-md rounded-2xl border border-slate-200 bg-white p-4 text-slate-900 shadow-2xl sm:bottom-6">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-xl" aria-hidden="true">
          📱
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-black text-slate-950">호행처럼 자주 보시나요?</p>
          <p className="mt-1 text-xs leading-5 text-slate-500">
            홈 화면에 저장하면 다음부터 TODAY와 투자 데이터를 바로 열 수 있어요.
          </p>
          <div className="mt-3 flex items-center gap-2">
            <Link
              href="/app"
              onClick={() => track("pwa_prompt_click", { path: pathname })}
              className="flex-1 rounded-xl bg-blue-600 px-4 py-2.5 text-center text-sm font-black text-white transition hover:bg-blue-700"
            >
              무료 설치
            </Link>
            <button
              type="button"
              onClick={() => {
                window.localStorage.setItem(DISMISS_KEY, String(Date.now() + DISMISS_MS));
                setVisible(false);
                track("pwa_prompt_dismiss", { path: pathname });
              }}
              className="rounded-xl px-3 py-2.5 text-sm font-bold text-slate-500 hover:bg-slate-100"
            >
              나중에
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
}
