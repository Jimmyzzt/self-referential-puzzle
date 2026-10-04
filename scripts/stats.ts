import { spawnSync } from 'node:child_process';
import { join } from 'node:path';

const args = process.argv.slice(2);
if (args.some(arg => !['--local', '--players', '--overview'].includes(arg))) {
  throw new Error('Usage: npm run stats -- [--local] [--players | --overview]');
}
const table = args.includes('--players') ? 'player_stats' : args.includes('--overview') ? 'puzzle_stats' : 'puzzle_cohort_stats';
const sql = 'SELECT * FROM ' + table + ' ORDER BY ' + (table === 'player_stats' ? 'puzzles_attempted DESC' : 'puzzle_id, revision');
const result = spawnSync(process.execPath, [
  join(process.cwd(), 'node_modules/wrangler/bin/wrangler.js'),
  'd1', 'execute', 'STATS', args.includes('--local') ? '--local' : '--remote', '--command', sql, '--json',
], { encoding: 'utf8', maxBuffer: 8 * 1024 * 1024 });
if (result.status !== 0) {
  process.stderr.write(result.stderr || result.stdout || String(result.error));
  process.exit(result.status ?? 1);
}
const responses = JSON.parse(result.stdout) as { results: Record<string, unknown>[] }[];
const rows = responses.flatMap(response => response.results);
console.table(rows.map(row => ({ ...row, ...(typeof row.revision === 'string' ? { revision: row.revision.slice(0, 12) } : {}) })));
if (!rows.length) console.log('No recorded attempts yet.');
