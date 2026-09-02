import Link from "next/link";

const LINKS = [
  { href: "/data/market-map", label: "🗺️ 시장지도" },
  { href: "/data/calendar", label: "📅 경제일정" },
  { href: "/data/earnings-risk", label: "⚠️ 실적 레이더" },
  { href: "/data/events", label: "🧭 EVENT DB" },
];

export default function MarketQuickNav() {
  return (
    <div className="border-b border-slate-800 bg-slate-950 text-slate-200">
      <nav
        aria-label="시장 빠른 메뉴"
        className="mx-auto flex max-w-5xl items-center gap-1 overflow-x-auto px-4 py-2 text-xs font-bold sm:gap-2"
      >
        <span className="mr-1 shrink-0 text-[10px] font-black uppercase tracking-[0.16em] text-blue-400">
          MARKET TOOLS
        </span>
        {LINKS.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="shrink-0 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 transition hover:border-blue-400/40 hover:bg-blue-500/10 hover:text-blue-200"
          >
            {item.label}
          </Link>
        ))}
      </nav>
    </div>
  );
}
