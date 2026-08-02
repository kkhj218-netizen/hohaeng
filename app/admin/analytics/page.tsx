'use client';

type MetricCardProps = {
  label: string;
  value: string;
  change: string;
  description: string;
  positive?: boolean;
};

type TrafficSource = {
  name: string;
  visitors: number;
  percentage: number;
};

type PopularPage = {
  rank: number;
  title: string;
  path: string;
  views: number;
  averageTime: string;
};

type SearchKeyword = {
  rank: number;
  keyword: string;
  source: 'Google' | 'Naver';
  visits: number;
  change: number;
};

const metrics: MetricCardProps[] = [
  {
    label: '오늘 방문자',
    value: '132',
    change: '+18.9%',
    description: '어제 같은 시간 대비',
    positive: true,
  },
  {
    label: '페이지 조회수',
    value: '428',
    change: '+24.3%',
    description: '방문자당 3.24페이지',
    positive: true,
  },
  {
    label: '평균 체류시간',
    value: '03:41',
    change: '+26초',
    description: '전체 페이지 평균',
    positive: true,
  },
  {
    label: '검색 유입 비율',
    value: '78.2%',
    change: '+5.7%',
    description: 'Google·Naver 합산',
    positive: true,
  },
];

const dailyVisitors = [
  { day: '월', visitors: 72 },
  { day: '화', visitors: 85 },
  { day: '수', visitors: 79 },
  { day: '목', visitors: 103 },
  { day: '금', visitors: 96 },
  { day: '토', visitors: 118 },
  { day: '오늘', visitors: 132 },
];

const trafficSources: TrafficSource[] = [
  {
    name: 'Google',
    visitors: 79,
    percentage: 59.8,
  },
  {
    name: 'Naver',
    visitors: 24,
    percentage: 18.4,
  },
  {
    name: '직접 방문',
    visitors: 16,
    percentage: 12.1,
  },
  {
    name: 'SNS·외부 사이트',
    visitors: 13,
    percentage: 9.7,
  },
];

const popularPages: PopularPage[] = [
  {
    rank: 1,
    title: 'ISA 절세 계산기',
    path: '/money/isa-calculator',
    views: 184,
    averageTime: '04:28',
  },
  {
    rank: 2,
    title: '버팀목 전세대출 조건 총정리',
    path: '/money/butimok-loan',
    views: 121,
    averageTime: '03:51',
  },
  {
    rank: 3,
    title: '연봉 실수령액 계산 방법',
    path: '/money/salary-after-tax',
    views: 89,
    averageTime: '03:07',
  },
  {
    rank: 4,
    title: 'ISA 계좌 장점과 단점',
    path: '/blog/isa-guide',
    views: 72,
    averageTime: '02:56',
  },
  {
    rank: 5,
    title: '디딤돌대출 자격 확인',
    path: '/money/didimdol',
    views: 61,
    averageTime: '04:02',
  },
];

const searchKeywords: SearchKeyword[] = [
  {
    rank: 1,
    keyword: 'ISA 절세 계산기',
    source: 'Google',
    visits: 31,
    change: 42,
  },
  {
    rank: 2,
    keyword: '버팀목 대출 조건',
    source: 'Naver',
    visits: 24,
    change: 18,
  },
  {
    rank: 3,
    keyword: '연봉 5000 실수령액',
    source: 'Google',
    visits: 19,
    change: 11,
  },
  {
    rank: 4,
    keyword: 'ISA 배당금 세금',
    source: 'Google',
    visits: 17,
    change: 84,
  },
  {
    rank: 5,
    keyword: '디딤돌 대출 가능 여부',
    source: 'Naver',
    visits: 12,
    change: -7,
  },
];

const maxVisitors = Math.max(
  ...dailyVisitors.map((item) => item.visitors)
);

function MetricCard({
  label,
  value,
  change,
  description,
  positive = true,
}: MetricCardProps) {
  return (
    <article className="rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-bold text-slate-400">
          {label}
        </p>

        <span
          className={`rounded-full px-2.5 py-1 text-xs font-black ${
            positive
              ? 'bg-emerald-950 text-emerald-300'
              : 'bg-rose-950 text-rose-300'
          }`}
        >
          {change}
        </span>
      </div>

      <p className="mt-5 text-3xl font-black tracking-tight text-white">
        {value}
      </p>

      <p className="mt-2 text-xs text-slate-500">
        {description}
      </p>
    </article>
  );
}

function SectionTitle({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description?: string;
}) {
  return (
    <div>
      <p className="text-xs font-black uppercase tracking-[0.18em] text-blue-400">
        {eyebrow}
      </p>

      <h2 className="mt-1 text-xl font-black text-white">
        {title}
      </h2>

      {description && (
        <p className="mt-1 text-sm text-slate-400">
          {description}
        </p>
      )}
    </div>
  );
}

export default function AdminAnalyticsPage() {
  return (
    <main className="min-h-screen bg-slate-950 px-4 py-6 text-slate-100 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        {/* 상단 제목 */}
        <header className="mb-8 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.2em] text-blue-400">
              HOHAENG OS
            </p>

            <h1 className="mt-2 text-3xl font-black tracking-tight text-white sm:text-4xl">
              📊 Analytics Dashboard
            </h1>

            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-400">
              방문자가 어디에서 들어오고, 어떤 콘텐츠를
              읽으며, 얼마나 머무르는지 확인하는
              통합 분석 화면입니다.
            </p>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">
            <select
              defaultValue="today"
              aria-label="조회 기간 선택"
              className="rounded-xl border border-slate-800 bg-slate-900 px-4 py-3 text-sm font-bold text-white outline-none focus:border-blue-500"
            >
              <option value="today">오늘</option>
              <option value="7days">최근 7일</option>
              <option value="30days">최근 30일</option>
              <option value="90days">최근 90일</option>
            </select>

            <button
              type="button"
              className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-black text-white transition hover:bg-blue-500"
            >
              데이터 새로고침
            </button>
          </div>
        </header>

        {/* 데이터 연결 전 안내 */}
        <section className="mb-7 rounded-2xl border border-amber-800/60 bg-amber-950/30 p-4">
          <div className="flex items-start gap-3">
            <span
              className="mt-0.5 text-lg"
              aria-hidden="true"
            >
              🚧
            </span>

            <div>
              <p className="font-black text-amber-200">
                현재는 화면 테스트용 예시 데이터입니다.
              </p>

              <p className="mt-1 text-sm leading-6 text-amber-100/70">
                다음 단계에서 Google Analytics,
                Google Search Console, Naver 및
                Supabase 데이터를 차례대로 연결합니다.
              </p>
            </div>
          </div>
        </section>

        {/* 핵심 지표 */}
        <section>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {metrics.map((metric) => (
              <MetricCard
                key={metric.label}
                {...metric}
              />
            ))}
          </div>
        </section>

        {/* AI 분석 */}
        <section className="mt-7 overflow-hidden rounded-2xl border border-blue-800/70 bg-gradient-to-br from-blue-950/80 via-slate-900 to-slate-900 p-6">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-3xl">
              <p className="text-xs font-black uppercase tracking-[0.2em] text-blue-300">
                AI INSIGHT
              </p>

              <h2 className="mt-2 text-xl font-black text-white">
                오늘 검색 유입이 증가하고 있습니다.
              </h2>

              <p className="mt-3 text-sm leading-7 text-slate-300">
                오늘 방문자는 어제 같은 시간보다
                <strong className="mx-1 text-emerald-300">
                  18.9%
                </strong>
                증가했습니다. 특히
                <strong className="mx-1 text-white">
                  ISA 절세 계산기
                </strong>
                페이지의 Google 검색 유입이 성장을
                이끌고 있습니다.
              </p>
            </div>

            <div className="min-w-full rounded-xl border border-blue-800/50 bg-slate-950/60 p-4 lg:min-w-[280px]">
              <p className="text-xs font-bold text-slate-400">
                오늘의 추천 행동
              </p>

              <p className="mt-2 font-black text-white">
                ISA 관련 Cluster 글 작성
              </p>

              <p className="mt-1 text-xs leading-5 text-slate-400">
                추천 주제: ISA 배당금 세금과
                미국주식 투자
              </p>

              <button
                type="button"
                className="mt-4 w-full rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-black text-white hover:bg-blue-500"
              >
                추천 작업 시작
              </button>
            </div>
          </div>
        </section>

        {/* 방문 추세 + 유입경로 */}
        <section className="mt-7 grid grid-cols-1 gap-6 xl:grid-cols-[1.5fr_1fr]">
          {/* 최근 7일 방문자 */}
          <article className="rounded-2xl border border-slate-800 bg-slate-900 p-5 sm:p-6">
            <SectionTitle
              eyebrow="VISITOR TREND"
              title="최근 7일 방문자"
              description="일별 순방문자 변화입니다."
            />

            <div className="mt-8 flex h-64 items-end gap-2 sm:gap-4">
              {dailyVisitors.map((item) => {
                const height =
                  (item.visitors / maxVisitors) * 100;

                return (
                  <div
                    key={item.day}
                    className="flex min-w-0 flex-1 flex-col items-center justify-end"
                  >
                    <span className="mb-2 text-xs font-black text-slate-300">
                      {item.visitors}
                    </span>

                    <div className="flex h-44 w-full items-end rounded-t-lg bg-slate-950 px-1.5 pt-2">
                      <div
                        className={`w-full rounded-t-md transition-all ${
                          item.day === '오늘'
                            ? 'bg-blue-500'
                            : 'bg-slate-700'
                        }`}
                        style={{
                          height: `${Math.max(
                            height,
                            8
                          )}%`,
                        }}
                      />
                    </div>

                    <span
                      className={`mt-3 text-xs font-bold ${
                        item.day === '오늘'
                          ? 'text-blue-300'
                          : 'text-slate-500'
                      }`}
                    >
                      {item.day}
                    </span>
                  </div>
                );
              })}
            </div>
          </article>

          {/* 유입 경로 */}
          <article className="rounded-2xl border border-slate-800 bg-slate-900 p-5 sm:p-6">
            <SectionTitle
              eyebrow="TRAFFIC SOURCE"
              title="유입 경로"
              description="방문자가 사이트를 발견한 경로입니다."
            />

            <div className="mt-7 space-y-5">
              {trafficSources.map((source) => (
                <div key={source.name}>
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-black text-white">
                        {source.name}
                      </p>

                      <p className="text-xs text-slate-500">
                        방문자 {source.visitors}명
                      </p>
                    </div>

                    <p className="text-sm font-black text-slate-200">
                      {source.percentage}%
                    </p>
                  </div>

                  <div className="h-2.5 overflow-hidden rounded-full bg-slate-800">
                    <div
                      className="h-full rounded-full bg-blue-500"
                      style={{
                        width: `${source.percentage}%`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </article>
        </section>

        {/* 인기 페이지 */}
        <section className="mt-7 rounded-2xl border border-slate-800 bg-slate-900 p-5 sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <SectionTitle
              eyebrow="TOP CONTENT"
              title="인기 콘텐츠"
              description="오늘 가장 많이 조회된 페이지입니다."
            />

            <button
              type="button"
              className="text-left text-sm font-black text-blue-400 hover:text-blue-300"
            >
              전체 콘텐츠 분석 →
            </button>
          </div>

          <div className="mt-6 overflow-x-auto">
            <table className="w-full min-w-[720px] border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-left">
                  <th className="px-3 py-3 text-xs font-black text-slate-500">
                    순위
                  </th>
                  <th className="px-3 py-3 text-xs font-black text-slate-500">
                    콘텐츠
                  </th>
                  <th className="px-3 py-3 text-right text-xs font-black text-slate-500">
                    조회수
                  </th>
                  <th className="px-3 py-3 text-right text-xs font-black text-slate-500">
                    평균 체류
                  </th>
                </tr>
              </thead>

              <tbody>
                {popularPages.map((page) => (
                  <tr
                    key={page.path}
                    className="border-b border-slate-800/70 last:border-0"
                  >
                    <td className="px-3 py-4">
                      <span
                        className={`inline-flex h-8 w-8 items-center justify-center rounded-lg text-sm font-black ${
                          page.rank === 1
                            ? 'bg-amber-950 text-amber-300'
                            : 'bg-slate-800 text-slate-300'
                        }`}
                      >
                        {page.rank}
                      </span>
                    </td>

                    <td className="px-3 py-4">
                      <p className="font-black text-white">
                        {page.title}
                      </p>

                      <p className="mt-1 text-xs text-slate-500">
                        {page.path}
                      </p>
                    </td>

                    <td className="px-3 py-4 text-right font-black text-slate-200">
                      {page.views.toLocaleString()}
                    </td>

                    <td className="px-3 py-4 text-right font-black text-slate-200">
                      {page.averageTime}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* 검색어 + 급상승 */}
        <section className="mt-7 grid grid-cols-1 gap-6 xl:grid-cols-[1.35fr_0.65fr]">
          {/* 검색어 */}
          <article className="rounded-2xl border border-slate-800 bg-slate-900 p-5 sm:p-6">
            <SectionTitle
              eyebrow="SEARCH KEYWORDS"
              title="유입 검색어"
              description="방문자가 검색한 주요 키워드입니다."
            />

            <div className="mt-6 space-y-3">
              {searchKeywords.map((item) => (
                <div
                  key={`${item.source}-${item.keyword}`}
                  className="flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-950/60 p-4"
                >
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-800 text-sm font-black text-slate-300">
                    {item.rank}
                  </span>

                  <div className="min-w-0 flex-1">
                    <p className="truncate font-black text-white">
                      {item.keyword}
                    </p>

                    <div className="mt-1 flex items-center gap-2">
                      <span
                        className={`rounded-full px-2 py-0.5 text-[11px] font-black ${
                          item.source === 'Google'
                            ? 'bg-blue-950 text-blue-300'
                            : 'bg-emerald-950 text-emerald-300'
                        }`}
                      >
                        {item.source}
                      </span>

                      <span className="text-xs text-slate-500">
                        방문 {item.visits}
                      </span>
                    </div>
                  </div>

                  <span
                    className={`text-sm font-black ${
                      item.change >= 0
                        ? 'text-emerald-300'
                        : 'text-rose-300'
                    }`}
                  >
                    {item.change >= 0 ? '▲' : '▼'}{' '}
                    {Math.abs(item.change)}%
                  </span>
                </div>
              ))}
            </div>
          </article>

          {/* 급상승 */}
          <article className="rounded-2xl border border-slate-800 bg-slate-900 p-5 sm:p-6">
            <SectionTitle
              eyebrow="RISING"
              title="급상승 콘텐츠"
              description="최근 유입이 빠르게 증가한 페이지입니다."
            />

            <div className="mt-6 rounded-2xl border border-emerald-800/60 bg-emerald-950/30 p-5">
              <p className="text-xs font-black uppercase tracking-[0.15em] text-emerald-300">
                TOP RISING
              </p>

              <h3 className="mt-3 text-lg font-black leading-7 text-white">
                ISA 배당금 세금 총정리
              </h3>

              <p className="mt-2 text-sm text-slate-400">
                최근 7일 검색 유입
              </p>

              <p className="mt-1 text-4xl font-black text-emerald-300">
                +84%
              </p>

              <div className="mt-5 border-t border-emerald-900 pt-4">
                <p className="text-xs font-bold text-slate-400">
                  성장 원인
                </p>

                <p className="mt-2 text-sm leading-6 text-slate-200">
                  Google에서 ‘ISA 배당금 세금’ 관련
                  노출이 빠르게 증가하고 있습니다.
                </p>
              </div>

              <button
                type="button"
                className="mt-5 w-full rounded-xl border border-emerald-700 bg-emerald-900/60 px-4 py-3 text-sm font-black text-emerald-100 hover:bg-emerald-800"
              >
                SEO 강화하기
              </button>
            </div>
          </article>
        </section>

        {/* 연결 상태 */}
        <section className="mt-7 rounded-2xl border border-slate-800 bg-slate-900 p-5 sm:p-6">
          <SectionTitle
            eyebrow="DATA CONNECTION"
            title="데이터 연결 상태"
            description="외부 분석 서비스 연동 현황입니다."
          />

          <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            {[
              {
                name: 'Google Analytics',
                description: '방문자·체류·행동',
              },
              {
                name: 'Search Console',
                description: '검색어·노출·순위',
              },
              {
                name: 'Naver',
                description: '네이버 검색 데이터',
              },
              {
                name: 'Supabase',
                description: '자체 행동 이벤트',
              },
            ].map((service) => (
              <div
                key={service.name}
                className="rounded-xl border border-slate-800 bg-slate-950/60 p-4"
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="font-black text-white">
                    {service.name}
                  </p>

                  <span className="rounded-full bg-slate-800 px-2.5 py-1 text-[11px] font-black text-slate-400">
                    연결 전
                  </span>
                </div>

                <p className="mt-2 text-xs text-slate-500">
                  {service.description}
                </p>
              </div>
            ))}
          </div>
        </section>

        <footer className="mt-8 pb-5 text-center text-xs text-slate-600">
          HOHAENG OS · Analytics Dashboard v0.1
        </footer>
      </div>
    </main>
  );
}