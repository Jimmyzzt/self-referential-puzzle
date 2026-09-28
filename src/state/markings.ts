import { LABELS, type Label } from '../puzzle/types';

export interface QuestionMarking {
  manualX: Label[];
  selected: Label | null;
}
export type OptionState = 'neutral' | 'manual-X' | 'selected' | 'auto-X';
export const emptyMarking = (): QuestionMarking => ({ manualX: [], selected: null });

export function optionState(marking: QuestionMarking, label: Label): OptionState {
  if (marking.selected === label) return 'selected';
  if (marking.manualX.includes(label)) return 'manual-X';
  if (marking.selected) return 'auto-X';
  return 'neutral';
}

export function clickOption(marking: QuestionMarking, label: Label): QuestionMarking {
  const state = optionState(marking, label);
  const manualX = new Set(marking.manualX);
  if (state === 'neutral') manualX.add(label);
  if (state === 'manual-X') manualX.delete(label);
  if (state === 'auto-X') manualX.add(label);
  return {
    manualX: LABELS.filter(option => manualX.has(option)),
    selected: state === 'manual-X' ? label : null,
  };
}
