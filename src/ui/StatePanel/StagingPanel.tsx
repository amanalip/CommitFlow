import { RepoState } from '../../model/types';
import styles from './StatePanel.module.css';

interface StagingPanelProps {
  repoState: RepoState;
}

export function StagingPanel({ repoState }: StagingPanelProps) {
  const staged = repoState.stagedFiles;
  const unstaged = repoState.unstagedFiles;

  return (
    <div className={styles.sideBySide}>
      <div className={styles.sideCol}>
        <div className={styles.colTitle}>Staged Changes ({staged.length})</div>
        <div className={styles.fileList}>
          {staged.length === 0 ? (
            <div className={styles.emptyState}>No staged files</div>
          ) : (
            staged.map((f) => (
              <div key={f.path} className={styles.fileItem}>
                <span className={styles.filePath}>{f.path}</span>
                <span
                  className={`${styles.statusPill} ${
                    f.status === 'added'
                      ? styles.statusAdded
                      : f.status === 'deleted'
                      ? styles.statusDeleted
                      : styles.statusModified
                  }`}
                >
                  {f.status}
                </span>
              </div>
            ))
          )}
        </div>
      </div>

      <div className={styles.sideCol}>
        <div className={styles.colTitle}>Unstaged Changes ({unstaged.length})</div>
        <div className={styles.fileList}>
          {unstaged.length === 0 ? (
            <div className={styles.emptyState}>No unstaged changes</div>
          ) : (
            unstaged.map((f) => (
              <div key={f.path} className={styles.fileItem}>
                <span className={styles.filePath}>{f.path}</span>
                <span
                  className={`${styles.statusPill} ${
                    f.status === 'modified' ? styles.statusModified : styles.statusDeleted
                  }`}
                >
                  {f.status}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
