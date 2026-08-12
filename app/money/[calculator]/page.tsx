import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { SITE_NAME, absoluteUrl } from '@/app/lib/site';
import {
  CALCULATORS,
  CALCULATOR_SLUGS,
  isCalculatorSlug,
} from '@/app/money/calculatorCatalog';

import FinanceCalculatorClient from './FinanceCalculatorClient';

type PageProps = {
  params: Promise<{
    calculator: string;
  }>;
};

export function generateStaticParams() {
  return CALCULATOR_SLUGS.map(
    (calculator) => ({
      calculator,
    })
  );
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { calculator } = await params;

  if (!isCalculatorSlug(calculator)) {
    return {
      title: '계산기를 찾을 수 없습니다 | 호행처럼',
      robots: {
        index: false,
        follow: false,
      },
    };
  }

  const definition =
    CALCULATORS[calculator];
  const path = `/money/${definition.slug}`;
  const url = absoluteUrl(path);

  return {
    title: `${definition.title} | 호행처럼`,
    description: definition.description,
    alternates: {
      canonical: path,
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        'max-image-preview': 'large',
        'max-snippet': -1,
        'max-video-preview': -1,
      },
    },
    openGraph: {
      title: definition.title,
      description: definition.description,
      url,
      siteName: SITE_NAME,
      locale: 'ko_KR',
      type: 'website',
    },
    twitter: {
      card: 'summary',
      title: definition.title,
      description: definition.description,
    },
  };
}

export default async function CalculatorPage({
  params,
}: PageProps) {
  const { calculator } = await params;

  if (!isCalculatorSlug(calculator)) {
    notFound();
  }

  return (
    <FinanceCalculatorClient
      calculator={calculator}
    />
  );
}
