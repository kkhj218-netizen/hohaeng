export default function BlogPostLoading() {
  return (
    <main className="min-h-screen bg-[#f6f7f9]">
      <article className="mx-auto max-w-[860px] px-4 py-8 sm:px-6 sm:py-12">
        <div className="mb-5 h-4 w-56 animate-pulse rounded bg-slate-200" />

        <div className="overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-sm">
          <header className="px-6 pb-8 pt-9 sm:px-12 sm:pt-12">
            <div className="h-7 w-24 animate-pulse rounded-full bg-blue-50" />
            <div className="mt-6 h-10 w-4/5 animate-pulse rounded bg-slate-100 sm:h-12" />
            <div className="mt-3 h-10 w-3/5 animate-pulse rounded bg-slate-100" />
            <div className="mt-6 h-4 w-32 animate-pulse rounded bg-slate-100" />
          </header>

          <div className="mx-6 border-t border-slate-100 sm:mx-12" />

          <div className="space-y-4 px-6 pb-14 pt-9 sm:px-12">
            <div className="h-4 w-full animate-pulse rounded bg-slate-100" />
            <div className="h-4 w-full animate-pulse rounded bg-slate-100" />
            <div className="h-4 w-11/12 animate-pulse rounded bg-slate-100" />
            <div className="h-4 w-4/5 animate-pulse rounded bg-slate-100" />
            <div className="pt-6">
              <div className="h-7 w-1/2 animate-pulse rounded bg-slate-100" />
            </div>
            <div className="h-4 w-full animate-pulse rounded bg-slate-100" />
            <div className="h-4 w-10/12 animate-pulse rounded bg-slate-100" />
          </div>
        </div>
      </article>
    </main>
  );
}
