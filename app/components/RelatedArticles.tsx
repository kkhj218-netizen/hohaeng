import Link from 'next/link';

export interface ArticleSummary {
  slug: string;
  title: string;
  description: string;
  date: string;
  category: string;
}

interface RelatedArticlesProps {
  articles?: ArticleSummary[];
}

export default function RelatedArticles({ articles = [] }: RelatedArticlesProps) {
  // 전달받은 아티클이 없으면 화면에 아무것도 그리지 않음
  if (!articles || articles.length === 0) return null;

  return (
    <section className="mt-12 border-t border-slate-200 pt-8">
      <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
        💡 이 정보도 함께 읽어보세요
      </h3>
      <div className="grid sm:grid-cols-2 gap-4">
        {articles.map((article) => (
          <Link
            key={article.slug}
            href={`/blog/${article.slug}`}
            className="p-4 rounded-xl border border-slate-200 hover:border-blue-500 hover:shadow-md transition-all bg-white block"
          >
            <span className="text-xs font-semibold text-blue-600 uppercase">
              {article.category}
            </span>
            <h4 className="font-bold text-slate-800 text-base mt-1 line-clamp-1">
              {article.title}
            </h4>
            <p className="text-slate-500 text-xs mt-1 line-clamp-2">
              {article.description}
            </p>
          </Link>
        ))}
      </div>
    </section>
  );
}