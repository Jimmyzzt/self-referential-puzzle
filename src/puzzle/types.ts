export const LABELS = ['A', 'B', 'C', 'D', 'E'] as const;
export type Label = (typeof LABELS)[number];

export type OptionExpr =
  | { kind: 'literalOption'; label: Label }
  | { kind: 'ref'; question: number }
  | { kind: 'selfRef' };

export type CountExpr = { kind: 'count'; target: OptionExpr };
export type PromptExpr = CountExpr;

export interface Question {
  id: number;
  prompt: PromptExpr;
  options: Record<Label, number | null>;
}

export interface Puzzle {
  id: string;
  label: string;
  type: 'example' | 'puzzle';
  status: 'ready' | 'incomplete';
  questions: Question[];
  declaredSolution?: string;
  revealedSolution?: string;
}

export interface Chapter {
  id: number;
  puzzles: Puzzle[];
}
