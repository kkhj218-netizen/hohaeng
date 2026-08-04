'use client';

import {
  useEffect,
  useState,
  type ChangeEvent,
  type ReactNode,
} from 'react';

import type { Editor } from '@tiptap/react';

// Tiptap command 타입 확장
import '@tiptap/extension-text-style';
import '@tiptap/extension-text-align';
import '@tiptap/extension-highlight';

type Props = {
  editor: Editor | null;
  uploading: boolean;
  onImageUpload: (
    e: ChangeEvent<HTMLInputElement>
  ) => void;
};

type ToolbarButtonProps = {
  children: ReactNode;
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  title?: string;
};

const fontSizes = [
  '12px',
  '13px',
  '14px',
  '15px',
  '16px',
  '18px',
  '20px',
  '22px',
  '24px',
  '28px',
  '32px',
  '36px',
  '40px',
  '48px',
];

const textColors = [
  '#111827',
  '#475569',
  '#2563eb',
  '#0891b2',
  '#059669',
  '#dc2626',
  '#ea580c',
  '#9333ea',
];

const highlightColors = [
  '#fef08a',
  '#fed7aa',
  '#fecaca',
  '#fbcfe8',
  '#ddd6fe',
  '#bfdbfe',
  '#a7f3d0',
  '#e2e8f0',
];

function ToolbarButton({
  children,
  onClick,
  active = false,
  disabled = false,
  title,
}: ToolbarButtonProps) {
  return (
    <button
      type="button"
      title={title}
      disabled={disabled}
      onMouseDown={(e) =>
        e.preventDefault()
      }
      onClick={onClick}
      className={`h-9 min-w-9 px-2.5 rounded-lg border text-xs font-bold transition-all disabled:opacity-30 disabled:cursor-not-allowed ${
        active
          ? 'bg-blue-600 border-blue-500 text-white'
          : 'bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700 hover:border-slate-600'
      }`}
    >
      {children}
    </button>
  );
}

export default function EditorToolbar({
  editor,
  uploading,
  onImageUpload,
}: Props) {
  // 선택 영역이 바뀔 때 툴바 활성상태 갱신
  const [, forceUpdate] =
    useState(0);

  useEffect(() => {
    if (!editor) return;

    const updateToolbar = () => {
      forceUpdate(
        (value) => value + 1
      );
    };

    editor.on(
      'selectionUpdate',
      updateToolbar
    );

    editor.on(
      'transaction',
      updateToolbar
    );

    return () => {
      editor.off(
        'selectionUpdate',
        updateToolbar
      );

      editor.off(
        'transaction',
        updateToolbar
      );
    };
  }, [editor]);

  if (!editor) {
    return (
      <div className="sticky top-16 z-40 bg-slate-900 border border-slate-800 rounded-t-2xl p-4 text-sm text-slate-500 shadow-xl">
        에디터 준비 중...
      </div>
    );
  }

  // =========================================================
  // 링크
  // =========================================================

  const handleLink = () => {
    const previousUrl =
      editor.getAttributes(
        'link'
      ).href || '';

    const input =
      window.prompt(
        '연결할 주소를 입력하세요.',
        previousUrl ||
          'https://'
      );

    if (input === null) {
      return;
    }

    const value =
      input.trim();

    // 주소를 비우면 링크 해제
    if (!value) {
      editor
        .chain()
        .focus()
        .extendMarkRange(
          'link'
        )
        .unsetLink()
        .run();

      return;
    }

    // naver.com 처럼 입력해도 자동 https
    const url =
      /^[a-zA-Z][a-zA-Z\d+\-.]*:/.test(
        value
      )
        ? value
        : `https://${value}`;

    editor
      .chain()
      .focus()
      .extendMarkRange(
        'link'
      )
      .setLink({
        href: url,
        target: '_blank',
      })
      .run();
  };

  // =========================================================
  // 서식 초기화
  // =========================================================

  const clearFormatting = () => {
    editor
      .chain()
      .focus()
      .unsetAllMarks()
      .clearNodes()
      .run();
  };

  // =========================================================
  // 현재 블록 종류
  // =========================================================

  let currentBlock =
    'paragraph';

  if (
    editor.isActive(
      'heading',
      {
        level: 2,
      }
    )
  ) {
    currentBlock = 'h2';
  }

  if (
    editor.isActive(
      'heading',
      {
        level: 3,
      }
    )
  ) {
    currentBlock = 'h3';
  }

  if (
    editor.isActive(
      'heading',
      {
        level: 4,
      }
    )
  ) {
    currentBlock = 'h4';
  }

  return (
    <div className="sticky top-16 z-40 bg-slate-900 border border-slate-800 rounded-t-2xl overflow-hidden shadow-xl">

      {/* ==========================================
          1줄: 글꼴 / 크기 / 문단 / 줄간격
      =========================================== */}
      <div className="p-3 border-b border-slate-800 flex flex-wrap items-center gap-2">

        {/* 글꼴 */}
        <select
          defaultValue=""
          title="글꼴"
          onChange={(e) => {
            const value =
              e.target.value;

            if (!value) {
              editor
                .chain()
                .focus()
                .unsetFontFamily()
                .run();

              return;
            }

            editor
              .chain()
              .focus()
              .setFontFamily(
                value
              )
              .run();
          }}
          className="h-9 bg-slate-800 border border-slate-700 rounded-lg px-2.5 text-xs font-bold text-white focus:outline-none focus:border-blue-500"
        >
          <option value="">
            기본 글꼴
          </option>

          <option value="'Pretendard', 'Noto Sans KR', 'Apple SD Gothic Neo', 'Malgun Gothic', sans-serif">
            깔끔한 고딕
          </option>

          <option value="'Malgun Gothic', sans-serif">
            맑은 고딕
          </option>

          <option value="'Apple SD Gothic Neo', sans-serif">
            Apple 고딕
          </option>

          <option value="Georgia, serif">
            Georgia
          </option>

          <option value="'Times New Roman', serif">
            Times
          </option>

          <option value="monospace">
            고정폭
          </option>
        </select>

        {/* 글자 크기 */}
        <select
          defaultValue=""
          title="글자 크기"
          onChange={(e) => {
            const value =
              e.target.value;

            if (!value) {
              editor
                .chain()
                .focus()
                .unsetFontSize()
                .run();

              return;
            }

            editor
              .chain()
              .focus()
              .setFontSize(
                value
              )
              .run();
          }}
          className="h-9 bg-slate-800 border border-slate-700 rounded-lg px-2.5 text-xs font-bold text-white focus:outline-none focus:border-blue-500"
        >
          <option value="">
            글자 크기
          </option>

          {fontSizes.map(
            (size) => (
              <option
                key={size}
                value={size}
              >
                {size.replace(
                  'px',
                  ''
                )}
              </option>
            )
          )}
        </select>

        {/* 문단 스타일 */}
        <select
          value={
            currentBlock
          }
          title="문단 스타일"
          onChange={(e) => {
            const value =
              e.target.value;

            if (
              value ===
              'paragraph'
            ) {
              editor
                .chain()
                .focus()
                .setParagraph()
                .run();

              return;
            }

            const level =
              Number(
                value.replace(
                  'h',
                  ''
                )
              ) as
                | 2
                | 3
                | 4;

            editor
              .chain()
              .focus()
              .setHeading({
                level,
              })
              .run();
          }}
          className="h-9 bg-slate-800 border border-slate-700 rounded-lg px-2.5 text-xs font-bold text-white focus:outline-none focus:border-blue-500"
        >
          <option value="paragraph">
            본문
          </option>

          <option value="h2">
            큰 제목 H2
          </option>

          <option value="h3">
            소제목 H3
          </option>

          <option value="h4">
            작은 제목 H4
          </option>
        </select>

        {/* 줄간격 */}
        <select
          defaultValue=""
          title="줄간격"
          onChange={(e) => {
            const value =
              e.target.value;

            if (!value) {
              editor
                .chain()
                .focus()
                .unsetLineHeight()
                .run();

              return;
            }

            editor
              .chain()
              .focus()
              .setLineHeight(
                value
              )
              .run();
          }}
          className="h-9 bg-slate-800 border border-slate-700 rounded-lg px-2.5 text-xs font-bold text-white focus:outline-none focus:border-blue-500"
        >
          <option value="">
            줄간격
          </option>

          <option value="1.2">
            1.2
          </option>

          <option value="1.4">
            1.4
          </option>

          <option value="1.6">
            1.6
          </option>

          <option value="1.8">
            1.8
          </option>

          <option value="2">
            2.0
          </option>

          <option value="2.4">
            2.4
          </option>
        </select>

        <div className="hidden sm:block w-px h-6 bg-slate-700 mx-1" />

        {/* Undo */}
        <ToolbarButton
          title="실행 취소"
          disabled={
            !editor
              .can()
              .chain()
              .focus()
              .undo()
              .run()
          }
          onClick={() =>
            editor
              .chain()
              .focus()
              .undo()
              .run()
          }
        >
          ↶
        </ToolbarButton>

        {/* Redo */}
        <ToolbarButton
          title="다시 실행"
          disabled={
            !editor
              .can()
              .chain()
              .focus()
              .redo()
              .run()
          }
          onClick={() =>
            editor
              .chain()
              .focus()
              .redo()
              .run()
          }
        >
          ↷
        </ToolbarButton>

      </div>

      {/* ==========================================
          2줄: 굵게 / 밑줄 / 색 / 정렬 등
      =========================================== */}
      <div className="p-3 border-b border-slate-800 flex flex-wrap items-center gap-2">

        <ToolbarButton
          title="굵게"
          active={
            editor.isActive(
              'bold'
            )
          }
          onClick={() =>
            editor
              .chain()
              .focus()
              .toggleBold()
              .run()
          }
        >
          <span className="font-black text-base">
            B
          </span>
        </ToolbarButton>

        <ToolbarButton
          title="기울임"
          active={
            editor.isActive(
              'italic'
            )
          }
          onClick={() =>
            editor
              .chain()
              .focus()
              .toggleItalic()
              .run()
          }
        >
          <span className="italic text-base">
            I
          </span>
        </ToolbarButton>

        <ToolbarButton
          title="밑줄"
          active={
            editor.isActive(
              'underline'
            )
          }
          onClick={() =>
            editor
              .chain()
              .focus()
              .toggleUnderline()
              .run()
          }
        >
          <span className="underline text-base">
            U
          </span>
        </ToolbarButton>

        <ToolbarButton
          title="취소선"
          active={
            editor.isActive(
              'strike'
            )
          }
          onClick={() =>
            editor
              .chain()
              .focus()
              .toggleStrike()
              .run()
          }
        >
          <span className="line-through text-base">
            S
          </span>
        </ToolbarButton>

        <div className="w-px h-6 bg-slate-700 mx-1" />

        {/* 글자색 */}
        <label
          title="글자색"
          className="h-9 flex items-center gap-2 bg-slate-800 border border-slate-700 rounded-lg px-2.5 text-xs font-bold cursor-pointer"
        >
          <span>
            A
          </span>

          <input
            type="color"
            defaultValue="#2563eb"
            onChange={(e) =>
              editor
                .chain()
                .focus()
                .setColor(
                  e.target.value
                )
                .run()
            }
            className="w-5 h-5 bg-transparent border-0 p-0 cursor-pointer"
          />
        </label>

        <ToolbarButton
          title="글자색 제거"
          onClick={() =>
            editor
              .chain()
              .focus()
              .unsetColor()
              .run()
          }
        >
          A×
        </ToolbarButton>

        {/* 형광펜 */}
        <label
          title="형광펜 색"
          className="h-9 flex items-center gap-2 bg-slate-800 border border-slate-700 rounded-lg px-2.5 text-xs font-bold cursor-pointer"
        >
          <span>
            🖍
          </span>

          <input
            type="color"
            defaultValue="#fef08a"
            onChange={(e) =>
              editor
                .chain()
                .focus()
                .setHighlight({
                  color:
                    e.target
                      .value,
                })
                .run()
            }
            className="w-5 h-5 bg-transparent border-0 p-0 cursor-pointer"
          />
        </label>

        <ToolbarButton
          title="형광펜 제거"
          onClick={() =>
            editor
              .chain()
              .focus()
              .unsetHighlight()
              .run()
          }
        >
          🖍×
        </ToolbarButton>

        <div className="w-px h-6 bg-slate-700 mx-1" />

        {/* 정렬 */}
        <ToolbarButton
          title="왼쪽 정렬"
          active={
            editor.isActive({
              textAlign:
                'left',
            })
          }
          onClick={() =>
            editor
              .chain()
              .focus()
              .setTextAlign(
                'left'
              )
              .run()
          }
        >
          ≡←
        </ToolbarButton>

        <ToolbarButton
          title="가운데 정렬"
          active={
            editor.isActive({
              textAlign:
                'center',
            })
          }
          onClick={() =>
            editor
              .chain()
              .focus()
              .setTextAlign(
                'center'
              )
              .run()
          }
        >
          ≡
        </ToolbarButton>

        <ToolbarButton
          title="오른쪽 정렬"
          active={
            editor.isActive({
              textAlign:
                'right',
            })
          }
          onClick={() =>
            editor
              .chain()
              .focus()
              .setTextAlign(
                'right'
              )
              .run()
          }
        >
          →≡
        </ToolbarButton>

        <ToolbarButton
          title="양쪽 정렬"
          active={
            editor.isActive({
              textAlign:
                'justify',
            })
          }
          onClick={() =>
            editor
              .chain()
              .focus()
              .setTextAlign(
                'justify'
              )
              .run()
          }
        >
          ☰
        </ToolbarButton>

      </div>

      {/* ==========================================
          빠른 글자 색상
      =========================================== */}
      <div className="px-3 py-2 border-b border-slate-800 flex flex-wrap items-center gap-2">

        <span className="text-[11px] text-slate-500 mr-1">
          글자색
        </span>

        {textColors.map(
          (color) => (
            <button
              type="button"
              key={color}
              title={color}
              onMouseDown={(e) =>
                e.preventDefault()
              }
              onClick={() =>
                editor
                  .chain()
                  .focus()
                  .setColor(
                    color
                  )
                  .run()
              }
              className="w-5 h-5 rounded-full border-2 border-slate-600 hover:scale-110 transition-transform"
              style={{
                backgroundColor:
                  color,
              }}
            />
          )
        )}

        <div className="w-px h-5 bg-slate-700 mx-2" />

        <span className="text-[11px] text-slate-500 mr-1">
          형광펜
        </span>

        {highlightColors.map(
          (color) => (
            <button
              type="button"
              key={color}
              title={color}
              onMouseDown={(e) =>
                e.preventDefault()
              }
              onClick={() =>
                editor
                  .chain()
                  .focus()
                  .setHighlight({
                    color,
                  })
                  .run()
              }
              className="w-5 h-5 rounded-md border border-slate-600 hover:scale-110 transition-transform"
              style={{
                backgroundColor:
                  color,
              }}
            />
          )
        )}

      </div>

      {/* ==========================================
          3줄: 목록 / 링크 / 인용 / 이미지
      =========================================== */}
      <div className="p-3 flex flex-wrap items-center gap-2">

        {/* 글머리표 */}
        <ToolbarButton
          title="글머리표 목록"
          active={
            editor.isActive(
              'bulletList'
            )
          }
          onClick={() =>
            editor
              .chain()
              .focus()
              .toggleBulletList()
              .run()
          }
        >
          • 목록
        </ToolbarButton>

        {/* 번호 목록 */}
        <ToolbarButton
          title="번호 목록"
          active={
            editor.isActive(
              'orderedList'
            )
          }
          onClick={() =>
            editor
              .chain()
              .focus()
              .toggleOrderedList()
              .run()
          }
        >
          1. 목록
        </ToolbarButton>

        {/* 인용구 */}
        <ToolbarButton
          title="인용구"
          active={
            editor.isActive(
              'blockquote'
            )
          }
          onClick={() =>
            editor
              .chain()
              .focus()
              .toggleBlockquote()
              .run()
          }
        >
          ❝ 인용
        </ToolbarButton>

        {/* 구분선 */}
        <ToolbarButton
          title="구분선"
          onClick={() =>
            editor
              .chain()
              .focus()
              .setHorizontalRule()
              .run()
          }
        >
          ─ 구분선
        </ToolbarButton>

        <div className="w-px h-6 bg-slate-700 mx-1" />

        {/* 링크 */}
        <ToolbarButton
          title="링크 추가 또는 수정"
          active={
            editor.isActive(
              'link'
            )
          }
          onClick={
            handleLink
          }
        >
          🔗 링크
        </ToolbarButton>

        <ToolbarButton
          title="링크 제거"
          disabled={
            !editor.isActive(
              'link'
            )
          }
          onClick={() =>
            editor
              .chain()
              .focus()
              .unsetLink()
              .run()
          }
        >
          🔗×
        </ToolbarButton>

        {/* 코드 */}
        <ToolbarButton
          title="인라인 코드"
          active={
            editor.isActive(
              'code'
            )
          }
          onClick={() =>
            editor
              .chain()
              .focus()
              .toggleCode()
              .run()
          }
        >
          {'</>'}
        </ToolbarButton>

        {/* 서식 초기화 */}
        <ToolbarButton
          title="선택 영역의 서식 초기화"
          onClick={
            clearFormatting
          }
        >
          🧹 서식지우기
        </ToolbarButton>

        {/* 사진 */}
        <label
          className={`ml-auto h-9 flex items-center justify-center px-3 rounded-lg text-xs font-bold cursor-pointer transition-colors ${
            uploading
              ? 'bg-slate-700 text-slate-400'
              : 'bg-emerald-600 hover:bg-emerald-500 text-white'
          }`}
        >
          {uploading
            ? '업로드 중...'
            : '📷 사진 첨부'}

          <input
            type="file"
            accept="image/*"
            onChange={
              onImageUpload
            }
            disabled={
              uploading
            }
            className="hidden"
          />
        </label>

      </div>

    </div>
  );
}