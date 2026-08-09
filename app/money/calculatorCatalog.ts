export type CalculatorSlug =
  | 'compound-calc'
  | 'monthly-investment-calc'
  | 'goal-calc'
  | 'dividend-calc'
  | 'average-price-calc'
  | 'savings-rate-calc'
  | 'emergency-fund-calc'
  | 'deposit-interest-calc'
  | 'debt-payoff-calc'
  | 'investment-return-calc'
  | 'loss-recovery-calc'
  | 'cagr-calc'
  | 'position-size-calc'
  | 'retirement-calc'
  | 'inflation-calc';

export type CalculatorDefinition = {
  slug: CalculatorSlug;
  title: string;
  shortTitle: string;
  description: string;
  eyebrow: string;
  badge: string;
  category: 'Money OS' | 'Wealth OS';
  accent: 'blue' | 'emerald' | 'violet' | 'amber' | 'rose';
};

export const CALCULATORS: Record<
  CalculatorSlug,
  CalculatorDefinition
> = {
  'compound-calc': {
    slug: 'compound-calc',
    title: '복리 계산기｜초기금·월 적립금으로 미래 자산 계산',
    shortTitle: '복리 계산기',
    description:
      '초기 투자금과 매월 적립액, 연 수익률, 투자 기간을 입력해 예상 원금과 수익을 비교합니다.',
    eyebrow: 'COMPOUND GROWTH',
    badge: '복리',
    category: 'Wealth OS',
    accent: 'blue',
  },
  'monthly-investment-calc': {
    slug: 'monthly-investment-calc',
    title: '적립식 투자 계산기｜월 투자금별 1·3·5·10년 비교',
    shortTitle: '적립식 투자 계산기',
    description:
      '매월 같은 금액을 투자할 때 기간별 납입 원금과 예상 평가금액이 어떻게 달라지는지 계산합니다.',
    eyebrow: 'MONTHLY INVESTING',
    badge: '적립식',
    category: 'Wealth OS',
    accent: 'emerald',
  },
  'goal-calc': {
    slug: 'goal-calc',
    title: '목표금액 계산기｜1억 만들려면 매달 얼마가 필요할까',
    shortTitle: '목표금액 계산기',
    description:
      '현재 자산과 목표금액, 기간, 예상 수익률을 기준으로 매월 필요한 투자액을 역산합니다.',
    eyebrow: 'GOAL PLANNER',
    badge: '목표',
    category: 'Wealth OS',
    accent: 'violet',
  },
  'dividend-calc': {
    slug: 'dividend-calc',
    title: '배당금 계산기｜세전·세후 연간 배당과 월평균 계산',
    shortTitle: '배당금 계산기',
    description:
      '투자금과 예상 배당수익률을 입력해 세전 배당, 예상 세금, 세후 배당과 월평균을 확인합니다.',
    eyebrow: 'DIVIDEND INCOME',
    badge: '배당',
    category: 'Money OS',
    accent: 'amber',
  },
  'average-price-calc': {
    slug: 'average-price-calc',
    title: '주식 평균단가 계산기｜추가 매수 후 평단가 확인',
    shortTitle: '주식 평균단가 계산기',
    description:
      '기존 보유 수량과 평균단가, 추가 매수 수량과 가격을 입력해 새 평균매수가를 계산합니다.',
    eyebrow: 'AVERAGE PRICE',
    badge: '평단',
    category: 'Wealth OS',
    accent: 'rose',
  },
  'savings-rate-calc': {
    slug: 'savings-rate-calc',
    title: '저축률 계산기｜월 소득에서 실제로 몇 %를 모을까',
    shortTitle: '저축률 계산기',
    description: '월 실수령액과 총지출을 입력해 저축 가능액과 저축률을 계산합니다.',
    eyebrow: 'SAVINGS RATE',
    badge: '저축',
    category: 'Money OS',
    accent: 'emerald',
  },
  'emergency-fund-calc': {
    slug: 'emergency-fund-calc',
    title: '비상금 계산기｜필수생활비 몇 개월치를 준비해야 할까',
    shortTitle: '비상금 계산기',
    description: '월 필수생활비와 목표 개월 수로 필요한 비상금과 현재 부족액을 확인합니다.',
    eyebrow: 'EMERGENCY FUND',
    badge: '안전망',
    category: 'Money OS',
    accent: 'blue',
  },
  'deposit-interest-calc': {
    slug: 'deposit-interest-calc',
    title: '예금이자 계산기｜세전·세후 이자와 만기금액 계산',
    shortTitle: '예금이자 계산기',
    description: '예치금과 금리, 기간, 세율을 입력해 예상 세후 만기수령액을 계산합니다.',
    eyebrow: 'DEPOSIT INTEREST',
    badge: '예금',
    category: 'Money OS',
    accent: 'amber',
  },
  'debt-payoff-calc': {
    slug: 'debt-payoff-calc',
    title: '빚 상환기간 계산기｜월 상환액으로 완납 시점 확인',
    shortTitle: '빚 상환기간 계산기',
    description: '대출잔액과 금리, 월 상환액으로 예상 완납기간과 총이자를 계산합니다.',
    eyebrow: 'DEBT PAYOFF',
    badge: '상환',
    category: 'Money OS',
    accent: 'rose',
  },
  'investment-return-calc': {
    slug: 'investment-return-calc',
    title: '투자 수익률 계산기｜투자원금·평가액으로 손익 계산',
    shortTitle: '투자 수익률 계산기',
    description: '순투자원금과 현재 평가액으로 손익금과 단순 투자수익률을 확인합니다.',
    eyebrow: 'INVESTMENT RETURN',
    badge: '수익률',
    category: 'Wealth OS',
    accent: 'violet',
  },
  'loss-recovery-calc': {
    slug: 'loss-recovery-calc',
    title: '손실 복구 계산기｜마이너스 뒤 본전까지 필요한 수익률',
    shortTitle: '손실 복구 계산기',
    description: '현재 손실률을 입력해 원금 회복에 필요한 상승률과 금액을 계산합니다.',
    eyebrow: 'LOSS RECOVERY',
    badge: '복구',
    category: 'Wealth OS',
    accent: 'rose',
  },
  'cagr-calc': {
    slug: 'cagr-calc',
    title: 'CAGR 계산기｜기간별 연평균 복리수익률 계산',
    shortTitle: 'CAGR 계산기',
    description: '시작금액과 종료금액, 기간으로 연평균 복리성장률을 계산합니다.',
    eyebrow: 'ANNUAL GROWTH',
    badge: 'CAGR',
    category: 'Wealth OS',
    accent: 'blue',
  },
  'position-size-calc': {
    slug: 'position-size-calc',
    title: '포지션 수량 계산기｜계좌 위험률과 손절가로 수량 결정',
    shortTitle: '포지션 수량 계산기',
    description: '계좌크기와 최대 위험률, 진입가·손절가로 최대 매수수량을 계산합니다.',
    eyebrow: 'POSITION SIZING',
    badge: '리스크',
    category: 'Wealth OS',
    accent: 'violet',
  },
  'retirement-calc': {
    slug: 'retirement-calc',
    title: '은퇴자금 계산기｜현재자산과 월 저축으로 노후 준비',
    shortTitle: '은퇴자금 계산기',
    description: '현재자산과 월저축, 기간·수익률로 예상 은퇴자산과 목표차이를 계산합니다.',
    eyebrow: 'RETIREMENT PLAN',
    badge: '은퇴',
    category: 'Money OS',
    accent: 'emerald',
  },
  'inflation-calc': {
    slug: 'inflation-calc',
    title: '물가상승 계산기｜미래 필요금액과 현재 구매력 계산',
    shortTitle: '물가상승 계산기',
    description: '현재 비용과 물가상승률, 기간으로 미래에 필요한 금액을 계산합니다.',
    eyebrow: 'INFLATION VALUE',
    badge: '물가',
    category: 'Money OS',
    accent: 'amber',
  },
};

export const CALCULATOR_SLUGS = Object.keys(
  CALCULATORS
) as CalculatorSlug[];

export function isCalculatorSlug(
  value: string
): value is CalculatorSlug {
  return value in CALCULATORS;
}

