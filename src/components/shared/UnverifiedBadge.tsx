import { strings } from "@/lib/i18n/strings";

// Shown on any row where verified is false. The data is not yet checked against a
// primary source. One component, reused on every page.
export function UnverifiedBadge() {
  return (
    <span
      title={strings.badge.unverifiedHelp}
      className="inline-flex cursor-help items-center rounded-full border border-gold/55 bg-gold/12 px-2 py-0.5 font-mono text-[0.58rem] uppercase tracking-[0.1em] text-accent-foreground"
    >
      {strings.badge.unverified}
    </span>
  );
}
