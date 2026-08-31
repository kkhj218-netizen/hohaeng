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

const SEO_PRESERVE_COPY_CATEGORY_NAMES = new Set([
  "투자 이론",
  "시황 및 시장",
]);

function escapeHtmlAttribute(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function normalizeSeoDescription(value: string | null | undefined) {
  const normalized = value?.replace(/\s+/g, " ").trim() || "";

  if (!normalized) return null;
  if (normalized.length <= 155) return normalized;

  return `${normalized.slice(0, 152).trimEnd()}...`;
}

/**
 * 투자 이론·시황 글은 작성자의 문장을 바꾸지 않고 SEO 구조만 정리한다.
 *
 * - 페이지 제목이 이미 H1이므로 본문 안의 H1은 H2로만 변경
 * - 본문 이미지의 빈 alt를 보완하고 지연 로딩 적용
 * - 넓은 표는 모바일에서 가로 스크롤 가능하게 감쌈
 *
 * DB 원문은 수정하지 않고 공개 페이지에 렌더링할 때만 적용한다.
 */
function optimizeInvestmentPostHtml(
  html: string | null,
  postTitle: string,
) {
  if (!html) return html;

  const imageAlt = escapeHtmlAttribute(`${postTitle} 관련 이미지`);

  return html
    .replace(/<h1(\b[^>]*)>/gi, "<h2$1>")
    .replace(/<\/h1>/gi, "</h2>")
    .replace(/<img\b([^>]*)>/gi, (match, rawAttributes: string) => {
      let attributes = rawAttributes;

      if (!/\balt\s*=/.test(attributes)) {
        attributes += ` alt="${imageAlt}"`;
      } else {
        attributes = attributes.replace(
          /\balt\s*=\s*(["'])\s*\1/i,
          `alt="${imageAlt}"`,
        );
      }

      if (!/\bloading\s*=/.test(attributes)) {
        attributes += ' loading="lazy"';
      }

      if (!/\bdecoding\s*=/.test(attributes)) {
        attributes += ' decoding="async"';
      }

      return `<img${attributes}>`;
    })
    .replace(
      /<table\b([^>]*)>/gi,
      '<div style="max-width:100%;overflow-x:auto;-webkit-overflow-scrolling:touch"><table$1>',
    )
    .replace(/<\/table>/gi, "</table></div>");
}

async function applyPreserveCopySeoOptimization(
  post: BlogPostPagePost | null,
): Promise<BlogPostPagePost | null> {
  if (!post?.category) return post;

  const { data: categoryData, error: categoryError } = await supabase
    .from("categories")
    .select("name")
    .eq("slug", post.category)
    .maybeSingle();

  if (categoryError) {
    console.error("SEO 대상 카테고리 확인 오류:", categoryError);
    return post;
  }

  const categoryName = categoryData?.name?.trim() || "";

  if (!SEO_PRESERVE_COPY_CATEGORY_NAMES.has(categoryName)) {
    return post;
  }

  return {
    ...post,
    content: optimizeInvestmentPostHtml(post.content, post.title),
    meta_description:
      normalizeSeoDescription(post.meta_description || post.description) ||
      post.meta_description,
  };
}

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

    const post = (data as BlogPostPagePost | null) ?? null;
    return applyPreserveCopySeoOptimization(post);
  },
  ["hohaeng-published-blog-post-v2"],
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
