import Link from 'next/link';

export default function FooterProfile() {
  return (
    <section className="mt-16 bg-gradient-to-br from-slate-900 to-slate-800 text-white rounded-2xl p-6 sm:p-8 shadow-xl">
      <div className="max-w-3xl mx-auto">
        {/* 프로필 헤더 */}
        <div className="flex items-center gap-4 mb-6">
          <div className="w-14 h-14 rounded-full bg-blue-500 flex items-center justify-center text-2xl font-bold">
            🙋‍♂️
          </div>
          <div>
            <h3 className="text-xl font-bold">제작자 호행을 소개합니다</h3>
            <p className="text-sm text-slate-300">
              돈과 시간을 아껴 더 나은 삶을 만들어가는 과정을 기록합니다.
            </p>
          </div>
        </div>

        <div className="border-t border-slate-700 pt-6">
          <h4 className="text-sm font-semibold text-blue-400 mb-3 flex items-center gap-2">
            📌 최근 작성된 호행의 일지
          </h4>

          {/* 최근 작성 글 목록 */}
          <div className="grid gap-3">
            <Link
              href="/blog/isa-2026-03"
              className="block p-3 rounded-lg bg-slate-800/80 hover:bg-slate-700/80 transition-all border border-slate-700/50"
            >
              <p className="text-sm font-medium text-slate-100">
                [배당일지] 2026년 3월 ISA 배당금 입금 및 재투자 기록
              </p>
              <span className="text-xs text-slate-400">2026.03.31</span>
            </Link>

            <Link
              href="/blog/invest-2026-02"
              className="block p-3 rounded-lg bg-slate-800/80 hover:bg-slate-700/80 transition-all border border-slate-700/50"
            >
              <p className="text-sm font-medium text-slate-100">
                [투자일지] 직장인 포트폴리오 결산 (미국 ETF 비중 확장)
              </p>
              <span className="text-xs text-slate-400">2026.02.28</span>
            </Link>
          </div>

          {/* 일지 더보기 버튼 */}
          <div className="mt-5 text-right">
            <Link
              href="/blog?cat=log"
              className="inline-flex items-center text-sm font-semibold text-blue-400 hover:text-blue-300 transition-colors"
            >
              호행의 일지 전체보기 →
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}