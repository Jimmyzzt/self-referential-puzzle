import { expect, it } from 'vitest';
import { parseChapter } from './parser';

const block = (id: string) => '## ' + id + '\n@question 1 #A\nA: 1\nB: 1\nC: 1\nD: 1\nE: 1\n@solution A\n';

it('rejects numeric gaps or reversed IDs while allowing variable chapter length and bonus groups', () => {
  expect(() => parseChapter('# Chapter 4\n' + block('Q4-1') + block('Q4-3'))).toThrow(/consecutive.*expected Q4-2/);
  expect(() => parseChapter('# Chapter 4\n' + block('Example 4-2'))).toThrow(/consecutive.*expected Example4-1/);
  expect(parseChapter('# Chapter 4\n' + block('Q4-1') + block('Q4-A') + block('Q4-2')).puzzles).toHaveLength(3);
});
