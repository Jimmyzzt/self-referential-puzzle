# Deployment

This is a static Vite site. No server process, secrets, database, or route rewrite is required. `dist/` contains `index.html`, JS/CSS assets, and the original printable PDF.

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
