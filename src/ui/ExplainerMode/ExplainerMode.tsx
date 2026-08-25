import React, { useState, useEffect, useCallback } from 'react';
import { RepoState } from '../../model/types';
import { gitBridge } from '../../engine/git-bridge';
import { executeCommandLine } from '../../parser/command-map';
import { CommitGraph } from '../../graph/CommitGraph';
import styles from './ExplainerMode.module.css';

interface ExplainerModeProps {
  isDark?: boolean;
}

const PRESET_COMMANDS = [
  'git checkout -b feature/auth',
  'git commit -m "feat: implement login"',
  'git merge feature/auth',
  'git rebase main',
  'git reset --soft HEAD~1',
  'git revert HEAD',
  'git tag v1.0.0',
];

export function ExplainerMode({ isDark = true }: ExplainerModeProps) {
  const [inputCommand, setInputCommand] = useState<string>('git checkout -b feature/auth');
  const [beforeState, setBeforeState] = useState<RepoState | null>(null);
  const [afterState, setAfterState] = useState<RepoState | null>(null);
  const [explanation, setExplanation] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  const setupBaseRepo = useCallback(async () => {
    await gitBridge.send('RESET_REPO');
    await executeCommandLine('git init');
    await executeCommandLine('touch index.html');
    await executeCommandLine('echo "<h1>Base App</h1>" > index.html');
    await executeCommandLine('git add index.html');
    await executeCommandLine('git commit -m "feat: initial commit"');
    await executeCommandLine('touch styles.css');
    await executeCommandLine('echo "body { margin: 0; }" > styles.css');
    await executeCommandLine('git add styles.css');
    await executeCommandLine('git commit -m "style: add base styles"');
    return gitBridge.getState();
  }, []);

  const runExplanation = useCallback(
    async (cmdToRun: string) => {
      setIsProcessing(true);
      try {
        const base = await setupBaseRepo();
        setBeforeState(JSON.parse(JSON.stringify(base)));

        const res = await executeCommandLine(cmdToRun);
        setAfterState(res.state);
        setExplanation(res.explanation || res.stdout || 'Command executed successfully.');
      } finally {
        setIsProcessing(false);
      }
    },
    [setupBaseRepo]
  );

  useEffect(() => {
    runExplanation(inputCommand);
  }, []); // Run initial preset on mount

  const handleRun = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputCommand.trim() || isProcessing) return;
    runExplanation(inputCommand.trim());
  };

  const handleSelectPreset = (preset: string) => {
    setInputCommand(preset);
    runExplanation(preset);
  };

  return (
    <div className={styles.explainerContainer}>
      <div className={styles.inputSection}>
        <div className={styles.sectionTitle}>Git Command Explainer</div>
        <form className={styles.inputRow} onSubmit={handleRun}>
          <input
            type="text"
            className={styles.commandInput}
            value={inputCommand}
            onChange={(e) => setInputCommand(e.target.value)}
            placeholder="Type or paste a git command, e.g. git checkout -b feature"
          />
          <button type="submit" className={styles.runButton} disabled={isProcessing}>
            {isProcessing ? 'Simulating...' : 'Explain Command'}
          </button>
        </form>

        <div className={styles.presetList}>
          <span className={styles.presetLabel}>Try examples:</span>
          {PRESET_COMMANDS.map((preset) => (
            <button
              key={preset}
              type="button"
              className={styles.presetBtn}
              onClick={() => handleSelectPreset(preset)}
            >
              {preset}
            </button>
          ))}
        </div>
      </div>

      {explanation && (
        <div className={styles.diffSummaryBox}>
          <div className={styles.diffSummaryTitle}>What this command did:</div>
          <div className={styles.diffSummaryText}>{explanation}</div>
        </div>
      )}

      <div className={styles.comparisonGrid}>
        <div className={styles.gridColumn}>
          <div className={styles.columnHeader}>
            <span>Before Command</span>
            <span>{beforeState?.commits.length || 0} commits</span>
          </div>
          <div className={styles.graphWrapper}>
            {beforeState && <CommitGraph commits={beforeState.commits} isDark={isDark} />}
          </div>
        </div>

        <div className={styles.gridColumn}>
          <div className={styles.columnHeader}>
            <span>After Command</span>
            <span style={{ color: '#38bdf8' }}>{afterState?.commits.length || 0} commits</span>
          </div>
          <div className={styles.graphWrapper}>
            {afterState && <CommitGraph commits={afterState.commits} isDark={isDark} />}
          </div>
        </div>
      </div>
    </div>
  );
}
