import { spawnSync } from 'node:child_process';
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { zipSync, unzipSync } from 'fflate';

const npmCli = process.env.npm_execpath;
if (!npmCli) throw new Error('Run this script with npm run build:itch');
const build = spawnSync(process.execPath, [npmCli, 'run', 'build'], {
  stdio: 'inherit',
  env: { ...process.env, VITE_BASE_PATH: './' },
});
if (build.status !== 0) process.exit(build.status ?? 1);

const root = join(process.cwd(), 'dist');
const files: Record<string, Uint8Array> = {};
function collect(directory: string) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) collect(path);
    else files[relative(root, path).replaceAll('\\', '/')] = readFileSync(path);
  }
}
collect(root);
if (!files['index.html']) throw new Error('dist/index.html is missing');
const zip = zipSync(files, { level: 6 });
const zipped = unzipSync(zip);
if (!zipped['index.html'] || !Object.keys(zipped).some(path => path.startsWith('assets/'))) throw new Error('itch zip layout is invalid');
const release = join(process.cwd(), 'release');
mkdirSync(release, { recursive: true });
const target = join(release, 'itch.zip');
writeFileSync(target, zip);
console.log(`${target} (${(zip.length / 1024 / 1024).toFixed(2)} MiB; index.html at zip root)`);
