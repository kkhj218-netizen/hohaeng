export interface Tool {
  id: string;
  title: string;
  description: string;
  href: string;
  category: string;
  hoverColor: string;
}

export const TOOLS: Tool[] = [
  {
    id: 'isa-calc',
    title: 'ISA 절세 효과 계산기',
    description: '투자금과 수익률만 넣으면 일반계좌 대비 절세 금액을 즉시 계산합니다.',
    href: '/money/isa-calc',
    category: 'Money OS (금융/세금)',
    hoverColor: 'hover:bg-blue-50 hover:border-blue-300',
  },
  {
    id: 'severance-calc',
    title: '퇴직금 & 실수령액 계산기',
    description: '평균 월급과 근속 기간으로 예상 퇴직금과 세후 실수령액을 확인하세요.',
    href: '/money/severance-calc',
    category: 'Money OS (금융/세금)',
    hoverColor: 'hover:bg-emerald-50 hover:border-emerald-300',
  },
  {
    id: 'salary-calc',
    title: '연봉 실수령액 계산기',
    description: '4대 보험과 소득세를 공제한 진짜 내 월 순수입을 계산해 드립니다.',
    href: '/money/salary-calc',
    category: 'Money OS (금융/세금)',
    hoverColor: 'hover:bg-indigo-50 hover:border-indigo-300',
  },
];