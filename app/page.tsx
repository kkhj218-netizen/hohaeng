import Link from 'next/link';

export default function Home() {
  return (
    <main className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md mx-auto text-center">
        {/* 호행처럼 로고 및 타이틀 */}
        <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight mb-2">
          호행처럼
        </h1>
        <p className="text-slate-600 mb-8 font-medium">
          매일 쓰는 유용한 3초 간편 도구 & 계산기
        </p>

        {/* 카테고리 / 도구 리스트 섹션 */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 text-left">
          <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
            💰 Money OS (금융/세금)
          </h2>

          <div className="space-y-3">
            {/* 1호 도구 */}
            <Link 
              href="/money/isa-calc" 
              className="block p-4 rounded-xl bg-slate-50 hover:bg-blue-50 border border-slate-200/60 hover:border-blue-300 transition-all"
            >
              <div className="font-bold text-slate-900">ISA 절세 효과 계산기</div>
              <div className="text-xs text-slate-500 mt-1">
                투자금과 수익률만 넣으면 일반계좌 대비 절세 금액을 즉시 계산합니다.
              </div>
            </Link>

            {/* 2호 도구 */}
            <Link 
              href="/money/severance-calc" 
              className="block p-4 rounded-xl bg-slate-50 hover:bg-emerald-50 border border-slate-200/60 hover:border-emerald-300 transition-all"
            >
              <div className="font-bold text-slate-900">퇴직금 간편 계산기</div>
              <div className="text-xs text-slate-500 mt-1">
                평균 월급과 근속 기간으로 내 예상 퇴직금을 3초 만에 확인하세요.
              </div>
            </Link>
          </div>
        </div>

        {/* 푸터 */}
        <p className="text-xs text-slate-400 mt-12">
          © 호행처럼. All rights reserved.
        </p>
      </div>
    </main>
  );
}