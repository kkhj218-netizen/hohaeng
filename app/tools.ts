export interface Tool {
  id: string;
  title: string;
  description: string;
  href: string;
  category: 'Money OS' | 'Work OS' | 'Life OS' | 'Wealth OS';
  badge?: string;
  hoverColor: string;
}

export const CATEGORIES = [
  { id: 'all', name: '전체' },
  { id: 'Money OS', name: 'Money OS (금융/세금)' },
  { id: 'Work OS', name: 'Work OS (직장/커리어)' },
  { id: 'Life OS', name: 'Life OS (일상/라이프)' },
  { id: 'Wealth OS', name: 'Wealth OS (부동산/자산)' },
];

export const TOOLS: Tool[] = [
  {
    id: 'isa-calc',
    title: 'ISA 절세 효과 계산기',
    description: '투자금과 수익률만 넣으면 일반계좌 대비 절세 금액을 즉시 계산합니다.',
    href: '/money/isa-calc',
    category: 'Money OS',
    badge: '인기',
    hoverColor: 'hover:border-blue-400 hover:shadow-blue-50/50',
  },
  {
    id: 'severance-calc',
    title: '퇴직금 & 실수령액 계산기',
    description: '평균 월급과 근속 기간으로 예상 퇴직금과 세후 실수령액을 확인하세요.',
    href: '/money/severance-calc',
    category: 'Money OS',
    badge: '필수',
    hoverColor: 'hover:border-emerald-400 hover:shadow-emerald-50/50',
  },
  {
    id: 'salary-calc',
    title: '연봉 실수령액 계산기',
    description: '4대 보험과 소득세를 공제한 진짜 내 월 순수입을 계산해 드립니다.',
    href: '/money/salary-calc',
    category: 'Money OS',
    badge: 'MUST',
    hoverColor: 'hover:border-indigo-400 hover:shadow-indigo-50/50',
  },
  {
    id: 'loan-calc',
    title: '대출 원리금 상환 계산기',
    description: '원리금균등, 원금균등, 만기일시 방식별 월 상환액과 이자를 비교하세요.',
    href: '/money/loan-calc',
    category: 'Money OS',
    badge: 'NEW',
    hoverColor: 'hover:border-purple-400 hover:shadow-purple-50/50',
  },
  {
    id: 'compound-calc',
    title: '복리 계산기',
    description: '초기 투자금과 월 적립금이 기간에 따라 얼마나 커지는지 계산하세요.',
    href: '/money/compound-calc',
    category: 'Wealth OS',
    badge: 'NEW',
    hoverColor: 'hover:border-blue-400 hover:shadow-blue-50/50',
  },
  {
    id: 'monthly-investment-calc',
    title: '적립식 투자 계산기',
    description: '매월 투자할 때 1·3·5·10년 뒤 원금과 예상 자산을 비교합니다.',
    href: '/money/monthly-investment-calc',
    category: 'Wealth OS',
    badge: 'NEW',
    hoverColor: 'hover:border-emerald-400 hover:shadow-emerald-50/50',
  },
  {
    id: 'goal-calc',
    title: '목표금액 계산기',
    description: '목표한 금액을 만들기 위해 매달 필요한 투자액을 역산합니다.',
    href: '/money/goal-calc',
    category: 'Wealth OS',
    badge: 'PLAN',
    hoverColor: 'hover:border-violet-400 hover:shadow-violet-50/50',
  },
  {
    id: 'dividend-calc',
    title: '배당금 계산기',
    description: '투자금과 배당수익률로 세전·세후 배당과 월평균을 확인하세요.',
    href: '/money/dividend-calc',
    category: 'Money OS',
    badge: 'INCOME',
    hoverColor: 'hover:border-amber-400 hover:shadow-amber-50/50',
  },
  {
    id: 'average-price-calc',
    title: '주식 평균단가 계산기',
    description: '추가 매수 뒤 바뀌는 보유 수량과 평균매수가를 바로 계산합니다.',
    href: '/money/average-price-calc',
    category: 'Wealth OS',
    badge: '평단',
    hoverColor: 'hover:border-rose-400 hover:shadow-rose-50/50',
  },
  {
    id: 'savings-rate-calc', title: '저축률 계산기',
    description: '월 실수령액과 지출로 저축 가능액과 실제 저축률을 계산합니다.',
    href: '/money/savings-rate-calc', category: 'Money OS', badge: '저축',
    hoverColor: 'hover:border-emerald-400 hover:shadow-emerald-50/50',
  },
  {
    id: 'emergency-fund-calc', title: '비상금 계산기',
    description: '필수생활비를 기준으로 필요한 비상금과 부족액을 확인합니다.',
    href: '/money/emergency-fund-calc', category: 'Money OS', badge: '안전망',
    hoverColor: 'hover:border-blue-400 hover:shadow-blue-50/50',
  },
  {
    id: 'deposit-interest-calc', title: '예금이자 계산기',
    description: '금리와 기간, 세율을 반영한 세후 만기금액을 계산합니다.',
    href: '/money/deposit-interest-calc', category: 'Money OS', badge: '예금',
    hoverColor: 'hover:border-amber-400 hover:shadow-amber-50/50',
  },
  {
    id: 'debt-payoff-calc', title: '빚 상환기간 계산기',
    description: '대출잔액과 월 상환액으로 완납기간과 총이자를 추정합니다.',
    href: '/money/debt-payoff-calc', category: 'Money OS', badge: '상환',
    hoverColor: 'hover:border-rose-400 hover:shadow-rose-50/50',
  },
  {
    id: 'investment-return-calc', title: '투자 수익률 계산기',
    description: '순투자원금과 평가액으로 손익금과 수익률을 확인합니다.',
    href: '/money/investment-return-calc', category: 'Wealth OS', badge: '수익률',
    hoverColor: 'hover:border-violet-400 hover:shadow-violet-50/50',
  },
  {
    id: 'loss-recovery-calc', title: '손실 복구 계산기',
    description: '현재 손실에서 원금 회복에 필요한 상승률을 계산합니다.',
    href: '/money/loss-recovery-calc', category: 'Wealth OS', badge: '복구',
    hoverColor: 'hover:border-rose-400 hover:shadow-rose-50/50',
  },
  {
    id: 'cagr-calc', title: 'CAGR 계산기',
    description: '시작·종료금액과 기간으로 연평균 복리성장률을 계산합니다.',
    href: '/money/cagr-calc', category: 'Wealth OS', badge: 'CAGR',
    hoverColor: 'hover:border-blue-400 hover:shadow-blue-50/50',
  },
  {
    id: 'position-size-calc', title: '포지션 수량 계산기',
    description: '계좌 위험률과 진입가·손절가로 최대 수량을 계산합니다.',
    href: '/money/position-size-calc', category: 'Wealth OS', badge: '리스크',
    hoverColor: 'hover:border-violet-400 hover:shadow-violet-50/50',
  },
  {
    id: 'retirement-calc', title: '은퇴자금 계산기',
    description: '현재자산과 월저축으로 예상 은퇴자산과 부족액을 계산합니다.',
    href: '/money/retirement-calc', category: 'Money OS', badge: '은퇴',
    hoverColor: 'hover:border-emerald-400 hover:shadow-emerald-50/50',
  },
  {
    id: 'inflation-calc', title: '물가상승 계산기',
    description: '현재 비용이 미래에 얼마가 필요한지 구매력 변화를 계산합니다.',
    href: '/money/inflation-calc', category: 'Money OS', badge: '물가',
    hoverColor: 'hover:border-amber-400 hover:shadow-amber-50/50',
  },
];
