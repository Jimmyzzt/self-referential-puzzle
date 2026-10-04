import type { Puzzle } from '../puzzle/types';

export const STATS_ORIGINS = [
  'https://jimmyzzt.github.io',
  'https://self-referential-puzzle.mocking-jimmy.workers.dev',
  'https://self-refp.zzt.si',
] as const;
export const DEFAULT_STATS_ENDPOINT = STATS_ORIGINS[1] + '/api/check';
export const MAX_ATTEMPTS = 48;
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export interface Attempt {
  puzzleId: string;
  revision: string;
  answer: string;
}
export interface CheckEvent {
  eventId: string;
  playerId: string;
  attempts: Attempt[];
}
export interface PuzzleVersion {
  revision: string;
  solution: string;
  questionCount: number;
}
export type Catalog = Record<string, PuzzleVersion>;

export function validPlayerId(value: unknown): value is string {
  return typeof value === 'string' && uuid.test(value);
}

export function parseCheckEvent(value: unknown): CheckEvent | null {
  if (!value || typeof value !== 'object') return null;
  const record = value as Record<string, unknown>;
  if (!validPlayerId(record.eventId) || !validPlayerId(record.playerId)
    || !Array.isArray(record.attempts) || !record.attempts.length || record.attempts.length > MAX_ATTEMPTS) return null;
  const attempts: Attempt[] = [];
  const ids = new Set<string>();
  for (const item of record.attempts) {
    if (!item || typeof item !== 'object') return null;
    const { puzzleId, revision, answer } = item as Record<string, unknown>;
    if (typeof puzzleId !== 'string' || !/^Q[1-9]\d*-(?:[1-9]\d*|[A-Z]+)$/.test(puzzleId)
      || typeof revision !== 'string' || !/^[0-9a-f]{64}$/.test(revision)
      || typeof answer !== 'string' || !/^[A-E]{1,32}$/.test(answer) || ids.has(puzzleId)) return null;
    ids.add(puzzleId);
    attempts.push({ puzzleId, revision, answer });
  }
  return { eventId: record.eventId, playerId: record.playerId, attempts };
}

export async function sha256(value: string): Promise<string> {
  const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return Array.from(new Uint8Array(bytes), byte => byte.toString(16).padStart(2, '0')).join('');
}

// IDs and author comments do not change the content revision.
export function puzzleRevision(puzzle: Puzzle): Promise<string> {
  return sha256(JSON.stringify(puzzle.questions));
}
