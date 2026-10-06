import { useEffect, useRef, useState } from 'react';
import { chapters, puzzles, verifiedSolutions } from './puzzle/book';
import type { Label, Puzzle } from './puzzle/types';
import { PuzzleGroup } from './components/PuzzleGroup';
import { CompletionDialog } from './components/CompletionDialog';
import { migrateChapter4Raw } from './puzzle/ids';
import { clickOption, selectOption } from './state/markings';
import { clearProgress, freshProgress, migrateLegacyProgress, restoreProgress, saveProgress, LEGACY_STORAGE_KEY, PREVIOUS_STORAGE_KEY, STORAGE_KEY, type Progress } from './state/persistence';
import { beginCooldown, canCheck, checkCompleted, isChapterComplete } from './state/checker';
import { CHECKED_KEY, PREVIOUS_CHECKED_KEY, currentAnswer, puzzleStatus, restoreChecked, type CheckedAnswers } from './state/feedback';
import { readStatsEnabled, reportCheck, resumeStats, setStatsEnabled, statsEndpoint } from './stats/client';

const MUTE_KEY = 'self-referential-puzzle-muted-v1';
const PDF_URL = `${import.meta.env.BASE_URL}Printable-Puzzle-Book.pdf`;
const COVER_URL = `${import.meta.env.BASE_URL}itch-cover.png`;
const ITCH_URL = 'https://jimmyzzt.itch.io/my-self-referencial-puzzle';
const GITHUB_URL = 'https://github.com/Jimmyzzt/self-referential-puzzle';

function readProgress(): Progress {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved !== null) return restoreProgress(saved, puzzles);
    const previous = localStorage.getItem(PREVIOUS_STORAGE_KEY);
    return previous !== null
      ? restoreProgress(migrateChapter4Raw(previous), puzzles)
      : migrateLegacyProgress(localStorage.getItem(LEGACY_STORAGE_KEY), puzzles);
  } catch { return freshProgress(puzzles); }
}

function readMuted(): boolean {
  try { return localStorage.getItem(MUTE_KEY) === 'true'; }
  catch { return false; }
}

function readChecked(progress: Progress): CheckedAnswers {
  try {
    const saved = localStorage.getItem(CHECKED_KEY);
    return restoreChecked(saved ?? migrateChapter4Raw(localStorage.getItem(PREVIOUS_CHECKED_KEY)), puzzles, progress);
  }
  catch { return {}; }
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

function CheckButton({ disabled, seconds, onClick, className = '' }: {
  disabled: boolean;
  seconds: number;
  onClick: () => void;
  className?: string;
}) {
  return <button type="button" className={`check-button ${className}`} disabled={disabled} onClick={onClick}>
    {disabled ? `Check in ${seconds}s` : 'Check answers'}
  </button>;
}

export default function App() {
  const [progress, setProgress] = useState<Progress>(readProgress);
  const [checked, setChecked] = useState<CheckedAnswers>(() => readChecked(progress));
  const [chapterIndex, setChapterIndex] = useState(() => {
    const index = chapters.findIndex(item => item.puzzles.some(puzzle => puzzle.id === location.hash.slice(1)));
    return Math.max(0, index);
  });
  const [statusOpen, setStatusOpen] = useState(() => !window.matchMedia('(max-width: 1050px)').matches);
  const [showHeaderProgress, setShowHeaderProgress] = useState(false);
  const [headerStatusOpen, setHeaderStatusOpen] = useState(false);
  const [muted, setMuted] = useState(readMuted);
  const [statsEnabled, updateStatsEnabled] = useState(readStatsEnabled);
  const [notice, setNotice] = useState('');
  const [completion, setCompletion] = useState<'chapter' | 'book' | null>(null);
  const [flashIds, setFlashIds] = useState<string[]>([]);
  const [cooldownUntil, setCooldownUntil] = useState(0);
  const [now, setNow] = useState(Date.now());
  const noticeTimer = useRef<number | undefined>(undefined);
  const flashTimer = useRef<number | undefined>(undefined);
  const headerRef = useRef<HTMLElement | null>(null);
  const statusRef = useRef<HTMLElement | null>(null);
  const chapter = chapters[chapterIndex];

  useEffect(() => {
    function followPuzzleLink() {
      const id = location.hash.slice(1);
      const index = chapters.findIndex(item => item.puzzles.some(puzzle => puzzle.id === id));
      if (index >= 0) {
        setChapterIndex(index);
        window.requestAnimationFrame(() => document.getElementById(id)?.scrollIntoView({ block: 'start' }));
      }
    }
    followPuzzleLink();
    window.addEventListener('hashchange', followPuzzleLink);
    return () => window.removeEventListener('hashchange', followPuzzleLink);
  }, []);

  useEffect(() => {
    try { saveProgress(localStorage, progress); } catch { /* Storage is optional. */ }
  }, [progress]);
  useEffect(() => {
    try { localStorage.setItem(CHECKED_KEY, JSON.stringify(checked)); } catch { /* Storage is optional. */ }
  }, [checked]);
  useEffect(() => {
    try { localStorage.setItem(MUTE_KEY, String(muted)); } catch { /* Storage is optional. */ }
  }, [muted]);
  useEffect(resumeStats, []);
  useEffect(() => {
    if (canCheck(now, cooldownUntil)) return;
    const timer = window.setInterval(() => setNow(Date.now()), 100);
    return () => window.clearInterval(timer);
  }, [cooldownUntil, now]);
  useEffect(() => () => {
    window.clearTimeout(noticeTimer.current);
    window.clearTimeout(flashTimer.current);
  }, []);
  useEffect(() => {
    const updateHeaderProgress = () => {
      const mobile = window.matchMedia('(max-width: 760px)').matches;
      const headerBottom = headerRef.current?.getBoundingClientRect().bottom;
      const statusBottom = statusRef.current?.getBoundingClientRect().bottom;
      const covered = mobile && headerBottom !== undefined && statusBottom !== undefined && statusBottom <= headerBottom + 12;
      setShowHeaderProgress(covered);
      if (!covered) setHeaderStatusOpen(false);
    };
    updateHeaderProgress();
    window.addEventListener('scroll', updateHeaderProgress, { passive: true });
    window.addEventListener('resize', updateHeaderProgress);
    return () => {
      window.removeEventListener('scroll', updateHeaderProgress);
      window.removeEventListener('resize', updateHeaderProgress);
    };
  }, [chapterIndex, statusOpen]);
  useEffect(() => {
    if (!headerStatusOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setHeaderStatusOpen(false);
        document.querySelector<HTMLButtonElement>('.header-progress')?.focus();
      }
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [headerStatusOpen]);

  function temporaryNotice(message: string) {
    setNotice(message);
    window.clearTimeout(noticeTimer.current);
    noticeTimer.current = window.setTimeout(() => setNotice(''), 3500);
  }

  function clearChecked(puzzleId: string) {
    setChecked(previous => {
      if (!(puzzleId in previous)) return previous;
      const next = { ...previous };
      delete next[puzzleId];
      return next;
    });
    setFlashIds(previous => previous.filter(id => id !== puzzleId));
  }

  function mark(puzzleId: string, questionIndex: number, label: Label) {
    setProgress(previous => ({
      ...previous,
      [puzzleId]: previous[puzzleId].map((marking, index) => index === questionIndex ? clickOption(marking, label) : marking),
    }));
    clearChecked(puzzleId);
  }

  function enterAnswer(puzzleId: string, questionIndex: number, label: Label | null) {
    if (progress[puzzleId][questionIndex].selected === label) return;
    setProgress(previous => ({
      ...previous,
      [puzzleId]: previous[puzzleId].map((marking, index) => index === questionIndex ? selectOption(marking, label) : marking),
    }));
    clearChecked(puzzleId);
  }

  function checkAnswers() {
    const timestamp = Date.now();
    if (!canCheck(timestamp, cooldownUntil)) return;
    setNow(timestamp);
    setCooldownUntil(beginCooldown(timestamp));
    const chapterResult = checkCompleted(chapter.puzzles, verifiedSolutions, progress);
    const result = Object.fromEntries(chapter.puzzles.filter(puzzle => puzzle.type !== 'example' && chapterResult[puzzle.id])
      .map(puzzle => [puzzle.id, chapterResult[puzzle.id]]));
    const ids = Object.keys(result);
    setFlashIds(ids);
    window.clearTimeout(flashTimer.current);
    flashTimer.current = window.setTimeout(() => setFlashIds([]), 700);
    if (!ids.length) {
      temporaryNotice('Finish a puzzle in this chapter first.');
      return;
    }
    if (statsEnabled) void reportCheck(chapter.puzzles, progress);
    setChecked(previous => ({
      ...previous,
      ...Object.fromEntries(ids.map(id => [id, currentAnswer(progress, puzzles.find(puzzle => puzzle.id === id)!)!])),
    }));
    const correct = Object.values(result).filter(value => value === 'correct').length;
    const wrong = ids.length - correct;
    temporaryNotice(wrong ? `${correct} right · ${wrong} to revisit` : `${correct} puzzle${correct === 1 ? '' : 's'} looking good!`);
    if (!muted) playFeedback(wrong ? 'wrong' : 'correct');
    if (!wrong && typeof navigator.vibrate === 'function') navigator.vibrate(30);
    if (isChapterComplete(chapter.puzzles, chapterResult)) {
      setCompletion(chapterIndex === chapters.length - 1 ? 'book' : 'chapter');
    }
  }

  function reset(scope: 'chapter' | 'all') {
    const message = scope === 'chapter'
      ? 'Reset all your X and ✓ marks in Chapter ' + chapter.id + '? This cannot be undone.'
      : 'Reset all your X and ✓ marks in every chapter? This cannot be undone.';
    if (!window.confirm(message)) return;
    if (scope === 'all') {
      try { clearProgress(localStorage); localStorage.removeItem(CHECKED_KEY); localStorage.removeItem(PREVIOUS_CHECKED_KEY); } catch { /* Storage is optional. */ }
      setProgress(freshProgress(puzzles));
      setChecked({});
    } else {
      const ids = new Set(chapter.puzzles.map(puzzle => puzzle.id));
      setProgress(previous => ({ ...previous, ...freshProgress(chapter.puzzles) }));
      setChecked(previous => Object.fromEntries(Object.entries(previous).filter(([id]) => !ids.has(id))));
    }
    setFlashIds([]);
    setCompletion(null);
    temporaryNotice(scope === 'chapter' ? 'Chapter progress reset.' : 'All progress reset.');
  }

  function changeChapter(index: number) {
    if (index < 0 || index >= chapters.length) return;
    setChapterIndex(index);
    setStatusOpen(!window.matchMedia('(max-width: 1050px)').matches);
    setHeaderStatusOpen(false);
    window.requestAnimationFrame(() => document.getElementById('chapter-content')?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  }

  const statuses = chapter.puzzles.map(puzzle => ({ puzzle, status: puzzleStatus(puzzle, progress, verifiedSolutions, checked) }));
  const completed = statuses.filter(item => item.status !== 'pending').length;
  const cooldownSeconds = Math.max(0, Math.ceil((cooldownUntil - now) / 1000));
  const statusLinks = (onJump: () => void) => statuses.map(({ puzzle, status }) => <a
    key={puzzle.id}
    href={`#${puzzle.id}`}
    className={`status-link status-link--${status}`}
    aria-label={`${puzzle.label}: ${status === 'pending' ? 'unfinished' : status === 'ready' ? 'ready to check' : status}`}
    onClick={onJump}
  ><span>{puzzle.type === 'example' ? `E${puzzle.id.slice(7)}` : puzzle.id}</span><span aria-hidden="true">{status === 'correct' ? '✓' : status === 'wrong' ? '×' : status === 'ready' ? '•' : ''}</span></a>);

  return <>
    <header className={`site-header ${showHeaderProgress ? 'site-header--progress' : ''}`} id="top" ref={headerRef}>
      <div className="header-inner">
        <a className="brand" href="#top">My Self-Referential Puzzle Book</a>
        <nav className="top-nav" aria-label="Main navigation">
          <select className="chapter-select" value={chapterIndex} onChange={event => changeChapter(Number(event.target.value))} aria-label="Select chapter">
            {chapters.map((item, index) => <option value={index} key={item.id}>Chapter {String(item.id).padStart(2, '0')}</option>)}
          </select>
          <a className="header-secondary" href="#about">About</a>
          <a className="header-secondary" href={ITCH_URL} target="_blank" rel="noreferrer">itch.io ↗</a>
          <a className="header-secondary" href={GITHUB_URL} target="_blank" rel="noreferrer">GitHub ↗</a>
          <button type="button" className="header-progress" aria-label={`${completed} of ${chapter.puzzles.length} puzzles completed; ${headerStatusOpen ? 'hide' : 'show'} puzzle progress`} aria-expanded={headerStatusOpen} aria-controls="header-status-list" onClick={() => setHeaderStatusOpen(value => !value)}><strong>{completed}</strong><span>/{chapter.puzzles.length}</span><span className="header-progress-chevron" aria-hidden="true">{headerStatusOpen ? '⌃' : '⌄'}</span></button>
        </nav>
      </div>
      <nav className="status-list header-status-list" id="header-status-list" aria-label="Jump to a puzzle" hidden={!showHeaderProgress || !headerStatusOpen}>
        {statusLinks(() => setHeaderStatusOpen(false))}
      </nav>
    </header>

    <main>
      <section className="hero" aria-labelledby="page-title">
        <div className="hero-copy">
          <h1 id="page-title">Made My Own <em>Self-Referential</em> Puzzle Book</h1>
          <p className="hero-subtitle">A little book of questions that seem to know each other.</p>
          <ul className="meta-points"><li>Each puzzle has a unique solution.</li><li>The same rules apply throughout.</li></ul>
          <p className="play-instruction">Tap once for <b className="red-x">×</b>. Tap again for <b className="green-check">✓</b>.</p>
        </div>
        <div className="hero-side">
          <a className="cover-link" href={PDF_URL} target="_blank" rel="noreferrer" aria-label="Open the game jam PDF"><img className="cover-image" src={COVER_URL} alt="Original game jam cover for the puzzle book" /></a>
          <a className="game-jam-pdf" href={PDF_URL} target="_blank" rel="noreferrer">Game jam PDF ↗</a>
        </div>
      </section>

      <div className="chapter-shell">
      <aside className={`chapter-status ${statusOpen ? 'is-open' : 'is-closed'}`} aria-label="Chapter progress" ref={statusRef}>
        <button type="button" className="status-toggle" aria-expanded={statusOpen} aria-controls="status-list" onClick={() => setStatusOpen(value => !value)}>
          <strong>{completed}<span> / {chapter.puzzles.length}</span></strong><span className="status-chevron" aria-hidden="true">{statusOpen ? '⌃' : '⌄'}</span>
        </button>
        <nav className="status-list" id="status-list" aria-label="Jump to a puzzle" hidden={!statusOpen}>
          {statusLinks(() => { if (window.matchMedia('(max-width: 1050px)').matches) setStatusOpen(false); })}
        </nav>
      </aside>

      <section className="chapter-content" id="chapter-content" aria-labelledby="chapter-heading">
        <h2 id="chapter-heading" className="chapter-heading">{String(chapter.id).padStart(2, '0')}</h2>
        <div className="groups">
          {statuses.map(({ puzzle, status }) => <PuzzleGroup
            key={puzzle.id}
            puzzle={puzzle}
            markings={progress[puzzle.id]}
            status={status}
            flash={flashIds.includes(puzzle.id)}
            onOptionClick={(index, label) => mark(puzzle.id, index, label)}
            onAnswerInput={(index, label) => enterAnswer(puzzle.id, index, label)}
          />)}
        </div>
        <div className="chapter-footer">
          <button type="button" className="chapter-arrow" disabled={chapterIndex === 0} onClick={() => changeChapter(chapterIndex - 1)} aria-label="Previous chapter">←</button>
          <CheckButton disabled={cooldownSeconds > 0} seconds={cooldownSeconds} onClick={checkAnswers} className="check-button--inline" />
          <button type="button" className="chapter-arrow" disabled={chapterIndex === chapters.length - 1} onClick={() => changeChapter(chapterIndex + 1)} aria-label="Next chapter">→</button>
        </div>
        <div className="settings chapter-reset">
          <button type="button" onClick={() => reset('chapter')}>Reset chapter</button>
          <button type="button" onClick={() => reset('all')}>Reset all</button>
        </div>
      </section>
      </div>

      <section className="about" id="about" aria-labelledby="about-heading">
        <h2 id="about-heading">About</h2>
        <p>Inspired by <a href="https://www.brainzilla.com/logic/self-referential-quiz/" target="_blank" rel="noreferrer">Brainzilla's Self-Referential Quiz</a>. Special thanks to xxuurruuii for helping shape this into a playable puzzle.</p>
        <p>Looking forward to your feedback! <a href={ITCH_URL} target="_blank" rel="noreferrer">Visit the itch.io page ↗</a></p>
        <div className="settings"><button type="button" onClick={() => setMuted(value => !value)} aria-pressed={muted}>{muted ? 'Sound off' : 'Sound on'}</button></div>
        {statsEndpoint() && <>
          <p>Anonymous answer checks help improve puzzle difficulty.</p>
          <div className="settings"><button type="button" aria-pressed={statsEnabled}
            onClick={() => { setStatsEnabled(!statsEnabled); updateStatsEnabled(!statsEnabled); }}>
            {statsEnabled ? 'Anonymous stats on' : 'Anonymous stats off'}
          </button></div>
        </>}
      </section>
    </main>

    {completion && <CompletionDialog
      finalChapter={completion === 'book'}
      onDismiss={() => setCompletion(null)}
      onNext={() => { setCompletion(null); changeChapter(chapterIndex + 1); }}
      feedback={<p>Looking forward to your feedback! <a href={ITCH_URL} target="_blank" rel="noreferrer">Visit the itch.io page ↗</a></p>}
    />}

    <div className="check-dock"><span className="check-notice" role="status" aria-live="polite">{notice}</span><CheckButton disabled={cooldownSeconds > 0} seconds={cooldownSeconds} onClick={checkAnswers} /><button type="button" className="back-to-top" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} aria-label="Back to top">↑</button></div>
  </>;
}
