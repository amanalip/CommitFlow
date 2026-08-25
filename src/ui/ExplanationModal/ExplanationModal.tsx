import styles from './ExplanationModal.module.css';

interface ExplanationModalProps {
  command: string;
  explanation: string;
  onClose: () => void;
}

export function ExplanationModal({ command, explanation, onClose }: ExplanationModalProps) {
  if (!command) return null;

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <div className={styles.title}>What Just Happened?</div>
          <button className={styles.closeBtn} onClick={onClose}>
            ✕
          </button>
        </div>
        <div className={styles.body}>
          <div className={styles.commandBox}>$ {command}</div>
          <div className={styles.explanationText}>{explanation}</div>
        </div>
      </div>
    </div>
  );
}
