# Puzzle DSL

The editable source is one `.puzzle.md` file per chapter in `src/content/`. It is intentionally line oriented and easy to diff. Edit these files, not React components or generated JSON. Puzzles render in the order they appear in the chapter file.

## Syntax

```text
# Chapter 3                   one chapter per file

## Example 3-1               example: chapter-local ID

@question 1 #A
A: 1
B: 0
C: 2
D: 3
E: 4

@revealed A                  preselects the example answer
@solution A                  checked against the solver

## Q3-1

@question 1 #ref(1)           self reference through question 1
A: 1                          exactly A, B, C, D, E; any nonnegative integer
B: 0
C: 0
D: 0
E: 0

@solution A                   one label per question; checked against the solver
```

Blank lines are ignored. Each file has one `# Chapter n` heading and one or more `## Example n-x` / `## Qn-x` blocks. The chapter prefix must match the chapter heading. Local IDs may be positive integers or uppercase letters: `Q2-A`, `Q2-B`, and `Q2-AA` are valid bonus IDs. Neither numeric nor bonus IDs reorder the source. Each block has at least one question. Within a group, `@question` IDs remain consecutive integers from 1; `ref(n)` refers to these internal IDs, not the group's title.

Option order should follow A–E for readability. `@solution` is the author's declared answer; the validator computes solutions independently and requires exactly one. `@revealed AC` is optional for examples and preselects those answers in the player UI; editing an example immediately updates its correctness badge. `@status incomplete` makes the solver refuse a draft; drafts must be kept outside the published `src/content/` directory until ready.

HTML comments `<!-- ... -->` are supported before headings, between puzzles, on a line after a value, and across multiple lines. Commented-out headings and directives are ignored. Unclosed comments produce an error. Example:

```text
<!-- Drafting notes can span
multiple lines without appearing in the UI. -->
@question 1 #A
A: 1 <!-- author note -->
```

Chapter 1 contains Example 1-1, Q1-1, Q1-2, Example 1-2, Q1-3, Q1-4, and so on through Example 1-5, Q1-9, Q1-10. Chapter 2 contains Example 2-1, Q2-1, Q2-2, Example 2-2, Q2-3, Q2-4, Q2-A, Q2-B. This preserves the original PDF order: former Example 6–7 become Example 2-1–2-2; former Q11–Q14 become Q2-1–Q2-4, and Q15–Q16 become Q2-A–Q2-B. Stored markings and checked results also migrate from the earlier Q2-5/Q2-6 names. Later chapters are author-designed puzzles; their contents and display order are defined by the chapter files. Validation has no fixed list of required puzzle IDs: renaming or removing a group is allowed, while format, duplicate IDs, references, uniqueness and declarations are still checked.

## Expressions

| DSL | AST | Meaning |
| --- | --- | --- |
| `#A` | `count(literalOption('A'))` | Count A among all answers in this group |
| `#ref(2)` | `count(ref(2))` | Count the label selected for question 2 |
| `#self` | `count(selfRef())` | Count the current question's selected label |
| `A` | `answer(literalOption('A'))` | The literal answer label A |
| `ref(2)` | `answer(ref(2))` | The selected answer label of question 2 |
| `self` | `answer(selfRef())` | The selected answer label of this question |

Count prompts require five numeric values, or five literal `?` values. Direct answer prompts require five A–E values, or five `?` values. Types cannot be mixed. A complete assignment is valid when each prompt's result equals the content beside that question's selected option; all questions are checked simultaneously. Direct `ref(n)` looks up the selected label, not the option's content.

```text
@question 1 A
A: B
B: A
C: C
D: D
E: E
```

Here only B is valid: selecting B gives option content A, matching the literal prompt A. This is the first mechanism from `docs/idea.md`, used in chapter 3. Other ideas remain design proposals; see [Solver roadmap](SolverRoadmap.md).

Question 1 may use `#ref(1)` for self reference. A mutual pair can use `#ref(2)` and `#ref(1)`. A three-question cycle can use `#ref(2)`, `#ref(3)`, and `#ref(1)`. No special evaluation order is needed: each complete candidate assignment fixes all references before checking every option value.

The PDF's boxed circled number is represented as `ref(n)` in the DSL. The symbol registry renders it as a boxed circle with an accessible label. Plain letter prompts in the PDF receive `#` in the web edition.

## Literal question marks in Q2-B (PDF Q16)

Q2-B question 6 (Q16 in the PDF) prints `?` beside all five options. These marks are part of the source puzzle. Write `A: ?` through `E: ?` exactly. A question with five question-mark values contributes its chosen label to every group count, but imposes no equality of its own. The other questions still determine a unique six-letter assignment. A mixture of other values and question marks within one question is rejected, so a typo cannot silently weaken a constraint.

## Adding or changing a puzzle

1. Add `## Q3-8` to chapter 3, or create `src/content/chapter-4.puzzle.md` beginning with `# Chapter 4` and use `## Q4-1`. Add consecutive `@question` blocks, five options per question, and `@solution`.
2. Use `npm run puzzles:solve -- q3-8` to inspect all computed solutions.
3. Run `npm run puzzles:validate`, `npm test`, and `npm run build`.
4. If uniqueness fails, inspect the source carefully. Never change a printed value merely to make the validator green.

The browser imports raw `.puzzle.md` files with Vite, parses them, computes each solution, and checks the declaration before rendering. The CLI reads those same files directly. No separate answer key exists.

Selectors are case insensitive: `q1-1` selects Q1-1, `e1-1` selects Example 1-1 (also accepts `Example1-1`), `q2-a` selects Q2-A when present, `ch1` selects every puzzle in chapter 1, and `all` selects the entire book. A path such as `src/content/chapter-2.puzzle.md` also selects that chapter. Old global selectors such as `Q11` are replaced by `q2-1`.

The solve command reports zero, one, or multiple solutions for inspection. A successful command alone does not certify publication: use `puzzles:validate` to require exactly one solution and a matching declaration. See [Author quick start](AuthorQuickstart.md) for a manual workflow.
