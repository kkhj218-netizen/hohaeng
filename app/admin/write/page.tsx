'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import { supabase } from '@/app/lib/supabase';

export default function AdminWritePage() {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('mindset');
  const [subcategory, setSubcategory] = useState('');
  const [description, setDescription] = useState('');
  const [uploading, setUploading] = useState(false);

  // Tiptap WYSIWYG 에디터 설정
  const editor = useEditor({
    immediatelyRender: false, // 터미널 경고 메시지 방지
    extensions: [
      StarterKit,
      Image.configure({
        inline: true,
        allowBase64: true,
      }),
    ],
    content: '<p>여기에 블로그 글을 자유롭게 작성하세요...</p>',
    editorProps: {
      attributes: {
        class:
          'prose max-w-none focus:outline-none min-h-[400px] p-4 bg-slate-900 text-slate-100 rounded-b-xl border border-slate-800 leading-relaxed',
      },
    },
  });

  // 이미지 업로드 핸들러 (Supabase Storage 이용)
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !editor) return;

    try {
      setUploading(true);
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}.${fileExt}`;
      const filePath = `posts/${fileName}`;

      // 실제 생성한 Supabase Storage 'hohaeng' 버킷으로 지정
      const { error: uploadError } = await supabase.storage
        .from('hohaeng')
        .upload(filePath, file);

      if (uploadError) {
        throw uploadError;
      }

      // 공용 URL 가져오기
      const { data } = supabase.storage.from('hohaeng').getPublicUrl(filePath);

      if (data.publicUrl) {
        editor.chain().focus().setImage({ src: data.publicUrl }).run();
      }
    } catch (error: any) {
      alert('이미지 업로드 실패: ' + error.message);
    } finally {
      setUploading(false);
    }
  };

  // 발행하기 핸들러
  const handleSubmit = async () => {
    if (!title.trim()) {
      alert('제목을 입력해주세요.');
      return;
    }

    if (!editor) return;
    const htmlContent = editor.getHTML();

    // 슬러그 생성 (영어/숫자 유니크 슬러그)
    const slug = `${category}-${Date.now()}`;

    const { error } = await supabase.from('posts').insert([
      {
        title,
        slug,
        content: htmlContent,
        category,
        subcategory,
        description,
      },
    ]);

    if (error) {
      alert('글 저장 실패: ' + error.message);
    } else {
      alert('성공적으로 글이 발행되었습니다! 🚀');
      router.push('/admin/write');
      // 폼 초기화
      setTitle('');
      setDescription('');
      editor.commands.setContent('<p>여기에 블로그 글을 자유롭게 작성하세요...</p>');
    }
  };

  return (
    <main className="max-w-4xl mx-auto p-6 min-h-screen bg-slate-950 text-slate-100">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-black text-white">✍️ 블로그 에디터 (글 작성/발행)</h1>
        <button
          type="button"
          onClick={handleSubmit}
          className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl shadow-lg transition-all cursor-pointer"
        >
          🚀 즉시 발행하기
        </button>
      </div>

      <div className="space-y-4 mb-6">
        {/* 제목 입력 */}
        <div>
          <label className="block text-xs font-bold text-slate-400 mb-1">글 제목</label>
          <input
            type="text"
            placeholder="제목을 입력하세요"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 font-bold text-lg"
          />
        </div>

        {/* 카테고리 & 서브 카테고리 */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-400 mb-1">카테고리</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-blue-500"
            >
              <option value="mindset">🧠 마인드셋</option>
              <option value="log">📝 호행의 일지</option>
              <option value="guide">💡 각종 정보</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-400 mb-1">세부 주제 (선택)</label>
            <input
              type="text"
              placeholder="예: invest, routine, dividend"
              value={subcategory}
              onChange={(e) => setSubcategory(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-blue-500 text-sm"
            />
          </div>
        </div>

        {/* 한 줄 요약/설명 */}
        <div>
          <label className="block text-xs font-bold text-slate-400 mb-1">한 줄 요약 (설명)</label>
          <input
            type="text"
            placeholder="목록 카드에 표시될 짧은 설명을 입력하세요"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-blue-500 text-sm"
          />
        </div>
      </div>

      {/* 에디터 툴바 */}
      <div className="bg-slate-800/80 p-3 rounded-t-xl border border-b-0 border-slate-700 flex flex-wrap gap-2 items-center">
        <button
          type="button"
          onClick={() => editor?.chain().focus().toggleBold().run()}
          className={`px-3 py-1 rounded text-xs font-bold cursor-pointer ${
            editor?.isActive('bold') ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-300'
          }`}
        >
          Bold (굵게)
        </button>
        <button
          type="button"
          onClick={() => editor?.chain().focus().toggleItalic().run()}
          className={`px-3 py-1 rounded text-xs font-bold cursor-pointer ${
            editor?.isActive('italic') ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-300'
          }`}
        >
          Italic (기울임)
        </button>
        <button
          type="button"
          onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()}
          className={`px-3 py-1 rounded text-xs font-bold cursor-pointer ${
            editor?.isActive('heading', { level: 2 }) ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-300'
          }`}
        >
          H2 (큰 제목)
        </button>
        <button
          type="button"
          onClick={() => editor?.chain().focus().toggleHeading({ level: 3 }).run()}
          className={`px-3 py-1 rounded text-xs font-bold cursor-pointer ${
            editor?.isActive('heading', { level: 3 }) ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-300'
          }`}
        >
          H3 (소제목)
        </button>

        {/* 이미지 첨부 버튼 */}
        <label className="cursor-pointer bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold px-3 py-1 rounded transition-colors ml-auto flex items-center gap-1">
          <span>📷 사진 첨부</span>
          <input
            type="file"
            accept="image/*"
            onChange={handleImageUpload}
            disabled={uploading}
            className="hidden"
          />
        </label>
        {uploading && <span className="text-xs text-yellow-400">업로드 중...</span>}
      </div>

      {/* 본문 에디터 영역 */}
      <EditorContent editor={editor} />
    </main>
  );
}