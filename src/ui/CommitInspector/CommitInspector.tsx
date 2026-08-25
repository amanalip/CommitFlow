import { useState, useEffect } from 'react';
import { CommitInfo } from '../../model/types';
import styles from './CommitInspector.module.css';

interface CommitInspectorProps {
  commit: CommitInfo | null;
  onClose: () => void;
}

export function CommitInspector({ commit, onClose }: CommitInspectorProps) {
  const [copiedSha, setCopiedSha] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!commit) return null;

  const dateStr = new Date(commit.author.timestamp * 1000).toLocaleString();

  const handleCopySha = () => {
    navigator.clipboard.writeText(commit.oid);
    setCopiedSha(true);
    setTimeout(() => setCopiedSha(false), 2000);
  };

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
          <button className={styles.closeButton} onClick={onClose} title="Close inspector (Esc)">
            ✕
          </button>
        </div>

        <div className={styles.modalBody}>
          <div className={styles.metaGrid}>
            <span className={styles.metaLabel}>Full SHA:</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className={styles.metaValue} style={{ wordBreak: 'break-all' }}>{commit.oid}</span>
              <button
                type="button"
                onClick={handleCopySha}
                style={{
                  background: copiedSha ? '#16a34a' : '#334155',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '4px',
                  padding: '2px 8px',
                  fontSize: '11px',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                }}
              >
                {copiedSha ? '✓ Copied' : 'Copy'}
              </button>
            </div>

            <span className={styles.metaLabel}>Author:</span>
            <span className={styles.metaValue}>
              {commit.author.name} &lt;{commit.author.email}&gt;
            </span>

            <span className={styles.metaLabel}>Date:</span>
            <span className={styles.metaValue}>{dateStr}</span>

            <span className={styles.metaLabel}>Tree OID:</span>
            <span className={styles.metaValue}>{commit.treeOid}</span>

            <span className={styles.metaLabel}>Parents:</span>
            <div className={styles.parentList}>
              {commit.parentOids.length === 0 ? (
                <span className={styles.metaValue}>Root commit (initial)</span>
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
                <span className={styles.metaValue}>
                  {commit.branches.map((b) => `⎇ ${b}`).join(', ')}
                </span>
              </>
            )}

            {commit.tags.length > 0 && (
              <>
                <span className={styles.metaLabel}>Tags:</span>
                <span className={styles.metaValue}>
                  {commit.tags.map((t) => `🏷 ${t}`).join(', ')}
                </span>
              </>
            )}
          </div>

          <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: '#94a3b8', marginTop: '12px', marginBottom: '6px' }}>
            Commit Message
          </div>
          <div className={styles.commitMessage}>{commit.message}</div>
        </div>
      </div>
    </div>
  );
}
