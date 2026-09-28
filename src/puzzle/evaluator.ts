import { LABELS, type Label, type OptionExpr, type Puzzle } from './types';

export function evaluateOption(expr: OptionExpr, answers: readonly Label[], questionIndex: number): Label {
  switch (expr.kind) {
    case 'literalOption': return expr.label;
    case 'ref': {
      const answer = answers[expr.question - 1];
      if (!answer) throw new Error(`Missing answer for ref(${expr.question})`);
      return answer;
    }
    case 'selfRef': {
      const answer = answers[questionIndex];
      if (!answer) throw new Error('Missing self answer');
      return answer;
    }
  }
}

export function isSolution(puzzle: Puzzle, answers: readonly Label[]): boolean {
  if (puzzle.status === 'incomplete') throw new Error(`${puzzle.id} is marked incomplete`);
  if (answers.length !== puzzle.questions.length || answers.some(answer => !LABELS.includes(answer))) return false;
  const counts = Object.fromEntries(LABELS.map(label => [label, answers.filter(answer => answer === label).length])) as Record<Label, number>;
  return puzzle.questions.every((question, index) => {
    if (LABELS.every(label => question.options[label] === null)) return true;
    const target = evaluateOption(question.prompt.target, answers, index);
    return question.options[answers[index]] === counts[target];
  });
}
