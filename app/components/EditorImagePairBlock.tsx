'use client';

import {
  Node,
  mergeAttributes,
} from '@tiptap/core';
import {
  NodeViewWrapper,
  ReactNodeViewRenderer,
  type ReactNodeViewProps,
} from '@tiptap/react';
import type { DOMOutputSpec } from '@tiptap/pm/model';

export type EditorImagePairLayout =
  | 'side-by-side'
  | 'stacked';

function normalizeLayout(
  value: unknown
): EditorImagePairLayout {
  return value === 'stacked'
    ? 'stacked'
    : 'side-by-side';
}

function imageAt(
  element: HTMLElement,
  index: number
) {
  return element.querySelectorAll('img')[index] || null;
}

function readImageAttribute(
  element: HTMLElement,
  index: number,
  name: string
) {
  return imageAt(element, index)?.getAttribute(name) || '';
}

function EditorImagePairNodeView({
  node,
  selected,
  updateAttributes,
}: ReactNodeViewProps) {
  const layout = normalizeLayout(
    node.attrs.layout
  );

  const swapImages = () => {
    updateAttributes({
      src1: node.attrs.src2,
      alt1: node.attrs.alt2,
      src2: node.attrs.src1,
      alt2: node.attrs.alt1,
    });
  };

  const toggleLayout = () => {
    updateAttributes({
      layout:
        layout === 'side-by-side'
          ? 'stacked'
          : 'side-by-side',
    });
  };

  return (
    <NodeViewWrapper
      as="div"
      data-editor-image-pair="true"
      data-layout={layout}
      contentEditable={false}
      className={`group relative my-8 rounded-2xl transition-shadow ${
        selected
          ? 'ring-2 ring-blue-500 ring-offset-4 ring-offset-white'
          : ''
      }`}
    >
      <div
        className={
          layout === 'side-by-side'
            ? 'grid grid-cols-1 gap-2 sm:grid-cols-2'
            : 'grid grid-cols-1 gap-3'
        }
      >
        <figure className="!m-0 overflow-hidden rounded-2xl bg-slate-50">
          {/* eslint-disable-next-line @next/next/no-img-element -- 사용자가 올린 임의 URL을 에디터에서 즉시 표시합니다. */}
          <img
            src={String(node.attrs.src1 || '')}
            alt={String(node.attrs.alt1 || '')}
            draggable={false}
            className="!m-0 !block !h-auto !w-full !max-w-full !rounded-2xl"
          />
        </figure>

        <figure className="!m-0 overflow-hidden rounded-2xl bg-slate-50">
          {/* eslint-disable-next-line @next/next/no-img-element -- 사용자가 올린 임의 URL을 에디터에서 즉시 표시합니다. */}
          <img
            src={String(node.attrs.src2 || '')}
            alt={String(node.attrs.alt2 || '')}
            draggable={false}
            className="!m-0 !block !h-auto !w-full !max-w-full !rounded-2xl"
          />
        </figure>
      </div>

      <div
        className={`absolute left-1/2 top-3 z-20 -translate-x-1/2 items-center gap-1 rounded-xl border border-slate-200 bg-white/95 p-1 shadow-lg backdrop-blur ${
          selected
            ? 'flex'
            : 'hidden group-hover:flex'
        }`}
      >
        <button
          type="button"
          onClick={toggleLayout}
          className="whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-100"
          title="두 사진 배치 방식 바꾸기"
        >
          {layout === 'side-by-side'
            ? '☰ 세로로'
            : '▥ 나란히'}
        </button>

        <button
          type="button"
          onClick={swapImages}
          className="whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-100"
          title="왼쪽과 오른쪽 사진 순서 바꾸기"
        >
          ⇄ 순서
        </button>
      </div>
    </NodeViewWrapper>
  );
}

/**
 * 사진 2장을 하나의 블록으로 저장합니다.
 * side-by-side는 데스크톱에서 2열, 모바일에서 자동 1열로 내려갑니다.
 * stacked는 모든 화면에서 세로 1열입니다.
 */
export const EditorImagePair = Node.create({
  name: 'imagePair',
  group: 'block',
  atom: true,
  selectable: true,
  draggable: true,

  addAttributes() {
    return {
      src1: {
        default: '',
        parseHTML: (element) =>
          readImageAttribute(
            element,
            0,
            'src'
          ),
      },
      alt1: {
        default: '',
        parseHTML: (element) =>
          readImageAttribute(
            element,
            0,
            'alt'
          ),
      },
      src2: {
        default: '',
        parseHTML: (element) =>
          readImageAttribute(
            element,
            1,
            'src'
          ),
      },
      alt2: {
        default: '',
        parseHTML: (element) =>
          readImageAttribute(
            element,
            1,
            'alt'
          ),
      },
      layout: {
        default:
          'side-by-side' satisfies EditorImagePairLayout,
        parseHTML: (element) =>
          normalizeLayout(
            element.getAttribute(
              'data-layout'
            )
          ),
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-editor-image-pair]',
      },
    ];
  },

  renderHTML({
    node,
    HTMLAttributes,
  }) {
    const layout = normalizeLayout(
      node.attrs.layout
    );

    const wrapperAttributes =
      mergeAttributes(
        HTMLAttributes,
        {
          'data-editor-image-pair':
            'true',
          'data-layout': layout,
          class:
            layout === 'side-by-side'
              ? 'editor-image-pair my-8 grid grid-cols-1 gap-2 sm:grid-cols-2'
              : 'editor-image-pair my-8 grid grid-cols-1 gap-3',
        }
      );

    const figureStyle =
      'margin:0; overflow:hidden; border-radius:1rem;';

    const imageStyle =
      'display:block; width:100%; max-width:100%; height:auto; margin:0; border-radius:1rem;';

    return [
      'div',
      wrapperAttributes,
      [
        'figure',
        {
          'data-pair-slot': '1',
          style: figureStyle,
        },
        [
          'img',
          {
            src: node.attrs.src1,
            alt: node.attrs.alt1 || '',
            style: imageStyle,
          },
        ],
      ],
      [
        'figure',
        {
          'data-pair-slot': '2',
          style: figureStyle,
        },
        [
          'img',
          {
            src: node.attrs.src2,
            alt: node.attrs.alt2 || '',
            style: imageStyle,
          },
        ],
      ],
    ] as DOMOutputSpec;
  },

  addNodeView() {
    return ReactNodeViewRenderer(
      EditorImagePairNodeView,
      {
        trackNodeViewPosition: true,
      }
    );
  },
});
