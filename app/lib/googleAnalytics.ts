import 'server-only';

import { BetaAnalyticsDataClient } from '@google-analytics/data';

export type AnalyticsPeriod = 7 | 30 | 90;

const propertyId = process.env.GA4_PROPERTY_ID;
const clientEmail = process.env.GOOGLE_CLIENT_EMAIL;
const privateKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n');

function getAnalyticsClient() {
  if (!propertyId) throw new Error('GA4_PROPERTY_ID 환경변수가 없습니다.');
  if (!clientEmail) throw new Error('GOOGLE_CLIENT_EMAIL 환경변수가 없습니다.');
  if (!privateKey) throw new Error('GOOGLE_PRIVATE_KEY 환경변수가 없습니다.');

  return new BetaAnalyticsDataClient({
    credentials: { client_email: clientEmail, private_key: privateKey },
  });
}

const numberValue = (value?: string | null) => Number(value ?? 0);

export async function getAnalyticsData(days: AnalyticsPeriod = 30) {
  const client = getAnalyticsClient();
  const currentRange = { startDate: `${days}daysAgo`, endDate: 'today' };
  const previousRange = {
    startDate: `${days * 2}daysAgo`,
    endDate: `${days + 1}daysAgo`,
  };

  const [summary, pages, daily, events, sources] = await Promise.all([
    client.runReport({
      property: `properties/${propertyId}`,
      dateRanges: [currentRange, previousRange],
      dimensions: [{ name: 'dateRange' }],
      metrics: [
        { name: 'activeUsers' },
        { name: 'sessions' },
        { name: 'screenPageViews' },
        { name: 'averageSessionDuration' },
        { name: 'engagementRate' },
      ],
    }),
    client.runReport({
      property: `properties/${propertyId}`,
      dateRanges: [currentRange],
      dimensions: [{ name: 'pagePath' }, { name: 'pageTitle' }],
      metrics: [
        { name: 'screenPageViews' },
        { name: 'activeUsers' },
        { name: 'userEngagementDuration' },
      ],
      orderBys: [{ metric: { metricName: 'screenPageViews' }, desc: true }],
      limit: 10,
    }),
    client.runReport({
      property: `properties/${propertyId}`,
      dateRanges: [currentRange],
      dimensions: [{ name: 'date' }],
      metrics: [{ name: 'activeUsers' }, { name: 'screenPageViews' }],
      orderBys: [{ dimension: { dimensionName: 'date' } }],
    }),
    client.runReport({
      property: `properties/${propertyId}`,
      dateRanges: [currentRange],
      dimensions: [{ name: 'eventName' }],
      metrics: [{ name: 'eventCount' }],
      dimensionFilter: {
        filter: {
          fieldName: 'eventName',
          inListFilter: { values: ['article_scroll', 'internal_link_click'] },
        },
      },
    }),
    client.runReport({
      property: `properties/${propertyId}`,
      dateRanges: [currentRange],
      dimensions: [{ name: 'sessionDefaultChannelGroup' }],
      metrics: [{ name: 'sessions' }],
      orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
      limit: 8,
    }),
  ]);

  const summaryRows = summary[0].rows ?? [];
  const readSummary = (range: string) => {
    const row = summaryRows.find((item) => item.dimensionValues?.[0]?.value === range);
    const values = row?.metricValues ?? [];
    return {
      activeUsers: numberValue(values[0]?.value),
      sessions: numberValue(values[1]?.value),
      pageViews: numberValue(values[2]?.value),
      averageSessionDuration: numberValue(values[3]?.value),
      engagementRate: numberValue(values[4]?.value),
    };
  };

  const current = readSummary('date_range_0');
  const previous = readSummary('date_range_1');
  const percentChange = (now: number, before: number) =>
    before === 0 ? (now > 0 ? 100 : 0) : ((now - before) / before) * 100;

  const popularPosts =
    pages[0].rows?.map((row) => {
      const views = numberValue(row.metricValues?.[0]?.value);
      const users = numberValue(row.metricValues?.[1]?.value);
      const engagementSeconds = numberValue(row.metricValues?.[2]?.value);
      return {
        path: row.dimensionValues?.[0]?.value ?? '',
        title: row.dimensionValues?.[1]?.value || '제목 없음',
        views,
        users,
        averageTime: users > 0 ? engagementSeconds / users : 0,
      };
    }) ?? [];

  const eventRows = events[0].rows ?? [];
  const eventCount = (name: string) =>
    numberValue(
      eventRows.find((row) => row.dimensionValues?.[0]?.value === name)
        ?.metricValues?.[0]?.value
    );

  const rawSources =
    sources[0].rows?.map((row) => ({
      name: row.dimensionValues?.[0]?.value || '기타',
      sessions: numberValue(row.metricValues?.[0]?.value),
    })) ?? [];
  const totalSourceSessions = rawSources.reduce((sum, item) => sum + item.sessions, 0);

  return {
    days,
    summary: current,
    changes: {
      activeUsers: percentChange(current.activeUsers, previous.activeUsers),
      sessions: percentChange(current.sessions, previous.sessions),
      pageViews: percentChange(current.pageViews, previous.pageViews),
      duration: percentChange(
        current.averageSessionDuration,
        previous.averageSessionDuration
      ),
    },
    popularPosts,
    dailyData:
      daily[0].rows?.map((row) => ({
        date: row.dimensionValues?.[0]?.value ?? '',
        users: numberValue(row.metricValues?.[0]?.value),
        views: numberValue(row.metricValues?.[1]?.value),
      })) ?? [],
    trafficSources: rawSources.map((source) => ({
      ...source,
      percentage:
        totalSourceSessions > 0 ? (source.sessions / totalSourceSessions) * 100 : 0,
    })),
    events: {
      articleScroll: eventCount('article_scroll'),
      internalLinkClick: eventCount('internal_link_click'),
    },
  };
}