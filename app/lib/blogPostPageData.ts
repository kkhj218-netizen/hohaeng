import "server-only";

import { cache } from "react";
import { unstable_cache } from "next/cache";

import { supabase } from "@/app/lib/supabase";

export type BlogPostPagePost = {
  id: string;
  title: string;
  slug: string;
  content: string | null;
  category: string | null;
  subcategory: string | null;
  description: string | null;
  created_at: string | null;
  published_at: string | null;
  updated_at: string | null;
  status: "draft" | "published" | null;
  seo_title: string | null;
  meta_description: string | null;
  og_image: string | null;
};

export type BlogCategory = {
  slug: string;
  name: string;
  emoji: string | null;
  is_active: boolean;
};

export type BlogSubcategory = {
  category_slug: string;
  slug: string;
  name: string;
  emoji: string | null;
  is_active: boolean;
};

export type AdjacentBlogPost = {
  id: string;
  title: string;
  slug: string;
  created_at: string | null;
};

export type RelatedBlogPost = {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  og_image: string | null;
  category: string | null;
  subcategory: string | null;
  created_at: string | null;
};

export type RecommendedBlogPost = RelatedBlogPost & {
  reason: string;
};

export type BlogDeferredData = {
  previousPost: AdjacentBlogPost | null;
  nextPost: AdjacentBlogPost | null;
  relatedPosts: RecommendedBlogPost[];
};

const BLOG_POST_REVALIDATE_SECONDS = 300;
const BLOG_TAXONOMY_REVALIDATE_SECONDS = 3600;

const loadPublishedBlogPost = unstable_cache(
  async (slug: string): Promise<BlogPostPagePost | null> => {
    const { data, error } = await supabase
      .from("posts")
      .select(
        "id, title, slug, content, category, subcategory, description, created_at, published_at, updated_at, status, seo_title, meta_description, og_image",
      )
      .eq("slug", slug)
      .eq("status", "published")
      .maybeSingle();

    if (error) {
      console.error("Supabase 글 상세 불러오기 오류:", error);
      return null;
    }

    return (data as BlogPostPagePost | null) ?? null;
  },
  ["hohaeng-published-blog-post-v1"],
  { revalidate: BLOG_POST_REVALIDATE_SECONDS },
);

export const getPublishedBlogPost = cache(loadPublishedBlogPost);

const loadBlogCategory = unstable_cache(
  async (slug: string): Promise<BlogCategory | null> => {
    const { data, error } = await supabase
      .from("categories")
      .select("slug, name, emoji, is_active")
      .eq("slug", slug)
      .maybeSingle();

    if (error) {
      console.error("카테고리 불러오기 오류:", error);
      return null;
    }

    return (data as BlogCategory | null) ?? null;
  },
  ["hohaeng-blog-category-v1"],
  { revalidate: BLOG_TAXONOMY_REVALIDATE_SECONDS },
);

export const getBlogCategory = cache(loadBlogCategory);

const loadBlogSubcategory = unstable_cache(
  async (categorySlug: string, subcategorySlug: string): Promise<BlogSubcategory | null> => {
    const { data, error } = await supabase
      .from("subcategories")
      .select("category_slug, slug, name, emoji, is_active")
      .eq("category_slug", categorySlug)
      .eq("slug", subcategorySlug)
      .maybeSingle();

    if (error) {
      console.error("세부주제 불러오기 오류:", error);
      return null;
    }

    return (data as BlogSubcategory | null) ?? null;
  },
  ["hohaeng-blog-subcategory-v1"],
  { revalidate: BLOG_TAXONOMY_REVALIDATE_SECONDS },
);

export const getBlogSubcategory = cache(loadBlogSubcategory);

const loadDeferredBlogData = unstable_cache(
  async (
    postId: string,
    createdAt: string | null,
    category: string | null,
    subcategory: string | null,
  ): Promise<BlogDeferredData> => {
    const relatedPostSelect =
      "id, title, slug, description, og_image, category, subcategory, created_at";

    const previousRequest = createdAt
      ? supabase
          .from("posts")
          .select("id, title, slug, created_at")
          .eq("status", "published")
          .lt("created_at", createdAt)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle()
      : Promise.resolve({ data: null, error: null });

    const nextRequest = createdAt
      ? supabase
          .from("posts")
          .select("id, title, slug, created_at")
          .eq("status", "published")
          .gt("created_at", createdAt)
          .order("created_at", { ascending: true })
          .limit(1)
          .maybeSingle()
      : Promise.resolve({ data: null, error: null });

    const sameCategoryRequest = category
      ? supabase
          .from("posts")
          .select(relatedPostSelect)
          .eq("status", "published")
          .eq("category", category)
          .neq("id", postId)
          .order("created_at", { ascending: false })
          .limit(12)
      : Promise.resolve({ data: [] as RelatedBlogPost[], error: null });

    const latestRequest = supabase
      .from("posts")
      .select(relatedPostSelect)
      .eq("status", "published")
      .neq("id", postId)
      .order("created_at", { ascending: false })
      .limit(12);

    const [previousResult, nextResult, sameCategoryResult, latestResult] =
      await Promise.all([
        previousRequest,
        nextRequest,
        sameCategoryRequest,
        latestRequest,
      ]);

    if (previousResult.error) {
      console.error("이전 글 불러오기 오류:", previousResult.error);
    }

    if (nextResult.error) {
      console.error("다음 글 불러오기 오류:", nextResult.error);
    }

    if (sameCategoryResult.error) {
      console.error("같은 카테고리 관련 글 불러오기 오류:", sameCategoryResult.error);
    }

    if (latestResult.error) {
      console.error("최신 관련 글 불러오기 오류:", latestResult.error);
    }

    const relatedPosts: RecommendedBlogPost[] = [];
    const seen = new Set<string>([postId]);

    const append = (items: RelatedBlogPost[] | null, reason: string) => {
      for (const item of items || []) {
        if (relatedPosts.length >= 3 || seen.has(item.id)) continue;
        seen.add(item.id);
        relatedPosts.push({ ...item, reason });
      }
    };

    const sameCategoryPosts = (sameCategoryResult.data || []) as RelatedBlogPost[];

    if (subcategory) {
      append(
        sameCategoryPosts.filter((item) => item.subcategory === subcategory),
        "같은 세부주제",
      );
    }

    append(sameCategoryPosts, "같은 카테고리");
    append((latestResult.data || []) as RelatedBlogPost[], "최신 글");

    return {
      previousPost: (previousResult.data as AdjacentBlogPost | null) ?? null,
      nextPost: (nextResult.data as AdjacentBlogPost | null) ?? null,
      relatedPosts,
    };
  },
  ["hohaeng-blog-deferred-data-v1"],
  { revalidate: BLOG_POST_REVALIDATE_SECONDS },
);

export const getDeferredBlogData = cache(loadDeferredBlogData);
