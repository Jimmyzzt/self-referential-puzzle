import { describe, expect, it } from 'vitest';
import { clickOption, emptyMarking, optionState } from './markings';
import { clearProgress, freshProgress, restoreProgress, saveProgress, STORAGE_KEY } from './persistence';
import { beginCooldown, canCheck, checkCompleted } from './checker';
import { parsePuzzle } from '../puzzle/parser';

const puzzle = parsePuzzle('# Q1\n@question 1 #A\nA: 1\nB: 0\nC: 0\nD: 0\nE: 0\n@solution A');

describe('option marking', () => {
  it('cycles neutral → manual X → selected → neutral', () => {
    const x = clickOption(emptyMarking(), 'A');
    expect(optionState(x, 'A')).toBe('manual-X');
    const selected = clickOption(x, 'A');
    expect(optionState(selected, 'A')).toBe('selected');
    expect(optionState(selected, 'B')).toBe('auto-X');
    expect(clickOption(selected, 'A')).toEqual(emptyMarking());
  });
  it('preserves manual X while generating and clearing automatic X', () => {
    const manual = clickOption(emptyMarking(), 'B');
    const selected = clickOption(clickOption(manual, 'A'), 'A');
    expect(optionState(selected, 'B')).toBe('manual-X');
    expect(optionState(selected, 'C')).toBe('auto-X');
    const cleared = clickOption(selected, 'A');
    expect(optionState(cleared, 'B')).toBe('manual-X');
    expect(optionState(cleared, 'C')).toBe('neutral');
  });
  it('turns a clicked auto X into manual X and clears selection', () => {
    const selected = clickOption(clickOption(emptyMarking(), 'A'), 'A');
    const x = clickOption(selected, 'B');
    expect(x.selected).toBeNull();
    expect(optionState(x, 'B')).toBe('manual-X');
    expect(optionState(x, 'C')).toBe('neutral');
    const newSelected = clickOption(x, 'B');
    expect(newSelected.selected).toBe('B');
    expect(optionState(newSelected, 'A')).toBe('auto-X');
  });
});

describe('checking and persistence', () => {
  it('ignores incomplete groups and distinguishes correct and wrong answers', () => {
    const empty = freshProgress([puzzle]);
    expect(checkCompleted([puzzle], { Q1: 'A' }, empty)).toEqual({});
    empty.Q1[0].selected = 'A';
    expect(checkCompleted([puzzle], { Q1: 'A' }, empty)).toEqual({ Q1: 'correct' });
    empty.Q1[0].selected = 'B';
    expect(checkCompleted([puzzle], { Q1: 'A' }, empty)).toEqual({ Q1: 'wrong' });
  });
  it('enforces a three-second cooldown', () => {
    const until = beginCooldown(1000);
    expect(until).toBe(4000);
    expect(canCheck(3999, until)).toBe(false);
    expect(canCheck(4000, until)).toBe(true);
  });
  it('restores manual X and selection and resets stored progress', () => {
    let stored: string | null = null;
    const storage = {
      setItem(key: string, value: string) { expect(key).toBe(STORAGE_KEY); stored = value; },
      removeItem(key: string) { expect(key).toBe(STORAGE_KEY); stored = null; },
    };
    const progress = freshProgress([puzzle]);
    progress.Q1[0] = { manualX: ['B'], selected: 'A' };
    saveProgress(storage, progress);
    expect(restoreProgress(stored, [puzzle])).toEqual(progress);
    clearProgress(storage);
    expect(restoreProgress(stored, [puzzle])).toEqual(freshProgress([puzzle]));
  });
});
