import { useState, useEffect, useCallback, useRef } from 'react';
import { RepoState, CommitInfo, Scenario, CommandResult } from './model/types';
import { gitBridge } from './engine/git-bridge';
import { executeCommandLine } from './parser/command-map';
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

  // Scenario state
  const [selectedScenario, setSelectedScenario] = useState<Scenario | null>(null);
  const [scenarioStepIndex, setScenarioStepIndex] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1000);
  const isPlayingRef = useRef<boolean>(false);

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

  const handleExecuteCommand = useCallback(async (command: string): Promise<CommandResult> => {
    const res = await executeCommandLine(command);
    setCommandHistory((prev) => [...prev, command]);
    if (res.explanation) {
      setLastCommand({ command, explanation: res.explanation });
    }
    return res;
  }, []);

  const handleResetRepo = useCallback(async () => {
    await gitBridge.send('RESET_REPO');
    setCommandHistory([]);
    setLastCommand(null);
    setSelectedScenario(null);
    setScenarioStepIndex(0);
    setIsPlaying(false);
    isPlayingRef.current = false;
    window.location.hash = '';
  }, []);

  // Scenario loading
  const handleSelectScenario = useCallback(
    async (scenario: Scenario | null) => {
      await handleResetRepo();
      setSelectedScenario(scenario);
      setScenarioStepIndex(0);
    },
    [handleResetRepo]
  );

  // Step forward in scenario
  const handleScenarioStepForward = useCallback(async () => {
    if (!selectedScenario || scenarioStepIndex >= selectedScenario.steps.length) return;
    const step = selectedScenario.steps[scenarioStepIndex];
    await handleExecuteCommand(step.command);
    setScenarioStepIndex((prev) => prev + 1);
  }, [handleExecuteCommand, scenarioStepIndex, selectedScenario]);

  // Step back in scenario
  const handleScenarioStepBack = useCallback(async () => {
    if (!selectedScenario || scenarioStepIndex <= 0) return;
    const targetSteps = scenarioStepIndex - 1;
    await gitBridge.send('RESET_REPO');
    setCommandHistory([]);

    for (let i = 0; i < targetSteps; i++) {
      const step = selectedScenario.steps[i];
      await executeCommandLine(step.command);
      setCommandHistory((prev) => [...prev, step.command]);
    }
    setScenarioStepIndex(targetSteps);
  }, [scenarioStepIndex, selectedScenario]);

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
          const step = selectedScenario.steps[scenarioStepIndex];
          await handleExecuteCommand(step.command);
          setScenarioStepIndex((prev) => prev + 1);
        }, playbackSpeed);
      } else {
        setIsPlaying(false);
        isPlayingRef.current = false;
      }
    }
    return () => clearTimeout(timer);
  }, [isPlaying, scenarioStepIndex, selectedScenario, playbackSpeed, handleExecuteCommand]);

  // Load from URL Hash replay on mount
  useEffect(() => {
    const hash = window.location.hash;
    if (hash) {
      const commands = decodeCommandHistoryFromHash(hash);
      if (commands.length > 0) {
        (async () => {
          for (const cmd of commands) {
            await executeCommandLine(cmd);
            setCommandHistory((prev) => [...prev, cmd]);
          }
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
        onModeChange={setMode}
        selectedScenario={selectedScenario}
        onSelectScenario={handleSelectScenario}
        onShare={handleShare}
        onExplainLast={() => setShowExplanation(true)}
        onReset={handleResetRepo}
        themeMode={themeMode}
        onToggleTheme={handleToggleTheme}
        hasLastCommand={Boolean(lastCommand)}
      />

      {mode === 'playground' && selectedScenario && (
        <PlaybackControls
          currentScenario={selectedScenario}
          currentStepIndex={scenarioStepIndex}
          isPlaying={isPlaying}
          playbackSpeed={playbackSpeed}
          onStepBack={handleScenarioStepBack}
          onStepForward={handleScenarioStepForward}
          onPlayToggle={handlePlayToggle}
          onReset={() => handleSelectScenario(selectedScenario)}
          onSpeedChange={setPlaybackSpeed}
        />
      )}

      {mode === 'explainer' ? (
        <ExplainerMode isDark={themeMode === 'dark'} />
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
              />
            </div>
            <div className={styles.statePane}>
              <StatePanel repoState={repoState} onAction={handleExecuteCommand} />
            </div>
          </div>
        </div>
      )}

      {selectedCommit && (
        <CommitInspector commit={selectedCommit} onClose={() => setSelectedCommit(null)} />
      )}

      {showExplanation && lastCommand && (
        <ExplanationModal
          command={lastCommand.command}
          explanation={lastCommand.explanation}
          onClose={() => setShowExplanation(false)}
        />
      )}
    </div>
  );
}
