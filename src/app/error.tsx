"use client";

export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="mx-auto max-w-2xl px-5 py-28 text-center">
      <p className="font-mono text-[0.66rem] uppercase tracking-[0.2em] text-primary">Error</p>
      <h1 className="mt-3 font-display text-4xl font-semibold tracking-tight">
        Something went wrong
      </h1>
      <p className="mt-3 text-muted-foreground">
        This page could not load. The data service may be unavailable.
      </p>
      <button
        onClick={reset}
        className="mt-6 inline-block rounded-md bg-primary px-4 py-2 font-mono text-xs uppercase tracking-wider text-primary-foreground transition-opacity hover:opacity-90"
      >
        Try again
      </button>
    </div>
  );
}
