import "server-only";
import Decimal from "decimal.js";
import { sql, eq, asc } from "drizzle-orm";
import { db } from "./client";
import {
  companies,
  ipos,
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
import { ipoYear } from "@/lib/format";
import type {
  IpoRow,
  CompanyMetrics,
  CohortSummary,
  CompanyDetail,
  DebutStats,
  IpoValuation,
  PeakStats,
  SeriesPoint,
} from "@/types/domain";

function isoMinusDays(iso: string, days: number): string {
  const d = new Date(iso + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() - days);
  return d.toISOString().slice(0, 10);
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
  latest: Latest | undefined,
  early: EarlyClose | undefined,
  actions: CorporateAction[],
  divs: DividendEvent[],
  tasiBaseline: string | null,
  tasiLatest: string | null,
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
  };
  if (!latest) return base;

  const asOf = latest.date;
  const aop = adjustedOfferPrice(row.offerPrice, row.ipoDate, actions);
  const pr = priceReturn(row.offerPrice, row.ipoDate, latest.close, actions).toNumber();
  const tr = totalReturn(row.offerPrice, row.ipoDate, latest.close, asOf, actions, divs).toNumber();

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
    currentPrice: latest.close,
    currentDate: asOf,
    priceReturn: pr,
    totalReturn: tr,
    yieldOnOffer: yld,
    cagr: cg,
    tasiReturn,
    alpha,
    cumulativeDividends: cumDiv.toNumber(),
    dividendCount: divs.filter((d) => d.exDate <= asOf).length,
  };
}

export async function getAllCompanyMetrics(): Promise<CompanyMetrics[]> {
  const [ipoRows, latest, early, actionRows, divRows, tasiRows] = await Promise.all([
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
      })
      .from(ipos)
      .innerJoin(companies, eq(companies.symbol, ipos.symbol)),
    latestCloseMap(),
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

  const tasiLatest = tasiRows.length ? tasiRows[tasiRows.length - 1].close : null;
  // First index close on or after the IPO, only when it is close enough to the IPO to
  // be a fair since-IPO baseline (see indexBaselineIsClean).
  const tasiBaseline = (ipoDate: string): string | null => {
    for (const t of tasiRows) {
      if (t.date >= ipoDate) {
        return indexBaselineIsClean(ipoDate, t.date) ? t.close : null;
      }
    }
    return null;
  };

  return ipoRows
    .map((r) => ({ ...r, symbol: r.symbol.trim() }))
    .map((row) =>
      computeMetrics(
        row,
        latest.get(row.symbol),
        early.get(row.symbol),
        actionsMap.get(row.symbol) ?? [],
        divsMap.get(row.symbol) ?? [],
        tasiBaseline(row.ipoDate),
        tasiLatest,
      ),
    )
    .sort((a, b) => (a.ipoDate < b.ipoDate ? 1 : -1));
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
      sourceUrl: ipos.sourceUrl,
    })
    .from(ipos)
    .innerJoin(companies, eq(companies.symbol, ipos.symbol))
    .where(eq(ipos.symbol, symbol));

  if (ipoRows.length === 0) return null;
  const r = ipoRows[0];
  const sym = r.symbol.trim();

  const [priceRows, tasiRows, divRows, actionRows] = await Promise.all([
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
  ]);

  const actions: CorporateAction[] = actionRows.map((a) => ({
    actionDate: a.actionDate,
    factor: a.factor,
  }));
  const divs: DividendEvent[] = divRows.map((d) => ({ exDate: d.exDate, amount: d.amount }));

  const latest =
    priceRows.length > 0
      ? { date: priceRows[priceRows.length - 1].date, close: priceRows[priceRows.length - 1].close }
      : undefined;

  const early =
    priceRows.length >= EARLY_RETURN_TRADING_DAYS
      ? {
          date: priceRows[EARLY_RETURN_TRADING_DAYS - 1].date,
          close: priceRows[EARLY_RETURN_TRADING_DAYS - 1].close,
          firstDate: priceRows[0].date,
        }
      : undefined;

  const tasiLatest = tasiRows.length ? tasiRows[tasiRows.length - 1].close : null;
  let tasiBaseline: string | null = null;
  for (const t of tasiRows) {
    if (t.date >= r.ipoDate) {
      tasiBaseline = indexBaselineIsClean(r.ipoDate, t.date) ? t.close : null;
      break;
    }
  }

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
    latest,
    early,
    actions,
    divs,
    tasiBaseline,
    tasiLatest,
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

  // Drawdown from the highest close (found in the series pass above).
  const peak: PeakStats | null =
    latest && peakRow
      ? {
          date: peakRow.date,
          close: peakRow.close,
          drawdown: drawdownFromPeak(latest.close, peakRow.close).toNumber(),
        }
      : null;

  const tradingSessions = priceRows.length;
  const isNewlyListed = tradingSessions > 0 && tradingSessions < NEWLY_LISTED_MAX_SESSIONS;

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
    tradingSessions,
    isNewlyListed,
  };
}
