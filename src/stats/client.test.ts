import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { parsePuzzle } from '../puzzle/parser';
import { freshProgress } from '../state/persistence';
import { puzzleRevision } from './protocol';

const puzzle = parsePuzzle('# Q1-1\n@question 1 #A\nA: 1\nB: 0\nC: 0\nD: 0\nE: 0\n@solution A');
const example = { ...puzzle, id: 'Example1-1', type: 'example' as const, revealedSolution: 'A' };
let storage: Map<string, string>;
const fetchMock = vi.fn<typeof fetch>();

beforeEach(() => {
  vi.resetModules();
  storage = new Map();
  vi.stubGlobal('location', { origin: 'https://jimmyzzt.github.io' });
  vi.stubGlobal('localStorage', {
    getItem: (key: string) => storage.get(key) ?? null,
    setItem: (key: string, value: string) => storage.set(key, value),
  });
  vi.stubGlobal('fetch', fetchMock);
  fetchMock.mockReset().mockResolvedValue(new Response(null, { status: 204 }));
});
afterEach(() => vi.unstubAllGlobals());

describe('anonymous check telemetry', () => {
  it('reports only completed non-example groups and uses a stable anonymous player ID', async () => {
    const client = await import('./client');
    const progress = freshProgress([puzzle, example]);
    await client.reportCheck([puzzle, example], progress);
    expect(fetchMock).not.toHaveBeenCalled();
    progress[puzzle.id][0].selected = 'B';
    await client.reportCheck([puzzle, example], progress);
    const body = JSON.parse(fetchMock.mock.calls[0][1]!.body as string);
    expect(body.attempts).toEqual([{ puzzleId: 'Q1-1', revision: await puzzleRevision(puzzle), answer: 'B' }]);
    expect(body.playerId).toBe(client.playerId());
    expect(fetchMock.mock.calls[0][0]).toBe('https://self-referential-puzzle.mocking-jimmy.workers.dev/api/check');
    expect(storage.get(client.OUTBOX_KEY)).toBe('[]');
  });

  it('retries failed delivery with the SAME event ID and drops queued events when disabled', async () => {
    const client = await import('./client');
    const progress = freshProgress([puzzle]);
    progress[puzzle.id][0].selected = 'A';
    fetchMock.mockRejectedValueOnce(new Error('offline'));
    await client.reportCheck([puzzle], progress);
    const firstBody = fetchMock.mock.calls[0][1]!.body;
    await client.flushStats();
    expect(fetchMock.mock.calls[1][1]!.body).toBe(firstBody);
    fetchMock.mockRejectedValueOnce(new Error('offline'));
    await client.reportCheck([puzzle], progress);
    client.setStatsEnabled(false);
    await client.flushStats();
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(storage.get(client.OUTBOX_KEY)).toBe('[]');
  });

  it('uses same-origin Worker requests and sends nothing from an unconfigured development or itch origin', async () => {
    const client = await import('./client');
    vi.stubGlobal('location', { origin: 'https://self-refp.zzt.si' });
    expect(client.statsEndpoint()).toBe('/api/check');
    vi.stubGlobal('location', { origin: 'http://localhost:5173' });
    expect(client.statsEndpoint()).toBeNull();
    vi.stubGlobal('location', { origin: 'https://html.itch.zone' });
    expect(client.statsEndpoint()).toBeNull();
  });

  it('leaves content revisions unchanged by renumbering while separating actual question edits', async () => {
    expect(await puzzleRevision({ ...puzzle, id: 'Q1-2' })).toBe(await puzzleRevision(puzzle));
    const changed = parsePuzzle('# Q1-1\n@question 1 #A\nA: 0\nB: 1\nC: 0\nD: 0\nE: 0');
    expect(await puzzleRevision(changed)).not.toBe(await puzzleRevision(puzzle));
  });
});
