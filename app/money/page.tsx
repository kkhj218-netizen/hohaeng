import type { Metadata } from 'next';
import Link from 'next/link';

import Breadcrumbs from '@/app/components/Breadcrumbs';
import { SITE_NAME } from '@/app/lib/site';
import { TOOLS } from '@/app/tools';

export const metadata: Metadata = {
  title: '금융 계산기 모음 | 연봉·투자·대출 Money Hub | 호행처럼',
  description:
    '연봉 실수령액, 퇴직금, 복리, 적립식 투자, 배당, 평단가, 대출 이자 계산기를 목적별로 찾아 바로 계산해보세요.',
  alternates: {
    canonical: '/money',
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
    title: '호행처럼 Money Hub | 금융 계산기 모음',
    description:
      '직장·투자·대출·자산관리 계산기를 상황별로 모아 한 번에 비교할 수 있습니다.',
    url: '/money',
    siteName: SITE_NAME,
    locale: 'ko_KR',
    type: 'website',
  },
  twitter: {
    card: 'summary',
    title: '호행처럼 Money Hub | 금융 계산기 모음',
    description: '연봉부터 투자와 대출까지 필요한 계산기를 목적별로 찾아보세요.',
  },
};

const MONEY_SECTIONS = [
  {
    id: 'work',
    eyebrow: 'WORK & SALARY',
    title: '연봉·직장',
    description:
      '계약서의 세전 금액을 실제 월급과 퇴직 준비에 필요한 숫자로 바꿔봅니다.',
    toolIds: ['salary-calc', 'severance-calc'],
  },
  {
    id: 'cashflow',
    eyebrow: 'CASH FLOW',
    title: '대출·저축·절세',
    description:
      '대출 상환 부담, 비상금, 저축률과 ISA 절세 효과를 함께 점검합니다.',
    toolIds: [
      'loan-calc',
      'debt-payoff-calc',
      'savings-rate-calc',
      'emergency-fund-calc',
      'deposit-interest-calc',
      'isa-calc',
    ],
  },
  {
    id: 'investing',
    eyebrow: 'INVESTING',
    title: '투자',
    description:
      '복리 성장, 월 적립, 배당, 평단과 위험 수량을 계산해 투자 계획을 구체화합니다.',
    toolIds: [
      'compound-calc',
      'monthly-investment-calc',
      'goal-calc',
      'dividend-calc',
      'average-price-calc',
      'investment-return-calc',
      'loss-recovery-calc',
      'cagr-calc',
      'position-size-calc',
    ],
  },
  {
    id: 'long-term',
    eyebrow: 'LONG TERM',
    title: '장기 자산계획',
    description:
      '물가상승을 반영해 은퇴 시점과 미래에 필요한 생활비를 점검합니다.',
    toolIds: ['retirement-calc', 'inflation-calc'],
  },
] as const;

const TOOL_MAP = new Map(TOOLS.map((tool) => [tool.id, tool]));

const CORE_GUIDES = [
  {
    href: '/blog/post-log-1785841740573',
    label: 'PILLAR',
    title: '2026 연봉 실수령액 총정리',
    description: '연봉 구간별 세전 월급과 예상 실수령액을 한 번에 비교합니다.',
  },
  {
    href: '/blog/post-guide-1785817962078',
    label: '기초 가이드',
    title: '2026년 4대보험 요율',
    description: '급여에서 공제되는 국민연금·건강보험·고용보험 기준을 설명합니다.',
  },
  {
    href: '/blog/prepared-monthly-100-five-years',
    label: '투자 가이드',
    title: '매월 100만 원 투자하면 5년 뒤 얼마일까',
    description: '적립 원금과 복리 수익을 구분해 계산 결과를 해석합니다.',
  },
];

export default function MoneyHubPage() {
  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
        <Breadcrumbs
          items={[
            { name: '홈', href: '/' },
            { name: 'Money Hub', href: '/money' },
          ]}
        />

        <header className="mt-7 overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900 px-6 py-10 text-white shadow-xl sm:px-10 sm:py-14">
          <p className="text-xs font-black tracking-[0.18em] text-blue-300">
            HOHAENG MONEY HUB
          </p>
          <h1 className="mt-3 max-w-3xl text-3xl font-black leading-tight sm:text-5xl">
            필요한 돈 계산을 한곳에서 시작하세요
          </h1>
          <p className="mt-5 max-w-3xl text-sm leading-7 text-slate-300 sm:text-base">
            연봉과 월급, 대출, 저축, 투자처럼 서로 연결된 숫자를 목적별로
            모았습니다. 먼저 현재 상황에 맞는 계산기를 사용하고, 결과와 관련된
            다음 계산기와 가이드까지 이어서 확인할 수 있습니다.
          </p>
        </header>

        <nav aria-label="Money Hub 빠른 이동" className="mt-6 flex gap-2 overflow-x-auto pb-2">
          {MONEY_SECTIONS.map((section) => (
            <a
              key={section.id}
              href={`#${section.id}`}
              className="whitespace-nowrap rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 shadow-sm hover:border-blue-300 hover:text-blue-700"
            >
              {section.title}
            </a>
          ))}
        </nav>

        <div className="mt-10 space-y-12">
          {MONEY_SECTIONS.map((section) => {
            const tools = section.toolIds
              .map((toolId) => TOOL_MAP.get(toolId))
              .filter((tool): tool is NonNullable<typeof tool> => Boolean(tool));

            return (
              <section key={section.id} id={section.id} className="scroll-mt-24">
                <p className="text-xs font-black tracking-[0.16em] text-blue-600">
                  {section.eyebrow}
                </p>
                <h2 className="mt-2 text-2xl font-black sm:text-3xl">{section.title}</h2>
                <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
                  {section.description}
                </p>

                <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {tools.map((tool) => (
                    <Link
                      key={tool.id}
                      href={tool.href}
                      className="group flex min-h-44 flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:border-blue-300 hover:shadow-lg"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-xs font-black text-blue-600">{tool.badge || '계산기'}</span>
                        <span className="text-slate-400 transition group-hover:translate-x-1 group-hover:text-blue-600">→</span>
                      </div>
                      <h3 className="mt-4 text-lg font-black text-slate-950 group-hover:text-blue-700">
                        {tool.title}
                      </h3>
                      <p className="mt-2 text-sm leading-6 text-slate-500">
                        {tool.description}
                      </p>
                    </Link>
                  ))}
                </div>
              </section>
            );
          })}
        </div>

        <section className="mt-14 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-xs font-black tracking-[0.14em] text-emerald-600">READ NEXT</p>
              <h2 className="mt-2 text-2xl font-black">계산 결과를 이해하는 핵심 가이드</h2>
            </div>
            <Link href="/blog" className="text-sm font-bold text-blue-600 hover:underline">
              Blog 전체 보기 →
            </Link>
          </div>
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {CORE_GUIDES.map((guide) => (
              <Link
                key={guide.href}
                href={guide.href}
                className="rounded-2xl border border-slate-200 bg-slate-50 p-5 hover:border-emerald-300 hover:bg-emerald-50"
              >
                <span className="text-xs font-black text-emerald-700">{guide.label}</span>
                <h3 className="mt-2 font-black text-slate-950">{guide.title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-500">{guide.description}</p>
              </Link>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
