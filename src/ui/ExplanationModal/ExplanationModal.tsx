import { useRef, useState } from 'react';
import { X } from 'lucide-react';
import styles from './ExplanationModal.module.css';
import { copyText } from '../../utils/clipboard';
import { useOverlayFocus } from '../useOverlayFocus';

interface ExplanationModalProps {
  command: string;
  explanation: string;
  onClose: () => void;
}

export function ExplanationModal({ command, explanation, onClose }: ExplanationModalProps) {
  const [copyStatus, setCopyStatus] = useState<'idle' | 'copied' | 'error'>('idle');
  const dialogRef = useRef<HTMLDivElement>(null);
  useOverlayFocus(dialogRef, onClose);

  if (!command) return null;

  const handleCopy = async () => {
    try {
      await copyText(`$ ${command}\n\n${explanation}`);
      setCopyStatus('copied');
    } catch {
      setCopyStatus('error');
    }
    setTimeout(() => setCopyStatus('idle'), 2000);
  };

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div ref={dialogRef} className={styles.modalContent} role="dialog" aria-modal="true" aria-labelledby="explanation-title" onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <div id="explanation-title" className={styles.title}>What Just Happened?</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              type="button"
              onClick={handleCopy}
              aria-live="polite"
              style={{
                background: copyStatus === 'copied' ? '#16a34a' : copyStatus === 'error' ? '#dc2626' : '#334155',
                color: '#ffffff',
                border: 'none',
                borderRadius: '4px',
                padding: '3px 8px',
                fontSize: '11px',
                cursor: 'pointer',
              }}
            >
              {copyStatus === 'copied' ? 'Copied' : copyStatus === 'error' ? 'Copy failed' : 'Copy'}
            </button>
            <button type="button" className={styles.closeBtn} onClick={onClose} aria-label="Close explanation">
              <X size={17} aria-hidden="true" />
            </button>
          </div>
        </div>
        <div className={styles.body}>
          <div className={styles.commandBox}>$ {command}</div>
          <div className={styles.explanationText}>{explanation}</div>
        </div>
      </div>
    </div>
  );
}
