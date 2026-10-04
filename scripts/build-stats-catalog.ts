import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { loadPuzzles } from './load-puzzles';
import { solvePuzzle } from '../src/puzzle/solver';
import { puzzleRevision, type Catalog } from '../src/stats/protocol';

const puzzles: Catalog = {};
for (const puzzle of loadPuzzles().filter(puzzle => puzzle.type !== 'example')) {
  const result = solvePuzzle(puzzle);
  if (result.solutionCount !== 1 || result.solutions[0] !== puzzle.declaredSolution) {
    throw new Error(puzzle.id + ' failed solution validation');
  }
  puzzles[puzzle.id] = {
    revision: await puzzleRevision(puzzle), solution: result.solutions[0], questionCount: puzzle.questions.length,
  };
}
const schema = readFileSync('workers/migrations/0001_checks.sql', 'utf8')
  .split(';').map(statement => statement.trim()).filter(Boolean);
mkdirSync('workers/generated', { recursive: true });
writeFileSync('workers/generated/catalog.json', JSON.stringify({ puzzles, schema }, null, 2) + '\n');
console.log('Generated Worker catalog from ' + Object.keys(puzzles).length + ' solver-verified puzzles.');
