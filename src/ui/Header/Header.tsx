import { useState } from 'react';
import { SCENARIOS } from '../../scenarios/data';
import { Scenario } from '../../model/types';
import { ThemeMode } from '../../theme/theme';
import styles from './Header.module.css';

interface HeaderProps {
  mode: 'playground' | 'explainer';
  onModeChange: (mode: 'playground' | 'explainer') => void;
  selectedScenario: Scenario | null;
  onSelectScenario: (scenario: Scenario | null) => void;
  onShare: () => void;
  onExplainLast: () => void;
  onReset: () => void;
  themeMode: ThemeMode;
  onToggleTheme: () => void;
  hasLastCommand: boolean;
  modeChangeDisabled?: boolean;
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
}: HeaderProps) {
  const [copySuccess, setCopySuccess] = useState(false);

  const handleShareClick = () => {
    onShare();
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2000);
  };

  return (
    <header className={styles.headerBar}>
      <div className={styles.brandGroup}>
        <svg
          className={styles.logoIcon}
          viewBox="0 0 64 64"
          fill="none"
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
        <div className={styles.modeToggle}>
          <button
            className={`${styles.modeButton} ${mode === 'playground' ? styles.activeMode : ''}`}
            onClick={() => onModeChange('playground')}
            disabled={modeChangeDisabled}
          >
            Playground
          </button>
          <button
            className={`${styles.modeButton} ${mode === 'explainer' ? styles.activeMode : ''}`}
            onClick={() => onModeChange('explainer')}
            disabled={modeChangeDisabled}
          >
            Explainer
          </button>
        </div>

        {mode === 'playground' && (
          <select
            className={styles.scenarioSelect}
            value={selectedScenario?.id || ''}
            onChange={(e) => {
              const sc = SCENARIOS.find((s) => s.id === e.target.value) || null;
              onSelectScenario(sc);
            }}
          >
            <option value="">Load Learning Scenario...</option>
            {SCENARIOS.map((s) => (
              <option key={s.id} value={s.id}>
                {s.title} ({s.difficulty})
              </option>
            ))}
          </select>
        )}
      </div>

      <div className={styles.rightGroup}>
        {mode === 'playground' && hasLastCommand && (
          <button
            className={styles.headerBtn}
            onClick={onExplainLast}
            title="Explain the last executed git command"
          >
            💡 What Just Happened?
          </button>
        )}

        {mode === 'playground' && (
          <>
            <button
              className={styles.headerBtn}
              onClick={handleShareClick}
              title="Copy shareable link with command history"
            >
              {copySuccess ? '✓ Link Copied!' : '🔗 Share'}
            </button>

            <button className={styles.headerBtn} onClick={onReset} title="Reset playground to empty repository">
              ↻ Reset
            </button>
          </>
        )}

        <button
          className={`${styles.headerBtn} ${styles.themeBtn}`}
          onClick={onToggleTheme}
          title={`Switch to ${themeMode === 'dark' ? 'light' : 'dark'} mode`}
        >
          {themeMode === 'dark' ? '☀️' : '🌙'}
        </button>

        <a
          href="https://github.com/amanalip/CommitFlow"
          target="_blank"
          rel="noreferrer"
          className={styles.githubLink}
          title="View source repository on GitHub"
        >
          <svg className={styles.githubIcon} viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
            <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
          </svg>
        </a>
      </div>
    </header>
  );
}
