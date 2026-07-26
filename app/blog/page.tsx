import Link from 'next/link';
import { getAllArticles } from '@/app/lib/mdx';

export default async function BlogListPage({
  searchParams,
}: {
  searchParams: Promise<{ cat?: string; sub?: string; year?: string }>;
}) {
  const { cat = 'log', sub = 'all', year = '2026' } = await searchParams;
  const articles = getAllArticles();

  // 카테고리 및 필터링 적용
  const filteredArticles = articles.filter((article) => {
    const matchCat = cat === 'all' || article.category === cat;
    const matchSub = sub === 'all' || article.subcategory === sub;
    const matchYear = year === 'all' || article.year === year;
    return matchCat && matchSub && matchYear;
  });

  return (
    <main className="max-w-4xl mx-auto p-6">
      <h1 className="text-3xl font-bold text-slate-900 mb-6">📝 호행의 일지</h1>

      {/* 필터 영역 */}
      <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 mb-8 flex flex-wrap gap-4 items-center justify-between">
        {/* 세부 주제 버튼 */}
        <div className="flex flex-wrap gap-2">
          <Link
            href={`/blog?cat=${cat}&sub=all&year=${year}`}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
              sub === 'all'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
            }`}
          >
            전체 보기
          </Link>
          <Link
            href={`/blog?cat=${cat}&sub=invest&year=${year}`}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
              sub === 'invest'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
            }`}
          >
            📈 투자일지
          </Link>
          <Link
            href={`/blog?cat=${cat}&sub=dividend&year=${year}`}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
              sub === 'dividend'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
            }`}
          >
            💰 배당일지
          </Link>
          <Link
            href={`/blog?cat=${cat}&sub=routine&year=${year}`}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
              sub === 'routine'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
            }`}
          >
            🏃‍♂️ 일상/루틴
          </Link>
        </div>
      </div>

      {/* 아티클 리스트 */}
      <div className="grid gap-4">
        {filteredArticles.length === 0 ? (
          <p className="text-slate-500 text-center py-8">등록된 글이 없습니다.</p>
        ) : (
          filteredArticles.map((article) => (
            <Link
              key={article.slug}
              href={`/blog/${article.slug}`}
              className="block p-5 rounded-xl border border-slate-200 hover:border-blue-500 hover:shadow-md transition-all bg-white"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-blue-600 uppercase bg-blue-50 px-2 py-0.5 rounded">
                  {article.subcategory || article.category}
                </span>
                <span className="text-xs text-slate-400">{article.date}</span>
              </div>
              <h2 className="text-xl font-bold text-slate-900 mb-1">{article.title}</h2>
              <p className="text-sm text-slate-600 line-clamp-2">{article.description}</p>
            </Link>
          ))
        )}
      </div>
    </main>
  );
}