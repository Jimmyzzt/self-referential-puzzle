import { STATS_ORIGINS, parseCheckEvent, sha256, type Catalog, type PuzzleVersion } from '../src/stats/protocol';
import { readStats } from './analytics';

export type Env = Pick<Cloudflare.Env, 'ASSETS'> & Partial<Pick<Cloudflare.Env, 'STATS'>>;

export function createHandler(catalog: Catalog, schema: readonly string[]) {
  const initialized = new WeakSet<D1Database>();
  async function initialize(db: D1Database): Promise<void> {
    if (initialized.has(db)) return;
    // Cache only completed setup, never another request's pending I/O.
    await db.batch(schema.map(sql => db.prepare(sql)));
    initialized.add(db);
  }

  return {
    async fetch(request: Request, env: Env, ctx?: ExecutionContext): Promise<Response> {
      const path = new URL(request.url).pathname;
      if (!path.startsWith('/api/')) return env.ASSETS.fetch(request);
      const origin = request.headers.get('Origin');
      const allowed = origin !== null && STATS_ORIGINS.some(value => value === origin);
      const headers = new Headers({ 'Cache-Control': 'no-store', Vary: 'Origin' });
      if (allowed) {
        headers.set('Access-Control-Allow-Origin', origin);
        headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
        headers.set('Access-Control-Allow-Headers', 'Content-Type');
        headers.set('Access-Control-Max-Age', '86400');
      }
      const reply = (status: number, body?: unknown) => {
        if (body !== undefined) headers.set('Content-Type', 'application/json');
        return new Response(body === undefined ? null : JSON.stringify(body), { status, headers });
      };
      if (path === '/api/stats') {
        if (origin && !allowed) return reply(403);
        if (request.method === 'OPTIONS') return allowed ? reply(204) : reply(403);
        if (request.method !== 'GET') return reply(405);
        if (!env.STATS) return reply(503, { error: 'Statistics unavailable' });
        try {
          const version = await sha256(JSON.stringify(catalog));
          const key = new Request(new URL('/api/stats?v=1-' + version, request.url));
          const cache = typeof caches === 'undefined' ? undefined : caches.default;
          const cached = await cache?.match(key).catch(() => undefined);
          if (cached) {
            headers.set('Content-Type', 'application/json');
            return new Response(cached.body, { headers });
          }
          await initialize(env.STATS);
          const snapshot = await readStats(env.STATS, catalog);
          if (cache) {
            const save = cache.put(key, Response.json(snapshot, { headers: { 'Cache-Control': 'public, max-age=300' } }))
              .catch(() => { /* The dashboard works without an edge cache. */ });
            if (ctx) ctx.waitUntil(save); else await save;
          }
          return reply(200, snapshot);
        } catch {
          console.error(JSON.stringify({ event: 'stats_read_failed' }));
          return reply(503, { error: 'Statistics unavailable' });
        }
      }
      if (path === '/api/stats/health' && request.method === 'GET') {
        if (!env.STATS) return reply(503, { ready: false });
        try { await initialize(env.STATS); return reply(200, { ready: true }); }
        catch { return reply(503, { ready: false }); }
      }
      if (path !== '/api/check') return reply(404);
      if (!allowed) return reply(403);
      if (request.method === 'OPTIONS') return reply(204);
      if (request.method !== 'POST') return reply(405);
      if (!env.STATS) return reply(503);
      if (request.headers.get('Content-Type')?.split(';')[0].trim() !== 'application/json') return reply(400);
      if (Number(request.headers.get('Content-Length')) > 16384) return reply(413);
      // Bound streamed bodies too, even when Content-Length is absent.
      const reader = request.body?.getReader();
      if (!reader) return reply(400);
      let length = 0;
      const chunks: Uint8Array[] = [];
      try {
        while (true) {
          const chunk = await reader.read();
          if (chunk.done) break;
          length += chunk.value.byteLength;
          if (length > 16384) { await reader.cancel(); return reply(413); }
          chunks.push(chunk.value);
        }
      } catch { return reply(400); }
      const bytes = new Uint8Array(length);
      let offset = 0;
      for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
      let payload;
      try { payload = parseCheckEvent(JSON.parse(new TextDecoder().decode(bytes))); }
      catch { return reply(400); }
      if (!payload) return reply(400);

      try {
        const db = env.STATS;
        await initialize(db);
        payload.attempts.sort((a, b) => a.puzzleId.localeCompare(b.puzzleId));
        const hash = await sha256(JSON.stringify(payload));
        const previous = await db.prepare('SELECT payload_hash FROM check_events WHERE event_id = ?')
          .bind(payload.eventId).first<{ payload_hash: string }>();
        if (previous) return reply(previous.payload_hash === hash ? 204 : 409);
        const versions: PuzzleVersion[] = [];
        for (const attempt of payload.attempts) {
          const current = catalog[attempt.puzzleId];
          const version = current?.revision === attempt.revision ? current
            : await db.prepare('SELECT solution, question_count AS questionCount, revision FROM puzzle_versions WHERE puzzle_id = ? AND revision = ?')
              .bind(attempt.puzzleId, attempt.revision).first<PuzzleVersion>();
          if (!version || version.questionCount !== attempt.answer.length) return reply(409);
          versions.push(version);
        }
        const timestamp = Date.now();
        const statements = [
          db.prepare('INSERT OR IGNORE INTO players (player_id, created_at) VALUES (?, ?)').bind(payload.playerId, timestamp),
          db.prepare('INSERT OR IGNORE INTO check_events (event_id, player_id, payload_hash, origin, received_at) VALUES (?, ?, ?, ?, ?)')
            .bind(payload.eventId, payload.playerId, hash, origin, timestamp),
        ];
        payload.attempts.forEach((attempt, index) => {
          const version = versions[index];
          statements.push(db.prepare('INSERT OR IGNORE INTO puzzle_versions (puzzle_id, revision, solution, question_count) VALUES (?, ?, ?, ?)')
            .bind(attempt.puzzleId, attempt.revision, version.solution, version.questionCount));
          statements.push(db.prepare(
            'INSERT OR IGNORE INTO attempts (event_id, player_id, puzzle_id, revision, correct) '
            + 'SELECT ?, ?, ?, ?, ? WHERE EXISTS (SELECT 1 FROM check_events WHERE event_id = ? AND player_id = ? AND payload_hash = ?)',
          ).bind(payload.eventId, payload.playerId, attempt.puzzleId, attempt.revision, Number(attempt.answer === version.solution),
            payload.eventId, payload.playerId, hash));
        });
        await db.batch(statements);
        return reply(204);
      } catch {
        console.error(JSON.stringify({ event: 'stats_write_failed' }));
        return reply(503);
      }
    },
  };
}
