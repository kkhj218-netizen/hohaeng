import Link from "next/link";

export default function CpiEventLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-[#f6f7f9]">
      <div className="border-b border-slate-200 bg-white px-4 py-3 sm:px-6">
        <nav className="mx-auto flex max-w-6xl gap-2 overflow-x-auto text-xs font-black">
          <Link href="/data/events/cpi" className="whitespace-nowrap rounded-full bg-slate-950 px-3.5 py-2 text-white">
            최신 CPI · 시장반응
          </Link>
          <Link href="/data/events/cpi/similar" className="whitespace-nowrap rounded-full border border-violet-200 bg-violet-50 px-3.5 py-2 text-violet-700">
            비슷했던 과거 찾기
          </Link>
          <Link href="/data/events/cpi/regime" className="whitespace-nowrap rounded-full border border-fuchsia-200 bg-fuchsia-50 px-3.5 py-2 text-fuchsia-700">
            CPI + 시장환경
          </Link>
          <Link href="/data/events/cpi/pattern" className="whitespace-nowrap rounded-full border border-orange-200 bg-orange-50 px-3.5 py-2 text-orange-700">
            시장 반응 유형
          </Link>
          <Link href="/data/events/cpi/history" className="whitespace-nowrap rounded-full border border-blue-200 bg-blue-50 px-3.5 py-2 text-blue-700">
            2016~ 10년 아카이브
          </Link>
          <Link href="/data" className="whitespace-nowrap rounded-full border border-slate-200 px-3.5 py-2 text-slate-600">
            투자 데이터 홈
          </Link>
        </nav>
      </div>
      {children}
    </div>
  );
}
