import Link from "next/link";

import {
  getDeferredBlogData,
  type BlogPostPagePost,
} from "@/app/lib/blogPostPageData";

export default async function BlogDeferredSections({
  post,
  categorySlug,
  categoryEmoji,
}: {
  post: BlogPostPagePost;
  categorySlug: string;
  categoryEmoji: string;
}) {
  const { previousPost, nextPost, relatedPosts } = await getDeferredBlogData(
    post.id,
    post.created_at,
    post.category,
    post.subcategory,
  );

  return (
    <>
      {relatedPosts.length > 0 && (
        <section
          aria-labelledby="related-posts-title"
          className="px-6 pb-10 sm:px-12"
        >
          <div className="border-t border-slate-100 pt-9">
            <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-xs font-black tracking-[0.08em] text-blue-600">
                  RELATED POSTS
                </p>
                <h2
                  id="related-posts-title"
                  className="mt-1 text-xl font-black text-slate-950 sm:text-2xl"
                >
                  함께 읽으면 좋은 글
                </h2>
              </div>

              <Link
                href={`/blog?category=${encodeURIComponent(categorySlug)}`}
                className="text-sm font-bold text-slate-500 transition-colors hover:text-blue-600"
              >
                이 카테고리 더 보기 →
              </Link>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {relatedPosts.map((relatedPost) => (
                <Link
                  key={relatedPost.id}
                  href={`/blog/${relatedPost.slug}`}
                  className="group min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white transition-all hover:border-blue-300 hover:shadow-md"
                >
                  {relatedPost.og_image ? (
                    <div className="aspect-[16/9] overflow-hidden bg-slate-100">
                      <img
                        src={relatedPost.og_image}
                        alt={relatedPost.title}
                        loading="lazy"
                        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                      />
                    </div>
                  ) : (
                    <div className="flex aspect-[16/9] items-center justify-center bg-gradient-to-br from-slate-100 to-blue-50">
                      <div className="text-center">
                        <span className="text-2xl">{categoryEmoji}</span>
                        <p className="mt-2 text-[10px] font-black tracking-[0.16em] text-slate-400">
                          HOHAENG
                        </p>
                      </div>
                    </div>
                  )}

                  <div className="p-4">
                    <span className="inline-flex rounded-full bg-blue-50 px-2.5 py-1 text-[11px] font-black text-blue-600">
                      {relatedPost.reason}
                    </span>
                    <h3 className="mt-3 line-clamp-2 break-words text-[15px] font-black leading-6 text-slate-900 transition-colors group-hover:text-blue-700">
                      {relatedPost.title}
                    </h3>
                    {relatedPost.description && (
                      <p className="mt-2 line-clamp-2 break-words text-xs leading-5 text-slate-500">
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

      {(previousPost || nextPost) && (
        <nav aria-label="이전 글과 다음 글" className="px-6 pb-10 sm:px-12">
          <div className="border-t border-slate-100 pt-8">
            <p className="mb-4 text-xs font-black tracking-[0.08em] text-slate-400">
              이어서 읽기
            </p>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {previousPost && (
                <Link
                  href={`/blog/${previousPost.slug}`}
                  className="group min-w-0 rounded-2xl border border-slate-200 bg-slate-50 px-5 py-5 transition-colors hover:border-blue-300 hover:bg-blue-50/60"
                >
                  <span className="text-xs font-black text-slate-400 transition-colors group-hover:text-blue-600">
                    ← 이전 글
                  </span>
                  <p className="mt-2 line-clamp-2 break-words text-sm font-black leading-6 text-slate-800 transition-colors group-hover:text-blue-700 sm:text-base">
                    {previousPost.title}
                  </p>
                </Link>
              )}

              {nextPost && (
                <Link
                  href={`/blog/${nextPost.slug}`}
                  className={`group min-w-0 rounded-2xl border border-slate-200 bg-slate-50 px-5 py-5 text-right transition-colors hover:border-blue-300 hover:bg-blue-50/60 ${
                    !previousPost ? "sm:col-start-2" : ""
                  }`}
                >
                  <span className="text-xs font-black text-slate-400 transition-colors group-hover:text-blue-600">
                    다음 글 →
                  </span>
                  <p className="mt-2 line-clamp-2 break-words text-sm font-black leading-6 text-slate-800 transition-colors group-hover:text-blue-700 sm:text-base">
                    {nextPost.title}
                  </p>
                </Link>
              )}
            </div>
          </div>
        </nav>
      )}
    </>
  );
}
