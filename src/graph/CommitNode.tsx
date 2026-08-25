import React, { memo, useState } from 'react';
import { Handle, NodeToolbar, Position, NodeProps } from '@xyflow/react';
import { Check, Copy, Eye, GitCommitHorizontal, GitMerge } from 'lucide-react';
import { CommitNodeData } from '../layout/graph-layout';
import styles from './CommitNode.module.css';

export const CommitNode = memo(({ data, selected }: NodeProps) => {
  const nodeData = data as unknown as CommitNodeData;
  const { commit, color, isHead, branches, tags, onSelectCommit } = nodeData;
  const [copied, setCopied] = useState(false);
  const commitDate = new Date(commit.author.timestamp * 1000);
  const dateLabel = commitDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  const timeLabel = commitDate.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  const parentLabel = commit.parentOids.length === 0
    ? 'Root commit'
    : commit.parentOids.length === 1
      ? '1 parent'
      : `${commit.parentOids.length} parents`;

  const handleClick = () => {
    if (onSelectCommit) {
      onSelectCommit(commit);
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handleClick();
    }
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(commit.oid);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  };

  return (
    <>
      <NodeToolbar position={Position.Top} offset={10} className={styles.nodeToolbar}>
        <button type="button" onClick={handleClick}><Eye size={14} aria-hidden="true" /> Inspect commit</button>
        <button type="button" onClick={handleCopy}>{copied ? <Check size={14} aria-hidden="true" /> : <Copy size={14} aria-hidden="true" />}{copied ? 'Copied' : 'Copy ID'}</button>
      </NodeToolbar>
      <div
        className={`${styles.nodeCard} ${isHead ? styles.nodeHeadActive : ''} ${selected ? styles.nodeSelected : ''}`}
        style={{ '--node-color': color } as React.CSSProperties}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        role="button"
        tabIndex={0}
        aria-label={`Inspect commit ${commit.shortOid}: ${commit.message}. ${parentLabel}. ${branches.length ? `Branches ${branches.join(', ')}` : ''}`}
        title={`Inspect commit ${commit.shortOid}`}
      >
      <Handle
        type="target"
        position={Position.Left}
        className={styles.handle}
        style={{ background: color }}
      />

        <div className={styles.typeRow}>
          <span className={styles.objectType}><GitCommitHorizontal size={13} aria-hidden="true" /> Commit</span>
          {isHead && <span className={styles.headBadge}>HEAD here</span>}
        </div>
        <div className={styles.headerRow}>
          <span className={styles.shaLabel}>ID</span>
          <span className={styles.shaBadge}>{commit.shortOid}</span>
        </div>

        <div className={styles.message} title={commit.message}>{commit.message}</div>
        <div className={styles.author}>by {commit.author.name}</div>
        <div className={styles.metaRow}>
          <span>{dateLabel} · {timeLabel}</span>
          <span>{commit.parentOids.length > 1 && <GitMerge size={11} aria-hidden="true" />}{parentLabel}</span>
        </div>

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

        <div className={styles.inspectHint}>Select for details and actions</div>
        <Handle type="source" position={Position.Right} className={styles.handle} style={{ background: color }} />
      </div>
    </>
  );
});

CommitNode.displayName = 'CommitNode';
