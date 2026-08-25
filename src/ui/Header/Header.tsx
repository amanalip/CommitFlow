import { useState } from 'react';
import { AlertCircle, Check, GitBranch, Lightbulb, Moon, RotateCcw, Share2, Sun } from 'lucide-react';
import { Scenario } from '../../model/types';
import { ThemeMode } from '../../theme/theme';
import { ScenarioBrowser } from '../ScenarioBrowser/ScenarioBrowser';
import styles from './Header.module.css';

interface HeaderProps {
  mode: 'playground' | 'explainer';
  onModeChange: (mode: 'playground' | 'explainer') => void;
  selectedScenario: Scenario | null;
  onSelectScenario: (scenario: Scenario | null) => void;
  onShare: () => Promise<void>;
  onExplainLast: () => void;
  onReset: () => void;
  themeMode: ThemeMode;
  onToggleTheme: () => void;
  hasLastCommand: boolean;
  modeChangeDisabled?: boolean;
  canShare?: boolean;
  replayLabel?: string;
}

export function Header({
  mode,
  onModeChange,
  selectedScenario,
  onSelectScenario,
  onShare,
  onExplainLast,
  onReset,
  themeMode,
  onToggleTheme,
  hasLastCommand,
  modeChangeDisabled = false,
  canShare = false,
  replayLabel = '',
}: HeaderProps) {
  const [shareStatus, setShareStatus] = useState<'idle' | 'success' | 'error'>('idle');

  const handleShareClick = async () => {
    setShareStatus('idle');
    try {
      await onShare();
      setShareStatus('success');
    } catch {
      setShareStatus('error');
    }
    setTimeout(() => setShareStatus('idle'), 2400);
  };

  const handleModeKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>, current: 'playground' | 'explainer') => {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
    event.preventDefault();
    const nextMode = current === 'playground' ? 'explainer' : 'playground';
    onModeChange(nextMode);
    requestAnimationFrame(() => document.getElementById(`mode-tab-${nextMode}`)?.focus());
  };

  return (
    <header className={styles.headerBar}>
      <div className={styles.brandGroup}>
        <svg
          className={styles.logoIcon}
          viewBox="0 0 64 64"
          fill="none"
          aria-hidden="true"
        >
          <defs>
            <linearGradient id="hdrTrunk" x1="8" y1="44" x2="56" y2="44" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#0284c7" />
              <stop offset="100%" stopColor="#38bdf8" />
            </linearGradient>
            <linearGradient id="hdrBranch" x1="22" y1="44" x2="54" y2="20" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#38bdf8" />
              <stop offset="50%" stopColor="#a855f7" />
              <stop offset="100%" stopColor="#ec4899" />
            </linearGradient>
          </defs>
          <path d="M 8 44 L 56 44" stroke="url(#hdrTrunk)" strokeWidth="4.5" strokeLinecap="round" />
          <path d="M 22 44 C 22 26, 30 18, 38 18 L 44 18 C 50 18, 54 30, 54 44" stroke="url(#hdrBranch)" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M 53 39 L 58 44 L 53 49" stroke="#38bdf8" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx="10" cy="44" r="5" fill="#0284c7" stroke="#ffffff" strokeWidth="2" />
          <circle cx="22" cy="44" r="5" fill="#0369a1" stroke="#38bdf8" strokeWidth="2" />
          <circle cx="38" cy="18" r="5" fill="#9333ea" stroke="#ffffff" strokeWidth="2" />
          <circle cx="46" cy="18" r="4" fill="#ec4899" stroke="#ffffff" strokeWidth="2" />
          <circle cx="54" cy="44" r="5.5" fill="#0284c7" stroke="#38bdf8" strokeWidth="2.5" />
        </svg>
        <span className={styles.brandTitle}>CommitFlow</span>
        <span className={styles.brandTagline}>Watch commits flow</span>
      </div>

      <div className={styles.centerGroup}>
        <div className={styles.modeToggle} role="tablist" aria-label="Application mode">
          <button
            id="mode-tab-playground"
            type="button"
            role="tab"
            aria-selected={mode === 'playground'}
            tabIndex={mode === 'playground' ? 0 : -1}
            className={`${styles.modeButton} ${mode === 'playground' ? styles.activeMode : ''}`}
            onClick={() => onModeChange('playground')}
            onKeyDown={(event) => handleModeKeyDown(event, 'playground')}
            disabled={modeChangeDisabled}
          >
            Playground
          </button>
          <button
            id="mode-tab-explainer"
            type="button"
            role="tab"
            aria-selected={mode === 'explainer'}
            tabIndex={mode === 'explainer' ? 0 : -1}
            className={`${styles.modeButton} ${mode === 'explainer' ? styles.activeMode : ''}`}
            onClick={() => onModeChange('explainer')}
            onKeyDown={(event) => handleModeKeyDown(event, 'explainer')}
            disabled={modeChangeDisabled}
          >
            Explainer
          </button>
        </div>

        {mode === 'playground' && (
          <ScenarioBrowser
            selectedScenario={selectedScenario}
            onSelectScenario={onSelectScenario}
            disabled={modeChangeDisabled}
          />
        )}
      </div>

      <div className={styles.rightGroup}>
        {replayLabel && <span className={styles.replayStatus} role="status">{replayLabel}</span>}
        {mode === 'playground' && hasLastCommand && (
          <button
            className={styles.headerBtn}
            onClick={onExplainLast}
            aria-label="Explain the last executed Git command"
          >
            <Lightbulb size={15} aria-hidden="true" /> What Just Happened?
          </button>
        )}

        {mode === 'playground' && (
          <>
            <button
              className={styles.headerBtn}
              onClick={handleShareClick}
              disabled={!canShare}
              aria-label={canShare ? 'Copy shareable Playground link' : 'Share unavailable until a command succeeds'}
            >
              {shareStatus === 'success' ? <Check size={15} aria-hidden="true" /> : shareStatus === 'error' ? <AlertCircle size={15} aria-hidden="true" /> : <Share2 size={15} aria-hidden="true" />}
              {shareStatus === 'success' ? 'Link copied' : shareStatus === 'error' ? 'Copy failed' : 'Share'}
            </button>

            <button type="button" className={styles.headerBtn} onClick={onReset} aria-label="Reset Playground to an empty repository">
              <RotateCcw size={15} aria-hidden="true" /> Reset
            </button>
          </>
        )}

        <button
          className={`${styles.headerBtn} ${styles.themeBtn}`}
          onClick={onToggleTheme}
          aria-label={`Switch to ${themeMode === 'dark' ? 'light' : 'dark'} theme`}
        >
          {themeMode === 'dark' ? <Sun size={16} aria-hidden="true" /> : <Moon size={16} aria-hidden="true" />}
        </button>

        <a
          href="https://github.com/amanalip/CommitFlow"
          target="_blank"
          rel="noreferrer"
          className={styles.githubLink}
          aria-label="View source repository on GitHub"
        >
          <GitBranch className={styles.githubIcon} size={18} aria-hidden="true" />
        </a>
        <span className={styles.srStatus} aria-live="polite">{shareStatus === 'success' ? 'Share link copied to clipboard.' : shareStatus === 'error' ? 'Could not copy the share link. Check browser clipboard permission.' : ''}</span>
      </div>
    </header>
  );
}
