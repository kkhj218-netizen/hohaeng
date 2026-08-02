'use client';

import { useEffect } from 'react';

type EngagementTrackerProps = {
  title: string;
  slug: string;
};

type GtagWindow = Window & {
  gtag?: (
    command: 'event',
    eventName: string,
    eventParameters: Record<
      string,
      string | number
    >
  ) => void;
};

export default function EngagementTracker({
  title,
  slug,
}: EngagementTrackerProps) {
  useEffect(() => {
    const trackedDepths =
      new Set<number>();

    const sendEvent = (
      eventName: string,
      parameters: Record<
        string,
        string | number
      >
    ) => {
      const analyticsWindow =
        window as GtagWindow;

      analyticsWindow.gtag?.(
        'event',
        eventName,
        parameters
      );
    };

    const handleScroll = () => {
      const documentHeight =
        document.documentElement
          .scrollHeight;

      const viewportHeight =
        window.innerHeight;

      const scrollableHeight =
        documentHeight -
        viewportHeight;

      if (scrollableHeight <= 0) {
        return;
      }

      const scrollPercent =
        Math.min(
          100,
          Math.round(
            (window.scrollY /
              scrollableHeight) *
              100
          )
        );

      const depths = [
        25,
        50,
        75,
        90,
      ];

      depths.forEach(
        (depth) => {
          if (
            scrollPercent >= depth &&
            !trackedDepths.has(depth)
          ) {
            trackedDepths.add(depth);

            sendEvent(
              'article_scroll',
              {
                article_title:
                  title,
                article_slug:
                  slug,
                scroll_depth:
                  depth,
                page_path:
                  window.location
                    .pathname,
              }
            );
          }
        }
      );
    };

    const handleClick = (
      event: MouseEvent
    ) => {
      const target =
        event.target as
          | HTMLElement
          | null;

      const link =
        target?.closest(
          'a'
        ) as HTMLAnchorElement | null;

      if (!link) {
        return;
      }

      const destination =
        new URL(
          link.href,
          window.location.href
        );

      const isInternalLink =
        destination.origin ===
        window.location.origin;

      const isSamePageAnchor =
        destination.pathname ===
          window.location.pathname &&
        Boolean(
          destination.hash
        );

      if (
        !isInternalLink ||
        isSamePageAnchor
      ) {
        return;
      }

      sendEvent(
        'internal_link_click',
        {
          article_title:
            title,
          article_slug:
            slug,
          link_text:
            link.innerText
              .trim()
              .slice(0, 100) ||
            '텍스트 없음',
          link_url:
            destination.pathname +
            destination.search,
          page_path:
            window.location
              .pathname,
        }
      );
    };

    window.addEventListener(
      'scroll',
      handleScroll,
      {
        passive: true,
      }
    );

    document.addEventListener(
      'click',
      handleClick
    );

    handleScroll();

    return () => {
      window.removeEventListener(
        'scroll',
        handleScroll
      );

      document.removeEventListener(
        'click',
        handleClick
      );
    };
  }, [
    title,
    slug,
  ]);

  return null;
}