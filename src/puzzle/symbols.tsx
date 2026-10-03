import type { ReactNode } from 'react';
import type { OptionExpr, OptionValue, PromptExpr } from './types';

type Renderer = (expr: never) => ReactNode;
const symbolRegistry: Record<OptionExpr['kind'], Renderer> = {
  literalOption: (expr) => <span className="prompt-letter">{(expr as Extract<OptionExpr, { kind: 'literalOption' }>).label}</span>,
  ref: (expr) => {
    const question = (expr as Extract<OptionExpr, { kind: 'ref' }>).question;
    return <span className="ref-symbol" role="img" aria-label={`answer of question ${question}`}><span aria-hidden="true">{question}</span></span>;
  },
  selfRef: () => <span className="ref-symbol" role="img" aria-label="answer of this question"><span aria-hidden="true">self</span></span>,
};

export function renderOptionExpr(expr: OptionExpr): ReactNode {
  return symbolRegistry[expr.kind](expr as never);
}

export function describeOptionValue(value: OptionValue): string {
  if (value === null) return 'question mark';
  if (typeof value !== 'object') return String(value);
  switch (value.kind) {
    case 'literalOption': return value.label;
    case 'ref': return `answer of question ${value.question}`;
    case 'selfRef': return 'answer of this question';
  }
}

export function OptionValueSymbol({ value }: { value: OptionValue }) {
  return value !== null && typeof value === 'object' ? renderOptionExpr(value) : <>{value ?? '?'}</>;
}

export function PromptSymbol({ expr }: { expr: PromptExpr }) {
  if (expr.kind === 'answer') return <span className="prompt-symbol">{renderOptionExpr(expr.target)}</span>;
  return <span className="prompt-symbol"><span aria-hidden="true">#</span><span className="sr-only">number of answers matching </span>{renderOptionExpr(expr.target)}</span>;
}
