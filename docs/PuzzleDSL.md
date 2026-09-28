# Puzzle DSL

The editable source is one `.puzzle.md` file per group in `src/content/`. It is intentionally line oriented and easy to diff. Edit these files, not React components or generated JSON.

## Syntax

```text
# Q17                         heading: Qn or Example n

@question 1 #A                consecutive question number and count prompt
A: 1                          exactly A, B, C, D, E; any nonnegative integer
B: 0
C: 2
D: 3
E: 4

@question 2 #ref(1)           count answers matching question 1's answer
A: 1
B: 2
C: 0
D: 3
E: 4

@solution AC                  one label per question; checked against the solver
```

Blank lines are ignored. Each file has one heading and at least one question. Option order should follow A–E for readability. `@solution` is the author's declared answer; the validator computes solutions independently and requires exactly one. `@revealed AC` is optional and shows the printed example answer on the player page without adding markings to saved progress. `@status incomplete` can mark a future unpublished draft and makes the solver refuse it; do not use it for Q16.

## Expressions

| DSL | AST | Meaning |
| --- | --- | --- |
| `#A` | `count(literalOption('A'))` | Count A among all answers in this group |
| `#ref(2)` | `count(ref(2))` | Count the label selected for question 2 |
| `#self` | `count(selfRef())` | Count the current question's selected label |

Question 1 may use `#ref(1)` for self reference. A mutual pair can use `#ref(2)` and `#ref(1)`. A three-question cycle can use `#ref(2)`, `#ref(3)`, and `#ref(1)`. No special evaluation order is needed: each complete candidate assignment fixes all references before checking every option value.

The PDF's boxed circled number is represented as `ref(n)` in the DSL. The symbol registry renders it as a boxed circle with an accessible label. Plain letter prompts in the PDF receive `#` in the web edition.

## Literal question marks in Q16

Q16 question 6 prints `?` beside all five options. These marks are part of the source puzzle. Write `A: ?` through `E: ?` exactly. A question with five question-mark values contributes its chosen label to every group count, but imposes no numeric equality of its own. The other questions still determine a unique six-letter assignment. A mixture of numbers and question marks within one question is rejected, so a typo cannot silently weaken a constraint.

## Adding or changing a puzzle

1. Add `src/content/Q17.puzzle.md` with `# Q17`, consecutive `@question` blocks, five options per question, and `@solution`.
2. Use `npm run puzzles:solve -- Q17` to inspect all computed solutions.
3. Run `npm run puzzles:validate`, `npm test`, and `npm run build`.
4. If uniqueness fails, inspect the source carefully. Never change a printed value merely to make the validator green.

The browser imports raw `.puzzle.md` files with Vite, parses them, computes each solution, and checks the declaration before rendering. The CLI reads those same files directly. No separate answer key exists.
