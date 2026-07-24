import { getArticleBySlug } from '@/app/lib/mdx';
import { MDXRemote } from 'next-mdx-remote/rsc';
import { notFound } from 'next/navigation';

export default async function BlogDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const article = getArticleBySlug(slug);

  if (!article) notFound();

  return (
    <article className="max-w-2xl mx-auto p-6 prose">
      <div className="mb-8 border-b pb-4">
        <span className="text-sm text-blue-600 font-semibold uppercase">
          {article.category}
        </span>
        <h1 className="text-3xl font-bold mt-2 text-slate-900">{article.title}</h1>
        <p className="text-slate-500 text-sm mt-1">{article.date}</p>
      </div>

      <MDXRemote source={article.content} />
    </article>
  );
}