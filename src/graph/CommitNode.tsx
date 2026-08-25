import React, { memo } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { CommitNodeData } from '../layout/graph-layout';
import styles from './CommitNode.module.css';

export const CommitNode = memo(({ data, selected }: NodeProps) => {
  const nodeData = data as unknown as CommitNodeData;
  const { commit, color, isHead, branches, tags, onSelectCommit } = nodeData;

  const handleClick = () => {
    if (onSelectCommit) {
      onSelectCommit(commit);
    }
  };

  return (
    <div
      className={`${styles.nodeCard} ${isHead ? styles.nodeHeadActive : ''} ${
        selected ? styles.nodeSelected : ''
      }`}
      style={{ '--node-color': color } as React.CSSProperties}
      onClick={handleClick}
      title={`Click to inspect commit ${commit.shortOid}`}
    >
      <Handle
        type="target"
        position={Position.Left}
        className={styles.handle}
        style={{ background: color }}
      />

      <div className={styles.headerRow}>
        <span className={styles.shaBadge}>{commit.shortOid}</span>
        {isHead && <span className={styles.headBadge}>HEAD</span>}
      </div>

      <div className={styles.message}>{commit.message}</div>
      <div className={styles.author}>{commit.author.name}</div>

      {(branches.length > 0 || tags.length > 0) && (
        <div className={styles.badgeList}>
          {branches.map((b) => (
            <span key={b} className={styles.branchBadge}>
              ⎇ {b}
            </span>
          ))}
          {tags.map((t) => (
            <span key={t} className={styles.tagBadge}>
              🏷 {t}
            </span>
          ))}
        </div>
      )}

      <Handle
        type="source"
        position={Position.Right}
        className={styles.handle}
        style={{ background: color }}
      />
    </div>
  );
});

CommitNode.displayName = 'CommitNode';
