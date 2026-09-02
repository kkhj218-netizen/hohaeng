import type { Metadata } from 'next';
import Link from 'next/link';

import CalculatorDirectory from '@/app/components/CalculatorDirectory';
import FooterProfile from '@/app/components/FooterProfile';
import { SITE_NAME, SITE_URL } from '@/app/lib/site';

export const metadata: Metadata = {
  title: '호행처럼 | 오늘의 미국증시·투자 데이터·시장 공부',
  description:
    '오늘의 미국증시, 시장지도, 경제일정, 실적 위험, 금리·물가·고용 데이터를 한곳에서 확인하고 시장을 이해하는 투자 공부까지 이어가세요.',
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
    title: '호행처럼 | 개인 투자자의 시장 OS',
    description:
      '매일 시장을 확인하고, 데이터를 공부하고, 투자 과정을 기록하는 개인 투자자의 시장 OS.',
    url: '/',
    siteName: SITE_NAME,
    locale: 'ko_KR',
    type: 'website',
  },
  twitter: {
    card: 'summary',
    title: '호행처럼 | 개인 투자자의 시장 OS',
    description: '오늘 시장부터 투자 데이터와 공부까지 한 흐름으로 확인하세요.',
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
      alternateName: 'HOHAENG OS',
      description:
        '오늘 시장을 확인하고 투자 데이터를 공부하며 실제 투자 과정을 기록하는 개인 투자자용 웹사이트',
      inLanguage: 'ko-KR',
      publisher: {
        '@id': `${SITE_URL}/#organization`,
      },
    },
    {
      '@type': 'Organization',
      '@id': `${SITE_URL}/#organization`,
      name: SITE_NAME,
      alternateName: 'HOHAENG OS',
      url: SITE_URL,
    },
  ],
};

const TODAY_ENTRIES = [
  {
    eyebrow: 'MARKET',
    icon: '📈',
    title: '미국시장 한눈에',
    description: '주요 지수와 선물, 변동성까지 오늘 시장의 출발점을 확인합니다.',
    href: '/today',
  },
  {
    eyebrow: 'BREADTH',
    icon: '🗺️',
    title: 'NASDAQ100 · S&P500 시장지도',
    description: '지수만 보지 않고 상승·하락 종목과 섹터 내부 흐름을 함께 봅니다.',
    href: '/data/market-map',
  },
  {
    eyebrow: 'EVENT',
    icon: '📅',
    title: '이번주 경제일정',
    description: 'CPI, PCE, 고용지표처럼 포지션 전에 알아야 할 발표 시간을 확인합니다.',
    href: '/data/calendar',
  },
  {
    eyebrow: 'EARNINGS',
    icon: '⚠️',
    title: '대형주 실적 위험 레이더',
    description: '지수 영향이 큰 기업의 실적 일정을 미리 확인해 이벤트 위험을 줄입니다.',
    href: '/data/earnings-risk',
  },
];

const BEFORE_TRADE = [
  {
    icon: '📅',
    title: '경제지표 발표',
    description: '오늘 밤 시장을 흔들 수 있는 발표가 있는지 먼저 확인',
    href: '/data/calendar',
  },
  {
    icon: '⚠️',
    title: '대형주 실적',
    description: 'NASDAQ·S&P500 영향도가 큰 기업의 실적 일정 확인',
    href: '/data/earnings-risk',
  },
  {
    icon: '🌡️',
    title: '시장 위험도',
    description: '금리·VIX·유가처럼 포지션 환경을 바꾸는 핵심 변수 확인',
    href: '/today',
  },
];

const STUDY_POSTS = [
  {
    number: '01',
    label: '금리',
    title: '미국 10년물 국채금리란? 주식과 왜 반대로 움직일까',
    description: '금리 숫자 자체보다 왜 오르고 내리는지부터 이해합니다.',
    href: '/blog/post-analysis-1787797143717',
  },
  {
    number: '02',
    label: '물가',
    title: 'PCE 물가지수란? 연준이 중요하게 보는 이유',
    description: 'PCE가 금리 예상과 주식시장으로 연결되는 흐름을 쉽게 설명합니다.',
    href: '/blog/post-log-1787789753245',
  },
  {
    number: '03',
    label: '투자 이론',
    title: '시장 숫자를 하나씩 연결해서 공부하기',
    description: '금리·물가·고용·변동성 지표를 시장의 흐름으로 연결해 봅니다.',
    href: '/blog',
  },
];

const DATA_GROUPS = [
  { icon: '🏦', title: '금리', detail: '2Y · 10Y · 30Y · 기준금리' },
  { icon: '🧾', title: '물가', detail: 'CPI · PCE · 기대인플레이션' },
  { icon: '👷', title: '고용·경기', detail: 'NFP · JOLTS · PMI · 소비심리' },
  { icon: '💳', title: '금리구조·신용', detail: '스프레드 · 금융환경 · 신용' },
  { icon: '💧', title: '유동성', detail: 'Fed · M2 · 시장 유동성' },
  { icon: '🛢️', title: '환율·원자재', detail: 'DXY · WTI · GOLD · 원자재' },
];

const HOHAENG_LOGS = [
  {
    title: '매달 100만 원 트레이딩 계좌',
    description: '수익보다 계좌 생존을 우선하는 실제 투자 기록',
    href: '/projects/trading',
  },
  {
    title: '검색 유입 0명에서 사이트 키우기',
    description: '호행처럼을 직접 만들고 성장시키는 과정 기록',
    href: '/projects/site-growth',
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

      {/* HERO */}
      <section className="relative overflow-hidden border-b border-slate-900">
        <div className="pointer-events-none absolute left-1/2 top-[-120px] h-[520px] w-[760px] -translate-x-1/2 rounded-full bg-blue-600/15 blur-3xl" />
        <div className="pointer-events-none absolute right-[-120px] top-28 h-72 w-72 rounded-full bg-emerald-600/10 blur-3xl" />

        <div className="relative mx-auto max-w-5xl px-4 pb-14 pt-14 sm:px-8 sm:pb-20 sm:pt-20">
          <div className="inline-flex items-center gap-2 rounded-full border border-blue-800/50 bg-blue-950/60 px-3 py-1.5 text-xs font-bold tracking-wide text-blue-300">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            개인 투자자의 시장 OS
          </div>

          <h1 className="mt-5 max-w-4xl text-3xl font-black leading-tight tracking-tight text-white sm:text-5xl sm:leading-[1.16]">
            매일 시장을 보고,
            <br />
            <span className="bg-gradient-to-r from-blue-400 via-indigo-300 to-emerald-400 bg-clip-text text-transparent">
              데이터를 공부하고, 투자 과정을 기록합니다
            </span>
          </h1>

          <p className="mt-5 max-w-2xl text-sm leading-7 text-slate-400 sm:text-base">
            오늘 미국증시부터 시장지도, 경제일정, 실적 위험, 금리·물가·고용 데이터까지.
            개인 투자자가 실제로 시장을 볼 때 필요한 것들을 한 흐름으로 모았습니다.
          </p>

          <div className="mt-7 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/today"
              className="inline-flex items-center justify-center rounded-xl bg-blue-600 px-5 py-3 text-sm font-black text-white shadow-lg shadow-blue-950/50 transition hover:bg-blue-500"
            >
              오늘 시장 보기
              <span className="ml-2">→</span>
            </Link>

            <Link
              href="/data"
              className="inline-flex items-center justify-center rounded-xl border border-slate-700 bg-slate-900/70 px-5 py-3 text-sm font-bold text-slate-200 transition hover:border-slate-600 hover:bg-slate-800"
            >
              투자 데이터 둘러보기
            </Link>
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-2 text-[11px] font-bold tracking-wide text-slate-500">
            <span className="rounded-full border border-slate-800 bg-slate-900/60 px-3 py-1.5">DATA</span>
            <span>→</span>
            <span className="rounded-full border border-slate-800 bg-slate-900/60 px-3 py-1.5">ANALYSIS</span>
            <span>→</span>
            <span className="rounded-full border border-slate-800 bg-slate-900/60 px-3 py-1.5">OPINION</span>
          </div>
        </div>
      </section>

      {/* TODAY */}
      <section className="border-b border-slate-900 bg-slate-950">
        <div className="mx-auto max-w-5xl px-4 py-14 sm:px-8 sm:py-16">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-black tracking-[0.18em] text-blue-400">TODAY</p>
              <h2 className="mt-2 text-2xl font-black text-white sm:text-3xl">오늘 시장은 어떨까?</h2>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-400">
                처음 왔다면 여기부터 보세요. 시장 전체를 빠르게 확인한 뒤 필요한 데이터로 들어갈 수 있습니다.
              </p>
            </div>

            <Link href="/today" className="text-sm font-bold text-blue-300 hover:text-blue-200">
              TODAY 전체보기 →
            </Link>
          </div>

          <div className="mt-7 grid grid-cols-1 gap-4 sm:grid-cols-2">
            {TODAY_ENTRIES.map((item) => (
              <Link
                key={item.title}
                href={item.href}
                className="group rounded-2xl border border-slate-800/80 bg-slate-900/55 p-5 transition duration-300 hover:-translate-y-1 hover:border-blue-700/60 hover:bg-slate-900"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-[10px] font-black tracking-[0.16em] text-slate-500">{item.eyebrow}</p>
                    <h3 className="mt-2 text-base font-black text-white sm:text-lg">
                      <span className="mr-2">{item.icon}</span>
                      {item.title}
                    </h3>
                  </div>
                  <span className="text-slate-600 transition group-hover:translate-x-1 group-hover:text-blue-400">→</span>
                </div>
                <p className="mt-3 text-sm leading-6 text-slate-400">{item.description}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* BEFORE YOU TRADE */}
      <section className="border-b border-slate-900 bg-gradient-to-b from-slate-950 to-amber-950/10">
        <div className="mx-auto max-w-5xl px-4 py-14 sm:px-8 sm:py-16">
          <p className="text-xs font-black tracking-[0.18em] text-amber-400">BEFORE YOU TRADE</p>
          <h2 className="mt-2 text-2xl font-black text-white sm:text-3xl">오늘 포지션 잡기 전에</h2>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-400">
            방향을 맞히는 것보다 먼저, 오늘 시장에 큰 이벤트가 있는지 확인합니다.
          </p>

          <div className="mt-7 grid grid-cols-1 gap-4 md:grid-cols-3">
            {BEFORE_TRADE.map((item) => (
              <Link
                key={item.title}
                href={item.href}
                className="group rounded-2xl border border-slate-800 bg-slate-900/55 p-5 transition hover:border-amber-700/50 hover:bg-slate-900"
              >
                <div className="text-2xl">{item.icon}</div>
                <h3 className="mt-4 font-black text-white">{item.title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-400">{item.description}</p>
                <div className="mt-4 text-xs font-bold text-amber-300">확인하기 →</div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* MARKET MAP */}
      <section className="border-b border-slate-900">
        <div className="mx-auto grid max-w-5xl gap-7 px-4 py-14 sm:px-8 sm:py-16 md:grid-cols-[1.05fr_0.95fr] md:items-center">
          <div>
            <p className="text-xs font-black tracking-[0.18em] text-emerald-400">MARKET MAP</p>
            <h2 className="mt-2 text-2xl font-black text-white sm:text-3xl">지수가 아니라 시장의 안쪽을 봅니다</h2>
            <p className="mt-4 text-sm leading-7 text-slate-400">
              S&P500이나 나스닥이 올랐다는 숫자 하나만으로는 시장의 체력을 알기 어렵습니다.
              상승·하락 종목 수, 시가총액 비중, 강한 섹터와 약한 섹터를 함께 확인합니다.
            </p>

            <div className="mt-5 flex flex-wrap gap-2 text-xs font-bold text-slate-300">
              {['NASDAQ100', 'S&P500', 'Breadth', 'Sector', 'Leaders', 'Laggards'].map((tag) => (
                <span key={tag} className="rounded-full border border-slate-800 bg-slate-900 px-3 py-1.5">
                  {tag}
                </span>
              ))}
            </div>

            <Link
              href="/data/market-map"
              className="mt-6 inline-flex items-center rounded-xl border border-emerald-800/60 bg-emerald-950/30 px-5 py-3 text-sm font-black text-emerald-300 transition hover:bg-emerald-950/60"
            >
              MARKET MAP 자세히 보기 →
            </Link>
          </div>

          <div className="rounded-3xl border border-slate-800 bg-slate-900/55 p-5 shadow-2xl shadow-slate-950/40">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-black tracking-[0.16em] text-slate-500">WHAT TO CHECK</p>
                <p className="mt-1 font-black text-white">시장 내부 체력 체크</p>
              </div>
              <span className="rounded-full border border-emerald-900/60 bg-emerald-950/40 px-2.5 py-1 text-[10px] font-bold text-emerald-300">DATA FIRST</span>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-3">
              {[
                ['상승·하락 종목', '시장 확산도'],
                ['시총가중 흐름', '지수 왜곡 확인'],
                ['강한 섹터', '주도 영역'],
                ['약한 섹터', '위험 영역'],
              ].map(([title, label]) => (
                <div key={title} className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
                  <p className="text-[10px] font-bold text-slate-600">{label}</p>
                  <p className="mt-2 text-sm font-black text-slate-200">{title}</p>
                </div>
              ))}
            </div>

            <p className="mt-5 rounded-2xl border border-blue-900/50 bg-blue-950/25 p-4 text-sm leading-6 text-blue-200">
              숫자를 본 뒤에는 “오늘 지수와 실제 종목 흐름이 같은 방향이었나?”를 확인합니다.
            </p>
          </div>
        </div>
      </section>

      {/* MARKET BRIEF */}
      <section className="border-b border-slate-900 bg-slate-950">
        <div className="mx-auto max-w-5xl px-4 py-14 sm:px-8 sm:py-16">
          <p className="text-xs font-black tracking-[0.18em] text-indigo-400">MARKET BRIEF</p>
          <h2 className="mt-2 text-2xl font-black text-white sm:text-3xl">숫자는 같아도 이유는 매일 다릅니다</h2>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-400">
            매일 시황은 지수 등락을 나열하는 대신, 그날 시장을 움직인 핵심 이유 하나를 중심으로 정리합니다.
          </p>

          <div className="mt-7 grid gap-4 md:grid-cols-[1.25fr_0.75fr]">
            <Link
              href="/blog?category=market"
              className="group rounded-3xl border border-indigo-900/50 bg-gradient-to-br from-indigo-950/45 to-slate-900/70 p-6 transition hover:border-indigo-700/60"
            >
              <span className="rounded-full border border-indigo-800/60 bg-indigo-950/70 px-3 py-1 text-[10px] font-black text-indigo-300">DAILY MARKET</span>
              <h3 className="mt-5 text-xl font-black leading-snug text-white sm:text-2xl">
                오늘 시장에서 가장 중요했던 것은 무엇이었을까?
              </h3>
              <p className="mt-3 max-w-xl text-sm leading-6 text-slate-400">
                금리, 유가, 달러, 실적, 경제지표 가운데 실제 시장을 움직인 원인을 연결해 봅니다.
              </p>
              <div className="mt-6 text-sm font-black text-indigo-300 transition group-hover:translate-x-1">최신 시황 읽기 →</div>
            </Link>

            <div className="space-y-4">
              <Link
                href="/blog/post-analysis-1787797143717"
                className="block rounded-2xl border border-slate-800 bg-slate-900/50 p-5 transition hover:border-slate-700 hover:bg-slate-900"
              >
                <p className="text-[10px] font-black tracking-[0.14em] text-blue-400">RATE</p>
                <h3 className="mt-2 font-black text-white">10년물 금리가 오르면 왜 주식이 흔들릴까?</h3>
              </Link>

              <Link
                href="/blog/post-log-1787789753245"
                className="block rounded-2xl border border-slate-800 bg-slate-900/50 p-5 transition hover:border-slate-700 hover:bg-slate-900"
              >
                <p className="text-[10px] font-black tracking-[0.14em] text-emerald-400">INFLATION</p>
                <h3 className="mt-2 font-black text-white">PCE는 왜 연준과 증시에 중요할까?</h3>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* HOHAENG VIEW */}
      <section className="border-b border-slate-900 bg-gradient-to-b from-slate-950 to-blue-950/10">
        <div className="mx-auto max-w-5xl px-4 py-14 sm:px-8 sm:py-16">
          <div className="rounded-3xl border border-blue-900/50 bg-blue-950/20 p-6 sm:p-8">
            <p className="text-xs font-black tracking-[0.18em] text-blue-400">HOHAENG&apos;S VIEW</p>
            <h2 className="mt-2 text-2xl font-black text-white">호행은 시장을 이렇게 봅니다</h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-400">
              예측보다 먼저 환경을 확인하고, 숫자를 따로 보지 않고 서로 연결해서 봅니다.
            </p>

            <div className="mt-6 grid gap-3 md:grid-cols-3">
              {[
                ['01', '먼저 위험을 확인', '경제일정과 실적 이벤트가 있는지부터 확인합니다.'],
                ['02', '지수 안쪽을 확인', '지수 상승·하락보다 종목 확산도와 섹터 흐름을 함께 봅니다.'],
                ['03', '왜 움직였는지 확인', '금리·유가·달러·지표가 어떤 경로로 시장에 영향을 줬는지 연결합니다.'],
              ].map(([number, title, description]) => (
                <div key={number} className="rounded-2xl border border-blue-950 bg-slate-950/55 p-5">
                  <p className="text-lg font-black text-blue-700">{number}</p>
                  <h3 className="mt-3 font-black text-white">{title}</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-400">{description}</p>
                </div>
              ))}
            </div>

            <p className="mt-5 text-xs leading-5 text-slate-600">
              호행처럼의 데이터와 기록은 투자 권유가 아니라 실제 시장을 관찰하고 공부하기 위한 개인 기록입니다.
            </p>
          </div>
        </div>
      </section>

      {/* INVESTMENT GUIDE */}
      <section className="border-b border-slate-900">
        <div className="mx-auto max-w-5xl px-4 py-14 sm:px-8 sm:py-16">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-black tracking-[0.18em] text-violet-400">INVESTMENT GUIDE</p>
              <h2 className="mt-2 text-2xl font-black text-white sm:text-3xl">처음이라면 여기부터</h2>
              <p className="mt-3 text-sm leading-6 text-slate-400">경제지표를 외우기보다 주식시장과 어떻게 연결되는지부터 공부합니다.</p>
            </div>
            <Link href="/blog" className="text-sm font-bold text-violet-300 hover:text-violet-200">투자 글 전체보기 →</Link>
          </div>

          <div className="mt-7 space-y-3">
            {STUDY_POSTS.map((post) => (
              <Link
                key={post.number}
                href={post.href}
                className="group flex gap-4 rounded-2xl border border-slate-800/80 bg-slate-900/45 p-5 transition hover:border-violet-800/60 hover:bg-slate-900/80"
              >
                <span className="text-lg font-black text-slate-700 transition group-hover:text-violet-500">{post.number}</span>
                <div className="min-w-0 flex-1">
                  <span className="text-[11px] font-black text-violet-400">{post.label}</span>
                  <h3 className="mt-1 text-sm font-black leading-6 text-white sm:text-base">{post.title}</h3>
                  <p className="mt-1 text-xs leading-5 text-slate-500 sm:text-sm">{post.description}</p>
                </div>
                <span className="self-center text-slate-600 transition group-hover:translate-x-1 group-hover:text-violet-400">→</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* DATA LIBRARY */}
      <section className="border-b border-slate-900 bg-slate-950">
        <div className="mx-auto max-w-5xl px-4 py-14 sm:px-8 sm:py-16">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-black tracking-[0.18em] text-cyan-400">DATA LIBRARY</p>
              <h2 className="mt-2 text-2xl font-black text-white sm:text-3xl">필요한 데이터를 직접 확인하세요</h2>
              <p className="mt-3 text-sm leading-6 text-slate-400">처음에는 TODAY에서 보고, 궁금한 지표가 생기면 데이터 라이브러리로 들어갑니다.</p>
            </div>
            <Link href="/data" className="text-sm font-bold text-cyan-300 hover:text-cyan-200">모든 투자 데이터 →</Link>
          </div>

          <div className="mt-7 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {DATA_GROUPS.map((group) => (
              <Link
                key={group.title}
                href="/data"
                className="group rounded-2xl border border-slate-800 bg-slate-900/45 p-5 transition hover:border-cyan-800/60 hover:bg-slate-900"
              >
                <div className="text-xl">{group.icon}</div>
                <h3 className="mt-3 font-black text-white">{group.title}</h3>
                <p className="mt-2 text-xs leading-5 text-slate-500">{group.detail}</p>
                <div className="mt-4 text-xs font-bold text-cyan-400 opacity-80">데이터 보기 →</div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* EVENT DB */}
      <section className="border-b border-slate-900">
        <div className="mx-auto max-w-5xl px-4 py-14 sm:px-8 sm:py-16">
          <div className="rounded-3xl border border-slate-800 bg-slate-900/55 p-6 sm:p-8">
            <div className="grid gap-6 md:grid-cols-[1fr_auto] md:items-center">
              <div>
                <p className="text-xs font-black tracking-[0.18em] text-rose-400">EVENT DB</p>
                <h2 className="mt-2 text-2xl font-black text-white">그날 시장에서는 무슨 일이 있었을까?</h2>
                <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-400">
                  중요한 경제지표·정책·실적 이벤트와 당시 시장 반응을 쌓아두면, 비슷한 상황이 왔을 때 과거를 바로 찾아볼 수 있습니다.
                </p>
              </div>
              <Link
                href="/data/events"
                className="inline-flex items-center justify-center rounded-xl border border-rose-800/60 bg-rose-950/30 px-5 py-3 text-sm font-black text-rose-300 transition hover:bg-rose-950/55"
              >
                과거 이벤트 보기 →
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* CALCULATORS */}
      <section className="border-b border-slate-900 bg-slate-950">
        <div className="mx-auto max-w-5xl px-4 pt-14 sm:px-8 sm:pt-16">
          <p className="text-xs font-black tracking-[0.18em] text-emerald-400">MONEY TOOLS</p>
          <h2 className="mt-2 text-2xl font-black text-white sm:text-3xl">돈과 투자에 필요한 계산기</h2>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-400">
            계산기는 그대로 유지합니다. 복리·적립식·평단·포지션 사이징부터 연봉과 대출까지 필요한 순간 바로 사용하세요.
          </p>
        </div>
        <CalculatorDirectory />
      </section>

      {/* HOHAENG LOG */}
      <section className="border-b border-slate-900">
        <div className="mx-auto max-w-5xl px-4 py-14 sm:px-8 sm:py-16">
          <p className="text-xs font-black tracking-[0.18em] text-blue-400">HOHAENG LOG</p>
          <h2 className="mt-2 text-2xl font-black text-white sm:text-3xl">직접 투자하며 배우고 기록합니다</h2>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-400">
            데이터 사이트로 끝내지 않고, 실제 투자와 사이트 운영에서 무엇을 시도했고 무엇을 배웠는지 함께 남깁니다.
          </p>

          <div className="mt-7 grid gap-4 md:grid-cols-2">
            {HOHAENG_LOGS.map((log) => (
              <Link
                key={log.title}
                href={log.href}
                className="group rounded-2xl border border-slate-800 bg-slate-900/50 p-5 transition hover:-translate-y-1 hover:border-blue-800/60 hover:bg-slate-900"
              >
                <h3 className="font-black text-white">{log.title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-400">{log.description}</p>
                <div className="mt-4 text-xs font-bold text-blue-400">기록 보기 →</div>
              </Link>
            ))}
          </div>

          <div className="mt-10">
            <FooterProfile />
          </div>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="border-b border-slate-900 bg-gradient-to-b from-slate-950 to-blue-950/20">
        <div className="mx-auto max-w-5xl px-4 py-14 sm:px-8 sm:py-16">
          <div className="rounded-3xl border border-blue-900/50 bg-blue-950/20 p-7 text-center sm:p-10">
            <p className="text-xs font-black tracking-[0.18em] text-blue-400">COME BACK TOMORROW</p>
            <h2 className="mt-3 text-2xl font-black text-white">내일 시장도 다시 확인해보세요</h2>
            <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-slate-400">
              시장은 매일 달라지지만 확인해야 할 핵심은 크게 달라지지 않습니다. TODAY에서 오늘의 시장부터 시작하세요.
            </p>
            <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
              <Link
                href="/today"
                className="inline-flex items-center justify-center rounded-xl bg-blue-600 px-6 py-3 text-sm font-black text-white transition hover:bg-blue-500"
              >
                TODAY 바로가기 →
              </Link>
              <Link
                href="/blog?category=market"
                className="inline-flex items-center justify-center rounded-xl border border-slate-700 bg-slate-900/70 px-6 py-3 text-sm font-bold text-slate-300 transition hover:bg-slate-800 hover:text-white"
              >
                최신 시황 보기
              </Link>
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t border-slate-800/80 py-8 text-center text-xs text-slate-500">
        <div className="mx-auto max-w-5xl px-4">
          <p>© {new Date().getFullYear()} 호행처럼 (Hohaeng). All rights reserved.</p>
          <p className="mt-1 text-[11px] text-slate-600">
            투자 데이터와 계산 결과는 참고용이며, 투자 판단과 최종 결정의 책임은 이용자에게 있습니다.
          </p>
        </div>
      </footer>
    </main>
  );
}
