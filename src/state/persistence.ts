import { LABELS, type Label, type Puzzle } from '../puzzle/types';
import { emptyMarking, type QuestionMarking } from './markings';

export const STORAGE_KEY = 'self-referential-puzzle-progress-v1';
export type Progress = Record<string, QuestionMarking[]>;

export function freshProgress(puzzles: readonly Puzzle[]): Progress {
  return Object.fromEntries(puzzles.map(puzzle => [puzzle.id, puzzle.questions.map(emptyMarking)]));
}

function isLabel(value: unknown): value is Label { return LABELS.includes(value as Label); }

export function restoreProgress(raw: string | null, puzzles: readonly Puzzle[]): Progress {
  const fresh = freshProgress(puzzles);
  if (!raw) return fresh;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return fresh;
    for (const puzzle of puzzles) {
      const candidate = (parsed as Record<string, unknown>)[puzzle.id];
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

export function saveProgress(storage: Pick<Storage, 'setItem'>, progress: Progress): void {
  storage.setItem(STORAGE_KEY, JSON.stringify(progress));
}

export function clearProgress(storage: Pick<Storage, 'removeItem'>): void {
  storage.removeItem(STORAGE_KEY);
}
