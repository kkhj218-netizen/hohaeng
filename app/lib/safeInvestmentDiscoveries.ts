import "server-only";

import { unstable_cache } from "next/cache";

import {
  getArchivedDisclosureItems,
} from "@/app/lib/disclosureArchive";
import {
  getInvestmentDiscoveryDashboard,
  type InvestmentDiscoveryDashboard,
} from "@/app/lib/dartInvestmentDiscoveries";
import {
  getDailyDisclosureFeed,
  type DisclosureDailyFeed,
  type DisclosureItem,
  type DisclosureSourceFeed,
} from "@/app/lib/disclosureHub";
import {
  getUsInvestmentDiscoveryDashboard,
  type UsInvestmentDiscoveryDashboard,
} from "@/app/lib/usInvestmentDiscoveries";

const LIVE_FEED_TIMEOUT_MS = 4_500;
const DEEP_ANALYSIS_TIMEOUT_MS = 3_500;
const SAFE_BUNDLE_CACHE_SECONDS = 30 * 60;

function dateInTimeZone(timeZone: string, value = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(value);
  const map = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${map.year}-${map.month}-${map.day}`;
}

async function settleWithin<T>(
  promise: Promise<T>,
  timeoutMs: number,
  label: string,
): Promise<{ value: T | null; error: string | null }> {
  let timeout: ReturnType<typeof setTimeout> | null = null;

  try {
    const value = await Promise.race([
      promise,
      new Promise<never>((_, reject) => {
        timeout = setTimeout(
          () => reject(new Error(`${label} ${timeoutMs}ms 초과`)),
          timeoutMs,
        );
      }),
    ]);
    return { value, error: null };
  } catch (error) {
    return {
      value: null,
      error: error instanceof Error ? error.message : String(error),
    };
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}

function latestArchivedSource(
  items: DisclosureItem[],
  market: "KR" | "US",
  archiveConfigured: boolean,
  archiveError: string | null,
): DisclosureSourceFeed {
  const marketItems = items.filter((item) => item.market === market);
  const sourceDate = marketItems
    .map((item) => item.filingDate)
    .filter(Boolean)
    .sort((left, right) => right.localeCompare(left))[0] ?? null;

  return {
    configured: archiveConfigured,
    sourceDate,
    items: sourceDate
      ? marketItems.filter((item) => item.filingDate === sourceDate)
      : [],
    error: archiveError,
  };
}

function emptySource(error: string | null): DisclosureSourceFeed {
  return {
    configured: true,
    sourceDate: null,
    items: [],
    error,
  };
}

async function loadFeedWithArchiveFallback(): Promise<DisclosureDailyFeed> {
  const archivePromise = getArchivedDisclosureItems(14, 1_200).catch((error) => ({
    configured: false,
    items: [] as DisclosureItem[],
    error: error instanceof Error ? error.message : String(error),
  }));

  const live = await settleWithin(
    getDailyDisclosureFeed(),
    LIVE_FEED_TIMEOUT_MS,
    "공시 기본 피드",
  );

  if (live.value) return live.value;

  const archive = await archivePromise;
  if (archive.configured && archive.items.length > 0) {
    return {
      generatedAt: new Date().toISOString(),
      korea: latestArchivedSource(
        archive.items,
        "KR",
        archive.configured,
        archive.error,
      ),
      us: latestArchivedSource(
        archive.items,
        "US",
        archive.configured,
        archive.error,
      ),
    };
  }

  return {
    generatedAt: new Date().toISOString(),
    korea: emptySource(live.error || archive.error),
    us: emptySource(live.error || archive.error),
  };
}

function normalizeTitle(value: string) {
  return value.replace(/\s+/g, "");
}

function fallbackKoreaDashboard(
  source: DisclosureSourceFeed,
  reason: string | null,
): InvestmentDiscoveryDashboard {
  const importantFilings = source.items.filter((item) => item.importance >= 70).length;
  const supplyContracts = source.items.filter((item) => {
    const title = normalizeTitle(item.title);
    return title.includes("단일판매") && title.includes("공급계약");
  }).length;
  const shareholderReturns = source.items.filter((item) => {
    const title = normalizeTitle(item.title);
    return (
      item.category === "shareholder" ||
      title.includes("주식소각") ||
      title.includes("자기주식취득") ||
      title.includes("배당")
    );
  }).length;

  return {
    configured: source.configured,
    sourceDate: source.sourceDate,
    generatedAt: new Date().toISOString(),
    stats: {
      importantFilings,
      supplyContracts,
      shareholderReturns,
      earningsSurge: 0,
      turnarounds: 0,
      ownershipChanges: source.items.filter((item) => item.category === "ownership").length,
    },
    items: [],
    analyzed: {
      earningsCandidates: Math.min(
        6,
        source.items.filter((item) => item.category === "earnings").length,
      ),
      ownershipCandidates: Math.min(
        8,
        source.items.filter((item) => item.category === "ownership").length,
      ),
    },
    costNote:
      "심층 숫자 분석이 늦어 기본 DART 공시를 먼저 표시하고 있습니다. 다음 캐시 갱신에서 실적 급증·흑자전환 결과를 다시 합칩니다.",
    error: source.error || reason,
  };
}

function fallbackUsDashboard(
  source: DisclosureSourceFeed,
  reason: string | null,
): UsInvestmentDiscoveryDashboard {
  return {
    configured: source.configured,
    sourceDate: source.sourceDate,
    generatedAt: new Date().toISOString(),
    stats: {
      importantFilings: source.items.filter((item) => item.importance >= 70).length,
      majorContracts: 0,
      shareholderReturns: 0,
      earningsSurge: 0,
      turnarounds: 0,
      ownershipChanges: source.items.filter((item) => item.category === "ownership").length,
    },
    items: [],
    analyzed: {
      earningsCandidates: Math.min(
        10,
        source.items.filter((item) => item.category === "earnings").length,
      ),
      eventCandidates: Math.min(
        12,
        source.items.filter((item) => item.category === "major").length,
      ),
    },
    costNote:
      "SEC 심층 분석이 늦어 기본 EDGAR 공시를 먼저 표시하고 있습니다. 다음 캐시 갱신에서 실적·계약·주주환원 탐지 결과를 다시 합칩니다.",
    error: source.error || reason,
  };
}

const loadSafeBundle = unstable_cache(
  async (_cacheDay: string) => {
    const feedPromise = loadFeedWithArchiveFallback();
    const koreaPromise = settleWithin(
      getInvestmentDiscoveryDashboard(),
      DEEP_ANALYSIS_TIMEOUT_MS,
      "DART 심층 분석",
    );
    const usPromise = settleWithin(
      getUsInvestmentDiscoveryDashboard(),
      DEEP_ANALYSIS_TIMEOUT_MS,
      "SEC 심층 분석",
    );

    const [feed, koreaResult, usResult] = await Promise.all([
      feedPromise,
      koreaPromise,
      usPromise,
    ]);

    return {
      feed,
      dashboard:
        koreaResult.value ??
        fallbackKoreaDashboard(feed.korea, koreaResult.error),
      usDashboard:
        usResult.value ?? fallbackUsDashboard(feed.us, usResult.error),
      degraded: Boolean(
        !koreaResult.value || !usResult.value || feed.korea.error || feed.us.error,
      ),
    };
  },
  ["hohaeng-safe-investment-discoveries-v1"],
  { revalidate: SAFE_BUNDLE_CACHE_SECONDS },
);

export async function getSafeInvestmentDiscoveryBundle() {
  // 같은 30분 구간에서는 외부 SEC/DART 상태와 상관없이 완성된 결과를 재사용한다.
  // 날짜를 키에 포함해 장기간 오래된 결과가 고정되지 않도록 한다.
  const cacheDay = dateInTimeZone("Asia/Seoul");
  return loadSafeBundle(cacheDay);
}
