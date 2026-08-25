import { useState } from 'react';
import { RepoState } from '../../model/types';
import { WorkingDirPanel } from './WorkingDirPanel';
import { StagingPanel } from './StagingPanel';
import { BranchListPanel } from './BranchListPanel';
import styles from './StatePanel.module.css';

interface StatePanelProps {
  repoState: RepoState;
}

export function StatePanel({ repoState }: StatePanelProps) {
  const [activeTab, setActiveTab] = useState<'working' | 'staging' | 'branches'>('working');

  const unstagedCount = repoState.unstagedFiles.length + repoState.untrackedFiles.length;
  const stagedCount = repoState.stagedFiles.length;
  const branchCount = repoState.branches.length;

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
      </div>

      <div className={styles.panelContent}>
        {activeTab === 'working' && <WorkingDirPanel repoState={repoState} />}
        {activeTab === 'staging' && <StagingPanel repoState={repoState} />}
        {activeTab === 'branches' && <BranchListPanel repoState={repoState} />}
      </div>
    </div>
  );
}
