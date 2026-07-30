'use client';

import {
  useEffect,
  useState,
  type ChangeEvent,
} from 'react';
import { useRouter } from 'next/navigation';

import {
  useEditor,
  EditorContent,
} from '@tiptap/react';

import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';

import {
  TextStyleKit,
} from '@tiptap/extension-text-style';

import {
  TextAlign,
} from '@tiptap/extension-text-align';

import Highlight from '@tiptap/extension-highlight';

import { supabase } from '@/app/lib/supabase';

import EditorToolbar from '@/app/components/EditorToolbar';

type Category = {
  id: number;
  slug: string;
  name: string;
  emoji: string | null;
  sort_order: number;
  is_active: boolean;
};

export default function AdminWritePage() {
  const router = useRouter();

  // 기본 글 정보
  const [title, setTitle] =
    useState('');

  const [category, setCategory] =
    useState('log');

  const [
    subcategory,
    setSubcategory,
  ] = useState('');

  const [
    description,
    setDescription,
  ] = useState('');

  // 카테고리
  const [
    categories,
    setCategories,
  ] = useState<Category[]>([]);

  const [
    categoriesLoading,
    setCategoriesLoading,
  ] = useState(true);

  // SEO
  const [
    seoTitle,
    setSeoTitle,
  ] = useState('');

  const [
    metaDescription,
    setMetaDescription,
  ] = useState('');

  const [
    ogImage,
    setOgImage,
  ] = useState('');

  // 상태
  const [
    uploading,
    setUploading,
  ] = useState(false);

  const [
    ogUploading,
    setOgUploading,
  ] = useState(false);

  const [
    publishing,
    setPublishing,
  ] = useState(false);

  // =========================================================
  // 카테고리 불러오기
  // =========================================================

  useEffect(() => {
    const loadCategories =
      async () => {
        const {
          data,
          error,
        } = await supabase
          .from('categories')
          .select(
            'id, slug, name, emoji, sort_order, is_active'
          )
          .eq(
            'is_active',
            true
          )
          .order(
            'sort_order',
            {
              ascending: true,
            }
          );

        if (error) {
          console.error(
            '카테고리 불러오기 오류:',
            error
          );

          setCategoriesLoading(
            false
          );

          return;
        }

        const activeCategories =
          (data ||
            []) as Category[];

        setCategories(
          activeCategories
        );

        if (
          activeCategories.length >
            0 &&
          !activeCategories.some(
            (item) =>
              item.slug ===
              category
          )
        ) {
          setCategory(
            activeCategories[0]
              .slug
          );
        }

        setCategoriesLoading(
          false
        );
      };

    loadCategories();
  }, []);

  // =========================================================
  // 강화된 Tiptap 에디터
  // =========================================================

  const editor = useEditor({
    immediatelyRender: false,

    extensions: [
      StarterKit,

      Image.configure({
        inline: true,
        allowBase64: true,
      }),

      // 글꼴 / 크기 / 색 / 줄간격
      TextStyleKit,

      // 좌/중앙/우/양쪽 정렬
      TextAlign.configure({
        types: [
          'heading',
          'paragraph',
        ],
      }),

      // 여러 색 형광펜
      Highlight.configure({
        multicolor: true,
      }),
    ],

    content:
      '<p>여기에 블로그 글을 자유롭게 작성하세요...</p>',

    editorProps: {
      attributes: {
        class:
          'prose prose-slate max-w-none focus:outline-none min-h-[520px] px-6 py-8 bg-white text-slate-900 rounded-b-2xl border border-t-0 border-slate-800 leading-relaxed',
      },
    },
  });

  // =========================================================
  // 본문 이미지 업로드
  // =========================================================

  const handleImageUpload =
    async (
      e: ChangeEvent<HTMLInputElement>
    ) => {
      const file =
        e.target.files?.[0];

      if (
        !file ||
        !editor
      ) {
        return;
      }

      if (
        !file.type.startsWith(
          'image/'
        )
      ) {
        alert(
          '이미지 파일만 업로드할 수 있습니다.'
        );

        e.target.value = '';

        return;
      }

      try {
        setUploading(true);

        const fileExt =
          file.name
            .split('.')
            .pop()
            ?.toLowerCase() ||
          'jpg';

        const fileName =
          `${Date.now()}-${Math.random()
            .toString(36)
            .slice(
              2,
              8
            )}.${fileExt}`;

        const filePath =
          `posts/${fileName}`;

        const {
          error:
            uploadError,
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
          data.publicUrl
        ) {
          editor
            .chain()
            .focus()
            .setImage({
              src:
                data.publicUrl,
              alt:
                file.name,
            })
            .run();
        }

      } catch (
        error: any
      ) {
        alert(
          '이미지 업로드 실패: ' +
            error.message
        );
      } finally {
        setUploading(false);

        e.target.value = '';
      }
    };

  // =========================================================
  // 대표 이미지 업로드
  // =========================================================

  const handleOgImageUpload =
    async (
      e: ChangeEvent<HTMLInputElement>
    ) => {
      const file =
        e.target.files?.[0];

      if (!file) {
        return;
      }

      if (
        !file.type.startsWith(
          'image/'
        )
      ) {
        alert(
          '이미지 파일만 업로드할 수 있습니다.'
        );

        e.target.value = '';

        return;
      }

      if (
        file.size >
        5 *
          1024 *
          1024
      ) {
        alert(
          '대표 이미지는 5MB 이하로 올려주세요.'
        );

        e.target.value = '';

        return;
      }

      try {
        setOgUploading(true);

        const fileExt =
          file.name
            .split('.')
            .pop()
            ?.toLowerCase() ||
          'jpg';

        const fileName =
          `og-${Date.now()}-${Math.random()
            .toString(36)
            .slice(
              2,
              8
            )}.${fileExt}`;

        const filePath =
          `posts/og/${fileName}`;

        const {
          error:
            uploadError,
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
            '대표 이미지 URL을 생성하지 못했습니다.'
          );
        }

        setOgImage(
          data.publicUrl
        );

      } catch (
        error: any
      ) {
        alert(
          '대표 이미지 업로드 실패: ' +
            error.message
        );
      } finally {
        setOgUploading(
          false
        );

        e.target.value = '';
      }
    };

  // =========================================================
  // 글 발행
  // =========================================================

  const handleSubmit =
    async () => {
      if (
        !title.trim()
      ) {
        alert(
          '제목을 입력해주세요.'
        );

        return;
      }

      if (!category) {
        alert(
          '카테고리를 선택해주세요.'
        );

        return;
      }

      if (!editor) {
        return;
      }

      try {
        setPublishing(
          true
        );

        const htmlContent =
          editor.getHTML();

        const generatedSlug =
          `post-${category}-${Date.now()}`;

        const {
          error,
        } =
          await supabase
            .from('posts')
            .insert([
              {
                title:
                  title.trim(),

                slug:
                  generatedSlug,

                content:
                  htmlContent,

                category,

                subcategory:
                  subcategory.trim() ||
                  null,

                description:
                  description.trim() ||
                  null,

                seo_title:
                  seoTitle.trim() ||
                  title.trim(),

                meta_description:
                  metaDescription.trim() ||
                  description.trim() ||
                  null,

                og_image:
                  ogImage.trim() ||
                  null,
              },
            ]);

        if (error) {
          throw error;
        }

        alert(
          '성공적으로 글이 발행되었습니다! 🚀'
        );

        setTitle('');

        if (
          categories.length >
          0
        ) {
          setCategory(
            categories[0]
              .slug
          );
        } else {
          setCategory(
            'log'
          );
        }

        setSubcategory(
          ''
        );

        setDescription(
          ''
        );

        setSeoTitle(
          ''
        );

        setMetaDescription(
          ''
        );

        setOgImage(
          ''
        );

        editor.commands.setContent(
          '<p>여기에 블로그 글을 자유롭게 작성하세요...</p>'
        );

        router.push(
          '/blog'
        );

        router.refresh();

      } catch (
        error: any
      ) {
        alert(
          '글 저장 실패: ' +
            error.message
        );
      } finally {
        setPublishing(
          false
        );
      }
    };

  return (
    <main className="max-w-5xl mx-auto p-6 min-h-screen bg-slate-950 text-slate-100">

      {/* 상단 */}
      <div className="flex flex-wrap justify-between items-center gap-3 mb-6">

        <div>

          <p className="text-xs font-bold text-blue-400 mb-1">
            HOHAENG ADMIN
          </p>

          <h1 className="text-2xl font-black text-white">
            ✍️ 블로그 에디터
          </h1>

          <p className="text-sm text-slate-400 mt-1">
            네이버 블로그처럼 편하게 글을 작성하세요.
          </p>

        </div>

        <button
          type="button"
          onClick={
            handleSubmit
          }
          disabled={
            publishing ||
            categoriesLoading ||
            uploading ||
            ogUploading
          }
          className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold rounded-xl shadow-lg"
        >
          {publishing
            ? '발행 중...'
            : '🚀 즉시 발행하기'}
        </button>

      </div>

      {/* =====================================================
          기본 정보
      ===================================================== */}

      <div className="space-y-4 mb-6">

        <div>

          <label className="block text-xs font-bold text-slate-400 mb-1">
            글 제목
          </label>

          <input
            type="text"
            placeholder="제목을 입력하세요"
            value={title}
            onChange={(e) =>
              setTitle(
                e.target.value
              )
            }
            className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 font-bold text-lg"
          />

        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

          <div>

            <div className="flex items-center justify-between mb-1">

              <label className="text-xs font-bold text-slate-400">
                카테고리
              </label>

              <button
                type="button"
                onClick={() =>
                  router.push(
                    '/admin/categories'
                  )
                }
                className="text-xs font-bold text-blue-400 hover:text-blue-300"
              >
                ⚙️ 카테고리 관리
              </button>

            </div>

            <select
              value={
                category
              }
              onChange={(e) =>
                setCategory(
                  e.target.value
                )
              }
              disabled={
                categoriesLoading
              }
              className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-blue-500"
            >

              {categoriesLoading ? (

                <option>
                  카테고리 불러오는 중...
                </option>

              ) : categories.length ===
                0 ? (

                <option value="">
                  활성 카테고리가 없습니다
                </option>

              ) : (

                categories.map(
                  (item) => (
                    <option
                      key={
                        item.id
                      }
                      value={
                        item.slug
                      }
                    >
                      {item.emoji ||
                        '📁'}{' '}
                      {item.name}
                    </option>
                  )
                )

              )}

            </select>

          </div>

          <div>

            <label className="block text-xs font-bold text-slate-400 mb-1">
              세부 주제
            </label>

            <input
              type="text"
              placeholder="예: invest, routine, dividend"
              value={
                subcategory
              }
              onChange={(e) =>
                setSubcategory(
                  e.target.value
                )
              }
              className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-white"
            />

          </div>

        </div>

        <div>

          <label className="block text-xs font-bold text-slate-400 mb-1">
            한 줄 요약
          </label>

          <input
            type="text"
            placeholder="목록 카드에 표시될 짧은 설명"
            value={
              description
            }
            onChange={(e) =>
              setDescription(
                e.target.value
              )
            }
            className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-white"
          />

        </div>

      </div>

      {/* =====================================================
          SEO
      ===================================================== */}

      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 mb-7">

        <h2 className="text-lg font-black text-white">
          🔍 SEO 설정
        </h2>

        <p className="text-xs text-slate-400 mt-1 mb-5">
          검색엔진과 SNS 공유용 정보입니다.
        </p>

        <div className="space-y-5">

          <div>

            <div className="flex justify-between mb-1">

              <label className="text-xs font-bold text-slate-400">
                SEO 제목
              </label>

              <span className="text-xs text-slate-500">
                {
                  seoTitle.length
                }
                /60
              </span>

            </div>

            <input
              type="text"
              value={
                seoTitle
              }
              onChange={(e) =>
                setSeoTitle(
                  e.target.value
                )
              }
              placeholder={
                title ||
                '검색엔진용 제목'
              }
              maxLength={
                60
              }
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white"
            />

          </div>

          <div>

            <div className="flex justify-between mb-1">

              <label className="text-xs font-bold text-slate-400">
                메타 설명
              </label>

              <span className="text-xs text-slate-500">
                {
                  metaDescription.length
                }
                /160
              </span>

            </div>

            <textarea
              value={
                metaDescription
              }
              onChange={(e) =>
                setMetaDescription(
                  e.target.value
                )
              }
              placeholder={
                description ||
                '검색 결과에 표시할 설명'
              }
              maxLength={
                160
              }
              rows={3}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white resize-none"
            />

          </div>

          {/* 대표 이미지 */}
          <div>

            <label className="block text-xs font-bold text-slate-400 mb-2">
              대표 이미지
            </label>

            <div className="flex flex-col sm:flex-row gap-2">

              <input
                type="url"
                value={
                  ogImage
                }
                onChange={(e) =>
                  setOgImage(
                    e.target.value
                  )
                }
                placeholder="이미지를 업로드하거나 URL을 입력하세요"
                className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white"
              />

              <label className="bg-emerald-600 hover:bg-emerald-500 px-5 py-3 rounded-xl text-sm font-bold text-white cursor-pointer text-center">

                {ogUploading
                  ? '업로드 중...'
                  : '📷 대표 이미지 업로드'}

                <input
                  type="file"
                  accept="image/*"
                  onChange={
                    handleOgImageUpload
                  }
                  disabled={
                    ogUploading
                  }
                  className="hidden"
                />

              </label>

            </div>

            {ogImage && (
              <div className="mt-4 bg-slate-950 border border-slate-800 rounded-2xl p-4">

                <div className="flex justify-between mb-3">

                  <p className="text-xs font-bold text-slate-400">
                    대표 이미지 미리보기
                  </p>

                  <button
                    type="button"
                    onClick={() =>
                      setOgImage(
                        ''
                      )
                    }
                    className="text-xs font-bold text-red-400"
                  >
                    ✕ 제거
                  </button>

                </div>

                <img
                  src={
                    ogImage
                  }
                  alt="대표 이미지"
                  className="w-full max-h-[350px] object-contain rounded-xl"
                />

              </div>
            )}

          </div>

        </div>

      </div>

      {/* =====================================================
          본문
      ===================================================== */}

      <div className="mb-3">

        <h2 className="font-black text-white text-lg">
          📝 본문 작성
        </h2>

        <p className="text-xs text-slate-500 mt-1">
          원하는 글자를 드래그한 뒤 크기·색·정렬·형광펜 등을 적용하세요.
        </p>

      </div>

      {/* 새 공용 툴바 */}
      <EditorToolbar
        editor={
          editor
        }
        uploading={
          uploading
        }
        onImageUpload={
          handleImageUpload
        }
      />

      {/* 본문 편집 영역 */}
      <EditorContent
        editor={
          editor
        }
      />

    </main>
  );
}