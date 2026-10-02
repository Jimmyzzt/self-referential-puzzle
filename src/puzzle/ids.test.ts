import { describe, expect, it } from 'vitest';
import { parseChapter } from './parser';
import { selectPuzzles, legacyPuzzleId } from './ids';

const block = (heading: string) => `${heading}\n@question 1 #A\nA: 1\nB: 1\nC: 1\nD: 1\nE: 1\n@solution A`;
const chapters = [
  parseChapter(`# Chapter 1\n${block('## Q1-1')}\n${block('## Example 1-1')}`),
  parseChapter(`# Chapter 2\n${block('## Q2-A')}\n${block('## Q2-1')}`),
];

describe('chapter selectors', () => {
  it('selects questions, examples, bonus questions and chapters without case sensitivity', () => {
    for (const request of ['q1-1', 'Q1-1']) expect(selectPuzzles(chapters, request).map(p => p.id)).toEqual(['Q1-1']);
    for (const request of ['e1-1', 'E1-1', 'Example1-1']) expect(selectPuzzles(chapters, request).map(p => p.id)).toEqual(['Example1-1']);
    expect(selectPuzzles(chapters, 'q2-a').map(p => p.id)).toEqual(['Q2-A']);
    expect(selectPuzzles(chapters, 'CH2').map(p => p.id)).toEqual(['Q2-A', 'Q2-1']);
    expect(selectPuzzles(chapters, 'ALL')).toHaveLength(4);
    expect(selectPuzzles(chapters, 'ch99')).toEqual([]);
    expect(selectPuzzles(chapters, 'q1')).toEqual([]);
  });
  it('maps only existing PDF puzzles to their former global IDs', () => {
    expect(legacyPuzzleId(chapters[1].puzzles[1])).toBe('Q11');
    expect(legacyPuzzleId(chapters[1].puzzles[0])).toBe('Q15');
    const third = parseChapter(`# Chapter 3\n${block('## Q3-1')}`).puzzles[0];
    expect(legacyPuzzleId(third)).toBeUndefined();
  });
});
