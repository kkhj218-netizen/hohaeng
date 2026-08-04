type RootNode = {
  type: 'root';
  children: HtmlNode[];
};

type ElementNode = {
  type: 'element';
  tag: string;
  openingTag: string;
  closingTag: string;
  children: HtmlNode[];
};

type TextNode = {
  type: 'text';
  value: string;
};

type HtmlNode =
  | ElementNode
  | TextNode;

const VOID_TAGS = new Set([
  'area',
  'base',
  'br',
  'col',
  'embed',
  'hr',
  'img',
  'input',
  'link',
  'meta',
  'param',
  'source',
  'track',
  'wbr',
]);

const RICH_LIST_BLOCKS = new Set([
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'blockquote',
]);

const MEANINGFUL_EMPTY_TAGS = new Set([
  'img',
  'video',
  'audio',
  'iframe',
  'pre',
  'hr',
]);

/**
 * 작성 화면과 발행 화면이 함께 사용하는 본문 스타일입니다.
 * Tailwind가 모든 클래스를 정적으로 찾을 수 있도록
 * 완전한 클래스명만 사용합니다.
 */
export const EDITOR_CONTENT_CLASS = [
  'text-[16px]',
  'sm:text-[17px]',
  'text-slate-800',
  'leading-[1.9]',
  'break-words',

  '[&>*:first-child]:mt-0',
  '[&>*:last-child]:mb-0',

  '[&_p]:my-4',
  '[&_p:empty]:min-h-[1.6em]',

  '[&_h2]:text-[28px]',
  '[&_h2]:sm:text-[32px]',
  '[&_h2]:font-black',
  '[&_h2]:tracking-[-0.025em]',
  '[&_h2]:leading-[1.35]',
  '[&_h2]:text-slate-950',
  '[&_h2]:mt-14',
  '[&_h2]:mb-6',

  '[&_h3]:text-[23px]',
  '[&_h3]:sm:text-[26px]',
  '[&_h3]:font-extrabold',
  '[&_h3]:tracking-[-0.02em]',
  '[&_h3]:leading-[1.4]',
  '[&_h3]:text-slate-900',
  '[&_h3]:mt-11',
  '[&_h3]:mb-5',

  '[&_h4]:text-[19px]',
  '[&_h4]:sm:text-[21px]',
  '[&_h4]:font-extrabold',
  '[&_h4]:text-slate-900',
  '[&_h4]:mt-9',
  '[&_h4]:mb-4',

  '[&_strong]:font-black',
  '[&_em]:italic',

  '[&_u]:underline',
  '[&_u]:underline-offset-4',

  '[&_img]:block',
  '[&_img]:max-w-full',
  '[&_img]:h-auto',
  '[&_img]:mx-auto',
  '[&_img]:my-8',
  '[&_img]:rounded-2xl',

  '[&_ul]:list-disc',
  '[&_ul]:pl-7',
  '[&_ul]:my-6',
  '[&_ul_ul]:my-2',

  '[&_ol]:list-decimal',
  '[&_ol]:pl-7',
  '[&_ol]:my-6',
  '[&_ol_ol]:my-2',

  '[&_li]:my-2',
  '[&_li]:pl-1',
  '[&_li_p]:my-0',

  '[&_blockquote]:my-8',
  '[&_blockquote]:rounded-r-2xl',
  '[&_blockquote]:border-l-4',
  '[&_blockquote]:border-blue-500',
  '[&_blockquote]:bg-blue-50/70',
  '[&_blockquote]:px-6',
  '[&_blockquote]:py-5',
  '[&_blockquote]:text-slate-600',
  '[&_blockquote]:leading-8',
  '[&_blockquote_p]:my-0',

  '[&_a]:font-semibold',
  '[&_a]:text-blue-600',
  '[&_a]:underline',
  '[&_a]:decoration-blue-300',
  '[&_a]:underline-offset-4',
  'hover:[&_a]:text-blue-500',

  '[&_hr]:my-12',
  '[&_hr]:border-0',
  '[&_hr]:border-t',
  '[&_hr]:border-slate-200',

  '[&_mark]:rounded',
  '[&_mark]:px-1',
  '[&_mark]:py-0.5',

  '[&_code]:rounded-md',
  '[&_code]:bg-slate-100',
  '[&_code]:px-1.5',
  '[&_code]:py-0.5',
  '[&_code]:text-[0.9em]',
  '[&_code]:font-mono',
  '[&_code]:text-pink-600',

  '[&_pre]:my-8',
  '[&_pre]:overflow-x-auto',
  '[&_pre]:rounded-2xl',
  '[&_pre]:bg-slate-950',
  '[&_pre]:p-5',
  '[&_pre]:text-sm',
  '[&_pre]:leading-7',
  '[&_pre]:text-slate-100',

  '[&_pre_code]:bg-transparent',
  '[&_pre_code]:p-0',
  '[&_pre_code]:text-inherit',

  '[&_s]:text-slate-500',
].join(' ');

function parseHtmlFragment(
  html: string
): RootNode {
  const root: RootNode = {
    type: 'root',
    children: [],
  };

  const stack: Array<
    RootNode | ElementNode
  > = [root];

  const tokens =
    html.match(
      /<!--[\s\S]*?-->|<![^>]*>|<\/?[A-Za-z][^>]*>|[^<]+|</g
    ) || [];

  for (const token of tokens) {
    const current =
      stack[stack.length - 1];

    if (
      token.startsWith('<!--') ||
      token.startsWith('<!')
    ) {
      current.children.push({
        type: 'text',
        value: token,
      });

      continue;
    }

    const closingMatch =
      token.match(
        /^<\/\s*([A-Za-z0-9-]+)[^>]*>$/
      );

    if (closingMatch) {
      const closingTag =
        closingMatch[1].toLowerCase();

      for (
        let index = stack.length - 1;
        index > 0;
        index -= 1
      ) {
        const candidate =
          stack[index];

        if (
          candidate.type === 'element' &&
          candidate.tag === closingTag
        ) {
          candidate.closingTag =
            token;

          stack.length = index;
          break;
        }
      }

      continue;
    }

    const openingMatch =
      token.match(
        /^<\s*([A-Za-z0-9-]+)(?:\s[^>]*)?>$/
      );

    if (openingMatch) {
      const tag =
        openingMatch[1].toLowerCase();

      const node: ElementNode = {
        type: 'element',
        tag,
        openingTag: token,
        closingTag: `</${tag}>`,
        children: [],
      };

      current.children.push(node);

      if (
        !VOID_TAGS.has(tag) &&
        !token.endsWith('/>')
      ) {
        stack.push(node);
      }

      continue;
    }

    current.children.push({
      type: 'text',
      value: token,
    });
  }

  return root;
}

function serializeNode(
  node: HtmlNode
): string {
  if (node.type === 'text') {
    return node.value;
  }

  if (VOID_TAGS.has(node.tag)) {
    return node.openingTag;
  }

  return (
    node.openingTag +
    node.children
      .map(serializeNode)
      .join('') +
    node.closingTag
  );
}

function textHasContent(
  value: string
) {
  return value
    .replace(
      /&(?:nbsp|#160|#xA0);/gi,
      ''
    )
    .trim()
    .length > 0;
}

function hasMeaningfulContent(
  node: HtmlNode
): boolean {
  if (node.type === 'text') {
    return textHasContent(
      node.value
    );
  }

  if (
    MEANINGFUL_EMPTY_TAGS.has(
      node.tag
    )
  ) {
    return true;
  }

  if (node.tag === 'br') {
    return false;
  }

  return node.children.some(
    hasMeaningfulContent
  );
}

function containsRichListBlock(
  node: HtmlNode
): boolean {
  if (node.type === 'text') {
    return false;
  }

  if (
    RICH_LIST_BLOCKS.has(node.tag)
  ) {
    return true;
  }

  return node.children.some(
    containsRichListBlock
  );
}

function normalizeNode(
  node: HtmlNode,
  insideBlockquote = false
): HtmlNode[] {
  if (node.type === 'text') {
    return [node];
  }

  const isBlockquote =
    node.tag === 'blockquote';

  node.children =
    node.children.flatMap(
      (child) =>
        normalizeNode(
          child,
          insideBlockquote ||
            isBlockquote
        )
    );

  // 인용문 안에 인용문이 들어간 경우
  // 안쪽 껍데기만 제거합니다.
  if (
    isBlockquote &&
    insideBlockquote
  ) {
    return node.children;
  }

  // 내용이 없는 번호 또는 글머리표를 제거합니다.
  if (
    node.tag === 'li' &&
    !node.children.some(
      hasMeaningfulContent
    )
  ) {
    return [];
  }

  if (
    node.tag === 'ol' ||
    node.tag === 'ul'
  ) {
    const listItems =
      node.children.filter(
        (
          child
        ): child is ElementNode =>
          child.type === 'element' &&
          child.tag === 'li'
      );

    if (listItems.length === 0) {
      return [];
    }

    /*
     * 제목 또는 요약 박스가 실수로 번호 목록 전체에
     * 묶인 경우 목록 껍데기만 제거합니다.
     *
     * 일반적인 번호 목록과 글머리표 목록은
     * 그대로 유지됩니다.
     */
    if (
      listItems.some(
        containsRichListBlock
      )
    ) {
      return listItems.flatMap(
        (item) => item.children
      );
    }

    node.children = listItems;
  }

  if (
    isBlockquote &&
    !node.children.some(
      hasMeaningfulContent
    )
  ) {
    return [];
  }

  return [node];
}

/**
 * Tiptap HTML에서 다음 문제를 정리합니다.
 *
 * 1. 내용이 없는 번호 또는 글머리표 항목
 * 2. 제목이나 요약 박스가 잘못 감싸진 목록
 * 3. 중첩된 인용 박스
 */
export function normalizeEditorHtml(
  html: string | null | undefined
) {
  if (!html) {
    return '';
  }

  const parsed =
    parseHtmlFragment(html);

  parsed.children =
    parsed.children.flatMap(
      (node) =>
        normalizeNode(node)
    );

  return parsed.children
    .map(serializeNode)
    .join('');
}