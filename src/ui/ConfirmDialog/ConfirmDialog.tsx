import { useEffect, useRef, useState } from 'react';
import styles from './ConfirmDialog.module.css';

interface ConfirmDialogProps {
  title: string;
  description: string;
  command?: string;
  confirmLabel: string;
  onCancel: () => void;
  onConfirm: () => Promise<void> | void;
}

export function ConfirmDialog({ title, description, command, confirmLabel, onCancel, onConfirm }: ConfirmDialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const [isConfirming, setIsConfirming] = useState(false);

  useEffect(() => {
    const previousFocus = document.activeElement as HTMLElement | null;
    cancelRef.current?.focus();
    return () => previousFocus?.focus();
  }, []);

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Escape' && !isConfirming) {
      event.preventDefault();
      onCancel();
      return;
    }
    if (event.key !== 'Tab') return;
    const controls = Array.from(dialogRef.current?.querySelectorAll<HTMLElement>('button:not(:disabled)') ?? []);
    if (controls.length === 0) return;
    const first = controls[0];
    const last = controls[controls.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };

  const confirm = async () => {
    setIsConfirming(true);
    try {
      await onConfirm();
    } finally {
      setIsConfirming(false);
    }
  };

  return (
    <div className={styles.backdrop} onMouseDown={(event) => event.target === event.currentTarget && !isConfirming && onCancel()}>
      <div
        ref={dialogRef}
        className={styles.dialog}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        aria-describedby="confirm-description"
        onKeyDown={handleKeyDown}
      >
        <span className={styles.eyebrow}>Confirmation required</span>
        <h2 id="confirm-title">{title}</h2>
        <p id="confirm-description">{description}</p>
        {command && <code className={styles.command}>$ {command}</code>}
        <div className={styles.actions}>
          <button ref={cancelRef} type="button" className={styles.cancelButton} onClick={onCancel} disabled={isConfirming}>Cancel</button>
          <button type="button" className={styles.confirmButton} onClick={confirm} disabled={isConfirming}>
            {isConfirming ? 'Working...' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
