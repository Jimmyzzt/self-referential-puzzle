import { describe, expect, it } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { parseChapter, parsePrompt, parsePuzzle } from './parser';
import { solvePuzzle } from './solver';
import { isSolution } from './evaluator';
import { PromptSymbol } from './symbols';

const count = '@question 1 #A\nA: 1\nB: 1\nC: 1\nD: 1\nE: 1\n@solution A';
const direct = '@question 1 ref(2)\nA: A\nB: B\nC: C\nD: D\nE: E\n@question 2 ref(1)\nA: B\nB: D\nC: C\nD: E\nE: A\n@question 3 #ref(1)\nA: 0\nB: 1\nC: 4\nD: 2\nE: 3';

describe('comments and scoped headings', () => {
  it('ignores leading, multiline and inline comments, including commented out puzzles', () => {
    const chapter = parseChapter(`<!-- notes\n## Q1-99\nnot a real puzzle\n-->\n# Chapter 1 <!-- chapter note -->\n<!-- between chapter and puzzle -->\n## Q1-A\n${count.replace('A: 1', 'A: 1 <!-- value -->')}\n<!-- trailing\ncomment -->`);
    expect(chapter.puzzles.map(p => p.id)).toEqual(['Q1-A']);
    expect(solvePuzzle(chapter.puzzles[0]).solutions).toEqual(['A']);
  });
  it('rejects unclosed comments, duplicate IDs and another chapter prefix', () => {
    expect(() => parseChapter(`# Chapter 1\n<!-- unfinished`)).toThrow(/:2: unclosed/);
    expect(() => parseChapter(`# Chapter 1\n## Q2-A\n${count}`)).toThrow(/chapter 1 numbering/);
    expect(() => parseChapter(`# Chapter 1\n## Q1-A\n${count}\n## Q1-A\n${count}`)).toThrow(/duplicate puzzle ID/);
  });
});

describe('direct letter constraints', () => {
  it('solves mutual letter references and count constraints simultaneously', () => {
    const data = parsePuzzle(`# Q3-4\n${direct}\n@solution CCD`);
    expect(solvePuzzle(data)).toEqual({ solutionCount: 1, solutions: ['CCD'] });
    expect(isSolution(data, ['C', 'C', 'D'])).toBe(true);
    expect(isSolution(data, ['C', 'C', 'B'])).toBe(false);
  });
  it('supports literal letters and distinguishes them from counts in the renderer', () => {
    const data = parsePuzzle('# Q3-1\n@question 1 A\nA: B\nB: A\nC: C\nD: D\nE: E');
    expect(solvePuzzle(data).solutions).toEqual(['B']);
    expect(renderToStaticMarkup(createElement(PromptSymbol, { expr: parsePrompt('ref(1)') }))).not.toContain('#');
    expect(renderToStaticMarkup(createElement(PromptSymbol, { expr: parsePrompt('#ref(1)') }))).toContain('#');
  });
  it('rejects option values of the wrong type and missing direct references', () => {
    expect(() => parsePuzzle(`# Q3-1\n${count.replace('#A', 'A')}`)).toThrow(/A–E labels/);
    expect(() => parsePuzzle('# Q3-1\n@question 1 #A\nA: A\nB: B\nC: C\nD: D\nE: E')).toThrow(/numbers for a count/);
    expect(() => parsePuzzle('# Q3-1\n@question 1 ref(2)\nA: A\nB: B\nC: C\nD: D\nE: E')).toThrow(/missing question 2/);
  });
});
