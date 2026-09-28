import { LABELS, type Label, type OptionExpr, type Puzzle, type Question } from './types';

export function parsePrompt(input: string): { kind: 'count'; target: OptionExpr } {
  if (!input.startsWith('#')) throw new Error(`Prompt must start with #: ${input}`);
  const body = input.slice(1);
  if (LABELS.includes(body as Label)) return { kind: 'count', target: { kind: 'literalOption', label: body as Label } };
  const ref = /^ref\(([1-9]\d*)\)$/.exec(body);
  if (ref) return { kind: 'count', target: { kind: 'ref', question: Number(ref[1]) } };
  if (body === 'self') return { kind: 'count', target: { kind: 'selfRef' } };
  throw new Error(`Unsupported prompt: ${input}`);
}

export function parsePuzzle(source: string, filename = '<text>'): Puzzle {
  let puzzle: Puzzle | undefined;
  let current: Question | undefined;
  function fail(line: number, message: string): never { throw new Error(`${filename}:${line}: ${message}`); }
  for (const [index, raw] of source.split(/\r?\n/).entries()) {
    const lineNo = index + 1;
    const line = raw.trim();
    if (!line || line.startsWith('<!--')) continue;
    const heading = /^# (Example\s*([1-9]\d*)|Q([1-9]\d*))$/.exec(line);
    if (heading) {
      if (puzzle) fail(lineNo, 'Only one puzzle per file');
      const example = Boolean(heading[2]);
      const id = example ? `Example${heading[2]}` : `Q${heading[3]}`;
      puzzle = { id, label: example ? `Example ${heading[2]}` : id, type: example ? 'example' : 'puzzle', status: 'ready', questions: [] };
      continue;
    }
    if (!puzzle) fail(lineNo, 'Expected a # Example n or # Qn heading');
    const activePuzzle = puzzle;
    if (line.startsWith('@question ')) {
      const match = /^@question ([1-9]\d*) (#[^\s]+)$/.exec(line);
      if (!match) fail(lineNo, 'Expected @question n #expression');
      const id = Number(match[1]);
      if (id !== activePuzzle.questions.length + 1) fail(lineNo, 'Question IDs must be consecutive from 1');
      const prompt = parsePrompt(match[2]);
      current = { id, prompt, options: {} as Question['options'] };
      activePuzzle.questions.push(current);
      continue;
    }
    const option = /^([A-E]):\s*(\d+|\?)$/.exec(line);
    if (option) {
      if (!current) fail(lineNo, 'Option before a question');
      const label = option[1] as Label;
      if (Object.hasOwn(current.options, label)) fail(lineNo, `Duplicate option ${label}`);
      current.options[label] = option[2] === '?' ? null : Number(option[2]);
      continue;
    }
    const directive = /^@(solution|revealed|status)\s+(.+)$/.exec(line);
    if (directive) {
      const [, key, value] = directive;
      if (key === 'status') {
        if (value !== 'incomplete') fail(lineNo, 'Only @status incomplete is supported');
        activePuzzle.status = 'incomplete';
      } else {
        if (!/^[A-E]+$/.test(value)) fail(lineNo, `${key} must be A–E labels`);
        if (key === 'solution') activePuzzle.declaredSolution = value;
        else activePuzzle.revealedSolution = value;
      }
      continue;
    }
    fail(lineNo, `Unexpected line: ${line}`);
  }
  if (!puzzle) throw new Error(`${filename}: missing heading`);
  if (!puzzle.questions.length) throw new Error(`${filename}: no questions`);
  for (const question of puzzle.questions) {
    for (const label of LABELS) {
      if (!Object.hasOwn(question.options, label)) throw new Error(`${filename}: ${puzzle.id} question ${question.id} missing ${label}`);
    }
    const unknowns = LABELS.filter(label => question.options[label] === null).length;
    if (unknowns !== 0 && unknowns !== LABELS.length) throw new Error(`${filename}: ${puzzle.id} question ${question.id} must have either five numbers or five ? marks`);
    const target = question.prompt.target;
    if (target.kind === 'ref' && target.question > puzzle.questions.length) throw new Error(`${filename}: ${puzzle.id} question ${question.id} references missing question ${target.question}`);
  }
  for (const [key, value] of [['solution', puzzle.declaredSolution], ['revealed', puzzle.revealedSolution]] as const) {
    if (value && value.length !== puzzle.questions.length) throw new Error(`${filename}: ${key} length must match question count`);
  }
  return puzzle;
}
