# Made My Own Self-Referential Puzzle Book

An interactive static edition of the seven-page puzzle book in the repository root. It includes seven examples and Q1–Q16, transcribed as native web content from the PDF. The original PDF is available through **Printable PDF**.

## Run it

```bash
npm install
npm run dev
npm test
npm run puzzles:validate
npm run build
```

The site has no backend. It saves X and ✓ marks in the browser. A completed group can be checked without finishing later groups. **Reset progress** asks for confirmation before clearing markings.

## Edit or create puzzles

The source of truth is `src/content/*.puzzle.md`. Each file contains a group heading, question prompts, A–E values, and a declared solution. `src/puzzle/parser.ts` builds the AST; `evaluator.ts` and `solver.ts` check every complete candidate assignment. The browser uses the computed, validated solution from the same data, with no separate answer key.

Read [PuzzleDSL.md](docs/PuzzleDSL.md) for syntax and examples. Useful commands:

```bash
npm run puzzles:solve -- Q14
npm run puzzles:solve -- all
npm run puzzles:validate
```

Q16's last question has five literal `?` values in the PDF. Those are preserved. Its answer is determined by the other questions; no values were invented.

## Project map

- `src/content/`: puzzle DSL files
- `src/puzzle/`: types, AST parser, evaluator, solver, browser collection, and symbol registry
- `src/state/`: pure option transitions, persistence, checking, and cooldown
- `src/components/`, `src/app.tsx`, `src/styles/`: responsive UI
- `scripts/`: validation, solving, and itch packaging
- `docs/`: [DSL](docs/PuzzleDSL.md) and [deployment](docs/Deployment.md)
- `AGENTS.md`: ongoing engineering conventions and source notes

## Deploy

The Pages workflow tests and deploys `dist/` on pushes to `main`. Enable **GitHub Actions** as the Pages source under repository **Settings → Pages**. Repository subpaths are handled by `VITE_BASE_PATH`.

Run `npm run build:itch` to create `release/itch.zip` with `index.html` at its root. See [Deployment.md](docs/Deployment.md) for upload steps.

Inspired by [Brainzilla's Self-Referential Quiz](https://www.brainzilla.com/logic/self-referential-quiz/). Special thanks to xxuurruuii for helping shape this into a playable puzzle. Feedback is welcome.
