'use client';

import {
  useCallback,
  useEffect,
  useRef,
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

const DEFAULT_EDITOR_CONTENT =
  '<p>여기에 블로그 글을 자유롭게 작성하세요...</p>';

type AutoSaveStatus =
  | 'idle'
  | 'waiting'
  | 'saving'
  | 'saved'
  | 'error';

type SaveOptions = {
  auto?: boolean;
  version?: number;
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
    draftSaving,
    setDraftSaving,
  ] = useState(false);

  const [
    publishing,
    setPublishing,
  ] = useState(false);

  // 자동저장 상태
  const [
    autoSaveStatus,
    setAutoSaveStatus,
  ] = useState<AutoSaveStatus>('idle');

  const [
    lastAutoSavedAt,
    setLastAutoSavedAt,
  ] = useState<Date | null>(null);

  const [
    changeVersion,
    setChangeVersion,
  ] = useState(0);

  // 한 번 초안으로 저장한 뒤에는
  // 같은 글을 계속 UPDATE 하기 위한 ID / slug
  const [
    currentPostId,
    setCurrentPostId,
  ] = useState<string | null>(null);

  const [
    currentSlug,
    setCurrentSlug,
  ] = useState<string | null>(null);

  // 자동저장 중복 실행과 최초 INSERT 충돌 방지용 ref
  const currentPostIdRef =
    useRef<string | null>(null);

  const currentSlugRef =
    useRef<string | null>(null);

  const saveInFlightRef =
    useRef(false);

  const publishingRef =
    useRef(false);

  const autoSaveTimerRef =
    useRef<ReturnType<typeof setTimeout> | null>(null);

  const lastSavedSnapshotRef =
    useRef<string | null>(null);

  const latestChangeVersionRef =
    useRef(0);

  const lastSavedVersionRef =
    useRef(0);

  const clearAutoSaveTimer =
    useCallback(() => {
      if (
        autoSaveTimerRef.current
      ) {
        clearTimeout(
          autoSaveTimerRef.current
        );

        autoSaveTimerRef.current =
          null;
      }
    }, []);

  const markChanged =
    useCallback(() => {
      setChangeVersion(
        (previous) => {
          const next =
            previous + 1;

          latestChangeVersionRef.current =
            next;

          return next;
        }
      );

      setAutoSaveStatus(
        (previous) =>
          previous === 'saving'
            ? previous
            : 'waiting'
      );
    }, []);

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
      DEFAULT_EDITOR_CONTENT,

    editorProps: {
      attributes: {
        class:
          'prose prose-slate max-w-none focus:outline-none min-h-[520px] px-6 py-8 bg-white text-slate-900 rounded-b-2xl border border-t-0 border-slate-800 leading-relaxed',
      },
    },

    onUpdate: () => {
      markChanged();
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

        markChanged();

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
  // 초안 저장 / 공개 발행 / 자동저장
  // =========================================================

  const handleSave =
    useCallback(
      async (
        targetStatus:
          'draft' |
          'published',
        options: SaveOptions = {}
      ) => {
        const isAutoSave =
          options.auto === true;

        const versionAtSave =
          options.version ??
          latestChangeVersionRef.current;

        // 수동 저장/발행을 누르면 예약된 자동저장 타이머를 먼저 정리
        if (!isAutoSave) {
          clearAutoSaveTimer();
        }

        // 공개 발행 중에는 자동저장이 절대 실행되지 않도록 잠금
        if (
          targetStatus ===
          'published'
        ) {
          publishingRef.current =
            true;
        }

        // 다른 저장 요청이 진행 중이면 중복 요청 방지
        if (
          saveInFlightRef.current
        ) {
          if (
            targetStatus ===
            'published'
          ) {
            publishingRef.current =
              false;
          }

          return;
        }

        // 공개 발행은 제목 필수
        if (
          targetStatus ===
            'published' &&
          !title.trim()
        ) {
          publishingRef.current =
            false;

          alert(
            '공개 발행하려면 제목을 입력해주세요.'
          );

          return;
        }

        if (!category) {
          publishingRef.current =
            false;

          if (!isAutoSave) {
            alert(
              '카테고리를 선택해주세요.'
            );
          }

          return;
        }

        if (!editor) {
          publishingRef.current =
            false;

          return;
        }

        const htmlContent =
          editor.getHTML();

        // 빈 작성 화면은 자동으로 초안을 만들지 않음
        const hasMeaningfulContent =
          Boolean(
            title.trim() ||
            subcategory.trim() ||
            description.trim() ||
            seoTitle.trim() ||
            metaDescription.trim() ||
            ogImage.trim()
          ) ||
          (
            htmlContent !==
              DEFAULT_EDITOR_CONTENT &&
            htmlContent !== '<p></p>'
          );

        if (
          isAutoSave &&
          !hasMeaningfulContent
        ) {
          setAutoSaveStatus('idle');

          return;
        }

        // 초안은 제목이 없어도 저장 가능
        const savedTitle =
          title.trim() ||
          '제목 없는 초안';

        const snapshot =
          JSON.stringify({
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
            status:
              targetStatus,
          });

        // 같은 내용은 자동저장 요청을 다시 보내지 않음
        if (
          isAutoSave &&
          currentPostIdRef.current &&
          lastSavedSnapshotRef.current ===
            snapshot
        ) {
          lastSavedVersionRef.current =
            Math.max(
              lastSavedVersionRef.current,
              versionAtSave
            );

          setAutoSaveStatus('saved');

          return;
        }

        saveInFlightRef.current =
          true;

        try {
          if (
            targetStatus ===
            'draft'
          ) {
            if (isAutoSave) {
              setAutoSaveStatus(
                'saving'
              );
            } else {
              setDraftSaving(
                true
              );
            }
          } else {
            setPublishing(
              true
            );
          }

          const now =
            new Date().toISOString();

          const postPayload = {
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

            status:
              targetStatus,

            published_at:
              targetStatus ===
              'published'
                ? now
                : null,

            updated_at:
              now,
          };

          let savedPostId =
            currentPostIdRef.current;

          let savedSlug =
            currentSlugRef.current;

          // 이미 한 번 저장한 글이면 새 글을 만들지 않고 UPDATE
          if (
            currentPostIdRef.current
          ) {
            const {
              data:
                updatedPost,
              error:
                updateError,
            } =
              await supabase
                .from('posts')
                .update(
                  postPayload
                )
                .eq(
                  'id',
                  currentPostIdRef.current
                )
                .select(
                  'id, slug'
                )
                .single();

            if (
              updateError
            ) {
              throw updateError;
            }

            savedPostId =
              updatedPost.id;

            savedSlug =
              updatedPost.slug;
          } else {
            // 최초 저장이면 INSERT
            const generatedSlug =
              `post-${category}-${Date.now()}`;

            const {
              data:
                insertedPost,
              error:
                insertError,
            } =
              await supabase
                .from('posts')
                .insert([
                  {
                    ...postPayload,

                    slug:
                      generatedSlug,
                  },
                ])
                .select(
                  'id, slug'
                )
                .single();

            if (
              insertError
            ) {
              throw insertError;
            }

            savedPostId =
              insertedPost.id;

            savedSlug =
              insertedPost.slug;

            // state보다 ref를 먼저 갱신하여
            // 자동저장/수동저장이 겹쳐도 중복 INSERT 방지
            currentPostIdRef.current =
              insertedPost.id;

            currentSlugRef.current =
              insertedPost.slug;

            setCurrentPostId(
              insertedPost.id
            );

            setCurrentSlug(
              insertedPost.slug
            );
          }

          // =====================================================
          // 초안 저장
          // =====================================================

          if (
            targetStatus ===
            'draft'
          ) {
            lastSavedSnapshotRef.current =
              snapshot;

            lastSavedVersionRef.current =
              Math.max(
                lastSavedVersionRef.current,
                versionAtSave
              );

            setLastAutoSavedAt(
              new Date()
            );

            if (isAutoSave) {
              // 저장 중 새 입력이 생겼다면 다시 자동저장 대기 상태
              if (
                latestChangeVersionRef.current >
                versionAtSave
              ) {
                setAutoSaveStatus(
                  'waiting'
                );
              } else {
                setAutoSaveStatus(
                  'saved'
                );
              }
            } else {
              setAutoSaveStatus(
                'saved'
              );

              alert(
                '초안으로 저장되었습니다! 💾\n계속 작성한 뒤 다시 초안 저장하거나 공개 발행할 수 있습니다.'
              );
            }

            return;
          }

          // =====================================================
          // 공개 발행
          // =====================================================

          alert(
            '성공적으로 글이 공개 발행되었습니다! 🚀'
          );

          const publishedSlug =
            savedSlug;

          // 작성 화면 초기화
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

          currentPostIdRef.current =
            null;

          currentSlugRef.current =
            null;

          setCurrentPostId(
            null
          );

          setCurrentSlug(
            null
          );

          lastSavedSnapshotRef.current =
            null;

          lastSavedVersionRef.current =
            0;

          latestChangeVersionRef.current =
            0;

          setChangeVersion(0);

          setAutoSaveStatus(
            'idle'
          );

          setLastAutoSavedAt(
            null
          );

          editor.commands.setContent(
            DEFAULT_EDITOR_CONTENT,
            { emitUpdate: false }
          );

          if (
            publishedSlug
          ) {
            router.push(
              `/blog/${publishedSlug}`
            );
          } else {
            router.push(
              '/blog'
            );
          }

          router.refresh();

          // 타입상 사용되는 값임을 명확히 함
          void savedPostId;

        } catch (
          error: any
        ) {
          if (isAutoSave) {
            console.error(
              '자동저장 실패:',
              error
            );

            setAutoSaveStatus(
              'error'
            );
          } else {
            alert(
              targetStatus ===
              'draft'
                ? '초안 저장 실패: ' +
                    error.message
                : '글 발행 실패: ' +
                    error.message
            );
          }
        } finally {
          saveInFlightRef.current =
            false;

          setDraftSaving(
            false
          );

          setPublishing(
            false
          );

          if (
            targetStatus ===
            'published'
          ) {
            publishingRef.current =
              false;
          }
        }
      },
      [
        category,
        categories,
        clearAutoSaveTimer,
        description,
        editor,
        metaDescription,
        ogImage,
        router,
        seoTitle,
        subcategory,
        title,
      ]
    );

  // =========================================================
  // 5초 디바운스 자동저장
  // =========================================================

  useEffect(() => {
    clearAutoSaveTimer();

    if (
      changeVersion === 0 ||
      !editor ||
      !category ||
      categoriesLoading ||
      uploading ||
      ogUploading ||
      publishing ||
      publishingRef.current
    ) {
      return;
    }

    setAutoSaveStatus(
      (previous) =>
        previous === 'saving'
          ? previous
          : 'waiting'
    );

    const versionToSave =
      changeVersion;

    autoSaveTimerRef.current =
      setTimeout(() => {
        autoSaveTimerRef.current =
          null;

        void handleSave(
          'draft',
          {
            auto: true,
            version:
              versionToSave,
          }
        );
      }, 5000);

    return () => {
      clearAutoSaveTimer();
    };
  }, [
    category,
    categoriesLoading,
    changeVersion,
    clearAutoSaveTimer,
    editor,
    handleSave,
    ogUploading,
    publishing,
    uploading,
  ]);

  // 컴포넌트 종료 시 남아 있는 타이머 정리
  useEffect(() => {
    return () => {
      clearAutoSaveTimer();
    };
  }, [clearAutoSaveTimer]);

  // 자동저장 전에 브라우저를 닫거나 새로고침하면 경고
  useEffect(() => {
    const handleBeforeUnload =
      (event: BeforeUnloadEvent) => {
        const hasUnsavedChanges =
          latestChangeVersionRef.current >
          lastSavedVersionRef.current;

        if (
          hasUnsavedChanges &&
          !publishingRef.current
        ) {
          event.preventDefault();
          event.returnValue = '';
        }
      };

    window.addEventListener(
      'beforeunload',
      handleBeforeUnload
    );

    return () => {
      window.removeEventListener(
        'beforeunload',
        handleBeforeUnload
      );
    };
  }, []);

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

        <div className="flex flex-wrap items-center gap-2">

          <button
            type="button"
            onClick={() =>
              handleSave(
                'draft'
              )
            }
            disabled={
              draftSaving ||
              publishing ||
              autoSaveStatus === 'saving' ||
              categoriesLoading ||
              uploading ||
              ogUploading
            }
            className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-white font-bold rounded-xl border border-slate-700"
          >
            {draftSaving
              ? '저장 중...'
              : currentPostId
                ? '💾 초안 다시 저장'
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
              draftSaving ||
              publishing ||
              autoSaveStatus === 'saving' ||
              categoriesLoading ||
              uploading ||
              ogUploading
            }
            className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold rounded-xl shadow-lg"
          >
            {publishing
              ? '발행 중...'
              : '🚀 공개 발행'}
          </button>

        </div>

      </div>

      <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-800 bg-slate-900/70 px-4 py-3 text-xs">
        <span className="font-bold text-slate-300">
          ⚡ 자동저장 켜짐 · 입력을 멈추면 5초 후 초안 저장
        </span>

        <span
          className={
            autoSaveStatus === 'error'
              ? 'font-bold text-red-400'
              : autoSaveStatus === 'saving'
                ? 'font-bold text-amber-300'
                : autoSaveStatus === 'saved'
                  ? 'font-bold text-emerald-300'
                  : 'font-bold text-slate-400'
          }
        >
          {autoSaveStatus === 'saving'
            ? '저장 중...'
            : autoSaveStatus === 'waiting'
              ? '변경사항 감지 · 자동저장 대기 중'
              : autoSaveStatus === 'error'
                ? '⚠ 자동저장 실패 · 수동 저장을 눌러주세요'
                : autoSaveStatus === 'saved'
                  ? `✓ 자동저장됨${
                      lastAutoSavedAt
                        ? ` · ${lastAutoSavedAt.toLocaleTimeString(
                            'ko-KR',
                            {
                              hour: '2-digit',
                              minute: '2-digit',
                            }
                          )}`
                        : ''
                    }`
                  : '아직 저장할 변경사항이 없습니다.'}
        </span>
      </div>

      {currentPostId && (
        <div className="mb-6 px-4 py-3 rounded-xl border border-emerald-800 bg-emerald-950/40 text-sm text-emerald-300 font-bold">
          ✓ 이 글은 현재 초안으로 저장되어 있습니다. 계속 작성한 뒤 다시 초안 저장하거나 공개 발행하세요.
        </div>
      )}

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
            onChange={(e) => {
              setTitle(
                e.target.value
              );

              markChanged();
            }}
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
              onChange={(e) => {
                setCategory(
                  e.target.value
                );

                markChanged();
              }}
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
              onChange={(e) => {
                setSubcategory(
                  e.target.value
                );

                markChanged();
              }}
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
            onChange={(e) => {
              setDescription(
                e.target.value
              );

              markChanged();
            }}
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
              onChange={(e) => {
                setSeoTitle(
                  e.target.value
                );

                markChanged();
              }}
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
              onChange={(e) => {
                setMetaDescription(
                  e.target.value
                );

                markChanged();
              }}
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
                onChange={(e) => {
                  setOgImage(
                    e.target.value
                  );

                  markChanged();
                }}
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
                    onClick={() => {
                      setOgImage(
                        ''
                      );

                      markChanged();
                    }}
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