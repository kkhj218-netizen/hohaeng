import { Metadata } from 'next';
import SeveranceCalcClient from './SeveranceCalcClient';

export const metadata: Metadata = {
  title: '퇴직금 & 실수령액 계산기 | 호행처럼',
  description: '평균 월급과 근속 기간으로 예상 퇴직금과 세후 실수령액을 3초 만에 확인하세요.',
  openGraph: {
    title: '퇴직금 & 실수령액 계산기 | 호행처럼',
    description: '평균 월급과 근속 기간으로 예상 퇴직금과 세후 실수령액을 3초 만에 확인하세요.',
  },
};

export default function SeveranceCalcPage() {
  return <SeveranceCalcClient />;
}