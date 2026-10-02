import type { ReactNode } from 'react';
import type { OptionExpr, PromptExpr } from './types';

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

export function PromptSymbol({ expr }: { expr: PromptExpr }) {
  if (expr.kind === 'answer') return <span className="prompt-symbol">{renderOptionExpr(expr.target)}</span>;
  return <span className="prompt-symbol"><span aria-hidden="true">#</span><span className="sr-only">number of answers matching </span>{renderOptionExpr(expr.target)}</span>;
}
