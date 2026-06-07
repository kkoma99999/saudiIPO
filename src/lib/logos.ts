// Generated: symbols that have a logo in public/logos/. Sourced from the Tadawul
// Group resources CDN (tadawulgroup.sa/Resources/SEMOBILELOGOS/{symbol}.png).
// Companies not listed here fall back to a monogram tile.
export const LOGO_SYMBOLS = new Set<string>([
  "1111", "1182", "1183", "1321", "1322", "1323", "1324", "1833", "1834", "1835", "2081", "2082", "2083", "2084", "2222", "2223", "2281", "2282", "2283", "2284", "2285", "2286", "2287", "2381", "2382", "4013", "4014", "4015", "4016", "4017", "4018", "4019", "4071", "4072", "4081", "4082", "4083", "4084", "4142", "4143", "4161", "4162", "4163", "4164", "4165", "4192", "4193", "4194", "4261", "4262", "4263", "4264", "4265", "4322", "4325", "4326", "4327", "6014", "6015", "6018", "6019", "7202", "7203", "7204", "8313", 
]);

export function hasLogo(symbol: string): boolean {
  return LOGO_SYMBOLS.has(symbol);
}
