import { LABELS, type Chapter, type Label, type OptionExpr, type Puzzle, type Question } from './types';

// Preserve newlines so comments do not shift diagnostic line numbers.
function stripComments(source: string, filename: string): string {
  let inside = false;
  let output = '';
  let line = 1;
  let openingLine = 0;
  for (let index = 0; index < source.length;) {
    if (!inside && source.startsWith('<!--', index)) {
      inside = true;
      openingLine = line;
      output += ' ';
      index += 4;
    } else if (inside && source.startsWith('-->', index)) {
      inside = false;
      index += 3;
    } else {
      const character = source[index++];
      if (character === '\n') line++;
      if (!inside || character === '\n' || character === '\r') output += character;
    }
  }
  if (inside) throw new Error(`${filename}:${openingLine}: unclosed HTML comment`);
  return output;
}

const puzzleHeading = /^# (Example\s*((?:[1-9]\d*-)?(?:[1-9]\d*|[A-Z]+))|Q((?:[1-9]\d*-)?(?:[1-9]\d*|[A-Z]+)))$/;

export function parsePrompt(input: string): Question['prompt'] {
  if (input === '?') return { kind: 'unknown' };
  const count = input.startsWith('#');
  const body = count ? input.slice(1) : input;
  let target: OptionExpr;
  if (LABELS.includes(body as Label)) target = { kind: 'literalOption', label: body as Label };
  else {
    const ref = /^ref\(([1-9]\d*)\)$/.exec(body);
    if (ref) target = { kind: 'ref', question: Number(ref[1]) };
    else if (body === 'self') target = { kind: 'selfRef' };
    else throw new Error(`Unsupported prompt: ${input}`);
  }
  return { kind: count ? 'count' : 'answer', target };
}

export function parsePuzzle(source: string, filename = '<text>'): Puzzle {
  let puzzle: Puzzle | undefined;
  let current: Question | undefined;
  function fail(line: number, message: string): never { throw new Error(`${filename}:${line}: ${message}`); }
  for (const [index, raw] of stripComments(source, filename).split(/\r?\n/).entries()) {
    const lineNo = index + 1;
    const line = raw.trim();
    if (!line) continue;
    const heading = puzzleHeading.exec(line);
    if (heading) {
      if (puzzle) fail(lineNo, 'Only one puzzle per block');
      const example = Boolean(heading[2]);
      const id = example ? `Example${heading[2]}` : `Q${heading[3]}`;
      puzzle = { id, label: example ? `Example ${heading[2]}` : id, type: example ? 'example' : 'puzzle', status: 'ready', questions: [] };
      continue;
    }
    if (!puzzle) fail(lineNo, 'Expected a # Example chapter-id or # Qchapter-id heading');
    const activePuzzle = puzzle;
    if (line.startsWith('@question ')) {
      const match = /^@question ([1-9]\d*) ([^\s]+)$/.exec(line);
      if (!match) fail(lineNo, 'Expected @question n expression');
      const id = Number(match[1]);
      if (id !== activePuzzle.questions.length + 1) fail(lineNo, 'Question IDs must be consecutive from 1');
      let prompt: Question['prompt'];
      try { prompt = parsePrompt(match[2]); } catch (error) { fail(lineNo, (error as Error).message); }
      current = { id, prompt, options: {} as Question['options'] };
      activePuzzle.questions.push(current);
      continue;
    }
    const option = /^([A-E]):\s*(\d+|[A-E]|\?|ref\([1-9]\d*\))$/.exec(line);
    if (option) {
      if (!current) fail(lineNo, 'Option before a question');
      const label = option[1] as Label;
      if (Object.hasOwn(current.options, label)) fail(lineNo, `Duplicate option ${label}`);
      current.options[label] = option[2] === '?' ? null
        : LABELS.includes(option[2] as Label) ? option[2] as Label
        : option[2].startsWith('ref(') ? { kind: 'ref', question: Number(option[2].slice(4, -1)) }
        : Number(option[2]);
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
    if (unknowns !== 0 && unknowns !== LABELS.length) throw new Error(`${filename}: ${puzzle.id} question ${question.id} must have either five concrete values or five ? marks`);
    if (question.prompt.kind === 'unknown' && unknowns !== LABELS.length) {
      throw new Error(filename + ': ' + puzzle.id + ' question ' + question.id + ' requires five ? marks for a ? prompt');
    }
    if (unknowns === 0) {
      const numeric = question.prompt.kind === 'count';
      if (LABELS.some(label => numeric
        ? typeof question.options[label] !== 'number'
        : typeof question.options[label] !== 'string' && typeof question.options[label] !== 'object')) {
        throw new Error(`${filename}: ${puzzle.id} question ${question.id} requires five ${numeric ? 'numbers for a count prompt' : 'A–E labels or ref(n) values for an answer prompt'}`);
      }
    }
    const targets = [...(question.prompt.kind === 'unknown' ? [] : [question.prompt.target]), ...LABELS.flatMap(label => {
      const value = question.options[label];
      return value !== null && typeof value === 'object' ? [value] : [];
    })];
    for (const target of targets) {
      if (target.kind === 'ref' && target.question > puzzle.questions.length) throw new Error(`${filename}: ${puzzle.id} question ${question.id} references missing question ${target.question}`);
    }
  }
  for (const [key, value] of [['solution', puzzle.declaredSolution], ['revealed', puzzle.revealedSolution]] as const) {
    if (value && value.length !== puzzle.questions.length) throw new Error(`${filename}: ${key} length must match question count`);
  }
  return puzzle;
}

export function parseChapter(source: string, filename = '<text>'): Chapter {
  const lines = stripComments(source, filename).split(/\r?\n/);
  const first = lines.findIndex(line => line.trim().length > 0);
  const heading = first < 0 ? null : /^# Chapter ([1-9]\d*)$/.exec(lines[first].trim());
  if (!heading) throw new Error(`${filename}: expected # Chapter n`);
  const blocks: { line: number; lines: string[] }[] = [];
  for (let index = first + 1; index < lines.length; index++) {
    const line = lines[index];
    if (line.trim().startsWith('## ')) {
      if (!puzzleHeading.test(line.trim().slice(1))) {
        throw new Error(`${filename}:${index + 1}: invalid puzzle heading`);
      }
      blocks.push({ line: index + 1, lines: [line.trim().slice(1)] });
    } else if (blocks.length) {
      blocks[blocks.length - 1].lines.push(line);
    } else if (line.trim()) {
      throw new Error(`${filename}:${index + 1}: expected ## Example chapter-id or ## Qchapter-id`);
    }
  }
  if (!blocks.length) throw new Error(`${filename}: chapter contains no puzzles`);
  const puzzles = blocks.map(block => parsePuzzle(block.lines.join('\n'), `${filename}:${block.line}`));
  for (const puzzle of puzzles) {
    const chapterPrefix = /^(?:Example|Q)([1-9]\d*)-/.exec(puzzle.id);
    if (!chapterPrefix || Number(chapterPrefix[1]) !== Number(heading[1])) {
      throw new Error(`${filename}: ${puzzle.id} must use chapter ${heading[1]} numbering`);
    }
  }
  const ids = puzzles.map(puzzle => puzzle.id);
  if (new Set(ids).size !== ids.length) throw new Error(`${filename}: duplicate puzzle ID`);
  for (const kind of ['Q', 'Example']) {
    const numeric = puzzles.filter(puzzle => new RegExp('^' + kind + '[1-9]\\d*-[1-9]\\d*$').test(puzzle.id));
    numeric.forEach((puzzle, index) => {
      if (Number(puzzle.id.split('-')[1]) !== index + 1) {
        throw new Error(filename + ': numeric ' + kind + ' IDs must be consecutive from 1; expected '
          + kind + heading[1] + '-' + (index + 1) + ', actual ' + puzzle.id);
      }
    });
  }
  return { id: Number(heading[1]), puzzles };
}
