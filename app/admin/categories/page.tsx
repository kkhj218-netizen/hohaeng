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

type Subcategory = {
  id: number;
  category_slug: string;
  slug: string;
  name: string;
  emoji: string | null;
  sort_order: number;
  is_active: boolean;
};

export default function AdminCategoriesPage() {
  const router = useRouter();

  const [categories, setCategories] = useState<Category[]>([]);
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // =========================================================
  // 새 카테고리
  // =========================================================

  const [slug, setSlug] = useState('');
  const [name, setName] = useState('');
  const [emoji, setEmoji] = useState('');
  const [sortOrder, setSortOrder] = useState(1);

  // 수정 중인 카테고리
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState('');
  const [editEmoji, setEditEmoji] = useState('');
  const [editSortOrder, setEditSortOrder] = useState(1);

  // =========================================================
  // 새 세부주제
  // =========================================================

  const [subcategoryCategorySlug, setSubcategoryCategorySlug] =
    useState('');
  const [subcategorySlug, setSubcategorySlug] = useState('');
  const [subcategoryName, setSubcategoryName] = useState('');
  const [subcategoryEmoji, setSubcategoryEmoji] = useState('');
  const [subcategorySortOrder, setSubcategorySortOrder] = useState(1);

  // 수정 중인 세부주제
  const [editingSubcategoryId, setEditingSubcategoryId] = useState<
    number | null
  >(null);
  const [editSubcategoryName, setEditSubcategoryName] = useState('');
  const [editSubcategoryEmoji, setEditSubcategoryEmoji] = useState('');
  const [editSubcategorySortOrder, setEditSubcategorySortOrder] =
    useState(1);

  // =========================================================
  // 데이터 불러오기
  // =========================================================

  const loadCategories = async () => {
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .order('sort_order', {
        ascending: true,
      });

    if (error) {
      throw new Error(
        '카테고리를 불러오지 못했습니다: ' + error.message
      );
    }

    const loadedCategories = (data || []) as Category[];

    setCategories(loadedCategories);

    setSubcategoryCategorySlug((currentValue) => {
      if (
        currentValue &&
        loadedCategories.some((category) => category.slug === currentValue)
      ) {
        return currentValue;
      }

      return loadedCategories[0]?.slug || '';
    });

    return loadedCategories;
  };

  const loadSubcategories = async () => {
    const { data, error } = await supabase
      .from('subcategories')
      .select('*')
      .order('category_slug', {
        ascending: true,
      })
      .order('sort_order', {
        ascending: true,
      });

    if (error) {
      throw new Error(
        '세부주제를 불러오지 못했습니다: ' + error.message
      );
    }

    setSubcategories((data || []) as Subcategory[]);
  };

  const reloadAll = async () => {
    await Promise.all([loadCategories(), loadSubcategories()]);
  };

  useEffect(() => {
    const initialize = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        router.replace('/admin/login');
        return;
      }

      try {
        await reloadAll();
      } catch (error: any) {
        alert(error.message);
      } finally {
        setLoading(false);
      }
    };

    initialize();
  }, [router]);

  // =========================================================
  // 카테고리 관리
  // =========================================================

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

      const { error } = await supabase.from('categories').insert([
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
      setSubcategoryCategorySlug(cleanSlug);

      await loadCategories();

      alert('카테고리가 추가되었습니다. ✅');
    } catch (error: any) {
      alert('카테고리 추가 실패: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (category: Category) => {
    setEditingId(category.id);
    setEditName(category.name);
    setEditEmoji(category.emoji || '');
    setEditSortOrder(category.sort_order);
  };

  const cancelEdit = () => {
    setEditingId(null);
  };

  const handleUpdate = async (category: Category) => {
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
          emoji: editEmoji.trim() || null,
          sort_order: editSortOrder,
        })
        .eq('id', category.id);

      if (error) {
        throw error;
      }

      setEditingId(null);
      await loadCategories();

      alert('카테고리가 수정되었습니다. ✅');
    } catch (error: any) {
      alert('카테고리 수정 실패: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (category: Category) => {
    try {
      setSaving(true);

      const { error } = await supabase
        .from('categories')
        .update({
          is_active: !category.is_active,
        })
        .eq('id', category.id);

      if (error) {
        throw error;
      }

      await loadCategories();
    } catch (error: any) {
      alert('상태 변경 실패: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (category: Category) => {
    const linkedSubcategories = subcategories.filter(
      (subcategory) => subcategory.category_slug === category.slug
    );

    if (linkedSubcategories.length > 0) {
      alert(
        `이 카테고리에는 세부주제 ${linkedSubcategories.length}개가 연결되어 있습니다.\n\n먼저 연결된 세부주제를 삭제한 뒤 카테고리를 삭제해주세요.`
      );
      return;
    }

    const confirmed = window.confirm(
      `"${category.name}" 카테고리를 삭제할까요?\n\n기존 글에서 사용 중인 카테고리는 삭제하지 않는 것을 권장합니다.`
    );

    if (!confirmed) {
      return;
    }

    try {
      setSaving(true);

      const { error } = await supabase
        .from('categories')
        .delete()
        .eq('id', category.id);

      if (error) {
        throw error;
      }

      await loadCategories();
    } catch (error: any) {
      alert('카테고리 삭제 실패: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  // =========================================================
  // 세부주제 관리
  // =========================================================

  const handleAddSubcategory = async () => {
    if (!subcategoryCategorySlug) {
      alert('상위 카테고리를 선택해주세요.');
      return;
    }

    if (!subcategorySlug.trim()) {
      alert('세부주제 slug를 입력해주세요.');
      return;
    }

    if (!subcategoryName.trim()) {
      alert('세부주제 이름을 입력해주세요.');
      return;
    }

    const cleanSlug = subcategorySlug
      .trim()
      .toLowerCase()
      .replace(/\s+/g, '-');

    try {
      setSaving(true);

      const { error } = await supabase.from('subcategories').insert([
        {
          category_slug: subcategoryCategorySlug,
          slug: cleanSlug,
          name: subcategoryName.trim(),
          emoji: subcategoryEmoji.trim() || null,
          sort_order: subcategorySortOrder,
          is_active: true,
        },
      ]);

      if (error) {
        throw error;
      }

      setSubcategorySlug('');
      setSubcategoryName('');
      setSubcategoryEmoji('');

      await loadSubcategories();

      alert('세부주제가 추가되었습니다. ✅');
    } catch (error: any) {
      alert('세부주제 추가 실패: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  const startEditSubcategory = (subcategory: Subcategory) => {
    setEditingSubcategoryId(subcategory.id);
    setEditSubcategoryName(subcategory.name);
    setEditSubcategoryEmoji(subcategory.emoji || '');
    setEditSubcategorySortOrder(subcategory.sort_order);
  };

  const cancelEditSubcategory = () => {
    setEditingSubcategoryId(null);
  };

  const handleUpdateSubcategory = async (subcategory: Subcategory) => {
    if (!editSubcategoryName.trim()) {
      alert('세부주제 이름을 입력해주세요.');
      return;
    }

    try {
      setSaving(true);

      const { error } = await supabase
        .from('subcategories')
        .update({
          name: editSubcategoryName.trim(),
          emoji: editSubcategoryEmoji.trim() || null,
          sort_order: editSubcategorySortOrder,
        })
        .eq('id', subcategory.id);

      if (error) {
        throw error;
      }

      setEditingSubcategoryId(null);
      await loadSubcategories();

      alert('세부주제가 수정되었습니다. ✅');
    } catch (error: any) {
      alert('세부주제 수정 실패: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  const toggleSubcategoryActive = async (subcategory: Subcategory) => {
    try {
      setSaving(true);

      const { error } = await supabase
        .from('subcategories')
        .update({
          is_active: !subcategory.is_active,
        })
        .eq('id', subcategory.id);

      if (error) {
        throw error;
      }

      await loadSubcategories();
    } catch (error: any) {
      alert('세부주제 상태 변경 실패: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteSubcategory = async (subcategory: Subcategory) => {
    try {
      setSaving(true);

      const {
        count: usageCount,
        error: usageError,
      } = await supabase
        .from('posts')
        .select('id', {
          count: 'exact',
          head: true,
        })
        .eq('category', subcategory.category_slug)
        .eq('subcategory', subcategory.slug);

      if (usageError) {
        throw usageError;
      }

      if ((usageCount || 0) > 0) {
        alert(
          `이 세부주제는 현재 글 ${(usageCount || 0).toLocaleString()}개에서 사용 중입니다.\n\n삭제하면 기존 글과 연결이 끊기므로 삭제 대신 비활성으로 바꿔주세요.`
        );
        return;
      }

      const confirmed = window.confirm(
        `"${subcategory.name}" 세부주제를 삭제할까요?`
      );

      if (!confirmed) {
        return;
      }

      const { error } = await supabase
        .from('subcategories')
        .delete()
        .eq('id', subcategory.id);

      if (error) {
        throw error;
      }

      await loadSubcategories();
    } catch (error: any) {
      alert('세부주제 삭제 실패: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  // =========================================================
  // 기타
  // =========================================================

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.replace('/admin/login');
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-950 flex items-center justify-center">
        <p className="text-white font-bold">
          카테고리와 세부주제를 불러오는 중...
        </p>
      </main>
    );
  }

  const orphanSubcategories = subcategories.filter(
    (subcategory) =>
      !categories.some(
        (category) => category.slug === subcategory.category_slug
      )
  );

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
              🗂 카테고리·세부주제 관리
            </h1>

            <p className="text-sm text-slate-400 mt-2">
              블로그 카테고리와 카테고리별 세부주제를 관리합니다.
            </p>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => router.push('/admin/manage')}
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

        {/* =====================================================
            카테고리 관리
        ===================================================== */}

        <div className="mb-10">
          <div className="mb-4">
            <p className="text-xs font-bold text-blue-400 mb-1">
              STEP 1
            </p>
            <h2 className="text-2xl font-black text-white">
              📁 카테고리 관리
            </h2>
          </div>

          {/* 새 카테고리 추가 */}
          <section className="bg-slate-900 border border-slate-800 rounded-2xl p-5 mb-8">
            <h3 className="text-lg font-black text-white mb-1">
              ➕ 새 카테고리
            </h3>

            <p className="text-xs text-slate-400 mb-5">
              slug는 영어로 입력해주세요. 예: health, money, study
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-slate-400 font-bold mb-1">
                  Slug
                </label>

                <input
                  type="text"
                  value={slug}
                  onChange={(event) => setSlug(event.target.value)}
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
                  onChange={(event) => setName(event.target.value)}
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
                  onChange={(event) => setEmoji(event.target.value)}
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
                  onChange={(event) =>
                    setSortOrder(Number(event.target.value))
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
              {saving ? '저장 중...' : '➕ 카테고리 추가'}
            </button>
          </section>

          {/* 현재 카테고리 */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-black text-white">
                현재 카테고리
              </h3>

              <span className="text-sm text-slate-400">
                {categories.length}개
              </span>
            </div>

            <div className="space-y-3">
              {categories.length === 0 ? (
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 text-sm text-slate-400">
                  등록된 카테고리가 없습니다.
                </div>
              ) : (
                categories.map((category) => {
                  const isEditing = editingId === category.id;
                  const childCount = subcategories.filter(
                    (subcategory) =>
                      subcategory.category_slug === category.slug
                  ).length;

                  return (
                    <div
                      key={category.id}
                      className="bg-slate-900 border border-slate-800 rounded-2xl p-5"
                    >
                      {isEditing ? (
                        <div className="space-y-4">
                          <div className="text-xs text-slate-500">
                            slug:{' '}
                            <span className="font-bold text-slate-300">
                              {category.slug}
                            </span>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <input
                              type="text"
                              value={editEmoji}
                              onChange={(event) =>
                                setEditEmoji(event.target.value)
                              }
                              placeholder="이모지"
                              className="bg-slate-950 border border-slate-800 rounded-xl px-4 py-3"
                            />

                            <input
                              type="text"
                              value={editName}
                              onChange={(event) =>
                                setEditName(event.target.value)
                              }
                              placeholder="이름"
                              className="bg-slate-950 border border-slate-800 rounded-xl px-4 py-3"
                            />

                            <input
                              type="number"
                              value={editSortOrder}
                              min={0}
                              onChange={(event) =>
                                setEditSortOrder(Number(event.target.value))
                              }
                              className="bg-slate-950 border border-slate-800 rounded-xl px-4 py-3"
                            />
                          </div>

                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => handleUpdate(category)}
                              disabled={saving}
                              className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-50 font-bold"
                            >
                              저장
                            </button>

                            <button
                              type="button"
                              onClick={cancelEdit}
                              disabled={saving}
                              className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-50"
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
                                {category.emoji || '📁'}
                              </span>

                              <div>
                                <h4 className="font-black text-white">
                                  {category.name}
                                </h4>

                                <p className="text-xs text-slate-500 mt-1">
                                  slug: {category.slug} · 순서:{' '}
                                  {category.sort_order} · 세부주제:{' '}
                                  {childCount}개
                                </p>
                              </div>
                            </div>
                          </div>

                          <div className="flex flex-wrap gap-2">
                            <button
                              type="button"
                              onClick={() => toggleActive(category)}
                              disabled={saving}
                              className={`px-3 py-2 rounded-lg text-sm font-bold disabled:opacity-50 ${
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
                              onClick={() => startEdit(category)}
                              disabled={saving}
                              className="px-3 py-2 rounded-lg bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 disabled:opacity-50 text-sm font-bold"
                            >
                              ✏️ 수정
                            </button>

                            <button
                              type="button"
                              onClick={() => handleDelete(category)}
                              disabled={saving}
                              className="px-3 py-2 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 disabled:opacity-50 text-sm font-bold"
                            >
                              🗑 삭제
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </section>
        </div>

        <div className="h-px bg-slate-800 mb-10" />

        {/* =====================================================
            세부주제 관리
        ===================================================== */}

        <div>
          <div className="mb-4">
            <p className="text-xs font-bold text-violet-400 mb-1">
              STEP 2
            </p>

            <h2 className="text-2xl font-black text-white">
              🧩 세부주제 관리
            </h2>

            <p className="text-sm text-slate-400 mt-2">
              카테고리를 선택한 뒤 그 안에서 사용할 세부주제를
              등록하세요.
            </p>
          </div>

          {/* 새 세부주제 추가 */}
          <section className="bg-slate-900 border border-slate-800 rounded-2xl p-5 mb-8">
            <h3 className="text-lg font-black text-white mb-1">
              ➕ 새 세부주제
            </h3>

            <p className="text-xs text-slate-400 mb-5">
              예: 일상 카테고리 안에 routine, travel, family 등을
              만들 수 있습니다.
            </p>

            {categories.length === 0 ? (
              <div className="rounded-xl border border-amber-800 bg-amber-950/40 px-4 py-3 text-sm text-amber-300">
                먼저 위에서 카테고리를 1개 이상 만들어주세요.
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-slate-400 font-bold mb-1">
                      상위 카테고리
                    </label>

                    <select
                      value={subcategoryCategorySlug}
                      onChange={(event) =>
                        setSubcategoryCategorySlug(event.target.value)
                      }
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 focus:outline-none focus:border-violet-500"
                    >
                      {categories.map((category) => (
                        <option key={category.id} value={category.slug}>
                          {category.emoji || '📁'} {category.name}
                          {!category.is_active ? ' (비활성)' : ''}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs text-slate-400 font-bold mb-1">
                      세부주제 Slug
                    </label>

                    <input
                      type="text"
                      value={subcategorySlug}
                      onChange={(event) =>
                        setSubcategorySlug(event.target.value)
                      }
                      placeholder="예: routine"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 focus:outline-none focus:border-violet-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-slate-400 font-bold mb-1">
                      세부주제 이름
                    </label>

                    <input
                      type="text"
                      value={subcategoryName}
                      onChange={(event) =>
                        setSubcategoryName(event.target.value)
                      }
                      placeholder="예: 일상 기록"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 focus:outline-none focus:border-violet-500"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-slate-400 font-bold mb-1">
                        이모지
                      </label>

                      <input
                        type="text"
                        value={subcategoryEmoji}
                        onChange={(event) =>
                          setSubcategoryEmoji(event.target.value)
                        }
                        placeholder="예: ☕"
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 focus:outline-none focus:border-violet-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs text-slate-400 font-bold mb-1">
                        표시 순서
                      </label>

                      <input
                        type="number"
                        value={subcategorySortOrder}
                        min={0}
                        onChange={(event) =>
                          setSubcategorySortOrder(
                            Number(event.target.value)
                          )
                        }
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 focus:outline-none focus:border-violet-500"
                      />
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleAddSubcategory}
                  disabled={saving || !subcategoryCategorySlug}
                  className="mt-5 px-6 py-3 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 rounded-xl text-white font-black"
                >
                  {saving ? '저장 중...' : '➕ 세부주제 추가'}
                </button>
              </>
            )}
          </section>

          {/* 현재 세부주제 */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-black text-white">
                현재 세부주제
              </h3>

              <span className="text-sm text-slate-400">
                {subcategories.length}개
              </span>
            </div>

            <div className="space-y-5">
              {categories.map((category) => {
                const categorySubcategories = subcategories.filter(
                  (subcategory) =>
                    subcategory.category_slug === category.slug
                );

                return (
                  <div
                    key={category.id}
                    className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 bg-slate-900/80 px-5 py-4">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">
                          {category.emoji || '📁'}
                        </span>

                        <div>
                          <h4 className="font-black text-white">
                            {category.name}
                          </h4>

                          <p className="text-xs text-slate-500 mt-1">
                            {category.slug}
                            {!category.is_active ? ' · 비활성 카테고리' : ''}
                          </p>
                        </div>
                      </div>

                      <span className="rounded-full bg-slate-800 px-3 py-1 text-xs font-bold text-slate-300">
                        {categorySubcategories.length}개
                      </span>
                    </div>

                    <div className="p-5">
                      {categorySubcategories.length === 0 ? (
                        <p className="text-sm text-slate-500">
                          이 카테고리에는 아직 세부주제가 없습니다.
                        </p>
                      ) : (
                        <div className="space-y-3">
                          {categorySubcategories.map((subcategory) => {
                            const isEditing =
                              editingSubcategoryId === subcategory.id;

                            return (
                              <div
                                key={subcategory.id}
                                className="rounded-xl border border-slate-800 bg-slate-950/70 p-4"
                              >
                                {isEditing ? (
                                  <div className="space-y-4">
                                    <div className="text-xs text-slate-500">
                                      상위 카테고리:{' '}
                                      <span className="font-bold text-slate-300">
                                        {category.name}
                                      </span>{' '}
                                      · slug:{' '}
                                      <span className="font-bold text-slate-300">
                                        {subcategory.slug}
                                      </span>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                      <input
                                        type="text"
                                        value={editSubcategoryEmoji}
                                        onChange={(event) =>
                                          setEditSubcategoryEmoji(
                                            event.target.value
                                          )
                                        }
                                        placeholder="이모지"
                                        className="bg-slate-900 border border-slate-800 rounded-xl px-4 py-3"
                                      />

                                      <input
                                        type="text"
                                        value={editSubcategoryName}
                                        onChange={(event) =>
                                          setEditSubcategoryName(
                                            event.target.value
                                          )
                                        }
                                        placeholder="세부주제 이름"
                                        className="bg-slate-900 border border-slate-800 rounded-xl px-4 py-3"
                                      />

                                      <input
                                        type="number"
                                        value={editSubcategorySortOrder}
                                        min={0}
                                        onChange={(event) =>
                                          setEditSubcategorySortOrder(
                                            Number(event.target.value)
                                          )
                                        }
                                        className="bg-slate-900 border border-slate-800 rounded-xl px-4 py-3"
                                      />
                                    </div>

                                    <div className="flex gap-2">
                                      <button
                                        type="button"
                                        onClick={() =>
                                          handleUpdateSubcategory(
                                            subcategory
                                          )
                                        }
                                        disabled={saving}
                                        className="px-4 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 disabled:opacity-50 font-bold"
                                      >
                                        저장
                                      </button>

                                      <button
                                        type="button"
                                        onClick={cancelEditSubcategory}
                                        disabled={saving}
                                        className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-50"
                                      >
                                        취소
                                      </button>
                                    </div>
                                  </div>
                                ) : (
                                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                    <div className="flex items-center gap-3">
                                      <span className="text-xl">
                                        {subcategory.emoji || '•'}
                                      </span>

                                      <div>
                                        <h5 className="font-black text-white">
                                          {subcategory.name}
                                        </h5>

                                        <p className="text-xs text-slate-500 mt-1">
                                          slug: {subcategory.slug} · 순서:{' '}
                                          {subcategory.sort_order}
                                        </p>
                                      </div>
                                    </div>

                                    <div className="flex flex-wrap gap-2">
                                      <button
                                        type="button"
                                        onClick={() =>
                                          toggleSubcategoryActive(
                                            subcategory
                                          )
                                        }
                                        disabled={saving}
                                        className={`px-3 py-2 rounded-lg text-sm font-bold disabled:opacity-50 ${
                                          subcategory.is_active
                                            ? 'bg-emerald-500/10 text-emerald-400'
                                            : 'bg-slate-800 text-slate-400'
                                        }`}
                                      >
                                        {subcategory.is_active
                                          ? '● 활성'
                                          : '○ 비활성'}
                                      </button>

                                      <button
                                        type="button"
                                        onClick={() =>
                                          startEditSubcategory(subcategory)
                                        }
                                        disabled={saving}
                                        className="px-3 py-2 rounded-lg bg-violet-500/10 text-violet-400 hover:bg-violet-500/20 disabled:opacity-50 text-sm font-bold"
                                      >
                                        ✏️ 수정
                                      </button>

                                      <button
                                        type="button"
                                        onClick={() =>
                                          handleDeleteSubcategory(
                                            subcategory
                                          )
                                        }
                                        disabled={saving}
                                        className="px-3 py-2 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 disabled:opacity-50 text-sm font-bold"
                                      >
                                        🗑 삭제
                                      </button>
                                    </div>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}

              {orphanSubcategories.length > 0 && (
                <div className="bg-amber-950/30 border border-amber-800 rounded-2xl overflow-hidden">
                  <div className="border-b border-amber-800 px-5 py-4">
                    <h4 className="font-black text-amber-300">
                      ⚠️ 연결되지 않은 세부주제
                    </h4>

                    <p className="text-xs text-amber-400/80 mt-1">
                      상위 카테고리가 존재하지 않는 세부주제입니다.
                    </p>
                  </div>

                  <div className="p-5 space-y-3">
                    {orphanSubcategories.map((subcategory) => (
                      <div
                        key={subcategory.id}
                        className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-amber-900 bg-slate-950/60 p-4"
                      >
                        <div>
                          <p className="font-bold text-white">
                            {subcategory.emoji || '•'} {subcategory.name}
                          </p>

                          <p className="text-xs text-slate-500 mt-1">
                            category_slug: {subcategory.category_slug} · slug:{' '}
                            {subcategory.slug}
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={() =>
                            handleDeleteSubcategory(subcategory)
                          }
                          disabled={saving}
                          className="px-3 py-2 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 disabled:opacity-50 text-sm font-bold"
                        >
                          🗑 삭제
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}