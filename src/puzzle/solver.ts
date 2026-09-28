import { isSolution } from './evaluator';
import { LABELS, type Label, type Puzzle } from './types';

export interface SolveResult { solutionCount: number; solutions: string[] }

export function solvePuzzle(puzzle: Puzzle): SolveResult {
  if (puzzle.status === 'incomplete') throw new Error(`${puzzle.id} is marked incomplete and cannot be solved`);
  const solutions: string[] = [];
  const answers: Label[] = [];
  function visit(depth: number) {
    if (depth === puzzle.questions.length) {
      if (isSolution(puzzle, answers)) solutions.push(answers.join(''));
      return;
    }
    for (const label of LABELS) {
      answers.push(label);
      visit(depth + 1);
      answers.pop();
    }
  }
  visit(0);
  return { solutionCount: solutions.length, solutions };
}
