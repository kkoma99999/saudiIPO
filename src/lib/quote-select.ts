// Choosing between the live Sahmk quote and the yfinance end-of-day close for the
// headline current price and every return. Pure and tested: the company queries call
// chooseLatest to decide which price the return math runs on, so the rule (the fresher
// of the two wins, and the live quote breaks a same-day tie) lives in one place. The
// chosen close is then fed to the existing metrics engine unchanged. See
// src/db/queries.ts and .claude/skills/tadawul-data/SKILL.md.

// The latest stored end-of-day close (yfinance, current-share basis).
export interface EodClose {
  date: string; // YYYY-MM-DD of the latest stored close (a Riyadh trading date)
  close: string; // SAR
}

// The latest delayed/live quote from live_quotes (Sahmk). The price is today's actual
// trading price, already in current-share basis like the stored close.
export interface LiveQuote {
  price: string; // SAR
  quoteTime: string; // ISO 8601 UTC datetime of the source's last update, for display
  // The quote's market (Riyadh/AST) calendar date, computed in SQL. Used for the
  // freshness comparison and the as-of, so a UTC quote time is never compared against a
  // Riyadh trading date across the midnight boundary.
  quoteDate: string; // YYYY-MM-DD in Asia/Riyadh
  isDelayed: boolean;
}

// The price the return math runs on, plus the metadata the UI shows for freshness.
export interface ChosenPrice {
  date: string; // as-of date for the return math (YYYY-MM-DD, Riyadh basis)
  close: string; // the price the return math uses
  // The live datetime when the live quote won, else null (an end-of-day close carries
  // only a date). isDelayed is false for an end-of-day close.
  quoteTime: string | null;
  isDelayed: boolean;
}

// Pick the price that drives the current price and every return. The live quote wins
// when it carries a usable (positive) price and its market date is at least as recent as
// the latest end-of-day close, so a stale live row never overrides a newer close, and it
// breaks a same-day tie because it is the intraday figure from the dedicated quote
// source. A non-positive live price (a halted or not-yet-traded symbol reporting 0) is
// ignored rather than shown as a real price. With no usable live quote the end-of-day
// close is used; with neither the result is null and the company shows no current price.
export function chooseLatest(
  eod: EodClose | undefined,
  live: LiveQuote | undefined,
): ChosenPrice | null {
  const liveUsable = live && Number(live.price) > 0;
  if (liveUsable && (!eod || live!.quoteDate >= eod.date)) {
    return {
      date: live!.quoteDate,
      close: live!.price,
      quoteTime: live!.quoteTime,
      isDelayed: live!.isDelayed,
    };
  }
  if (eod) {
    return { date: eod.date, close: eod.close, quoteTime: null, isDelayed: false };
  }
  return null;
}
