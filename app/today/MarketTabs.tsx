"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/today", label: "미국", flag: "🇺🇸" },
  { href: "/today/korea", label: "한국", flag: "🇰🇷" },
];

export default function MarketTabs() {
  const pathname = usePathname();

  return (
    <div className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-5xl gap-2 px-4 py-3 sm:px-6">
        {TABS.map((tab) => {
          const active =
            tab.href === "/today"
              ? pathname === "/today"
              : pathname.startsWith(tab.href);

          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-black transition ${
                active
                  ? "bg-slate-950 text-white shadow-sm"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              <span aria-hidden="true">{tab.flag}</span>
              {tab.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
