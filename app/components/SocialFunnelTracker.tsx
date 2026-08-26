"use client";

import { useEffect } from "react";

type GtagWindow = Window & {
  gtag?: (...args: unknown[]) => void;
};

export default function SocialFunnelTracker({ source }: { source: string }) {
  useEffect(() => {
    (window as GtagWindow).gtag?.("event", "social_funnel_landing", {
      source,
      page_path: window.location.pathname,
      page_location: window.location.href,
    });
  }, [source]);

  return null;
}
