export default function Loading() {
  return (
    <div className="mx-auto max-w-6xl px-5 py-12">
      <div className="h-3 w-44 animate-pulse rounded bg-muted" />
      <div className="mt-4 h-12 w-[28rem] max-w-full animate-pulse rounded bg-muted" />
      <div className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-[4.5rem] animate-pulse rounded-lg bg-muted" />
        ))}
      </div>
      <div className="mt-14 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-52 animate-pulse rounded-xl bg-muted" />
        ))}
      </div>
    </div>
  );
}
