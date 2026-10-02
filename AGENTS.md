# Project guide

## Goal and source
- Build a static, accessible, responsive puzzle book from `My Self-referential Puzzle Book_260927_140533.pdf` in the repository root. The PDF is the transcription authority. Preserve its printed prompts, option numbers, order, and group boundaries. Blue handwriting is annotation, never default player progress.
- Keep puzzle rules out of the ordinary player interface. Developer documentation may explain them.
- No backend, accounts, database, router, large UI framework, or image-based PDF page rendering.

## Architecture and naming
- `src/content/chapter-n.puzzle.md` is the single editable puzzle source. Each file begins `# Chapter n` and contains ordered `## Example n-x` / `## Qn-x` blocks. IDs are chapter-local; uppercase letter suffixes such as Q2-A are allowed. Chapter 1 contains Example 1-1–1-5 and Q1-1–Q1-10; chapter 2 contains Example 2-1–2-2 and Q2-1–Q2-6, in their original PDF order. Chapter 3 adds two examples and seven original puzzles. HTML comments are allowed.
- `src/puzzle/parser.ts` maps each chapter and its puzzles to typed data and expression AST. `evaluator.ts` evaluates a complete candidate assignment; `solver.ts` enumerates assignments. The UI checks solver-verified solutions from the same parsed source.
- Each question has exactly five A–E options. Count prompts have five integers or five literal `?` values. Direct letter prompts (`A`, `ref(n)`, `self`) have five A–E content values or five `?` values. Do not mix value types. A question with five `?` values contributes an answer to group counts but has no equality constraint of its own. This is how Q2-6 (PDF Q16) question 6 works; solve it using the other questions.
- `src/state/markings.ts` owns the pure marking transition and direct answer-box selection. Store only manual X and selected; derive automatic X. `persistence.ts` validates localStorage data and migrates older progress. Examples start with their revealed selections. Checked puzzle answers remain marked correct or wrong until edited and survive reload.
- `src/puzzle/symbols.tsx` renders AST expressions; the evaluator never depends on typography or Unicode glyphs.
- Keep source code identifiers English; player copy stays brief and avoids revealing the rule.

## Rules and AST
- `#A` is `count(literalOption(A))`; `#ref(2)` is `count(ref(2))`; `#self` is `count(selfRef())`.
- Without `#`, `A`, `ref(2)`, and `self` directly evaluate to answer labels and compare against the selected option's content. `ref(n)` always returns a selected label, not option content. Further mechanisms in `docs/idea.md` are not yet supported; see `docs/SolverRoadmap.md`.
- For a complete assignment, resolve each reference to an answer label, count that label among all answers in the same group, and compare the resulting count with the value beside the selected option. Validate all questions simultaneously. Self, mutual, and cyclic references use this same method.
- `@solution` is a declaration to validate, not a separate answer key. Every published group must have exactly one computed solution. `@revealed` preselects the printed example answer; changing an example immediately recomputes its visual correctness.

## DSL and new puzzles
- Read `docs/PuzzleDSL.md` before editing content. Add `## Q3-8` within the appropriate `chapter-n.puzzle.md`, or create a new chapter file with scoped IDs. Use consecutive `@question n` blocks, five A–E value lines per question, then `@solution ABC`. Run `npm run puzzles:solve -- q3-8`, `npm run puzzles:validate`, `npm test`, and `npm run build`. CLI selectors `q1-1`, `e1-1`, `ch1`, and `all` are case insensitive; letter suffixes are supported.
- Do not change PDF numbers to force uniqueness. If validation fails, compare the relevant page and log the uncertainty here.

## UI and deployment
- Vite + React + TypeScript + CSS, built to static `dist/`. Display one chapter at a time with puzzle cards centered independently of the chapter status panel. Buttons are keyboard accessible, at least 44 px tall on touch devices, with visible X/check marks and focus. Respect reduced motion. Keep the original PDF as a printable asset. `public/itch-cover.png` is the user-supplied game jam cover.
- GitHub Pages uses repository subpath base; itch build uses relative asset paths. See `docs/Deployment.md`.

## Open source issues / transcription notes
- Q2-6 (original Q16) question 6 has `?` beside A, B, C, D, and E in the source PDF (page 7). These are part of the puzzle, not missing transcription. Preserve them as `?`. The other five questions constrain the sixth answer. Never replace the question marks with inferred integers.
- All nine examples and twenty-three puzzles currently have one computed solution. Keep each declaration aligned with the solver result.
- The PDF writes plain letter prompts without `#`; chapters 1–2 add `#` consistently by request. Chapter 3 intentionally uses bare letters for the direct-label mechanism. The PDF's original `#1`–`#10` become `Q1-1`–`Q1-10`, and `#11`–`#16` become `Q2-1`–`Q2-6`. Preserve this mapping in legacy progress migration.
