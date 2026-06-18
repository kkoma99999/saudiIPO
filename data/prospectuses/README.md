# Prospectus archive (نشرة الإصدار)

Local archive of each IPO's prospectus, the source for the offer-price valuation
inputs in `data/ipo_valuation.csv` (recurring EPS TTM and book value per share).

- `sources.csv` is the manifest: `symbol, company, slug, url`. It is tracked in git.
- The PDFs and their `pdftotext` dumps are NOT tracked (they are large). They are
  downloaded locally by `scripts/fetch_prospectuses.py` from the `url` in the manifest.
- Each PDF is named `{slug}_{symbol}.pdf`, for example `nahdi_4164.pdf`.

Nothing here is fabricated. A prospectus with no usable figure leaves its row in
`data/ipo_valuation.csv` empty.
