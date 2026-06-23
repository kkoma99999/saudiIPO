export default function Loading() {
  return (
    <div className="mx-auto max-w-4xl px-5 py-12">
      <div className="h-10 w-72 max-w-full animate-pulse rounded bg-muted" />
      <div className="mt-5 h-4 w-full max-w-2xl animate-pulse rounded bg-muted" />
      <div className="mt-10 space-y-2">
        {Array.from({ length: 12 }).map((_, i) => (
          <div key={i} className="h-16 animate-pulse rounded-lg bg-muted" />
        ))}
      </div>
    </div>
  );
}
