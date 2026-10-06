import { useEffect, useId, useRef, type ReactNode } from 'react';

export function CompletionDialog({ finalChapter, onDismiss, onNext, feedback }: {
  finalChapter: boolean;
  onDismiss: () => void;
  onNext: () => void;
  feedback: ReactNode;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const dismissRef = useRef<HTMLButtonElement>(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = dialogRef.current!;
    const previousFocus = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    dialog.showModal();
    dismissRef.current?.focus();
    return () => {
      dialog.close();
      document.body.style.overflow = previousOverflow;
      // The check button is in cooldown when this dialog closes.
      const returnFocus = previousFocus instanceof HTMLElement && previousFocus !== document.body
        && previousFocus.isConnected && !previousFocus.matches(':disabled')
        ? previousFocus : document.querySelector<HTMLElement>('.chapter-select');
      returnFocus?.focus({ preventScroll: true });
    };
  }, []);

  return <dialog ref={dialogRef} className="completion-dialog" aria-labelledby={titleId}
    onCancel={event => { event.preventDefault(); onDismiss(); }}>
    <h2 id={titleId}>{finalChapter ? 'Thanks for playing!' : '🎉 Congrats! 🎉'}</h2>
    <p className="completion-subtitle">You solved every puzzle in this chapter correctly.</p>
    {finalChapter && <div className="completion-feedback">{feedback}</div>}
    <div className="completion-actions">
      <button ref={dismissRef} type="button" className="completion-back" onClick={onDismiss}>{finalChapter ? 'yeah' : 'Yeah'}</button>
      {!finalChapter && <button type="button" className="completion-next" onClick={onNext}>Next chapter</button>}
    </div>
  </dialog>;
}
