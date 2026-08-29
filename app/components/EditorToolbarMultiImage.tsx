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
import { optimizeEditorImage } from '@/app/lib/editorImageOptimization';

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

type UploadResult = {
  uploadedImages: UploadedImage[];
  failedFiles: string[];
};

type PendingLayoutChoice = {
  uploadedImages: UploadedImage[];
  position?: number;
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

function normalizedClipboardImage(
  file: File,
  index: number
) {
  if (file.name && file.name !== 'image.png') {
    return file;
  }

  const extension = getFileExtension(file);

  return new File(
    [file],
    `screenshot-${Date.now()}-${index + 1}.${extension}`,
    {
      type: file.type || 'image/png',
      lastModified: Date.now(),
    }
  );
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

  const [
    pasteUploading,
    setPasteUploading,
  ] = useState(false);

  const [
    pendingLayoutChoice,
    setPendingLayoutChoice,
  ] = useState<PendingLayoutChoice | null>(
    null
  );

  const busy =
    uploading ||
    batchUploading ||
    pasteUploading;

  const uploadImageFiles = async (
    files: File[],
    prefix: 'batch' | 'paste'
  ): Promise<UploadResult> => {
    const uploadedImages: UploadedImage[] = [];
    const failedFiles: string[] = [];

    // 선택/붙여넣기 순서를 유지하기 위해 순차 업로드한다.
    for (
      let index = 0;
      index < files.length;
      index += 1
    ) {
      const originalFile = files[index];

      try {
        const optimized =
          await optimizeEditorImage(
            originalFile,
            'content'
          );

        const uploadFile = optimized.file;
        const extension =
          getFileExtension(uploadFile);

        const fileName =
          `${prefix}-${Date.now()}-${index}-${Math.random()
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
              uploadFile,
              {
                contentType:
                  uploadFile.type ||
                  undefined,
              }
            );

        if (uploadError) {
          throw uploadError;
        }

        const { data } =
          supabase.storage
            .from('hohaeng')
            .getPublicUrl(filePath);

        if (!data.publicUrl) {
          throw new Error(
            '공개 URL 생성 실패'
          );
        }

        uploadedImages.push({
          src: data.publicUrl,
          alt: originalFile.name,
        });
      } catch (error) {
        console.error(
          '본문 사진 업로드 오류:',
          originalFile.name,
          error
        );

        failedFiles.push(
          originalFile.name ||
            `이미지 ${index + 1}`
        );
      }
    }

    return {
      uploadedImages,
      failedFiles,
    };
  };

  const insertUploadedImages = (
    uploadedImages: UploadedImage[],
    position?: number
  ) => {
    if (
      !editor ||
      uploadedImages.length === 0
    ) {
      return;
    }

    const content = uploadedImages.map(
      (image) => ({
        type: 'image',
        attrs: {
          src: image.src,
          alt: image.alt,
          align: 'center',
          displayWidth: 100,
        },
      })
    );

    const chain =
      editor.chain().focus();

    if (
      typeof position === 'number'
    ) {
      chain.insertContentAt(
        position,
        content
      );
    } else {
      chain.insertContent(content);
    }

    chain.run();
  };

  const insertUploadedImagePair = (
    uploadedImages: UploadedImage[],
    position?: number
  ) => {
    if (
      !editor ||
      uploadedImages.length !== 2
    ) {
      insertUploadedImages(
        uploadedImages,
        position
      );
      return;
    }

    const [first, second] =
      uploadedImages;

    const pairNode = {
      type: 'imagePair',
      attrs: {
        src1: first.src,
        alt1: first.alt,
        src2: second.src,
        alt2: second.alt,
        layout: 'side-by-side',
      },
    };

    const chain =
      editor.chain().focus();

    if (
      typeof position === 'number'
    ) {
      chain.insertContentAt(
        position,
        pairNode
      );
    } else {
      chain.insertContent(pairNode);
    }

    chain.run();
  };

  const insertOrChooseTwoImageLayout = (
    uploadedImages: UploadedImage[],
    position?: number
  ) => {
    if (
      uploadedImages.length === 2
    ) {
      setPendingLayoutChoice({
        uploadedImages,
        position,
      });
      return;
    }

    insertUploadedImages(
      uploadedImages,
      position
    );
  };

  const applyTwoImageLayout = (
    layout: 'side-by-side' | 'stacked'
  ) => {
    const pending =
      pendingLayoutChoice;

    if (!pending) {
      return;
    }

    setPendingLayoutChoice(null);

    if (layout === 'side-by-side') {
      insertUploadedImagePair(
        pending.uploadedImages,
        pending.position
      );
      return;
    }

    insertUploadedImages(
      pending.uploadedImages,
      pending.position
    );
  };

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

  // 캡처한 화면이나 복사한 이미지를 에디터에 바로 붙여넣으면
  // 원본을 본문에 박지 않고 최적화 → Storage 업로드 → 이미지 블록 삽입 순서로 처리한다.
  useEffect(() => {
    if (!editor) {
      return;
    }

    const editorElement =
      editor.view.dom;

    const handlePaste = (
      event: ClipboardEvent
    ) => {
      const clipboardData =
        event.clipboardData;

      if (!clipboardData) {
        return;
      }

      const itemFiles =
        Array.from(
          clipboardData.items || []
        )
          .filter(
            (item) =>
              item.kind === 'file' &&
              item.type.startsWith(
                'image/'
              )
          )
          .map((item) =>
            item.getAsFile()
          )
          .filter(
            (file): file is File =>
              Boolean(file)
          );

      const fallbackFiles =
        Array.from(
          clipboardData.files || []
        ).filter((file) =>
          file.type.startsWith(
            'image/'
          )
        );

      const rawFiles =
        itemFiles.length > 0
          ? itemFiles
          : fallbackFiles;

      if (rawFiles.length === 0) {
        return;
      }

      // ProseMirror가 PNG/data URL을 먼저 넣지 않도록 이미지 붙여넣기만 가로챈다.
      event.preventDefault();
      event.stopPropagation();

      const insertionPosition =
        editor.state.selection.from;

      const files = rawFiles.map(
        normalizedClipboardImage
      );

      void (async () => {
        try {
          setPasteUploading(true);

          const {
            uploadedImages,
            failedFiles,
          } = await uploadImageFiles(
            files,
            'paste'
          );

          insertOrChooseTwoImageLayout(
            uploadedImages,
            insertionPosition
          );

          if (
            failedFiles.length > 0
          ) {
            alert(
              `${failedFiles.length}장의 붙여넣기 이미지를 업로드하지 못했습니다.\n\n${failedFiles.join('\n')}`
            );
          }
        } finally {
          setPasteUploading(false);
        }
      })();
    };

    editorElement.addEventListener(
      'paste',
      handlePaste,
      true
    );

    return () => {
      editorElement.removeEventListener(
        'paste',
        handlePaste,
        true
      );
    };
  }, [editor]);

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

      const insertionPosition =
        editor.state.selection.from;

      try {
        setBatchUploading(true);

        const {
          uploadedImages,
          failedFiles,
        } = await uploadImageFiles(
          imageFiles,
          'batch'
        );

        insertOrChooseTwoImageLayout(
          uploadedImages,
          insertionPosition
        );

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
    <>
      <div ref={hostRef}>
        <EditorToolbarBase
          editor={editor}
          uploading={busy}
          onImageUpload={
            handleMultiImageUpload
          }
        />
      </div>

      {pendingLayoutChoice ? (
        <div
          className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-label="사진 두 장 배치 선택"
        >
          <div className="w-full max-w-lg rounded-3xl bg-white p-5 shadow-2xl sm:p-6">
            <div className="mb-4">
              <p className="text-lg font-black text-slate-950">
                사진 2장을 어떻게 넣을까요?
              </p>
              <p className="mt-1 text-sm leading-6 text-slate-500">
                나란히 배치는 PC에서는 2열, 모바일에서는 자동으로 위아래 1열로 바뀝니다.
              </p>
            </div>

            <div className="mb-5 grid grid-cols-2 gap-2 overflow-hidden rounded-2xl bg-slate-100 p-2">
              {pendingLayoutChoice.uploadedImages.map(
                (image, index) => (
                  <div
                    key={`${image.src}-${index}`}
                    className="flex aspect-[4/3] items-center justify-center overflow-hidden rounded-xl bg-white"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element -- 업로드 직후 배치 선택 미리보기입니다. */}
                    <img
                      src={image.src}
                      alt={image.alt}
                      className="h-full w-full object-contain"
                    />
                  </div>
                )
              )}
            </div>

            <div className="grid gap-2 sm:grid-cols-2">
              <button
                type="button"
                onClick={() =>
                  applyTwoImageLayout(
                    'side-by-side'
                  )
                }
                className="rounded-2xl border-2 border-blue-600 bg-blue-50 px-4 py-4 text-left transition hover:bg-blue-100"
              >
                <span className="block text-base font-black text-blue-700">
                  ▥ 나란히 배치
                </span>
                <span className="mt-1 block text-xs font-semibold leading-5 text-blue-600/80">
                  PC 2열 · 모바일 자동 1열
                </span>
              </button>

              <button
                type="button"
                onClick={() =>
                  applyTwoImageLayout(
                    'stacked'
                  )
                }
                className="rounded-2xl border-2 border-slate-200 bg-white px-4 py-4 text-left transition hover:bg-slate-50"
              >
                <span className="block text-base font-black text-slate-800">
                  ☰ 세로 배치
                </span>
                <span className="mt-1 block text-xs font-semibold leading-5 text-slate-500">
                  모든 화면에서 한 장씩 표시
                </span>
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
