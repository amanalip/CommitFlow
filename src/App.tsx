import { useState, useEffect, useCallback, useRef } from 'react';
import { RepoState, CommitInfo, Scenario, CommandResult } from './model/types';
import { gitBridge } from './engine/git-bridge';
import { repositoryOperationQueue } from './engine/operation-queue';
import { executeCommandLineNow } from './parser/command-map';
import { encodeCommandHistoryToHash, decodeCommandHistoryFromHash } from './share/url-codec';
import { ThemeMode, THEMES } from './theme/theme';

import { Header } from './ui/Header/Header';
import { PlaybackControls } from './ui/PlaybackControls/PlaybackControls';
import { CommitGraph } from './graph/CommitGraph';
import { Terminal } from './ui/Terminal/Terminal';
import { StatePanel } from './ui/StatePanel/StatePanel';
import { CommitInspector } from './ui/CommitInspector/CommitInspector';
import { ExplanationModal } from './ui/ExplanationModal/ExplanationModal';
import { ExplainerMode } from './ui/ExplainerMode/ExplainerMode';

import styles from './App.module.css';

const SCENARIO_CLOCK_EPOCH = 1_735_689_600;

export function App() {
  const [themeMode, setThemeMode] = useState<ThemeMode>(() => {
    return (localStorage.getItem('commitflow_theme') as ThemeMode) || 'dark';
  });

  const [mode, setMode] = useState<'playground' | 'explainer'>('playground');
  const [repoState, setRepoState] = useState<RepoState>(gitBridge.getState());
  const [selectedCommit, setSelectedCommit] = useState<CommitInfo | null>(null);

  const [commandHistory, setCommandHistory] = useState<string[]>([]);
  const [lastCommand, setLastCommand] = useState<{ command: string; explanation: string } | null>(null);
  const [showExplanation, setShowExplanation] = useState<boolean>(false);
  const [terminalResetKey, setTerminalResetKey] = useState<number>(0);
  const [isExplainerProcessing, setIsExplainerProcessing] = useState<boolean>(false);
  const [isCommandRunning, setIsCommandRunning] = useState<boolean>(false);
  const activeCommandCount = useRef(0);
  const externalCommandId = useRef(0);
  const [externalTerminalCommand, setExternalTerminalCommand] = useState<{ id: number; command: string; result: CommandResult } | null>(null);

  // Scenario state
  const [selectedScenario, setSelectedScenario] = useState<Scenario | null>(null);
  const [scenarioStepIndex, setScenarioStepIndex] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(2000);
  const [lastScenarioResult, setLastScenarioResult] = useState<CommandResult | null>(null);
  const isPlayingRef = useRef<boolean>(false);
  const playbackGeneration = useRef(0);

  // Apply theme variables to root element
  useEffect(() => {
    const root = document.documentElement;
    const theme = THEMES[themeMode];
    root.style.setProperty('--bg-color', theme.bg);
    root.style.setProperty('--bg-secondary', theme.bgSecondary);
    root.style.setProperty('--bg-tertiary', theme.bgTertiary);
    root.style.setProperty('--border-color', theme.border);
    root.style.setProperty('--text-color', theme.text);
    root.style.setProperty('--text-secondary', theme.textSecondary);
    root.style.setProperty('--text-muted', theme.textMuted);
    root.style.setProperty('--accent-color', theme.accent);
    root.style.setProperty('--node-bg', theme.nodeBg);
    root.style.setProperty('--node-border', theme.nodeBorder);
    root.style.setProperty('--terminal-bg', theme.terminalBg);
    root.style.setProperty('--terminal-header-bg', theme.terminalHeader);
    localStorage.setItem('commitflow_theme', themeMode);
  }, [themeMode]);

  // Subscribe to bridge state changes
  useEffect(() => {
    const unsubscribe = gitBridge.subscribe((newState) => {
      setRepoState(newState);
    });
    return unsubscribe;
  }, []);

  const handleToggleTheme = () => {
    setThemeMode((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  const executeAndRecordNow = useCallback(async (command: string): Promise<CommandResult> => {
    activeCommandCount.current += 1;
    setIsCommandRunning(true);
    try {
      const res = await executeCommandLineNow(command);
      setCommandHistory((prev) => [...prev, command]);
      if (res.explanation) {
        setLastCommand({ command, explanation: res.explanation });
      }
      return res;
    } finally {
      activeCommandCount.current -= 1;
      if (activeCommandCount.current === 0) {
        setIsCommandRunning(false);
      }
    }
  }, []);

  const handleExecuteCommand = useCallback(
    (command: string): Promise<CommandResult> =>
      repositoryOperationQueue.run(() => executeAndRecordNow(command)),
    [executeAndRecordNow],
  );

  const handleModeChange = useCallback((nextMode: 'playground' | 'explainer') => {
    playbackGeneration.current += 1;
    setIsPlaying(false);
    isPlayingRef.current = false;
    setSelectedCommit(null);
    setShowExplanation(false);
    setMode(nextMode);
  }, []);

  const handleExternalCommand = useCallback(async (command: string): Promise<CommandResult> => {
    const result = await handleExecuteCommand(command);
    externalCommandId.current += 1;
    setExternalTerminalCommand({ id: externalCommandId.current, command, result });
    return result;
  }, [handleExecuteCommand]);

  const setScenarioClock = useCallback(async (stepIndex: number) => {
    await gitBridge.send('SET_COMMIT_TIME', { timestamp: SCENARIO_CLOCK_EPOCH + stepIndex * 60 });
  }, []);

  const handleResetRepo = useCallback(async () => {
    playbackGeneration.current += 1;
    setIsPlaying(false);
    isPlayingRef.current = false;
    await repositoryOperationQueue.run(async () => {
      await gitBridge.send('RESET_REPO');
      await gitBridge.send('SET_COMMIT_TIME', { timestamp: undefined });
    });
    setCommandHistory([]);
    setLastCommand(null);
    setSelectedScenario(null);
    setScenarioStepIndex(0);
    setLastScenarioResult(null);
    setTerminalResetKey((value) => value + 1);
    setExternalTerminalCommand(null);
    window.location.hash = '';
  }, []);

  // Scenario loading
  const handleSelectScenario = useCallback(
    async (scenario: Scenario | null) => {
      await handleResetRepo();
      setSelectedScenario(scenario);
      setScenarioStepIndex(0);
      setLastScenarioResult(null);
    },
    [handleResetRepo]
  );

  // Step forward in scenario
  const handleScenarioStepForward = useCallback(async () => {
    if (!selectedScenario || scenarioStepIndex >= selectedScenario.steps.length) return;
    const step = selectedScenario.steps[scenarioStepIndex];
    const result = await repositoryOperationQueue.run(async () => {
      await setScenarioClock(scenarioStepIndex);
      const commandResult = await executeAndRecordNow(step.command);
      externalCommandId.current += 1;
      setExternalTerminalCommand({ id: externalCommandId.current, command: step.command, result: commandResult });
      return commandResult;
    });
    setLastScenarioResult(result);
    if (result.exitCode === 0) {
      setScenarioStepIndex((prev) => prev + 1);
    }
  }, [executeAndRecordNow, scenarioStepIndex, selectedScenario, setScenarioClock]);

  // Step back in scenario
  const handleScenarioStepBack = useCallback(async () => {
    if (!selectedScenario || scenarioStepIndex <= 0) return;
    const targetSteps = scenarioStepIndex - 1;
    playbackGeneration.current += 1;
    const { replayResult, completedSteps, replayedCommands } = await repositoryOperationQueue.run(async () => {
      await gitBridge.send('RESET_REPO');
      const replayedCommands: string[] = [];
      let replayResult: CommandResult | null = null;
      let completedSteps = 0;
      for (let i = 0; i < targetSteps; i++) {
        const step = selectedScenario.steps[i];
        await setScenarioClock(i);
        replayResult = await executeCommandLineNow(step.command);
        if (replayResult.exitCode !== 0) break;
        replayedCommands.push(step.command);
        completedSteps += 1;
      }
      return { replayResult, completedSteps, replayedCommands };
    });
    setCommandHistory(replayedCommands);
    setLastScenarioResult(replayResult);
    setScenarioStepIndex(completedSteps);
  }, [scenarioStepIndex, selectedScenario, setScenarioClock]);

  // Play / Pause automated sequence
  const handlePlayToggle = useCallback(() => {
    if (isPlaying) {
      setIsPlaying(false);
      isPlayingRef.current = false;
    } else {
      setIsPlaying(true);
      isPlayingRef.current = true;
    }
  }, [isPlaying]);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isPlaying && selectedScenario) {
      if (scenarioStepIndex < selectedScenario.steps.length) {
        timer = setTimeout(async () => {
          if (!isPlayingRef.current) return;
          const generation = playbackGeneration.current;
          const step = selectedScenario.steps[scenarioStepIndex];
          const result = await repositoryOperationQueue.run(async () => {
            await setScenarioClock(scenarioStepIndex);
            const commandResult = await executeAndRecordNow(step.command);
            externalCommandId.current += 1;
            setExternalTerminalCommand({ id: externalCommandId.current, command: step.command, result: commandResult });
            return commandResult;
          });
          if (!isPlayingRef.current || generation !== playbackGeneration.current) return;
          setLastScenarioResult(result);
          if (result.exitCode === 0) {
            setScenarioStepIndex((prev) => prev + 1);
          } else {
            setIsPlaying(false);
            isPlayingRef.current = false;
          }
        }, playbackSpeed);
      } else {
        setIsPlaying(false);
        isPlayingRef.current = false;
      }
    }
    return () => clearTimeout(timer);
  }, [isPlaying, scenarioStepIndex, selectedScenario, playbackSpeed, executeAndRecordNow, setScenarioClock]);

  // Load from URL Hash replay on mount
  useEffect(() => {
    const hash = window.location.hash;
    if (hash) {
      const commands = decodeCommandHistoryFromHash(hash);
      if (commands.length > 0) {
        (async () => {
          playbackGeneration.current += 1;
          await repositoryOperationQueue.run(async () => {
            const replayedCommands: string[] = [];
            for (const cmd of commands) {
              const result = await executeCommandLineNow(cmd);
              if (result.exitCode !== 0) break;
              replayedCommands.push(cmd);
            }
            setCommandHistory(replayedCommands);
          });
        })();
      }
    }
  }, []);

  const handleShare = () => {
    const hash = encodeCommandHistoryToHash(commandHistory);
    const url = `${window.location.origin}${window.location.pathname}#${hash}`;
    navigator.clipboard.writeText(url);
  };

  // Keyboard shortcut listener for Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSelectedCommit(null);
        setShowExplanation(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div className={styles.appContainer}>
      <Header
        mode={mode}
        onModeChange={handleModeChange}
        selectedScenario={selectedScenario}
        onSelectScenario={handleSelectScenario}
        onShare={handleShare}
        onExplainLast={() => setShowExplanation(true)}
        onReset={handleResetRepo}
        themeMode={themeMode}
        onToggleTheme={handleToggleTheme}
        hasLastCommand={Boolean(lastCommand)}
        modeChangeDisabled={isExplainerProcessing || isCommandRunning}
      />

      {mode === 'playground' && selectedScenario && (
        <PlaybackControls
          currentScenario={selectedScenario}
          currentStepIndex={scenarioStepIndex}
          isPlaying={isPlaying}
          isBusy={isCommandRunning}
          playbackSpeed={playbackSpeed}
          lastResult={lastScenarioResult}
          onStepBack={handleScenarioStepBack}
          onStepForward={handleScenarioStepForward}
          onPlayToggle={handlePlayToggle}
          onReset={() => handleSelectScenario(selectedScenario)}
          onSpeedChange={setPlaybackSpeed}
        />
      )}

      {mode === 'explainer' ? (
        <ExplainerMode
          isDark={themeMode === 'dark'}
          onProcessingChange={setIsExplainerProcessing}
        />
      ) : (
        <div className={styles.mainLayout}>
          <div className={styles.graphSection}>
            <CommitGraph
              commits={repoState.commits}
              onSelectCommit={setSelectedCommit}
              isDark={themeMode === 'dark'}
            />
          </div>

          <div className={styles.bottomSection}>
            <div className={styles.terminalPane}>
              <Terminal
                repoState={repoState}
                onExecuteCommand={handleExecuteCommand}
                themeMode={themeMode}
                resetKey={terminalResetKey}
                externalCommand={externalTerminalCommand}
              />
            </div>
            <div className={styles.statePane}>
              <StatePanel repoState={repoState} onAction={handleExternalCommand} />
            </div>
          </div>
        </div>
      )}

      {selectedCommit && (
        <CommitInspector
          commit={selectedCommit}
          allCommits={repoState.commits}
          onSelectCommit={setSelectedCommit}
          onClose={() => setSelectedCommit(null)}
        />
      )}

      {showExplanation && lastCommand && (
        <ExplanationModal
          command={lastCommand.command}
          explanation={lastCommand.explanation}
          onClose={() => setShowExplanation(false)}
        />
      )}

      <footer className={styles.appFooter}>
        <span>
          Copyright © 2026{' '}
          <a
            href="https://github.com/amanalip"
            target="_blank"
            rel="noreferrer"
            className={styles.footerLink}
          >
            Aman Ali Pogaku
          </a>
          . Released under GPL v3.
        </span>
      </footer>
    </div>
  );
}
