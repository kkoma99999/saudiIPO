// A "Source" link that points to Argaam is hidden across the site. Other sources
// (the prospectus, saudiexchange, financial news) still render their source link.
export function isArgaamUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  return url.toLowerCase().includes("argaam");
}
