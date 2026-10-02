import { loadChapters } from './load-puzzles';
import { solvePuzzle } from '../src/puzzle/solver';

let failures = 0;
const chapters = loadChapters();
const puzzles = chapters.flatMap(chapter => chapter.puzzles);
// Chapter contents and display order come from the editable DSL, not a fixed ID list.
// Parsing already checks chapter prefixes, duplicate IDs, option types and references.
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
