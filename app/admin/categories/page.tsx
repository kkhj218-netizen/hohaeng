'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/app/lib/supabase';

type Category = {
  id: number;
  slug: string;
  name: string;
  emoji: string | null;
  sort_order: number;
  is_active: boolean;
};

export default function AdminCategoriesPage() {
  const router = useRouter();

  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // 새 카테고리
  const [slug, setSlug] = useState('');
  const [name, setName] = useState('');
  const [emoji, setEmoji] = useState('');
  const [sortOrder, setSortOrder] = useState(1);

  // 수정 중인 카테고리
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState('');
  const [editEmoji, setEditEmoji] = useState('');
  const [editSortOrder, setEditSortOrder] = useState(1);

  const loadCategories = async () => {
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .order('sort_order', {
        ascending: true,
      });

    if (error) {
      alert(
        '카테고리를 불러오지 못했습니다: ' +
          error.message
      );
      return;
    }

    setCategories(
      (data || []) as Category[]
    );
  };

  useEffect(() => {
    const initialize = async () => {
      // 관리자 로그인 확인
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        router.replace('/admin/login');
        return;
      }

      await loadCategories();

      setLoading(false);
    };

    initialize();
  }, [router]);

  // 새 카테고리 추가
  const handleAdd = async () => {
    if (!slug.trim()) {
      alert('slug를 입력해주세요.');
      return;
    }

    if (!name.trim()) {
      alert('카테고리 이름을 입력해주세요.');
      return;
    }

    const cleanSlug = slug
      .trim()
      .toLowerCase()
      .replace(/\s+/g, '-');

    try {
      setSaving(true);

      const { error } = await supabase
        .from('categories')
        .insert([
          {
            slug: cleanSlug,
            name: name.trim(),
            emoji: emoji.trim() || null,
            sort_order: sortOrder,
            is_active: true,
          },
        ]);

      if (error) {
        throw error;
      }

      setSlug('');
      setName('');
      setEmoji('');

      await loadCategories();

      alert('카테고리가 추가되었습니다. ✅');
    } catch (error: any) {
      alert(
        '카테고리 추가 실패: ' +
          error.message
      );
    } finally {
      setSaving(false);
    }
  };

  // 수정 시작
  const startEdit = (
    category: Category
  ) => {
    setEditingId(category.id);
    setEditName(category.name);
    setEditEmoji(
      category.emoji || ''
    );
    setEditSortOrder(
      category.sort_order
    );
  };

  // 수정 취소
  const cancelEdit = () => {
    setEditingId(null);
  };

  // 수정 저장
  const handleUpdate = async (
    category: Category
  ) => {
    if (!editName.trim()) {
      alert('카테고리 이름을 입력해주세요.');
      return;
    }

    try {
      setSaving(true);

      const { error } = await supabase
        .from('categories')
        .update({
          name: editName.trim(),
          emoji:
            editEmoji.trim() || null,
          sort_order:
            editSortOrder,
        })
        .eq('id', category.id);

      if (error) {
        throw error;
      }

      setEditingId(null);

      await loadCategories();

      alert('수정되었습니다. ✅');
    } catch (error: any) {
      alert(
        '수정 실패: ' +
          error.message
      );
    } finally {
      setSaving(false);
    }
  };

  // 활성 / 비활성
  const toggleActive = async (
    category: Category
  ) => {
    const { error } = await supabase
      .from('categories')
      .update({
        is_active:
          !category.is_active,
      })
      .eq('id', category.id);

    if (error) {
      alert(
        '상태 변경 실패: ' +
          error.message
      );
      return;
    }

    await loadCategories();
  };

  // 삭제
  const handleDelete = async (
    category: Category
  ) => {
    const confirmed =
      window.confirm(
        `"${category.name}" 카테고리를 삭제할까요?\n\n기존 글에서 사용 중인 카테고리는 삭제하지 않는 것을 권장합니다.`
      );

    if (!confirmed) return;

    const { error } = await supabase
      .from('categories')
      .delete()
      .eq('id', category.id);

    if (error) {
      alert(
        '삭제 실패: ' +
          error.message
      );
      return;
    }

    await loadCategories();
  };

  // 로그아웃
  const handleLogout = async () => {
    await supabase.auth.signOut();

    router.replace(
      '/admin/login'
    );
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-950 flex items-center justify-center">
        <p className="text-white font-bold">
          카테고리를 불러오는 중...
        </p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">

      <div className="max-w-5xl mx-auto p-6">

        {/* 상단 */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-8">

          <div>
            <p className="text-xs text-blue-400 font-bold mb-1">
              HOHAENG ADMIN
            </p>

            <h1 className="text-3xl font-black text-white">
              🗂 카테고리 관리
            </h1>

            <p className="text-sm text-slate-400 mt-2">
              블로그 카테고리의 이름,
              이모지, 순서와 활성 상태를 관리합니다.
            </p>
          </div>

          <div className="flex gap-2">

            <button
              type="button"
              onClick={() =>
                router.push(
                  '/admin/manage'
                )
              }
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 font-bold"
            >
              ← 글 관리
            </button>

            <button
              type="button"
              onClick={handleLogout}
              className="px-4 py-2.5 rounded-xl bg-red-500/10 text-red-400 hover:bg-red-500/20 font-bold"
            >
              로그아웃
            </button>

          </div>
        </div>

        {/* 새 카테고리 추가 */}
        <section className="bg-slate-900 border border-slate-800 rounded-2xl p-5 mb-8">

          <h2 className="text-lg font-black text-white mb-1">
            ➕ 새 카테고리
          </h2>

          <p className="text-xs text-slate-400 mb-5">
            slug는 영어로 입력해주세요.
            예: health, money, study
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

            <div>
              <label className="block text-xs text-slate-400 font-bold mb-1">
                Slug
              </label>

              <input
                type="text"
                value={slug}
                onChange={(e) =>
                  setSlug(
                    e.target.value
                  )
                }
                placeholder="예: health"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs text-slate-400 font-bold mb-1">
                카테고리 이름
              </label>

              <input
                type="text"
                value={name}
                onChange={(e) =>
                  setName(
                    e.target.value
                  )
                }
                placeholder="예: 건강 정보"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs text-slate-400 font-bold mb-1">
                이모지
              </label>

              <input
                type="text"
                value={emoji}
                onChange={(e) =>
                  setEmoji(
                    e.target.value
                  )
                }
                placeholder="예: ❤️"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs text-slate-400 font-bold mb-1">
                표시 순서
              </label>

              <input
                type="number"
                value={sortOrder}
                min={0}
                onChange={(e) =>
                  setSortOrder(
                    Number(
                      e.target.value
                    )
                  )
                }
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500"
              />
            </div>

          </div>

          <button
            type="button"
            onClick={handleAdd}
            disabled={saving}
            className="mt-5 px-6 py-3 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 rounded-xl text-white font-black"
          >
            {saving
              ? '저장 중...'
              : '➕ 카테고리 추가'}
          </button>

        </section>

        {/* 현재 카테고리 */}
        <section>

          <div className="flex items-center justify-between mb-4">

            <h2 className="text-xl font-black text-white">
              현재 카테고리
            </h2>

            <span className="text-sm text-slate-400">
              {categories.length}개
            </span>

          </div>

          <div className="space-y-3">

            {categories.map(
              (category) => {

                const isEditing =
                  editingId ===
                  category.id;

                return (
                  <div
                    key={
                      category.id
                    }
                    className="bg-slate-900 border border-slate-800 rounded-2xl p-5"
                  >

                    {isEditing ? (

                      <div className="space-y-4">

                        <div className="text-xs text-slate-500">
                          slug:{' '}
                          <span className="font-bold text-slate-300">
                            {
                              category.slug
                            }
                          </span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">

                          <input
                            type="text"
                            value={
                              editEmoji
                            }
                            onChange={(
                              e
                            ) =>
                              setEditEmoji(
                                e
                                  .target
                                  .value
                              )
                            }
                            placeholder="이모지"
                            className="bg-slate-950 border border-slate-800 rounded-xl px-4 py-3"
                          />

                          <input
                            type="text"
                            value={
                              editName
                            }
                            onChange={(
                              e
                            ) =>
                              setEditName(
                                e
                                  .target
                                  .value
                              )
                            }
                            placeholder="이름"
                            className="bg-slate-950 border border-slate-800 rounded-xl px-4 py-3"
                          />

                          <input
                            type="number"
                            value={
                              editSortOrder
                            }
                            onChange={(
                              e
                            ) =>
                              setEditSortOrder(
                                Number(
                                  e
                                    .target
                                    .value
                                )
                              )
                            }
                            className="bg-slate-950 border border-slate-800 rounded-xl px-4 py-3"
                          />

                        </div>

                        <div className="flex gap-2">

                          <button
                            onClick={() =>
                              handleUpdate(
                                category
                              )
                            }
                            className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 font-bold"
                          >
                            저장
                          </button>

                          <button
                            onClick={
                              cancelEdit
                            }
                            className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700"
                          >
                            취소
                          </button>

                        </div>

                      </div>

                    ) : (

                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">

                        <div>

                          <div className="flex items-center gap-3">

                            <span className="text-2xl">
                              {category.emoji ||
                                '📁'}
                            </span>

                            <div>
                              <h3 className="font-black text-white">
                                {
                                  category.name
                                }
                              </h3>

                              <p className="text-xs text-slate-500 mt-1">
                                slug:{' '}
                                {
                                  category.slug
                                } · 순서:{' '}
                                {
                                  category.sort_order
                                }
                              </p>
                            </div>

                          </div>

                        </div>

                        <div className="flex flex-wrap gap-2">

                          <button
                            type="button"
                            onClick={() =>
                              toggleActive(
                                category
                              )
                            }
                            className={`px-3 py-2 rounded-lg text-sm font-bold ${
                              category.is_active
                                ? 'bg-emerald-500/10 text-emerald-400'
                                : 'bg-slate-800 text-slate-400'
                            }`}
                          >
                            {category.is_active
                              ? '● 활성'
                              : '○ 비활성'}
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              startEdit(
                                category
                              )
                            }
                            className="px-3 py-2 rounded-lg bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 text-sm font-bold"
                          >
                            ✏️ 수정
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              handleDelete(
                                category
                              )
                            }
                            className="px-3 py-2 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 text-sm font-bold"
                          >
                            🗑 삭제
                          </button>

                        </div>

                      </div>

                    )}

                  </div>
                );
              }
            )}

          </div>

        </section>

      </div>
    </main>
  );
}