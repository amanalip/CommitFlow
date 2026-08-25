import { RepoState } from '../../model/types';
import { quoteShellArg } from '../../parser/shell-quote';
import styles from './StatePanel.module.css';

interface StagingPanelProps {
  repoState: RepoState;
  onAction?: (command: string) => void;
}

export function StagingPanel({ repoState, onAction }: StagingPanelProps) {
  const staged = repoState.stagedFiles;
  const isEmpty = staged.length === 0;

  return (
    <div className={styles.fileList}>
      {staged.length > 1 && onAction && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '6px' }}>
          <button
            type="button"
            className={styles.quickActionBtn}
            onClick={() => onAction('git reset')}
            title="Unstage all staged files"
          >
            − Unstage All ({staged.length})
          </button>
        </div>
      )}

      {isEmpty && (
        <div className={styles.emptyState}>
          Staging area is empty. Use <code>git add &lt;file&gt;</code> to stage files.
        </div>
      )}

      {staged.map((file) => (
        <div key={file.path} className={styles.fileItem}>
          <span className={styles.filePath}>{file.path}</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span className={`${styles.statusPill} ${styles.statusStaged}`}>staged</span>
            {onAction && (
              <button
                type="button"
                className={styles.quickActionBtn}
                onClick={() => onAction(`git restore --staged ${quoteShellArg(file.path)}`)}
                title={`Unstage ${file.path}`}
              >
                − Unstage
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
