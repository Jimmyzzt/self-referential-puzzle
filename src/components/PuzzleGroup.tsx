import type { Puzzle, Label, Question } from '../puzzle/types';
import { LABELS } from '../puzzle/types';
import { PromptSymbol } from '../puzzle/symbols';
import { optionState, type QuestionMarking } from '../state/markings';

function QuestionCard({ question, marking, onOptionClick }: {
  question: Question;
  marking: QuestionMarking;
  onOptionClick: (label: Label) => void;
}) {
  return <article className="question-card" aria-label={`Question ${question.id}`}>
    <div className="question-head">
      <span className="question-index">{question.id}</span>
      <PromptSymbol expr={question.prompt} />
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
          <span className="option-mark" aria-hidden="true">{state === 'selected' ? '✓' : state === 'neutral' ? '' : '×'}</span>
        </button>;
      })}
    </div>
  </article>;
}

export function PuzzleGroup({ puzzle, markings, feedback, onOptionClick }: {
  puzzle: Puzzle;
  markings: QuestionMarking[];
  feedback?: 'correct' | 'wrong';
  onOptionClick: (questionIndex: number, label: Label) => void;
}) {
  const answered = markings.filter(marking => marking.selected).length;
  return <section className={`puzzle-group ${feedback ? `puzzle-group--${feedback}` : ''}`} id={puzzle.id} aria-labelledby={`${puzzle.id}-title`}>
    <div className="group-heading">
      <div>
        <span className="group-kicker">{puzzle.type === 'example' ? 'Worked example' : 'Puzzle'}</span>
        <h3 id={`${puzzle.id}-title`}>{puzzle.label}</h3>
      </div>
      <span className="group-count">{answered} / {puzzle.questions.length} marked</span>
    </div>
    <div className="question-grid">
      {puzzle.questions.map((question, index) => <QuestionCard
        key={question.id}
        question={question}
        marking={markings[index]}
        onOptionClick={label => onOptionClick(index, label)}
      />)}
    </div>
    <div className="group-foot">
      {puzzle.revealedSolution && <span className="revealed-answer">Example answer <strong>{puzzle.revealedSolution.split('').join(' · ')}</strong></span>}
      {feedback && <span className={`group-feedback group-feedback--${feedback}`} role="status">{feedback === 'correct' ? '✓ Looks right!' : '× Try this one again'}</span>}
    </div>
  </section>;
}
