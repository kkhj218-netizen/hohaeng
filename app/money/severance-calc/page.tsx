import { Metadata } from 'next';
import SeveranceCalcClient from './SeveranceCalcClient';

export const metadata: Metadata = {
  title: '퇴직금 & 실수령액 계산기 | 호행처럼',
  description: '평균 월급과 근속 기간으로 예상 퇴직금과 세후 실수령액을 3초 만에 확인하세요.',
  alternates: {
    canonical: '/money/severance-calc',
  },
  robots: {
    index: true,
    follow: true,
  },
  openGraph: {
    title: '퇴직금 & 실수령액 계산기 | 호행처럼',
    description: '평균 월급과 근속 기간으로 예상 퇴직금과 세후 실수령액을 3초 만에 확인하세요.',
    url: 'https://hohaeng.vercel.app/money/severance-calc',
    siteName: '호행처럼',
    locale: 'ko_KR',
    type: 'website',
  },
  twitter: {
    card: 'summary',
    title: '퇴직금 & 실수령액 계산기 | 호행처럼',
    description: '평균 월급과 근속 기간을 입력해 예상 퇴직금과 세후 금액을 확인합니다.',
  },
};

export default function SeveranceCalcPage() {
  return <SeveranceCalcClient />;
}
