import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import { createHandler, type Env } from './handler';
import { type Catalog, type CheckEvent } from '../src/stats/protocol';

const schema = readFileSync('workers/migrations/0001_checks.sql', 'utf8').split(';').map(sql => sql.trim()).filter(Boolean);
const revision = 'a'.repeat(64);
const catalog: Catalog = Object.fromEntries(Array.from({ length: 10 }, (_, index) => [
  'Q1-' + (index + 1), { revision, solution: 'A', questionCount: 1 },
]));
let sqlite: DatabaseSync;
let env: Env;
let handler: ReturnType<typeof createHandler>;

beforeEach(() => {
  sqlite = new DatabaseSync(':memory:');
  sqlite.exec('PRAGMA foreign_keys = ON');
  function prepare(sql: string) {
    let values: (string | number | null)[] = [];
    const statement = {
      bind(...args: (string | number | null)[]) { values = args; return statement; },
      async first() { return sqlite.prepare(sql).get(...values) ?? null; },
      execute() { return sqlite.prepare(sql).run(...values); },
    };
    return statement;
  }
  env = {
    STATS: {
      prepare,
      async batch(statements: ReturnType<typeof prepare>[]) {
        sqlite.exec('BEGIN');
        try { const results = statements.map(statement => statement.execute()); sqlite.exec('COMMIT'); return results; }
        catch (error) { sqlite.exec('ROLLBACK'); throw error; }
      },
    } as unknown as D1Database,
    ASSETS: { fetch: async () => new Response('asset') } as unknown as Fetcher,
  };
  handler = createHandler(catalog, schema);
});
afterEach(() => sqlite.close());

function event(playerId = crypto.randomUUID(), entries: [string, string][] = [['Q1-1', 'A']]): CheckEvent {
  return { eventId: crypto.randomUUID(), playerId, attempts: entries.map(([puzzleId, answer]) => ({ puzzleId, answer, revision })) };
}
function post(payload: unknown, origin = 'https://jimmyzzt.github.io') {
  return handler.fetch(new Request('https://self-refp.zzt.si/api/check', {
    method: 'POST', headers: { Origin: origin, 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
  }), env);
}

describe('D1 statistics endpoint', () => {
  it('accepts both Worker origins and Pages preflights, rejects other origins, and delegates assets', async () => {
    for (const origin of ['https://jimmyzzt.github.io', 'https://self-refp.zzt.si', 'https://self-referential-puzzle.mocking-jimmy.workers.dev']) {
      const response = await handler.fetch(new Request('https://self-refp.zzt.si/api/check', {
        method: 'OPTIONS', headers: { Origin: origin, 'Access-Control-Request-Method': 'POST' },
      }), env);
      expect(response.status).toBe(204);
      expect(response.headers.get('Access-Control-Allow-Origin')).toBe(origin);
    }
    expect((await post(event(), 'https://other.example')).status).toBe(403);
    expect((await handler.fetch(new Request('https://self-refp.zzt.si/assets/app.js'), env)).status).toBe(200);
  });

  it('grades on the server and deduplicates retries while counting genuinely new checks', async () => {
    const payload = event();
    expect((await post({ ...payload, correct: false })).status).toBe(204);
    expect((await post(payload)).status).toBe(204);
    expect((await post({ ...payload, attempts: [{ ...payload.attempts[0], answer: 'B' }] })).status).toBe(409);
    expect(sqlite.prepare('SELECT correct FROM attempts').all()).toEqual([{ correct: 1 }]);
    expect((await post(event(payload.playerId, [['Q1-1', 'B']]))).status).toBe(204);
    const stats = sqlite.prepare('SELECT submissions, players, first_accuracy_pct FROM puzzle_stats').get();
    expect(stats).toEqual({ submissions: 2, players: 1, first_accuracy_pct: 100 });
  });

  it('does not write malformed, duplicate-puzzle, incomplete, oversized or unknown-version attempts', async () => {
    const payload = event();
    expect((await post({ ...payload, playerId: 'name@example.com' })).status).toBe(400);
    expect((await post({ ...payload, attempts: [...payload.attempts, ...payload.attempts] })).status).toBe(400);
    expect((await post({ ...payload, attempts: [{ ...payload.attempts[0], answer: '' }] })).status).toBe(400);
    expect((await post({ ...payload, attempts: [{ ...payload.attempts[0], answer: 'AB' }] })).status).toBe(409);
    expect((await post({ ...payload, attempts: [{ ...payload.attempts[0], revision: 'b'.repeat(64) }] })).status).toBe(409);
    expect((await post({ ...payload, padding: 'x'.repeat(17000) })).status).toBe(413);
    expect(sqlite.prepare('SELECT COUNT(*) AS count FROM attempts').get()).toEqual({ count: 0 });
  });

  it('compares first-attempt cohorts using OTHER puzzles and preserves a wrong first attempt after retries', async () => {
    const high = crypto.randomUUID();
    const low = crypto.randomUUID();
    const newPlayer = crypto.randomUUID();
    const others = (correct: number, count = 8): [string, string][] => Array.from({ length: count }, (_, index) => [
      'Q1-' + (index + 2), index < correct ? 'A' : 'B',
    ]);
    for (const payload of [
      event(high, [...others(8), ['Q1-1', 'B']]),
      event(low, [...others(3), ['Q1-1', 'A']]),
      event(newPlayer, [...others(7, 7), ['Q1-1', 'A']]),
      event(high, [['Q1-1', 'A']]),
    ]) expect((await post(payload)).status).toBe(204);
    expect(sqlite.prepare('SELECT cohort, players, first_accuracy_pct FROM puzzle_cohort_stats WHERE puzzle_id = ? ORDER BY cohort').all('Q1-1'))
      .toEqual([
        { cohort: 'high_accuracy', players: 1, first_accuracy_pct: 0 },
        { cohort: 'insufficient', players: 1, first_accuracy_pct: 100 },
        { cohort: 'low_accuracy', players: 1, first_accuracy_pct: 100 },
      ]);
  });

  it('keeps previously recorded versions usable after an updated Worker is deployed', async () => {
    expect((await post(event())).status).toBe(204);
    const updated = createHandler({ 'Q1-1': { revision: 'b'.repeat(64), solution: 'B', questionCount: 1 } }, schema);
    const old = event();
    const response = await updated.fetch(new Request('https://self-refp.zzt.si/api/check', {
      method: 'POST', headers: { Origin: 'https://jimmyzzt.github.io', 'Content-Type': 'application/json' }, body: JSON.stringify(old),
    }), env);
    expect(response.status).toBe(204);
    expect(sqlite.prepare('SELECT COUNT(*) AS count FROM attempts').get()).toEqual({ count: 2 });
  });

  it('reports missing storage as unavailable without leaking statistics through health', async () => {
    const request = new Request('https://self-refp.zzt.si/api/stats/health');
    const unavailable = await handler.fetch(request, { ASSETS: env.ASSETS });
    expect(unavailable.status).toBe(503);
    const ready = await handler.fetch(request, env);
    expect(await ready.json()).toEqual({ ready: true });
  });
});
