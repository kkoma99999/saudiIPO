"use client";

import { useI18n } from "@/lib/i18n/provider";

// Shown on any row where verified is false. The data is not yet checked against a
// primary source. One component, reused on every page.
export function UnverifiedBadge() {
  const { t } = useI18n();
  return (
    <span
      title={t.badge.unverifiedHelp}
      className="inline-flex cursor-help items-center rounded-full border border-gold/45 bg-gold/10 px-2 py-0.5 text-[0.65rem] font-medium text-accent-foreground"
    >
      {t.badge.unverified}
    </span>
  );
}
