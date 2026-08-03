import Link from "next/link";

import {
  getAnalyticsData,
  type AnalyticsPeriod,
} from "@/app/lib/googleAnalytics";
import { getSearchConsoleData } from "@/app/lib/googleSearchConsole";
import {
  getSupabaseAnalytics,
  type SupabaseAnalyticsData,
} from "@/app/lib/supabaseAnalytics";

export const dynamic = "force-dynamic";

type SearchConsoleData = Awaited<ReturnType<typeof getSearchConsoleData>>;

type SearchConsoleResult = {
  data: SearchConsoleData;
  error: string;
};

type SupabaseResult = {
  data: SupabaseAnalyticsData;
  error: string;
};

const emptySupabaseData: SupabaseAnalyticsData = {
  connected: false,
  totalPosts: 0,
  totalViews: 0,
  categoryCount: 0,
  recentPosts: [],
  popularPosts: [],
};

const formatNumber = (value: number) =>
  new Intl.NumberFormat("ko-KR").format(value);

function formatDuration(seconds: number) {
  const rounded = Math.round(seconds);
  return `${Math.floor(rounded / 60)}분 ${rounded % 60}초`;
}

function formatDate(value: string) {
  return value.length === 8
    ? `${value.slice(4, 6)}.${value.slice(6, 8)}`
    : value;
}

function changeText(value: number) {
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(1)}%`;
}

function MetricCard({
  label,
  value,
  change,
  description,
}: {
  label: string;
  value: string;
  change: number;
  description: string;
}) {
  return (
    <article className="rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-bold text-slate-400">{label}</p>
        <span
          className={`rounded-full px-2.5 py-1 text-xs font-black ${
            change >= 0
              ? "bg-emerald-950 text-emerald-300"
              : "bg-rose-950 text-rose-300"
          }`}
        >
          {changeText(change)}
        </span>
      </div>
      <p className="mt-5 text-3xl font-black tracking-tight text-white">
        {value}
      </p>
      <p className="mt-2 text-xs text-slate-500">{description}</p>
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
      <h2 className="mt-1 text-xl font-black text-white">{title}</h2>
      {description && (
        <p className="mt-1 text-sm text-slate-400">{description}</p>
      )}
    </div>
  );
}

export default async function AdminAnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{ days?: string }>;
}) {
  const params = await searchParams;
  const days: AnalyticsPeriod =
    params.days === "7" || params.days === "90"
      ? (Number(params.days) as AnalyticsPeriod)
      : 30;

  try {
    const searchConsoleRequest: Promise<SearchConsoleResult> =
      getSearchConsoleData(days)
        .then((value) => ({ data: value, error: "" }))
        .catch((error: unknown) => ({
          data: { connected: false, keywords: [] },
          error:
            error instanceof Error ? error.message : "알 수 없는 연결 오류",
        }));

    const supabaseRequest: Promise<SupabaseResult> = getSupabaseAnalytics()
      .then((value) => ({ data: value, error: "" }))
      .catch((error: unknown) => ({
        data: emptySupabaseData,
        error: error instanceof Error ? error.message : "알 수 없는 연결 오류",
      }));

    const [data, searchResult, supabaseResult] = await Promise.all([
      getAnalyticsData(days),
      searchConsoleRequest,
      supabaseRequest,
    ]);
    const searchData = searchResult.data;
    const supabaseData = supabaseResult.data;
    const maxViews = Math.max(...data.dailyData.map((item) => item.views), 1);
    const bestPost = data.popularPosts[0];

    return (
      <main className="min-h-screen bg-slate-950 px-4 py-6 text-slate-100 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <header className="mb-8 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.2em] text-blue-400">
                HOHAENG OS
              </p>
              <h1 className="mt-2 text-3xl font-black tracking-tight text-white sm:text-4xl">
                📊 Analytics Dashboard
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-400">
                실제 Google Analytics 데이터를 이용한 통합 방문 분석 화면입니다.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {([7, 30, 90] as const).map((period) => (
                <Link
                  key={period}
                  href={`/admin/analytics?days=${period}`}
                  className={`rounded-xl px-4 py-3 text-sm font-black transition ${
                    days === period
                      ? "bg-blue-600 text-white"
                      : "border border-slate-800 bg-slate-900 text-slate-300 hover:border-blue-500"
                  }`}
                >
                  최근 {period}일
                </Link>
              ))}
              <Link
                href="/admin"
                className="rounded-xl border border-slate-700 px-4 py-3 text-sm font-black text-slate-200"
              >
                ← 관리자 센터
              </Link>
            </div>
          </header>

          <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              label="활성 사용자"
              value={formatNumber(data.summary.activeUsers)}
              change={data.changes.activeUsers}
              description={`이전 ${days}일 대비`}
            />
            <MetricCard
              label="세션"
              value={formatNumber(data.summary.sessions)}
              change={data.changes.sessions}
              description="사이트 방문 횟수"
            />
            <MetricCard
              label="페이지 조회수"
              value={formatNumber(data.summary.pageViews)}
              change={data.changes.pageViews}
              description="전체 페이지 조회수"
            />
            <MetricCard
              label="평균 체류시간"
              value={formatDuration(data.summary.averageSessionDuration)}
              change={data.changes.duration}
              description={`참여율 ${(data.summary.engagementRate * 100).toFixed(1)}%`}
            />
          </section>

          <section className="mt-7 overflow-hidden rounded-2xl border border-blue-800/70 bg-gradient-to-br from-blue-950/80 via-slate-900 to-slate-900 p-6">
            <p className="text-xs font-black uppercase tracking-[0.2em] text-blue-300">
              AI INSIGHT
            </p>
            <h2 className="mt-2 text-xl font-black text-white">
              {data.changes.activeUsers >= 0
                ? `방문자가 이전 기간보다 ${Math.abs(data.changes.activeUsers).toFixed(1)}% 증가했습니다.`
                : `방문자가 이전 기간보다 ${Math.abs(data.changes.activeUsers).toFixed(1)}% 감소했습니다.`}
            </h2>
            <p className="mt-3 text-sm leading-7 text-slate-300">
              {bestPost
                ? `현재 가장 많이 읽힌 콘텐츠는 “${bestPost.title}”이며 ${formatNumber(bestPost.views)}회 조회되었습니다.`
                : "데이터가 쌓이면 성과가 좋은 콘텐츠를 이곳에서 바로 확인할 수 있습니다."}
            </p>
          </section>

          <section className="mt-7 grid grid-cols-1 gap-6 xl:grid-cols-[1.5fr_1fr]">
            <article className="rounded-2xl border border-slate-800 bg-slate-900 p-5 sm:p-6">
              <SectionTitle
                eyebrow="VISITOR TREND"
                title={`최근 ${days}일 조회 추세`}
                description="날짜별 페이지 조회수와 활성 사용자입니다."
              />
              {data.dailyData.length === 0 ? (
                <EmptyState text="아직 일별 데이터가 없습니다." />
              ) : (
                <div className="mt-8 flex h-64 items-end gap-2 overflow-x-auto pb-2">
                  {data.dailyData.map((item) => (
                    <div
                      key={item.date}
                      className="flex min-w-8 flex-1 flex-col items-center justify-end"
                    >
                      <span className="mb-2 text-xs font-black text-slate-300">
                        {item.views}
                      </span>
                      <div className="flex h-44 w-full items-end rounded-t-lg bg-slate-950 px-1 pt-2">
                        <div
                          title={`사용자 ${item.users}명`}
                          className="w-full rounded-t-md bg-blue-500"
                          style={{
                            height: `${Math.max((item.views / maxViews) * 100, 4)}%`,
                          }}
                        />
                      </div>
                      <span className="mt-3 whitespace-nowrap text-[10px] font-bold text-slate-500">
                        {formatDate(item.date)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </article>

            <article className="rounded-2xl border border-slate-800 bg-slate-900 p-5 sm:p-6">
              <SectionTitle
                eyebrow="TRAFFIC SOURCE"
                title="유입 경로"
                description="GA4가 분류한 방문 세션 경로입니다."
              />
              {data.trafficSources.length === 0 ? (
                <EmptyState text="아직 유입 경로 데이터가 없습니다." />
              ) : (
                <div className="mt-7 space-y-5">
                  {data.trafficSources.map((source) => (
                    <div key={source.name}>
                      <div className="mb-2 flex items-center justify-between gap-3">
                        <div>
                          <p className="text-sm font-black text-white">
                            {source.name}
                          </p>
                          <p className="text-xs text-slate-500">
                            세션 {formatNumber(source.sessions)}회
                          </p>
                        </div>
                        <p className="text-sm font-black text-slate-200">
                          {source.percentage.toFixed(1)}%
                        </p>
                      </div>
                      <div className="h-2.5 overflow-hidden rounded-full bg-slate-800">
                        <div
                          className="h-full rounded-full bg-blue-500"
                          style={{ width: `${source.percentage}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </article>
          </section>

          <section className="mt-7 rounded-2xl border border-slate-800 bg-slate-900 p-5 sm:p-6">
            <SectionTitle
              eyebrow="TOP CONTENT"
              title="인기 콘텐츠 TOP 10"
              description={`최근 ${days}일 조회수가 높은 페이지입니다.`}
            />
            {data.popularPosts.length === 0 ? (
              <EmptyState text="아직 인기 콘텐츠 데이터가 없습니다." />
            ) : (
              <div className="mt-6 overflow-x-auto">
                <table className="w-full min-w-[760px] border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800 text-left">
                      <th className="px-3 py-3 text-xs text-slate-500">순위</th>
                      <th className="px-3 py-3 text-xs text-slate-500">
                        콘텐츠
                      </th>
                      <th className="px-3 py-3 text-right text-xs text-slate-500">
                        조회수
                      </th>
                      <th className="px-3 py-3 text-right text-xs text-slate-500">
                        사용자
                      </th>
                      <th className="px-3 py-3 text-right text-xs text-slate-500">
                        평균 참여
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.popularPosts.map((post, index) => (
                      <tr
                        key={`${post.path}-${index}`}
                        className="border-b border-slate-800/70 last:border-0"
                      >
                        <td className="px-3 py-4 font-black text-blue-300">
                          {index + 1}
                        </td>
                        <td className="px-3 py-4">
                          <p className="max-w-xl truncate font-black text-white">
                            {post.title}
                          </p>
                          <p className="mt-1 max-w-xl truncate text-xs text-slate-500">
                            {post.path}
                          </p>
                        </td>
                        <td className="px-3 py-4 text-right font-black">
                          {formatNumber(post.views)}
                        </td>
                        <td className="px-3 py-4 text-right text-slate-300">
                          {formatNumber(post.users)}
                        </td>
                        <td className="px-3 py-4 text-right text-slate-300">
                          {formatDuration(post.averageTime)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section className="mt-7 rounded-2xl border border-slate-800 bg-slate-900 p-5 sm:p-6">
            <SectionTitle
              eyebrow="CONTENT DATABASE"
              title="Supabase 콘텐츠 현황"
              description="게시글 데이터베이스에 저장된 실제 콘텐츠 통계입니다."
            />
            {supabaseResult.error ? (
              <div className="mt-6 rounded-xl border border-rose-800/60 bg-rose-950/30 p-5 text-sm leading-6 text-rose-100/80">
                Supabase 연결 오류: {supabaseResult.error}
              </div>
            ) : (
              <>
                <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <DatabaseMetric
                    label="전체 게시글"
                    value={`${formatNumber(supabaseData.totalPosts)}개`}
                    description="현재 저장된 콘텐츠"
                  />
                  <DatabaseMetric
                    label="누적 조회수"
                    value={`${formatNumber(supabaseData.totalViews)}회`}
                    description="게시글 자체 조회수 합계"
                  />
                  <DatabaseMetric
                    label="활성 카테고리"
                    value={`${formatNumber(supabaseData.categoryCount)}개`}
                    description="글이 등록된 카테고리"
                  />
                </div>

                <div className="mt-7">
                  <h3 className="text-base font-black text-white">
                    조회수 높은 글 TOP 5
                  </h3>
                  {supabaseData.popularPosts.length === 0 ? (
                    <EmptyState text="아직 등록된 게시글이 없습니다." />
                  ) : (
                    <div className="mt-4 overflow-x-auto">
                      <table className="w-full min-w-[620px] border-collapse">
                        <thead>
                          <tr className="border-b border-slate-800 text-left">
                            <th className="px-3 py-3 text-xs text-slate-500">
                              순위
                            </th>
                            <th className="px-3 py-3 text-xs text-slate-500">
                              콘텐츠
                            </th>
                            <th className="px-3 py-3 text-xs text-slate-500">
                              카테고리
                            </th>
                            <th className="px-3 py-3 text-right text-xs text-slate-500">
                              조회수
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {supabaseData.popularPosts.map((post, index) => (
                            <tr
                              key={post.slug}
                              className="border-b border-slate-800/70 last:border-0"
                            >
                              <td className="px-3 py-4 font-black text-emerald-300">
                                {index + 1}
                              </td>
                              <td className="px-3 py-4">
                                <p className="font-black text-white">
                                  {post.title || "제목 없는 글"}
                                </p>
                                <p className="mt-1 text-xs text-slate-500">
                                  {post.slug}
                                </p>
                              </td>
                              <td className="px-3 py-4 text-sm text-slate-400">
                                {post.category || "미분류"}
                              </td>
                              <td className="px-3 py-4 text-right font-black text-emerald-300">
                                {formatNumber(post.view_count ?? 0)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </>
            )}
          </section>

          <section className="mt-7 grid grid-cols-1 gap-6 lg:grid-cols-2">
            <article className="rounded-2xl border border-slate-800 bg-slate-900 p-5 sm:p-6">
              <SectionTitle
                eyebrow="CONTENT ACTION"
                title="콘텐츠 반응"
                description="사이트에서 직접 설정한 행동 이벤트입니다."
              />
              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                <EventCard
                  label="📖 글 스크롤"
                  value={data.events.articleScroll}
                />
                <EventCard
                  label="🔗 내부 링크 클릭"
                  value={data.events.internalLinkClick}
                />
              </div>
            </article>

            <article className="rounded-2xl border border-slate-800 bg-slate-900 p-5 sm:p-6">
              <SectionTitle
                eyebrow="SEARCH KEYWORDS"
                title="유입 검색어"
                description={`Google Search Console 기준 최근 ${days}일 성과입니다.`}
              />
              {searchResult.error ? (
                <div className="mt-6 rounded-xl border border-rose-800/60 bg-rose-950/30 p-5 text-sm leading-6 text-rose-100/80">
                  Search Console 연결 오류: {searchResult.error}
                </div>
              ) : searchData.keywords.length === 0 ? (
                <EmptyState text="연결은 완료됐지만 아직 표시할 검색어 데이터가 없습니다." />
              ) : (
                <div className="mt-6 overflow-x-auto">
                  <table className="w-full min-w-[560px] border-collapse">
                    <thead>
                      <tr className="border-b border-slate-800 text-left">
                        <th className="px-2 py-3 text-xs text-slate-500">
                          검색어
                        </th>
                        <th className="px-2 py-3 text-right text-xs text-slate-500">
                          클릭
                        </th>
                        <th className="px-2 py-3 text-right text-xs text-slate-500">
                          노출
                        </th>
                        <th className="px-2 py-3 text-right text-xs text-slate-500">
                          CTR
                        </th>
                        <th className="px-2 py-3 text-right text-xs text-slate-500">
                          순위
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {searchData.keywords.map((keyword) => (
                        <tr
                          key={keyword.query}
                          className="border-b border-slate-800/70 last:border-0"
                        >
                          <td className="max-w-64 truncate px-2 py-3 font-bold text-white">
                            {keyword.query}
                          </td>
                          <td className="px-2 py-3 text-right font-black text-blue-300">
                            {formatNumber(keyword.clicks)}
                          </td>
                          <td className="px-2 py-3 text-right text-slate-300">
                            {formatNumber(keyword.impressions)}
                          </td>
                          <td className="px-2 py-3 text-right text-slate-300">
                            {(keyword.ctr * 100).toFixed(1)}%
                          </td>
                          <td className="px-2 py-3 text-right text-slate-300">
                            {keyword.position.toFixed(1)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </article>
          </section>

          <section className="mt-7 rounded-2xl border border-slate-800 bg-slate-900 p-5 sm:p-6">
            <SectionTitle
              eyebrow="DATA CONNECTION"
              title="데이터 연결 상태"
              description="외부 분석 서비스 연동 현황입니다."
            />
            <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
              <Connection
                name="Google Analytics"
                description="방문자·체류·행동"
                connected
              />
              <Connection
                name="Search Console"
                description="검색어·노출·순위"
                connected={searchData.connected}
              />
              <Connection name="Naver" description="네이버 검색 데이터" />
              <Connection
                name="Supabase"
                description="게시글·조회수·카테고리"
                connected={supabaseData.connected}
              />
            </div>
          </section>

          <footer className="mt-8 pb-5 text-center text-xs text-slate-600">
            HOHAENG OS · Analytics Dashboard
          </footer>
        </div>
      </main>
    );
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "알 수 없는 오류가 발생했습니다.";
    return (
      <main className="min-h-screen bg-slate-950 px-4 py-10 text-slate-100">
        <div className="mx-auto max-w-2xl rounded-2xl border border-red-900/70 bg-red-950/30 p-7">
          <p className="text-sm font-semibold text-red-400">GA4 연결 오류</p>
          <h1 className="mt-2 text-2xl font-bold">
            방문 분석 데이터를 불러오지 못했습니다
          </h1>
          <p className="mt-4 rounded-xl bg-slate-950 p-4 text-sm text-slate-300">
            {message}
          </p>
          <Link
            href="/admin"
            className="mt-6 inline-block rounded-xl border border-slate-700 px-4 py-2 text-sm"
          >
            ← 관리자 센터
          </Link>
        </div>
      </main>
    );
  }
}

function EventCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-4">
      <p className="text-sm font-semibold">{label}</p>
      <strong className="mt-3 block text-2xl text-emerald-400">
        {formatNumber(value)}
      </strong>
    </div>
  );
}

function DatabaseMetric({
  label,
  value,
  description,
}: {
  label: string;
  value: string;
  description: string;
}) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-5">
      <p className="text-sm font-bold text-slate-400">{label}</p>
      <strong className="mt-3 block text-2xl font-black text-emerald-300">
        {value}
      </strong>
      <p className="mt-2 text-xs text-slate-500">{description}</p>
    </div>
  );
}

function Connection({
  name,
  description,
  connected = false,
}: {
  name: string;
  description: string;
  connected?: boolean;
}) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="font-black text-white">{name}</p>
        <span
          className={`rounded-full px-2.5 py-1 text-[11px] font-black ${connected ? "bg-emerald-950 text-emerald-300" : "bg-slate-800 text-slate-400"}`}
        >
          {connected ? "연결됨" : "연결 전"}
        </span>
      </div>
      <p className="mt-2 text-xs text-slate-500">{description}</p>
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="mt-6 flex min-h-40 items-center justify-center rounded-xl border border-dashed border-slate-700 px-4 text-center text-sm text-slate-500">
      {text}
    </div>
  );
}