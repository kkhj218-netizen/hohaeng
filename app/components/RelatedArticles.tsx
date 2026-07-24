import Link from 'next/link';
import { getArticlesByCategory } from '@/app/lib/mdx';

interface Props {
  category: string;
}

export default function RelatedArticles({ category }: Props) {
  const articles = getArticlesByCategory(category).slice(0, 3);

  if (articles.length === 0) return null;

  return (
    <section className="mt-12 border-t pt-8">
      <h3 className="text-lg font-bold mb-4 flex items-center gap-2 text-slate-900">
        💡 이 정보도 함께 읽어보세요
      </h3>
      <div className="grid gap-4 md:grid-cols-2">
        {articles.map((article) => (
          <Link
            key={article.slug}
            href={`/blog/${article.slug}`}
            className="block p-4 rounded-xl border border-slate-200 hover:border-blue-500 hover:shadow-md transition-all bg-white"
          >
            <h4 className="font-semibold text-slate-900 mb-1">
              {article.title}
            </h4>
            <p className="text-sm text-slate-500 line-clamp-2">
              {article.description}
            </p>
          </Link>
        ))}
      </div>
    </section>
  );
}