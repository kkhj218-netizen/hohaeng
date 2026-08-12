import { TOOLS } from '@/app/tools';

export type RelatedMoneyTool = {
  id: string;
  title: string;
  description: string;
  href: string;
};

const TOOL_BY_ID = new Map(
  TOOLS.map((tool) => [
    tool.id,
    {
      id: tool.id,
      title: tool.title,
      description: tool.description,
      href: tool.href,
    },
  ])
);

const RELATED_TOOL_IDS: Record<string, string[]> = {
  'salary-calc': ['severance-calc', 'savings-rate-calc', 'loan-calc'],
  'severance-calc': ['salary-calc', 'retirement-calc', 'isa-calc'],
  'loan-calc': ['debt-payoff-calc', 'goal-calc', 'savings-rate-calc'],
  'isa-calc': ['compound-calc', 'monthly-investment-calc', 'dividend-calc'],
  'compound-calc': ['monthly-investment-calc', 'goal-calc', 'retirement-calc'],
  'monthly-investment-calc': ['compound-calc', 'goal-calc', 'cagr-calc'],
  'goal-calc': ['monthly-investment-calc', 'compound-calc', 'savings-rate-calc'],
  'dividend-calc': ['compound-calc', 'monthly-investment-calc', 'isa-calc'],
  'average-price-calc': ['investment-return-calc', 'position-size-calc', 'loss-recovery-calc'],
  'savings-rate-calc': ['emergency-fund-calc', 'goal-calc', 'salary-calc'],
  'emergency-fund-calc': ['savings-rate-calc', 'deposit-interest-calc', 'debt-payoff-calc'],
  'deposit-interest-calc': ['emergency-fund-calc', 'compound-calc', 'inflation-calc'],
  'debt-payoff-calc': ['loan-calc', 'savings-rate-calc', 'emergency-fund-calc'],
  'investment-return-calc': ['cagr-calc', 'average-price-calc', 'loss-recovery-calc'],
  'loss-recovery-calc': ['investment-return-calc', 'position-size-calc', 'average-price-calc'],
  'cagr-calc': ['investment-return-calc', 'compound-calc', 'monthly-investment-calc'],
  'position-size-calc': ['loss-recovery-calc', 'average-price-calc', 'investment-return-calc'],
  'retirement-calc': ['compound-calc', 'monthly-investment-calc', 'inflation-calc'],
  'inflation-calc': ['retirement-calc', 'goal-calc', 'deposit-interest-calc'],
};

function resolveTools(ids: string[]) {
  return ids
    .map((id) => TOOL_BY_ID.get(id))
    .filter((tool): tool is RelatedMoneyTool => Boolean(tool));
}

export function getRelatedTools(calculatorId: string) {
  return resolveTools(RELATED_TOOL_IDS[calculatorId] || []);
}

export function getRelatedToolsForPost({
  title,
  category,
  subcategory,
}: {
  title: string;
  category?: string | null;
  subcategory?: string | null;
}) {
  const text = `${title} ${category || ''} ${subcategory || ''}`.toLowerCase();

  if (/연봉|월급|급여|4대보험|직장|퇴직/.test(text)) {
    return resolveTools(['salary-calc', 'severance-calc', 'savings-rate-calc']);
  }

  if (/대출|원리금|이자|부채|빚|주택/.test(text)) {
    return resolveTools(['loan-calc', 'debt-payoff-calc', 'goal-calc']);
  }

  if (/배당|isa|절세/.test(text)) {
    return resolveTools(['dividend-calc', 'isa-calc', 'compound-calc']);
  }

  if (/투자|주식|트레이딩|매매|수익률|복리|etf/.test(text)) {
    return resolveTools(['compound-calc', 'monthly-investment-calc', 'average-price-calc']);
  }

  if (/저축|비상금|생활비|자산관리/.test(text)) {
    return resolveTools(['savings-rate-calc', 'emergency-fund-calc', 'goal-calc']);
  }

  return [];
}
