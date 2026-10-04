import type { Puzzle } from '../puzzle/types';
import type { Progress } from '../state/persistence';
import { currentAnswer } from '../state/feedback';
import { DEFAULT_STATS_ENDPOINT, STATS_ORIGINS, parseCheckEvent, puzzleRevision, validPlayerId, type CheckEvent } from './protocol';

export const PLAYER_KEY = 'self-referential-puzzle-player-v1';
export const STATS_KEY = 'self-referential-puzzle-stats-enabled-v1';
export const OUTBOX_KEY = 'self-referential-puzzle-stats-outbox-v1';
const revisions = new WeakMap<Puzzle, Promise<string>>();
let transientPlayer: string | undefined;
let transientQueue: CheckEvent[] = [];
let sending = false;
let enabledOverride: boolean | undefined;
let memoryOnly = false;

export function statsEndpoint(): string | null {
  const override = import.meta.env.VITE_STATS_ENDPOINT;
  if (override === '') return null;
  if (override) return override;
  if (!STATS_ORIGINS.some(origin => origin === location.origin)) return null;
  return location.origin === STATS_ORIGINS[0] ? DEFAULT_STATS_ENDPOINT : '/api/check';
}

export function readStatsEnabled(): boolean {
  if (enabledOverride !== undefined) return enabledOverride;
  try { return localStorage.getItem(STATS_KEY) !== 'false'; }
  catch { return true; }
}

function queue(): CheckEvent[] {
  if (memoryOnly) return transientQueue;
  try {
    const raw = localStorage.getItem(OUTBOX_KEY);
    if (raw === null) return transientQueue;
    const parsed: unknown = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed.map(parseCheckEvent).filter((event): event is CheckEvent => event !== null).slice(-100);
  } catch { /* Fall back to this page's queue. */ }
  return transientQueue;
}

function saveQueue(events: CheckEvent[]) {
  transientQueue = events.slice(-100);
  try { localStorage.setItem(OUTBOX_KEY, JSON.stringify(transientQueue)); } catch { memoryOnly = true; }
}

export function setStatsEnabled(enabled: boolean) {
  enabledOverride = enabled;
  try { localStorage.setItem(STATS_KEY, String(enabled)); } catch { /* Storage is optional. */ }
  if (!enabled) saveQueue([]);
}

export function playerId(): string {
  try {
    const saved = localStorage.getItem(PLAYER_KEY);
    if (validPlayerId(saved)) return saved;
  } catch { /* Storage is optional. */ }
  transientPlayer ??= crypto.randomUUID();
  try { localStorage.setItem(PLAYER_KEY, transientPlayer); } catch { /* Keep the ID for this page. */ }
  return transientPlayer;
}

export async function flushStats(): Promise<void> {
  const endpoint = statsEndpoint();
  if (!endpoint || sending || !readStatsEnabled()) return;
  sending = true;
  try {
    while (readStatsEnabled()) {
      const event = queue()[0];
      if (!event) break;
      try {
        const response = await fetch(endpoint, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(event), credentials: 'omit', keepalive: true,
          signal: AbortSignal.timeout(8000),
        });
        if (response.ok || [400, 403, 409, 413].includes(response.status)) {
          saveQueue(queue().filter(item => item.eventId !== event.eventId));
        } else break;
      } catch { break; } // Keep the event for the next check, reload or online event.
    }
  } finally { sending = false; }
}

export async function reportCheck(puzzles: readonly Puzzle[], progress: Progress): Promise<void> {
  if (!statsEndpoint() || !readStatsEnabled()) return;
  // Capture submitted answers before awaiting hashes; subsequent edits are a different attempt.
  const submitted = puzzles.filter(puzzle => puzzle.type !== 'example')
    .map(puzzle => ({ puzzle, answer: currentAnswer(progress, puzzle) }))
    .filter((item): item is { puzzle: Puzzle; answer: string } => item.answer !== null);
  if (!submitted.length) return;
  try {
    const eventId = crypto.randomUUID();
    const id = playerId();
    const attempts = await Promise.all(submitted.map(async ({ puzzle, answer }) => {
      let revision = revisions.get(puzzle);
      if (!revision) { revision = puzzleRevision(puzzle); revisions.set(puzzle, revision); }
      return { puzzleId: puzzle.id, revision: await revision, answer };
    }));
    if (!readStatsEnabled()) return;
    saveQueue([...queue(), { eventId, playerId: id, attempts }]);
    await flushStats();
  } catch { /* Telemetry must never interrupt the puzzle. */ }
}

export function resumeStats(): () => void {
  const send = () => { void flushStats(); };
  send();
  window.addEventListener('online', send);
  return () => window.removeEventListener('online', send);
}
