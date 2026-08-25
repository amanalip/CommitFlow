import { lazy, Suspense, useState, useEffect, useCallback, useRef } from 'react';
import { Maximize2, PanelBottom, RotateCcw } from 'lucide-react';
import { RepoState, CommitInfo, Scenario, CommandResult } from './model/types';
import { gitBridge } from './engine/git-bridge';
import { repositoryOperationQueue } from './engine/operation-queue';
import { executeCommandLineNow } from './parser/command-map';
import { encodeCommandHistoryToHash, decodeCommandHistoryFromHash } from './share/url-codec';
import { ThemeMode, THEMES } from './theme/theme';
import { copyText } from './utils/clipboard';

import { Header } from './ui/Header/Header';
import { PlaybackControls } from './ui/PlaybackControls/PlaybackControls';
import { CommitGraph } from './graph/CommitGraph';
import { Terminal } from './ui/Terminal/Terminal';
import { StatePanel } from './ui/StatePanel/StatePanel';
import { CommitInspector } from './ui/CommitInspector/CommitInspector';
import { ExplanationModal } from './ui/ExplanationModal/ExplanationModal';
import { ConfirmDialog } from './ui/ConfirmDialog/ConfirmDialog';

import styles from './App.module.css';

const SCENARIO_CLOCK_EPOCH = 1_735_689_600;
const LAYOUT_STORAGE_KEY = 'commitflow_desktop_layout';
const ExplainerMode = lazy(() => import('./ui/ExplainerMode/ExplainerMode').then((module) => ({ default: module.ExplainerMode })));

interface DesktopLayout {
  graphPercent: number;
  terminalPercent: number;
}

const DEFAULT_LAYOUT: DesktopLayout = { graphPercent: 55, terminalPercent: 50 };

function loadDesktopLayout(): DesktopLayout {
  try {
    const value = JSON.parse(localStorage.getItem(LAYOUT_STORAGE_KEY) || 'null') as Partial<DesktopLayout> | null;
    return {
      graphPercent: Math.min(72, Math.max(32, value?.graphPercent ?? DEFAULT_LAYOUT.graphPercent)),
      terminalPercent: Math.min(75, Math.max(25, value?.terminalPercent ?? DEFAULT_LAYOUT.terminalPercent)),
    };
  } catch {
    return DEFAULT_LAYOUT;
  }
}

interface ConfirmationRequest {
  title: string;
  description: string;
  command?: string;
  confirmLabel: string;
  action: () => Promise<void>;
}

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
  const [confirmation, setConfirmation] = useState<ConfirmationRequest | null>(null);
  const [replayProgress, setReplayProgress] = useState<{ current: number; total: number } | null>(null);
  const [desktopLayout, setDesktopLayout] = useState<DesktopLayout>(loadDesktopLayout);
  const [maximizedPane, setMaximizedPane] = useState<'terminal' | 'state' | null>(null);
  const mainLayoutRef = useRef<HTMLDivElement>(null);
  const bottomSectionRef = useRef<HTMLDivElement>(null);

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

  useEffect(() => {
    localStorage.setItem(LAYOUT_STORAGE_KEY, JSON.stringify(desktopLayout));
  }, [desktopLayout]);

  const beginGraphResize = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    event.preventDefault();
    const container = mainLayoutRef.current;
    if (!container) return;
    const onMove = (moveEvent: PointerEvent) => {
      const bounds = container.getBoundingClientRect();
      const next = ((moveEvent.clientY - bounds.top) / bounds.height) * 100;
      setDesktopLayout((current) => ({ ...current, graphPercent: Math.min(72, Math.max(32, next)) }));
    };
    const onUp = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  }, []);

  const beginPaneResize = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    event.preventDefault();
    if (maximizedPane) return;
    const container = bottomSectionRef.current;
    if (!container) return;
    const onMove = (moveEvent: PointerEvent) => {
      const bounds = container.getBoundingClientRect();
      const next = ((moveEvent.clientX - bounds.left) / bounds.width) * 100;
      setDesktopLayout((current) => ({ ...current, terminalPercent: Math.min(75, Math.max(25, next)) }));
    };
    const onUp = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  }, [maximizedPane]);

  const adjustLayout = useCallback((axis: 'graph' | 'panes', delta: number) => {
    setDesktopLayout((current) => axis === 'graph'
      ? { ...current, graphPercent: Math.min(72, Math.max(32, current.graphPercent + delta)) }
      : { ...current, terminalPercent: Math.min(75, Math.max(25, current.terminalPercent + delta)) });
  }, []);

  const restoreDefaultLayout = useCallback(() => {
    setDesktopLayout(DEFAULT_LAYOUT);
    setMaximizedPane(null);
  }, []);

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

  const requestDestructiveCommand = useCallback((command: string, title: string, description: string) => {
    setConfirmation({
      title,
      description,
      command,
      confirmLabel: 'Run command',
      action: async () => {
        await handleExternalCommand(command);
      },
    });
  }, [handleExternalCommand]);

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

  const requestResetRepo = useCallback(() => {
    const hasMeaningfulState = repoState.initialized || commandHistory.length > 0 || Boolean(selectedScenario);
    if (!hasMeaningfulState) {
      void handleResetRepo();
      return;
    }
    setConfirmation({
      title: 'Reset the Playground?',
      description: 'This clears the repository, terminal history, lesson progress, staged files, working files, branches, tags, and stashes.',
      confirmLabel: 'Reset Playground',
      action: handleResetRepo,
    });
  }, [commandHistory.length, handleResetRepo, repoState.initialized, selectedScenario]);

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
          setReplayProgress({ current: 0, total: commands.length });
          await repositoryOperationQueue.run(async () => {
            const replayedCommands: string[] = [];
            for (const cmd of commands) {
              const result = await executeCommandLineNow(cmd);
              if (result.exitCode !== 0) break;
              replayedCommands.push(cmd);
              setReplayProgress({ current: replayedCommands.length, total: commands.length });
            }
            setCommandHistory(replayedCommands);
          });
          setReplayProgress(null);
        })();
      }
    }
  }, []);

  const handleShare = async () => {
    if (commandHistory.length === 0) throw new Error('Run a command before sharing.');
    const hash = encodeCommandHistoryToHash(commandHistory);
    const url = `${window.location.origin}${window.location.pathname}#${hash}`;
    await copyText(url);
  };

  return (
    <div className={styles.appContainer}>
      <Header
        mode={mode}
        onModeChange={handleModeChange}
        selectedScenario={selectedScenario}
        onSelectScenario={handleSelectScenario}
        onShare={handleShare}
        onExplainLast={() => setShowExplanation(true)}
        onReset={requestResetRepo}
        themeMode={themeMode}
        onToggleTheme={handleToggleTheme}
        hasLastCommand={Boolean(lastCommand)}
        modeChangeDisabled={isExplainerProcessing || isCommandRunning}
        canShare={commandHistory.length > 0}
        replayLabel={replayProgress ? `Replaying ${replayProgress.current} of ${replayProgress.total}` : ''}
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
        <Suspense fallback={<div className={styles.modeLoading} role="status">Loading the command laboratory...</div>}>
          <ExplainerMode
            isDark={themeMode === 'dark'}
            onProcessingChange={setIsExplainerProcessing}
          />
        </Suspense>
      ) : (
        <div
          ref={mainLayoutRef}
          className={styles.mainLayout}
          style={{ '--graph-percent': `${desktopLayout.graphPercent}%` } as React.CSSProperties}
        >
          <div className={styles.layoutToolbar} aria-label="Workspace layout controls">
            <button type="button" onClick={restoreDefaultLayout} title="Restore the default graph and pane sizes"><RotateCcw size={13} aria-hidden="true" /> Default layout</button>
            <button type="button" aria-pressed={maximizedPane === 'terminal'} onClick={() => setMaximizedPane((value) => value === 'terminal' ? null : 'terminal')} title="Use the full lower workspace for the terminal"><Maximize2 size={13} aria-hidden="true" /> Terminal</button>
            <button type="button" aria-pressed={maximizedPane === 'state'} onClick={() => setMaximizedPane((value) => value === 'state' ? null : 'state')} title="Use the full lower workspace for repository details"><PanelBottom size={13} aria-hidden="true" /> Repository</button>
          </div>
          <div className={styles.graphSection}>
            <CommitGraph
              commits={repoState.commits}
              onSelectCommit={setSelectedCommit}
              isDark={themeMode === 'dark'}
            />
          </div>

          <div
            className={`${styles.horizontalResizeHandle} ${styles.resizeHandle}`}
            role="separator"
            aria-label="Resize graph and lower workspace"
            aria-orientation="horizontal"
            aria-valuemin={32}
            aria-valuemax={72}
            aria-valuenow={Math.round(desktopLayout.graphPercent)}
            tabIndex={0}
            onPointerDown={beginGraphResize}
            onKeyDown={(event) => {
              if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
                event.preventDefault();
                adjustLayout('graph', event.key === 'ArrowUp' ? -2 : 2);
              }
            }}
          ><span /></div>

          <div
            ref={bottomSectionRef}
            className={`${styles.bottomSection} ${maximizedPane ? styles.bottomSectionMaximized : ''}`}
            style={{ '--terminal-percent': maximizedPane === 'terminal' ? '100%' : maximizedPane === 'state' ? '0%' : `${desktopLayout.terminalPercent}%` } as React.CSSProperties}
          >
            <div className={`${styles.terminalPane} ${maximizedPane === 'state' ? styles.hiddenPane : ''}`}>
              <Terminal
                repoState={repoState}
                onExecuteCommand={handleExecuteCommand}
                themeMode={themeMode}
                resetKey={terminalResetKey}
                externalCommand={externalTerminalCommand}
              />
            </div>
            {!maximizedPane && (
              <div
                className={`${styles.verticalResizeHandle} ${styles.resizeHandle}`}
                role="separator"
                aria-label="Resize terminal and repository panes"
                aria-orientation="vertical"
                aria-valuemin={25}
                aria-valuemax={75}
                aria-valuenow={Math.round(desktopLayout.terminalPercent)}
                tabIndex={0}
                onPointerDown={beginPaneResize}
                onKeyDown={(event) => {
                  if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
                    event.preventDefault();
                    adjustLayout('panes', event.key === 'ArrowLeft' ? -2 : 2);
                  }
                }}
              ><span /></div>
            )}
            <div className={`${styles.statePane} ${maximizedPane === 'terminal' ? styles.hiddenPane : ''}`}>
              <StatePanel repoState={repoState} onAction={handleExternalCommand} onDestructiveAction={requestDestructiveCommand} />
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

      {confirmation && (
        <ConfirmDialog
          title={confirmation.title}
          description={confirmation.description}
          command={confirmation.command}
          confirmLabel={confirmation.confirmLabel}
          onCancel={() => setConfirmation(null)}
          onConfirm={async () => {
            const action = confirmation.action;
            await action();
            setConfirmation(null);
          }}
        />
      )}

    </div>
  );
}
