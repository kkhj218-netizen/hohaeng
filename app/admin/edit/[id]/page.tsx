'use client';

import {
  useCallback,
  useEffect,
  useRef,
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

type Subcategory = {
  id: number;
  category_slug: string;
  slug: string;
  name: string;
  emoji: string | null;
  sort_order: number;
  is_active: boolean;
};

type AutoSaveStatus =
  | 'idle'
  | 'waiting'
  | 'saving'
  | 'saved'
  | 'error';

type EditData = {
  title: string;
  content: string;
  category: string;
  subcategory: string;
  description: string;
  seoTitle: string;
  metaDescription: string;
  ogImage: string;
};

type PublishedEditBackup =
  EditData & {
    postId: string;
    savedAt: string;
  };

const createEditSnapshot =
  (data: EditData) =>
    JSON.stringify(data);

const createMetadataSnapshot =
  (data: Omit<EditData, 'content'>) =>
    JSON.stringify(data);

const formatSaveTime =
  (date: Date | null) => {
    if (!date) {
      return '';
    }

    return date.toLocaleTimeString(
      'ko-KR',
      {
        hour: '2-digit',
        minute: '2-digit',
      }
    );
  };

function toDateTimeLocalValue(
  value: string | null
) {
  if (!value) {
    return '';
  }

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return '';
  }

  const timezoneOffset =
    date.getTimezoneOffset() *
    60 *
    1000;

  return new Date(
    date.getTime() -
      timezoneOffset
  )
    .toISOString()
    .slice(0, 16);
}

function formatScheduledDateTime(
  value: string | null
) {
  if (!value) {
    return '';
  }

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return '';
  }

  return date.toLocaleString(
    'ko-KR',
    {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      weekday: 'short',
      hour: '2-digit',
      minute: '2-digit',
    }
  );
}

export default function AdminEditPage() {
  const router = useRouter();

  const params =
    useParams<{
      id: string;
    }>();

  const postId =
    params.id;

  const localDraftKey =
    postId
      ? `hohaeng:published-edit:${postId}`
      : '';

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
  // 세부주제
  // =========================================================

  const [
    subcategories,
    setSubcategories,
  ] = useState<Subcategory[]>([]);

  const [
    subcategoriesLoading,
    setSubcategoriesLoading,
  ] = useState(true);

  // 현재 선택한 카테고리에 속한 세부주제만 표시한다.
  // 비활성 세부주제라도 현재 글이 사용 중이면 수정 화면에는 유지한다.
  const filteredSubcategories =
    subcategories.filter(
      (item) =>
        item.category_slug ===
          category &&
        (
          item.is_active ||
          item.slug ===
            subcategory
        )
    );

  const currentSubcategoryExists =
    !subcategory ||
    filteredSubcategories.some(
      (item) =>
        item.slug ===
        subcategory
    );

  const activeSubcategoryCount =
    filteredSubcategories.filter(
      (item) =>
        item.is_active
    ).length;

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

  // 예약 발행 시각은 DB의 ISO 값과
  // datetime-local 입력값을 분리해서 관리한다.
  const [
    scheduledAt,
    setScheduledAt,
  ] = useState<
    string | null
  >(null);

  const [
    scheduleInput,
    setScheduleInput,
  ] = useState('');

  const [
    scheduleSaving,
    setScheduleSaving,
  ] = useState(false);

  const [
    uploading,
    setUploading,
  ] = useState(false);

  const [
    ogUploading,
    setOgUploading,
  ] = useState(false);


  // =========================================================
  // 자동저장 상태
  // =========================================================

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

  const [
    hasLocalBackup,
    setHasLocalBackup,
  ] = useState(false);

  const [
    restoredLocalBackup,
    setRestoredLocalBackup,
  ] = useState(false);

  const initializedRef =
    useRef(false);

  const initializedPostIdRef =
    useRef<string | null>(null);

  const saveInFlightRef =
    useRef(false);

  const autoSaveTimerRef =
    useRef<ReturnType<typeof setTimeout> | null>(null);

  const latestChangeVersionRef =
    useRef(0);

  const lastSavedVersionRef =
    useRef(0);

  const serverSnapshotRef =
    useRef<string | null>(null);

  const lastSavedSnapshotRef =
    useRef<string | null>(null);

  const lastObservedMetadataRef =
    useRef<string | null>(null);

  const minimumScheduleDateTime =
    toDateTimeLocalValue(
      new Date(
        Date.now() +
          60 * 1000
      ).toISOString()
    );

  const scheduledDateTimeLabel =
    formatScheduledDateTime(
      scheduledAt
    );

  const selectedScheduleLabel =
    formatScheduledDateTime(
      scheduleInput
    );

  const hasScheduledPublish =
    postStatus === 'draft' &&
    Boolean(scheduledAt);

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
      if (!initializedRef.current) {
        return;
      }

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

    onUpdate: () => {
      markChanged();
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

    if (
      initializedPostIdRef.current ===
      postId
    ) {
      return;
    }

    initializedPostIdRef.current =
      postId;

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

        // 글 + 카테고리 + 세부주제를 동시에 불러오기
        const [
          postResult,
          categoryResult,
          subcategoryResult,
        ] =
          await Promise.all([
            supabase
              .from('posts')
              .select(
                'id, title, slug, content, category, subcategory, description, seo_title, meta_description, og_image, status, published_at, scheduled_at'
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

            supabase
              .from(
                'subcategories'
              )
              .select(
                'id, category_slug, slug, name, emoji, sort_order, is_active'
              )
              .order(
                'category_slug',
                {
                  ascending:
                    true,
                }
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

        const {
          data:
            subcategoryData,
          error:
            subcategoryError,
        } =
          subcategoryResult;

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

          setSubcategoriesLoading(
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

        if (
          subcategoryError
        ) {
          console.error(
            '세부주제 불러오기 오류:',
            subcategoryError
          );

          // 기존 글에 저장된 subcategory 값은 그대로 유지하고,
          // 선택 목록만 비워 안전하게 수정할 수 있게 한다.
          setSubcategories([]);

          alert(
            '세부주제 목록을 불러오지 못했습니다. 기존 세부주제 값은 유지됩니다.'
          );
        } else {
          setSubcategories(
            (subcategoryData ||
              []) as Subcategory[]
          );
        }

        setSubcategoriesLoading(
          false
        );

        const loadedStatus =
          postData.status ===
            'draft'
            ? 'draft'
            : 'published';

        const serverData: EditData = {
          title:
            postData.title ||
            '',
          content:
            postData.content ||
            '<p></p>',
          category:
            currentCategory,
          subcategory:
            postData.subcategory ||
            '',
          description:
            postData.description ||
            '',
          seoTitle:
            postData.seo_title ||
            '',
          metaDescription:
            postData.meta_description ||
            '',
          ogImage:
            postData.og_image ||
            '',
        };

        const serverSnapshot =
          createEditSnapshot(
            serverData
          );

        serverSnapshotRef.current =
          serverSnapshot;

        lastSavedSnapshotRef.current =
          serverSnapshot;

        latestChangeVersionRef.current =
          0;

        lastSavedVersionRef.current =
          0;

        setChangeVersion(0);

        setAutoSaveStatus('idle');

        setLastAutoSavedAt(null);

        setHasLocalBackup(false);

        setRestoredLocalBackup(false);

        let dataToShow =
          serverData;

        let restoredBackup:
          PublishedEditBackup |
          null = null;

        // 이미 공개된 글은 DB에 자동저장하지 않고
        // 이 브라우저의 localStorage에만 임시 수정본을 보관한다.
        if (
          loadedStatus ===
            'published' &&
          localDraftKey
        ) {
          try {
            const rawBackup =
              window.localStorage.getItem(
                localDraftKey
              );

            if (rawBackup) {
              const parsedBackup =
                JSON.parse(
                  rawBackup
                ) as PublishedEditBackup;

              if (
                parsedBackup.postId ===
                  postId &&
                typeof parsedBackup.content ===
                  'string'
              ) {
                const backupData: EditData = {
                  title:
                    typeof parsedBackup.title ===
                    'string'
                      ? parsedBackup.title
                      : serverData.title,
                  content:
                    parsedBackup.content,
                  category:
                    typeof parsedBackup.category ===
                    'string'
                      ? parsedBackup.category
                      : serverData.category,
                  subcategory:
                    typeof parsedBackup.subcategory ===
                    'string'
                      ? parsedBackup.subcategory
                      : serverData.subcategory,
                  description:
                    typeof parsedBackup.description ===
                    'string'
                      ? parsedBackup.description
                      : serverData.description,
                  seoTitle:
                    typeof parsedBackup.seoTitle ===
                    'string'
                      ? parsedBackup.seoTitle
                      : serverData.seoTitle,
                  metaDescription:
                    typeof parsedBackup.metaDescription ===
                    'string'
                      ? parsedBackup.metaDescription
                      : serverData.metaDescription,
                  ogImage:
                    typeof parsedBackup.ogImage ===
                    'string'
                      ? parsedBackup.ogImage
                      : serverData.ogImage,
                };

                const backupSnapshot =
                  createEditSnapshot(
                    backupData
                  );

                if (
                  backupSnapshot ===
                  serverSnapshot
                ) {
                  window.localStorage.removeItem(
                    localDraftKey
                  );
                } else {
                  const shouldRestore =
                    window.confirm(
                      '이전에 자동 임시저장된 수정 내용이 있습니다. 복구할까요?\n\n확인: 이전 수정본 복구\n취소: 공개된 현재 글로 시작'
                    );

                  if (shouldRestore) {
                    dataToShow =
                      backupData;

                    restoredBackup =
                      parsedBackup;
                  } else {
                    window.localStorage.removeItem(
                      localDraftKey
                    );
                  }
                }
              }
            }
          } catch (error) {
            console.error(
              '공개글 임시 수정본 확인 오류:',
              error
            );
          }
        }

        // 기본 정보
        setTitle(
          dataToShow.title
        );

        setCategory(
          dataToShow.category
        );

        setSubcategory(
          dataToShow.subcategory
        );

        setDescription(
          dataToShow.description
        );

        // SEO
        setSeoTitle(
          dataToShow.seoTitle
        );

        setMetaDescription(
          dataToShow.metaDescription
        );

        setOgImage(
          dataToShow.ogImage
        );

        // 공개 상태
        setPostStatus(
          loadedStatus
        );

        setPublishedAt(
          postData.published_at ||
            null
        );

        const loadedScheduledAt =
          postData.scheduled_at ||
          null;

        setScheduledAt(
          loadedScheduledAt
        );

        setScheduleInput(
          toDateTimeLocalValue(
            loadedScheduledAt
          )
        );

        // 기존 HTML 본문 또는 복구한 임시 수정본 불러오기
        editor.commands.setContent(
          dataToShow.content,
          { emitUpdate: false }
        );

        lastObservedMetadataRef.current =
          createMetadataSnapshot({
            title:
              dataToShow.title,
            category:
              dataToShow.category,
            subcategory:
              dataToShow.subcategory,
            description:
              dataToShow.description,
            seoTitle:
              dataToShow.seoTitle,
            metaDescription:
              dataToShow.metaDescription,
            ogImage:
              dataToShow.ogImage,
          });

        if (restoredBackup) {
          const restoredSnapshot =
            createEditSnapshot(
              dataToShow
            );

          lastSavedSnapshotRef.current =
            restoredSnapshot;

          latestChangeVersionRef.current =
            1;

          lastSavedVersionRef.current =
            1;

          setChangeVersion(1);

          setAutoSaveStatus(
            'saved'
          );

          const restoredDate =
            new Date(
              restoredBackup.savedAt
            );

          setLastAutoSavedAt(
            Number.isNaN(
              restoredDate.getTime()
            )
              ? new Date()
              : restoredDate
          );

          setHasLocalBackup(true);

          setRestoredLocalBackup(
            true
          );
        }

        initializedRef.current =
          true;

        setLoading(
          false
        );
      };

    initialize();
  }, [
    editor,
    localDraftKey,
    postId,
    router,
  ]);

  // =========================================================
  // 제목 / 카테고리 / SEO 등 본문 외 변경 감지
  // =========================================================

  useEffect(() => {
    if (
      !initializedRef.current ||
      loading
    ) {
      return;
    }

    const nextMetadataSnapshot =
      createMetadataSnapshot({
        title,
        category,
        subcategory,
        description,
        seoTitle,
        metaDescription,
        ogImage,
      });

    if (
      lastObservedMetadataRef.current ===
      null
    ) {
      lastObservedMetadataRef.current =
        nextMetadataSnapshot;

      return;
    }

    if (
      lastObservedMetadataRef.current !==
      nextMetadataSnapshot
    ) {
      lastObservedMetadataRef.current =
        nextMetadataSnapshot;

      markChanged();
    }
  }, [
    category,
    description,
    loading,
    markChanged,
    metaDescription,
    ogImage,
    seoTitle,
    subcategory,
    title,
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
  // 현재 편집 내용 수집
  // =========================================================

  const getCurrentEditData =
    useCallback(():
      EditData |
      null => {
      if (!editor) {
        return null;
      }

      return {
        title,
        content:
          editor.getHTML(),
        category,
        subcategory,
        description,
        seoTitle,
        metaDescription,
        ogImage,
      };
    }, [
      category,
      description,
      editor,
      metaDescription,
      ogImage,
      seoTitle,
      subcategory,
      title,
    ]);

  // =========================================================
  // 초안 글: Supabase DB 자동저장
  // =========================================================

  const autoSaveDraft =
    useCallback(
      async (
        versionAtSave:
          number
      ) => {
        if (
          postStatus !==
            'draft' ||
          saveInFlightRef.current
        ) {
          return;
        }

        const editData =
          getCurrentEditData();

        if (
          !editData ||
          !category ||
          !postId
        ) {
          return;
        }

        const snapshot =
          createEditSnapshot(
            editData
          );

        // 이미 DB에 저장된 내용과 같으면 요청하지 않는다.
        if (
          serverSnapshotRef.current ===
          snapshot
        ) {
          lastSavedSnapshotRef.current =
            snapshot;

          lastSavedVersionRef.current =
            Math.max(
              lastSavedVersionRef.current,
              versionAtSave
            );

          setAutoSaveStatus(
            'saved'
          );

          return;
        }

        saveInFlightRef.current =
          true;

        setAutoSaveStatus(
          'saving'
        );

        try {
          const savedTitle =
            title.trim() ||
            '제목 없는 초안';

          const now =
            new Date().toISOString();

          const {
            data:
              updatedDraft,
            error,
          } =
            await supabase
              .from('posts')
              .update({
                title:
                  savedTitle,
                content:
                  editData.content,
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
                  'draft',
                published_at:
                  null,
                updated_at:
                  now,
              })
              .eq(
                'id',
                postId
              )
              .eq(
                'status',
                'draft'
              )
              .select(
                'id'
              )
              .maybeSingle();

          if (error) {
            throw error;
          }

          // 예약 시간이 되어 Cron이 이미 공개한 글을
          // 늦게 실행된 초안 자동저장이 다시 비공개로 되돌리지 못하게 한다.
          if (!updatedDraft) {
            setPostStatus(
              'published'
            );

            setScheduledAt(
              null
            );

            setScheduleInput('');

            setAutoSaveStatus(
              'error'
            );

            alert(
              '예약 시간이 되어 글이 이미 공개되었습니다. 페이지를 새로고침한 뒤 공개글 수정 모드로 이어서 작업해주세요.'
            );

            return;
          }

          serverSnapshotRef.current =
            snapshot;

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
        } catch (error) {
          console.error(
            '초안 자동저장 실패:',
            error
          );

          setAutoSaveStatus(
            'error'
          );
        } finally {
          saveInFlightRef.current =
            false;
        }
      },
      [
        category,
        description,
        getCurrentEditData,
        metaDescription,
        ogImage,
        postId,
        postStatus,
        seoTitle,
        subcategory,
        title,
      ]
    );

  // =========================================================
  // 공개글: 브라우저 localStorage 임시 자동저장
  // 실제 posts DB는 절대 수정하지 않는다.
  // =========================================================

  const savePublishedLocalBackup =
    useCallback(
      (
        versionAtSave:
          number
      ) => {
        if (
          postStatus !==
            'published' ||
          !localDraftKey ||
          !postId
        ) {
          return;
        }

        const editData =
          getCurrentEditData();

        if (!editData) {
          return;
        }

        const snapshot =
          createEditSnapshot(
            editData
          );

        try {
          setAutoSaveStatus(
            'saving'
          );

          // 수정 내용을 모두 되돌려 현재 공개글과 같아졌다면
          // 불필요한 로컬 임시 수정본을 삭제한다.
          if (
            serverSnapshotRef.current ===
            snapshot
          ) {
            window.localStorage.removeItem(
              localDraftKey
            );

            lastSavedSnapshotRef.current =
              snapshot;

            lastSavedVersionRef.current =
              Math.max(
                lastSavedVersionRef.current,
                versionAtSave
              );

            setHasLocalBackup(
              false
            );

            setLastAutoSavedAt(
              new Date()
            );

            setAutoSaveStatus(
              'saved'
            );

            return;
          }

          // 같은 수정본을 이미 임시저장했다면 다시 쓰지 않는다.
          if (
            lastSavedSnapshotRef.current ===
            snapshot &&
            hasLocalBackup
          ) {
            lastSavedVersionRef.current =
              Math.max(
                lastSavedVersionRef.current,
                versionAtSave
              );

            setAutoSaveStatus(
              'saved'
            );

            return;
          }

          const savedAt =
            new Date();

          const backup:
            PublishedEditBackup = {
            postId,
            savedAt:
              savedAt.toISOString(),
            ...editData,
          };

          window.localStorage.setItem(
            localDraftKey,
            JSON.stringify(
              backup
            )
          );

          lastSavedSnapshotRef.current =
            snapshot;

          lastSavedVersionRef.current =
            Math.max(
              lastSavedVersionRef.current,
              versionAtSave
            );

          setHasLocalBackup(
            true
          );

          setLastAutoSavedAt(
            savedAt
          );

          setAutoSaveStatus(
            'saved'
          );
        } catch (error) {
          console.error(
            '공개글 임시 자동저장 실패:',
            error
          );

          setAutoSaveStatus(
            'error'
          );
        }
      },
      [
        getCurrentEditData,
        hasLocalBackup,
        localDraftKey,
        postId,
        postStatus,
      ]
    );

  // =========================================================
  // 수동 초안 저장 / 공개 발행 / 공개글 수정 저장
  // =========================================================

  const handleSave =
    useCallback(
      async (
        targetStatus:
          'draft' |
          'published'
      ) => {
        clearAutoSaveTimer();

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

        if (
          !editor ||
          !postId ||
          saveInFlightRef.current
        ) {
          return;
        }

        const editData =
          getCurrentEditData();

        if (!editData) {
          return;
        }

        const wasDraft =
          postStatus ===
          'draft';

        saveInFlightRef.current =
          true;

        try {
          setSaving(
            true
          );

          const savedTitle =
            title.trim() ||
            '제목 없는 초안';

          const nextPublishedAt =
            targetStatus ===
            'published'
              ? publishedAt ||
                new Date().toISOString()
              : null;

          const { error } =
            await supabase
              .from('posts')
              .update({
                // 기본 글
                title:
                  savedTitle,
                content:
                  editData.content,
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

                // 즉시 공개하면 기존 예약을 제거하고,
                // 초안 저장은 현재 예약을 그대로 유지한다.
                scheduled_at:
                  targetStatus ===
                  'published'
                    ? null
                    : scheduledAt,

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
            targetStatus ===
            'published'
          ) {
            setScheduledAt(
              null
            );

            setScheduleInput('');
          }

          const savedEditData:
            EditData = {
            ...editData,
            title:
              title.trim()
                ? title
                : savedTitle,
          };

          const savedSnapshot =
            createEditSnapshot(
              savedEditData
            );

          serverSnapshotRef.current =
            savedSnapshot;

          lastSavedSnapshotRef.current =
            savedSnapshot;

          const currentVersion =
            latestChangeVersionRef.current;

          lastSavedVersionRef.current =
            currentVersion;

          setLastAutoSavedAt(
            new Date()
          );

          setAutoSaveStatus(
            'saved'
          );

          if (
            !title.trim()
          ) {
            setTitle(
              savedTitle
            );

            lastObservedMetadataRef.current =
              createMetadataSnapshot({
                title:
                  savedTitle,
                category,
                subcategory,
                description,
                seoTitle,
                metaDescription,
                ogImage,
              });
          }

          // 초안은 현재 화면에서 계속 작성
          if (
            targetStatus ===
            'draft'
          ) {
            alert(
              scheduledAt
                ? '초안 내용이 저장되었습니다! 💾\n기존 예약 발행 시간은 그대로 유지됩니다.'
                : '초안으로 저장되었습니다! 💾'
            );

            return;
          }

          // 공개글 수정본 임시저장 파일은
          // 실제 DB 저장 성공 후에만 삭제한다.
          if (localDraftKey) {
            try {
              window.localStorage.removeItem(
                localDraftKey
              );
            } catch (error) {
              console.error(
                '임시 수정본 삭제 오류:',
                error
              );
            }
          }

          setHasLocalBackup(
            false
          );

          setRestoredLocalBackup(
            false
          );

          alert(
            wasDraft
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
          // 공개글 DB 저장 실패 시에는 현재 수정본을
          // 브라우저 임시저장으로 한 번 더 보호한다.
          if (
            postStatus ===
            'published'
          ) {
            savePublishedLocalBackup(
              latestChangeVersionRef.current
            );
          }

          alert(
            '글 저장 실패: ' +
              error.message
          );
        } finally {
          saveInFlightRef.current =
            false;

          setSaving(
            false
          );
        }
      },
      [
        category,
        clearAutoSaveTimer,
        description,
        editor,
        getCurrentEditData,
        localDraftKey,
        metaDescription,
        ogImage,
        postId,
        postStatus,
        publishedAt,
        router,
        savePublishedLocalBackup,
        scheduledAt,
        seoTitle,
        subcategory,
        title,
      ]
    );

  // =========================================================
  // 예약 발행 등록·변경
  // =========================================================

  const handleSchedulePublish =
    useCallback(
      async () => {
        clearAutoSaveTimer();

        if (
          postStatus !==
          'draft'
        ) {
          alert(
            '초안 상태의 글만 예약 발행할 수 있습니다.'
          );

          return;
        }

        if (!title.trim()) {
          alert(
            '예약 발행하려면 제목을 입력해주세요.'
          );

          return;
        }

        if (!category) {
          alert(
            '카테고리를 선택해주세요.'
          );

          return;
        }

        if (!scheduleInput) {
          alert(
            '예약 발행 날짜와 시간을 선택해주세요.'
          );

          return;
        }

        const scheduleDate =
          new Date(
            scheduleInput
          );

        if (
          Number.isNaN(
            scheduleDate.getTime()
          )
        ) {
          alert(
            '예약 날짜와 시간을 다시 선택해주세요.'
          );

          return;
        }

        if (
          scheduleDate.getTime() <=
          Date.now()
        ) {
          alert(
            '예약 시간은 현재보다 미래로 설정해주세요.'
          );

          return;
        }

        if (
          !editor ||
          !postId ||
          saveInFlightRef.current
        ) {
          return;
        }

        const editData =
          getCurrentEditData();

        if (!editData) {
          return;
        }

        const nextScheduledAt =
          scheduleDate.toISOString();

        saveInFlightRef.current =
          true;

        try {
          setScheduleSaving(
            true
          );

          const now =
            new Date().toISOString();

          const {
            data:
              updatedDraft,
            error,
          } =
            await supabase
              .from('posts')
              .update({
                title:
                  title.trim(),
                content:
                  editData.content,
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
                status:
                  'draft',
                published_at:
                  null,
                scheduled_at:
                  nextScheduledAt,
                updated_at:
                  now,
              })
              .eq(
                'id',
                postId
              )
              .eq(
                'status',
                'draft'
              )
              .select(
                'id'
              )
              .maybeSingle();

          if (error) {
            throw error;
          }

          if (!updatedDraft) {
            setPostStatus(
              'published'
            );

            setScheduledAt(
              null
            );

            setScheduleInput('');

            alert(
              '예약 시간이 지나 글이 이미 공개되었습니다. 페이지를 새로고침해주세요.'
            );

            return;
          }

          setScheduledAt(
            nextScheduledAt
          );

          setScheduleInput(
            toDateTimeLocalValue(
              nextScheduledAt
            )
          );

          setPublishedAt(
            null
          );

          const savedSnapshot =
            createEditSnapshot(
              editData
            );

          serverSnapshotRef.current =
            savedSnapshot;

          lastSavedSnapshotRef.current =
            savedSnapshot;

          lastSavedVersionRef.current =
            latestChangeVersionRef.current;

          setLastAutoSavedAt(
            new Date()
          );

          setAutoSaveStatus(
            'saved'
          );

          alert(
            `${scheduledAt ? '예약 발행 시간이 변경되었습니다! ⏰' : '예약 발행이 등록되었습니다! ⏰'}\n\n${formatScheduledDateTime(
              nextScheduledAt
            )}\n\n예약 전에는 초안으로 유지되고, 시간이 되면 자동 공개됩니다.`
          );
        } catch (
          error: any
        ) {
          alert(
            '예약 발행 저장 실패: ' +
              error.message
          );
        } finally {
          saveInFlightRef.current =
            false;

          setScheduleSaving(
            false
          );
        }
      },
      [
        category,
        clearAutoSaveTimer,
        description,
        editor,
        getCurrentEditData,
        metaDescription,
        ogImage,
        postId,
        postStatus,
        scheduleInput,
        scheduledAt,
        seoTitle,
        subcategory,
        title,
      ]
    );

  // =========================================================
  // 예약 발행 취소
  // 현재 편집 중인 내용도 함께 초안으로 안전하게 저장한다.
  // =========================================================

  const handleCancelSchedule =
    useCallback(
      async () => {
        if (!scheduledAt) {
          return;
        }

        const shouldCancel =
          window.confirm(
            '예약 발행을 취소할까요?\n\n글은 삭제되지 않고 초안으로 계속 보관됩니다.'
          );

        if (!shouldCancel) {
          return;
        }

        clearAutoSaveTimer();

        if (
          !editor ||
          !postId ||
          saveInFlightRef.current
        ) {
          return;
        }

        const editData =
          getCurrentEditData();

        if (!editData) {
          return;
        }

        saveInFlightRef.current =
          true;

        try {
          setScheduleSaving(
            true
          );

          const savedTitle =
            title.trim() ||
            '제목 없는 초안';

          const {
            data:
              updatedDraft,
            error,
          } =
            await supabase
              .from('posts')
              .update({
                title:
                  savedTitle,
                content:
                  editData.content,
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
                  'draft',
                published_at:
                  null,
                scheduled_at:
                  null,
                updated_at:
                  new Date().toISOString(),
              })
              .eq(
                'id',
                postId
              )
              .eq(
                'status',
                'draft'
              )
              .select(
                'id'
              )
              .maybeSingle();

          if (error) {
            throw error;
          }

          if (!updatedDraft) {
            setPostStatus(
              'published'
            );

            setScheduledAt(
              null
            );

            setScheduleInput('');

            alert(
              '예약 시간이 지나 글이 이미 공개되었습니다. 예약을 취소할 수 없습니다.'
            );

            return;
          }

          setScheduledAt(
            null
          );

          setScheduleInput('');

          setPublishedAt(
            null
          );

          if (!title.trim()) {
            setTitle(
              savedTitle
            );
          }

          const savedEditData:
            EditData = {
            ...editData,
            title:
              title.trim()
                ? title
                : savedTitle,
          };

          const savedSnapshot =
            createEditSnapshot(
              savedEditData
            );

          serverSnapshotRef.current =
            savedSnapshot;

          lastSavedSnapshotRef.current =
            savedSnapshot;

          lastSavedVersionRef.current =
            latestChangeVersionRef.current;

          setLastAutoSavedAt(
            new Date()
          );

          setAutoSaveStatus(
            'saved'
          );

          alert(
            '예약 발행이 취소되었습니다. 글은 초안으로 계속 보관됩니다. 📝'
          );
        } catch (
          error: any
        ) {
          alert(
            '예약 취소 실패: ' +
              error.message
          );
        } finally {
          saveInFlightRef.current =
            false;

          setScheduleSaving(
            false
          );
        }
      },
      [
        category,
        clearAutoSaveTimer,
        description,
        editor,
        getCurrentEditData,
        metaDescription,
        ogImage,
        postId,
        scheduledAt,
        seoTitle,
        subcategory,
        title,
      ]
    );

  // =========================================================
  // 5초 디바운스 자동저장
  // 초안 = Supabase / 공개글 = localStorage
  // =========================================================

  useEffect(() => {
    clearAutoSaveTimer();

    if (
      !initializedRef.current ||
      loading ||
      changeVersion === 0 ||
      lastSavedVersionRef.current >=
        changeVersion ||
      !editor ||
      !category ||
      categoriesLoading ||
      uploading ||
      ogUploading ||
      saving ||
      scheduleSaving
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

        if (
          postStatus ===
          'draft'
        ) {
          void autoSaveDraft(
            versionToSave
          );
        } else {
          savePublishedLocalBackup(
            versionToSave
          );
        }
      }, 5000);

    return () => {
      clearAutoSaveTimer();
    };
  }, [
    autoSaveDraft,
    categoriesLoading,
    category,
    changeVersion,
    clearAutoSaveTimer,
    editor,
    loading,
    ogUploading,
    postStatus,
    savePublishedLocalBackup,
    saving,
    scheduleSaving,
    uploading,
  ]);

  // 컴포넌트 종료 시 타이머 정리
  useEffect(() => {
    return () => {
      clearAutoSaveTimer();
    };
  }, [clearAutoSaveTimer]);

  // 자동저장 전에 새로고침/브라우저 종료 시 경고
  useEffect(() => {
    const handleBeforeUnload =
      (event: BeforeUnloadEvent) => {
        const hasUnsavedChanges =
          latestChangeVersionRef.current >
          lastSavedVersionRef.current;

        if (hasUnsavedChanges) {
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
            {hasScheduledPublish
              ? '⏰ 예약 글 수정'
              : postStatus ===
                  'draft'
                ? '✍️ 초안 이어쓰기'
                : '✏️ 블로그 글 수정'}
          </h1>

          <p className="text-sm text-slate-400 mt-1">
            {hasScheduledPublish
              ? '예약 전까지 내용을 수정하고 예약 시간을 변경하거나 취소할 수 있습니다.'
              : postStatus ===
                  'draft'
                ? '저장해둔 초안을 이어서 작성하고 준비가 되면 공개 발행하세요.'
                : '글 내용 · 디자인 · 이미지 · SEO 설정을 수정합니다.'}
          </p>

          <div className="mt-3">
            <span
              className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold ${
                hasScheduledPublish
                  ? 'bg-violet-500/10 text-violet-300 border border-violet-500/20'
                  : postStatus ===
                      'draft'
                    ? 'bg-amber-500/10 text-amber-300 border border-amber-500/20'
                    : 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/20'
              }`}
            >
              {hasScheduledPublish
                ? '⏰ 현재 상태: 예약 대기'
                : postStatus ===
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
                  scheduleSaving ||
                  autoSaveStatus === 'saving' ||
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
                  scheduleSaving ||
                  autoSaveStatus === 'saving' ||
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
                scheduleSaving ||
                autoSaveStatus === 'saving' ||
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
          자동저장 안내
      ===================================================== */}

      <div
        className={`mb-6 rounded-2xl border px-4 py-4 ${
          postStatus ===
          'draft'
            ? 'border-blue-800 bg-blue-950/30'
            : 'border-violet-800 bg-violet-950/30'
        }`}
      >
        <div className="flex flex-col gap-1">
          <p className="text-sm font-black text-white">
            {postStatus ===
            'draft'
              ? '💾 초안 자동저장'
              : '🛡️ 공개글 보호 자동저장'}
          </p>

          <p className="text-xs text-slate-300">
            {postStatus ===
            'draft'
              ? '수정 후 5초가 지나면 같은 초안에 자동 저장됩니다.'
              : '수정 후 5초가 지나면 이 브라우저에만 임시 저장됩니다. 방문자에게 보이는 공개글은 바뀌지 않습니다.'}
          </p>

          <p
            className={`text-xs font-bold mt-1 ${
              autoSaveStatus ===
              'error'
                ? 'text-red-300'
                : autoSaveStatus ===
                    'saved'
                  ? 'text-emerald-300'
                  : 'text-amber-300'
            }`}
          >
            {autoSaveStatus ===
            'idle'
              ? postStatus ===
                'draft'
                ? '자동저장 준비됨'
                : '공개글 보호 모드 · 임시저장 준비됨'
              : autoSaveStatus ===
                  'waiting'
                ? postStatus ===
                  'draft'
                  ? '변경사항 감지 · 5초 후 자동저장'
                  : '변경사항 감지 · 5초 후 브라우저 임시저장'
                : autoSaveStatus ===
                    'saving'
                  ? postStatus ===
                    'draft'
                    ? '저장 중...'
                    : '수정본 임시저장 중...'
                  : autoSaveStatus ===
                      'saved'
                    ? postStatus ===
                      'draft'
                      ? `✓ 자동저장됨${
                          lastAutoSavedAt
                            ? ` · ${formatSaveTime(
                                lastAutoSavedAt
                              )}`
                            : ''
                        }`
                      : hasLocalBackup
                        ? `✓ 수정본 임시저장됨${
                            lastAutoSavedAt
                              ? ` · ${formatSaveTime(
                                  lastAutoSavedAt
                                )}`
                              : ''
                          } · 공개글 미반영`
                        : '✓ 현재 공개글과 동일 · 임시 수정본 없음'
                    : postStatus ===
                      'draft'
                      ? '자동저장 실패 · 수동 초안 저장을 확인해주세요.'
                      : '임시저장 실패 · 수정 저장 전 브라우저를 닫지 마세요.'}
          </p>

          {postStatus ===
            'published' && (
            <p className="text-xs text-violet-300 mt-1">
              ✅ 실제 공개글 반영은 반드시 ‘수정 저장’ 버튼을 눌러야 합니다.
            </p>
          )}

          {restoredLocalBackup &&
            postStatus ===
              'published' && (
            <p className="text-xs font-bold text-cyan-300 mt-1">
              ♻️ 이전에 임시저장된 수정본을 복구했습니다.
            </p>
          )}
        </div>
      </div>

      {/* =====================================================
          예약 발행 설정
      ===================================================== */}

      {postStatus ===
        'draft' && (
        <div className="mb-6 rounded-2xl border border-violet-800 bg-violet-950/30 p-5">
          <div className="flex flex-col xl:flex-row xl:items-end gap-4">
            <div className="flex-1">
              <h2 className="text-lg font-black text-white">
                {hasScheduledPublish
                  ? '⏰ 예약 발행 변경·취소'
                  : '⏰ 예약 발행 설정'}
              </h2>

              <p className="text-xs text-slate-300 mt-1 leading-5">
                날짜와 시간을 고른 뒤 예약 버튼을 눌러야 DB에 반영됩니다. 날짜 입력만 바꾸고 화면을 나가면 기존 예약은 변경되지 않습니다.
              </p>

              <label className="block text-xs font-bold text-violet-300 mt-4 mb-2">
                예약 날짜와 시간
              </label>

              <input
                type="datetime-local"
                value={
                  scheduleInput
                }
                min={
                  minimumScheduleDateTime
                }
                onChange={(e) =>
                  setScheduleInput(
                    e.target.value
                  )
                }
                disabled={
                  scheduleSaving ||
                  saving
                }
                className="w-full bg-slate-950 border border-violet-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-violet-400 disabled:opacity-50"
              />

              <div className="flex flex-wrap gap-2 mt-4">
                <button
                  type="button"
                  onClick={
                    handleSchedulePublish
                  }
                  disabled={
                    scheduleSaving ||
                    saving ||
                    autoSaveStatus ===
                      'saving' ||
                    !scheduleInput
                  }
                  className="px-5 py-2.5 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white font-bold rounded-xl"
                >
                  {scheduleSaving
                    ? '처리 중...'
                    : hasScheduledPublish
                      ? '⏰ 예약 시간 변경'
                      : '⏰ 예약 발행 등록'}
                </button>

                {hasScheduledPublish && (
                  <button
                    type="button"
                    onClick={
                      handleCancelSchedule
                    }
                    disabled={
                      scheduleSaving ||
                      saving ||
                      autoSaveStatus ===
                        'saving'
                    }
                    className="px-5 py-2.5 bg-red-500/10 hover:bg-red-500/20 disabled:opacity-50 text-red-300 font-bold rounded-xl border border-red-500/20"
                  >
                    ✕ 예약 취소
                  </button>
                )}
              </div>
            </div>

            <div className="xl:w-[340px] rounded-xl border border-violet-800/70 bg-slate-950/70 px-4 py-4">
              <p className="text-xs font-black text-violet-300">
                현재 DB 예약
              </p>

              <p className="text-sm font-bold text-white mt-2">
                {scheduledDateTimeLabel ||
                  '등록된 예약이 없습니다.'}
              </p>

              <div className="border-t border-slate-800 mt-3 pt-3">
                <p className="text-xs font-black text-slate-400">
                  입력창에서 선택한 시간
                </p>

                <p className="text-sm font-bold text-slate-200 mt-2">
                  {selectedScheduleLabel ||
                    '날짜와 시간을 선택해주세요.'}
                </p>
              </div>

              <p className="text-xs text-slate-400 mt-3 leading-5">
                현재 기기의 현지 시간 기준입니다. 예약 전에는 방문자에게 보이지 않습니다.
              </p>
            </div>
          </div>
        </div>
      )}

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
                ⚙️ 카테고리·세부주제 관리
              </button>

            </div>

            <select
              value={
                category
              }
              onChange={(e) => {
                const nextCategory =
                  e.target.value;

                setCategory(
                  nextCategory
                );

                // 카테고리가 바뀌면 이전 카테고리의
                // 세부주제가 잘못 연결되지 않도록 초기화
                setSubcategory('');
              }}
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

            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-bold text-slate-400">
                세부 주제
              </label>

              <span className="text-[11px] font-bold text-violet-400">
                선택한 카테고리와 자동 연동
              </span>
            </div>

            <select
              value={
                subcategory
              }
              onChange={(e) =>
                setSubcategory(
                  e.target.value
                )
              }
              disabled={
                categoriesLoading ||
                subcategoriesLoading ||
                !category
              }
              className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-violet-500 disabled:opacity-50"
            >
              <option value="">
                세부주제 없음
              </option>

              {!currentSubcategoryExists &&
                subcategory && (
                <option
                  value={
                    subcategory
                  }
                >
                  ⚠️ 기존 세부주제 ({subcategory})
                </option>
              )}

              {filteredSubcategories.map(
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
                      '•'}{' '}
                    {item.name}
                    {!item.is_active
                      ? ' (비활성 · 기존 글)'
                      : ''}
                  </option>
                )
              )}
            </select>

            <p className="text-xs text-slate-500 mt-1">
              {subcategoriesLoading
                ? '세부주제를 불러오는 중입니다.'
                : !currentSubcategoryExists &&
                    subcategory
                  ? `DB에 없는 기존 값 “${subcategory}”을 유지하고 있습니다. 다른 항목을 선택하면 새 값으로 변경됩니다.`
                  : activeSubcategoryCount > 0
                    ? `${activeSubcategoryCount}개의 활성 세부주제 중에서 선택할 수 있습니다.`
                    : '이 카테고리에 등록된 활성 세부주제가 없습니다.'}
            </p>

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