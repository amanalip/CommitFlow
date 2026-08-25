import { RepoState } from '../../model/types';
import styles from './StatePanel.module.css';

interface BranchListPanelProps {
  repoState: RepoState;
  onAction?: (command: string) => void;
}

export function BranchListPanel({ repoState, onAction }: BranchListPanelProps) {
  const branches = repoState.branches;
  const tags = repoState.tags;

  return (
    <div className={styles.branchContainer}>
      <div className={styles.sectionHeader}>Branches</div>
      <div className={styles.itemList}>
        {branches.length === 0 && <div className={styles.emptyState}>No branches created.</div>}
        {branches.map((b) => (
          <div key={b.name} className={`${styles.branchItem} ${b.isCurrent ? styles.activeItem : ''}`}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span className={styles.branchIcon}>⎇</span>
              <span className={styles.branchName}>{b.name}</span>
              {b.isCurrent && <span className={styles.currentBadge}>Current</span>}
            </div>
            {!b.isCurrent && onAction && (
              <button
                type="button"
                className={styles.quickActionBtn}
                onClick={() => onAction(`git checkout ${b.name}`)}
                title={`Switch to ${b.name}`}
              >
                Switch
              </button>
            )}
          </div>
        ))}
      </div>

      {tags.length > 0 && (
        <>
          <div className={styles.sectionHeader} style={{ marginTop: '12px' }}>
            Tags
          </div>
          <div className={styles.itemList}>
            {tags.map((t) => (
              <div key={t.name} className={styles.tagItem}>
                <span className={styles.tagIcon}>🏷</span>
                <span className={styles.tagName}>{t.name}</span>
                {t.oid && <span className={styles.tagOid}>{t.oid.slice(0, 7)}</span>}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
