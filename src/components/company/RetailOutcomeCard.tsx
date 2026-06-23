"use client";

import { useMemo, useState } from "react";
import type { RetailOutcomeResult } from "@/lib/retail-outcome";
import { outcomeForShares } from "@/lib/retail-outcome";
import { useI18n } from "@/lib/i18n/provider";
import { formatSar, formatCount, formatPercent } from "@/lib/format";
import { isArgaamUrl } from "@/lib/source";

// "If you received the minimum allocation and held to today." The SAR figures scale
// with the allocation, so the card lets the reader replace the minimum with the number
// of shares they were actually allocated and recomputes through the same pure function.
export function RetailOutcomeCard({
  outcome,
  verified,
  sourceUrl,
}: {
  outcome: RetailOutcomeResult;
  verified: boolean;
  sourceUrl: string | null;
}) {
  const { t } = useI18n();
  const basis = outcome.computable ? outcome.basis : null;
  const minShares = basis ? Number(basis.minAllocationShares) : 0;
  const [sharesInput, setSharesInput] = useState<string>(basis?.minAllocationShares ?? "");
  const typed = Number(sharesInput);
  const shares = typed > 0 ? typed : minShares;
  const o = useMemo(() => (basis ? outcomeForShares(basis, shares) : null), [basis, shares]);

  if (!basis || !o) {
    return (
      <div className="overflow-hidden rounded-lg border border-border/70 bg-card">
        <h3 className="border-b border-border/70 bg-secondary/40 px-4 py-2.5 text-xs font-medium text-muted-foreground">
          {t.allocation.outcomeTitle}
        </h3>
        <div className="px-4 py-5">
          <p className="text-sm font-medium text-foreground">{t.allocation.notDisclosed}</p>
          <p className="mt-1.5 text-xs text-muted-foreground">{t.allocation.notDisclosedHint}</p>
        </div>
      </div>
    );
  }

  const netClass = o.netSar >= 0 ? "text-up" : "text-down";
  const sign = o.netSar > 0 ? "+" : "";

  return (
    <div className="overflow-hidden rounded-lg border border-border/70 bg-card shadow-[inset_3px_0_0_0_var(--color-gold)]">
      <div className="flex items-center justify-between gap-2 border-b border-border/70 bg-secondary/40 px-4 py-2.5">
        <h3 className="text-xs font-medium text-gold">{t.allocation.outcomeTitle}</h3>
        <div className="flex shrink-0 items-center gap-2">
          {!verified && (
            <span
              title={t.badge.unverifiedHelp}
              className="inline-flex items-center gap-1 rounded-full border border-gold/55 bg-gold/12 px-2 py-0.5 text-[0.65rem] font-medium text-accent-foreground"
            >
              <span aria-hidden className="inline-block h-1 w-1 rounded-full bg-gold" />
              {t.allocation.unverified}
            </span>
          )}
          {sourceUrl && !isArgaamUrl(sourceUrl) && (
            <a
              href={sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-primary underline-offset-2 hover:underline"
            >
              {t.detail.source}
            </a>
          )}
        </div>
      </div>

      <dl className="grid grid-cols-2 gap-px bg-border/50 text-sm">
        <Figure label={t.allocation.capitalDeployed} value={formatSar(o.capitalDeployed)} />
        <Figure
          label={t.allocation.sharesNow}
          value={formatCount(o.currentShares)}
          hint={o.bonusIncreasedShares ? t.allocation.bonusNote : undefined}
        />
        <Figure label={t.allocation.currentValue} value={formatSar(o.currentValue)} />
        <Figure label={t.allocation.dividendsReceived} value={formatSar(o.dividendsReceived)} />
      </dl>

      <div className="flex items-stretch border-t border-border/70">
        <div className="flex-1 px-4 py-3">
          <div className="text-xs text-muted-foreground">{t.allocation.netProfit}</div>
          <div className={`mt-1 text-2xl leading-none tnum ${netClass}`}>
            {sign}
            {formatSar(o.netSar)}
          </div>
        </div>
        <div className="flex-1 border-s border-border/70 px-4 py-3">
          <div className="text-xs text-muted-foreground">{t.allocation.returnLabel}</div>
          <div className={`mt-1 text-2xl leading-none tnum ${netClass}`}>
            {formatPercent(o.returnPct)}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3 border-t border-border/70 px-4 py-3">
        <label htmlFor="alloc-shares" className="text-xs text-muted-foreground">
          {t.allocation.yourShares}
        </label>
        <input
          id="alloc-shares"
          type="number"
          inputMode="numeric"
          min={1}
          value={sharesInput}
          onChange={(e) => setSharesInput(e.target.value)}
          className="w-28 rounded-md border border-border bg-background px-2.5 py-1.5 text-sm tnum text-foreground focus:outline-none focus:ring-2 focus:ring-ring/40"
        />
        <span className="text-xs text-muted-foreground">
          {t.allocation.minShares} {formatCount(minShares)}
        </span>
      </div>
    </div>
  );
}

function Figure({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="bg-card px-4 py-3">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-1 text-base tnum text-foreground">{value}</dd>
      {hint && <div className="mt-1 text-[0.7rem] text-muted-foreground/80">{hint}</div>}
    </div>
  );
}
