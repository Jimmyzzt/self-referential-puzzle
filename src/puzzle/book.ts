import { parsePuzzle } from './parser';
import { solvePuzzle } from './solver';
import type { Puzzle } from './types';

const sources = import.meta.glob('../content/*.puzzle.md', { query: '?raw', import: 'default', eager: true }) as Record<string, string>;
export const puzzles: Puzzle[] = Object.entries(sources)
  .map(([path, source]) => parsePuzzle(source, path))
  .sort((a, b) => a.type === b.type
    ? Number(a.id.match(/\d+$/)?.[0]) - Number(b.id.match(/\d+$/)?.[0])
    : a.type === 'example' ? -1 : 1);

export const verifiedSolutions: Record<string, string> = Object.fromEntries(puzzles.map(puzzle => {
  const result = solvePuzzle(puzzle);
  if (result.solutionCount !== 1 || result.solutions[0] !== puzzle.declaredSolution) {
    throw new Error(`${puzzle.id} failed solution validation`);
  }
  return [puzzle.id, result.solutions[0]];
}));
