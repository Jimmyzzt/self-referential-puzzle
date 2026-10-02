import { readFileSync } from 'node:fs';
import { parseChapter } from '../src/puzzle/parser';
import { solvePuzzle } from '../src/puzzle/solver';
import { selectPuzzles } from '../src/puzzle/ids';
import { loadChapters } from './load-puzzles';

const request = process.argv[2];
if (!request) {
  console.error('Usage: npm run puzzles:solve -- <q1-1|e1-1|q2-A|ch1|chapter.puzzle.md|all>');
  process.exit(2);
}
const puzzles = request.toLowerCase().endsWith('.puzzle.md')
  ? parseChapter(readFileSync(request, 'utf8'), request).puzzles
  : selectPuzzles(loadChapters(), request);
if (!puzzles.length) {
  console.error(`Puzzle not found: ${request}`);
  process.exit(2);
}
for (const puzzle of puzzles) {
  try {
    const result = solvePuzzle(puzzle);
    console.log(`${puzzle.id}: ${result.solutionCount} solution(s)${result.solutions.length ? ` — ${result.solutions.join(', ')}` : ''}`);
  } catch (error) {
    console.error(`${puzzle.id}: ${(error as Error).message}`);
    process.exitCode = 1;
  }
}
