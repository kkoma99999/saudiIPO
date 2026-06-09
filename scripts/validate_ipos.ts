// Validates the structure of data/ipos.csv before it becomes the seed dataset.
// Run: npm run validate:ipos   (or: tsx scripts/validate_ipos.ts <path>)
//
// Rules (per row):
//   1. symbol is exactly 4 digits
//   2. symbol is unique across the file
//   3. ipo_date is YYYY-MM-DD, between 2018-01-01 and today
//   4. offer_price > 0 when present (empty is allowed)
//   5. source_url is present and a valid http/https URL
//   6. verified is a boolean (true/false/1/0, empty means false)
//
// Prints a per-row pass or fail report and exits non-zero if any row fails.

import { readFileSync, existsSync } from "node:fs";

const EXPECTED_HEADER = [
  "symbol",
  "name_en",
  "name_ar",
  "sector",
  "ipo_date",
  "offer_price",
  "shares_offered",
  "proceeds_sar",
  "oversubscription",
  "source_url",
  "verified",
];

const MIN_DATE = "2018-01-01";

function parseCsv(text: string): string[][] {
  // Strip a leading BOM if present.
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);

  const rows: string[][] = [];
  let field = "";
  let row: string[] = [];
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += c;
      }
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ",") {
      row.push(field);
      field = "";
    } else if (c === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else if (c === "\r") {
      // Skip; CRLF is handled by the \n branch.
    } else {
      field += c;
    }
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  // Drop fully empty rows (blank lines).
  return rows.filter((r) => r.some((f) => f.trim() !== ""));
}

function isValidUrl(value: string): boolean {
  try {
    const u = new URL(value);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

function isValidDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const d = new Date(value + "T00:00:00Z");
  if (Number.isNaN(d.getTime())) return false;
  // Reject overflow like 2023-02-30 that Date silently rolls forward.
  return d.toISOString().slice(0, 10) === value;
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function validate(path: string): number {
  if (!existsSync(path)) {
    console.error(`FAIL: file not found: ${path}`);
    return 1;
  }

  const rows = parseCsv(readFileSync(path, "utf8"));
  if (rows.length === 0) {
    console.error(`FAIL: ${path} is empty (no header)`);
    return 1;
  }

  const header = rows[0].map((h) => h.trim());
  const headerOk =
    header.length === EXPECTED_HEADER.length &&
    header.every((h, i) => h === EXPECTED_HEADER[i]);
  if (!headerOk) {
    console.error("FAIL: header does not match expected columns.");
    console.error(`  expected: ${EXPECTED_HEADER.join(",")}`);
    console.error(`  found:    ${header.join(",")}`);
    return 1;
  }

  const dataRows = rows.slice(1);
  if (dataRows.length === 0) {
    console.log(`PASS: header valid, 0 data rows in ${path}`);
    return 0;
  }

  const today = todayIso();
  const seen = new Map<string, number>(); // symbol -> first row line number
  let failures = 0;

  dataRows.forEach((cells, idx) => {
    const line = idx + 2; // header is line 1
    const errors: string[] = [];
    const get = (name: string) =>
      (cells[EXPECTED_HEADER.indexOf(name)] ?? "").trim();

    if (cells.length !== EXPECTED_HEADER.length) {
      errors.push(`expected ${EXPECTED_HEADER.length} columns, found ${cells.length}`);
    }

    const symbol = get("symbol");
    if (!/^\d{4}$/.test(symbol)) {
      errors.push("symbol must be 4 digits");
    } else if (seen.has(symbol)) {
      errors.push(`duplicate symbol (first seen on line ${seen.get(symbol)})`);
    } else {
      seen.set(symbol, line);
    }

    const ipoDate = get("ipo_date");
    if (!isValidDate(ipoDate)) {
      errors.push("ipo_date must be YYYY-MM-DD");
    } else if (ipoDate < MIN_DATE || ipoDate > today) {
      errors.push(`ipo_date must be between ${MIN_DATE} and ${today}`);
    }

    const offerPrice = get("offer_price");
    if (offerPrice !== "") {
      const n = Number(offerPrice);
      if (!Number.isFinite(n) || n <= 0) {
        errors.push("offer_price must be > 0 when present");
      }
    }

    const sourceUrl = get("source_url");
    if (sourceUrl === "" || !isValidUrl(sourceUrl)) {
      errors.push("source_url missing or invalid");
    }

    const verified = get("verified").toLowerCase();
    if (!["", "true", "false", "1", "0"].includes(verified)) {
      errors.push("verified must be boolean");
    }

    if (errors.length === 0) {
      console.log(`PASS line ${line} ${symbol || "(no symbol)"}`);
    } else {
      failures++;
      console.log(`FAIL line ${line} ${symbol || "(no symbol)"}: ${errors.join("; ")}`);
    }
  });

  console.log("");
  console.log(
    `Summary: ${dataRows.length} rows, ${dataRows.length - failures} passed, ${failures} failed`,
  );
  return failures > 0 ? 1 : 0;
}

const path = process.argv[2] ?? "data/ipos.csv";
process.exit(validate(path));
