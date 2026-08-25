import { useState } from 'react';
import { RepoState } from '../../model/types';
import { WorkingDirPanel } from './WorkingDirPanel';
import { StagingPanel } from './StagingPanel';
import { BranchListPanel } from './BranchListPanel';
import { StashPanel } from './StashPanel';
import styles from './StatePanel.module.css';

interface StatePanelProps {
  repoState: RepoState;
  onAction?: (command: string) => void;
}

export function StatePanel({ repoState, onAction }: StatePanelProps) {
  const [activeTab, setActiveTab] = useState<'working' | 'staging' | 'branches' | 'stashes'>('working');

  const unstagedCount = repoState.unstagedFiles.length + repoState.untrackedFiles.length;
  const stagedCount = repoState.stagedFiles.length;
  const branchCount = repoState.branches.length;
  const stashCount = repoState.stashes?.length || 0;

  return (
    <div className={styles.stateContainer}>
      <div className={styles.tabHeader}>
        <button
          className={`${styles.tabButton} ${activeTab === 'working' ? styles.activeTab : ''}`}
          onClick={() => setActiveTab('working')}
        >
          Working Directory
          {unstagedCount > 0 && <span className={styles.tabBadge}>{unstagedCount}</span>}
        </button>
        <button
          className={`${styles.tabButton} ${activeTab === 'staging' ? styles.activeTab : ''}`}
          onClick={() => setActiveTab('staging')}
        >
          Staging Area
          {stagedCount > 0 && <span className={styles.tabBadge}>{stagedCount}</span>}
        </button>
        <button
          className={`${styles.tabButton} ${activeTab === 'branches' ? styles.activeTab : ''}`}
          onClick={() => setActiveTab('branches')}
        >
          Branches & Tags
          <span className={styles.tabBadge}>{branchCount}</span>
        </button>
        <button
          className={`${styles.tabButton} ${activeTab === 'stashes' ? styles.activeTab : ''}`}
          onClick={() => setActiveTab('stashes')}
        >
          Stashes
          {stashCount > 0 && <span className={styles.tabBadge}>{stashCount}</span>}
        </button>
      </div>

      <div className={styles.panelContent}>
        {activeTab === 'working' && <WorkingDirPanel repoState={repoState} onAction={onAction} />}
        {activeTab === 'staging' && <StagingPanel repoState={repoState} onAction={onAction} />}
        {activeTab === 'branches' && <BranchListPanel repoState={repoState} onAction={onAction} />}
        {activeTab === 'stashes' && <StashPanel repoState={repoState} onAction={onAction} />}
      </div>
    </div>
  );
}
