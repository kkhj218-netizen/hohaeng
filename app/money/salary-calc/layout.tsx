import type { Metadata } from 'next';

import { SITE_NAME } from '@/app/lib/site';

const title = '2026년 연봉 실수령액 계산기 | 호행처럼';
const description =
  '2026년 4대보험 요율과 근로소득 간이세액표를 반영해 연봉별 예상 월 실수령액과 공제 항목을 계산합니다.';

export const metadata: Metadata = {
  title,
  description,
  alternates: {
    canonical: '/money/salary-calc',
  },
  robots: {
    index: true,
    follow: true,
  },
  openGraph: {
    title,
    description,
    url: '/money/salary-calc',
    siteName: SITE_NAME,
    locale: 'ko_KR',
    type: 'website',
  },
  twitter: {
    card: 'summary',
    title,
    description,
  },
};

export default function SalaryCalculatorLayout({ children }: { children: React.ReactNode }) {
  return children;
}
