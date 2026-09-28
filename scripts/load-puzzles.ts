import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parsePuzzle } from '../src/puzzle/parser';
import type { Puzzle } from '../src/puzzle/types';

const contentDir = join(process.cwd(), 'src', 'content');

export function loadPuzzles(): Puzzle[] {
  return readdirSync(contentDir)
    .filter(filename => filename.endsWith('.puzzle.md'))
    .map(filename => parsePuzzle(readFileSync(join(contentDir, filename), 'utf8'), filename))
    .sort((a, b) => {
      if (a.type !== b.type) return a.type === 'example' ? -1 : 1;
      return Number(a.id.match(/\d+$/)?.[0]) - Number(b.id.match(/\d+$/)?.[0]);
    });
}
