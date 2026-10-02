import { expect, it } from 'vitest';
import { parsePuzzle } from '../puzzle/parser';
import { freshProgress, restoreProgress } from './persistence';
import { puzzleStatus, restoreChecked } from './feedback';

const puzzle = (id: string) => parsePuzzle(`# ${id}\n@question 1 #A\nA: 1\nB: 0\nC: 0\nD: 0\nE: 0\n@solution A`);
const first = puzzle('Q1-1');
const second = puzzle('Q2-1');
const third = puzzle('Q3-1');

it('migrates manual marks and correct/wrong checked results without leaking into chapter 3', () => {
  const puzzles = [first, second, third];
  const progress = restoreProgress(JSON.stringify({ Q1: [{ selected: 'A', manualX: ['B'] }], Q11: [{ selected: 'B', manualX: ['C'] }] }), puzzles);
  expect(progress['Q1-1'][0]).toEqual({ selected: 'A', manualX: ['B'] });
  expect(progress['Q2-1'][0]).toEqual({ selected: 'B', manualX: ['C'] });
  expect(progress['Q3-1']).toEqual(freshProgress([third])['Q3-1']);
  const checked = restoreChecked('{"Q1":"A","Q11":"B"}', puzzles, progress);
  expect(checked).toEqual({ 'Q1-1': 'A', 'Q2-1': 'B' });
  const solutions = { 'Q1-1': 'A', 'Q2-1': 'A' };
  expect(puzzleStatus(first, progress, solutions, checked)).toBe('correct');
  expect(puzzleStatus(second, progress, solutions, checked)).toBe('wrong');
});

it('prefers new keys, including cleared progress, over old keys', () => {
  const progress = restoreProgress('{"Q1":[{"selected":"A"}],"Q1-1":[{"selected":null,"manualX":[]}]}', [first]);
  expect(progress['Q1-1'][0].selected).toBeNull();
  expect(restoreChecked('{"Q1":"A","Q1-1":null}', [first], progress)).toEqual({});
});

it('migrates the former Example 6 to Example 2-1', () => {
  const example = parsePuzzle('# Example 2-1\n@question 1 #A\nA: 1\nB: 0\nC: 0\nD: 0\nE: 0\n@revealed A\n@solution A');
  expect(restoreProgress('{"Example6":[{"selected":"B","manualX":["C"]}]}', [example])['Example2-1'][0]).toEqual({ selected: 'B', manualX: ['C'] });
});
