import Link from "next/link";

export default function EconomicEventsAdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-slate-950 text-slate-100">
      <div className="border-b border-slate-800 bg-slate-950 px-4 py-3 sm:px-6">
        <nav className="mx-auto flex max-w-6xl flex-wrap gap-2 text-xs font-black">
          <Link href="/admin/economic-events" className="rounded-full border border-slate-700 px-3 py-2 hover:border-orange-400">
            CPI 관리
          </Link>
          <Link href="/admin/economic-events/backfill" className="rounded-full border border-slate-700 px-3 py-2 text-orange-300 hover:border-orange-400">
            10년 백필
          </Link>
          <Link href="/data/events/cpi/history" className="rounded-full border border-slate-700 px-3 py-2 text-blue-300 hover:border-blue-400">
            공개 아카이브
          </Link>
        </nav>
      </div>
      {children}
    </div>
  );
}
