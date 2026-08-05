export type CalculatorSlug =
  | 'compound-calc'
  | 'monthly-investment-calc'
  | 'goal-calc'
  | 'dividend-calc'
  | 'average-price-calc';

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
};

export const CALCULATOR_SLUGS = Object.keys(
  CALCULATORS
) as CalculatorSlug[];

export function isCalculatorSlug(
  value: string
): value is CalculatorSlug {
  return value in CALCULATORS;
}

