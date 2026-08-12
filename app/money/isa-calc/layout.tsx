import type { Metadata } from 'next';

import { SITE_NAME } from '@/app/lib/site';

const title = 'ISA 절세 효과 계산기 | 일반계좌 세금 비교 | 호행처럼';
const description =
  '투자금, 기간, 예상 수익률을 입력해 일반계좌와 ISA 계좌의 예상 세금 및 절세 효과를 비교합니다.';

export const metadata: Metadata = {
  title,
  description,
  alternates: {
    canonical: '/money/isa-calc',
  },
  robots: {
    index: true,
    follow: true,
  },
  openGraph: {
    title,
    description,
    url: '/money/isa-calc',
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

export default function IsaCalculatorLayout({ children }: { children: React.ReactNode }) {
  return children;
}
