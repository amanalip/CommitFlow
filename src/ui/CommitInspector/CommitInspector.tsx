import { CommitInfo } from '../../model/types';
import styles from './CommitInspector.module.css';

interface CommitInspectorProps {
  commit: CommitInfo | null;
  onClose: () => void;
}

export function CommitInspector({ commit, onClose }: CommitInspectorProps) {
  if (!commit) return null;

  const dateStr = new Date(commit.author.timestamp * 1000).toUTCString();

  return (
    <div className={styles.inspectorOverlay} onClick={onClose}>
      <div className={styles.inspectorModal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <div className={styles.modalTitle}>
            <span>Commit Inspector</span>
            <span style={{ color: '#38bdf8', fontFamily: 'monospace' }}>
              {commit.shortOid}
            </span>
          </div>
          <button className={styles.closeButton} onClick={onClose}>
            ✕
          </button>
        </div>

        <div className={styles.modalBody}>
          <div className={styles.metaGrid}>
            <span className={styles.metaLabel}>Full SHA:</span>
            <span className={styles.metaValue}>{commit.oid}</span>

            <span className={styles.metaLabel}>Author:</span>
            <span className={styles.metaValue}>
              {commit.author.name} &lt;{commit.author.email}&gt;
            </span>

            <span className={styles.metaLabel}>Date:</span>
            <span className={styles.metaValue}>{dateStr}</span>

            <span className={styles.metaLabel}>Tree:</span>
            <span className={styles.metaValue}>{commit.treeOid}</span>

            <span className={styles.metaLabel}>Parents:</span>
            <div className={styles.parentList}>
              {commit.parentOids.length === 0 ? (
                <span className={styles.metaValue}>Root commit (no parents)</span>
              ) : (
                commit.parentOids.map((p) => (
                  <span key={p} className={styles.parentPill}>
                    {p.slice(0, 7)}
                  </span>
                ))
              )}
            </div>

            {commit.branches.length > 0 && (
              <>
                <span className={styles.metaLabel}>Branches:</span>
                <span className={styles.metaValue}>{commit.branches.join(', ')}</span>
              </>
            )}

            {commit.tags.length > 0 && (
              <>
                <span className={styles.metaLabel}>Tags:</span>
                <span className={styles.metaValue}>{commit.tags.join(', ')}</span>
              </>
            )}
          </div>

          <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: '#94a3b8' }}>
            Commit Message
          </div>
          <div className={styles.commitMessage}>{commit.message}</div>
        </div>
      </div>
    </div>
  );
}
