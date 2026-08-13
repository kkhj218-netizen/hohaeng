'use client';

import {
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from 'react';

import {
  mergeAttributes,
} from '@tiptap/core';
import Image from '@tiptap/extension-image';
import {
  NodeViewWrapper,
  ReactNodeViewRenderer,
  type ReactNodeViewProps,
} from '@tiptap/react';
import type {
  DOMOutputSpec,
} from '@tiptap/pm/model';

export type EditorImageAlign =
  | 'left'
  | 'center'
  | 'right';

const MIN_IMAGE_WIDTH = 25;
const MAX_IMAGE_WIDTH = 100;

function normalizeAlign(
  value: unknown
): EditorImageAlign {
  if (
    value === 'left' ||
    value === 'right'
  ) {
    return value;
  }

  return 'center';
}

export function normalizeImageWidth(
  value: unknown
) {
  const numeric =
    typeof value === 'number'
      ? value
      : Number.parseFloat(
          String(value || '')
        );

  if (!Number.isFinite(numeric)) {
    return MAX_IMAGE_WIDTH;
  }

  return Math.min(
    MAX_IMAGE_WIDTH,
    Math.max(
      MIN_IMAGE_WIDTH,
      Math.round(numeric)
    )
  );
}

function findImageElement(
  element: HTMLElement
) {
  return element.tagName === 'IMG'
    ? element
    : element.querySelector('img');
}

function readImageAttribute(
  element: HTMLElement,
  name: string
) {
  return findImageElement(element)
    ?.getAttribute(name) || null;
}

function readDisplayWidth(
  element: HTMLElement
) {
  const dataWidth =
    element.getAttribute(
      'data-width'
    ) ||
    findImageElement(element)
      ?.getAttribute(
        'data-width'
      );

  if (dataWidth) {
    return normalizeImageWidth(
      dataWidth
    );
  }

  const styleWidth =
    element.style.width;

  if (
    styleWidth.endsWith('%')
  ) {
    return normalizeImageWidth(
      styleWidth
    );
  }

  return MAX_IMAGE_WIDTH;
}

function EditorImageNodeView({
  node,
  selected,
  updateAttributes,
}: ReactNodeViewProps) {
  const figureRef =
    useRef<HTMLElement | null>(
      null
    );

  const savedWidth =
    normalizeImageWidth(
      node.attrs.displayWidth
    );

  const [previewWidth, setPreviewWidth] =
    useState<number | null>(
      null
    );

  const currentWidth =
    previewWidth ?? savedWidth;

  useEffect(() => {
    return () => {
      document.body.style.userSelect =
        '';
    };
  }, []);

  const align =
    normalizeAlign(
      node.attrs.align
    );

  const beginResize = (
    event: ReactPointerEvent<HTMLButtonElement>
  ) => {
    event.preventDefault();
    event.stopPropagation();

    const figure =
      figureRef.current;

    const editorContent =
      figure?.parentElement;

    if (
      !figure ||
      !editorContent
    ) {
      return;
    }

    const startX =
      event.clientX;

    const startWidth =
      currentWidth;

    const containerWidth =
      editorContent.getBoundingClientRect()
        .width;

    if (
      containerWidth <= 0
    ) {
      return;
    }

    document.body.style.userSelect =
      'none';

    let nextWidth =
      startWidth;

    const handlePointerMove = (
      pointerEvent: PointerEvent
    ) => {
      const delta =
        pointerEvent.clientX -
        startX;

      const directionMultiplier =
        align === 'right'
          ? -1
          : align === 'center'
            ? 2
            : 1;

      nextWidth =
        normalizeImageWidth(
          startWidth +
            (delta /
              containerWidth) *
              100 *
              directionMultiplier
        );

      setPreviewWidth(
        nextWidth
      );
    };

    const finishResize = () => {
      document.body.style.userSelect =
        '';

      window.removeEventListener(
        'pointermove',
        handlePointerMove
      );

      window.removeEventListener(
        'pointerup',
        finishResize
      );

      window.removeEventListener(
        'pointercancel',
        finishResize
      );

      updateAttributes({
        displayWidth:
          nextWidth,
      });

      setPreviewWidth(
        null
      );
    };

    window.addEventListener(
      'pointermove',
      handlePointerMove
    );

    window.addEventListener(
      'pointerup',
      finishResize,
      {
        once: true,
      }
    );

    window.addEventListener(
      'pointercancel',
      finishResize,
      {
        once: true,
      }
    );
  };

  const caption =
    typeof node.attrs.caption ===
      'string'
      ? node.attrs.caption.trim()
      : '';

  return (
    <NodeViewWrapper
      as="figure"
      ref={figureRef}
      data-editor-image="true"
      data-align={align}
      data-width={currentWidth}
      contentEditable={false}
      className={`group relative max-w-full transition-[width,box-shadow] ${
        selected
          ? 'rounded-2xl ring-2 ring-blue-500 ring-offset-4 ring-offset-white'
          : ''
      }`}
      style={{
        width:
          `${currentWidth}%`,
      }}
    >
      <div className="relative">
        {/* eslint-disable-next-line @next/next/no-img-element -- 에디터는 사용자가 올린 임의 URL을 즉시 표시해야 합니다. */}
        <img
          src={String(
            node.attrs.src || ''
          )}
          alt={String(
            node.attrs.alt || ''
          )}
          title={
            typeof node.attrs.title ===
            'string'
              ? node.attrs.title
              : undefined
          }
          draggable={false}
          className="!m-0 !block !h-auto !w-full !max-w-full !rounded-2xl"
        />

        <button
          type="button"
          title="모서리를 드래그해 사진 크기 조절"
          aria-label="사진 크기 조절"
          onPointerDown={
            beginResize
          }
          className={`absolute -bottom-2 h-6 w-6 rounded-full border-2 border-white bg-blue-600 shadow-lg transition-opacity ${
            align === 'right'
              ? '-left-2 cursor-nesw-resize'
              : '-right-2 cursor-nwse-resize'
          } ${
            selected
              ? 'opacity-100'
              : 'opacity-0 group-hover:opacity-100'
          }`}
        />
      </div>

      {caption ? (
        <figcaption className="mt-3 text-center text-sm leading-6 text-slate-500">
          {caption}
        </figcaption>
      ) : null}
    </NodeViewWrapper>
  );
}

/**
 * 기존의 단순 <img> 본문을 그대로 읽으면서,
 * 새로 저장할 때는 정렬·크기·설명을 가진 figure 블록으로 만듭니다.
 */
export const EditorImage =
  Image.extend({
    addAttributes() {
      return {
        src: {
          default: null,
          parseHTML: (
            element
          ) =>
            readImageAttribute(
              element,
              'src'
            ),
        },
        alt: {
          default: null,
          parseHTML: (
            element
          ) =>
            readImageAttribute(
              element,
              'alt'
            ),
        },
        title: {
          default: null,
          parseHTML: (
            element
          ) =>
            readImageAttribute(
              element,
              'title'
            ),
        },
        width: {
          default: null,
          parseHTML: (
            element
          ) =>
            readImageAttribute(
              element,
              'width'
            ),
        },
        height: {
          default: null,
          parseHTML: (
            element
          ) =>
            readImageAttribute(
              element,
              'height'
            ),
        },
        align: {
          default:
            'center' satisfies EditorImageAlign,
          parseHTML: (
            element
          ) =>
            normalizeAlign(
              element.getAttribute(
                'data-align'
              ) ||
                findImageElement(
                  element
                )?.getAttribute(
                  'data-align'
                )
            ),
        },
        displayWidth: {
          default:
            MAX_IMAGE_WIDTH,
          parseHTML:
            readDisplayWidth,
        },
        caption: {
          default: '',
          parseHTML: (
            element
          ) =>
            element
              .querySelector(
                'figcaption'
              )
              ?.textContent?.trim() ||
            element.getAttribute(
              'data-caption'
            ) ||
            '',
        },
      };
    },

    parseHTML() {
      return [
        {
          tag: 'figure[data-editor-image]',
        },
        {
          tag: this.options
            .allowBase64
            ? 'img[src]'
            : 'img[src]:not([src^="data:"])',
        },
      ];
    },

    renderHTML({
      node,
    }) {
      const align =
        normalizeAlign(
          node.attrs.align
        );

      const displayWidth =
        normalizeImageWidth(
          node.attrs.displayWidth
        );

      const caption =
        typeof node.attrs.caption ===
          'string'
          ? node.attrs.caption.trim()
          : '';

      const imageAttributes =
        mergeAttributes(
          this.options
            .HTMLAttributes,
          {
            src:
              node.attrs.src,
            alt:
              node.attrs.alt || '',
            title:
              node.attrs.title ||
              null,
            width:
              node.attrs.width ||
              null,
            height:
              node.attrs.height ||
              null,
          }
        );

      const imageSpec: DOMOutputSpec = [
        'img',
        imageAttributes,
      ];

      const figureAttributes = {
        'data-editor-image':
          'true',
        'data-align': align,
        'data-width':
          String(displayWidth),
        style:
          `width: ${displayWidth}%;`,
      };

      if (!caption) {
        return [
          'figure',
          figureAttributes,
          imageSpec,
        ] as DOMOutputSpec;
      }

      return [
        'figure',
        figureAttributes,
        imageSpec,
        [
          'figcaption',
          {},
          caption,
        ],
      ] as DOMOutputSpec;
    },

    addNodeView() {
      return ReactNodeViewRenderer(
        EditorImageNodeView,
        {
          trackNodeViewPosition:
            true,
        }
      );
    },
  }).configure({
    inline: false,
    allowBase64: true,
  });
