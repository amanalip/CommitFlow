import { RepoState } from '../../model/types';
import styles from './StatePanel.module.css';

interface BranchListPanelProps {
  repoState: RepoState;
}

export function BranchListPanel({ repoState }: BranchListPanelProps) {
  const { branches, tags, head } = repoState;

  return (
    <div className={styles.fileList}>
      <div className={styles.colTitle}>Branches ({branches.length})</div>
      {branches.length === 0 ? (
        <div className={styles.emptyState}>No branches created yet</div>
      ) : (
        branches.map((b) => (
          <div
            key={b.name}
            className={`${styles.branchItem} ${b.isCurrent ? styles.currentBranch : ''}`}
          >
            <span className={styles.branchName}>
              ⎇ {b.name}
            </span>
            {b.isCurrent && <span className={styles.currentBadge}>HEAD</span>}
          </div>
        ))
      )}

      {head.type === 'detached' && (
        <div className={`${styles.branchItem} ${styles.currentBranch}`}>
          <span className={styles.branchName}>
            (detached at {head.target})
          </span>
          <span className={styles.currentBadge}>HEAD</span>
        </div>
      )}

      {tags.length > 0 && (
        <>
          <div className={styles.colTitle} style={{ marginTop: '12px' }}>
            Tags ({tags.length})
          </div>
          {tags.map((t) => (
            <div key={t.name} className={styles.branchItem}>
              <span className={styles.branchName}>🏷 {t.name}</span>
              <span className={styles.filePath}>{t.oid.slice(0, 7)}</span>
            </div>
          ))}
        </>
      )}
    </div>
  );
}
