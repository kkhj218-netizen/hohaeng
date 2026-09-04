export type SeoAuditStatus = 'good' | 'improve' | 'fix';
export type SeoIssueSeverity = 'error' | 'warning' | 'info';

export type SeoAuditSourcePost = {
  id: string;
  title: string | null;
  slug: string | null;
  description: string | null;
  seo_title: string | null;
  meta_description: string | null;
  og_image: string | null;
  content: string | null;
  category: string | null;
  status: string | null;
};

export type SeoAuditTargetKind =
  | 'h1'
  | 'missing-alt'
  | 'broken-link'
  | 'long-paragraph'
  | 'editor';

export type SeoAuditTarget = {
  kind: SeoAuditTargetKind;
  index: number;
  preview: string;
  value?: string;
};

export type SeoAuditIssue = {
  id: string;
  severity: SeoIssueSeverity;
  label: string;
  detail: string;
  targets?: SeoAuditTarget[];
};

export type SeoAuditResult = {
  postId: string;
  status: SeoAuditStatus;
  score: number;
  issues: SeoAuditIssue[];
  textLength: number;
  h2Count: number;
  imageCount: number;
  missingAltCount: number;
  internalLinkCount: number;
  slugReview: boolean;
  slugReviewCount: number;
};

function stripHtml(value: string) {
  return value
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;|&#160;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

function normalize(value: string | null | undefined) {
  return (value || '').replace(/\s+/g, ' ').trim().toLowerCase();
}

function countMatches(value: string, pattern: RegExp) {
  return [...value.matchAll(pattern)].length;
}

function shorten(value: string, max = 120) {
  const clean = stripHtml(value);
  if (!clean) return '';
  return clean.length > max ? `${clean.slice(0, max - 1).trim()}…` : clean;
}

function extractInternalLinks(content: string) {
  const results: string[] = [];
  const hrefPattern = /href=["']([^"']+)["']/gi;
  for (const match of content.matchAll(hrefPattern)) {
    const href = match[1]?.trim();
    if (!href) continue;
    const local = href.match(/(?:https?:\/\/[^/]+)?\/blog\/([^?#"']+)/i);
    if (local?.[1]) results.push(decodeURIComponent(local[1].replace(/\/$/, '')));
  }
  return results;
}

function getH1Targets(content: string): SeoAuditTarget[] {
  return [...content.matchAll(/<h1\b[^>]*>([\s\S]*?)<\/h1>/gi)].map((match, index) => ({
    kind: 'h1',
    index,
    preview: shorten(match[1]) || `본문 H1 ${index + 1}`,
  }));
}

function getMissingAltTargets(content: string): SeoAuditTarget[] {
  const targets: SeoAuditTarget[] = [];
  for (const match of content.matchAll(/<img\b[^>]*>/gi)) {
    const tag = match[0];
    const alt = tag.match(/\balt=["']([^"']*)["']/i)?.[1]?.trim();
    if (alt) continue;
    const src = tag.match(/\bsrc=["']([^"']+)["']/i)?.[1]?.trim() || '';
    let fileName = '';
    if (src) {
      try {
        fileName = decodeURIComponent(src.split('/').pop()?.split('?')[0] || '');
      } catch {
        fileName = src.split('/').pop()?.split('?')[0] || '';
      }
    }
    targets.push({
      kind: 'missing-alt',
      index: targets.length,
      preview: fileName ? `ALT 없음 · ${fileName}` : `ALT 없는 이미지 ${targets.length + 1}`,
      value: src || undefined,
    });
  }
  return targets;
}

function getBrokenInternalLinkTargets(content: string, knownSlugs: Set<string>): SeoAuditTarget[] {
  const targets: SeoAuditTarget[] = [];
  const linkPattern = /<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  for (const match of content.matchAll(linkPattern)) {
    const href = match[1]?.trim();
    if (!href) continue;
    const local = href.match(/(?:https?:\/\/[^/]+)?\/blog\/([^?#"']+)/i);
    if (!local?.[1]) continue;
    const slug = decodeURIComponent(local[1].replace(/\/$/, ''));
    if (knownSlugs.has(slug)) continue;
    const anchorText = shorten(match[2], 90);
    targets.push({
      kind: 'broken-link',
      index: targets.length,
      preview: anchorText ? `${anchorText} → /blog/${slug}` : `/blog/${slug}`,
      value: href,
    });
  }
  return targets;
}

function getLongParagraphTargets(content: string): SeoAuditTarget[] {
  const targets: SeoAuditTarget[] = [];
  for (const match of content.matchAll(/<p\b[^>]*>([\s\S]*?)<\/p>/gi)) {
    const text = stripHtml(match[1]);
    if (text.length < 450) continue;
    targets.push({
      kind: 'long-paragraph',
      index: targets.length,
      preview: shorten(match[1]),
    });
  }
  return targets;
}

function pushIssue(
  issues: SeoAuditIssue[],
  id: string,
  severity: SeoIssueSeverity,
  label: string,
  detail: string,
  targets?: SeoAuditTarget[],
) {
  issues.push({ id, severity, label, detail, ...(targets?.length ? { targets } : {}) });
}

function auditSlug(issues: SeoAuditIssue[], slug: string) {
  if (!slug) {
    pushIssue(
      issues,
      'slug-missing',
      'error',
      'SEO 주소 Slug가 없습니다.',
      '공개 주소를 만들 수 있도록 글 주제를 설명하는 짧은 영문 Slug를 설정하세요.',
    );
    return;
  }

  if (/^draft-/i.test(slug)) {
    pushIssue(
      issues,
      'slug-draft',
      'error',
      '임시 초안 Slug가 남아 있습니다.',
      `현재 /blog/${slug} 입니다. 공개 글이라면 핵심 검색어를 담은 짧은 영문 주소로 바꾸는 것을 권장합니다.`,
    );
    return;
  }

  const autoGenerated = /^post-[a-z0-9-]+-\d{10,}$/i.test(slug);

  if (autoGenerated) {
    pushIssue(
      issues,
      'slug-auto-generated',
      'warning',
      'Slug가 자동 생성 형태입니다.',
      `현재 /blog/${slug} 입니다. 글 주제를 알 수 있는 짧은 영문 키워드 Slug로 바꾸면 URL 의미가 더 명확해집니다. 기존 색인 글은 변경 전 외부 링크 영향을 확인하세요.`,
    );
  }

  if (slug.length > 60) {
    pushIssue(
      issues,
      'slug-too-long',
      'warning',
      'Slug가 너무 깁니다.',
      `현재 ${slug.length}자입니다. 핵심 키워드 2~5개 정도로 짧고 읽기 쉬운 주소인지 검토해보세요.`,
    );
  }

  if (/[^\x00-\x7F]/.test(slug)) {
    pushIssue(
      issues,
      'slug-non-english',
      'warning',
      '영문 키워드 Slug로 정리할 수 있습니다.',
      '한글 Slug도 사용할 수 있지만, 호행처럼 운영 기준상 짧은 영문 검색 키워드 주소로 통일하면 공유·관리하기 더 쉽습니다.',
    );
  }

  if (!autoGenerated) {
    const compact = slug.replace(/-/g, '');
    const digitCount = (compact.match(/\d/g) || []).length;
    const hasLongNumber = slug.split('-').some((part) => /^\d{8,}$/.test(part));
    const numericHeavy = compact.length > 0 && digitCount / compact.length >= 0.45;

    if (hasLongNumber || numericHeavy) {
      pushIssue(
        issues,
        'slug-number-heavy',
        'warning',
        '숫자 비중이 높은 Slug입니다.',
        '날짜·타임스탬프보다 글의 핵심 주제를 설명하는 단어가 중심인지 확인해보세요.',
      );
    }
  }
}

export function auditSeoPosts(posts: SeoAuditSourcePost[]): Record<string, SeoAuditResult> {
  const knownSlugs = new Set(posts.map((post) => (post.slug || '').trim()).filter(Boolean));
  const titleCounts = new Map<string, number>();
  const metaCounts = new Map<string, number>();

  for (const post of posts) {
    const titleKey = normalize(post.title);
    const metaKey = normalize(post.meta_description);
    if (titleKey) titleCounts.set(titleKey, (titleCounts.get(titleKey) || 0) + 1);
    if (metaKey) metaCounts.set(metaKey, (metaCounts.get(metaKey) || 0) + 1);
  }

  return Object.fromEntries(
    posts.map((post) => {
      const issues: SeoAuditIssue[] = [];
      const content = post.content || '';
      const textLength = stripHtml(content).length;
      const seoTitle = (post.seo_title || '').trim();
      const metaDescription = (post.meta_description || '').trim();
      const title = (post.title || '').trim();
      const slug = (post.slug || '').trim();
      const h1Count = countMatches(content, /<h1\b[^>]*>/gi);
      const h2Count = countMatches(content, /<h2\b[^>]*>/gi);
      const imageCount = countMatches(content, /<img\b[^>]*>/gi);
      const h1Targets = getH1Targets(content);
      const missingAltTargets = getMissingAltTargets(content);
      const internalLinks = extractInternalLinks(content);
      const brokenLinkTargets = getBrokenInternalLinkTargets(content, knownSlugs);
      const brokenInternalLinks = [...new Set(internalLinks.filter((item) => !knownSlugs.has(item)))];
      const longParagraphTargets = getLongParagraphTargets(content);

      if (textLength < 600) {
        pushIssue(issues, 'body-too-short', 'error', '본문 분량이 너무 짧습니다.', `현재 약 ${textLength.toLocaleString('ko-KR')}자입니다. 핵심 설명·예시·근거를 보강해 최소 600자 이상으로 늘려보세요.`, [{ kind: 'editor', index: 0, preview: '본문 전체' }]);
      } else if (textLength < 1200) {
        pushIssue(issues, 'body-short', 'warning', '본문 분량을 조금 더 보강할 수 있습니다.', `현재 약 ${textLength.toLocaleString('ko-KR')}자입니다. 검색 의도를 충분히 해결하는 설명이 있는지 확인해보세요.`, [{ kind: 'editor', index: 0, preview: '본문 전체' }]);
      }

      if (!seoTitle) {
        pushIssue(issues, 'seo-title-missing', 'error', 'SEO 제목이 없습니다.', '검색 결과에 표시할 SEO 제목을 작성하세요.');
      } else if (seoTitle.length < 15) {
        pushIssue(issues, 'seo-title-short', 'warning', 'SEO 제목이 짧습니다.', `현재 ${seoTitle.length}자입니다. 핵심 검색어와 글의 차별점을 조금 더 명확히 넣어보세요.`);
      } else if (seoTitle.length > 60) {
        pushIssue(issues, 'seo-title-long', 'warning', 'SEO 제목이 깁니다.', `현재 ${seoTitle.length}자입니다. 검색 결과에서 잘릴 수 있으니 핵심 문구를 앞쪽에 두고 줄여보세요.`);
      }

      if (!metaDescription) {
        pushIssue(issues, 'meta-missing', 'error', '메타 설명이 없습니다.', '검색자가 글 내용을 바로 이해할 수 있도록 메타 설명을 작성하세요.');
      } else if (metaDescription.length < 50) {
        pushIssue(issues, 'meta-short', 'warning', '메타 설명이 짧습니다.', `현재 ${metaDescription.length}자입니다. 글에서 얻을 수 있는 정보를 조금 더 구체적으로 설명해보세요.`);
      } else if (metaDescription.length > 160) {
        pushIssue(issues, 'meta-long', 'warning', '메타 설명이 깁니다.', `현재 ${metaDescription.length}자입니다. 핵심 내용을 앞부분에 두고 160자 안팎으로 정리해보세요.`);
      }

      if (h1Count > 0) {
        pushIssue(
          issues,
          'body-h1',
          'warning',
          `본문 안에 H1 제목이 ${h1Count}개 있습니다.`,
          '페이지 제목이 이미 H1 역할을 하므로 본문 소제목은 H2부터 사용하는 편이 안전합니다. 아래에서 실제 문장을 확인할 수 있습니다.',
          h1Targets,
        );
      }

      if (textLength >= 800 && h2Count < 2) {
        pushIssue(issues, 'few-h2', 'warning', '소제목 구조가 부족합니다.', `본문이 ${textLength.toLocaleString('ko-KR')}자인데 H2가 ${h2Count}개입니다. 내용을 2~4개의 핵심 소제목으로 나눠보세요.`, [{ kind: 'editor', index: 0, preview: '본문 전체' }]);
      }

      if (missingAltTargets.length > 0) {
        pushIssue(issues, 'missing-alt', 'warning', 'ALT가 없는 이미지가 있습니다.', `이미지 ${imageCount}장 중 ${missingAltTargets.length}장에 대체 텍스트가 없습니다. 이미지가 무엇을 보여주는지 짧게 적어주세요.`, missingAltTargets);
      }

      if (textLength >= 900 && internalLinks.length === 0) {
        pushIssue(issues, 'no-internal-links', 'warning', '내부 링크가 없습니다.', '관련된 호행처럼 글이나 계산기·데이터 페이지를 1~3개 자연스럽게 연결해보세요.', [{ kind: 'editor', index: 0, preview: '본문 전체' }]);
      }

      if (brokenInternalLinks.length > 0) {
        pushIssue(issues, 'broken-internal-links', 'error', '깨진 내부 링크가 있습니다.', `존재하지 않는 /blog/ 링크 ${brokenInternalLinks.length}개를 확인하세요: ${brokenInternalLinks.slice(0, 2).join(', ')}`, brokenLinkTargets);
      }

      auditSlug(issues, slug);

      if ((titleCounts.get(normalize(title)) || 0) > 1) {
        pushIssue(issues, 'duplicate-title', 'error', '같은 제목의 글이 있습니다.', '검색 의도가 겹치지 않는지 확인하고 필요하면 제목과 콘텐츠 역할을 분리하세요.');
      }

      if (metaDescription && (metaCounts.get(normalize(metaDescription)) || 0) > 1) {
        pushIssue(issues, 'duplicate-meta', 'warning', '다른 글과 메타 설명이 같습니다.', '각 글의 검색 의도에 맞게 고유한 메타 설명을 작성하세요.');
      }

      if (longParagraphTargets.length > 0) {
        pushIssue(issues, 'long-paragraphs', 'warning', '너무 긴 문단이 있습니다.', `${longParagraphTargets.length}개 문단이 450자 이상입니다. 모바일 가독성을 위해 문단을 나누거나 소제목·목록을 활용해보세요.`, longParagraphTargets);
      }

      if (!post.og_image) {
        pushIssue(issues, 'og-image', 'info', '대표 이미지가 없습니다.', '검색 순위 필수 요소는 아니지만 SNS 공유와 클릭 유도용 대표 이미지를 설정할 수 있습니다.');
      }

      const slugIssues = issues.filter((issue) => issue.id.startsWith('slug-'));
      const errors = issues.filter((issue) => issue.severity === 'error').length;
      const warnings = issues.filter((issue) => issue.severity === 'warning').length;
      const score = Math.max(0, Math.min(100, 100 - errors * 18 - warnings * 7));
      const status: SeoAuditStatus = errors > 0 || warnings >= 4 ? 'fix' : warnings > 0 ? 'improve' : 'good';

      return [
        post.id,
        {
          postId: post.id,
          status,
          score,
          issues,
          textLength,
          h2Count,
          imageCount,
          missingAltCount: missingAltTargets.length,
          internalLinkCount: internalLinks.length,
          slugReview: slugIssues.length > 0,
          slugReviewCount: slugIssues.length,
        } satisfies SeoAuditResult,
      ];
    }),
  );
}
