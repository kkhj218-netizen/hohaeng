import "server-only";

import { unstable_cache } from "next/cache";
import * as core from "./usMarketClose";

export type { UsMarketCloseDashboard, UsMarketCloseQuote } from "./usMarketClose";

const loadUsMarketCloseDashboard = unstable_cache(
  async () => core.getUsMarketCloseDashboard(),
  ["hohaeng-us-market-close-v1"],
  {
    revalidate: 900,
    tags: ["hohaeng-us-market-close"],
  },
);

/**
 * 현물 4개 + 선물 4개를 묶어 계산한 결과를 15분 동안 공유한다.
 * 장마감 기준 데이터라 방문자마다 외부 시세를 다시 계산할 필요가 없다.
 */
export async function getUsMarketCloseDashboard() {
  return loadUsMarketCloseDashboard();
}
