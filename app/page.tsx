import type { Metadata } from 'next';
import Link from 'next/link';

import CalculatorDirectory from '@/app/components/CalculatorDirectory';
import FooterProfile from '@/app/components/FooterProfile';
import { SITE_NAME, SITE_URL } from '@/app/lib/site';

export const metadata: Metadata = {
  title: '호행처럼 | 연봉·투자·대출 계산기와 생활 금융 가이드',
  description:
    '연봉 실수령액, 퇴직금, 대출 이자, 복리와 적립식 투자 계산기를 사용하고 돈과 삶을 개선하는 실제 기록을 함께 읽어보세요.',
  alternates: {
    canonical: '/',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
      'max-snippet': -1,
      'max-video-preview': -1,
    },
  },
  openGraph: {
    title: '호행처럼 | 계산하고 기록하며 더 나은 방향으로',
    description:
      '직장·금융·투자 계산기와 직접 실행한 돈·삶의 기록을 한곳에서 확인하세요.',
    url: '/',
    siteName: SITE_NAME,
    locale: 'ko_KR',
    type: 'website',
  },
  twitter: {
    card: 'summary',
    title: '호행처럼 | 연봉·투자·대출 계산기',
    description: '돈과 삶의 중요한 숫자를 계산하고 다음 행동까지 연결합니다.',
  },
};

const homeJsonLd = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'WebSite',
      '@id': `${SITE_URL}/#website`,
      url: SITE_URL,
      name: SITE_NAME,
      alternateName: 'HOHAENG',
      description: '돈과 삶의 중요한 숫자를 계산하고 실제 개선 과정을 기록하는 웹사이트',
      inLanguage: 'ko-KR',
      publisher: {
        '@id': `${SITE_URL}/#organization`,
      },
    },
    {
      '@type': 'Organization',
      '@id': `${SITE_URL}/#organization`,
      name: SITE_NAME,
      alternateName: 'HOHAENG',
      url: SITE_URL,
    },
  ],
};

const PROJECTS = [
  {
    id: 'trading',
    eyebrow: 'MONEY PROJECT',
    status: '진행 중',
    title: '매달 100만 원 트레이딩 계좌',
    description:
      '매달 100만 원을 입금하며, 수익과 손실뿐 아니라 실제 판단과 실수를 함께 기록합니다.',
    stats: [
      { label: '운용 계획', value: '매달 100만 원 입금' },
      { label: '현재 단계', value: '첫 기록 시작' },
      { label: '핵심 원칙', value: '수익보다 생존' },
    ],
    href: '/projects/trading',
    linkText: '트레이딩 첫 기록 보기',
    accent:
      'border-emerald-800/50 hover:border-emerald-500/60 hover:shadow-emerald-950/40',
    badgeClass:
      'bg-emerald-950/70 text-emerald-300 border-emerald-800/50',
    arrowClass: 'text-emerald-400',
  },
  {
    id: 'site-growth',
    eyebrow: 'GROWTH PROJECT',
    status: '새 글 준비 중',
    title: '검색 유입 0명에서 사이트 키우기',
    description:
      '직접 만든 호행처럼을 검색 유입 0명에서 시작해, 방문자가 생기는 과정까지 공개합니다.',
    stats: [
      { label: '시작 지점', value: '검색 유입 0명' },
      { label: '현재 단계', value: '콘텐츠 기반 만들기' },
      { label: '다음 목표', value: '첫 검색 방문' },
    ],
    href: '/projects/site-growth',
    linkText: '사이트를 만들기 시작한 기록',
    accent:
      'border-blue-800/50 hover:border-blue-500/60 hover:shadow-blue-950/40',
    badgeClass: 'bg-blue-950/70 text-blue-300 border-blue-800/50',
    arrowClass: 'text-blue-400',
  },
];

const GUIDE_POSTS = [
  {
    category: '직장·월급',
    title: '2026 연봉 실수령액 총정리',
    description: '연봉 3,000만 원부터 1억 원까지 실제 월급을 비교합니다.',
    href: '/blog/post-log-1785841740573',
  },
  {
    category: '직장·월급',
    title: '2026년 4대보험 요율',
    description: '국민연금·건강보험·장기요양보험·고용보험 공제 기준입니다.',
    href: '/blog/post-guide-1785817962078',
  },
  {
    category: '직장·월급',
    title: '연봉 5,000만 원 실수령액',
    description: '월 416만 원과 실제 통장 입금액의 차이를 계산했습니다.',
    href: '/blog/post-guide-1785842145060',
  },
  {
    category: '직장·월급',
    title: '연봉 3,000만 원 실수령액',
    description: '사회초년생과 직장인이 받는 현실적인 세후 월급을 확인합니다.',
    href: '/blog/post-guide-1785842451564',
  },
];

const START_POSTS = [
  {
    number: '01',
    label: '호행처럼의 시작',
    title: '완벽하지 않아도, 방향은 잃지 않기로 했다',
    description:
      '호행처럼을 왜 시작했고 앞으로 어떤 삶을 기록하려는지 담았습니다.',
    href: '/blog/post-log-1785417915884',
  },
  {
    number: '02',
    label: '돈을 다시 쌓는 과정',
    title: '매달 100만 원 트레이딩 계좌를 시작합니다',
    description:
      '결과만 보여주는 계좌가 아니라 판단과 실수까지 남기는 공개 기록입니다.',
    href: '/blog/post-log-1785889120887',
  },
  {
    number: '03',
    label: '사이트 성장 과정',
    title: '직접 웹페이지를 제작해 보다',
    description:
      '아무것도 없던 상태에서 호행처럼을 직접 만들기 시작한 과정입니다.',
    href: '/blog/post-log-1785418870111',
  },
];

export default function Home() {
  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 antialiased selection:bg-blue-500 selection:text-white">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(homeJsonLd).replace(/</g, '\\u003c'),
        }}
      />
      {/* 1. 메인 히어로 */}
      <section className="relative overflow-hidden border-b border-slate-900">
        <div className="pointer-events-none absolute left-1/2 top-0 h-[420px] w-[680px] -translate-x-1/2 rounded-full bg-blue-700/10 blur-3xl" />

        <div className="relative mx-auto max-w-5xl px-4 pb-14 pt-14 sm:px-8 sm:pb-20 sm:pt-20">
          <div className="inline-flex items-center rounded-full border border-blue-800/50 bg-blue-950/60 px-3 py-1 text-xs font-semibold tracking-wide text-blue-300">
            호행의 돈·건강·삶 공개 기록
          </div>

          <h1 className="mt-5 max-w-3xl text-3xl font-black leading-tight tracking-tight text-white sm:text-5xl sm:leading-[1.18]">
            완벽하지 않지만,
            <br />
            <span className="bg-gradient-to-r from-blue-400 via-indigo-300 to-emerald-400 bg-clip-text text-transparent">
              오늘보다 나은 삶을 만들어갑니다
            </span>
          </h1>

          <p className="mt-5 max-w-2xl text-sm leading-7 text-slate-400 sm:text-base">
            호행이 돈과 삶을 다시 세워가는 과정을 기록하고,
            그 과정에서 필요했던 연봉 실수령액·퇴직금·대출 이자·ISA
            계산기와 현실적인 생활 정보를 직접 만들어 나눕니다.
          </p>

          <div className="mt-7 flex flex-col gap-3 sm:flex-row">
            <a
              href="#projects"
              className="inline-flex items-center justify-center rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-blue-950/50 transition hover:bg-blue-500"
            >
              진행 중인 호행 프로젝트
              <span className="ml-2">↓</span>
            </a>

            <Link
              href="/money"
              className="inline-flex items-center justify-center rounded-xl border border-slate-700 bg-slate-900/70 px-5 py-3 text-sm font-bold text-slate-200 transition hover:border-slate-600 hover:bg-slate-800"
            >
              Money Hub에서 계산하기
            </Link>

            <Link
              href="/blog"
              className="inline-flex items-center justify-center rounded-xl border border-slate-700 bg-slate-900/70 px-5 py-3 text-sm font-bold text-slate-200 transition hover:border-slate-600 hover:bg-slate-800"
            >
              Blog 전체 글 보기
            </Link>
          </div>

          <p className="mt-5 text-xs text-slate-600">
            정보로 처음 만나고, 변화 과정이 궁금해 다시 오는 곳
          </p>
        </div>
      </section>

      {/* 2. 진행 중인 공개 프로젝트 */}
      <section
        id="projects"
        className="scroll-mt-20 border-b border-slate-900 bg-slate-950"
      >
        <div className="mx-auto max-w-5xl px-4 py-14 sm:px-8 sm:py-16">
          <div className="mb-7">
            <p className="text-xs font-bold tracking-[0.18em] text-blue-400">
              HOHAENG PROJECT
            </p>

            <h2 className="mt-2 text-2xl font-black text-white sm:text-3xl">
              지금 진행 중인 공개 프로젝트
            </h2>

            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-400">
              잘된 결과만 보여주지 않습니다. 시작부터 시행착오, 판단의
              변화까지 숫자와 함께 기록합니다.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            {PROJECTS.map((project) => (
              <article
                key={project.id}
                className={`group rounded-3xl border bg-slate-900/60 p-6 shadow-xl transition duration-300 hover:-translate-y-1 ${project.accent}`}
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="text-[10px] font-extrabold tracking-[0.18em] text-slate-500">
                    {project.eyebrow}
                  </span>

                  <span
                    className={`rounded-full border px-2.5 py-1 text-[10px] font-bold ${project.badgeClass}`}
                  >
                    {project.status}
                  </span>
                </div>

                <h3 className="mt-5 text-xl font-black leading-snug text-white">
                  {project.title}
                </h3>

                <p className="mt-3 min-h-[48px] text-sm leading-6 text-slate-400">
                  {project.description}
                </p>

                <dl className="mt-6 space-y-3 rounded-2xl border border-slate-800/80 bg-slate-950/60 p-4">
                  {project.stats.map((stat) => (
                    <div
                      key={stat.label}
                      className="flex items-center justify-between gap-4 text-xs"
                    >
                      <dt className="text-slate-500">{stat.label}</dt>
                      <dd className="text-right font-bold text-slate-200">
                        {stat.value}
                      </dd>
                    </div>
                  ))}
                </dl>

                <Link
                  href={project.href}
                  className="mt-5 flex items-center justify-between text-sm font-bold text-slate-200 transition group-hover:text-white"
                >
                  <span>{project.linkText}</span>
                  <span
                    className={`transition-transform group-hover:translate-x-1 ${project.arrowClass}`}
                  >
                    →
                  </span>
                </Link>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* 3. 호행 소개 및 최근 기록 */}
      <section
        id="weekly-hohaeng"
        className="scroll-mt-20 border-b border-slate-900"
      >
        <div className="mx-auto max-w-5xl px-4 py-12 sm:px-8 sm:py-16">
          <FooterProfile />
        </div>
      </section>

      {/* 4. 많이 찾는 계산기 */}
      <CalculatorDirectory />

      {/* 5. 검색형 돈·직장 가이드 */}
      <section className="border-b border-slate-900 bg-slate-950">
        <div className="mx-auto max-w-5xl px-4 py-14 sm:px-8 sm:py-16">
          <div className="mb-7">
            <p className="text-xs font-bold tracking-[0.18em] text-indigo-400">
              MONEY GUIDE
            </p>

            <h2 className="mt-2 text-2xl font-black text-white sm:text-3xl">
              돈과 직장생활에 필요한 가이드
            </h2>

            <p className="mt-3 text-sm leading-6 text-slate-400">
              실제 월급과 공제액처럼 직장인이 자주 궁금해하는 내용을
              기준과 숫자로 정리했습니다.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {GUIDE_POSTS.map((post) => (
              <Link
                key={post.href}
                href={post.href}
                className="group rounded-2xl border border-slate-800/80 bg-slate-900/50 p-5 transition duration-300 hover:-translate-y-1 hover:border-indigo-700/60 hover:bg-slate-900"
              >
                <span className="text-[11px] font-bold text-indigo-400">
                  {post.category}
                </span>

                <h3 className="mt-2 flex items-start justify-between gap-4 text-base font-bold leading-6 text-white group-hover:text-indigo-300">
                  <span>{post.title}</span>
                  <span className="shrink-0 text-slate-600 transition-transform group-hover:translate-x-1 group-hover:text-indigo-400">
                    →
                  </span>
                </h3>

                <p className="mt-2 text-xs leading-5 text-slate-500 sm:text-sm">
                  {post.description}
                </p>
              </Link>
            ))}
          </div>

          <div className="mt-6 text-right">
            <Link
              href="/blog"
              className="inline-flex text-sm font-bold text-indigo-300 hover:text-indigo-200"
            >
              Blog에서 모든 가이드 보기 →
            </Link>
          </div>
        </div>
      </section>

      {/* 6. 처음 방문한 사람을 위한 글 */}
      <section className="border-b border-slate-900">
        <div className="mx-auto max-w-5xl px-4 py-14 sm:px-8 sm:py-16">
          <div className="mb-7">
            <p className="text-xs font-bold tracking-[0.18em] text-amber-400">
              START HERE
            </p>

            <h2 className="mt-2 text-2xl font-black text-white sm:text-3xl">
              호행처럼에 처음 오셨다면
            </h2>

            <p className="mt-3 text-sm leading-6 text-slate-400">
              호행처럼이 어떤 곳인지 가장 잘 보여주는 세 가지 기록입니다.
            </p>
          </div>

          <div className="space-y-3">
            {START_POSTS.map((post) => (
              <Link
                key={post.number}
                href={post.href}
                className="group flex gap-4 rounded-2xl border border-slate-800/80 bg-slate-900/40 p-5 transition hover:border-slate-700 hover:bg-slate-900/80"
              >
                <span className="text-lg font-black text-slate-700 transition group-hover:text-blue-500">
                  {post.number}
                </span>

                <div className="min-w-0 flex-1">
                  <span className="text-[11px] font-bold text-blue-400">
                    {post.label}
                  </span>

                  <h3 className="mt-1 text-sm font-bold leading-6 text-white sm:text-base">
                    {post.title}
                  </h3>

                  <p className="mt-1 text-xs leading-5 text-slate-500 sm:text-sm">
                    {post.description}
                  </p>
                </div>

                <span className="self-center text-slate-600 transition-transform group-hover:translate-x-1 group-hover:text-blue-400">
                  →
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* 7. 다음 기록 안내 */}
      <section className="border-b border-slate-900 bg-gradient-to-b from-slate-950 to-blue-950/20">
        <div className="mx-auto max-w-5xl px-4 py-14 sm:px-8 sm:py-16">
          <div className="rounded-3xl border border-blue-900/50 bg-blue-950/20 p-7 text-center sm:p-10">
            <p className="text-xs font-bold tracking-[0.18em] text-blue-400">
              NEXT HOHAENG
            </p>

            <h2 className="mt-3 text-2xl font-black text-white">
              호행의 다음 결과가 궁금하다면
            </h2>

            <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-slate-400">
              새로운 계산기와 검색 유입 0명에서 사이트를 키우는 과정,
              매달 100만 원 트레이딩 계좌의 실제 변화를 계속 기록합니다.
            </p>

            <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
              <Link
                href="/blog/post-log-1785889120887"
                className="inline-flex items-center justify-center rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-blue-500"
              >
                최근 호행 기록 보기
              </Link>

              <a
                href="/rss.xml"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center justify-center rounded-xl border border-slate-700 bg-slate-900/70 px-5 py-3 text-sm font-bold text-slate-300 transition hover:bg-slate-800 hover:text-white"
              >
                업데이트 피드 열기
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* 8. 풋터 */}
      <footer className="border-t border-slate-800/80 py-8 text-center text-xs text-slate-500">
        <div className="mx-auto max-w-5xl px-4">
          <p>
            © {new Date().getFullYear()} 호행처럼 (Hohaeng). All rights
            reserved.
          </p>

          <p className="mt-1 text-[11px] text-slate-600">
            본 사이트에서 제공하는 계산 결과는 참고용이며, 정확한 세법 및
            정책은 관련 기관 기준을 확인하세요.
          </p>
        </div>
      </footer>
    </main>
  );
}
