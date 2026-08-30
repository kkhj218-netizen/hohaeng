import type { Metadata } from "next";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import Link from "next/link";

import Breadcrumbs from "@/app/components/Breadcrumbs";
import RelatedMoneyTools from "@/app/components/RelatedMoneyTools";
import {
  getBlogCategory,
  getBlogSubcategory,
  getPublishedBlogPost,
  type BlogPostPagePost,
} from "@/app/lib/blogPostPageData";
import { SITE_URL } from "@/app/lib/site";
import { getRelatedToolsForPost } from "@/app/money/relatedTools";
import BlogDeferredSections from "./BlogDeferredSections";
import EngagementTracker from "./EngagementTracker";
import SavedPosts from "./SavedPosts";
import ShareButtons from "./ShareButtons";

function toAbsoluteUrl(value: string | null | undefined) {
  const trimmed = value?.trim();
  if (!trimmed) return null;

  try {
    return new URL(trimmed, SITE_URL).toString();
  } catch {
    return null;
  }
}

function getPostTimestamp(post: BlogPostPagePost) {
  if (post.created_at) {
    const time = new Date(post.created_at).getTime();
    if (!Number.isNaN(time)) return time;
  }

  const timestamp = Number(post.slug.split("-").pop());
  return Number.isNaN(timestamp) ? 0 : timestamp;
}

function formatDate(post: BlogPostPagePost) {
  const timestamp = getPostTimestamp(post);
  if (!timestamp) return "";

  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(timestamp));
}

export async function buildBlogMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPublishedBlogPost(slug);

  if (!post) {
    return {
      title: "글을 찾을 수 없습니다 | 호행처럼",
      robots: { index: false, follow: false },
    };
  }

  const seoTitle = post.seo_title?.trim() || post.title;
  const seoDescription =
    post.meta_description?.trim() ||
    post.description?.trim() ||
    `${post.title}에 대한 호행처럼의 기록과 정보를 확인해보세요.`;
  const canonicalUrl = `/blog/${encodeURIComponent(slug)}`;
  const ogImage = post.og_image?.trim() || null;

  return {
    title: seoTitle,
    description: seoDescription,
    alternates: { canonical: canonicalUrl },
    robots: { index: true, follow: true },
    openGraph: {
      title: seoTitle,
      description: seoDescription,
      url: canonicalUrl,
      siteName: "호행처럼",
      locale: "ko_KR",
      type: "article",
      ...(post.published_at || post.created_at
        ? { publishedTime: post.published_at || post.created_at }
        : {}),
      ...(post.updated_at ? { modifiedTime: post.updated_at } : {}),
      ...(ogImage
        ? { images: [{ url: ogImage, alt: post.title }] }
        : {}),
    },
    twitter: {
      card: ogImage ? "summary_large_image" : "summary",
      title: seoTitle,
      description: seoDescription,
      ...(ogImage ? { images: [ogImage] } : {}),
    },
  };
}

function DeferredFallback() {
  return (
    <div className="px-6 pb-10 sm:px-12" aria-hidden="true">
      <div className="border-t border-slate-100 pt-8">
        <div className="h-3 w-28 animate-pulse rounded bg-slate-100" />
        <div className="mt-3 h-6 w-44 animate-pulse rounded bg-slate-100" />
        <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="h-24 animate-pulse rounded-2xl bg-slate-50" />
          ))}
        </div>
      </div>
    </div>
  );
}

export default async function FastBlogDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = await getPublishedBlogPost(slug);

  if (!post) notFound();

  const [category, subcategory] = await Promise.all([
    post.category ? getBlogCategory(post.category) : Promise.resolve(null),
    post.category && post.subcategory
      ? getBlogSubcategory(post.category, post.subcategory)
      : Promise.resolve(null),
  ]);

  const categorySlug = post.category || "log";
  const categoryLabel = category
    ? `${category.emoji || "📁"} ${category.name}`
    : post.category || "BLOG";
  const subcategoryName = subcategory?.name || post.subcategory;
  const subcategoryLabel = subcategoryName
    ? `${subcategory?.emoji ? `${subcategory.emoji} ` : ""}${subcategoryName}`
    : null;
  const categoryEmoji = category?.emoji || "🌱";

  const relatedMoneyTools = getRelatedToolsForPost({
    title: post.title,
    category: post.category,
    subcategory: post.subcategory,
  });

  const canonicalUrl = `${SITE_URL}/blog/${encodeURIComponent(post.slug)}`;
  const blogUrl = `${SITE_URL}/blog`;
  const structuredDescription =
    post.meta_description?.trim() ||
    post.description?.trim() ||
    `${post.title}에 대한 호행처럼의 기록과 정보를 확인해보세요.`;
  const structuredImage = toAbsoluteUrl(post.og_image);
  const structuredPublishedAt = post.published_at || post.created_at || null;
  const structuredModifiedAt = post.updated_at || structuredPublishedAt;
  const organizationId = `${SITE_URL}/#organization`;

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "BlogPosting",
        "@id": `${canonicalUrl}#blogposting`,
        mainEntityOfPage: { "@type": "WebPage", "@id": canonicalUrl },
        url: canonicalUrl,
        headline: post.seo_title?.trim() || post.title,
        name: post.title,
        description: structuredDescription,
        ...(structuredImage ? { image: [structuredImage] } : {}),
        ...(structuredPublishedAt ? { datePublished: structuredPublishedAt } : {}),
        ...(structuredModifiedAt ? { dateModified: structuredModifiedAt } : {}),
        author: {
          "@type": "Organization",
          "@id": organizationId,
          name: "호행처럼",
          url: SITE_URL,
        },
        publisher: {
          "@type": "Organization",
          "@id": organizationId,
          name: "호행처럼",
          url: SITE_URL,
        },
        articleSection: category?.name || post.category || "블로그",
        ...(subcategoryName
          ? {
              keywords: [
                category?.name || post.category || "블로그",
                subcategoryName,
              ],
            }
          : {}),
        inLanguage: "ko-KR",
      },
      {
        "@type": "BreadcrumbList",
        "@id": `${canonicalUrl}#breadcrumb`,
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "홈", item: SITE_URL },
          { "@type": "ListItem", position: 2, name: "블로그", item: blogUrl },
          {
            "@type": "ListItem",
            position: 3,
            name: post.title,
            item: canonicalUrl,
          },
        ],
      },
    ],
  };

  return (
    <main className="min-h-screen bg-[#f6f7f9]">
      <EngagementTracker title={post.title} slug={post.slug} />

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c"),
        }}
      />

      <article className="mx-auto max-w-[860px] px-4 py-8 sm:px-6 sm:py-12">
        <Breadcrumbs
          items={[
            { name: "홈", href: "/" },
            { name: "블로그", href: "/blog" },
            {
              name: category?.name || post.category || "블로그",
              href: `/blog?category=${encodeURIComponent(categorySlug)}`,
            },
            { name: post.title, href: `/blog/${encodeURIComponent(post.slug)}` },
          ]}
          includeStructuredData={false}
          className="mb-5"
        />

        <div className="overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-sm">
          <header className="px-6 pb-8 pt-9 sm:px-12 sm:pt-12">
            <div className="mb-5 flex flex-wrap items-center gap-2">
              <Link
                href={`/blog?category=${categorySlug}`}
                className="rounded-full bg-blue-50 px-3 py-1.5 text-xs font-black text-blue-600 transition-colors hover:bg-blue-100"
              >
                {categoryLabel}
              </Link>

              {post.subcategory && subcategoryLabel && (
                <Link
                  href={`/blog?category=${encodeURIComponent(categorySlug)}&sub=${encodeURIComponent(post.subcategory)}`}
                  className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-600 transition-colors hover:bg-slate-200"
                >
                  {subcategoryLabel}
                </Link>
              )}
            </div>

            <h1 className="break-words text-[30px] font-black leading-[1.25] tracking-[-0.03em] text-slate-950 sm:text-[42px]">
              {post.title}
            </h1>

            {post.description && (
              <p className="mt-5 text-base leading-7 text-slate-500 sm:text-lg sm:leading-8">
                {post.description}
              </p>
            )}

            {formatDate(post) && (
              <div className="mt-6 text-sm text-slate-400">📅 {formatDate(post)}</div>
            )}
          </header>

          {post.og_image && (
            <div className="px-6 pb-4 sm:px-12">
              <img
                src={post.og_image}
                alt={post.title}
                fetchPriority="high"
                className="max-h-[520px] w-full rounded-2xl border border-slate-100 object-cover"
              />
            </div>
          )}

          <div className="mx-6 border-t border-slate-100 sm:mx-12" />

          <div
            className="
              rich-editor-content
              break-words px-6 pb-14 pt-9 text-[16px] leading-[1.9] text-slate-800 sm:px-12 sm:text-[17px]
              [&>*:first-child]:mt-0 [&>*:last-child]:mb-0
              [&_p]:my-4 [&_p:empty]:min-h-[1.6em]
              [&_h2]:mb-6 [&_h2]:mt-14 [&_h2]:text-[28px] [&_h2]:font-black [&_h2]:leading-[1.35] [&_h2]:tracking-[-0.025em] [&_h2]:text-slate-950 sm:[&_h2]:text-[32px]
              [&_h3]:mb-5 [&_h3]:mt-11 [&_h3]:text-[23px] [&_h3]:font-extrabold [&_h3]:leading-[1.4] [&_h3]:tracking-[-0.02em] [&_h3]:text-slate-900 sm:[&_h3]:text-[26px]
              [&_h4]:mb-4 [&_h4]:mt-9 [&_h4]:text-[19px] [&_h4]:font-extrabold [&_h4]:text-slate-900 sm:[&_h4]:text-[21px]
              [&_strong]:font-black [&_em]:italic [&_u]:underline [&_u]:underline-offset-4
              [&_img]:mx-auto [&_img]:my-8 [&_img]:block [&_img]:h-auto [&_img]:max-w-full [&_img]:rounded-2xl
              [&_ul]:my-6 [&_ul]:list-disc [&_ul]:pl-7 [&_ul_ul]:my-2
              [&_ol]:my-6 [&_ol]:list-decimal [&_ol]:pl-7 [&_ol_ol]:my-2
              [&_li]:my-2 [&_li]:pl-1 [&_li_p]:my-0
              [&_blockquote]:my-8 [&_blockquote]:rounded-r-2xl [&_blockquote]:border-l-4 [&_blockquote]:border-blue-500 [&_blockquote]:bg-blue-50/70 [&_blockquote]:px-6 [&_blockquote]:py-5 [&_blockquote]:leading-8 [&_blockquote]:text-slate-600
              [&_blockquote_p]:my-0 [&_blockquote_blockquote]:my-0 [&_blockquote_blockquote]:rounded-none [&_blockquote_blockquote]:border-l-0 [&_blockquote_blockquote]:bg-transparent [&_blockquote_blockquote]:px-0 [&_blockquote_blockquote]:py-0
              [&_a]:font-semibold [&_a]:text-blue-600 [&_a]:underline [&_a]:decoration-blue-300 [&_a]:underline-offset-4 hover:[&_a]:text-blue-500
              [&_hr]:my-12 [&_hr]:border-0 [&_hr]:border-t [&_hr]:border-slate-200
              [&_mark]:rounded [&_mark]:px-1 [&_mark]:py-0.5
              [&_code]:rounded-md [&_code]:bg-slate-100 [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-[0.9em] [&_code]:text-pink-600
              [&_pre]:my-8 [&_pre]:overflow-x-auto [&_pre]:rounded-2xl [&_pre]:bg-slate-950 [&_pre]:p-5 [&_pre]:text-sm [&_pre]:leading-7 [&_pre]:text-slate-100
              [&_pre_code]:bg-transparent [&_pre_code]:p-0 [&_pre_code]:text-inherit [&_s]:text-slate-500
            "
            dangerouslySetInnerHTML={{ __html: post.content || "" }}
          />

          <ShareButtons
            title={post.title}
            description={post.description}
            slug={post.slug}
          />

          <SavedPosts
            currentPost={{
              slug: post.slug,
              title: post.title,
              description: post.description || null,
              category: post.category || null,
              categoryLabel: category?.name || post.category || "블로그",
              categoryEmoji: category?.emoji || "📁",
              image: post.og_image || null,
            }}
          />

          {relatedMoneyTools.length > 0 && (
            <div className="px-6 pb-8 sm:px-12">
              <RelatedMoneyTools
                tools={relatedMoneyTools}
                title="이 글과 함께 계산해보세요"
              />
            </div>
          )}

          <Suspense fallback={<DeferredFallback />}>
            <BlogDeferredSections
              post={post}
              categorySlug={categorySlug}
              categoryEmoji={categoryEmoji}
            />
          </Suspense>

          <footer className="px-6 pb-10 sm:px-12">
            <div className="border-t border-slate-100 pt-7">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-xs text-slate-400">HOHAENG OS</p>
                  <p className="mt-1 text-sm font-bold text-slate-700">
                    호행처럼의 기록과 정보
                  </p>
                </div>

                <Link
                  href={`/blog?category=${categorySlug}`}
                  className="inline-flex items-center justify-center rounded-xl bg-slate-900 px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-blue-600"
                >
                  ← 다른 글 더 보기
                </Link>
              </div>
            </div>
          </footer>
        </div>
      </article>
    </main>
  );
}
