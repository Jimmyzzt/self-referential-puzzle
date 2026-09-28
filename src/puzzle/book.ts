import { parseChapter } from './parser';
import { solvePuzzle } from './solver';
import type { Chapter, Puzzle } from './types';

const sources = import.meta.glob('../content/*.puzzle.markdown', { query: '?raw', import: 'default', eager: true }) as Record<string, string>;
export const chapters: Chapter[] = Object.entries(sources)
  .map(([path, source]) => parseChapter(source, path))
  .sort((a, b) => a.id - b.id);
export const puzzles: Puzzle[] = chapters.flatMap(chapter => chapter.puzzles);
if (!chapters.length || new Set(chapters.map(chapter => chapter.id)).size !== chapters.length) {
  throw new Error('Missing or duplicate chapter source');
}
if (new Set(puzzles.map(puzzle => puzzle.id)).size !== puzzles.length) {
  throw new Error('Duplicate puzzle ID across chapters');
}

export const verifiedSolutions: Record<string, string> = Object.fromEntries(puzzles.map(puzzle => {
  const result = solvePuzzle(puzzle);
  if (result.solutionCount !== 1 || result.solutions[0] !== puzzle.declaredSolution) {
    throw new Error(`${puzzle.id} failed solution validation`);
  }
  return [puzzle.id, result.solutions[0]];
}));
