import { describe, expect, it } from 'vitest';
import { parseChapter, parsePrompt, parsePuzzle } from './parser';
import { evaluateOption, isSolution } from './evaluator';
import { solvePuzzle } from './solver';
import type { Label } from './types';

const question = (n: number, prompt: string, values: number[]) => `@question ${n} ${prompt}\n${['A','B','C','D','E'].map((label, i) => `${label}: ${values[i]}`).join('\n')}`;
const puzzle = (body: string) => parsePuzzle(`# Q99\n${body}\n`);

describe('DSL and AST', () => {
  it('parses count, ref, and self expressions', () => {
    expect(parsePrompt('#A')).toEqual({ kind: 'count', target: { kind: 'literalOption', label: 'A' } });
    expect(parsePrompt('#ref(2)')).toEqual({ kind: 'count', target: { kind: 'ref', question: 2 } });
    expect(parsePrompt('#self')).toEqual({ kind: 'count', target: { kind: 'selfRef' } });
  });
  it('parses multiple questions, arbitrary values, and declared solution', () => {
    const data = puzzle(`${question(1, '#A', [3,0,2,1,4])}\n${question(2, '#ref(1)', [1,2,3,4,0])}\n@solution BC`);
    expect(data.questions).toHaveLength(2);
    expect(data.questions[0].options).toEqual({ A: 3, B: 0, C: 2, D: 1, E: 4 });
    expect(data.declaredSolution).toBe('BC');
  });
  it('rejects a missing reference and mixed unknown values', () => {
    expect(() => puzzle(question(1, '#ref(2)', [0,1,2,3,4]))).toThrow(/missing question/);
    expect(() => puzzle('@question 1 #A\nA: ?\nB: 1\nC: 2\nD: 3\nE: 4')).toThrow(/five numbers or five/);
  });
  it('keeps multiple puzzles in the chapter source order', () => {
    const chapter = parseChapter(`# Chapter 2\n\n## Example 6\n${question(1, '#A', [1,0,0,0,0])}\n@solution A\n\n## Q11\n${question(1, '#B', [0,1,0,0,0])}\n@solution B`);
    expect(chapter.id).toBe(2);
    expect(chapter.puzzles.map(item => item.id)).toEqual(['Example6', 'Q11']);
    expect(() => parseChapter('# Chapter 1\n## Q1\n@question 1 #A\nA: 1')).toThrow(/missing B/);
  });
});

describe('solver semantics', () => {
  it('finds a unique solution', () => {
    expect(solvePuzzle(puzzle(question(1, '#A', [1,1,1,1,1])))).toEqual({ solutionCount: 1, solutions: ['A'] });
  });
  it('finds zero and multiple solutions', () => {
    expect(solvePuzzle(puzzle(question(1, '#A', [2,2,2,2,2]))).solutionCount).toBe(0);
    expect(solvePuzzle(puzzle(question(1, '#A', [1,0,0,0,0]))).solutionCount).toBe(5);
  });
  it('resolves self and mutual references from the complete assignment', () => {
    const self = puzzle(question(1, '#self', [1,0,0,0,0]));
    expect(evaluateOption(self.questions[0].prompt.target, ['A'], 0)).toBe('A');
    expect(solvePuzzle(self).solutions).toContain('A');
    const mutual = puzzle(`${question(1, '#ref(2)', [1,1,1,1,1])}\n${question(2, '#ref(1)', [1,1,1,1,1])}`);
    expect(isSolution(mutual, ['A','A'])).toBe(false);
    expect(isSolution(mutual, ['A','B'])).toBe(true);
    expect(solvePuzzle(mutual).solutionCount).toBeGreaterThan(0);
  });
  it('handles a three-question cycle without recursive evaluation', () => {
    const cycle = puzzle(`${question(1, '#ref(2)', [1,1,1,1,1])}\n${question(2, '#ref(3)', [1,1,1,1,1])}\n${question(3, '#ref(1)', [1,1,1,1,1])}`);
    expect(isSolution(cycle, ['A','B','C'] as Label[])).toBe(true);
    expect(solvePuzzle(cycle).solutionCount).toBeGreaterThan(0);
  });
  it('uses the other constraints when a question has five literal ? values', () => {
    const source = `# Q99\n${question(1, '#A', [0,1,2,3,4])}\n@question 2 #ref(2)\nA: ?\nB: ?\nC: ?\nD: ?\nE: ?`;
    const data = parsePuzzle(source);
    expect(isSolution(data, ['B', 'A'])).toBe(true);
  });
});
