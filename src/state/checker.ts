import type { Puzzle } from '../puzzle/types';
import type { Progress } from './persistence';

export type CheckResult = Record<string, 'correct' | 'wrong'>;
export const COOLDOWN_MS = 3000;

export function checkCompleted(puzzles: readonly Puzzle[], solutions: Readonly<Record<string, string>>, progress: Progress): CheckResult {
  const result: CheckResult = {};
  for (const puzzle of puzzles) {
    const markings = progress[puzzle.id];
    if (!markings || markings.length !== puzzle.questions.length || !markings.every(marking => marking.selected)) continue;
    result[puzzle.id] = markings.map(marking => marking.selected).join('') === solutions[puzzle.id] ? 'correct' : 'wrong';
  }
  return result;
}

export function beginCooldown(now: number): number { return now + COOLDOWN_MS; }
export function canCheck(now: number, until: number): boolean { return now >= until; }
