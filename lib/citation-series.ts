// lib/citation-series.ts

// Each series is one officer/device shown in the sidebar.
// - PAT series: PAT + "20" + 2-digit series + 5-digit counter (e.g. PAT201116000).
// - "REV": hand-entered citations like REV091626-41 or REV09232026-2 (date + that day's count).
// Add a series here when a new one shows up.
export const CITATION_SERIES = ["11", "REV"];

export function seriesPrefix(series: string): string {
  return series === "REV" ? "REV" : `PAT20${series}`;
}

export function seriesFromCitationNumber(citationNumber: string): string {
  return citationNumber.startsWith("REV") ? "REV" : citationNumber.slice(5, 7);
}
