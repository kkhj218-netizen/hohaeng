'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/app/lib/supabase';

type Post = {
    id: string;
    title: string;
    slug: string;
    category: string | null;
    subcategory: string | null;
    description: string | null;
};

const categoryNames: Record<string, string> = {
    log: '📝 일지',
    mindset: '🧠 마인드셋',
    guide: '💡 각종 정보',
    analysis: '📊 종목/시황',
};

function getTimestamp(slug: string) {
    const value = Number(slug.split('-').pop());
    return Number.isNaN(value) ? 0 : value;
}

export default function AdminManagePage() {
    const router = useRouter();

    const [posts, setPosts] = useState<Post[]>([]);
    const [loading, setLoading] = useState(true);
    const [deletingId, setDeletingId] = useState<string | null>(null);

    useEffect(() => {
        const initialize = async () => {
            // 로그인 여부 확인
            const {
                data: { session },
            } = await supabase.auth.getSession();

            if (!session) {
                router.replace('/admin/login');
                return;
            }

            await loadPosts();
        };

        initialize();
    }, [router]);

    const loadPosts = async () => {
        setLoading(true);

        const { data, error } = await supabase
            .from('posts')
            .select(
                'id, title, slug, category, subcategory, description'
            );

        if (error) {
            alert('글 목록을 불러오지 못했습니다: ' + error.message);
            setLoading(false);
            return;
        }

        const sortedPosts = ((data || []) as Post[]).sort(
            (a, b) => getTimestamp(b.slug) - getTimestamp(a.slug)
        );

        setPosts(sortedPosts);
        setLoading(false);
    };

    const handleDelete = async (post: Post) => {
        const ok = window.confirm(
            `"${post.title}" 글을 정말 삭제하시겠습니까?\n\n삭제하면 되돌릴 수 없습니다.`
        );

        if (!ok) return;

        try {
            setDeletingId(post.id);

            const { error } = await supabase
                .from('posts')
                .delete()
                .eq('id', post.id);

            if (error) {
                throw error;
            }

            setPosts((current) =>
                current.filter((item) => item.id !== post.id)
            );

            alert('글이 삭제되었습니다.');
        } catch (error: any) {
            alert('삭제 실패: ' + error.message);
        } finally {
            setDeletingId(null);
        }
    };

    const handleLogout = async () => {
        await supabase.auth.signOut();
        router.replace('/admin/login');
    };

    return (
        <main className="min-h-screen bg-slate-950 text-slate-100">
            <div className="max-w-5xl mx-auto px-5 py-10">

                {/* 상단 */}
                <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
                    <div>
                        <p className="text-blue-400 text-sm font-bold mb-1">
                            HOHAENG ADMIN
                        </p>

                        <h1 className="text-3xl font-black">
                            📚 글 관리
                        </h1>

                        <p className="text-slate-400 text-sm mt-2">
                            발행한 글을 확인하고 관리할 수 있습니다.
                        </p>
                    </div>

                    <div className="flex gap-2">
                        <Link
                            href="/admin/write"
                            className="bg-blue-600 hover:bg-blue-500 px-4 py-2.5 rounded-xl font-bold text-sm"
                        >
                            ✍️ 새 글 작성
                        </Link>

                        <button
                            type="button"
                            onClick={handleLogout}
                            className="bg-slate-800 hover:bg-slate-700 px-4 py-2.5 rounded-xl font-bold text-sm"
                        >
                            로그아웃
                        </button>
                    </div>
                </div>

                {/* 글 수 */}
                <div className="bg-slate-900 border border-slate-800 rounded-2xl px-5 py-4 mb-5">
                    <span className="text-slate-400 text-sm">
                        전체 글
                    </span>

                    <strong className="ml-2 text-xl text-white">
                        {posts.length}
                    </strong>
                </div>

                {/* 목록 */}
                {loading ? (
                    <div className="text-center py-20 text-slate-400">
                        글을 불러오는 중...
                    </div>
                ) : posts.length === 0 ? (
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center">
                        <p className="text-slate-400 mb-5">
                            아직 작성된 글이 없습니다.
                        </p>

                        <Link
                            href="/admin/write"
                            className="text-blue-400 font-bold"
                        >
                            첫 글 작성하기 →
                        </Link>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {posts.map((post) => (
                            <div
                                key={post.id}
                                className="bg-slate-900 border border-slate-800 rounded-2xl p-5"
                            >
                                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">

                                    <div className="min-w-0">
                                        <div className="flex flex-wrap gap-2 mb-2">
                                            <span className="text-xs font-bold bg-blue-500/10 text-blue-400 px-2.5 py-1 rounded-lg">
                                                {categoryNames[
                                                    post.category || ''
                                                ] ||
                                                    post.category ||
                                                    '기타'}
                                            </span>

                                            {post.subcategory && (
                                                <span className="text-xs bg-slate-800 text-slate-300 px-2.5 py-1 rounded-lg">
                                                    {post.subcategory}
                                                </span>
                                            )}
                                        </div>

                                        <h2 className="text-lg font-black text-white truncate">
                                            {post.title}
                                        </h2>

                                        {post.description && (
                                            <p className="text-sm text-slate-400 mt-1 line-clamp-1">
                                                {post.description}
                                            </p>
                                        )}

                                        <p className="text-xs text-slate-600 mt-2 truncate">
                                            /blog/{post.slug}
                                        </p>
                                    </div>

                                    <div className="flex gap-2 shrink-0">

                                        <Link
                                            href={`/blog/${post.slug}`}
                                            target="_blank"
                                            className="px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-sm font-bold"
                                        >
                                            보기
                                        </Link>
                                        <Link
                                            href={`/admin/edit/${post.id}`}
                                            className="px-3 py-2 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 text-sm font-bold"
                                        >
                                            ✏️ 수정
                                        </Link>
                                        <button
                                            type="button"
                                            onClick={() => handleDelete(post)}
                                            disabled={deletingId === post.id}
                                            className="px-3 py-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 text-sm font-bold disabled:opacity-50"
                                        >
                                            {deletingId === post.id
                                                ? '삭제 중...'
                                                : '삭제'}
                                        </button>

                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

            </div>
        </main>
    );
}