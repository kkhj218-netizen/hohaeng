import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";

import { supabase } from "@/app/lib/supabase";
import ViewCounter from "./ViewCounter";
import ShareButtons from "./ShareButtons";
import EngagementTracker from "./EngagementTracker";
import RecentlyViewedPosts from "./RecentlyViewedPosts";

export const dynamic = "force-dynamic";

const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL || "https://hohaeng.vercel.app"
).replace(/\/$/, "");

function toAbsoluteUrl(value: string | null | undefined) {
  const trimmed = value?.trim();

  if (!trimmed) {
    return null;
  }

  try {
    return new URL(trimmed, SITE_URL).toString();
  } catch {
    return null;
  }
}

type Post = {
  id: string;
  title: string;
  slug: string;
  content?: string | null;

  category?: string | null;
  subcategory?: string | null;

  description?: string | null;
  created_at?: string | null;
  published_at?: string | null;
  updated_at?: string | null;
  status?: "draft" | "published" | null;

  // SEO
  seo_title?: string | null;
  meta_description?: string | null;
  og_image?: string | null;

  // 조회수
  view_count?: number | null;
};

type Category = {
  slug: string;
  name: string;
  emoji: string | null;
  is_active: boolean;
};

type AdjacentPost = {
  id: string;
  title: string;
  slug: string;
  created_at: string | null;
};

type RelatedPost = {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  og_image: string | null;
  category: string | null;
  subcategory: string | null;
  created_at: string | null;
};

type RecommendedPost = RelatedPost & {
  reason: string;
};

function getPostTimestamp(post: Post) {
  if (post.created_at) {
    const time = new Date(post.created_at).getTime();

    if (!Number.isNaN(time)) {
      return time;
    }
  }

  const timestamp = Number(post.slug.split("-").pop());

  return Number.isNaN(timestamp) ? 0 : timestamp;
}

function formatDate(post: Post) {
  const timestamp = getPostTimestamp(post);

  if (!timestamp) {
    return "";
  }

  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(timestamp));
}

/* =========================================================
   🔍 글별 SEO 메타데이터
========================================================= */

export async function generateMetadata({
  params,
}: {
  params: Promise<{
    slug: string;
  }>;
}): Promise<Metadata> {
  const { slug } = await params;

  const { data: post, error } = await supabase
    .from("posts")
    .select(
      "title, slug, description, seo_title, meta_description, og_image, created_at, published_at, updated_at",
    )
    .eq("slug", slug)
    .eq("status", "published")
    .maybeSingle();

  if (error || !post) {
    return {
      title: "글을 찾을 수 없습니다 | 호행처럼",

      robots: {
        index: false,
        follow: false,
      },
    };
  }

  const seoTitle = post.seo_title?.trim() || post.title;

  const seoDescription =
    post.meta_description?.trim() ||
    post.description?.trim() ||
    `${post.title}에 대한 호행처럼의 기록과 정보를 확인해보세요.`;

  const canonicalUrl = `/blog/${slug}`;

  const ogImage = post.og_image?.trim() || null;

  return {
    title: seoTitle,

    description: seoDescription,

    alternates: {
      canonical: canonicalUrl,
    },

    robots: {
      index: true,
      follow: true,
    },

    openGraph: {
      title: seoTitle,

      description: seoDescription,

      url: canonicalUrl,

      siteName: "호행처럼",

      locale: "ko_KR",

      type: "article",

      ...(post.published_at || post.created_at
        ? {
            publishedTime: post.published_at || post.created_at,
          }
        : {}),

      ...(post.updated_at
        ? {
            modifiedTime: post.updated_at,
          }
        : {}),

      ...(ogImage
        ? {
            images: [
              {
                url: ogImage,

                alt: post.title,
              },
            ],
          }
        : {}),
    },

    twitter: {
      card: ogImage ? "summary_large_image" : "summary",

      title: seoTitle,

      description: seoDescription,

      ...(ogImage
        ? {
            images: [ogImage],
          }
        : {}),
    },
  };
}

/* =========================================================
   📝 실제 블로그 글 화면
========================================================= */

export default async function BlogDetailPage({
  params,
}: {
  params: Promise<{
    slug: string;
  }>;
}) {
  const { slug } = await params;

  // =========================================================
  // 글 불러오기
  // =========================================================

  const { data, error } = await supabase
    .from("posts")
    .select("*")
    .eq("slug", slug)
    .eq("status", "published")
    .maybeSingle();

  if (error) {
    console.error("Supabase 글 상세 불러오기 오류:", error);

    notFound();
  }

  if (!data) {
    notFound();
  }

  const post = data as Post;

  // =========================================================
  // DB에서 실제 카테고리 정보 불러오기
  // =========================================================

  let category: Category | null = null;

  if (post.category) {
    const { data: categoryData, error: categoryError } = await supabase
      .from("categories")
      .select("slug, name, emoji, is_active")
      .eq("slug", post.category)
      .maybeSingle();

    if (categoryError) {
      console.error("카테고리 불러오기 오류:", categoryError);
    }

    category = categoryData as Category | null;
  }

  // =========================================================
  // 이전 글 / 다음 글 불러오기
  // 공개된 글만 작성일 순서로 연결한다.
  // =========================================================

  let previousPost: AdjacentPost | null = null;

  let nextPost: AdjacentPost | null = null;

  if (post.created_at) {
    const [previousResult, nextResult] = await Promise.all([
      supabase
        .from("posts")
        .select("id, title, slug, created_at")
        .eq("status", "published")
        .lt("created_at", post.created_at)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),

      supabase
        .from("posts")
        .select("id, title, slug, created_at")
        .eq("status", "published")
        .gt("created_at", post.created_at)
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle(),
    ]);

    if (previousResult.error) {
      console.error("이전 글 불러오기 오류:", previousResult.error);
    } else {
      previousPost = previousResult.data as AdjacentPost | null;
    }

    if (nextResult.error) {
      console.error("다음 글 불러오기 오류:", nextResult.error);
    } else {
      nextPost = nextResult.data as AdjacentPost | null;
    }
  }

  // =========================================================
  // 관련 글 자동 추천
  // 1순위: 같은 세부주제
  // 2순위: 같은 카테고리
  // 3순위: 최신 공개글
  // 초안과 현재 글은 항상 제외한다.
  // 요청 수를 줄이기 위해 최대 2개의 조회를 동시에 실행한다.
  // =========================================================

  const relatedPosts: RecommendedPost[] = [];

  const relatedPostIds = new Set<string>([post.id]);

  const addRelatedPosts = (items: RelatedPost[] | null, reason: string) => {
    for (const item of items || []) {
      if (relatedPosts.length >= 3 || relatedPostIds.has(item.id)) {
        continue;
      }

      relatedPostIds.add(item.id);

      relatedPosts.push({
        ...item,
        reason,
      });
    }
  };

  const relatedPostSelect =
    "id, title, slug, description, og_image, category, subcategory, created_at";

  const [sameCategoryResult, latestPublishedResult] = await Promise.all([
    post.category
      ? supabase
          .from("posts")
          .select(relatedPostSelect)
          .eq("status", "published")
          .eq("category", post.category)
          .neq("id", post.id)
          .order("created_at", { ascending: false })
          .limit(12)
      : Promise.resolve({
          data: [] as RelatedPost[],
          error: null,
        }),

    supabase
      .from("posts")
      .select(relatedPostSelect)
      .eq("status", "published")
      .neq("id", post.id)
      .order("created_at", { ascending: false })
      .limit(12),
  ]);

  if (sameCategoryResult.error) {
    console.error(
      "같은 카테고리 관련 글 불러오기 오류:",
      sameCategoryResult.error,
    );
  }

  if (latestPublishedResult.error) {
    console.error("최신 관련 글 불러오기 오류:", latestPublishedResult.error);
  }

  const sameCategoryPosts = (sameCategoryResult.data || []) as RelatedPost[];

  if (post.subcategory) {
    addRelatedPosts(
      sameCategoryPosts.filter((item) => item.subcategory === post.subcategory),
      "같은 세부주제",
    );
  }

  addRelatedPosts(sameCategoryPosts, "같은 카테고리");

  addRelatedPosts(
    (latestPublishedResult.data || []) as RelatedPost[],
    "최신 글",
  );

  const categoryLabel = category
    ? `${category.emoji || "📁"} ${category.name}`
    : post.category || "BLOG";

  const categorySlug = post.category || "log";

  // =========================================================
  // JSON-LD 구조화 데이터
  // BlogPosting + BreadcrumbList
  // =========================================================

  const canonicalUrl = `${SITE_URL}/blog/${encodeURIComponent(post.slug)}`;

  const blogUrl = `${SITE_URL}/blog`;

  const categoryUrl = `${blogUrl}?category=${encodeURIComponent(categorySlug)}`;

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

        mainEntityOfPage: {
          "@type": "WebPage",
          "@id": canonicalUrl,
        },

        url: canonicalUrl,

        headline: post.seo_title?.trim() || post.title,

        name: post.title,

        description: structuredDescription,

        ...(structuredImage
          ? {
              image: [structuredImage],
            }
          : {}),

        ...(structuredPublishedAt
          ? {
              datePublished: structuredPublishedAt,
            }
          : {}),

        ...(structuredModifiedAt
          ? {
              dateModified: structuredModifiedAt,
            }
          : {}),

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

        ...(post.subcategory
          ? {
              keywords: [
                category?.name || post.category || "블로그",
                post.subcategory,
              ],
            }
          : {}),

        inLanguage: "ko-KR",
      },

      {
        "@type": "BreadcrumbList",

        "@id": `${canonicalUrl}#breadcrumb`,

        itemListElement: [
          {
            "@type": "ListItem",
            position: 1,
            name: "홈",
            item: SITE_URL,
          },
          {
            "@type": "ListItem",
            position: 2,
            name: "블로그",
            item: blogUrl,
          },
          {
            "@type": "ListItem",
            position: 3,
            name: category?.name || post.category || "블로그",
            item: categoryUrl,
          },
          {
            "@type": "ListItem",
            position: 4,
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

      {/* =====================================================
          전체 글 영역
      ===================================================== */}

      <article className="max-w-[860px] mx-auto px-4 sm:px-6 py-8 sm:py-12">
        {/* 목록 이동 */}
        <div className="mb-5">
          <Link
            href={`/blog?category=${categorySlug}`}
            className="inline-flex items-center gap-1 text-sm font-bold text-slate-500 hover:text-blue-600 transition-colors"
          >
            ← 목록으로 돌아가기
          </Link>
        </div>

        {/* ===================================================
            메인 글 카드
        =================================================== */}

        <div className="bg-white rounded-[24px] border border-slate-200 shadow-sm overflow-hidden">
          {/* =================================================
              글 헤더
          ================================================= */}

          <header className="px-6 sm:px-12 pt-9 sm:pt-12 pb-8">
            {/* 카테고리 */}
            <div className="flex flex-wrap items-center gap-2 mb-5">
              <Link
                href={`/blog?category=${categorySlug}`}
                className="text-xs font-black text-blue-600 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-full transition-colors"
              >
                {categoryLabel}
              </Link>

              {post.subcategory && (
                <span className="text-xs font-bold text-slate-600 bg-slate-100 px-3 py-1.5 rounded-full">
                  {post.subcategory}
                </span>
              )}
            </div>

            {/* 제목 */}
            <h1 className="text-[30px] sm:text-[42px] font-black text-slate-950 leading-[1.25] tracking-[-0.03em] break-words">
              {post.title}
            </h1>

            {/* 설명 */}
            {post.description && (
              <p className="text-base sm:text-lg text-slate-500 leading-7 sm:leading-8 mt-5">
                {post.description}
              </p>
            )}

            {/* 날짜 + 조회수 */}
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-slate-400 mt-6">
              {formatDate(post) && <span>📅 {formatDate(post)}</span>}

              <ViewCounter
                slug={post.slug}
                initialCount={post.view_count || 0}
              />
            </div>
          </header>

          {/* =================================================
              대표 이미지
          ================================================= */}

          {post.og_image && (
            <div className="px-6 sm:px-12 pb-4">
              <img
                src={post.og_image}
                alt={post.title}
                className="w-full max-h-[520px] object-cover rounded-2xl border border-slate-100"
              />
            </div>
          )}

          {/* 헤더-본문 구분 */}
          <div className="mx-6 sm:mx-12 border-t border-slate-100" />

          {/* =================================================
              Tiptap 본문
          ================================================= */}

          <div
            className="
              px-6
              sm:px-12
              pt-9
              pb-14

              text-[16px]
              sm:text-[17px]

              text-slate-800
              leading-[1.9]

              break-words

              [&>*:first-child]:mt-0
              [&>*:last-child]:mb-0


              /* ===============================
                 일반 문단
              =============================== */

              [&_p]:my-4

              [&_p:empty]:min-h-[1.6em]


              /* ===============================
                 큰 제목 H2
              =============================== */

              [&_h2]:text-[28px]
              [&_h2]:sm:text-[32px]
              [&_h2]:font-black
              [&_h2]:tracking-[-0.025em]
              [&_h2]:leading-[1.35]
              [&_h2]:text-slate-950
              [&_h2]:mt-14
              [&_h2]:mb-6


              /* ===============================
                 소제목 H3
              =============================== */

              [&_h3]:text-[23px]
              [&_h3]:sm:text-[26px]
              [&_h3]:font-extrabold
              [&_h3]:tracking-[-0.02em]
              [&_h3]:leading-[1.4]
              [&_h3]:text-slate-900
              [&_h3]:mt-11
              [&_h3]:mb-5


              /* ===============================
                 작은 제목 H4
              =============================== */

              [&_h4]:text-[19px]
              [&_h4]:sm:text-[21px]
              [&_h4]:font-extrabold
              [&_h4]:text-slate-900
              [&_h4]:mt-9
              [&_h4]:mb-4


              /* ===============================
                 굵게 / 기울임 / 밑줄
              =============================== */

              [&_strong]:font-black

              [&_em]:italic

              [&_u]:underline
              [&_u]:underline-offset-4


              /* ===============================
                 이미지
              =============================== */

              [&_img]:block
              [&_img]:max-w-full
              [&_img]:h-auto
              [&_img]:mx-auto
              [&_img]:my-8
              [&_img]:rounded-2xl


              /* ===============================
                 글머리표
              =============================== */

              [&_ul]:list-disc
              [&_ul]:pl-7
              [&_ul]:my-6

              [&_ul_ul]:my-2


              /* ===============================
                 번호 목록
              =============================== */

              [&_ol]:list-decimal
              [&_ol]:pl-7
              [&_ol]:my-6

              [&_ol_ol]:my-2


              /* ===============================
                 목록 아이템
              =============================== */

              [&_li]:my-2
              [&_li]:pl-1

              [&_li_p]:my-0


              /* ===============================
                 인용문
              =============================== */

              [&_blockquote]:my-8
              [&_blockquote]:rounded-r-2xl
              [&_blockquote]:border-l-4
              [&_blockquote]:border-blue-500
              [&_blockquote]:bg-blue-50/70
              [&_blockquote]:px-6
              [&_blockquote]:py-5
              [&_blockquote]:text-slate-600
              [&_blockquote]:leading-8

              [&_blockquote_p]:my-0


              /* ===============================
                 링크
              =============================== */

              [&_a]:font-semibold
              [&_a]:text-blue-600
              [&_a]:underline
              [&_a]:decoration-blue-300
              [&_a]:underline-offset-4

              hover:[&_a]:text-blue-500


              /* ===============================
                 구분선
              =============================== */

              [&_hr]:my-12
              [&_hr]:border-0
              [&_hr]:border-t
              [&_hr]:border-slate-200


              /* ===============================
                 형광펜
              =============================== */

              [&_mark]:rounded
              [&_mark]:px-1
              [&_mark]:py-0.5


              /* ===============================
                 인라인 코드
              =============================== */

              [&_code]:rounded-md
              [&_code]:bg-slate-100
              [&_code]:px-1.5
              [&_code]:py-0.5
              [&_code]:text-[0.9em]
              [&_code]:font-mono
              [&_code]:text-pink-600


              /* ===============================
                 코드 블록
              =============================== */

              [&_pre]:my-8
              [&_pre]:overflow-x-auto
              [&_pre]:rounded-2xl
              [&_pre]:bg-slate-950
              [&_pre]:p-5
              [&_pre]:text-sm
              [&_pre]:leading-7
              [&_pre]:text-slate-100

              [&_pre_code]:bg-transparent
              [&_pre_code]:p-0
              [&_pre_code]:text-inherit


              /* ===============================
                 취소선
              =============================== */

              [&_s]:text-slate-500
            "
            dangerouslySetInnerHTML={{
              __html: post.content || "",
            }}
          />

          {/* =================================================
              공유 버튼
          ================================================= */}

          <ShareButtons
            title={post.title}
            description={post.description}
            slug={post.slug}
          />

          {/* =================================================
              최근 본 글 자동 저장 및 표시
          ================================================= */}

          <RecentlyViewedPosts
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

          {/* =================================================
              관련 글 자동 추천
          ================================================= */}

          {relatedPosts.length > 0 && (
            <section
              aria-labelledby="related-posts-title"
              className="px-6 sm:px-12 pb-10"
            >
              <div className="border-t border-slate-100 pt-9">
                <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2 mb-5">
                  <div>
                    <p className="text-xs font-black tracking-[0.08em] text-blue-600">
                      RELATED POSTS
                    </p>

                    <h2
                      id="related-posts-title"
                      className="text-xl sm:text-2xl font-black text-slate-950 mt-1"
                    >
                      함께 읽으면 좋은 글
                    </h2>
                  </div>

                  <Link
                    href={`/blog?category=${categorySlug}`}
                    className="text-sm font-bold text-slate-500 hover:text-blue-600 transition-colors"
                  >
                    이 카테고리 더 보기 →
                  </Link>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {relatedPosts.map((relatedPost) => (
                    <Link
                      key={relatedPost.id}
                      href={`/blog/${relatedPost.slug}`}
                      className="group min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white hover:border-blue-300 hover:shadow-md transition-all"
                    >
                      {relatedPost.og_image ? (
                        <div className="aspect-[16/9] overflow-hidden bg-slate-100">
                          <img
                            src={relatedPost.og_image}
                            alt={relatedPost.title}
                            className="h-full w-full object-cover group-hover:scale-[1.03] transition-transform duration-300"
                          />
                        </div>
                      ) : (
                        <div className="aspect-[16/9] flex items-center justify-center bg-gradient-to-br from-slate-100 to-blue-50">
                          <div className="text-center">
                            <span className="text-2xl">
                              {category?.emoji || "🌱"}
                            </span>

                            <p className="text-[10px] font-black tracking-[0.16em] text-slate-400 mt-2">
                              HOHAENG
                            </p>
                          </div>
                        </div>
                      )}

                      <div className="p-4">
                        <span className="inline-flex rounded-full bg-blue-50 px-2.5 py-1 text-[11px] font-black text-blue-600">
                          {relatedPost.reason}
                        </span>

                        <h3 className="mt-3 text-[15px] font-black leading-6 text-slate-900 group-hover:text-blue-700 transition-colors line-clamp-2 break-words">
                          {relatedPost.title}
                        </h3>

                        {relatedPost.description && (
                          <p className="mt-2 text-xs leading-5 text-slate-500 line-clamp-2 break-words">
                            {relatedPost.description}
                          </p>
                        )}
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            </section>
          )}

          {/* =================================================
              이전 글 / 다음 글
          ================================================= */}

          {(previousPost || nextPost) && (
            <nav aria-label="이전 글과 다음 글" className="px-6 sm:px-12 pb-10">
              <div className="border-t border-slate-100 pt-8">
                <p className="text-xs font-black tracking-[0.08em] text-slate-400 mb-4">
                  이어서 읽기
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {previousPost && (
                    <Link
                      href={`/blog/${previousPost.slug}`}
                      className="group min-w-0 rounded-2xl border border-slate-200 bg-slate-50 px-5 py-5 hover:border-blue-300 hover:bg-blue-50/60 transition-colors"
                    >
                      <span className="text-xs font-black text-slate-400 group-hover:text-blue-600 transition-colors">
                        ← 이전 글
                      </span>

                      <p className="mt-2 text-sm sm:text-base font-black leading-6 text-slate-800 group-hover:text-blue-700 transition-colors line-clamp-2 break-words">
                        {previousPost.title}
                      </p>
                    </Link>
                  )}

                  {nextPost && (
                    <Link
                      href={`/blog/${nextPost.slug}`}
                      className={`group min-w-0 rounded-2xl border border-slate-200 bg-slate-50 px-5 py-5 text-right hover:border-blue-300 hover:bg-blue-50/60 transition-colors ${
                        !previousPost ? "sm:col-start-2" : ""
                      }`}
                    >
                      <span className="text-xs font-black text-slate-400 group-hover:text-blue-600 transition-colors">
                        다음 글 →
                      </span>

                      <p className="mt-2 text-sm sm:text-base font-black leading-6 text-slate-800 group-hover:text-blue-700 transition-colors line-clamp-2 break-words">
                        {nextPost.title}
                      </p>
                    </Link>
                  )}
                </div>
              </div>
            </nav>
          )}

          {/* =================================================
              글 하단
          ================================================= */}

          <footer className="px-6 sm:px-12 pb-10">
            <div className="border-t border-slate-100 pt-7">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <p className="text-xs text-slate-400">HOHAENG OS</p>

                  <p className="text-sm font-bold text-slate-700 mt-1">
                    호행처럼의 기록과 정보
                  </p>
                </div>

                <Link
                  href={`/blog?category=${categorySlug}`}
                  className="inline-flex items-center justify-center px-5 py-3 bg-slate-900 hover:bg-blue-600 text-white rounded-xl text-sm font-bold transition-colors"
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