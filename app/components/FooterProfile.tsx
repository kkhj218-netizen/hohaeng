import Link from 'next/link';

const RECENT_LOGS = [
  {
    category: '트레이딩 기록 #001',
    title: '매달 100만 원 트레이딩 계좌를 시작합니다',
    description:
      '수익만 자랑하는 기록이 아니라, 매일의 판단과 손실까지 공개합니다.',
    href: '/blog/post-log-1785889120887',
    color: 'text-emerald-400',
  },
  {
    category: '사이트 제작기 #001',
    title: '직접 웹페이지를 제작해 보다',
    description:
      '아무것도 없던 상태에서 호행처럼을 직접 만들기 시작한 과정입니다.',
    href: '/blog/post-log-1785418870111',
    color: 'text-blue-400',
  },
];

export default function FooterProfile() {
  return (
    <section className="overflow-hidden rounded-3xl border border-slate-800 bg-gradient-to-br from-slate-900 via-slate-900 to-blue-950/40 text-white shadow-xl">
      <div className="p-6 sm:p-8">
        {/* 제작자 소개 */}
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border border-blue-400/20 bg-blue-500/15 text-3xl shadow-inner">
            🙋‍♂️
          </div>

          <div className="min-w-0">
            <p className="text-xs font-bold tracking-[0.16em] text-blue-400">
              ABOUT HOHAENG
            </p>

            <h2 className="mt-2 text-xl font-black text-white sm:text-2xl">
              기록하는 치료사, 호행입니다
            </h2>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
              사람의 몸과 회복을 가까이에서 지켜본 치료사로서, 이제는 돈과
              삶을 다시 세워가는 제 과정도 솔직하게 기록하고 있습니다.
              완벽한 답보다 직접 공부하고 계산하고 실행한 결과를 나눕니다.
            </p>
          </div>
        </div>

        {/* 호행처럼의 운영 원칙 */}
        <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-4">
            <span className="text-lg">🧮</span>
            <p className="mt-2 text-sm font-bold text-slate-200">
              직접 계산합니다
            </p>
            <p className="mt-1 text-xs leading-5 text-slate-500">
              필요한 숫자와 기준을 확인합니다.
            </p>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-4">
            <span className="text-lg">📝</span>
            <p className="mt-2 text-sm font-bold text-slate-200">
              과정을 공개합니다
            </p>
            <p className="mt-1 text-xs leading-5 text-slate-500">
              성공뿐 아니라 실수도 기록합니다.
            </p>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-4">
            <span className="text-lg">🌱</span>
            <p className="mt-2 text-sm font-bold text-slate-200">
              조금씩 개선합니다
            </p>
            <p className="mt-1 text-xs leading-5 text-slate-500">
              어제보다 나은 방향을 찾아갑니다.
            </p>
          </div>
        </div>
      </div>

      {/* 이번 주 호행 기록 */}
      <div className="border-t border-slate-800 bg-slate-950/30 p-6 sm:p-8">
        <div className="mb-4 flex items-end justify-between gap-4">
          <div>
            <p className="text-xs font-bold tracking-[0.16em] text-blue-400">
              THIS WEEK
            </p>

            <h3 className="mt-1 text-lg font-black text-white">
              최근 기록한 호행의 과정
            </h3>
          </div>

          <Link
            href="/blog?cat=log"
            className="hidden shrink-0 text-xs font-bold text-slate-400 transition hover:text-blue-300 sm:inline-flex"
          >
            전체 기록 보기 →
          </Link>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {RECENT_LOGS.map((log) => (
            <Link
              key={log.href}
              href={log.href}
              className="group rounded-2xl border border-slate-800 bg-slate-900/70 p-4 transition duration-300 hover:-translate-y-0.5 hover:border-slate-700 hover:bg-slate-900"
            >
              <span className={`text-[11px] font-bold ${log.color}`}>
                {log.category}
              </span>

              <div className="mt-2 flex items-start justify-between gap-3">
                <h4 className="text-sm font-bold leading-6 text-slate-100 transition group-hover:text-white">
                  {log.title}
                </h4>

                <span className="shrink-0 text-slate-600 transition group-hover:translate-x-1 group-hover:text-blue-400">
                  →
                </span>
              </div>

              <p className="mt-2 text-xs leading-5 text-slate-500">
                {log.description}
              </p>
            </Link>
          ))}
        </div>

        <Link
          href="/blog?cat=log"
          className="mt-5 inline-flex text-sm font-bold text-blue-400 transition hover:text-blue-300 sm:hidden"
        >
          호행의 기록 전체보기 →
        </Link>
      </div>
    </section>
  );
}