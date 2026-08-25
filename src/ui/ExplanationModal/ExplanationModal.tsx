import { useState, useEffect } from 'react';
import styles from './ExplanationModal.module.css';

interface ExplanationModalProps {
  command: string;
  explanation: string;
  onClose: () => void;
}

export function ExplanationModal({ command, explanation, onClose }: ExplanationModalProps) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!command) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(`$ ${command}\n\n${explanation}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <div className={styles.title}>What Just Happened?</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              type="button"
              onClick={handleCopy}
              style={{
                background: copied ? '#16a34a' : '#334155',
                color: '#ffffff',
                border: 'none',
                borderRadius: '4px',
                padding: '3px 8px',
                fontSize: '11px',
                cursor: 'pointer',
              }}
            >
              {copied ? '✓ Copied' : 'Copy'}
            </button>
            <button className={styles.closeBtn} onClick={onClose} title="Close modal (Esc)">
              ✕
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
