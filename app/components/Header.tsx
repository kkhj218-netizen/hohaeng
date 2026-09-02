import Link from "next/link";

import PwaInstallButton from "@/app/components/PwaInstallButton";

const MAIN_NAV = [
  { href: "/today", label: "TODAY", emphasis: true },
  { href: "/data", label: "투자 데이터" },
  { href: "/blog", label: "투자 공부" },
  { href: "/money", label: "계산기" },
  { href: "/blog?category=log", label: "호행 기록" },
];

export default function Header() {
  return (
    <header className="sticky top-0 z-[100] border-b border-slate-200 bg-white/95 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-5xl items-center gap-2 px-4">
        <Link
          href="/"
          className="shrink-0 whitespace-nowrap text-xl font-black tracking-tight text-blue-600"
          aria-label="호행처럼 홈"
        >
          HOHAENG OS
        </Link>

        <nav
          aria-label="주요 메뉴"
          className="ml-2 flex min-w-0 flex-1 items-center gap-1 overflow-x-auto py-2 text-sm font-semibold text-slate-700 sm:gap-2"
        >
          {MAIN_NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`shrink-0 whitespace-nowrap rounded-full px-3 py-1.5 transition ${
                item.emphasis
                  ? "bg-blue-600 font-black text-white hover:bg-blue-500"
                  : "hover:bg-slate-100 hover:text-blue-600"
              }`}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <Link
          href="/saved"
          className="shrink-0 whitespace-nowrap rounded-full border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700 transition hover:bg-rose-100"
          aria-label="내 관심 글 열기"
        >
          <span aria-hidden="true">♥</span>{" "}
          <span className="hidden lg:inline">관심 글</span>
        </Link>

        <div className="shrink-0">
          <PwaInstallButton />
        </div>
      </div>
    </header>
  );
}
