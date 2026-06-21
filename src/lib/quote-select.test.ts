import { describe, it, expect } from "vitest";
import { chooseLatest } from "./quote-select";

const eod = { date: "2026-06-18", close: "100.00" };
const live = {
  price: "104.50",
  quoteTime: "2026-06-21T12:09:30+00:00",
  quoteDate: "2026-06-21",
  isDelayed: true,
};

describe("chooseLatest", () => {
  it("prefers a live quote whose market date is newer than the latest close", () => {
    const c = chooseLatest(eod, live);
    expect(c).not.toBeNull();
    expect(c!.close).toBe("104.50");
    expect(c!.date).toBe("2026-06-21"); // the quote's Riyadh date, used as the as-of
    expect(c!.quoteTime).toBe("2026-06-21T12:09:30+00:00");
    expect(c!.isDelayed).toBe(true);
  });

  it("breaks a same-day tie in favor of the live quote", () => {
    const sameDay = { ...live, quoteDate: "2026-06-18", quoteTime: "2026-06-18T12:00:00+00:00" };
    const c = chooseLatest(eod, sameDay)!;
    expect(c.close).toBe("104.50");
    expect(c.quoteTime).toBe("2026-06-18T12:00:00+00:00");
  });

  it("keeps the end-of-day close when the live quote is stale", () => {
    const stale = { ...live, quoteDate: "2026-06-10", quoteTime: "2026-06-10T12:00:00+00:00" };
    const c = chooseLatest(eod, stale)!;
    expect(c.close).toBe("100.00");
    expect(c.date).toBe("2026-06-18");
    expect(c.quoteTime).toBeNull(); // an end-of-day close carries no time
    expect(c.isDelayed).toBe(false);
  });

  it("ignores a non-positive live price and falls back to the close", () => {
    // A halted or not-yet-traded symbol that the source reports as 0 must not be shown
    // as a real price, even though its date is fresh.
    const zero = { ...live, price: "0" };
    const c = chooseLatest(eod, zero)!;
    expect(c.close).toBe("100.00");
    expect(c.quoteTime).toBeNull();
  });

  it("uses the end-of-day close when there is no live quote", () => {
    const c = chooseLatest(eod, undefined)!;
    expect(c.close).toBe("100.00");
    expect(c.quoteTime).toBeNull();
    expect(c.isDelayed).toBe(false);
  });

  it("uses the live quote when there is no stored close at all", () => {
    const c = chooseLatest(undefined, live)!;
    expect(c.close).toBe("104.50");
    expect(c.date).toBe("2026-06-21");
  });

  it("is null when there is neither a usable close nor a usable live quote", () => {
    expect(chooseLatest(undefined, undefined)).toBeNull();
    expect(chooseLatest(undefined, { ...live, price: "0" })).toBeNull();
  });
});
