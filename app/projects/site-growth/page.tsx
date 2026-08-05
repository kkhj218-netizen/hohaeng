import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: '검색 유입 0명부터 시작하는 웹사이트 성장 기록 | 호행처럼',
  description:
    '호행처럼을 직접 만들고 검색 유입 0명부터 콘텐츠, 계산기, SEO 데이터를 쌓아가는 전 과정을 공개합니다.',
  alternates: {
    canonical: 'https://hohaeng.vercel.app/projects/site-growth',
  },
  openGraph: {
    title: '검색 유입 0명부터 시작하는 웹사이트 성장 기록',
    description:
      '사이트 제작부터 검색엔진 등록, 콘텐츠 발행과 방문자 증가까지 실제 성장 과정을 공개합니다.',
    url: 'https://hohaeng.vercel.app/projects/site-growth',
    siteName: '호행처럼',
    type: 'website',
  },
};

const SITE_LOGS = [
  {
    number: '#001',
    date: '2026.07.28',
    category: '사이트 제작기',
    title: '직접 웹페이지를 제작해 보다',
    description:
      '아무것도 없던 상태에서 호행처럼을 직접 만들기 시작한 첫 번째 기록입니다.',
    href: '/blog/post-log-1785418870111',
    status: '발행 완료',
  },
];

const COMPLETED_TASKS = [
  {
    icon: '🏠',
    title: '호행처럼 웹사이트 구축',
    description:
      '글, 계산기, 프로젝트 기록을 한곳에 모을 수 있는 기본 구조를 만들었습니다.',
  },
  {
    icon: '✍️',
    title: '글 작성·수정 시스템',
    description:
      '관리자 화면에서 콘텐츠를 작성하고 수정·삭제할 수 있도록 연결했습니다.',
  },
  {
    icon: '🔎',
    title: '검색엔진 등록',
    description:
      'Google Search Console에 사이트를 등록하고 사이트맵을 제출했습니다.',
  },
  {
    icon: '📊',
    title: '방문 데이터 측정',
    description:
      'GA4를 연결해 방문자와 페이지 조회 데이터를 확인할 수 있게 했습니다.',
  },
  {
    icon: '🧮',
    title: '실용 계산기 제작',
    description:
      '검색 방문자가 직접 사용할 수 있는 연봉 실수령액 계산기를 만들었습니다.',
  },
  {
    icon: '📡',
    title: 'RSS 피드 연결',
    description:
      '새로운 글이 발행될 때 업데이트를 확인할 수 있는 RSS 주소를 만들었습니다.',
  },
];

const ROADMAP = [
  {
    step: '01',
    title: '사이트 기반 만들기',
    description:
      '도메인 없이 시작해 글 발행, 관리자 화면, 검색 기능의 기본 구조를 구축합니다.',
    status: '완료',
    statusClass:
      'border-emerald-800/50 bg-emerald-950/60 text-emerald-300',
  },
  {
    step: '02',
    title: '검색 데이터 연결',
    description:
      'Search Console과 GA4를 연결해 노출, 클릭, 방문 데이터를 수집합니다.',
    status: '완료',
    statusClass:
      'border-emerald-800/50 bg-emerald-950/60 text-emerald-300',
  },
  {
    step: '03',
    title: '검색형 콘텐츠 발행',
    description:
      '연봉, 세후 월급, 4대보험처럼 실제 검색 수요가 있는 글을 쌓습니다.',
    status: '진행 중',
    statusClass: 'border-blue-800/50 bg-blue-950/60 text-blue-300',
  },
  {
    step: '04',
    title: '계산기와 콘텐츠 연결',
    description:
      '검색 글에서 계산기로, 계산기에서 관련 글로 이동하는 내부 링크를 강화합니다.',
    status: '진행 중',
    statusClass: 'border-blue-800/50 bg-blue-950/60 text-blue-300',
  },
  {
    step: '05',
    title: '첫 검색 유입 분석',
    description:
      '어떤 키워드에서 노출과 클릭이 발생했는지 확인하고 콘텐츠를 수정합니다.',
    status: '데이터 수집 중',
    statusClass: 'border-amber-800/50 bg-amber-950/50 text-amber-300',
  },
  {
    step: '06',
    title: '월간 성장 보고서',
    description:
      '방문자, 검색 클릭, 인기 글, 개선 결과를 매월 같은 기준으로 공개합니다.',
    status: '예정',
    statusClass: 'border-slate-700 bg-slate-900 text-slate-400',
  },
];

const MEASUREMENT_ITEMS = [
  {
    label: '검색 노출',
    description: '검색결과에 호행처럼 페이지가 표시된 횟수',
  },
  {
    label: '검색 클릭',
    description: '검색결과를 통해 실제 사이트에 들어온 횟수',
  },
  {
    label: '방문 페이지',
    description: '검색 방문자가 가장 많이 읽은 콘텐츠와 계산기',
  },
  {
    label: '키워드 순위',
    description: '각 글이 어떤 검색어에서 몇 위에 노출되는지 확인',
  },
];

export default function SiteGrowthProjectPage() {
  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 antialiased">
      {/* 프로젝트 소개 */}
      <section className="relative overflow-hidden border-b border-slate-900">
        <div className="pointer-events-none absolute left-1/2 top-0 h-[420px] w-[700px] -translate-x-1/2 rounded-full bg-blue-700/10 blur-3xl" />

        <div className="relative mx-auto max-w-5xl px-4 pb-14 pt-10 sm:px-8 sm:pb-20 sm:pt-16">
          <Link
            href="/"
            className="inline-flex items-center text-sm font-semibold text-slate-500 transition hover:text-slate-300"
          >
            ← 호행처럼 홈
          </Link>

          <div className="mt-8 inline-flex items-center gap-2 rounded-full border border-blue-800/50 bg-blue-950/60 px-3 py-1 text-xs font-bold text-blue-300">
            <span className="h-2 w-2 animate-pulse rounded-full bg-blue-400" />
            공개 프로젝트 진행 중
          </div>

          <h1 className="mt-5 max-w-3xl text-3xl font-black leading-tight tracking-tight text-white sm:text-5xl">
            검색 유입 0명부터,
            <br />
            <span className="bg-gradient-to-r from-blue-400 via-cyan-300 to-indigo-400 bg-clip-text text-transparent">
              웹사이트 성장 전 과정
            </span>
          </h1>

          <p className="mt-5 max-w-2xl text-sm leading-7 text-slate-400 sm:text-base">
            개발 경험이 많지 않은 상태에서 호행처럼을 직접 만들고 있습니다.
            사이트 제작부터 검색엔진 등록, 콘텐츠 발행, 방문자 증가까지 실제
            데이터와 시행착오를 숨김없이 기록합니다.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <a
              href="#growth-roadmap"
              className="inline-flex items-center justify-center rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-blue-950/40 transition hover:bg-blue-500"
            >
              성장 과정 보기
              <span className="ml-2">↓</span>
            </a>

            <Link
              href="/blog/post-log-1785418870111"
              className="inline-flex items-center justify-center rounded-xl border border-slate-700 bg-slate-900/70 px-5 py-3 text-sm font-bold text-slate-200 transition hover:bg-slate-800"
            >
              사이트 제작 첫 기록
            </Link>
          </div>
        </div>
      </section>

      {/* 현재 현황 */}
      <section className="border-b border-slate-900">
        <div className="mx-auto max-w-5xl px-4 py-12 sm:px-8 sm:py-16">
          <p className="text-xs font-bold tracking-[0.18em] text-blue-400">
            CURRENT STATUS
          </p>

          <h2 className="mt-2 text-2xl font-black text-white sm:text-3xl">
            지금까지 어디까지 왔을까?
          </h2>

          <div className="mt-7 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
              <p className="text-xs text-slate-500">성장 기준선</p>
              <p className="mt-2 text-2xl font-black text-white">
                검색 유입 0명
              </p>
              <p className="mt-2 text-xs leading-5 text-slate-500">
                아무도 모르는 사이트에서 시작했습니다.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
              <p className="text-xs text-slate-500">데이터 도구</p>
              <p className="mt-2 text-2xl font-black text-white">GSC · GA4</p>
              <p className="mt-2 text-xs leading-5 text-slate-500">
                검색 노출과 방문 데이터를 수집합니다.
              </p>
            </div>

            <div className="rounded-2xl border border-blue-900/60 bg-blue-950/20 p-5">
              <p className="text-xs text-blue-500">현재 단계</p>
              <p className="mt-2 text-2xl font-black text-blue-300">
                콘텐츠 확장
              </p>
              <p className="mt-2 text-xs leading-5 text-blue-600">
                검색형 글과 계산기를 연결하고 있습니다.
              </p>
            </div>
          </div>

          <div className="mt-4 rounded-2xl border border-slate-800 bg-slate-900/30 p-4">
            <p className="text-xs leading-6 text-slate-500">
              숫자를 과장하지 않기 위해 실제 측정이 시작된 데이터만 공개합니다.
              검색 유입과 방문자 수는 충분한 데이터가 쌓인 뒤 월간 보고서에서
              같은 기준으로 비교할 예정입니다.
            </p>
          </div>
        </div>
      </section>

      {/* 완료한 작업 */}
      <section className="border-b border-slate-900 bg-slate-950">
        <div className="mx-auto max-w-5xl px-4 py-12 sm:px-8 sm:py-16">
          <p className="text-xs font-bold tracking-[0.18em] text-emerald-400">
            COMPLETED
          </p>

          <h2 className="mt-2 text-2xl font-black text-white sm:text-3xl">
            지금까지 직접 만든 것들
          </h2>

          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-500">
            눈에 보이는 화면뿐 아니라 글 발행과 검색 데이터 수집에 필요한
            기반도 하나씩 연결했습니다.
          </p>

          <div className="mt-7 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {COMPLETED_TASKS.map((task) => (
              <article
                key={task.title}
                className="rounded-2xl border border-slate-800 bg-slate-900/50 p-5"
              >
                <span className="text-2xl">{task.icon}</span>

                <h3 className="mt-4 text-base font-bold text-white">
                  {task.title}
                </h3>

                <p className="mt-2 text-sm leading-6 text-slate-500">
                  {task.description}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* 측정 기준 */}
      <section className="border-b border-slate-900">
        <div className="mx-auto max-w-5xl px-4 py-12 sm:px-8 sm:py-16">
          <p className="text-xs font-bold tracking-[0.18em] text-cyan-400">
            MEASUREMENT
          </p>

          <h2 className="mt-2 text-2xl font-black text-white sm:text-3xl">
            무엇을 기준으로 성장을 판단할까?
          </h2>

          <div className="mt-7 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {MEASUREMENT_ITEMS.map((item, index) => (
              <div
                key={item.label}
                className="flex gap-4 rounded-2xl border border-slate-800 bg-slate-900/40 p-5"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-950 text-sm font-black text-blue-400">
                  {String(index + 1).padStart(2, '0')}
                </span>

                <div>
                  <h3 className="text-sm font-bold text-white">
                    {item.label}
                  </h3>

                  <p className="mt-1 text-xs leading-5 text-slate-500 sm:text-sm">
                    {item.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 성장 로드맵 */}
      <section
        id="growth-roadmap"
        className="scroll-mt-20 border-b border-slate-900 bg-slate-950"
      >
        <div className="mx-auto max-w-5xl px-4 py-12 sm:px-8 sm:py-16">
          <p className="text-xs font-bold tracking-[0.18em] text-indigo-400">
            GROWTH ROADMAP
          </p>

          <h2 className="mt-2 text-2xl font-black text-white sm:text-3xl">
            검색 유입을 만드는 진행 순서
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

      {/* 제작 기록 */}
      <section className="border-b border-slate-900">
        <div className="mx-auto max-w-5xl px-4 py-12 sm:px-8 sm:py-16">
          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
            <div>
              <p className="text-xs font-bold tracking-[0.18em] text-blue-400">
                BUILD LOG
              </p>

              <h2 className="mt-2 text-2xl font-black text-white sm:text-3xl">
                호행처럼 제작·성장 기록
              </h2>
            </div>

            <p className="text-xs text-slate-600">
              새로운 성장 기록이 순서대로 추가됩니다.
            </p>
          </div>

          <div className="mt-7 space-y-4">
            {SITE_LOGS.map((log) => (
              <Link
                key={log.number}
                href={log.href}
                className="group block rounded-2xl border border-slate-800 bg-slate-900/50 p-5 transition duration-300 hover:-translate-y-0.5 hover:border-blue-800/60 hover:bg-slate-900 sm:p-6"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-black text-blue-400">
                      {log.number}
                    </span>

                    <span className="text-xs text-slate-600">
                      {log.date}
                    </span>
                  </div>

                  <span className="rounded-full border border-blue-900/50 bg-blue-950/40 px-2.5 py-1 text-[10px] font-bold text-blue-400">
                    {log.status}
                  </span>
                </div>

                <p className="mt-4 text-[11px] font-bold text-blue-400">
                  {log.category}
                </p>

                <div className="mt-2 flex items-start justify-between gap-5">
                  <div>
                    <h3 className="text-base font-bold leading-6 text-white transition group-hover:text-blue-300 sm:text-lg">
                      {log.title}
                    </h3>

                    <p className="mt-2 text-sm leading-6 text-slate-500">
                      {log.description}
                    </p>
                  </div>

                  <span className="shrink-0 text-slate-600 transition-transform group-hover:translate-x-1 group-hover:text-blue-400">
                    →
                  </span>
                </div>
              </Link>
            ))}
          </div>

          <div className="mt-5 rounded-2xl border border-dashed border-slate-800 bg-slate-900/20 p-5 text-center">
            <p className="text-sm font-bold text-slate-400">
              첫 검색 유입 보고서를 준비하고 있습니다
            </p>

            <p className="mt-1 text-xs leading-5 text-slate-600">
              검색 데이터가 쌓이면 노출수, 클릭수, 유입 키워드와 함께
              공개합니다.
            </p>
          </div>
        </div>
      </section>

      {/* 하단 이동 */}
      <section className="bg-gradient-to-b from-slate-950 to-blue-950/20">
        <div className="mx-auto max-w-5xl px-4 py-12 sm:px-8 sm:py-16">
          <div className="rounded-3xl border border-blue-900/50 bg-blue-950/20 p-7 text-center sm:p-10">
            <p className="text-xs font-bold tracking-[0.18em] text-blue-400">
              FOLLOW THE GROWTH
            </p>

            <h2 className="mt-3 text-2xl font-black text-white">
              작은 사이트가 성장하는 과정을 공개합니다
            </h2>

            <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-slate-400">
              어떤 글이 처음 검색에 노출되고, 어떤 개선이 실제 방문으로
              이어지는지 결과와 시행착오를 계속 기록하겠습니다.
            </p>

            <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
              <Link
                href="/blog/post-log-1785418870111"
                className="inline-flex items-center justify-center rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-blue-500"
              >
                첫 제작 기록 읽기
              </Link>

              <a
                href="/rss.xml"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center justify-center rounded-xl border border-slate-700 bg-slate-900/70 px-5 py-3 text-sm font-bold text-slate-300 transition hover:bg-slate-800 hover:text-white"
              >
                업데이트 피드 열기
              </a>

              <Link
                href="/"
                className="inline-flex items-center justify-center rounded-xl border border-slate-700 bg-slate-900/70 px-5 py-3 text-sm font-bold text-slate-300 transition hover:bg-slate-800 hover:text-white"
              >
                홈으로
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}