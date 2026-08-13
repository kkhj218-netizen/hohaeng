import StarterKit from '@tiptap/starter-kit';
import {
  TextStyleKit,
} from '@tiptap/extension-text-style';
import {
  TextAlign,
} from '@tiptap/extension-text-align';
import Highlight from '@tiptap/extension-highlight';

import {
  EditorImage,
} from '@/app/components/EditorImageBlock';

/**
 * 글쓰기와 글 수정 화면이 정확히 같은 Tiptap 스키마를 사용하게 합니다.
 */
export function createEditorExtensions() {
  return [
    StarterKit,
    EditorImage,
    TextStyleKit,
    TextAlign.configure({
      types: [
        'heading',
        'paragraph',
      ],
    }),
    Highlight.configure({
      multicolor: true,
    }),
  ];
}
