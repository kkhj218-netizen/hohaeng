import { supabase } from "@/app/lib/supabase";

type SupabasePostRow = {
  title: string | null;
  slug: string;
  view_count: number | null;
  category: string | null;
  created_at: string | null;
};

export type SupabaseAnalyticsData = {
  connected: boolean;
  totalPosts: number;
  totalViews: number;
  categoryCount: number;
  recentPosts: SupabasePostRow[];
  popularPosts: SupabasePostRow[];
};

export async function getSupabaseAnalytics(): Promise<SupabaseAnalyticsData> {
  const { data, error } = await supabase
    .from("posts")
    .select("title, slug, view_count, category, created_at")
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(`Supabase 게시글 조회 실패: ${error.message}`);
  }

  const posts = (data ?? []) as SupabasePostRow[];
  const totalViews = posts.reduce(
    (sum, post) => sum + (post.view_count ?? 0),
    0,
  );
  const categoryCount = new Set(
    posts
      .map((post) => post.category)
      .filter((category): category is string => Boolean(category)),
  ).size;

  return {
    connected: true,
    totalPosts: posts.length,
    totalViews,
    categoryCount,
    recentPosts: posts.slice(0, 5),
    popularPosts: [...posts]
      .sort((a, b) => (b.view_count ?? 0) - (a.view_count ?? 0))
      .slice(0, 5),
  };
}