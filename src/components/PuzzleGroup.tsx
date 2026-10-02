import type { Puzzle, Label, Question } from '../puzzle/types';
import { LABELS } from '../puzzle/types';
import { PromptSymbol } from '../puzzle/symbols';
import { optionState, type QuestionMarking } from '../state/markings';
import type { PuzzleStatus } from '../state/feedback';

function QuestionCard({ question, marking, onOptionClick, onAnswerInput }: {
  question: Question;
  marking: QuestionMarking;
  onOptionClick: (label: Label) => void;
  onAnswerInput: (label: Label | null) => void;
}) {
  return <article className="question-card" aria-label={`Question ${question.id}`}>
    <div className="question-head">
      <span className="question-index">{question.id}</span>
      <PromptSymbol expr={question.prompt} />
      <input
        className="answer-box"
        type="text"
        maxLength={1}
        value={marking.selected ?? ''}
        onFocus={event => event.currentTarget.select()}
        onChange={event => {
          const value = event.currentTarget.value.trim().toUpperCase();
          if (value === '') onAnswerInput(null);
          else if (LABELS.includes(value as Label)) onAnswerInput(value as Label);
        }}
        aria-label={`Answer to question ${question.id}, A through E`}
        autoComplete="off"
        spellCheck={false}
      />
    </div>
    <div className="options" role="group" aria-label={`Question ${question.id} options`}>
      {LABELS.map(label => {
        const state = optionState(marking, label);
        return <button
          key={label}
          type="button"
          className={`option option--${state}`}
          aria-pressed={state === 'selected'}
          aria-label={`${label}, ${question.options[label] === null ? 'question mark' : question.options[label]}, ${state === 'manual-X' ? 'manually crossed out' : state === 'auto-X' ? 'automatically crossed out' : state}`}
          onClick={() => onOptionClick(label)}
        >
          <span className="option-label">{label}</span>
          <span className="option-divider" aria-hidden="true" />
          <span className="option-value">{question.options[label] ?? '?'}</span>
          <span className="option-mark" aria-hidden="true">{state === 'selected' ? '✓' : state === 'manual-X' ? '×' : ''}</span>
        </button>;
      })}
    </div>
  </article>;
}

export function PuzzleGroup({ puzzle, markings, status, flash, onOptionClick, onAnswerInput }: {
  puzzle: Puzzle;
  markings: QuestionMarking[];
  status: PuzzleStatus;
  flash: boolean;
  onOptionClick: (questionIndex: number, label: Label) => void;
  onAnswerInput: (questionIndex: number, label: Label | null) => void;
}) {
  return <section
    className={`puzzle-group puzzle-group--questions-${puzzle.questions.length === 4 ? 4 : Math.min(puzzle.questions.length, 3)} ${status === 'correct' || status === 'wrong' ? `puzzle-group--${status}` : ''} ${flash ? 'puzzle-group--flash' : ''}`}
    data-status={status}
    id={puzzle.id}
    aria-labelledby={`${puzzle.id}-title`}
  >
    <div className="group-heading">
      <h3 id={`${puzzle.id}-title`}>{puzzle.label}</h3>
      {(status === 'correct' || status === 'wrong') && <span className="result-seal" role="status" aria-label={status === 'correct' ? 'Correct' : 'Incorrect'}>{status === 'correct' ? '✓' : '×'}</span>}
    </div>
    <div className="question-grid">
      {puzzle.questions.map((question, index) => <QuestionCard
        key={question.id}
        question={question}
        marking={markings[index]}
        onOptionClick={label => onOptionClick(index, label)}
        onAnswerInput={label => onAnswerInput(index, label)}
      />)}
    </div>
  </section>;
}
