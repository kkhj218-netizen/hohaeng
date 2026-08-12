import Link from 'next/link';

import { absoluteUrl } from '@/app/lib/site';

export type BreadcrumbItem = {
  name: string;
  href: string;
};

type BreadcrumbsProps = {
  items: BreadcrumbItem[];
  includeStructuredData?: boolean;
  className?: string;
};

export default function Breadcrumbs({
  items,
  includeStructuredData = true,
  className = '',
}: BreadcrumbsProps) {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: absoluteUrl(item.href),
    })),
  };

  return (
    <>
      {includeStructuredData && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c'),
          }}
        />
      )}

      <nav
        aria-label="현재 위치"
        className={`overflow-x-auto text-sm text-slate-500 ${className}`}
      >
        <ol className="flex min-w-max items-center gap-2">
          {items.map((item, index) => {
            const isCurrent = index === items.length - 1;

            return (
              <li key={`${item.href}-${item.name}`} className="flex items-center gap-2">
                {index > 0 && <span aria-hidden="true">›</span>}
                {isCurrent ? (
                  <span className="font-semibold text-slate-700" aria-current="page">
                    {item.name}
                  </span>
                ) : (
                  <Link href={item.href} className="font-semibold hover:text-blue-600">
                    {item.name}
                  </Link>
                )}
              </li>
            );
          })}
        </ol>
      </nav>
    </>
  );
}
