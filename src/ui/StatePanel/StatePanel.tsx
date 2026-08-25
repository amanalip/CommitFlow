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
  onDestructiveAction?: (command: string, title: string, description: string) => void;
}

const TAB_IDS = ['working', 'staging', 'branches', 'stashes'] as const;

export function StatePanel({ repoState, onAction, onDestructiveAction }: StatePanelProps) {
  const [activeTab, setActiveTab] = useState<'working' | 'staging' | 'branches' | 'stashes'>('working');

  const unstagedCount = repoState.unstagedFiles.length + repoState.untrackedFiles.length;
  const stagedCount = repoState.stagedFiles.length;
  const branchCount = repoState.branches.length;
  const stashCount = repoState.stashes?.length || 0;

  const handleTabKeyDown = (event: React.KeyboardEvent, current: typeof TAB_IDS[number]) => {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight' && event.key !== 'Home' && event.key !== 'End') return;
    event.preventDefault();
    const currentIndex = TAB_IDS.indexOf(current);
    const nextIndex = event.key === 'Home'
      ? 0
      : event.key === 'End'
      ? TAB_IDS.length - 1
      : (currentIndex + (event.key === 'ArrowRight' ? 1 : -1) + TAB_IDS.length) % TAB_IDS.length;
    const next = TAB_IDS[nextIndex];
    setActiveTab(next);
    requestAnimationFrame(() => document.getElementById(`state-tab-${next}`)?.focus());
  };

  return (
    <div className={styles.stateContainer}>
      <div className={styles.tabHeader} role="tablist" aria-label="Repository state">
        <button
          id="state-tab-working"
          role="tab"
          aria-selected={activeTab === 'working'}
          aria-controls="state-panel-content"
          tabIndex={activeTab === 'working' ? 0 : -1}
          className={`${styles.tabButton} ${activeTab === 'working' ? styles.activeTab : ''}`}
          onClick={() => setActiveTab('working')}
          onKeyDown={(event) => handleTabKeyDown(event, 'working')}
        >
          Working Directory
          {unstagedCount > 0 && <span className={styles.tabBadge}>{unstagedCount}</span>}
        </button>
        <button
          id="state-tab-staging"
          role="tab"
          aria-selected={activeTab === 'staging'}
          aria-controls="state-panel-content"
          tabIndex={activeTab === 'staging' ? 0 : -1}
          className={`${styles.tabButton} ${activeTab === 'staging' ? styles.activeTab : ''}`}
          onClick={() => setActiveTab('staging')}
          onKeyDown={(event) => handleTabKeyDown(event, 'staging')}
        >
          Staging Area
          {stagedCount > 0 && <span className={styles.tabBadge}>{stagedCount}</span>}
        </button>
        <button
          id="state-tab-branches"
          role="tab"
          aria-selected={activeTab === 'branches'}
          aria-controls="state-panel-content"
          tabIndex={activeTab === 'branches' ? 0 : -1}
          className={`${styles.tabButton} ${activeTab === 'branches' ? styles.activeTab : ''}`}
          onClick={() => setActiveTab('branches')}
          onKeyDown={(event) => handleTabKeyDown(event, 'branches')}
        >
          Branches & Tags
          <span className={styles.tabBadge}>{branchCount}</span>
        </button>
        <button
          id="state-tab-stashes"
          role="tab"
          aria-selected={activeTab === 'stashes'}
          aria-controls="state-panel-content"
          tabIndex={activeTab === 'stashes' ? 0 : -1}
          className={`${styles.tabButton} ${activeTab === 'stashes' ? styles.activeTab : ''}`}
          onClick={() => setActiveTab('stashes')}
          onKeyDown={(event) => handleTabKeyDown(event, 'stashes')}
        >
          Stashes
          {stashCount > 0 && <span className={styles.tabBadge}>{stashCount}</span>}
        </button>
      </div>

      <div id="state-panel-content" className={styles.panelContent} role="tabpanel" aria-labelledby={`state-tab-${activeTab}`}>
        {activeTab === 'working' && <WorkingDirPanel repoState={repoState} onAction={onAction} onDestructiveAction={onDestructiveAction} />}
        {activeTab === 'staging' && <StagingPanel repoState={repoState} onAction={onAction} />}
        {activeTab === 'branches' && <BranchListPanel repoState={repoState} onAction={onAction} onDestructiveAction={onDestructiveAction} />}
        {activeTab === 'stashes' && <StashPanel repoState={repoState} onAction={onAction} onDestructiveAction={onDestructiveAction} />}
      </div>
    </div>
  );
}
