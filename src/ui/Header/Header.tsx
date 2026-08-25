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
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="18" cy="18" r="3" />
          <circle cx="6" cy="6" r="3" />
          <path d="M18 15V9a9 9 0 0 0-9-9" />
          <path d="M6 9a9 9 0 0 0 9 9" />
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
