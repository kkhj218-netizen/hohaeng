'use client';

import {
  useEffect,
  useState,
  type ChangeEvent,
} from 'react';
import { useRouter } from 'next/navigation';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import { supabase } from '@/app/lib/supabase';

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
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('log');
  const [subcategory, setSubcategory] = useState('');
  const [description, setDescription] = useState('');

  // 카테고리 목록
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);

  // SEO 정보
  const [seoTitle, setSeoTitle] = useState('');
  const [metaDescription, setMetaDescription] = useState('');
  const [ogImage, setOgImage] = useState('');

  // 상태
  const [uploading, setUploading] = useState(false);
  const [ogUploading, setOgUploading] = useState(false);
  const [publishing, setPublishing] = useState(false);

  // 활성 카테고리 불러오기
  useEffect(() => {
    const loadCategories = async () => {
      const { data, error } = await supabase
        .from('categories')
        .select(
          'id, slug, name, emoji, sort_order, is_active'
        )
        .eq('is_active', true)
        .order('sort_order', {
          ascending: true,
        });

      if (error) {
        console.error(
          '카테고리 불러오기 오류:',
          error
        );

        setCategoriesLoading(false);
        return;
      }

      const activeCategories =
        (data || []) as Category[];

      setCategories(activeCategories);

      if (
        activeCategories.length > 0 &&
        !activeCategories.some(
          (item) => item.slug === category
        )
      ) {
        setCategory(activeCategories[0].slug);
      }

      setCategoriesLoading(false);
    };

    loadCategories();
  }, []);

  // Tiptap 에디터
  const editor = useEditor({
    immediatelyRender: false,

    extensions: [
      StarterKit,
      Image.configure({
        inline: true,
        allowBase64: true,
      }),
    ],

    content:
      '<p>여기에 블로그 글을 자유롭게 작성하세요...</p>',

    editorProps: {
      attributes: {
        class:
          'prose max-w-none focus:outline-none min-h-[400px] p-4 bg-slate-900 text-slate-100 rounded-b-xl border border-slate-800 leading-relaxed',
      },
    },
  });

  // =========================================================
  // 본문 이미지 업로드
  // =========================================================

  const handleImageUpload = async (
    e: ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];

    if (!file || !editor) return;

    try {
      setUploading(true);

      const fileExt =
        file.name.split('.').pop() || 'jpg';

      const fileName =
        `${Date.now()}.${fileExt}`;

      const filePath =
        `posts/${fileName}`;

      const { error: uploadError } =
        await supabase.storage
          .from('hohaeng')
          .upload(filePath, file);

      if (uploadError) {
        throw uploadError;
      }

      const { data } =
        supabase.storage
          .from('hohaeng')
          .getPublicUrl(filePath);

      if (data.publicUrl) {
        editor
          .chain()
          .focus()
          .setImage({
            src: data.publicUrl,
          })
          .run();
      }
    } catch (error: any) {
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

  const handleOgImageUpload = async (
    e: ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];

    if (!file) return;

    // 이미지 파일 확인
    if (!file.type.startsWith('image/')) {
      alert('이미지 파일만 업로드할 수 있습니다.');
      e.target.value = '';
      return;
    }

    // 5MB 제한
    if (file.size > 5 * 1024 * 1024) {
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
          ?.toLowerCase() || 'jpg';

      const fileName =
        `og-${Date.now()}.${fileExt}`;

      const filePath =
        `posts/og/${fileName}`;

      const { error: uploadError } =
        await supabase.storage
          .from('hohaeng')
          .upload(filePath, file);

      if (uploadError) {
        throw uploadError;
      }

      const { data } =
        supabase.storage
          .from('hohaeng')
          .getPublicUrl(filePath);

      if (!data.publicUrl) {
        throw new Error(
          '대표 이미지 URL을 생성하지 못했습니다.'
        );
      }

      // 업로드 완료 → SEO 대표 이미지 URL 자동 입력
      setOgImage(data.publicUrl);
    } catch (error: any) {
      alert(
        '대표 이미지 업로드 실패: ' +
          error.message
      );
    } finally {
      setOgUploading(false);
      e.target.value = '';
    }
  };

  // =========================================================
  // 글 발행
  // =========================================================

  const handleSubmit = async () => {
    if (!title.trim()) {
      alert('제목을 입력해주세요.');
      return;
    }

    if (!category) {
      alert('카테고리를 선택해주세요.');
      return;
    }

    if (!editor) return;

    try {
      setPublishing(true);

      const htmlContent =
        editor.getHTML();

      const generatedSlug =
        `post-${category}-${Date.now()}`;

      const { error } =
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

              // SEO
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

      // 폼 초기화
      setTitle('');

      if (categories.length > 0) {
        setCategory(
          categories[0].slug
        );
      } else {
        setCategory('log');
      }

      setSubcategory('');
      setDescription('');

      setSeoTitle('');
      setMetaDescription('');
      setOgImage('');

      editor.commands.setContent(
        '<p>여기에 블로그 글을 자유롭게 작성하세요...</p>'
      );

      router.push('/blog');
      router.refresh();
    } catch (error: any) {
      alert(
        '글 저장 실패: ' +
          error.message
      );
    } finally {
      setPublishing(false);
    }
  };

  return (
    <main className="max-w-4xl mx-auto p-6 min-h-screen bg-slate-950 text-slate-100">

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
            글 작성 · SEO 설정 · 즉시 발행
          </p>
        </div>

        <button
          type="button"
          onClick={handleSubmit}
          disabled={
            publishing ||
            categoriesLoading ||
            uploading ||
            ogUploading
          }
          className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold rounded-xl shadow-lg transition-all cursor-pointer"
        >
          {publishing
            ? '발행 중...'
            : '🚀 즉시 발행하기'}
        </button>

      </div>

      {/* 기본 정보 */}
      <div className="space-y-4 mb-6">

        {/* 제목 */}
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

        {/* 카테고리 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

          <div>
            <div className="flex items-center justify-between mb-1">

              <label className="block text-xs font-bold text-slate-400">
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
              value={category}
              onChange={(e) =>
                setCategory(
                  e.target.value
                )
              }
              disabled={
                categoriesLoading
              }
              className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-blue-500 disabled:opacity-50"
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
                      key={item.id}
                      value={item.slug}
                    >
                      {item.emoji ||
                        '📁'}{' '}
                      {item.name}
                    </option>
                  )
                )
              )}

            </select>

            <p className="text-xs text-slate-500 mt-1">
              활성화된 카테고리만 표시됩니다.
            </p>
          </div>

          {/* 세부 주제 */}
          <div>
            <label className="block text-xs font-bold text-slate-400 mb-1">
              세부 주제 (선택)
            </label>

            <input
              type="text"
              placeholder="예: invest, routine, dividend"
              value={subcategory}
              onChange={(e) =>
                setSubcategory(
                  e.target.value
                )
              }
              className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-blue-500 text-sm"
            />
          </div>

        </div>

        {/* 설명 */}
        <div>
          <label className="block text-xs font-bold text-slate-400 mb-1">
            한 줄 요약 (설명)
          </label>

          <input
            type="text"
            placeholder="목록 카드에 표시될 짧은 설명을 입력하세요"
            value={description}
            onChange={(e) =>
              setDescription(
                e.target.value
              )
            }
            className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-blue-500 text-sm"
          />
        </div>

      </div>

      {/* =====================================================
          SEO 설정
      ===================================================== */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 mb-6">

        <div className="mb-5">

          <h2 className="text-lg font-black text-white">
            🔍 SEO 설정
          </h2>

          <p className="text-xs text-slate-400 mt-1">
            검색엔진 및 SNS 공유 정보를 설정합니다.
          </p>

        </div>

        <div className="space-y-5">

          {/* SEO 제목 */}
          <div>

            <div className="flex justify-between items-center mb-1">

              <label className="text-xs font-bold text-slate-400">
                SEO 제목
              </label>

              <span className="text-xs text-slate-500">
                {seoTitle.length}/60
              </span>

            </div>

            <input
              type="text"
              value={seoTitle}
              onChange={(e) =>
                setSeoTitle(
                  e.target.value
                )
              }
              placeholder={
                title
                  ? title
                  : '예: ISA 계좌 절세 혜택 총정리'
              }
              maxLength={60}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500"
            />

            <p className="text-xs text-slate-500 mt-1">
              비워두면 글 제목이 자동으로 사용됩니다.
            </p>

          </div>

          {/* 메타 설명 */}
          <div>

            <div className="flex justify-between items-center mb-1">

              <label className="text-xs font-bold text-slate-400">
                메타 설명
              </label>

              <span className="text-xs text-slate-500">
                {metaDescription.length}/160
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
                '검색 결과에 표시할 내용을 간략하게 설명하세요.'
              }
              maxLength={160}
              rows={3}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 resize-none"
            />

            <p className="text-xs text-slate-500 mt-1">
              비워두면 한 줄 요약이 자동으로 사용됩니다.
            </p>

          </div>

          {/* =================================================
              대표 이미지
          ================================================= */}
          <div>

            <label className="block text-xs font-bold text-slate-400 mb-2">
              대표 이미지
            </label>

            <div className="flex flex-col sm:flex-row gap-2">

              {/* URL 직접 입력도 가능 */}
              <input
                type="url"
                value={ogImage}
                onChange={(e) =>
                  setOgImage(
                    e.target.value
                  )
                }
                placeholder="이미지를 업로드하거나 https:// 주소를 입력하세요"
                className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500"
              />

              {/* 자동 업로드 버튼 */}
              <label
                className={`flex items-center justify-center px-5 py-3 rounded-xl font-bold text-sm cursor-pointer transition-colors ${
                  ogUploading
                    ? 'bg-slate-700 text-slate-400'
                    : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                }`}
              >
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

            <p className="text-xs text-slate-500 mt-2">
              카카오톡 · SNS · 메신저 공유 시 표시될 대표 이미지입니다.
            </p>

            <p className="text-xs text-slate-600 mt-1">
              권장: 가로형 이미지 / 최대 5MB
            </p>

            {/* 대표 이미지 미리보기 */}
            {ogImage && (
              <div className="mt-4 bg-slate-950 border border-slate-800 rounded-2xl p-4">

                <div className="flex items-center justify-between gap-2 mb-3">

                  <p className="text-xs font-bold text-slate-400">
                    대표 이미지 미리보기
                  </p>

                  <button
                    type="button"
                    onClick={() =>
                      setOgImage('')
                    }
                    className="text-xs font-bold text-red-400 hover:text-red-300"
                  >
                    ✕ 이미지 제거
                  </button>

                </div>

                <img
                  src={ogImage}
                  alt="대표 이미지 미리보기"
                  className="w-full max-h-[350px] object-contain rounded-xl"
                />

              </div>
            )}

          </div>

        </div>

      </div>

      {/* 본문 */}
      <div className="mb-2">
        <h2 className="font-black text-white">
          📝 본문
        </h2>
      </div>

      {/* 에디터 툴바 */}
      <div className="bg-slate-800/80 p-3 rounded-t-xl border border-b-0 border-slate-700 flex flex-wrap gap-2 items-center">

        <button
          type="button"
          onClick={() =>
            editor
              ?.chain()
              .focus()
              .toggleBold()
              .run()
          }
          className={`px-3 py-1 rounded text-xs font-bold cursor-pointer ${
            editor?.isActive(
              'bold'
            )
              ? 'bg-blue-600 text-white'
              : 'bg-slate-700 text-slate-300'
          }`}
        >
          Bold (굵게)
        </button>

        <button
          type="button"
          onClick={() =>
            editor
              ?.chain()
              .focus()
              .toggleItalic()
              .run()
          }
          className={`px-3 py-1 rounded text-xs font-bold cursor-pointer ${
            editor?.isActive(
              'italic'
            )
              ? 'bg-blue-600 text-white'
              : 'bg-slate-700 text-slate-300'
          }`}
        >
          Italic (기울임)
        </button>

        <button
          type="button"
          onClick={() =>
            editor
              ?.chain()
              .focus()
              .toggleHeading({
                level: 2,
              })
              .run()
          }
          className={`px-3 py-1 rounded text-xs font-bold cursor-pointer ${
            editor?.isActive(
              'heading',
              {
                level: 2,
              }
            )
              ? 'bg-blue-600 text-white'
              : 'bg-slate-700 text-slate-300'
          }`}
        >
          H2 (큰 제목)
        </button>

        <button
          type="button"
          onClick={() =>
            editor
              ?.chain()
              .focus()
              .toggleHeading({
                level: 3,
              })
              .run()
          }
          className={`px-3 py-1 rounded text-xs font-bold cursor-pointer ${
            editor?.isActive(
              'heading',
              {
                level: 3,
              }
            )
              ? 'bg-blue-600 text-white'
              : 'bg-slate-700 text-slate-300'
          }`}
        >
          H3 (소제목)
        </button>

        {/* 본문 이미지 첨부 */}
        <label className="cursor-pointer bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold px-3 py-1 rounded transition-colors ml-auto flex items-center gap-1">

          <span>
            📷 사진 첨부
          </span>

          <input
            type="file"
            accept="image/*"
            onChange={
              handleImageUpload
            }
            disabled={
              uploading
            }
            className="hidden"
          />

        </label>

        {uploading && (
          <span className="text-xs text-yellow-400">
            업로드 중...
          </span>
        )}

      </div>

      <EditorContent
        editor={editor}
      />

    </main>
  );
}