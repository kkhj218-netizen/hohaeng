export default function DisclosureLoading() {
  return (
    <main className="min-h-screen bg-[#f6f7f9] pb-20">
      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-10">
          <div className="h-3 w-40 animate-pulse rounded bg-slate-200" />
          <div className="mt-4 h-9 w-64 animate-pulse rounded-xl bg-slate-200" />
          <div className="mt-4 h-4 w-full max-w-2xl animate-pulse rounded bg-slate-100" />
          <div className="mt-6 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {[0, 1, 2, 3].map((item) => (
              <div key={item} className="h-20 animate-pulse rounded-2xl bg-slate-100" />
            ))}
          </div>
        </div>
      </section>
      <div className="mx-auto grid max-w-5xl gap-3 px-4 py-6 sm:px-6 md:grid-cols-2">
        {[0, 1, 2, 3, 4, 5].map((item) => (
          <div key={item} className="h-40 animate-pulse rounded-2xl border border-slate-200 bg-white" />
        ))}
      </div>
    </main>
  );
}
