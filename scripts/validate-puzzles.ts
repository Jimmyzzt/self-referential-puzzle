import { loadPuzzles } from './load-puzzles';
import { solvePuzzle } from '../src/puzzle/solver';

let failures = 0;
const puzzles = loadPuzzles();
const expected = [...Array.from({ length: 7 }, (_, index) => `Example${index + 1}`), ...Array.from({ length: 16 }, (_, index) => `Q${index + 1}`)];
for (const id of expected) if (!puzzles.some(puzzle => puzzle.id === id)) {
  console.error(`Missing puzzle: ${id}`);
  failures++;
}
for (const puzzle of puzzles) {
  try {
    const { solutionCount, solutions } = solvePuzzle(puzzle);
    const actual = solutions.join(', ') || '(none)';
    const errors: string[] = [];
    if (solutionCount !== 1) errors.push(`expected unique solution, actual ${solutionCount}: ${actual}`);
    if (!puzzle.declaredSolution) errors.push(`missing @solution; actual: ${actual}`);
    else if (!solutions.includes(puzzle.declaredSolution)) errors.push(`declared ${puzzle.declaredSolution}, actual: ${actual}`);
    if (puzzle.revealedSolution && !solutions.includes(puzzle.revealedSolution)) errors.push(`revealed ${puzzle.revealedSolution}, actual: ${actual}`);
    if (errors.length) { console.error(`${puzzle.id}: ${errors.join('; ')}`); failures++; }
    else console.log(`${puzzle.id}: ${solutionCount} solution (${actual})`);
  } catch (error) {
    console.error(`${puzzle.id}: ${(error as Error).message}`);
    failures++;
  }
}
console.log(`Validated ${puzzles.length} puzzles; ${failures} failure(s).`);
if (failures) process.exitCode = 1;
