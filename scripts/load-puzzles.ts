import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseChapter } from '../src/puzzle/parser';
import type { Chapter, Puzzle } from '../src/puzzle/types';

const contentDir = join(process.cwd(), 'src', 'content');

export function loadChapters(): Chapter[] {
  const chapters = readdirSync(contentDir)
    .filter(filename => filename.endsWith('.puzzle.markdown'))
    .map(filename => parseChapter(readFileSync(join(contentDir, filename), 'utf8'), filename))
    .sort((a, b) => a.id - b.id);
  const ids = chapters.map(chapter => chapter.id);
  if (new Set(ids).size !== ids.length) throw new Error('Duplicate chapter number');
  const puzzleIds = chapters.flatMap(chapter => chapter.puzzles.map(puzzle => puzzle.id));
  if (new Set(puzzleIds).size !== puzzleIds.length) throw new Error('Duplicate puzzle ID across chapters');
  return chapters;
}

export function loadPuzzles(): Puzzle[] { return loadChapters().flatMap(chapter => chapter.puzzles); }
