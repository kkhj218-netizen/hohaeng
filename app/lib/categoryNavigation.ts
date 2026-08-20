export type NavigationCategory = {
  id: number;
  slug: string;
  name: string;
  emoji: string | null;
  sort_order: number;
  is_active: boolean;
};

export const REQUIRED_INVESTMENT_CATEGORIES: NavigationCategory[] = [
  {
    id: -9101,
    slug: 'market',
    name: '시황 및 시장',
    emoji: '📈',
    sort_order: 50,
    is_active: true,
  },
  {
    id: -9102,
    slug: 'investment-data',
    name: '투자 데이터',
    emoji: '🗂️',
    sort_order: 60,
    is_active: true,
  },
];

const CATEGORY_ORDER_BY_NAME: Record<string, number> = {
  '호행의 일지': 10,
  '각종 정보': 20,
  '마인드셋': 30,
  '투자 이론': 40,
  '시황 및 시장': 50,
  '투자 데이터': 60,
};

const HIDDEN_CATEGORY_NAMES = new Set(['건강 정보']);
const HIDDEN_CATEGORY_SLUGS = new Set([
  'health',
  'health-info',
  'health-information',
]);

export function isHealthCategory(
  category: Pick<NavigationCategory, 'slug' | 'name'>
) {
  return (
    HIDDEN_CATEGORY_NAMES.has(category.name.trim()) ||
    HIDDEN_CATEGORY_SLUGS.has(category.slug.trim().toLowerCase())
  );
}

function categoryOrder(category: NavigationCategory) {
  return CATEGORY_ORDER_BY_NAME[category.name] ?? 1000 + category.sort_order;
}

export function buildVisibleCategories<T extends NavigationCategory>(
  rows: T[]
): T[] {
  const visible = rows.filter((row) => !isHealthCategory(row));

  const additions = REQUIRED_INVESTMENT_CATEGORIES.filter((required) =>
    !visible.some(
      (row) => row.slug === required.slug || row.name === required.name
    )
  );

  return [...visible, ...(additions as T[])].sort((a, b) => {
    const orderDifference = categoryOrder(a) - categoryOrder(b);

    if (orderDifference !== 0) {
      return orderDifference;
    }

    if (a.sort_order !== b.sort_order) {
      return a.sort_order - b.sort_order;
    }

    return a.id - b.id;
  });
}
