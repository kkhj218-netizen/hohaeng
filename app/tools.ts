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
];