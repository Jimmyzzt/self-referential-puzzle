// Only aggregate counts cross the public API. Rates are calculated when analysing these counts.
export type Cohort = 'high' | 'ordinary' | 'insufficient';
export interface Counts {
  players: number;
  firstCorrect: number;
  checks: number;
  correctChecks: number;
  solved: number;
  recovered: number;
}
export interface PuzzleStats {
  id: string;
  chapter: number;
  revision: string;
  questionCount: number;
  counts: Counts;
  cohorts: Record<Cohort, Counts>;
}
export interface StatsSnapshot {
  generatedAt: string;
  summary: { players: number; checks: number; events: number; returningPlayers: number; since: number | null };
  puzzles: PuzzleStats[];
  chapters: { chapter: number; players: number; completed: number }[];
  activity: { day: string; players: number; checks: number; events: number }[];
  distribution: { band: string; players: number }[];
}
export function emptyCounts(): Counts {
  return { players: 0, firstCorrect: 0, checks: 0, correctChecks: 0, solved: 0, recovered: 0 };
}
export function addCounts(target: Counts, source: Counts): void {
  for (const key of Object.keys(target) as (keyof Counts)[]) target[key] += source[key];
}
export function ratio(numerator: number, denominator: number): number | null {
  return denominator > 0 ? numerator / denominator : null;
}
export function percentage(numerator: number, denominator: number): string {
  const value = ratio(numerator, denominator);
  return value === null ? '—' : (value * 100).toFixed(1) + '%';
}
export function puzzleLink(id: string, bookUrl: string): string {
  return bookUrl + '#' + encodeURIComponent(id);
}
