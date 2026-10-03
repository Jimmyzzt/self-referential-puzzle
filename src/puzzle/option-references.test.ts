import { describe, expect, it } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { parsePuzzle } from './parser';
import { evaluateValue, isSolution } from './evaluator';
import { solvePuzzle } from './solver';
import { PuzzleGroup } from '../components/PuzzleGroup';
import { freshProgress } from '../state/persistence';

const introduction = `# Example 4-1
@question 1 D
A: B
B: D
C: A
D: E
E: C
@question 2 B
A: A
B: C
C: ref(1)
D: D
E: E
@revealed BC
@solution BC`;
const allRefs = (n: number, prompt: string, target: number) => `@question ${n} ${prompt}\n${Array.from('ABCDE', label => `${label}: ref(${target})`).join('\n')}`;

describe('references in option contents', () => {
  it('resolves a referenced answer label rather than its selected content or this option label', () => {
    const data = parsePuzzle(introduction);
    expect(data.questions[1].options.C).toEqual({ kind: 'ref', question: 1 });
    expect(evaluateValue(data.questions[1].options.C, ['B', 'C'], 1)).toBe('B');
    expect(data.questions[0].options.B).toBe('D');
    expect(solvePuzzle(data)).toEqual({ solutionCount: 1, solutions: ['BC'] });
    expect(isSolution(data, ['B', 'B'])).toBe(false);
  });
  it('evaluates cyclic option references without following option contents recursively', () => {
    const data = parsePuzzle(`# Q4-1\n${allRefs(1, 'A', 2)}\n${allRefs(2, 'B', 1)}`);
    expect(solvePuzzle(data)).toEqual({ solutionCount: 1, solutions: ['BA'] });
  });
  it('preserves equal alternatives and reports zero or multiple solutions', () => {
    const equal = parsePuzzle(`# Q4-A\n${allRefs(1, 'ref(2)', 1)}\n${allRefs(2, 'ref(1)', 2)}`);
    expect(solvePuzzle(equal)).toEqual({ solutionCount: 5, solutions: ['AA', 'BB', 'CC', 'DD', 'EE'] });
    const impossible = parsePuzzle(`# Q4-B\n${allRefs(1, 'A', 1)}\n${allRefs(2, 'B', 1)}`);
    expect(solvePuzzle(impossible)).toEqual({ solutionCount: 0, solutions: [] });
  });
  it('validates unused references, result types and question marks', () => {
    expect(() => parsePuzzle(introduction.replace('E: E', 'E: ref(9)'))).toThrow(/references missing question 9/);
    expect(() => parsePuzzle(introduction.replace('@question 2 B', '@question 2 #B'))).toThrow(/numbers for a count/);
    expect(() => parsePuzzle(introduction.replace('D: D', 'D: 1'))).toThrow(/A–E labels or ref/);
    expect(() => parsePuzzle(introduction.replace('D: D', 'D: ?'))).toThrow(/five concrete values/);
    expect(() => parsePuzzle(introduction.replace('ref(1)', 'ref(0)'))).toThrow(/Unexpected line/);
  });
  it('renders option references with the same symbol and an accessible button label', () => {
    const data = parsePuzzle(introduction);
    const html = renderToStaticMarkup(createElement(PuzzleGroup, {
      puzzle: data, markings: freshProgress([data])[data.id], status: 'correct', flash: false,
      onOptionClick: () => {}, onAnswerInput: () => {},
    }));
    expect(html).toContain('aria-label="C, answer of question 1, selected"');
    expect(html).toContain('class="option-value"><span class="ref-symbol"');
    expect(html).not.toContain('[object Object]');
    expect(html).not.toContain('ref(1)');
  });
});
