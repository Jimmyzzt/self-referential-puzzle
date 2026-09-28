import { loadChapters } from './load-puzzles';
import { solvePuzzle } from '../src/puzzle/solver';

let failures = 0;
const chapters = loadChapters();
const puzzles = chapters.flatMap(chapter => chapter.puzzles);
const sourceOrder = [
  ['Example1','Q1','Q2','Example2','Q3','Q4','Example3','Q5','Q6','Example4','Q7','Q8','Example5','Q9','Q10'],
  ['Example6','Q11','Q12','Example7','Q13','Q14','Q15','Q16'],
];
for (const [index, ids] of sourceOrder.entries()) {
  const actual = chapters.find(chapter => chapter.id === index + 1)?.puzzles.map(puzzle => puzzle.id);
  if (actual?.join(',') !== ids.join(',')) {
    console.error(`Chapter ${index + 1}: expected ${ids.join(', ')}, actual ${actual?.join(', ') ?? '(missing)'}`);
    failures++;
  }
}
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
