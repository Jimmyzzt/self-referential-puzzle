import type { Catalog } from '../src/stats/protocol';
import { addCounts, emptyCounts, type Cohort, type Counts, type StatsSnapshot } from '../src/stats/analysis';

// JSON binds the catalog once, keeping this query below D1's parameter limit as the book grows.
const scope = [
  'WITH current AS (SELECT key AS puzzle_id, json_extract(value, \'$.revision\') AS revision FROM json_each(?)),',
  'scoped AS (SELECT a.* FROM attempts a JOIN current USING (puzzle_id, revision)),',
  'firsts AS (SELECT a.* FROM scoped a JOIN (SELECT player_id, puzzle_id, MIN(attempt_id) AS attempt_id FROM scoped GROUP BY player_id, puzzle_id) f USING (attempt_id)),',
  'scores AS (SELECT player_id, COUNT(*) AS total, SUM(correct) AS right FROM firsts GROUP BY player_id),',
  'per_player AS (SELECT player_id, puzzle_id, COUNT(*) AS checks, SUM(correct) AS correctChecks, MAX(correct) AS solved FROM scoped GROUP BY player_id, puzzle_id)',
].join(' ');

export async function readStats(db: D1Database, catalog: Catalog): Promise<StatsSnapshot> {
  const bind = JSON.stringify(catalog);
  const chapterSizes = new Map<number, number>();
  const puzzles = Object.entries(catalog).map(([id, version]) => {
    const chapter = Number(id.slice(1, id.indexOf('-')));
    chapterSizes.set(chapter, (chapterSizes.get(chapter) ?? 0) + 1);
    return { id, chapter, revision: version.revision, questionCount: version.questionCount,
      counts: emptyCounts(), cohorts: { high: emptyCounts(), ordinary: emptyCounts(), insufficient: emptyCounts() } };
  });
  const statements = [
    db.prepare(scope + ' SELECT p.puzzle_id AS id, '
      + 'CASE WHEN s.total - 1 < 8 THEN \'insufficient\' WHEN 5 * (s.right - f.correct) >= 4 * (s.total - 1) THEN \'high\' ELSE \'ordinary\' END AS cohort, '
      + 'COUNT(*) AS players, SUM(f.correct) AS firstCorrect, SUM(p.checks) AS checks, SUM(p.correctChecks) AS correctChecks, '
      + 'SUM(p.solved) AS solved, SUM(CASE WHEN f.correct = 0 AND p.solved = 1 THEN 1 ELSE 0 END) AS recovered '
      + 'FROM per_player p JOIN firsts f USING (player_id, puzzle_id) JOIN scores s USING (player_id) GROUP BY p.puzzle_id, cohort').bind(bind),
    db.prepare(scope + ' SELECT COUNT(DISTINCT a.player_id) AS players, COUNT(*) AS checks, COUNT(DISTINCT a.event_id) AS events, MIN(e.received_at) AS since, '
      + '(SELECT COUNT(*) FROM (SELECT player_id FROM scoped GROUP BY player_id HAVING COUNT(DISTINCT event_id) > 1)) AS returningPlayers '
      + 'FROM scoped a JOIN check_events e USING (event_id)').bind(bind),
    db.prepare(scope + ' SELECT chapter, COUNT(*) AS players, SUM(solved = total) AS completed FROM ('
      + 'SELECT p.player_id, CAST(substr(p.puzzle_id, 2, instr(p.puzzle_id, \'-\') - 2) AS INTEGER) AS chapter, SUM(p.solved) AS solved, '
      + '(SELECT COUNT(*) FROM current c WHERE CAST(substr(c.puzzle_id, 2, instr(c.puzzle_id, \'-\') - 2) AS INTEGER) = CAST(substr(p.puzzle_id, 2, instr(p.puzzle_id, \'-\') - 2) AS INTEGER)) AS total '
      + 'FROM per_player p GROUP BY player_id, chapter) GROUP BY chapter').bind(bind),
    db.prepare(scope + ' SELECT date(e.received_at / 1000, \'unixepoch\') AS day, COUNT(DISTINCT a.player_id) AS players, COUNT(*) AS checks, COUNT(DISTINCT a.event_id) AS events '
      + 'FROM scoped a JOIN check_events e USING (event_id) WHERE e.received_at >= ? GROUP BY day ORDER BY day').bind(bind, Date.now() - 30 * 86400000),
    db.prepare(scope + ' SELECT CASE WHEN tried <= 3 THEN \'1–3\' WHEN tried <= 8 THEN \'4–8\' WHEN tried <= 16 THEN \'9–16\' ELSE \'17+\' END AS band, COUNT(*) AS players '
      + 'FROM (SELECT player_id, COUNT(*) AS tried FROM per_player GROUP BY player_id) GROUP BY band').bind(bind),
  ];
  const [groups, totals, chapters, activity, distribution] = await db.batch(statements);
  const byId = new Map(puzzles.map(puzzle => [puzzle.id, puzzle]));
  for (const row of groups.results as (Counts & { id: string; cohort: Cohort })[]) {
    const puzzle = byId.get(row.id);
    if (!puzzle) continue;
    const counts: Counts = { players: Number(row.players), firstCorrect: Number(row.firstCorrect),
      checks: Number(row.checks), correctChecks: Number(row.correctChecks), solved: Number(row.solved), recovered: Number(row.recovered) };
    puzzle.cohorts[row.cohort] = counts;
    addCounts(puzzle.counts, counts);
  }
  const chapterRows = chapters.results as StatsSnapshot['chapters'];
  return {
    generatedAt: new Date().toISOString(), summary: totals.results[0] as StatsSnapshot['summary'], puzzles,
    chapters: Array.from(chapterSizes.keys()).map(chapter => chapterRows.find(row => row.chapter === chapter) ?? { chapter, players: 0, completed: 0 }),
    activity: activity.results as StatsSnapshot['activity'], distribution: distribution.results as StatsSnapshot['distribution'],
  };
}
