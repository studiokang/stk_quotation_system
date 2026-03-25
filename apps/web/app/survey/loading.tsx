export default function Loading() {
  return (
    <main className="flex min-h-screen items-center justify-center p-8">
      <div className="w-full max-w-2xl space-y-6">
        <div className="h-8 w-48 animate-pulse rounded-lg bg-gray-200" />
        <div className="h-2 w-full rounded-full bg-gray-200" />
        <div className="space-y-4 rounded-xl border border-gray-200 bg-white p-8 shadow-sm">
          <div className="h-6 w-3/4 animate-pulse rounded bg-gray-200" />
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="h-5 w-5 animate-pulse rounded-full bg-gray-200" />
                <div className="h-4 w-1/2 animate-pulse rounded bg-gray-200" />
              </div>
            ))}
          </div>
        </div>
        <div className="flex justify-end">
          <div className="h-11 w-24 animate-pulse rounded-lg bg-gray-200" />
        </div>
      </div>
    </main>
  );
}
