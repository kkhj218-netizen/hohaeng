import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import {
  CALCULATORS,
  CALCULATOR_SLUGS,
  isCalculatorSlug,
} from '@/app/money/calculatorCatalog';

import FinanceCalculatorClient from './FinanceCalculatorClient';

const BASE_URL = 'https://hohaeng.vercel.app';

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
    };
  }

  const definition =
    CALCULATORS[calculator];
  const url = `${BASE_URL}/money/${definition.slug}`;

  return {
    title: `${definition.title} | 호행처럼`,
    description: definition.description,
    alternates: {
      canonical: url,
    },
    openGraph: {
      title: definition.title,
      description: definition.description,
      url,
      siteName: '호행처럼',
      type: 'website',
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

