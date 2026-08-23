function Block({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-xl bg-slate-200 ${className}`} />;
}

export default function TodayLoading() {
  return (
    <main className="min-h-screen bg-[#f6f7f9] pb-24 text-slate-900 md:pb-12">
      <section className="border-b border-slate-200 bg-gradient-to-b from-slate-950 to-slate-900 text-white">
        <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-10">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-blue-300">
            HOHAENG TODAY
          </p>
          <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">
            오늘의 투자 대시보드
          </h1>
          <p className="mt-2 text-sm text-slate-400">시장 데이터를 준비하고 있습니다.</p>
        </div>
      </section>

      <div className="mx-auto max-w-5xl space-y-6 px-4 py-6 sm:px-6 sm:py-8">
        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-blue-600">
                01 · MARKET CLOSE
              </p>
              <h2 className="mt-1 text-xl font-black">최근 미국시장 마감</h2>
            </div>
            <Block className="h-5 w-20" />
          </div>

          <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="rounded-2xl border border-slate-200 p-4">
                <Block className="h-3 w-20" />
                <Block className="mt-3 h-4 w-24" />
                <Block className="mt-5 h-7 w-28" />
                <Block className="mt-2 h-3 w-24" />
              </div>
            ))}
          </div>

          <div className="mt-5 rounded-2xl border border-slate-200 p-4">
            <Block className="h-4 w-40" />
            <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
              {Array.from({ length: 4 }).map((_, index) => (
                <Block key={index} className="h-16" />
              ))}
            </div>
          </div>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <Block className="h-4 w-44" />
          <Block className="mt-3 h-7 w-60" />
          <div className="mt-5 grid gap-3 md:grid-cols-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <Block key={index} className="h-36" />
            ))}
          </div>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <Block className="h-4 w-32" />
          <Block className="mt-3 h-7 w-48" />
          <div className="mt-5 space-y-3">
            {Array.from({ length: 4 }).map((_, index) => (
              <Block key={index} className="h-16" />
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
