'use client';

import {
  useEffect,
  useState,
  type ChangeEvent,
} from 'react';

import {
  useParams,
  useRouter,
} from 'next/navigation';

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

export default function AdminEditPage() {
  const router = useRouter();

  const params =
    useParams<{
      id: string;
    }>();

  const postId =
    params.id;

  // =========================================================
  // 기본 글 정보
  // =========================================================

  const [
    title,
    setTitle,
  ] = useState('');

  const [
    category,
    setCategory,
  ] = useState('log');

  const [
    subcategory,
    setSubcategory,
  ] = useState('');

  const [
    description,
    setDescription,
  ] = useState('');

  // =========================================================
  // 카테고리
  // =========================================================

  const [
    categories,
    setCategories,
  ] =
    useState<Category[]>([]);

  const [
    categoriesLoading,
    setCategoriesLoading,
  ] = useState(true);

  // =========================================================
  // SEO
  // =========================================================

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

  // =========================================================
  // 상태
  // =========================================================

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    saving,
    setSaving,
  ] = useState(false);

  // 현재 글 공개 상태
  const [
    postStatus,
    setPostStatus,
  ] = useState<
    'draft' |
    'published'
  >('published');

  // 최초 공개 시각 보존
  const [
    publishedAt,
    setPublishedAt,
  ] = useState<
    string | null
  >(null);

  const [
    uploading,
    setUploading,
  ] = useState(false);

  const [
    ogUploading,
    setOgUploading,
  ] = useState(false);

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

      // 글꼴 / 글자 크기 / 글자색 / 줄간격
      TextStyleKit,

      // 정렬
      TextAlign.configure({
        types: [
          'heading',
          'paragraph',
        ],
      }),

      // 다중 색상 형광펜
      Highlight.configure({
        multicolor: true,
      }),
    ],

    content:
      '<p>글을 불러오는 중...</p>',

    editorProps: {
      attributes: {
        class:
          'prose prose-slate max-w-none focus:outline-none min-h-[520px] px-6 py-8 bg-white text-slate-900 rounded-b-2xl border border-t-0 border-slate-800 leading-relaxed',
      },
    },
  });

  // =========================================================
  // 기존 글 + 카테고리 불러오기
  // =========================================================

  useEffect(() => {
    if (
      !editor ||
      !postId
    ) {
      return;
    }

    const initialize =
      async () => {
        // 로그인 확인
        const {
          data: {
            session,
          },
        } =
          await supabase.auth.getSession();

        if (!session) {
          router.replace(
            '/admin/login'
          );

          return;
        }

        // 글 + 카테고리 동시에 불러오기
        const [
          postResult,
          categoryResult,
        ] =
          await Promise.all([
            supabase
              .from('posts')
              .select(
                'id, title, slug, content, category, subcategory, description, seo_title, meta_description, og_image, status, published_at'
              )
              .eq(
                'id',
                postId
              )
              .single(),

            supabase
              .from(
                'categories'
              )
              .select(
                'id, slug, name, emoji, sort_order, is_active'
              )
              .order(
                'sort_order',
                {
                  ascending:
                    true,
                }
              ),
          ]);

        const {
          data:
            postData,
          error:
            postError,
        } =
          postResult;

        const {
          data:
            categoryData,
          error:
            categoryError,
        } =
          categoryResult;

        // 글 오류
        if (
          postError ||
          !postData
        ) {
          alert(
            '글을 불러오지 못했습니다: ' +
              (postError
                ?.message ||
                '글이 없습니다.')
          );

          router.replace(
            '/admin/manage'
          );

          return;
        }

        // 카테고리 오류
        if (
          categoryError
        ) {
          console.error(
            '카테고리 불러오기 오류:',
            categoryError
          );

          alert(
            '카테고리 목록을 불러오지 못했습니다.'
          );

          setCategoriesLoading(
            false
          );

          setLoading(
            false
          );

          return;
        }

        const loadedCategories =
          (categoryData ||
            []) as Category[];

        const currentCategory =
          postData.category ||
          'log';

        // 과거 카테고리가 삭제됐어도
        // 기존 글 수정에서는 표시
        const categoryExists =
          loadedCategories.some(
            (item) =>
              item.slug ===
              currentCategory
          );

        if (
          currentCategory &&
          !categoryExists
        ) {
          loadedCategories.push(
            {
              id: -1,

              slug:
                currentCategory,

              name:
                `기존 카테고리 (${currentCategory})`,

              emoji:
                '⚠️',

              sort_order:
                9999,

              is_active:
                false,
            }
          );
        }

        setCategories(
          loadedCategories
        );

        setCategoriesLoading(
          false
        );

        // 기본 정보
        setTitle(
          postData.title ||
            ''
        );

        setCategory(
          currentCategory
        );

        setSubcategory(
          postData.subcategory ||
            ''
        );

        setDescription(
          postData.description ||
            ''
        );

        // SEO
        setSeoTitle(
          postData.seo_title ||
            ''
        );

        setMetaDescription(
          postData.meta_description ||
            ''
        );

        setOgImage(
          postData.og_image ||
            ''
        );

        // 공개 상태
        setPostStatus(
          postData.status ===
            'draft'
            ? 'draft'
            : 'published'
        );

        setPublishedAt(
          postData.published_at ||
            null
        );

        // 기존 HTML 본문 불러오기
        // 글자색/크기/정렬/형광펜 등도 그대로 로드됨
        editor.commands.setContent(
          postData.content ||
            '<p></p>'
        );

        setLoading(
          false
        );
      };

    initialize();
  }, [
    editor,
    postId,
    router,
  ]);

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

        e.target.value =
          '';

        return;
      }

      try {
        setUploading(
          true
        );

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
            .from(
              'hohaeng'
            )
            .upload(
              filePath,
              file
            );

        if (
          uploadError
        ) {
          throw uploadError;
        }

        const {
          data,
        } =
          supabase.storage
            .from(
              'hohaeng'
            )
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
        setUploading(
          false
        );

        e.target.value =
          '';
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

        e.target.value =
          '';

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

        e.target.value =
          '';

        return;
      }

      try {
        setOgUploading(
          true
        );

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
            .from(
              'hohaeng'
            )
            .upload(
              filePath,
              file
            );

        if (
          uploadError
        ) {
          throw uploadError;
        }

        const {
          data,
        } =
          supabase.storage
            .from(
              'hohaeng'
            )
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

        e.target.value =
          '';
      }
    };

  // =========================================================
  // 초안 저장 / 공개 발행 / 공개글 수정
  // =========================================================

  const handleSave =
    async (
      targetStatus:
        'draft' |
        'published'
    ) => {
      // 공개 발행은 제목 필수
      if (
        targetStatus ===
          'published' &&
        !title.trim()
      ) {
        alert(
          '공개 발행하려면 제목을 입력해주세요.'
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
        setSaving(
          true
        );

        const htmlContent =
          editor.getHTML();

        // 초안은 제목이 없어도 저장 가능
        const savedTitle =
          title.trim() ||
          '제목 없는 초안';

        const nextPublishedAt =
          targetStatus ===
          'published'
            ? publishedAt ||
              new Date().toISOString()
            : null;

        const {
          error,
        } =
          await supabase
            .from('posts')
            .update({
              // 기본 글
              title:
                savedTitle,

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
                savedTitle,

              meta_description:
                metaDescription.trim() ||
                description.trim() ||
                null,

              og_image:
                ogImage.trim() ||
                null,

              // 공개 상태
              status:
                targetStatus,

              published_at:
                nextPublishedAt,

              // 마지막 수정 시간
              updated_at:
                new Date().toISOString(),
            })
            .eq(
              'id',
              postId
            );

        if (error) {
          throw error;
        }

        setPostStatus(
          targetStatus
        );

        setPublishedAt(
          nextPublishedAt
        );

        if (
          !title.trim()
        ) {
          setTitle(
            savedTitle
          );
        }

        // 초안은 현재 화면에서 계속 작성
        if (
          targetStatus ===
          'draft'
        ) {
          alert(
            '초안으로 저장되었습니다! 💾'
          );

          return;
        }

        alert(
          postStatus ===
            'draft'
            ? '글이 공개 발행되었습니다! 🌐'
            : '글이 성공적으로 수정되었습니다! ✅'
        );

        router.push(
          '/admin/manage'
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
        setSaving(
          false
        );
      }
    };

  // =========================================================
  // 로딩
  // =========================================================

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-950 flex items-center justify-center">

        <p className="text-white font-bold">
          기존 글을 불러오는 중...
        </p>

      </main>
    );
  }

  return (
    <main className="max-w-5xl mx-auto p-6 min-h-screen bg-slate-950 text-slate-100">

      {/* =====================================================
          상단
      ===================================================== */}

      <div className="flex flex-wrap justify-between items-center gap-3 mb-6">

        <div>

          <p className="text-blue-400 text-xs font-bold mb-1">
            HOHAENG ADMIN
          </p>

          <h1 className="text-2xl font-black text-white">
            {postStatus ===
            'draft'
              ? '✍️ 초안 이어쓰기'
              : '✏️ 블로그 글 수정'}
          </h1>

          <p className="text-sm text-slate-400 mt-1">
            {postStatus ===
            'draft'
              ? '저장해둔 초안을 이어서 작성하고 준비가 되면 공개 발행하세요.'
              : '글 내용 · 디자인 · 이미지 · SEO 설정을 수정합니다.'}
          </p>

          <div className="mt-3">
            <span
              className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold ${
                postStatus ===
                'draft'
                  ? 'bg-amber-500/10 text-amber-300 border border-amber-500/20'
                  : 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/20'
              }`}
            >
              {postStatus ===
              'draft'
                ? '📝 현재 상태: 초안'
                : '🌐 현재 상태: 공개'}
            </span>
          </div>

        </div>

        <div className="flex flex-wrap gap-2">

          <button
            type="button"
            onClick={() =>
              router.push(
                '/admin/manage'
              )
            }
            className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl"
          >
            ← 취소
          </button>

          {postStatus ===
          'draft' ? (
            <>
              <button
                type="button"
                onClick={() =>
                  handleSave(
                    'draft'
                  )
                }
                disabled={
                  saving ||
                  categoriesLoading ||
                  uploading ||
                  ogUploading
                }
                className="px-5 py-2.5 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 text-white font-bold rounded-xl"
              >
                {saving
                  ? '저장 중...'
                  : '💾 초안 저장'}
              </button>

              <button
                type="button"
                onClick={() =>
                  handleSave(
                    'published'
                  )
                }
                disabled={
                  saving ||
                  categoriesLoading ||
                  uploading ||
                  ogUploading
                }
                className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold rounded-xl shadow-lg"
              >
                {saving
                  ? '처리 중...'
                  : '🌐 공개 발행'}
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() =>
                handleSave(
                  'published'
                )
              }
              disabled={
                saving ||
                categoriesLoading ||
                uploading ||
                ogUploading
              }
              className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold rounded-xl shadow-lg"
            >
              {saving
                ? '저장 중...'
                : '✅ 수정 저장'}
            </button>
          )}

        </div>

      </div>

      {/* =====================================================
          기본 정보
      ===================================================== */}

      <div className="space-y-4 mb-6">

        {/* 제목 */}
        <div>

          <label className="block text-xs font-bold text-slate-400 mb-1">
            글 제목
          </label>

          <input
            type="text"
            value={
              title
            }
            onChange={(e) =>
              setTitle(
                e.target.value
              )
            }
            className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 font-bold text-lg"
          />

        </div>

        {/* 카테고리 / 세부주제 */}
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
              className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-blue-500 disabled:opacity-50"
            >

              {categoriesLoading ? (

                <option>
                  카테고리 불러오는 중...
                </option>

              ) : categories.length ===
                0 ? (

                <option value="">
                  카테고리가 없습니다
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
                      disabled={
                        !item.is_active &&
                        item.slug !==
                          category
                      }
                    >
                      {item.emoji ||
                        '📁'}{' '}
                      {item.name}

                      {!item.is_active
                        ? ' (비활성)'
                        : ''}
                    </option>
                  )
                )

              )}

            </select>

            <p className="text-xs text-slate-500 mt-1">
              관리자 카테고리 설정과 자동으로 연결됩니다.
            </p>

          </div>

          <div>

            <label className="block text-xs font-bold text-slate-400 mb-1">
              세부 주제
            </label>

            <input
              type="text"
              value={
                subcategory
              }
              onChange={(e) =>
                setSubcategory(
                  e.target.value
                )
              }
              placeholder="예: invest, routine, dividend"
              className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-blue-500"
            />

          </div>

        </div>

        {/* 한 줄 요약 */}
        <div>

          <label className="block text-xs font-bold text-slate-400 mb-1">
            한 줄 요약
          </label>

          <input
            type="text"
            value={
              description
            }
            onChange={(e) =>
              setDescription(
                e.target.value
              )
            }
            placeholder="목록 카드에 표시될 짧은 설명"
            className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-blue-500"
          />

        </div>

      </div>

      {/* =====================================================
          SEO
      ===================================================== */}

      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 mb-7">

        <div className="mb-5">

          <h2 className="text-lg font-black text-white">
            🔍 SEO 설정
          </h2>

          <p className="text-xs text-slate-400 mt-1">
            검색엔진과 SNS 공유에 사용할 정보를 수정합니다.
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
                '검색 결과에 표시할 설명'
              }
              maxLength={
                160
              }
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
                placeholder="이미지를 업로드하거나 https:// 주소를 입력하세요"
                className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500"
              />

              <label
                className={`flex items-center justify-center px-5 py-3 rounded-xl font-bold text-sm cursor-pointer transition-colors ${
                  ogUploading
                    ? 'bg-slate-700 text-slate-400'
                    : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                }`}
              >

                {ogUploading
                  ? '업로드 중...'
                  : ogImage
                    ? '📷 새 이미지로 교체'
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

            {ogImage && (
              <div className="mt-4 bg-slate-950 border border-slate-800 rounded-2xl p-4">

                <div className="flex items-center justify-between gap-3 mb-3">

                  <p className="text-xs font-bold text-slate-400">
                    현재 대표 이미지
                  </p>

                  <button
                    type="button"
                    onClick={() =>
                      setOgImage(
                        ''
                      )
                    }
                    className="text-xs font-bold text-red-400 hover:text-red-300"
                  >
                    ✕ 대표 이미지 제거
                  </button>

                </div>

                <img
                  src={
                    ogImage
                  }
                  alt="대표 이미지 미리보기"
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
          📝 본문 수정
        </h2>

        <p className="text-xs text-slate-500 mt-1">
          글자를 드래그한 뒤 크기·글꼴·색상·형광펜·정렬 등을 자유롭게 수정하세요.
        </p>

      </div>

      {/* 네이버 블로그식 공용 툴바 */}
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

      {/* 본문 */}
      <EditorContent
        editor={
          editor
        }
      />

    </main>
  );
}