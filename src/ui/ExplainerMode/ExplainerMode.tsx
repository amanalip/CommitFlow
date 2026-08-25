import React, { useState, useEffect, useCallback, useRef } from 'react';
import { RepoState } from '../../model/types';
import { gitBridge } from '../../engine/git-bridge';
import { executeCommandLine } from '../../parser/command-map';
import { CommitGraph } from '../../graph/CommitGraph';
import { EXPLAINER_PRESETS, getExplainerSetup } from './explainer-fixtures';
import styles from './ExplainerMode.module.css';

interface ExplainerModeProps {
  isDark?: boolean;
  onProcessingChange?: (isProcessing: boolean) => void;
}

const stripAnsi = (value: string) => value.replace(/\x1b\[[0-9;]*m/g, '');

export function ExplainerMode({ isDark = true, onProcessingChange }: ExplainerModeProps) {
  const [inputCommand, setInputCommand] = useState<string>('git checkout -b feature/auth');
  const [beforeState, setBeforeState] = useState<RepoState | null>(null);
  const [afterState, setAfterState] = useState<RepoState | null>(null);
  const [explanation, setExplanation] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const processingRef = useRef(false);
  const hasRunInitial = useRef(false);
  const requestIdRef = useRef(0);

  const setupBaseRepo = useCallback(async (command: string) => {
    for (const setupCommand of getExplainerSetup(command)) {
      const result = await executeCommandLine(setupCommand);
      if (result.exitCode !== 0) {
        throw new Error(stripAnsi(result.stderr || `Setup failed: ${setupCommand}`));
      }
    }
    return gitBridge.getState();
  }, []);

  const runExplanation = useCallback(
    async (cmdToRun: string) => {
      if (processingRef.current) return;
      processingRef.current = true;
      const requestId = ++requestIdRef.current;
      setIsProcessing(true);
      onProcessingChange?.(true);
      setError('');
      try {
        const simulation = await gitBridge.runIsolated(async () => {
          const base = await setupBaseRepo(cmdToRun);
          const result = await executeCommandLine(cmdToRun);
          return {
            before: JSON.parse(JSON.stringify(base)) as RepoState,
            after: JSON.parse(JSON.stringify(result.state)) as RepoState,
            result,
          };
        });

        if (requestId !== requestIdRef.current) return;
        setBeforeState(simulation.before);
        setAfterState(simulation.after);
        if (simulation.result.exitCode !== 0) {
          setExplanation('');
          setError(stripAnsi(simulation.result.stderr || simulation.result.stdout || 'Command failed.'));
        } else {
          setExplanation(
            stripAnsi(
              simulation.result.explanation ||
                simulation.result.stdout ||
                'Command executed successfully.'
            )
          );
        }
      } catch (runError) {
        if (requestId !== requestIdRef.current) return;
        setExplanation('');
        setError(runError instanceof Error ? runError.message : String(runError));
      } finally {
        if (requestId === requestIdRef.current) {
          processingRef.current = false;
          setIsProcessing(false);
          onProcessingChange?.(false);
        }
      }
    },
    [onProcessingChange, setupBaseRepo]
  );

  useEffect(() => {
    if (hasRunInitial.current) return;
    hasRunInitial.current = true;
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
          {EXPLAINER_PRESETS.map((preset) => (
            <button
              key={preset.command}
              type="button"
              className={styles.presetBtn}
              onClick={() => handleSelectPreset(preset.command)}
              disabled={isProcessing}
            >
              {preset.command}
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

      {error && (
        <div className={styles.errorBox} role="alert">
          <div className={styles.errorTitle}>Command could not be explained</div>
          <div className={styles.diffSummaryText}>{error}</div>
        </div>
      )}

      <div className={styles.comparisonGrid}>
        <div className={styles.gridColumn}>
          <div className={styles.columnHeader}>
            <span>Before Command</span>
            <span>{beforeState?.commits.length || 0} commits</span>
          </div>
          <div className={styles.graphWrapper}>
            {beforeState && (
              <CommitGraph
                graphId="commitflow-before-graph"
                commits={beforeState.commits}
                isDark={isDark}
              />
            )}
          </div>
        </div>

        <div className={styles.gridColumn}>
          <div className={styles.columnHeader}>
            <span>After Command</span>
            <span style={{ color: '#38bdf8' }}>{afterState?.commits.length || 0} commits</span>
          </div>
          <div className={styles.graphWrapper}>
            {afterState && (
              <CommitGraph
                graphId="commitflow-after-graph"
                commits={afterState.commits}
                isDark={isDark}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
