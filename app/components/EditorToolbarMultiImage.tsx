'use client';

import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
} from 'react';
import type { Editor } from '@tiptap/react';

import EditorToolbarBase from './EditorToolbar';
import { supabase } from '@/app/lib/supabase';

type Props = {
  editor: Editor | null;
  uploading: boolean;
  onImageUpload: (
    event: ChangeEvent<HTMLInputElement>
  ) => void;
};

type UploadedImage = {
  src: string;
  alt: string;
};

function getFileExtension(file: File) {
  const extension = file.name
    .split('.')
    .pop()
    ?.toLowerCase()
    .replace(/[^a-z0-9]/g, '');

  if (extension) {
    return extension;
  }

  if (file.type === 'image/png') {
    return 'png';
  }

  if (file.type === 'image/webp') {
    return 'webp';
  }

  if (
    file.type === 'image/heic' ||
    file.type === 'image/heif'
  ) {
    return 'heic';
  }

  return 'jpg';
}

export default function EditorToolbarMultiImage({
  editor,
  uploading,
  onImageUpload,
}: Props) {
  const hostRef =
    useRef<HTMLDivElement | null>(null);

  const [
    batchUploading,
    setBatchUploading,
  ] = useState(false);

  const busy =
    uploading || batchUploading;

  // 기존 툴바의 파일 input은 그대로 재사용하면서
  // 본문 사진 선택창만 다중 선택이 가능하게 만든다.
  useEffect(() => {
    const input =
      hostRef.current?.querySelector<HTMLInputElement>(
        'input[type="file"][accept="image/*"]'
      );

    if (input) {
      input.multiple = true;
    }
  }, [editor, busy]);

  const handleMultiImageUpload =
    async (
      event: ChangeEvent<HTMLInputElement>
    ) => {
      const input =
        event.currentTarget;

      const files =
        Array.from(
          input.files || []
        );

      if (
        !editor ||
        files.length === 0
      ) {
        return;
      }

      // 사진 한 장을 선택한 상태에서는 기존의 '사진 교체' 동작을 유지한다.
      if (
        editor.isActive('image')
      ) {
        if (
          files.length > 1
        ) {
          alert(
            '선택한 사진을 교체할 때는 첫 번째 사진 1장만 적용됩니다. 여러 장을 추가하려면 본문의 빈 위치를 먼저 클릭해주세요.'
          );
        }

        onImageUpload(event);
        return;
      }

      const imageFiles =
        files.filter((file) =>
          file.type.startsWith(
            'image/'
          )
        );

      if (
        imageFiles.length === 0
      ) {
        alert(
          '이미지 파일만 업로드할 수 있습니다.'
        );

        input.value = '';
        return;
      }

      if (
        imageFiles.length !==
        files.length
      ) {
        alert(
          '이미지가 아닌 파일은 제외하고 업로드합니다.'
        );
      }

      const uploadedImages:
        UploadedImage[] = [];

      const failedFiles:
        string[] = [];

      try {
        setBatchUploading(true);

        // 선택한 순서를 유지하기 위해 순차 업로드한다.
        for (
          let index = 0;
          index < imageFiles.length;
          index += 1
        ) {
          const file =
            imageFiles[index];

          try {
            const extension =
              getFileExtension(
                file
              );

            const fileName =
              `batch-${Date.now()}-${index}-${Math.random()
                .toString(36)
                .slice(2, 8)}.${extension}`;

            const filePath =
              `posts/${fileName}`;

            const {
              error: uploadError,
            } =
              await supabase.storage
                .from('hohaeng')
                .upload(
                  filePath,
                  file
                );

            if (uploadError) {
              throw uploadError;
            }

            const { data } =
              supabase.storage
                .from('hohaeng')
                .getPublicUrl(
                  filePath
                );

            if (
              !data.publicUrl
            ) {
              throw new Error(
                '공개 URL 생성 실패'
              );
            }

            uploadedImages.push({
              src: data.publicUrl,
              alt: file.name,
            });
          } catch (error) {
            console.error(
              '본문 사진 업로드 오류:',
              file.name,
              error
            );

            failedFiles.push(
              file.name
            );
          }
        }

        if (
          uploadedImages.length > 0
        ) {
          editor
            .chain()
            .focus()
            .insertContent(
              uploadedImages.map(
                (image) => ({
                  type: 'image',
                  attrs: {
                    src: image.src,
                    alt: image.alt,
                    align: 'center',
                    displayWidth: 100,
                  },
                })
              )
            )
            .run();
        }

        if (
          failedFiles.length > 0
        ) {
          alert(
            `${failedFiles.length}장의 사진을 업로드하지 못했습니다.\n\n${failedFiles.join('\n')}`
          );
        }
      } finally {
        setBatchUploading(false);
        input.value = '';
      }
    };

  return (
    <div ref={hostRef}>
      <EditorToolbarBase
        editor={editor}
        uploading={busy}
        onImageUpload={
          handleMultiImageUpload
        }
      />
    </div>
  );
}
