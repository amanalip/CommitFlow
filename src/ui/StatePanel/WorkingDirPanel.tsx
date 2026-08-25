import { RepoState } from '../../model/types';
import { quoteShellArg } from '../../parser/shell-quote';
import styles from './StatePanel.module.css';

interface WorkingDirPanelProps {
  repoState: RepoState;
  onAction?: (command: string) => void;
  onDestructiveAction?: (command: string, title: string, description: string) => void;
}

export function WorkingDirPanel({ repoState, onAction, onDestructiveAction }: WorkingDirPanelProps) {
  const unstaged = repoState.unstagedFiles;
  const untracked = repoState.untrackedFiles;
  const totalCount = unstaged.length + untracked.length;
  const isEmpty = totalCount === 0;

  return (
    <div className={styles.fileList}>
      {totalCount > 1 && onAction && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '6px' }}>
          <button
            type="button"
            className={styles.quickActionBtn}
            onClick={() => onAction('git add .')}
            title="Stage all modified and untracked files"
          >
            + Stage All ({totalCount})
          </button>
        </div>
      )}

      {isEmpty && <div className={styles.emptyState}>{repoState.initialized ? 'Working directory is clean.' : 'Repository not initialized. Start with git init.'}</div>}

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
              <>
                {onDestructiveAction && (
                  <button
                    type="button"
                    className={styles.dangerActionBtn}
                    onClick={() => onDestructiveAction(
                      `git restore ${quoteShellArg(file.path)}`,
                      `Discard changes to ${file.path}?`,
                      'This replaces the working copy with the version from HEAD. The discarded edit cannot be recovered in CommitFlow.',
                    )}
                    title={`Run: git restore ${quoteShellArg(file.path)}`}
                  >
                    Discard
                  </button>
                )}
                <button
                  type="button"
                  className={styles.quickActionBtn}
                  onClick={() => onAction(`git add ${quoteShellArg(file.path)}`)}
                  title={`Run: git add ${quoteShellArg(file.path)}`}
                >
                  + Stage
                </button>
              </>
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
                onClick={() => onAction(`git add ${quoteShellArg(path)}`)}
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
