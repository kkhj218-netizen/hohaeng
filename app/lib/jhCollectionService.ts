import "server-only";

import {
  collectFredData,
  type FredCollectionRequestMode,
} from "@/app/lib/fredCollector";
import { archiveJhMarketDashboard } from "@/app/lib/jhMarketEngine";

export async function collectFredDataWithArchive(
  mode: FredCollectionRequestMode
) {
  const result = await collectFredData(mode);

  try {
    const dashboard = await archiveJhMarketDashboard(result.runId);
    return { ...result, archiveSaved: true as const, dashboard };
  } catch (error) {
    return {
      ...result,
      archiveSaved: false as const,
      archiveWarning:
        error instanceof Error
          ? error.message
          : "일별 Data Pack 보관에 실패했습니다.",
    };
  }
}
