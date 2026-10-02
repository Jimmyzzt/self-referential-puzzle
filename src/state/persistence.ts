import { LABELS, type Label, type Puzzle } from '../puzzle/types';
import { storedPuzzleValue } from '../puzzle/ids';
import { emptyMarking, type QuestionMarking } from './markings';

export const STORAGE_KEY = 'self-referential-puzzle-progress-v2';
export const LEGACY_STORAGE_KEY = 'self-referential-puzzle-progress-v1';
export type Progress = Record<string, QuestionMarking[]>;

export function freshProgress(puzzles: readonly Puzzle[]): Progress {
  return Object.fromEntries(puzzles.map(puzzle => [puzzle.id, puzzle.questions.map((_, index) => ({
    ...emptyMarking(),
    selected: puzzle.type === 'example' && puzzle.revealedSolution
      ? puzzle.revealedSolution[index] as Label
      : null,
  }))]));
}

function isLabel(value: unknown): value is Label { return LABELS.includes(value as Label); }

export function restoreProgress(raw: string | null, puzzles: readonly Puzzle[]): Progress {
  const fresh = freshProgress(puzzles);
  if (!raw) return fresh;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return fresh;
    for (const puzzle of puzzles) {
      const candidate = storedPuzzleValue(parsed as Record<string, unknown>, puzzle);
      if (!Array.isArray(candidate)) continue;
      fresh[puzzle.id] = puzzle.questions.map((_, index) => {
        const item: unknown = candidate[index];
        if (!item || typeof item !== 'object' || Array.isArray(item)) return emptyMarking();
        const record = item as Record<string, unknown>;
        const selected = isLabel(record.selected) ? record.selected : null;
        const sourceManual = record.manualX;
        const manualX = Array.isArray(sourceManual)
          ? LABELS.filter(label => sourceManual.includes(label) && label !== selected)
          : [];
        return { manualX, selected };
      });
    }
  } catch { return fresh; }
  return fresh;
}

export function migrateLegacyProgress(raw: string | null, puzzles: readonly Puzzle[]): Progress {
  const progress = restoreProgress(raw, puzzles);
  const defaults = freshProgress(puzzles);
  for (const puzzle of puzzles) {
    if (puzzle.type === 'example' && progress[puzzle.id].every(marking => !marking.selected && marking.manualX.length === 0)) {
      progress[puzzle.id] = defaults[puzzle.id];
    }
  }
  return progress;
}

export function saveProgress(storage: Pick<Storage, 'setItem'>, progress: Progress): void {
  storage.setItem(STORAGE_KEY, JSON.stringify(progress));
}

export function clearProgress(storage: Pick<Storage, 'removeItem'>): void {
  storage.removeItem(STORAGE_KEY);
  storage.removeItem(LEGACY_STORAGE_KEY);
}
