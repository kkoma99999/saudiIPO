export default function Loading() {
  return (
    <div className="mx-auto max-w-5xl px-5 py-12">
      <div className="h-10 w-80 max-w-full animate-pulse rounded bg-muted" />
      <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="h-[4.5rem] animate-pulse rounded-lg bg-muted" />
        ))}
      </div>
      <div className="mt-10 h-[340px] animate-pulse rounded-xl bg-muted" />
    </div>
  );
}
