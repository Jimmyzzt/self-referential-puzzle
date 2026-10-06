import { expect, it } from 'vitest';
import { emptyCounts, addCounts, percentage, puzzleLink } from './analysis';

it('keeps missing samples distinct from zero correctness and adds counts before computing rates', () => {
  expect(percentage(0, 0)).toBe('—');
  expect(percentage(0, 8)).toBe('0.0%');
  const totals = emptyCounts();
  addCounts(totals, {players:2, firstCorrect:1, checks:10, correctChecks:9, solved:2, recovered:1});
  addCounts(totals, {players:8, firstCorrect:2, checks:8, correctChecks:2, solved:2, recovered:0});
  expect(percentage(totals.firstCorrect, totals.players)).toBe('30.0%');
  expect(percentage(totals.correctChecks, totals.checks)).toBe('61.1%');
  expect(puzzleLink('Q4-B', 'https://jimmyzzt.github.io/self-referential-puzzle/')).toBe('https://jimmyzzt.github.io/self-referential-puzzle/#Q4-B');
});
