import { loadChapters } from './load-puzzles';
import { solvePuzzle } from '../src/puzzle/solver';

let failures = 0;
const chapters = loadChapters();
const puzzles = chapters.flatMap(chapter => chapter.puzzles);
const sourceOrder = [
  ['Example1-1','Q1-1','Q1-2','Example1-2','Q1-3','Q1-4','Example1-3','Q1-5','Q1-6','Example1-4','Q1-7','Q1-8','Example1-5','Q1-9','Q1-10'],
  ['Example2-1','Q2-1','Q2-2','Example2-2','Q2-3','Q2-4','Q2-5','Q2-6'],
];
for (const [index, ids] of sourceOrder.entries()) {
  const actual = chapters.find(chapter => chapter.id === index + 1)?.puzzles.map(puzzle => puzzle.id);
  // Preserve every PDF group and its relative order while allowing new bonus groups.
  if (actual?.filter(id => ids.includes(id)).join(',') !== ids.join(',')) {
    console.error(`Chapter ${index + 1}: expected ${ids.join(', ')}, actual ${actual?.join(', ') ?? '(missing)'}`);
    failures++;
  }
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
