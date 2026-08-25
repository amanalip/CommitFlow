import { RepoState } from '../../model/types';
import { Tag } from 'lucide-react';
import styles from './StatePanel.module.css';

interface BranchListPanelProps {
  repoState: RepoState;
  onAction?: (command: string) => void;
  onDestructiveAction?: (command: string, title: string, description: string) => void;
}

export function BranchListPanel({ repoState, onAction, onDestructiveAction }: BranchListPanelProps) {
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
              <div className={styles.rowActions}>
                <button type="button" className={styles.quickActionBtn} onClick={() => onAction(`git checkout ${b.name}`)} title={`Run: git checkout ${b.name}`}>Switch</button>
                {onDestructiveAction && <button type="button" className={styles.dangerActionBtn} onClick={() => onDestructiveAction(`git branch -d ${b.name}`, `Delete branch ${b.name}?`, 'Safe deletion succeeds only when the branch is fully merged. Commits reachable elsewhere remain available.')} title={`Run: git branch -d ${b.name}`}>Delete</button>}
              </div>
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
                <Tag className={styles.tagIcon} size={14} aria-hidden="true" />
                <span className={styles.tagName}>{t.name}</span>
                {t.oid && <span className={styles.tagOid}>{t.oid.slice(0, 7)}</span>}
                {onDestructiveAction && <button type="button" className={styles.dangerActionBtn} onClick={() => onDestructiveAction(`git tag -d ${t.name}`, `Delete tag ${t.name}?`, 'This removes the tag name. The commit it points to is not deleted.')} title={`Run: git tag -d ${t.name}`}>Delete</button>}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
