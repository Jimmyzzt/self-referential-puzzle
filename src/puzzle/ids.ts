import type { Chapter, Puzzle } from './types';

// Only the two PDF chapters had globally numbered IDs before this migration.
export function legacyPuzzleId(puzzle: Puzzle): string | undefined {
  if (puzzle.id === 'Q2-A') return 'Q15';
  if (puzzle.id === 'Q2-B') return 'Q16';
  const match = /^(Example|Q)([12])-([1-9]\d*)$/.exec(puzzle.id);
  if (!match) return undefined;
  const [, kind, chapter, local] = match;
  const number = Number(local);
  const limit = kind === 'Example' ? (chapter === '1' ? 5 : 2) : (chapter === '1' ? 10 : 4);
  if (number > limit) return undefined;
  return kind + (number + (chapter === '2' ? (kind === 'Example' ? 5 : 10) : 0));
}

export function storedPuzzleValue(source: Record<string, unknown>, puzzle: Puzzle): unknown {
  if (Object.hasOwn(source, puzzle.id)) return source[puzzle.id];
  const previousId = puzzle.id === 'Q2-A' ? 'Q2-5' : puzzle.id === 'Q2-B' ? 'Q2-6' : undefined;
  if (previousId && Object.hasOwn(source, previousId)) return source[previousId];
  const legacy = legacyPuzzleId(puzzle);
  return legacy ? source[legacy] : undefined;
}

export function selectPuzzles(chapters: readonly Chapter[], request: string): Puzzle[] {
  const selector = request.trim().toLowerCase();
  if (selector === 'all') return chapters.flatMap(chapter => chapter.puzzles);
  const chapter = /^ch([1-9]\d*)$/.exec(selector);
  if (chapter) return chapters.find(item => item.id === Number(chapter[1]))?.puzzles ?? [];
  const normalized = selector.replace(/^e(?=[1-9])/, 'example');
  return chapters.flatMap(chapter => chapter.puzzles).filter(puzzle => puzzle.id.toLowerCase() === normalized);
}
