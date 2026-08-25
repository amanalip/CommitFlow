import { RepoState } from '../../model/types';
import styles from './StatePanel.module.css';

interface WorkingDirPanelProps {
  repoState: RepoState;
}

export function WorkingDirPanel({ repoState }: WorkingDirPanelProps) {
  const unstaged = repoState.unstagedFiles;
  const untracked = repoState.untrackedFiles;

  const isEmpty = unstaged.length === 0 && untracked.length === 0;

  return (
    <div className={styles.fileList}>
      {isEmpty && <div className={styles.emptyState}>Working directory is clean.</div>}

      {unstaged.map((file) => (
        <div key={file.path} className={styles.fileItem}>
          <span className={styles.filePath}>{file.path}</span>
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
        </div>
      ))}

      {untracked.map((path) => (
        <div key={path} className={styles.fileItem}>
          <span className={styles.filePath}>{path}</span>
          <span className={`${styles.statusPill} ${styles.statusUntracked}`}>untracked</span>
        </div>
      ))}
    </div>
  );
}
