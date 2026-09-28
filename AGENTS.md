# Project guide

## Goal and source
- Build a static, accessible, responsive puzzle book from `My Self-referential Puzzle Book_260927_140533.pdf` in the repository root. The PDF is the transcription authority. Preserve its printed prompts, option numbers, order, and group boundaries. Blue handwriting is annotation, never default player progress.
- Keep puzzle rules out of the ordinary player interface. Developer documentation may explain them.
- No backend, accounts, database, router, large UI framework, or image-based PDF page rendering.

## Architecture and naming
- `src/content/*.puzzle.md` is the single editable puzzle source. IDs are `Example1` through `Example7`, then `Q1` through `Q16`. The UI labels examples as `Example 1`, etc.
- `src/puzzle/parser.ts` maps the DSL to typed data and expression AST. `evaluator.ts` evaluates a complete candidate assignment; `solver.ts` enumerates assignments. The UI checks solver-verified solutions from the same parsed source.
- Each question has exactly five A–E options. Values are integers or literal `?` from the PDF. A question with five `?` values contributes an answer to the group counts but has no numerical constraint of its own. This is how Q16 question 6 works; solve it using the other questions.
- `src/state/markings.ts` owns the pure marking transition. Store only manual X and selected; derive automatic X. `persistence.ts` validates localStorage data.
- `src/puzzle/symbols.tsx` renders AST expressions; the evaluator never depends on typography or Unicode glyphs.
- Keep source code identifiers English; player copy stays brief and avoids revealing the rule.

## Rules and AST
- `#A` is `count(literalOption(A))`; `#ref(2)` is `count(ref(2))`; `#self` is `count(selfRef())`.
- For a complete assignment, resolve each reference to an answer label, count that label among all answers in the same group, and compare the resulting count with the value beside the selected option. Validate all questions simultaneously. Self, mutual, and cyclic references use this same method.
- `@solution` is a declaration to validate, not a separate answer key. Every published group must have exactly one computed solution. `@revealed` is optional example display data and never enters progress.

## DSL and new puzzles
- Read `docs/PuzzleDSL.md` before editing content. Add `src/content/Q17.puzzle.md`, use `@question n #A` / `#ref(n)` / `#self`, five A–E value lines per question, then `@solution ABC`. Run `npm run puzzles:solve -- Q17`, `npm run puzzles:validate`, `npm test`, and `npm run build`.
- Do not change PDF numbers to force uniqueness. If validation fails, compare the relevant page and log the uncertainty here.

## UI and deployment
- Vite + React + TypeScript + CSS, built to static `dist/`. Buttons are keyboard accessible, at least 44 px tall on touch devices, with visible X/check marks and focus. Respect reduced motion. Keep the original PDF as a printable asset.
- GitHub Pages uses repository subpath base; itch build uses relative asset paths. See `docs/Deployment.md`.

## Open source issues / transcription notes
- Q16 question 6 has `?` beside A, B, C, D, and E in the source PDF (page 7). These are part of the puzzle, not missing transcription. Preserve them as `?`. The other five questions constrain the sixth answer. Never replace the question marks with inferred integers.
- All seven examples and Q1–Q16 have one computed solution under the PDF transcription, including Q16 with its question marks. Keep each declaration aligned with the solver result.
- The PDF writes plain letter prompts without `#`; the web DSL/rendering adds `#` consistently by request. The original `#1`–`#16` group labels become `Q1`–`Q16`.
