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
          >
            Playground
          </button>
          <button
            className={`${styles.modeButton} ${mode === 'explainer' ? styles.activeMode : ''}`}
            onClick={() => onModeChange('explainer')}
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
        {hasLastCommand && (
          <button
            className={styles.headerBtn}
            onClick={onExplainLast}
            title="Explain the last executed git command"
          >
            💡 What Just Happened?
          </button>
        )}

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

        <button
          className={`${styles.headerBtn} ${styles.themeBtn}`}
          onClick={onToggleTheme}
          title={`Switch to ${themeMode === 'dark' ? 'light' : 'dark'} mode`}
        >
          {themeMode === 'dark' ? '☀️' : '🌙'}
        </button>
      </div>
    </header>
  );
}
