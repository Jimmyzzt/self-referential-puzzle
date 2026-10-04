import { describe, expect, it } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { parsePrompt, parsePuzzle } from './parser';
import { isSolution } from './evaluator';
import { solvePuzzle } from './solver';
import { PromptSymbol } from './symbols';

const source = [
  '# Q4-B',
  '@question 1 #ref(2)', 'A: 2', 'B: 9', 'C: 9', 'D: 9', 'E: 9',
  '@question 2 ?', 'A: ?', 'B: ?', 'C: ?', 'D: ?', 'E: ?',
].join('\n');

describe('unconstrained question-mark prompts', () => {
  it('leaves the answer in group counts, so another question can uniquely constrain it', () => {
    const puzzle = parsePuzzle(source);
    expect(parsePrompt('?')).toEqual({ kind: 'unknown' });
    expect(solvePuzzle(puzzle)).toEqual({ solutionCount: 1, solutions: ['AA'] });
    expect(isSolution(puzzle, ['A', 'B'])).toBe(false);
    expect(solvePuzzle(parsePuzzle(source.replace('@question 2 ?', '@question 2 #ref(2)')))).toEqual(solvePuzzle(puzzle));
  });

  it('rejects concrete or mixed options under a ? prompt instead of silently ignoring them', () => {
    const concrete = source.replace('A: ?\nB: ?\nC: ?\nD: ?\nE: ?', 'A: A\nB: B\nC: C\nD: D\nE: E');
    expect(() => parsePuzzle(concrete)).toThrow(/five \? marks for a \? prompt/);
    expect(() => parsePuzzle(source.replace('A: ?', 'A: A'))).toThrow(/five concrete values/);
  });

  it('renders an accessible question mark and does not supply an answer of its own', () => {
    const html = renderToStaticMarkup(createElement(PromptSymbol, { expr: parsePrompt('?') }));
    expect(html).toContain('aria-label="question mark"');
    expect(html).toContain('>?</span>');
    const puzzle = parsePuzzle('# Q4-B\n@question 1 ?\nA: ?\nB: ?\nC: ?\nD: ?\nE: ?');
    expect(solvePuzzle(puzzle).solutions).toEqual(['A', 'B', 'C', 'D', 'E']);
  });
});
