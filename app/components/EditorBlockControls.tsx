'use client';

import {
  useCallback,
  useEffect,
  useState,
  type ChangeEvent,
  type ReactNode,
} from 'react';

import DragHandle from '@tiptap/extension-drag-handle-react';
import type {
  Editor,
} from '@tiptap/react';
import {
  BubbleMenu,
} from '@tiptap/react/menus';
import type {
  Node as ProseMirrorNode,
} from '@tiptap/pm/model';
import {
  Fragment,
} from '@tiptap/pm/model';
import {
  NodeSelection,
  TextSelection,
  type Transaction,
} from '@tiptap/pm/state';

import type {
  EditorImageAlign,
} from '@/app/components/EditorImageBlock';

type Props = {
  editor: Editor | null;
  uploading: boolean;
  onImageUpload: (
    event: ChangeEvent<HTMLInputElement>
  ) => void;
};

type BlockTarget = {
  node: ProseMirrorNode;
  pos: number;
};

type Direction =
  | 'up'
  | 'down';

type SmallButtonProps = {
  children: ReactNode;
  title: string;
  active?: boolean;
  disabled?: boolean;
  danger?: boolean;
  onClick: () => void;
};

function SmallButton({
  children,
  title,
  active = false,
  disabled = false,
  danger = false,
  onClick,
}: SmallButtonProps) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      disabled={disabled}
      onMouseDown={(event) =>
        event.preventDefault()
      }
      onClick={onClick}
      className={`h-8 min-w-8 rounded-lg border px-2 text-[11px] font-black transition disabled:cursor-not-allowed disabled:opacity-30 ${
        danger
          ? 'border-red-800 bg-red-950 text-red-300 hover:bg-red-900'
          : active
            ? 'border-blue-500 bg-blue-600 text-white'
            : 'border-slate-700 bg-slate-800 text-slate-100 hover:bg-slate-700'
      }`}
    >
      {children}
    </button>
  );
}

function getTopLevelBlock(
  editor: Editor,
  requestedPos?: number
): BlockTarget | null {
  const { doc, selection } =
    editor.state;

  if (doc.childCount === 0) {
    return null;
  }

  const position =
    typeof requestedPos ===
    'number'
      ? requestedPos
      : selection.from;

  let offset = 0;

  for (
    let index = 0;
    index < doc.childCount;
    index += 1
  ) {
    const node =
      doc.child(index);

    const end =
      offset + node.nodeSize;

    if (
      position >= offset &&
      position < end
    ) {
      return {
        node,
        pos: offset,
      };
    }

    offset = end;
  }

  const lastNode =
    doc.child(
      doc.childCount - 1
    );

  return {
    node: lastNode,
    pos:
      doc.content.size -
      lastNode.nodeSize,
  };
}

function getTopLevelIndex(
  editor: Editor,
  position: number
) {
  const { doc } =
    editor.state;

  let offset = 0;

  for (
    let index = 0;
    index < doc.childCount;
    index += 1
  ) {
    const node =
      doc.child(index);

    if (
      position >= offset &&
      position <
        offset +
          node.nodeSize
    ) {
      return {
        index,
        pos: offset,
        node,
      };
    }

    offset +=
      node.nodeSize;
  }

  return null;
}

function selectBlock(
  transaction: Transaction,
  position: number,
  node: ProseMirrorNode
) {
  if (
    node.type.name ===
      'image' &&
    NodeSelection.isSelectable(
      node
    )
  ) {
    return transaction.setSelection(
      NodeSelection.create(
        transaction.doc,
        position
      )
    );
  }

  const resolvedPosition =
    Math.min(
      transaction.doc.content
        .size,
      position + 1
    );

  return transaction.setSelection(
    TextSelection.near(
      transaction.doc.resolve(
        resolvedPosition
      )
    )
  );
}

export function moveBlock(
  editor: Editor,
  position: number,
  direction: Direction
) {
  const located =
    getTopLevelIndex(
      editor,
      position
    );

  if (!located) {
    return null;
  }

  const { doc } =
    editor.state;

  const targetIndex =
    direction === 'up'
      ? located.index - 1
      : located.index + 1;

  if (
    targetIndex < 0 ||
    targetIndex >=
      doc.childCount
  ) {
    return located.pos;
  }

  const sibling =
    doc.child(targetIndex);

  const rangeStart =
    direction === 'up'
      ? located.pos -
        sibling.nodeSize
      : located.pos;

  const rangeEnd =
    direction === 'up'
      ? located.pos +
        located.node.nodeSize
      : located.pos +
        located.node.nodeSize +
        sibling.nodeSize;

  const replacement =
    direction === 'up'
      ? Fragment.fromArray([
          located.node,
          sibling,
        ])
      : Fragment.fromArray([
          sibling,
          located.node,
        ]);

  const nextPosition =
    direction === 'up'
      ? rangeStart
      : located.pos +
        sibling.nodeSize;

  const transaction =
    editor.state.tr.replaceWith(
      rangeStart,
      rangeEnd,
      replacement
    );

  selectBlock(
    transaction,
    nextPosition,
    located.node
  );

  editor.view.dispatch(
    transaction.scrollIntoView()
  );

  return nextPosition;
}

export function duplicateBlock(
  editor: Editor,
  position: number
) {
  const located =
    getTopLevelIndex(
      editor,
      position
    );

  if (!located) {
    return null;
  }

  const nextPosition =
    located.pos +
    located.node.nodeSize;

  const copiedNode =
    located.node.copy(
      located.node.content
    );

  const transaction =
    editor.state.tr.insert(
      nextPosition,
      copiedNode
    );

  selectBlock(
    transaction,
    nextPosition,
    copiedNode
  );

  editor.view.dispatch(
    transaction.scrollIntoView()
  );

  return nextPosition;
}

function removeBlock(
  editor: Editor,
  position: number
) {
  const located =
    getTopLevelIndex(
      editor,
      position
    );

  if (!located) {
    return;
  }

  if (
    !window.confirm(
      '선택한 블록을 삭제할까요? 실행 취소(↶)로 되돌릴 수 있습니다.'
    )
  ) {
    return;
  }

  const { doc, schema } =
    editor.state;

  let transaction =
    editor.state.tr;

  if (doc.childCount === 1) {
    const paragraph =
      schema.nodes.paragraph?.create();

    if (!paragraph) {
      return;
    }

    transaction =
      transaction.replaceWith(
        located.pos,
        located.pos +
          located.node.nodeSize,
        paragraph
      );

    selectBlock(
      transaction,
      0,
      paragraph
    );
  } else {
    transaction =
      transaction.delete(
        located.pos,
        located.pos +
          located.node.nodeSize
      );

    const nextPosition =
      Math.min(
        located.pos + 1,
        transaction.doc.content
          .size
      );

    transaction.setSelection(
      TextSelection.near(
        transaction.doc.resolve(
          nextPosition
        )
      )
    );
  }

  editor.view.dispatch(
    transaction.scrollIntoView()
  );
}

export default function EditorBlockControls({
  editor,
  uploading,
  onImageUpload,
}: Props) {
  const [hoveredBlock, setHoveredBlock] =
    useState<BlockTarget | null>(
      null
    );

  const [, forceUpdate] =
    useState(0);

  useEffect(() => {
    if (!editor) {
      return;
    }

    const update = () => {
      forceUpdate(
        (value) => value + 1
      );
    };

    editor.on(
      'selectionUpdate',
      update
    );

    editor.on(
      'transaction',
      update
    );

    return () => {
      editor.off(
        'selectionUpdate',
        update
      );

      editor.off(
        'transaction',
        update
      );
    };
  }, [editor]);

  const handleNodeChange =
    useCallback(
      ({
        node,
        pos,
      }: {
        node: ProseMirrorNode | null;
        editor: Editor;
        pos: number;
      }) => {
        setHoveredBlock(
          node
            ? {
                node,
                pos,
              }
            : null
        );
      },
      []
    );

  if (!editor) {
    return null;
  }

  const currentBlock =
    getTopLevelBlock(
      editor
    );

  const currentLocated =
    currentBlock
      ? getTopLevelIndex(
          editor,
          currentBlock.pos
        )
      : null;

  const imageAttrs =
    editor.isActive('image')
      ? editor.getAttributes(
          'image'
        )
      : null;

  const setImageAttributes = (
    attributes: Record<
      string,
      unknown
    >
  ) => {
    editor
      .chain()
      .focus()
      .updateAttributes(
        'image',
        attributes
      )
      .run();
  };

  const setImageAlign = (
    align: EditorImageAlign
  ) => {
    setImageAttributes({
      align,
    });
  };

  const editImageText = (
    attribute:
      | 'alt'
      | 'caption',
    label: string
  ) => {
    const previous =
      typeof imageAttrs?.[
        attribute
      ] === 'string'
        ? String(
            imageAttrs[
              attribute
            ]
          )
        : '';

    const value =
      window.prompt(
        label,
        previous
      );

    if (value === null) {
      return;
    }

    setImageAttributes({
      [attribute]:
        value.trim(),
    });
  };

  return (
    <>
      <DragHandle
        editor={editor}
        onNodeChange={
          handleNodeChange
        }
        className="hidden items-center gap-1 rounded-xl border border-slate-700 bg-slate-950/95 p-1 shadow-xl sm:flex"
      >
        <span
          title="잡고 위아래로 드래그"
          className="flex h-8 w-7 cursor-grab items-center justify-center rounded-lg text-base font-black text-slate-400 hover:bg-slate-800 hover:text-white active:cursor-grabbing"
        >
          ⠿
        </span>

        <SmallButton
          title="블록을 위로 이동"
          disabled={
            !hoveredBlock ||
            hoveredBlock.pos === 0
          }
          onClick={() => {
            if (!hoveredBlock) {
              return;
            }

            const nextPosition =
              moveBlock(
                editor,
                hoveredBlock.pos,
                'up'
              );

            if (
              nextPosition !== null
            ) {
              setHoveredBlock({
                node:
                  hoveredBlock.node,
                pos:
                  nextPosition,
              });
            }
          }}
        >
          ↑
        </SmallButton>

        <SmallButton
          title="블록을 아래로 이동"
          disabled={
            !hoveredBlock ||
            !getTopLevelIndex(
              editor,
              hoveredBlock.pos
            ) ||
            getTopLevelIndex(
              editor,
              hoveredBlock.pos
            )?.index ===
              editor.state.doc
                .childCount -
                1
          }
          onClick={() => {
            if (!hoveredBlock) {
              return;
            }

            const nextPosition =
              moveBlock(
                editor,
                hoveredBlock.pos,
                'down'
              );

            if (
              nextPosition !== null
            ) {
              setHoveredBlock({
                node:
                  hoveredBlock.node,
                pos:
                  nextPosition,
              });
            }
          }}
        >
          ↓
        </SmallButton>

        <SmallButton
          title="블록 복제"
          disabled={!hoveredBlock}
          onClick={() => {
            if (!hoveredBlock) {
              return;
            }

            const nextPosition =
              duplicateBlock(
                editor,
                hoveredBlock.pos
              );

            if (
              nextPosition !== null
            ) {
              setHoveredBlock({
                node:
                  hoveredBlock.node,
                pos:
                  nextPosition,
              });
            }
          }}
        >
          복제
        </SmallButton>

        <SmallButton
          title="블록 삭제"
          danger
          disabled={!hoveredBlock}
          onClick={() => {
            if (!hoveredBlock) {
              return;
            }

            removeBlock(
              editor,
              hoveredBlock.pos
            );

            setHoveredBlock(
              null
            );
          }}
        >
          삭제
        </SmallButton>
      </DragHandle>

      {/* 터치 화면에서는 선택한 블록을 버튼으로 이동합니다. */}
      <div className="fixed bottom-4 left-1/2 z-50 flex max-w-[calc(100vw-24px)] -translate-x-1/2 items-center gap-2 rounded-2xl border border-slate-700 bg-slate-950/95 px-3 py-2 shadow-2xl sm:hidden">
        <span className="mr-auto text-[11px] font-bold text-slate-400">
          선택 블록 이동
        </span>

        <SmallButton
          title="선택 블록을 위로"
          disabled={
            !currentLocated ||
            currentLocated.index ===
              0
          }
          onClick={() => {
            if (!currentBlock) {
              return;
            }

            moveBlock(
              editor,
              currentBlock.pos,
              'up'
            );
          }}
        >
          ↑
        </SmallButton>

        <SmallButton
          title="선택 블록을 아래로"
          disabled={
            !currentLocated ||
            currentLocated.index ===
              editor.state.doc
                .childCount -
                1
          }
          onClick={() => {
            if (!currentBlock) {
              return;
            }

            moveBlock(
              editor,
              currentBlock.pos,
              'down'
            );
          }}
        >
          ↓
        </SmallButton>

        <SmallButton
          title="선택 블록 복제"
          disabled={!currentBlock}
          onClick={() => {
            if (!currentBlock) {
              return;
            }

            duplicateBlock(
              editor,
              currentBlock.pos
            );
          }}
        >
          복제
        </SmallButton>
      </div>

      {editor ? (
        <BubbleMenu
          editor={editor}
          pluginKey="hohaengImageMenu"
          shouldShow={({
            editor:
              currentEditor,
          }) =>
            currentEditor.isActive(
              'image'
            )
          }
          options={{
            placement: 'top',
            offset: 10,
            flip: true,
            shift: {
              padding: 8,
            },
          }}
          className="flex max-w-[calc(100vw-24px)] flex-wrap items-center justify-center gap-1 rounded-xl border border-slate-700 bg-slate-950/95 p-2 shadow-2xl"
        >
          <SmallButton
            title="사진 왼쪽 정렬"
            active={
              imageAttrs?.align ===
              'left'
            }
            onClick={() =>
              setImageAlign(
                'left'
              )
            }
          >
            왼쪽
          </SmallButton>

          <SmallButton
            title="사진 가운데 정렬"
            active={
              !imageAttrs?.align ||
              imageAttrs.align ===
                'center'
            }
            onClick={() =>
              setImageAlign(
                'center'
              )
            }
          >
            가운데
          </SmallButton>

          <SmallButton
            title="사진 오른쪽 정렬"
            active={
              imageAttrs?.align ===
              'right'
            }
            onClick={() =>
              setImageAlign(
                'right'
              )
            }
          >
            오른쪽
          </SmallButton>

          {[25, 50, 75, 100].map(
            (width) => (
              <SmallButton
                key={width}
                title={`사진 너비 ${width}%`}
                active={
                  Number(
                    imageAttrs?.displayWidth ||
                      100
                  ) === width
                }
                onClick={() =>
                  setImageAttributes({
                    displayWidth:
                      width,
                  })
                }
              >
                {width}%
              </SmallButton>
            )
          )}

          <SmallButton
            title="사진 설명 입력"
            onClick={() =>
              editImageText(
                'caption',
                '사진 아래에 표시할 설명을 입력하세요. 비우면 설명이 제거됩니다.'
              )
            }
          >
            설명
          </SmallButton>

          <SmallButton
            title="검색엔진과 스크린리더용 사진 설명"
            onClick={() =>
              editImageText(
                'alt',
                '사진의 내용을 짧게 설명해주세요.'
              )
            }
          >
            ALT
          </SmallButton>

          <label
            title="선택한 사진 교체"
            className={`flex h-8 cursor-pointer items-center rounded-lg px-2 text-[11px] font-black transition ${
              uploading
                ? 'bg-slate-700 text-slate-400'
                : 'bg-emerald-600 text-white hover:bg-emerald-500'
            }`}
          >
            {uploading
              ? '업로드 중'
              : '교체'}

            <input
              type="file"
              accept="image/*"
              disabled={
                uploading
              }
              onChange={
                onImageUpload
              }
              className="hidden"
            />
          </label>

          <SmallButton
            title="사진 삭제"
            danger
            onClick={() => {
              if (
                window.confirm(
                  '이 사진을 본문에서 삭제할까요? 실행 취소(↶)로 되돌릴 수 있습니다.'
                )
              ) {
                editor
                  .chain()
                  .focus()
                  .deleteSelection()
                  .run();
              }
            }}
          >
            삭제
          </SmallButton>
        </BubbleMenu>
      ) : null}
    </>
  );
}
