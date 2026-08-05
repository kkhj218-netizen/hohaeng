import Link from 'next/link';

const TRADING_LOGS = [
  {
    number: '#001',
    date: '2026.08.05',
    title: '매달 100만 원 트레이딩 계좌를 시작합니다',
    description:
      '매월 일정한 금액을 입금하고, 매일의 판단과 손익을 숨김없이 기록하기로 했습니다.',
    href: '/blog/post-log-1785889120887',
    status: '첫 기록',
  },
];

const PRINCIPLES = [
  {
    icon: '🛡️',
    title: '수익보다 생존',
    description:
      '한 번의 큰 수익보다 계좌를 오래 유지할 수 있는 매매를 우선합니다.',
  },
  {
    icon: '📊',
    title: '숫자로 복기',
    description:
      '감정적인 평가 대신 진입 근거와 손익, 잘못된 판단을 숫자로 기록합니다.',
  },
  {
    icon: '📝',
    title: '손실도 공개',
    description:
      '잘된 결과만 골라 보여주지 않고, 손실과 실수도 같은 기준으로 남깁니다.',
  },
];

const ROADMAP = [
  {
    step: '01',
    title: '첫 계좌 기록',
    description: '운용 원칙과 매월 입금 규칙을 정합니다.',
    status: '완료',
    statusClass:
      'border-emerald-800/50 bg-emerald-950/60 text-emerald-300',
  },
  {
    step: '02',
    title: '매일 매매일지 작성',
    description: '진입 근거, 결과, 실수를 빠짐없이 기록합니다.',
    status: '진행 중',
    statusClass: 'border-blue-800/50 bg-blue-950/60 text-blue-300',
  },
  {
    step: '03',
    title: '월간 결산',
    description: '입금액과 손익, 승률, 가장 큰 실수를 정리합니다.',
    status: '준비 중',
    statusClass: 'border-slate-700 bg-slate-900 text-slate-400',
  },
  {
    step: '04',
    title: '전략 개선',
    description: '누적 기록을 바탕으로 유지할 원칙과 버릴 습관을 찾습니다.',
    status: '예정',
    statusClass: 'border-slate-700 bg-slate-900 text-slate-400',
  },
];

export default function TradingProjectPage() {
  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 antialiased">
      {/* 상단 */}
      <section className="relative overflow-hidden border-b border-slate-900">
        <div className="pointer-events-none absolute left-1/2 top-0 h-[420px] w-[700px] -translate-x-1/2 rounded-full bg-emerald-700/10 blur-3xl" />

        <div className="relative mx-auto max-w-5xl px-4 pb-14 pt-10 sm:px-8 sm:pb-20 sm:pt-16">
          <Link
            href="/"
            className="inline-flex items-center text-sm font-semibold text-slate-500 transition hover:text-slate-300"
          >
            ← 호행처럼 홈
          </Link>

          <div className="mt-8 inline-flex items-center gap-2 rounded-full border border-emerald-800/50 bg-emerald-950/60 px-3 py-1 text-xs font-bold text-emerald-300">
            <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
            공개 프로젝트 진행 중
          </div>

          <h1 className="mt-5 max-w-3xl text-3xl font-black leading-tight tracking-tight text-white sm:text-5xl">
            매달 100만 원,
            <br />
            <span className="bg-gradient-to-r from-emerald-400 via-teal-300 to-blue-400 bg-clip-text text-transparent">
              트레이딩 계좌 성장 기록
            </span>
          </h1>

          <p className="mt-5 max-w-2xl text-sm leading-7 text-slate-400 sm:text-base">
            매달 100만 원을 입금하고 직접 트레이딩하면서 계좌를
            불려가는 과정을 기록합니다. 수익만 보여주는 결과 보고서가 아니라
            진입 이유와 손실, 흔들렸던 판단까지 남기는 실제 운용 일지입니다.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <a
              href="#trading-logs"
              className="inline-flex items-center justify-center rounded-xl bg-emerald-600 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-emerald-950/40 transition hover:bg-emerald-500"
            >
              매매 기록 보기
              <span className="ml-2">↓</span>
            </a>

            <Link
              href="/blog/post-log-1785889120887"
              className="inline-flex items-center justify-center rounded-xl border border-slate-700 bg-slate-900/70 px-5 py-3 text-sm font-bold text-slate-200 transition hover:bg-slate-800"
            >
              프로젝트 시작 글
            </Link>
          </div>
        </div>
      </section>

      {/* 현재 진행 상황 */}
      <section className="border-b border-slate-900">
        <div className="mx-auto max-w-5xl px-4 py-12 sm:px-8 sm:py-16">
          <p className="text-xs font-bold tracking-[0.18em] text-emerald-400">
            CURRENT STATUS
          </p>

          <h2 className="mt-2 text-2xl font-black text-white sm:text-3xl">
            현재 프로젝트 현황
          </h2>

          <div className="mt-7 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
              <p className="text-xs text-slate-500">월 입금 규칙</p>
              <p className="mt-2 text-2xl font-black text-white">100만 원</p>
              <p className="mt-2 text-xs text-slate-500">
                매월 정해진 금액을 추가합니다.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
              <p className="text-xs text-slate-500">현재 기록</p>
              <p className="mt-2 text-2xl font-black text-white">
                {TRADING_LOGS.length}편
              </p>
              <p className="mt-2 text-xs text-slate-500">
                첫 운용 기록을 시작했습니다.
              </p>
            </div>

            <div className="rounded-2xl border border-emerald-900/60 bg-emerald-950/20 p-5">
              <p className="text-xs text-emerald-500">현재 단계</p>
              <p className="mt-2 text-2xl font-black text-emerald-300">
                매일 기록
              </p>
              <p className="mt-2 text-xs text-emerald-600">
                실제 매매와 복기를 쌓는 중입니다.
              </p>
            </div>
          </div>

          <div className="mt-4 rounded-2xl border border-amber-900/40 bg-amber-950/20 p-4">
            <p className="text-xs leading-6 text-amber-200/70">
              ※ 이 프로젝트는 투자 권유나 수익 보장을 위한 콘텐츠가 아닙니다.
              개인 계좌의 실제 운용 과정과 판단을 기록하는 프로젝트입니다.
            </p>
          </div>
        </div>
      </section>

      {/* 운용 원칙 */}
      <section className="border-b border-slate-900 bg-slate-950">
        <div className="mx-auto max-w-5xl px-4 py-12 sm:px-8 sm:py-16">
          <p className="text-xs font-bold tracking-[0.18em] text-blue-400">
            TRADING RULES
          </p>

          <h2 className="mt-2 text-2xl font-black text-white sm:text-3xl">
            계좌를 운용하는 세 가지 원칙
          </h2>

          <div className="mt-7 grid grid-cols-1 gap-4 sm:grid-cols-3">
            {PRINCIPLES.map((principle) => (
              <article
                key={principle.title}
                className="rounded-2xl border border-slate-800 bg-slate-900/50 p-5"
              >
                <span className="text-2xl">{principle.icon}</span>

                <h3 className="mt-4 text-base font-bold text-white">
                  {principle.title}
                </h3>

                <p className="mt-2 text-sm leading-6 text-slate-500">
                  {principle.description}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* 매매 기록 */}
      <section
        id="trading-logs"
        className="scroll-mt-20 border-b border-slate-900"
      >
        <div className="mx-auto max-w-5xl px-4 py-12 sm:px-8 sm:py-16">
          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
            <div>
              <p className="text-xs font-bold tracking-[0.18em] text-emerald-400">
                TRADING LOG
              </p>

              <h2 className="mt-2 text-2xl font-black text-white sm:text-3xl">
                매일 쌓아가는 트레이딩 기록
              </h2>
            </div>

            <p className="text-xs text-slate-600">
              최신 기록부터 순서대로 업데이트됩니다.
            </p>
          </div>

          <div className="mt-7 space-y-4">
            {TRADING_LOGS.map((log) => (
              <Link
                key={log.number}
                href={log.href}
                className="group block rounded-2xl border border-slate-800 bg-slate-900/50 p-5 transition duration-300 hover:-translate-y-0.5 hover:border-emerald-800/60 hover:bg-slate-900 sm:p-6"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-black text-emerald-400">
                      {log.number}
                    </span>

                    <span className="text-xs text-slate-600">{log.date}</span>
                  </div>

                  <span className="rounded-full border border-emerald-900/50 bg-emerald-950/40 px-2.5 py-1 text-[10px] font-bold text-emerald-400">
                    {log.status}
                  </span>
                </div>

                <div className="mt-4 flex items-start justify-between gap-5">
                  <div>
                    <h3 className="text-base font-bold leading-6 text-white transition group-hover:text-emerald-300 sm:text-lg">
                      {log.title}
                    </h3>

                    <p className="mt-2 text-sm leading-6 text-slate-500">
                      {log.description}
                    </p>
                  </div>

                  <span className="shrink-0 text-slate-600 transition-transform group-hover:translate-x-1 group-hover:text-emerald-400">
                    →
                  </span>
                </div>
              </Link>
            ))}
          </div>

          <div className="mt-5 rounded-2xl border border-dashed border-slate-800 bg-slate-900/20 p-5 text-center">
            <p className="text-sm font-bold text-slate-400">
              다음 매매 기록을 준비하고 있습니다
            </p>
            <p className="mt-1 text-xs text-slate-600">
              매매일지가 발행될 때마다 이곳에 순서대로 추가됩니다.
            </p>
          </div>
        </div>
      </section>

      {/* 로드맵 */}
      <section className="border-b border-slate-900 bg-slate-950">
        <div className="mx-auto max-w-5xl px-4 py-12 sm:px-8 sm:py-16">
          <p className="text-xs font-bold tracking-[0.18em] text-indigo-400">
            PROJECT ROADMAP
          </p>

          <h2 className="mt-2 text-2xl font-black text-white sm:text-3xl">
            이 프로젝트가 진행되는 순서
          </h2>

          <div className="mt-7 space-y-3">
            {ROADMAP.map((item) => (
              <div
                key={item.step}
                className="flex gap-4 rounded-2xl border border-slate-800 bg-slate-900/40 p-5"
              >
                <span className="text-lg font-black text-slate-700">
                  {item.step}
                </span>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 className="text-sm font-bold text-white sm:text-base">
                      {item.title}
                    </h3>

                    <span
                      className={`rounded-full border px-2.5 py-1 text-[10px] font-bold ${item.statusClass}`}
                    >
                      {item.status}
                    </span>
                  </div>

                  <p className="mt-2 text-xs leading-5 text-slate-500 sm:text-sm">
                    {item.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 하단 이동 */}
      <section className="bg-gradient-to-b from-slate-950 to-emerald-950/20">
        <div className="mx-auto max-w-5xl px-4 py-12 sm:px-8 sm:py-16">
          <div className="rounded-3xl border border-emerald-900/50 bg-emerald-950/20 p-7 text-center sm:p-10">
            <p className="text-xs font-bold tracking-[0.18em] text-emerald-400">
              FOLLOW THE PROCESS
            </p>

            <h2 className="mt-3 text-2xl font-black text-white">
              결과가 아니라 변화 과정을 기록합니다
            </h2>

            <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-slate-400">
              이 계좌가 앞으로 어떻게 변하는지, 어떤 판단이 수익과 손실을
              만들었는지 계속 공개하겠습니다.
            </p>

            <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
              <Link
                href="/blog/post-log-1785889120887"
                className="inline-flex items-center justify-center rounded-xl bg-emerald-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-emerald-500"
              >
                첫 번째 기록 읽기
              </Link>

              <Link
                href="/"
                className="inline-flex items-center justify-center rounded-xl border border-slate-700 bg-slate-900/70 px-5 py-3 text-sm font-bold text-slate-300 transition hover:bg-slate-800 hover:text-white"
              >
                호행처럼 홈으로
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}