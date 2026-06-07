export default function Loading() {
  return (
    <div className="mx-auto max-w-6xl px-5 py-12">
      <div className="h-10 w-64 animate-pulse rounded bg-muted" />
      <div className="mt-4 h-4 w-80 max-w-full animate-pulse rounded bg-muted" />
      <div className="mt-8 h-9 w-full animate-pulse rounded bg-muted" />
      <div className="mt-4 space-y-2">
        {Array.from({ length: 12 }).map((_, i) => (
          <div key={i} className="h-10 animate-pulse rounded bg-muted" />
        ))}
      </div>
    </div>
  );
}
