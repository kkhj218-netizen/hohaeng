import type { ReactNode } from "react";

import MarketTabs from "./MarketTabs";

export default function TodayLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <MarketTabs />
      {children}
    </>
  );
}
