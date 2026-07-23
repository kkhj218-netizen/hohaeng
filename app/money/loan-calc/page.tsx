import { Metadata } from 'next';
import LoanCalcClient from './LoanCalcClient';
import { POLICY_CONFIG } from '@/app/constants';

export const metadata: Metadata = {
  title: '대출 원리금 상환 계산기 | 호행처럼',
  description: `${POLICY_CONFIG.UPDATED_AT} 금리 반영! 원리금균등, 원금균등, 만기일시 상환 방식별 월 원금·이자 지급액을 세세하게 비교 계산하세요.`,
  openGraph: {
    title: '대출 원리금 상환 계산기 | 호행처럼',
    description: `${POLICY_CONFIG.UPDATED_AT} 금리 반영! 원리금균등, 원금균등, 만기일시 상환 방식별 월 원금·이자 지급액을 세세하게 비교 계산하세요.`,
    url: 'https://hohaeng.vercel.app/money/loan-calc',
    siteName: '호행처럼',
    locale: 'ko_KR',
    type: 'website',
  },
};

export default function LoanCalcPage() {
  return <LoanCalcClient />;
}