export type SeoSlugSuggestionContext = {
  category?: string | null;
  subcategory?: string | null;
};

type KeywordRule = {
  pattern: RegExp;
  token: string;
  weight: number;
};

const KEYWORD_RULES: KeywordRule[] = [
  { pattern: /나스닥|nasdaq/i, token: 'nasdaq', weight: 10 },
  { pattern: /s&p\s*500|s&p500|에스앤피/i, token: 'sp500', weight: 10 },
  { pattern: /러셀\s*2000|russell\s*2000/i, token: 'russell-2000', weight: 10 },
  { pattern: /항셍|hang\s*seng/i, token: 'hang-seng', weight: 10 },
  { pattern: /일본|japan/i, token: 'japan', weight: 9 },
  { pattern: /미국|usa?|united\s*states/i, token: 'us', weight: 9 },
  { pattern: /한국|대한민국|korea/i, token: 'korea', weight: 9 },
  { pattern: /중국|china/i, token: 'china', weight: 9 },
  { pattern: /유럽|europe/i, token: 'europe', weight: 8 },
  { pattern: /10\s*년물|10-year|10y/i, token: '10y', weight: 10 },
  { pattern: /30\s*년물|30-year|30y/i, token: '30y', weight: 10 },
  { pattern: /국채\s*금리|채권\s*금리|bond\s*yield|treasury\s*yield/i, token: 'bond-yield', weight: 11 },
  { pattern: /국채|treasury|government\s*bond/i, token: 'bond', weight: 9 },
  { pattern: /금리|interest\s*rate|rates?/i, token: 'rate', weight: 10 },
  { pattern: /수익률|yield/i, token: 'yield', weight: 9 },
  { pattern: /연준|fed|federal\s*reserve/i, token: 'fed', weight: 10 },
  { pattern: /기준금리|policy\s*rate/i, token: 'policy-rate', weight: 11 },
  { pattern: /금리\s*인상|rate\s*hike/i, token: 'rate-hike', weight: 11 },
  { pattern: /금리\s*인하|rate\s*cut/i, token: 'rate-cut', weight: 11 },
  { pattern: /인플레이션|물가|inflation/i, token: 'inflation', weight: 10 },
  { pattern: /pce/i, token: 'pce', weight: 11 },
  { pattern: /cpi|소비자\s*물가/i, token: 'cpi', weight: 11 },
  { pattern: /고용|employment|jobs?/i, token: 'jobs', weight: 9 },
  { pattern: /jolts/i, token: 'jolts', weight: 11 },
  { pattern: /비농업|nonfarm|payroll/i, token: 'nonfarm-payrolls', weight: 11 },
  { pattern: /실업률|unemployment/i, token: 'unemployment', weight: 10 },
  { pattern: /소비자\s*심리|consumer\s*sentiment/i, token: 'consumer-sentiment', weight: 10 },
  { pattern: /미시간/i, token: 'michigan', weight: 9 },
  { pattern: /유가|원유|wti|crude\s*oil|oil/i, token: 'oil', weight: 10 },
  { pattern: /브렌트|brent/i, token: 'brent', weight: 10 },
  { pattern: /금값|금\s*가격|gold/i, token: 'gold', weight: 10 },
  { pattern: /달러|dollar|usd/i, token: 'dollar', weight: 9 },
  { pattern: /엔화|yen|jpy/i, token: 'yen', weight: 9 },
  { pattern: /환율|exchange\s*rate|fx/i, token: 'fx', weight: 9 },
  { pattern: /채권|bond/i, token: 'bond', weight: 8 },
  { pattern: /주식|stocks?|equity/i, token: 'stocks', weight: 7 },
  { pattern: /증시|시장|market/i, token: 'market', weight: 6 },
  { pattern: /변동성|vix|volatility/i, token: 'volatility', weight: 9 },
  { pattern: /배당|dividend/i, token: 'dividend', weight: 9 },
  { pattern: /복리|compound\s*interest/i, token: 'compound-interest', weight: 9 },
  { pattern: /선물|futures?/i, token: 'futures', weight: 9 },
  { pattern: /옵션|options?/i, token: 'options', weight: 9 },
  { pattern: /cfd/i, token: 'cfd', weight: 10 },
  { pattern: /증거금|margin/i, token: 'margin', weight: 9 },
  { pattern: /레버리지|leverage/i, token: 'leverage', weight: 9 },
  { pattern: /공매도|short\s*selling/i, token: 'short-selling', weight: 9 },
  { pattern: /etf/i, token: 'etf', weight: 9 },
  { pattern: /연봉|salary/i, token: 'salary', weight: 9 },
  { pattern: /실수령액|세후|take[- ]?home|after\s*tax/i, token: 'take-home-pay', weight: 10 },
  { pattern: /월급|monthly\s*pay/i, token: 'monthly-pay', weight: 8 },
  { pattern: /4대보험|사회보험|social\s*insurance/i, token: 'social-insurance', weight: 9 },
  { pattern: /퇴직금|severance/i, token: 'severance-pay', weight: 9 },
  { pattern: /대출|loan/i, token: 'loan', weight: 8 },
  { pattern: /전세|jeonse/i, token: 'jeonse', weight: 8 },
  { pattern: /아파트|apartment/i, token: 'apartment', weight: 8 },
  { pattern: /부동산|real\s*estate/i, token: 'real-estate', weight: 9 },
  { pattern: /재활|rehab|rehabilitation/i, token: 'rehab', weight: 8 },
  { pattern: /도수치료|manual\s*therapy/i, token: 'manual-therapy', weight: 9 },
  { pattern: /어깨|shoulder/i, token: 'shoulder', weight: 8 },
  { pattern: /허리|요통|low\s*back/i, token: 'low-back', weight: 8 },
  { pattern: /무릎|knee/i, token: 'knee', weight: 8 },
  { pattern: /통증|pain/i, token: 'pain', weight: 7 },
  { pattern: /웹사이트|website|site/i, token: 'website', weight: 8 },
  { pattern: /seo|검색\s*최적화/i, token: 'seo', weight: 9 },
  { pattern: /계산기|calculator/i, token: 'calculator', weight: 8 },
  { pattern: /배란|ovulation/i, token: 'ovulation', weight: 8 },
  { pattern: /임신|pregnancy/i, token: 'pregnancy', weight: 8 },
  { pattern: /난임|fertility/i, token: 'fertility', weight: 8 },
];

const GENERIC_ENGLISH_STOP_WORDS = new Set([
  'a', 'an', 'the', 'and', 'or', 'but', 'if', 'to', 'of', 'for', 'in', 'on',
  'at', 'by', 'with', 'from', 'is', 'are', 'was', 'were', 'be', 'why', 'how',
  'what', 'this', 'that', 'it', 'my', 'your', 'our', 'about', 'today',
]);

export function normalizeSeoSlug(value: string) {
  return value
    .normalize('NFKC')
    .toLowerCase()
    .trim()
    .replace(/[\s_]+/g, '-')
    .replace(/[^\p{L}\p{N}-]+/gu, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80);
}

function normalizeEnglishCandidate(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 52)
    .replace(/-$/g, '');
}

function getEnglishTitleTokens(title: string) {
  return Array.from(
    new Set(
      (title.toLowerCase().match(/[a-z][a-z0-9]{1,}/g) || [])
        .filter((token) => !GENERIC_ENGLISH_STOP_WORDS.has(token))
        .slice(0, 5)
    )
  );
}

function getMappedTokens(title: string) {
  return KEYWORD_RULES
    .map((rule) => {
      const match = title.match(rule.pattern);
      return match
        ? {
            token: rule.token,
            weight: rule.weight,
            index: match.index ?? 9999,
          }
        : null;
    })
    .filter((item): item is { token: string; weight: number; index: number } => Boolean(item))
    .sort((a, b) => b.weight - a.weight || a.index - b.index)
    .filter((item, index, array) => array.findIndex((other) => other.token === item.token) === index);
}

function addCandidate(target: string[], value: string) {
  const normalized = normalizeEnglishCandidate(value);
  if (!normalized || normalized.length < 3 || target.includes(normalized)) return;
  target.push(normalized);
}

export function buildSeoSlugSuggestions(
  title: string,
  context: SeoSlugSuggestionContext = {}
) {
  const cleanTitle = title.trim();
  if (!cleanTitle) return [];

  const mapped = getMappedTokens(cleanTitle);
  const mappedTokens = mapped.map((item) => item.token);
  const englishTokens = getEnglishTitleTokens(cleanTitle);
  const candidates: string[] = [];

  const has = (token: string) => mappedTokens.includes(token);
  const percentMatch = cleanTitle.match(/(?:^|\s)(\d{1,3}(?:\.\d+)?)\s*%/);
  const percentToken = percentMatch?.[1]?.replace('.', '-') || '';

  // 관계가 뚜렷한 투자 제목은 사람이 짓는 것처럼 핵심어 순서를 우선한다.
  const region = ['japan', 'us', 'korea', 'china', 'europe'].find(has);
  const market = ['nasdaq', 'sp500', 'russell-2000', 'hang-seng'].find(has);
  const rateTopic = ['policy-rate', 'rate-hike', 'rate-cut', 'bond-yield', 'rate', 'yield'].find(has);

  if (region && rateTopic && market) {
    addCandidate(candidates, `${region}-${rateTopic}-${market}`);
  }
  if (region && rateTopic && percentToken) {
    addCandidate(candidates, `${region}-${rateTopic}-${percentToken}-percent`);
  }
  if (region && has('10y') && (has('bond-yield') || has('yield') || has('rate'))) {
    addCandidate(candidates, `${region}-10y-bond-yield`);
  }
  if (region && has('30y') && (has('bond-yield') || has('yield') || has('rate'))) {
    addCandidate(candidates, `${region}-30y-bond-yield`);
  }

  addCandidate(candidates, mappedTokens.slice(0, 4).join('-'));
  addCandidate(candidates, mappedTokens.slice(0, 3).join('-'));

  if (mappedTokens.length >= 2) {
    addCandidate(candidates, [...mappedTokens.slice(0, 2), ...englishTokens.slice(0, 1)].join('-'));
  }

  if (englishTokens.length >= 2) {
    addCandidate(candidates, englishTokens.slice(0, 4).join('-'));
    addCandidate(candidates, englishTokens.slice(0, 3).join('-'));
  }

  const contextTokens = [context.subcategory, context.category]
    .filter(Boolean)
    .flatMap((value) => String(value).toLowerCase().match(/[a-z][a-z0-9-]{1,}/g) || [])
    .filter((token) => !GENERIC_ENGLISH_STOP_WORDS.has(token));

  if (mappedTokens.length > 0 && contextTokens.length > 0) {
    addCandidate(candidates, `${mappedTokens.slice(0, 3).join('-')}-${contextTokens[0]}`);
  }

  // 영문 핵심어를 찾지 못한 글은 기존 제목 축약형을 마지막 안전 후보로 남긴다.
  if (candidates.length === 0) {
    const fallback = normalizeSeoSlug(cleanTitle).split('-').slice(0, 6).join('-');
    if (fallback) candidates.push(fallback);
  }

  return candidates.slice(0, 3);
}
