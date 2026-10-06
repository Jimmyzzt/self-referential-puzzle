# Deployment

The puzzle book builds to static assets in `dist/`: HTML, JS/CSS and the original printable PDF. Local progress and answer checking need no server. An optional Cloudflare Worker + D1 receives anonymous check statistics from the three production origins; see [Statistics.md](Statistics.md).

For the Chinese command-by-command author workflow and manual puzzle checks, see [AuthorQuickstart.md](AuthorQuickstart.md). Pages is currently at <https://jimmyzzt.github.io/self-referential-puzzle/>. Pages and itch.io are independent deployments.

## GitHub Pages

1. Push `main` to a GitHub repository.
2. In **Settings → Pages → Build and deployment**, choose **GitHub Actions** as the source.
3. The workflow in `.github/workflows/pages.yml` runs `npm ci`, `npm test`, `npm run puzzles:validate`, and `npm run build`, then deploys `dist/`.
4. The workflow sets `VITE_BASE_PATH` to `/<repository-name>/`, so links and assets work under the repository subpath. The deployed site needs no rewrite rules.

To build locally for a repository named `self-referential-puzzle`, set `VITE_BASE_PATH=/self-referential-puzzle/` and run `npm run build`.

## itch.io HTML project

1. Run `npm run build:itch`.
2. Upload `release/itch.zip` as an **HTML** project. `index.html` is at the ZIP root.
3. Enable “This file will be played in the browser” and choose a comfortable iframe viewport; players can also use fullscreen.

The itch build forces relative asset paths (`./`), includes the printable PDF, and makes no localhost or secret-env requests. Progress is local to the player's browser via `localStorage`.

## Cloudflare Worker + D1

`wrangler.jsonc` deploys the existing `self-referential-puzzle` Worker to `self-referential-puzzle.mocking-jimmy.workers.dev` and custom domain `self-refp.zzt.si`. Assets are served directly; `/api/*` runs the Worker. Binding `STATS` points to `self-referential-puzzle-stats`.

For a manual deployment, run `npx wrangler login` once, then `npm run deploy:worker`. This builds the site, deploys the Worker and applies D1 migrations. `npm run types:worker` refreshes binding types after configuration changes. Use `npm run dev:worker` for a local Worker and local D1; local data is independent of production.

The existing Cloudflare GitHub integration should use project root `.` and deploy command `npx wrangler deploy`. Wrangler's configured build command runs `npm run build`, including the solver-derived statistics catalog. The Worker initializes its idempotent schema on the first API request, so a plain automatic deployment needs no database credentials or extra migration command in GitHub. Apply future schema changes with a new migration; never rewrite an applied migration.

GitHub Pages builds independently and sends checks to the absolute workers.dev `/api/check` URL. The Worker explicitly permits the Pages origin via CORS. Both Cloudflare domains send to their own `/api/check`; all three endpoints write to the same D1 database. Local development and itch.io do not report checks by default. Set `VITE_STATS_ENDPOINT=''` to disable collection at build time. An override requires a matching allowed origin in the Worker.

`stats/index.html` is a second static Vite entry, published as `/stats/` on the Worker and `/<repository-name>/stats/` on Pages. Static directory routing also accepts `/stats` and redirects to the trailing slash. No frontend router or account is required. `/api/stats` returns only aggregate counts and caches them at the edge for five minutes; the dashboard calculates rates on read. Pages uses the same explicit CORS allowlist as answer checks. Puzzle links use the book's chapter-local hash (for example `/#Q4-B`), which selects the chapter and scrolls to the group.

The author can check `/api/stats/health` for `{ "ready": true }`. Reading original events or anonymous player IDs still requires Cloudflare database authorization. Keep OAuth/API credentials outside Git and frontend builds. Logs and traces sample 1% of API requests; their usage is separate from D1 and can be disabled in the observability configuration.

For local statistics development, run `npm run dev:worker` (port 8787) and open `/stats/`; it queries local D1. Alternatively run `npm run dev` alongside the local Worker; Vite proxies `/api` to port 8787. Production data is never needed for local UI checks.
