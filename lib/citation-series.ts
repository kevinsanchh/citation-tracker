// lib/citation-series.ts

// Citation numbers look like PAT + "20" + 2-digit series + 5-digit counter (e.g. PAT201116000).
// Each series is one officer/device. Add a series here when a new one shows up.
export const CITATION_SERIES = ["11"];

export function seriesPrefix(series: string): string {
  return `PAT20${series}`;
}

export function seriesFromCitationNumber(citationNumber: string): string {
  return citationNumber.slice(5, 7);
}
