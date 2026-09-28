import { readFileSync } from 'node:fs';
import { parsePuzzle } from '../src/puzzle/parser';
import { solvePuzzle } from '../src/puzzle/solver';
import { loadPuzzles } from './load-puzzles';

const request = process.argv[2];
if (!request) {
  console.error('Usage: npm run puzzles:solve -- <Q14|Example7|path|all>');
  process.exit(2);
}
const puzzles = request === 'all' ? loadPuzzles() : request.endsWith('.puzzle.md')
  ? [parsePuzzle(readFileSync(request, 'utf8'), request)]
  : loadPuzzles().filter(puzzle => puzzle.id.toLowerCase() === request.toLowerCase());
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
