'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import { supabase } from '@/app/lib/supabase';

export default function AdminEditPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const postId = params.id;

  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('log');
  const [subcategory, setSubcategory] = useState('');
  const [description, setDescription] = useState('');

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const editor = useEditor({
    immediatelyRender: false,

    extensions: [
      StarterKit,

      Image.configure({
        inline: true,
        allowBase64: true,
      }),
    ],

    content: '<p>글을 불러오는 중...</p>',

    editorProps: {
      attributes: {
        class:
          'prose max-w-none focus:outline-none min-h-[400px] p-4 bg-slate-900 text-slate-100 rounded-b-xl border border-slate-800 leading-relaxed',
      },
    },
  });

  useEffect(() => {
    if (!editor || !postId) return;

    const initialize = async () => {
      // 관리자 로그인 확인
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        router.replace('/admin/login');
        return;
      }

      // 기존 글 불러오기
      const { data, error } = await supabase
        .from('posts')
        .select(
          'id, title, slug, content, category, subcategory, description'
        )
        .eq('id', postId)
        .single();

      if (error || !data) {
        alert(
          '글을 불러오지 못했습니다: ' +
            (error?.message || '글이 없습니다.')
        );

        router.replace('/admin/manage');
        return;
      }

      setTitle(data.title || '');
      setCategory(data.category || 'log');
      setSubcategory(data.subcategory || '');
      setDescription(data.description || '');

      editor.commands.setContent(
        data.content || '<p></p>'
      );

      setLoading(false);
    };

    initialize();
  }, [editor, postId, router]);

  const handleImageUpload = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];

    if (!file || !editor) return;

    try {
      setUploading(true);

      const fileExt =
        file.name.split('.').pop() || 'jpg';

      const fileName = `${Date.now()}.${fileExt}`;

      const filePath = `posts/${fileName}`;

      const { error: uploadError } =
        await supabase.storage
          .from('hohaeng')
          .upload(filePath, file);

      if (uploadError) {
        throw uploadError;
      }

      const { data } = supabase.storage
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
    }
  };

  const handleUpdate = async () => {
    if (!title.trim()) {
      alert('제목을 입력해주세요.');
      return;
    }

    if (!editor) return;

    try {
      setSaving(true);

      const htmlContent = editor.getHTML();

      const { error } = await supabase
        .from('posts')
        .update({
          title: title.trim(),
          content: htmlContent,
          category: category || 'log',
          subcategory:
            subcategory.trim() || null,
          description:
            description.trim() || null,
        })
        .eq('id', postId);

      if (error) {
        throw error;
      }

      alert('글이 성공적으로 수정되었습니다! ✅');

      router.push('/admin/manage');
      router.refresh();
    } catch (error: any) {
      alert(
        '글 수정 실패: ' +
          error.message
      );
    } finally {
      setSaving(false);
    }
  };

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
    <main className="max-w-4xl mx-auto p-6 min-h-screen bg-slate-950 text-slate-100">

      {/* 상단 */}
      <div className="flex flex-wrap justify-between items-center gap-3 mb-6">

        <div>
          <p className="text-blue-400 text-xs font-bold mb-1">
            HOHAENG ADMIN
          </p>

          <h1 className="text-2xl font-black text-white">
            ✏️ 블로그 글 수정
          </h1>
        </div>

        <div className="flex gap-2">

          <button
            type="button"
            onClick={() =>
              router.push('/admin/manage')
            }
            className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl"
          >
            ← 취소
          </button>

          <button
            type="button"
            onClick={handleUpdate}
            disabled={saving}
            className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold rounded-xl shadow-lg"
          >
            {saving
              ? '저장 중...'
              : '✅ 수정 저장'}
          </button>

        </div>
      </div>

      {/* 기본 정보 */}
      <div className="space-y-4 mb-6">

        <div>
          <label className="block text-xs font-bold text-slate-400 mb-1">
            글 제목
          </label>

          <input
            type="text"
            value={title}
            onChange={(e) =>
              setTitle(e.target.value)
            }
            className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 font-bold text-lg"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

          <div>
            <label className="block text-xs font-bold text-slate-400 mb-1">
              카테고리
            </label>

            <select
              value={category}
              onChange={(e) =>
                setCategory(e.target.value)
              }
              className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-blue-500"
            >
              <option value="log">
                📝 호행의 일지
              </option>

              <option value="guide">
                💡 각종 정보
              </option>

              <option value="mindset">
                🧠 마인드셋
              </option>

              <option value="analysis">
                📊 종목 및 시황분석
              </option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-400 mb-1">
              세부 주제
            </label>

            <input
              type="text"
              value={subcategory}
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

        <div>
          <label className="block text-xs font-bold text-slate-400 mb-1">
            한 줄 요약
          </label>

          <input
            type="text"
            value={description}
            onChange={(e) =>
              setDescription(
                e.target.value
              )
            }
            className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-blue-500"
          />
        </div>

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
          className={`px-3 py-1 rounded text-xs font-bold ${
            editor?.isActive('bold')
              ? 'bg-blue-600 text-white'
              : 'bg-slate-700 text-slate-300'
          }`}
        >
          Bold
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
          className={`px-3 py-1 rounded text-xs font-bold ${
            editor?.isActive('italic')
              ? 'bg-blue-600 text-white'
              : 'bg-slate-700 text-slate-300'
          }`}
        >
          Italic
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
          className="px-3 py-1 rounded text-xs font-bold bg-slate-700 text-slate-300"
        >
          H2
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
          className="px-3 py-1 rounded text-xs font-bold bg-slate-700 text-slate-300"
        >
          H3
        </button>

        <label className="cursor-pointer bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold px-3 py-1 rounded ml-auto">

          📷 사진 첨부

          <input
            type="file"
            accept="image/*"
            onChange={
              handleImageUpload
            }
            disabled={uploading}
            className="hidden"
          />

        </label>

        {uploading && (
          <span className="text-xs text-yellow-400">
            업로드 중...
          </span>
        )}

      </div>

      <EditorContent editor={editor} />

    </main>
  );
}