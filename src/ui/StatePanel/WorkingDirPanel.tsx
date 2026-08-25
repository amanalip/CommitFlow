import { RepoState } from '../../model/types';
import styles from './StatePanel.module.css';

interface WorkingDirPanelProps {
  repoState: RepoState;
  onAction?: (command: string) => void;
}

export function WorkingDirPanel({ repoState, onAction }: WorkingDirPanelProps) {
  const unstaged = repoState.unstagedFiles;
  const untracked = repoState.untrackedFiles;

  const isEmpty = unstaged.length === 0 && untracked.length === 0;

  return (
    <div className={styles.fileList}>
      {isEmpty && <div className={styles.emptyState}>Working directory is clean.</div>}

      {unstaged.map((file) => (
        <div key={file.path} className={styles.fileItem}>
          <span className={styles.filePath}>{file.path}</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span
              className={`${styles.statusPill} ${
                file.status === 'modified'
                  ? styles.statusModified
                  : file.status === 'deleted'
                  ? styles.statusDeleted
                  : styles.statusAdded
              }`}
            >
              {file.status}
            </span>
            {onAction && (
              <button
                type="button"
                className={styles.quickActionBtn}
                onClick={() => onAction(`git add ${file.path}`)}
                title={`Stage ${file.path}`}
              >
                + Stage
              </button>
            )}
          </div>
        </div>
      ))}

      {untracked.map((path) => (
        <div key={path} className={styles.fileItem}>
          <span className={styles.filePath}>{path}</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span className={`${styles.statusPill} ${styles.statusUntracked}`}>untracked</span>
            {onAction && (
              <button
                type="button"
                className={styles.quickActionBtn}
                onClick={() => onAction(`git add ${path}`)}
                title={`Stage ${path}`}
              >
                + Stage
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
