# Made My Own Self-Referential Puzzle Book

An interactive static edition of the seven-page puzzle book in the repository root, extended with original chapters. Chapters 1–2 preserve the seven PDF examples and sixteen puzzles; chapter 3 introduces direct letter references, and chapter 4 adds references in option contents. Groups use chapter-local numbering, with letter suffixes for bonus puzzles. The original PDF is available through **Game jam PDF**.

## Run it

```bash
npm install
npm run dev
npm test
npm run puzzles:validate
npm run build
```

The site has no backend. It shows one chapter at a time and saves X, ✓, and checked results in the browser. Examples start with their printed answers selected and update correctness immediately when edited. A completed puzzle can be checked without finishing later puzzles. **Reset progress** asks for confirmation before clearing markings; examples return to their printed answers.

## Edit or create puzzles

The source of truth is `src/content/chapter-n.puzzle.md`. Each chapter file contains its puzzles in display order, with question prompts, A–E values, and declared solutions. HTML comments are supported. `src/puzzle/parser.ts` builds the AST; `evaluator.ts` and `solver.ts` check every complete candidate assignment. The browser uses the computed, validated solution from the same data, with no separate answer key.

Read [PuzzleDSL.md](docs/PuzzleDSL.md) for syntax and examples. Useful commands:

```bash
npm run puzzles:solve -- q2-4
npm run puzzles:solve -- e1-1
npm run puzzles:solve -- ch3
npm run puzzles:solve -- src/content/chapter-2.puzzle.md
npm run puzzles:solve -- all
npm run puzzles:validate
```

Q2-B (formerly PDF Q16, previously Q2-6) has five literal `?` values in its last question. Those are preserved. Its answer is determined by the other questions; no values were invented. See the Chinese [author quick start](docs/AuthorQuickstart.md) for manual checks and deployment, and the [solver roadmap](docs/SolverRoadmap.md) for future mechanisms.

## Project map

- `src/content/`: one puzzle DSL file per chapter
- `src/puzzle/`: types, AST parser, evaluator, solver, browser collection, and symbol registry
- `src/state/`: pure option transitions, direct selection, persistence, checking, and cooldown
- `src/components/`, `src/app.tsx`, `src/styles/`: responsive UI
- `scripts/`: validation, solving, and itch packaging
- `docs/`: [DSL](docs/PuzzleDSL.md) and [deployment](docs/Deployment.md)
- `AGENTS.md`: ongoing engineering conventions and source notes

## Deploy

The Pages workflow tests and deploys `dist/` on pushes to `main`. Enable **GitHub Actions** as the Pages source under repository **Settings → Pages**. Repository subpaths are handled by `VITE_BASE_PATH`.

Run `npm run build:itch` to create `release/itch.zip` with `index.html` at its root. See [Deployment.md](docs/Deployment.md) for upload steps.

Inspired by [Brainzilla's Self-Referential Quiz](https://www.brainzilla.com/logic/self-referential-quiz/). Special thanks to xxuurruuii for helping shape this into a playable puzzle. Feedback is welcome.
