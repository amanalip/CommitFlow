import { RepoState } from '../../model/types';
import styles from './StatePanel.module.css';

interface StashPanelProps {
  repoState: RepoState;
  onAction?: (command: string) => void;
}

export function StashPanel({ repoState, onAction }: StashPanelProps) {
  const stashes = repoState.stashes || [];
  const isEmpty = stashes.length === 0;

  return (
    <div className={styles.fileList}>
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
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
