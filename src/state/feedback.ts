import type { Puzzle } from '../puzzle/types';
import type { Progress } from './persistence';

export type CheckedAnswers = Record<string, string>;
export type PuzzleStatus = 'pending' | 'ready' | 'correct' | 'wrong';
export const CHECKED_KEY = 'self-referential-puzzle-checked-v1';

export function currentAnswer(progress: Progress, puzzle: Puzzle): string | null {
  const marks = progress[puzzle.id];
  if (!marks || marks.length !== puzzle.questions.length || !marks.every(mark => mark.selected)) return null;
  return marks.map(mark => mark.selected).join('');
}

export function puzzleStatus(puzzle: Puzzle, progress: Progress, solutions: Readonly<Record<string, string>>, checked: CheckedAnswers): PuzzleStatus {
  const answer = currentAnswer(progress, puzzle);
  if (!answer) return 'pending';
  if (puzzle.type === 'example' || checked[puzzle.id] === answer) {
    return answer === solutions[puzzle.id] ? 'correct' : 'wrong';
  }
  return 'ready';
}

export function restoreChecked(raw: string | null, puzzles: readonly Puzzle[], progress: Progress): CheckedAnswers {
  if (!raw) return {};
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
    const source = parsed as Record<string, unknown>;
    return Object.fromEntries(puzzles.filter(puzzle => puzzle.type !== 'example' && source[puzzle.id] === currentAnswer(progress, puzzle))
      .map(puzzle => [puzzle.id, source[puzzle.id] as string]));
  } catch { return {}; }
}
