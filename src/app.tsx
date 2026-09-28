import { useEffect, useRef, useState } from 'react';
import { puzzles, verifiedSolutions } from './puzzle/book';
import type { Label } from './puzzle/types';
import { PuzzleGroup } from './components/PuzzleGroup';
import { clickOption } from './state/markings';
import { clearProgress, freshProgress, restoreProgress, saveProgress, STORAGE_KEY, type Progress } from './state/persistence';
import { beginCooldown, canCheck, checkCompleted, type CheckResult } from './state/checker';

const MUTE_KEY = 'self-referential-puzzle-muted-v1';

function readProgress(): Progress {
  try { return restoreProgress(localStorage.getItem(STORAGE_KEY), puzzles); }
  catch { return freshProgress(puzzles); }
}

function readMuted(): boolean {
  try { return localStorage.getItem(MUTE_KEY) === 'true'; }
  catch { return false; }
}

function playFeedback(kind: 'correct' | 'wrong') {
  const AudioContextClass = window.AudioContext;
  if (!AudioContextClass) return;
  const context = new AudioContextClass();
  const notes = kind === 'correct' ? [659, 880] : [262, 196];
  notes.forEach((frequency, index) => {
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = 'sine';
    oscillator.frequency.value = frequency;
    const start = context.currentTime + index * 0.11;
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(0.08, start + 0.014);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.16);
    oscillator.connect(gain).connect(context.destination);
    oscillator.start(start);
    oscillator.stop(start + 0.17);
  });
  window.setTimeout(() => { void context.close(); }, 450);
}

export default function App() {
  const [progress, setProgress] = useState<Progress>(readProgress);
  const [muted, setMuted] = useState(readMuted);
  const [feedback, setFeedback] = useState<CheckResult>({});
  const [notice, setNotice] = useState('');
  const [cooldownUntil, setCooldownUntil] = useState(0);
  const [now, setNow] = useState(Date.now());
  const noticeTimer = useRef<number | undefined>(undefined);
  const feedbackTimer = useRef<number | undefined>(undefined);

  useEffect(() => {
    try { saveProgress(localStorage, progress); } catch { /* Storage is optional. */ }
  }, [progress]);
  useEffect(() => {
    try { localStorage.setItem(MUTE_KEY, String(muted)); } catch { /* Storage is optional. */ }
  }, [muted]);
  useEffect(() => {
    if (canCheck(now, cooldownUntil)) return;
    const timer = window.setInterval(() => setNow(Date.now()), 100);
    return () => window.clearInterval(timer);
  }, [cooldownUntil, now]);
  useEffect(() => () => {
    window.clearTimeout(noticeTimer.current);
    window.clearTimeout(feedbackTimer.current);
  }, []);

  function setTemporaryNotice(message: string) {
    setNotice(message);
    window.clearTimeout(noticeTimer.current);
    noticeTimer.current = window.setTimeout(() => setNotice(''), 3500);
  }

  function mark(puzzleId: string, questionIndex: number, label: Label) {
    setProgress(previous => ({
      ...previous,
      [puzzleId]: previous[puzzleId].map((marking, index) => index === questionIndex ? clickOption(marking, label) : marking),
    }));
    setFeedback(previous => {
      const next = { ...previous };
      delete next[puzzleId];
      return next;
    });
  }

  function checkAnswers() {
    const timestamp = Date.now();
    if (!canCheck(timestamp, cooldownUntil)) return;
    setNow(timestamp);
    setCooldownUntil(beginCooldown(timestamp));
    const result = checkCompleted(puzzles, verifiedSolutions, progress);
    setFeedback({});
    window.clearTimeout(feedbackTimer.current);
    if (!Object.keys(result).length) {
      setTemporaryNotice('Finish every question in a puzzle first.');
      return;
    }
    window.requestAnimationFrame(() => setFeedback(result));
    const correct = Object.values(result).filter(value => value === 'correct').length;
    const wrong = Object.keys(result).length - correct;
    setTemporaryNotice(wrong ? `${correct} right · ${wrong} to revisit` : `${correct} puzzle${correct === 1 ? '' : 's'} looking good!`);
    if (!muted) playFeedback(wrong ? 'wrong' : 'correct');
    if (!wrong && typeof navigator.vibrate === 'function') navigator.vibrate(30);
    feedbackTimer.current = window.setTimeout(() => setFeedback({}), 2600);
  }

  function reset() {
    if (!window.confirm('Reset all your X and ✓ marks? This cannot be undone.')) return;
    try { clearProgress(localStorage); } catch { /* Storage is optional. */ }
    setProgress(freshProgress(puzzles));
    setFeedback({});
    setTemporaryNotice('Progress reset.');
  }

  const completed = puzzles.filter(puzzle => progress[puzzle.id]?.every(marking => marking.selected)).length;
  const cooldownSeconds = Math.max(0, Math.ceil((cooldownUntil - now) / 1000));
  const examples = puzzles.filter(puzzle => puzzle.type === 'example');
  const first = puzzles.filter(puzzle => /^Q([1-6])$/.test(puzzle.id));
  const middle = puzzles.filter(puzzle => /^Q(7|8|9|10|11|12)$/.test(puzzle.id));
  const last = puzzles.filter(puzzle => /^Q(13|14|15|16)$/.test(puzzle.id));

  return <>
    <header className="site-header" id="top">
      <div className="header-inner">
        <span className="brand-mark" aria-hidden="true">#</span>
        <a className="brand" href="#top">Self-Referential Puzzle Book</a>
        <nav className="top-nav" aria-label="Main navigation">
          <a href="#examples">Examples</a><a href="#puzzles">Puzzles</a><a href="#about">About</a>
        </nav>
      </div>
    </header>
    <main>
      <section className="hero" aria-labelledby="page-title">
        <div className="hero-copy">
          <span className="eyebrow">A small rule-discovery puzzle</span>
          <h1 id="page-title">Made My Own<br /><em>Self-Referential</em><br />Puzzle Book</h1>
          <p className="hero-subtitle">A little book of questions that seem to know each other.</p>
          <div className="meta-strip"><span>Each puzzle has a unique solution.</span><span>The same rules apply throughout.</span></div>
          <div className="hero-actions"><a className="primary-link" href="#examples">Start with the examples <span aria-hidden="true">↗</span></a><a className="text-link" href={`${import.meta.env.BASE_URL}Printable-Puzzle-Book.pdf`} target="_blank" rel="noreferrer">Printable PDF ↗</a></div>
        </div>
        <div className="hero-art" aria-hidden="true"><div className="art-card art-card--back">#<span>?</span></div><div className="art-card art-card--front"><span className="art-label">QUESTION 01</span><strong>#C</strong><span className="art-lines">A <i /> 2<br />B <i /> 0<br />C <i /> 2</span><span className="art-stamp">FIGURE IT OUT</span></div></div>
      </section>
      <div className="book-layout">
        <aside className="book-sidebar" aria-label="Book guide">
          <div className="sidebar-card"><span className="sidebar-label">HOW TO PLAY</span><p>Figure out what it all means <span aria-hidden="true">🤔</span></p><span className="sidebar-rule" /><p className="small-copy">Tap once for <b className="red-x">×</b>. Tap again for <b className="green-check">✓</b>. Check a puzzle when all its questions have a check.</p></div>
          <div className="sidebar-progress"><span className="sidebar-label">YOUR PAGE</span><strong>{completed}<span> / {puzzles.length}</span></strong><small>puzzles ready to check</small></div>
          <a className="sidebar-pdf" href={`${import.meta.env.BASE_URL}Printable-Puzzle-Book.pdf`} target="_blank" rel="noreferrer">↗ Printable PDF</a>
        </aside>
        <div className="book-content">
          <section className="book-section" id="examples" aria-labelledby="examples-heading"><div className="section-heading"><span className="chapter-index">01 / THE BEGINNING</span><h2 id="examples-heading">Examples</h2><p>Seven little hints. The answers are shown, but the reason is yours to find.</p></div><div className="groups">{examples.map(puzzle => <PuzzleGroup key={puzzle.id} puzzle={puzzle} markings={progress[puzzle.id]} feedback={feedback[puzzle.id]} onOptionClick={(index, label) => mark(puzzle.id, index, label)} />)}</div></section>
          <section className="book-section" id="puzzles" aria-labelledby="puzzles-heading"><div className="section-heading"><span className="chapter-index">02 / YOUR TURN</span><h2 id="puzzles-heading">The puzzles</h2><p>Start small. Every option is a possibility until you decide otherwise.</p></div><div className="groups">{first.map(puzzle => <PuzzleGroup key={puzzle.id} puzzle={puzzle} markings={progress[puzzle.id]} feedback={feedback[puzzle.id]} onOptionClick={(index, label) => mark(puzzle.id, index, label)} />)}</div></section>
          <section className="book-section" aria-labelledby="more-heading"><div className="section-heading"><span className="chapter-index">03 / A LITTLE DEEPER</span><h2 id="more-heading">More to consider</h2></div><div className="groups">{middle.map(puzzle => <PuzzleGroup key={puzzle.id} puzzle={puzzle} markings={progress[puzzle.id]} feedback={feedback[puzzle.id]} onOptionClick={(index, label) => mark(puzzle.id, index, label)} />)}</div></section>
          <section className="book-section" aria-labelledby="last-heading"><div className="section-heading"><span className="chapter-index">04 / FULL CIRCLE</span><h2 id="last-heading">The last pages</h2></div><div className="groups">{last.map(puzzle => <PuzzleGroup key={puzzle.id} puzzle={puzzle} markings={progress[puzzle.id]} feedback={feedback[puzzle.id]} onOptionClick={(index, label) => mark(puzzle.id, index, label)} />)}</div></section>
          <section className="about" id="about" aria-labelledby="about-heading"><span className="chapter-index">ABOUT THIS BOOK</span><h2 id="about-heading">Made for curious minds.</h2><p>Inspired by <a href="https://www.brainzilla.com/logic/self-referential-quiz/" target="_blank" rel="noreferrer">Brainzilla's Self-Referential Quiz</a>. Special thanks to xxuurruuii for helping shape this into a playable puzzle.</p><p>Looking forward to your feedback!</p><div className="settings"><button type="button" onClick={() => setMuted(value => !value)} aria-pressed={muted}>{muted ? 'Sound off' : 'Sound on'}</button><button type="button" onClick={reset}>Reset progress</button></div></section>
        </div>
      </div>
    </main>
    <div className="check-dock"><span className="check-notice" role="status" aria-live="polite">{notice}</span><button type="button" className="check-button" disabled={cooldownSeconds > 0} onClick={checkAnswers}>{cooldownSeconds > 0 ? `Check again in ${cooldownSeconds}s` : 'Check answers'} <span aria-hidden="true">↗</span></button></div>
  </>;
}
