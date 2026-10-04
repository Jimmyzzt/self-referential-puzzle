import { expect, it } from 'vitest';
import { migrateChapter4Raw } from '../puzzle/ids';
import { parsePuzzle } from '../puzzle/parser';
import { restoreProgress } from './persistence';
import { restoreChecked } from './feedback';

const puzzle = parsePuzzle('# Q4-4\n@question 1 #A\nA: 1\nB: 0\nC: 0\nD: 0\nE: 0\n@solution A');

it('moves former Q4-5 progress and checked answers, discarding the deleted Q4-4', () => {
  const raw = JSON.stringify({
    'Q4-4': [{ selected: 'B', manualX: ['C'] }],
    'Q4-5': [{ selected: 'A', manualX: ['D'] }],
    'Q1-1': [{ selected: 'B' }],
  });
  const migrated = migrateChapter4Raw(raw);
  const progress = restoreProgress(migrated, [puzzle]);
  expect(progress['Q4-4'][0]).toEqual({ selected: 'A', manualX: ['D'] });
  expect(JSON.parse(migrated!)['Q1-1']).toEqual([{ selected: 'B' }]);
  expect(JSON.parse(migrated!)).not.toHaveProperty('Q4-5');
  expect(restoreChecked(migrateChapter4Raw('{"Q4-4":"B","Q4-5":"A"}'), [puzzle], progress)).toEqual({ 'Q4-4': 'A' });
  expect(restoreProgress(migrateChapter4Raw('{"Q4-4":[{"selected":"B"}]}'), [puzzle])['Q4-4'][0].selected).toBeNull();
});
