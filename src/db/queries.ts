import "server-only";
import Decimal from "decimal.js";
import { sql, eq, asc } from "drizzle-orm";
import { db } from "./client";
import {
  companies,
  ipos,
  ipoAdvisors,
  pricesDaily,
  dividends,
  corporateActions,
  indexPrices,
} from "./schema";
import {
  adjustedOfferPrice,
  cumulativeAdjustedDividends,
  cumulativeFactorAfter,
  drawdownFromPeak,
  earlyTradingReturn,
  earlyWindowIsClean,
  EARLY_RETURN_TRADING_DAYS,
  firstSessionIsClean,
  indexBaselineIsClean,
  intradayRange,
  NEWLY_LISTED_MAX_SESSIONS,
  offerMultiple,
  priceReturn,
  sessionTurnover,
  totalReturn,
  yieldOnOffer,
  yearsBetween,
  cagr,
  compareToIndex,
  type CorporateAction,
  type DividendEvent,
} from "@/lib/metrics";
import {
  retailOutcome,
  outcomeForShares,
  allocatedShares,
  type OutcomeBasis,
} from "@/lib/retail-outcome";
import { chooseLatest, type EodClose, type LiveQuote, type ChosenPrice } from "@/lib/quote-select";
import { ipoYear } from "@/lib/format";
import type {
  IpoRow,
  CompanyMetrics,
  CohortSummary,
  CompanyDetail,
  AllocationDetails,
  Advisor,
  DebutStats,
  IpoValuation,
  InvestmentOutcome,
  PeakStats,
  SeriesPoint,
} from "@/types/domain";

function isoMinusDays(iso: string, days: number): string {
  const d = new Date(iso + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() - days);
  return d.toISOString().slice(0, 10);
}

// Inclusive day count between two ISO dates, so a one-day subscription reads as 1 day
// and a Sunday-to-Thursday window reads as 5.
function daysInclusive(startIso: string, endIso: string): number {
  const start = Date.parse(startIso + "T00:00:00Z");
  const end = Date.parse(endIso + "T00:00:00Z");
  return Math.round((end - start) / 86_400_000) + 1;
}

function mean(xs: number[]): number | null {
  return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null;
}

function median(xs: number[]): number | null {
  if (!xs.length) return null;
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

type Latest = { date: string; close: string };

async function latestCloseMap(): Promise<Map<string, Latest>> {
  const rows = (await db.execute(sql`
    SELECT DISTINCT ON (symbol) symbol, date::text AS date, close::text AS close
    FROM prices_daily
    ORDER BY symbol, date DESC
  `)) as unknown as Array<{ symbol: string; date: string; close: string }>;
  const map = new Map<string, Latest>();
  for (const r of rows) map.set(r.symbol.trim(), { date: r.date, close: r.close });
  return map;
}

// The latest live (delayed) quote per symbol from live_quotes, plus the TASI index
// level (stored under symbol 'TASI'). quote_time is emitted as a UTC ISO string for
// display; quote_date is the quote's Riyadh (market) calendar date, used for the
// freshness comparison so a UTC time is never compared against a Riyadh trading date.
// Pass symbols to read only the rows a single company page needs (an indexed lookup on
// the primary key) instead of the whole table. Empty when the sweep has not run.
async function liveQuotesAll(symbols?: string[]): Promise<{
  quotes: Map<string, LiveQuote>;
  tasi: LiveQuote | undefined;
}> {
  // Drizzle renders a JS array as a parenthesized placeholder list "($1, $2)", which is
  // exactly the form an IN clause needs.
  const filter = symbols && symbols.length ? sql`WHERE symbol IN ${symbols}` : sql``;
  const rows = (await db.execute(sql`
    SELECT symbol,
           price::text AS price,
           to_char(quote_time AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS quote_time,
           to_char(quote_time AT TIME ZONE 'Asia/Riyadh', 'YYYY-MM-DD') AS quote_date,
           is_delayed
    FROM live_quotes
    ${filter}
  `)) as unknown as Array<{
    symbol: string;
    price: string;
    quote_time: string;
    quote_date: string;
    is_delayed: boolean;
  }>;
  const quotes = new Map<string, LiveQuote>();
  let tasi: LiveQuote | undefined;
  for (const r of rows) {
    const lq: LiveQuote = {
      price: r.price,
      quoteTime: r.quote_time,
      quoteDate: r.quote_date,
      isDelayed: r.is_delayed,
    };
    if (r.symbol.trim() === "TASI") tasi = lq;
    else quotes.set(r.symbol.trim(), lq);
  }
  return { quotes, tasi };
}

// The TASI level the return math compares against: the live index quote when it is at
// least as fresh as the last stored index close, else the stored close. Keeps vs-TASI
// consistent with a live company price instead of mixing today's price with a stale
// index. Returns the close string (or null when there is no index data at all).
function resolveTasiLatest(
  tasiRows: Array<{ date: string; close: string }>,
  liveTasi: LiveQuote | undefined,
): string | null {
  const eod: EodClose | undefined = tasiRows.length
    ? { date: tasiRows[tasiRows.length - 1].date, close: tasiRows[tasiRows.length - 1].close }
    : undefined;
  return chooseLatest(eod, liveTasi)?.close ?? null;
}

// The TASI end value matched to a chosen price's time basis: the live index level when the
// chosen price is the live quote, else the latest stored index close. Keeps alpha measured
// to the same point in time as the price, never a live company return against a stale index
// (or the reverse). Null when there is no index data.
function tasiLatestFor(
  chosen: ChosenPrice | null,
  tasiRows: Array<{ date: string; close: string }>,
  liveTasi: LiveQuote | undefined,
): string | null {
  if (chosen?.quoteTime != null) return resolveTasiLatest(tasiRows, liveTasi);
  return tasiRows.length ? tasiRows[tasiRows.length - 1].close : null;
}

// The first index close on or after the IPO, only when it is close enough to the IPO to be
// a fair since-IPO baseline (see indexBaselineIsClean). Null when there is no such close or
// the gap is too wide to compare fairly.
function tasiBaselineFor(
  ipoDate: string,
  tasiRows: Array<{ date: string; close: string }>,
): string | null {
  for (const t of tasiRows) {
    if (t.date >= ipoDate) {
      return indexBaselineIsClean(ipoDate, t.date) ? t.close : null;
    }
  }
  return null;
}

type EarlyClose = { date: string; close: string; firstDate: string };

// The first session and the nth session per symbol (sessions ordered from the IPO),
// so the caller can both compute the early return and judge whether the early window
// is clean. A symbol with fewer than n sessions has no nth row and is absent from the
// map, so its early return stays empty rather than being invented from a partial week.
async function earlySessionMap(n: number): Promise<Map<string, EarlyClose>> {
  const rows = (await db.execute(sql`
    SELECT symbol,
           MIN(date) FILTER (WHERE rn = 1) AS first_date,
           MIN(date) FILTER (WHERE rn = ${n}) AS nth_date,
           MIN(close) FILTER (WHERE rn = ${n}) AS nth_close
    FROM (
      SELECT symbol, date::text AS date, close::text AS close,
             ROW_NUMBER() OVER (PARTITION BY symbol ORDER BY date ASC) AS rn
      FROM prices_daily
    ) ranked
    WHERE rn IN (1, ${n})
    GROUP BY symbol
  `)) as unknown as Array<{
    symbol: string;
    first_date: string | null;
    nth_date: string | null;
    nth_close: string | null;
  }>;
  const map = new Map<string, EarlyClose>();
  for (const r of rows) {
    if (r.first_date && r.nth_date && r.nth_close) {
      map.set(r.symbol.trim(), {
        date: r.nth_date,
        close: r.nth_close,
        firstDate: r.first_date,
      });
    }
  }
  return map;
}

function computeMetrics(
  row: IpoRow,
  // The price the returns run on: the live Sahmk quote when fresh, else the latest
  // stored end-of-day close, or null when there is neither (chooseLatest decides).
  chosen: ChosenPrice | null,
  early: EarlyClose | undefined,
  actions: CorporateAction[],
  divs: DividendEvent[],
  tasiBaseline: string | null,
  tasiLatest: string | null,
  minAllocationShares: string | null,
): CompanyMetrics {
  // Only a clean early window (data starting at the listing, five sessions inside two
  // weeks) yields a first-week return. A gapped .SR series leaves it empty.
  const cleanEarly =
    early && earlyWindowIsClean(row.ipoDate, early.firstDate, early.date) ? early : undefined;
  const firstDaysReturn = cleanEarly
    ? earlyTradingReturn(row.offerPrice, row.ipoDate, cleanEarly.close, actions).toNumber()
    : null;
  const firstDaysDate = cleanEarly ? cleanEarly.date : null;

  const base: CompanyMetrics = {
    ...row,
    currentPrice: null,
    currentDate: null,
    quoteTime: null,
    priceIsDelayed: false,
    priceReturn: null,
    totalReturn: null,
    firstDaysReturn,
    firstDaysDate,
    yieldOnOffer: null,
    cagr: null,
    tasiReturn: null,
    alpha: null,
    hasActions: actions.length > 0,
    cumulativeDividends: null,
    dividendCount: divs.length,
    minAllocPnl: null,
  };
  if (!chosen) return base;

  const asOf = chosen.date;
  const aop = adjustedOfferPrice(row.offerPrice, row.ipoDate, actions);
  const pr = priceReturn(row.offerPrice, row.ipoDate, chosen.close, actions).toNumber();
  const tr = totalReturn(row.offerPrice, row.ipoDate, chosen.close, asOf, actions, divs).toNumber();

  const cumDiv = cumulativeAdjustedDividends(divs, actions, asOf);
  const yearAgo = isoMinusDays(asOf, 365);
  const trailing = divs.filter((d) => d.exDate > yearAgo && d.exDate <= asOf);
  const annualAdj = cumulativeAdjustedDividends(trailing, actions, asOf);
  const yld = yieldOnOffer(annualAdj.toString(), aop).toNumber();

  const years = yearsBetween(row.ipoDate, asOf);
  // CAGR is only meaningful over at least a year. Annualizing a few weeks of a fresh
  // listing produces an absurd rate, so a sub-year holding has no CAGR.
  const cg = years >= 1 ? cagr(tr, years) : null;

  let tasiReturn: number | null = null;
  let alpha: number | null = null;
  if (tasiBaseline && tasiLatest) {
    const cmp = compareToIndex(tr, tasiBaseline, tasiLatest);
    tasiReturn = cmp.tasiReturn.toNumber();
    alpha = cmp.alpha.toNumber();
  }

  return {
    ...base,
    currentPrice: chosen.close,
    currentDate: asOf,
    quoteTime: chosen.quoteTime,
    priceIsDelayed: chosen.isDelayed,
    priceReturn: pr,
    totalReturn: tr,
    yieldOnOffer: yld,
    cagr: cg,
    tasiReturn,
    alpha,
    cumulativeDividends: cumDiv.toNumber(),
    dividendCount: divs.filter((d) => d.exDate <= asOf).length,
    // The minimum-allocation P&L percent is the same number as total_return, shown only
    // when a minimum allocation is on record. The SAR figures live on the detail page.
    minAllocPnl: minAllocationShares !== null ? tr : null,
  };
}

export async function getAllCompanyMetrics(): Promise<CompanyMetrics[]> {
  const [ipoRows, latest, live, early, actionRows, divRows, tasiRows] = await Promise.all([
    db
      .select({
        symbol: companies.symbol,
        nameEn: companies.nameEn,
        nameAr: companies.nameAr,
        sector: companies.sector,
        ipoDate: ipos.ipoDate,
        offerPrice: ipos.offerPrice,
        nominalValue: ipos.nominalValue,
        verified: ipos.verified,
        dataCaveat: companies.dataCaveat,
        minAllocationShares: ipos.minAllocationShares,
      })
      .from(ipos)
      .innerJoin(companies, eq(companies.symbol, ipos.symbol)),
    latestCloseMap(),
    liveQuotesAll(),
    earlySessionMap(EARLY_RETURN_TRADING_DAYS),
    db
      .select({
        symbol: corporateActions.symbol,
        actionDate: corporateActions.actionDate,
        factor: corporateActions.factor,
      })
      .from(corporateActions),
    db
      .select({
        symbol: dividends.symbol,
        exDate: dividends.exDate,
        amount: dividends.amount,
      })
      .from(dividends),
    db
      .select({ date: indexPrices.date, close: indexPrices.close })
      .from(indexPrices)
      .orderBy(asc(indexPrices.date)),
  ]);
  const { quotes: liveMap, tasi: liveTasi } = live;

  const actionsMap = new Map<string, CorporateAction[]>();
  for (const a of actionRows) {
    const key = a.symbol.trim();
    const list = actionsMap.get(key) ?? [];
    list.push({ actionDate: a.actionDate, factor: a.factor });
    actionsMap.set(key, list);
  }

  const divsMap = new Map<string, DividendEvent[]>();
  for (const d of divRows) {
    const key = d.symbol.trim();
    const list = divsMap.get(key) ?? [];
    list.push({ exDate: d.exDate, amount: d.amount });
    divsMap.set(key, list);
  }

  // Each company's TASI end value and baseline are matched to that company's price basis
  // (tasiLatestFor, tasiBaselineFor) so alpha never compares a live company return against
  // a stale index, or the reverse.
  return ipoRows
    .map((r) => ({ ...r, symbol: r.symbol.trim() }))
    .map((row) => {
      const chosen = chooseLatest(latest.get(row.symbol), liveMap.get(row.symbol));
      return computeMetrics(
        row,
        chosen,
        early.get(row.symbol),
        actionsMap.get(row.symbol) ?? [],
        divsMap.get(row.symbol) ?? [],
        tasiBaselineFor(row.ipoDate, tasiRows),
        tasiLatestFor(chosen, tasiRows, liveTasi),
        row.minAllocationShares,
      );
    })
    .sort((a, b) => (a.ipoDate < b.ipoDate ? 1 : -1));
}

// A fixed 10,000 SAR application to every IPO, valued on the shares actually allotted. The
// illustration amount; every SAR figure scales linearly with it.
const INVESTMENT_AMOUNT_SAR = 10000;

// What 10,000 SAR subscribed to each IPO would have become, on the shares you would actually
// have been allotted (minimum allocation plus the pro-rata factor on the remainder). Ranks by
// the actual money made, since the allotment, not the headline return, is what differs. A
// company with no allocation factor on record or no current price is left unranked, not guessed.
export async function getInvestmentOutcomes(): Promise<InvestmentOutcome[]> {
  const [ipoRows, latest, live, actionRows, divRows] = await Promise.all([
    db
      .select({
        symbol: companies.symbol,
        nameEn: companies.nameEn,
        nameAr: companies.nameAr,
        ipoDate: ipos.ipoDate,
        offerPrice: ipos.offerPrice,
        minAllocationShares: ipos.minAllocationShares,
        allocationFactor: ipos.allocationFactor,
        allocationVerified: ipos.allocationVerified,
      })
      .from(ipos)
      .innerJoin(companies, eq(companies.symbol, ipos.symbol)),
    latestCloseMap(),
    liveQuotesAll(),
    db
      .select({
        symbol: corporateActions.symbol,
        actionDate: corporateActions.actionDate,
        factor: corporateActions.factor,
      })
      .from(corporateActions),
    db
      .select({ symbol: dividends.symbol, exDate: dividends.exDate, amount: dividends.amount })
      .from(dividends),
  ]);
  const { quotes: liveMap } = live;

  const actionsMap = new Map<string, CorporateAction[]>();
  for (const a of actionRows) {
    const key = a.symbol.trim();
    const list = actionsMap.get(key) ?? [];
    list.push({ actionDate: a.actionDate, factor: a.factor });
    actionsMap.set(key, list);
  }
  const divsMap = new Map<string, DividendEvent[]>();
  for (const d of divRows) {
    const key = d.symbol.trim();
    const list = divsMap.get(key) ?? [];
    list.push({ exDate: d.exDate, amount: d.amount });
    divsMap.set(key, list);
  }

  const outcomes = ipoRows
    .map((r) => ({ ...r, symbol: r.symbol.trim() }))
    .map((r): InvestmentOutcome => {
      const chosen = chooseLatest(latest.get(r.symbol), liveMap.get(r.symbol));
      const hasFactor = r.allocationFactor !== null;
      const out: InvestmentOutcome = {
        symbol: r.symbol,
        nameEn: r.nameEn,
        nameAr: r.nameAr,
        ipoDate: r.ipoDate,
        offerPrice: r.offerPrice,
        currentDate: chosen?.date ?? null,
        allocationVerified: r.allocationVerified,
        hasFactor,
        allottedShares: null,
        capitalDeployed: null,
        currentValue: null,
        dividendsReceived: null,
        netProfit: null,
        returnPct: null,
        bonusIncreasedShares: false,
      };
      if (!chosen) return out;

      const actions = actionsMap.get(r.symbol) ?? [];
      const divs = divsMap.get(r.symbol) ?? [];
      const alloc = allocatedShares({
        amountSar: INVESTMENT_AMOUNT_SAR,
        offerPrice: r.offerPrice,
        allocationFactorPercent: r.allocationFactor,
        minAllocationShares: r.minAllocationShares,
      });
      if (alloc === null) return out;

      const basis: OutcomeBasis = {
        offerPrice: new Decimal(r.offerPrice).toString(),
        cumulativeFactor: cumulativeFactorAfter(actions, r.ipoDate).toString(),
        latestClose: new Decimal(chosen.close).toString(),
        dividendsPerCurrentShare: cumulativeAdjustedDividends(divs, actions, chosen.date).toString(),
        minAllocationShares: alloc.toString(),
      };
      const o = outcomeForShares(basis, alloc.toString());
      return {
        ...out,
        allottedShares: o.shares,
        capitalDeployed: o.capitalDeployed,
        // Total position value: the shares at the current price plus the dividends collected,
        // so currentValue minus capitalDeployed reconciles with netProfit.
        currentValue: o.currentValue + o.dividendsReceived,
        dividendsReceived: o.dividendsReceived,
        netProfit: o.netSar,
        returnPct: o.returnPct,
        bonusIncreasedShares: o.bonusIncreasedShares,
      };
    });

  // Rank by the actual money made. Unrankable rows (no factor or no price) sort last, newest
  // first, so they read as a clear "not yet computable" tail rather than as zero-return rows.
  return outcomes.sort((a, b) => {
    if (a.netProfit === null && b.netProfit === null) return a.ipoDate < b.ipoDate ? 1 : -1;
    if (a.netProfit === null) return 1;
    if (b.netProfit === null) return -1;
    return b.netProfit - a.netProfit;
  });
}

export async function getCohorts(): Promise<CohortSummary[]> {
  return summarizeCohorts(await getAllCompanyMetrics());
}

export function summarizeCohorts(all: CompanyMetrics[]): CohortSummary[] {
  const byYear = new Map<number, CompanyMetrics[]>();
  for (const c of all) {
    const y = ipoYear(c.ipoDate);
    const list = byYear.get(y) ?? [];
    list.push(c);
    byYear.set(y, list);
  }

  const cohorts: CohortSummary[] = [];
  for (const [year, list] of byYear) {
    const returns = list
      .map((c) => c.totalReturn)
      .filter((x): x is number => x !== null);
    const withReturn = list.filter((c) => c.totalReturn !== null);
    const best = withReturn.reduce<CompanyMetrics | null>(
      (acc, c) => (acc === null || c.totalReturn! > acc.totalReturn! ? c : acc),
      null,
    );
    const worst = withReturn.reduce<CompanyMetrics | null>(
      (acc, c) => (acc === null || c.totalReturn! < acc.totalReturn! ? c : acc),
      null,
    );
    cohorts.push({
      year,
      count: list.length,
      verifiedCount: list.filter((c) => c.verified).length,
      avgTotalReturn: mean(returns),
      medianTotalReturn: median(returns),
      positiveCount: returns.filter((r) => r > 0).length,
      best: best
        ? { symbol: best.symbol, nameEn: best.nameEn, totalReturn: best.totalReturn! }
        : null,
      worst: worst
        ? { symbol: worst.symbol, nameEn: worst.nameEn, totalReturn: worst.totalReturn! }
        : null,
    });
  }
  return cohorts.sort((a, b) => b.year - a.year);
}

export async function getSymbols(): Promise<string[]> {
  const rows = await db.select({ symbol: companies.symbol }).from(companies);
  return rows.map((r) => r.symbol.trim());
}

function downsample<T>(xs: T[], target = 400): T[] {
  if (xs.length <= target) return xs;
  const step = Math.ceil(xs.length / target);
  const out = xs.filter((_, i) => i % step === 0);
  if (out[out.length - 1] !== xs[xs.length - 1]) out.push(xs[xs.length - 1]);
  return out;
}

export async function getCompanyDetail(
  symbol: string,
): Promise<CompanyDetail | null> {
  const ipoRows = await db
    .select({
      symbol: companies.symbol,
      nameEn: companies.nameEn,
      nameAr: companies.nameAr,
      sector: companies.sector,
      ipoDate: ipos.ipoDate,
      offerPrice: ipos.offerPrice,
      nominalValue: ipos.nominalValue,
      verified: ipos.verified,
      dataCaveat: companies.dataCaveat,
      shares: ipos.sharesOffered,
      proceeds: ipos.proceedsSar,
      oversubscription: ipos.oversubscription,
      recurringEpsTtm: ipos.recurringEpsTtm,
      bookValuePerShare: ipos.bookValuePerShare,
      valuationSourceUrl: ipos.valuationSourceUrl,
      retailTranchePct: ipos.retailTranchePct,
      retailSharesOffered: ipos.retailSharesOffered,
      minAllocationShares: ipos.minAllocationShares,
      individualSubscribersCount: ipos.individualSubscribersCount,
      retailCoverageMultiple: ipos.retailCoverageMultiple,
      institutionalCoverageMultiple: ipos.institutionalCoverageMultiple,
      allocationFactor: ipos.allocationFactor,
      retailSubscriptionStart: ipos.retailSubscriptionStart,
      retailSubscriptionEnd: ipos.retailSubscriptionEnd,
      allocationSourceUrl: ipos.allocationSourceUrl,
      allocationVerified: ipos.allocationVerified,
      sourceUrl: ipos.sourceUrl,
    })
    .from(ipos)
    .innerJoin(companies, eq(companies.symbol, ipos.symbol))
    .where(eq(ipos.symbol, symbol));

  if (ipoRows.length === 0) return null;
  const r = ipoRows[0];
  const sym = r.symbol.trim();

  const [priceRows, tasiRows, divRows, actionRows, advisorRows, live] = await Promise.all([
    db
      .select({
        date: pricesDaily.date,
        open: pricesDaily.open,
        high: pricesDaily.high,
        low: pricesDaily.low,
        close: pricesDaily.close,
        volume: pricesDaily.volume,
      })
      .from(pricesDaily)
      .where(eq(pricesDaily.symbol, sym))
      .orderBy(asc(pricesDaily.date)),
    db
      .select({ date: indexPrices.date, close: indexPrices.close })
      .from(indexPrices)
      .orderBy(asc(indexPrices.date)),
    db
      .select({ exDate: dividends.exDate, amount: dividends.amount, verified: dividends.verified })
      .from(dividends)
      .where(eq(dividends.symbol, sym))
      .orderBy(asc(dividends.exDate)),
    db
      .select({
        actionDate: corporateActions.actionDate,
        kind: corporateActions.kind,
        factor: corporateActions.factor,
        sourceUrl: corporateActions.sourceUrl,
      })
      .from(corporateActions)
      .where(eq(corporateActions.symbol, sym))
      .orderBy(asc(corporateActions.actionDate)),
    db
      .select({ name: ipoAdvisors.name, role: ipoAdvisors.role })
      .from(ipoAdvisors)
      .where(eq(ipoAdvisors.symbol, sym))
      .orderBy(asc(ipoAdvisors.id)),
    liveQuotesAll([sym, "TASI"]),
  ]);

  const actions: CorporateAction[] = actionRows.map((a) => ({
    actionDate: a.actionDate,
    factor: a.factor,
  }));
  const divs: DividendEvent[] = divRows.map((d) => ({ exDate: d.exDate, amount: d.amount }));

  // The latest stored close (yfinance end-of-day), then the price the headline and the
  // returns actually run on: the live Sahmk quote when fresh, else that close.
  const eodLatest: EodClose | undefined =
    priceRows.length > 0
      ? { date: priceRows[priceRows.length - 1].date, close: priceRows[priceRows.length - 1].close }
      : undefined;
  const chosen = chooseLatest(eodLatest, live.quotes.get(sym));

  const early =
    priceRows.length >= EARLY_RETURN_TRADING_DAYS
      ? {
          date: priceRows[EARLY_RETURN_TRADING_DAYS - 1].date,
          close: priceRows[EARLY_RETURN_TRADING_DAYS - 1].close,
          firstDate: priceRows[0].date,
        }
      : undefined;

  // Match the TASI end value and baseline to the company's price basis (live-with-live,
  // eod-with-eod) so alpha is measured to the same point in time. See getAllCompanyMetrics.
  const tasiLatest = tasiLatestFor(chosen, tasiRows, live.tasi);
  const tasiBaseline = tasiBaselineFor(r.ipoDate, tasiRows);

  const metrics = computeMetrics(
    {
      symbol: sym,
      nameEn: r.nameEn,
      nameAr: r.nameAr,
      sector: r.sector,
      ipoDate: r.ipoDate,
      offerPrice: r.offerPrice,
      nominalValue: r.nominalValue,
      verified: r.verified,
      dataCaveat: r.dataCaveat,
    },
    chosen,
    early,
    actions,
    divs,
    tasiBaseline,
    tasiLatest,
    r.minAllocationShares,
  );

  // One pass over the price series builds the indexed-to-100 chart series and finds the
  // highest close (for the drawdown). Both chart lines start at 100 on the first company
  // price date. Closes are in current-share basis, so the max is found by a plain numeric
  // compare and the peak row carries forward for the drawdown.
  const tasiByDate = new Map(tasiRows.map((t) => [t.date, Number(t.close)]));
  const series: SeriesPoint[] = [];
  let companyBase: number | null = null;
  let tasiBase: number | null = null;
  let lastTasi: number | null = null;
  let peakRow: { date: string; close: string } | null = null;
  let peakCloseNum = -Infinity;
  for (const p of priceRows) {
    const c = Number(p.close);
    if (tasiByDate.has(p.date)) lastTasi = tasiByDate.get(p.date)!;
    if (companyBase === null) {
      companyBase = c;
      tasiBase = lastTasi;
    }
    if (c > peakCloseNum) {
      peakCloseNum = c;
      peakRow = p;
    }
    series.push({
      date: p.date,
      company: companyBase ? (c / companyBase) * 100 : null,
      tasi: lastTasi !== null && tasiBase ? (lastTasi / tasiBase) * 100 : null,
    });
  }

  // Reconcile the chart's final point with the headline current price and the vs-TASI
  // alpha, which all run on the chosen (live) quote. When a live quote won, its indexed
  // point either extends the series (a newer date) or replaces the last stored session
  // (the same date, which chooseLatest breaks toward the live price), so the chart endpoint
  // and the headline never disagree. The TASI end uses the same level the alpha used.
  const lastSeriesDate = series.length ? series[series.length - 1].date : null;
  if (chosen && chosen.quoteTime !== null && companyBase) {
    const tasiNum = tasiLatest !== null ? Number(tasiLatest) : lastTasi;
    const livePoint: SeriesPoint = {
      date: chosen.date,
      company: (Number(chosen.close) / companyBase) * 100,
      tasi: tasiNum !== null && tasiBase ? (tasiNum / tasiBase) * 100 : null,
    };
    if (lastSeriesDate === null || chosen.date > lastSeriesDate) {
      series.push(livePoint);
    } else if (chosen.date === lastSeriesDate) {
      series[series.length - 1] = livePoint;
    }
  }

  // Dividends since IPO: each amount adjusted to current-share basis, with a running
  // cumulative. The final cumulative equals metrics.cumulativeDividends.
  let runningCum = new Decimal(0);
  const dividendRows = divRows.map((d) => {
    const adj = new Decimal(d.amount).div(cumulativeFactorAfter(actions, d.exDate));
    runningCum = runningCum.add(adj);
    return {
      exDate: d.exDate,
      amount: d.amount,
      adjustedAmount: adj.toFixed(4),
      cumulative: runningCum.toFixed(4),
      verified: d.verified,
    };
  });

  const aop = adjustedOfferPrice(r.offerPrice, r.ipoDate, actions);
  const totalDividends = dividendRows.length ? runningCum.toFixed(4) : null;
  const dividendYieldOnOffer = dividendRows.length ? runningCum.div(aop).toNumber() : null;
  const premium =
    r.nominalValue !== null
      ? new Decimal(r.offerPrice).minus(new Decimal(r.nominalValue)).toFixed(4)
      : null;

  // First trading day figures, only when the series actually starts at the listing.
  // A gapped early series (data beginning long after the IPO) leaves debut empty
  // rather than reporting a much-later session as day one.
  const firstRow = priceRows[0];
  const debut: DebutStats | null =
    firstRow && firstSessionIsClean(r.ipoDate, firstRow.date)
      ? {
          date: firstRow.date,
          return: priceReturn(r.offerPrice, r.ipoDate, firstRow.close, actions).toNumber(),
          rangePct:
            firstRow.open && firstRow.high && firstRow.low && Number(firstRow.open) > 0
              ? intradayRange(firstRow.open, firstRow.high, firstRow.low).toNumber()
              : null,
          turnover:
            firstRow.volume !== null
              ? sessionTurnover(firstRow.volume.toString(), firstRow.close).toFixed(2)
              : null,
        }
      : null;

  // Drawdown from the highest close (found in the series pass above). The chosen current
  // price (the live quote when fresh) is also a peak candidate, so a fresh new high above
  // every stored close reads as a flat drawdown rather than a positive one. Requires a
  // real stored history (peakRow) so a lone live quote with no price series shows no peak.
  const peakRowEff =
    peakRow && chosen && Number(chosen.close) > peakCloseNum
      ? { date: chosen.date, close: chosen.close }
      : peakRow;
  const peak: PeakStats | null =
    chosen && peakRowEff
      ? {
          date: peakRowEff.date,
          close: peakRowEff.close,
          drawdown: drawdownFromPeak(chosen.close, peakRowEff.close).toNumber(),
        }
      : null;

  const tradingSessions = priceRows.length;
  const isNewlyListed = tradingSessions > 0 && tradingSessions < NEWLY_LISTED_MAX_SESSIONS;

  // What a minimum-allocation subscriber would hold today. Computable only when a
  // minimum allocation is on record and there is a price to value it; the calculator
  // composes the tested return engine, so a bonus or dividend is handled once.
  const retail = retailOutcome({
    offerPrice: r.offerPrice,
    minAllocationShares: r.minAllocationShares,
    ipoDate: r.ipoDate,
    latestClose: chosen ? chosen.close : null,
    asOfDate: chosen ? chosen.date : null,
    actions,
    dividends: divs,
  });

  // Allocation and subscription facts, present when the company disclosed any of them or
  // any advisor is on record. Each field stays null when not sourced; nothing is guessed.
  // receiving_agent advisors are not shown. The role is dropped from the dataset and the
  // ingest, and kept out of the role label map, so this guards a stale pre-removal row from
  // rendering as a bare, untranslated "receiving_agent". The enum value is retained in the
  // schema because dropping a Postgres enum value is a fragile migration.
  const advisors: Advisor[] = advisorRows
    .filter((a) => a.role !== "receiving_agent")
    .map((a) => ({ name: a.name, role: a.role }));
  const subscriptionDays =
    r.retailSubscriptionStart && r.retailSubscriptionEnd
      ? daysInclusive(r.retailSubscriptionStart, r.retailSubscriptionEnd)
      : null;
  const allocationFields = [
    r.retailTranchePct,
    r.retailSharesOffered,
    r.minAllocationShares,
    r.individualSubscribersCount,
    r.retailCoverageMultiple,
    r.institutionalCoverageMultiple,
    r.allocationFactor,
    r.retailSubscriptionStart,
    r.retailSubscriptionEnd,
  ];
  const hasAllocation = advisors.length > 0 || allocationFields.some((v) => v !== null);
  const allocation: AllocationDetails | null = hasAllocation
    ? {
        retailTranchePct: r.retailTranchePct,
        retailSharesOffered: r.retailSharesOffered,
        minAllocationShares: r.minAllocationShares,
        individualSubscribersCount: r.individualSubscribersCount,
        retailCoverageMultiple: r.retailCoverageMultiple,
        institutionalCoverageMultiple: r.institutionalCoverageMultiple,
        allocationFactor: r.allocationFactor,
        subscriptionStart: r.retailSubscriptionStart,
        subscriptionEnd: r.retailSubscriptionEnd,
        subscriptionDays,
        sourceUrl: r.allocationSourceUrl,
        verified: r.allocationVerified,
        advisors,
      }
    : null;

  // Offer-price valuation, present only when a per-share figure was sourced from the
  // prospectus. The multiples are computed against the offer price; a non-positive
  // EPS or book value leaves that multiple empty rather than showing a nonsense ratio.
  const valuation: IpoValuation | null =
    r.recurringEpsTtm !== null || r.bookValuePerShare !== null
      ? {
          recurringEpsTtm: r.recurringEpsTtm,
          bookValuePerShare: r.bookValuePerShare,
          peRecurringTtm:
            r.recurringEpsTtm !== null && Number(r.recurringEpsTtm) > 0
              ? offerMultiple(r.offerPrice, r.recurringEpsTtm).toNumber()
              : null,
          priceToBook:
            r.bookValuePerShare !== null && Number(r.bookValuePerShare) > 0
              ? offerMultiple(r.offerPrice, r.bookValuePerShare).toNumber()
              : null,
          sourceUrl: r.valuationSourceUrl,
        }
      : null;

  return {
    metrics,
    shares: r.shares !== null ? String(r.shares) : null,
    proceeds: r.proceeds,
    oversubscription: r.oversubscription,
    nominalValue: r.nominalValue,
    premium,
    sourceUrl: r.sourceUrl,
    series: downsample(series, 400),
    dividends: dividendRows,
    totalDividends,
    dividendYieldOnOffer,
    actions: actionRows.map((a) => ({
      actionDate: a.actionDate,
      kind: a.kind,
      factor: a.factor,
      sourceUrl: a.sourceUrl,
    })),
    debut,
    peak,
    valuation,
    retailOutcome: retail,
    allocation,
    tradingSessions,
    isNewlyListed,
  };
}
