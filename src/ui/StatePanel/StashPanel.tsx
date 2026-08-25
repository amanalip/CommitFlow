import { RepoState } from '../../model/types';
import styles from './StatePanel.module.css';

interface StashPanelProps {
  repoState: RepoState;
  onAction?: (command: string) => void;
  onDestructiveAction?: (command: string, title: string, description: string) => void;
}

export function StashPanel({ repoState, onAction, onDestructiveAction }: StashPanelProps) {
  const stashes = repoState.stashes || [];
  const isEmpty = stashes.length === 0;

  return (
    <div className={styles.fileList}>
      {!isEmpty && onDestructiveAction && (
        <div className={styles.listActions}>
          <button type="button" className={styles.dangerActionBtn} onClick={() => onDestructiveAction('git stash clear', 'Clear every stash?', 'All saved stash entries will be removed. Their file changes cannot be recovered in CommitFlow.')} title="Run: git stash clear">Clear all</button>
        </div>
      )}
      {isEmpty && (
        <div className={styles.emptyState}>
          No stashes saved. Use <code>git stash</code> to save uncommitted changes.
        </div>
      )}

      {stashes.map((stash) => (
        <div key={stash.index} className={styles.fileItem}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            <span style={{ fontFamily: 'monospace', fontWeight: 600, color: '#38bdf8' }}>
              stash@{`{${stash.index}}`}
            </span>
            <span style={{ fontSize: '12px', color: '#94a3b8' }}>{stash.message}</span>
          </div>
          {onAction && (
            <div style={{ display: 'flex', gap: '6px' }}>
              <button
                type="button"
                className={styles.quickActionBtn}
                onClick={() => onAction(`git stash pop stash@{${stash.index}}`)}
                title={`Apply and remove stash@{${stash.index}}`}
                aria-label={`Pop stash ${stash.index}: ${stash.message}`}
              >
                Pop
              </button>
              {onDestructiveAction && (
                <button type="button" className={styles.dangerActionBtn} onClick={() => onDestructiveAction(`git stash drop stash@{${stash.index}}`, `Drop stash@{${stash.index}}?`, 'This removes the saved entry without restoring its files.')} title={`Run: git stash drop stash@{${stash.index}}`}>Drop</button>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
