import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, ArrowRight, BookOpen, Columns2, Link2, Maximize2, Play } from 'lucide-react';
import { Viewport } from '@xyflow/react';
import { CommitInfo, CommandResult, RepoState } from '../../model/types';
import { gitBridge } from '../../engine/git-bridge';
import { executeCommandLine } from '../../parser/command-map';
import { CommitGraph } from '../../graph/CommitGraph';
import { CommitInspector } from '../CommitInspector/CommitInspector';
import { CommandCatalog } from './CommandCatalog';
import { EXPLAINER_PRESETS, ExplainerPreset, findExplainerPreset, getExplainerSetup } from './explainer-fixtures';
import { compareRepoStates, describeRepoChanges, tokenizeExplainerCommand } from './explainer-model';
import styles from './ExplainerMode.module.css';

interface ExplainerModeProps {
  isDark?: boolean;
  onProcessingChange?: (isProcessing: boolean) => void;
}

type GraphFocus = 'split' | 'before' | 'after';

const stripAnsi = (value: string) => value.replace(/\x1b\[[0-9;]*m/g, '');
const cloneState = (state: RepoState) => JSON.parse(JSON.stringify(state)) as RepoState;
const short = (oid?: string) => oid ? oid.slice(0, 7) : 'none';

function SnapshotSummary({ state, stage }: { state: RepoState; stage: 'Before' | 'After' }) {
  const workingCount = state.unstagedFiles.length + state.untrackedFiles.length;
  return (
    <div className={styles.snapshotSummary} aria-label={`${stage} repository summary`}>
      <div><span>HEAD</span><strong>{state.initialized ? `${state.head.target} @ ${short(state.head.oid)}` : 'Unavailable'}</strong></div>
      <div><span>Commits</span><strong>{state.commits.length}</strong></div>
      <div><span>Staged</span><strong>{state.stagedFiles.length}</strong></div>
      <div><span>Working</span><strong>{workingCount}</strong></div>
      <div><span>Refs</span><strong>{state.branches.length + state.tags.length}</strong></div>
      <div><span>Stashes</span><strong>{state.stashes.length}</strong></div>
    </div>
  );
}

export function ExplainerMode({ isDark = true, onProcessingChange }: ExplainerModeProps) {
  const initialPreset = EXPLAINER_PRESETS.find((item) => item.id === 'checkout-create') ?? EXPLAINER_PRESETS[0];
  const [inputCommand, setInputCommand] = useState(initialPreset.command);
  const [selectedPreset, setSelectedPreset] = useState<ExplainerPreset | undefined>(initialPreset);
  const [beforeState, setBeforeState] = useState<RepoState | null>(null);
  const [afterState, setAfterState] = useState<RepoState | null>(null);
  const [result, setResult] = useState<CommandResult | null>(null);
  const [error, setError] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedCommit, setSelectedCommit] = useState<CommitInfo | null>(null);
  const [graphFocus, setGraphFocus] = useState<GraphFocus>('split');
  const [syncViews, setSyncViews] = useState(false);
  const [sharedViewport, setSharedViewport] = useState<Viewport | undefined>();
  const processingRef = useRef(false);
  const hasRunInitial = useRef(false);
  const requestIdRef = useRef(0);

  const setupBaseRepo = useCallback(async (command: string) => {
    for (const setupCommand of getExplainerSetup(command)) {
      const setupResult = await executeCommandLine(setupCommand);
      if (setupResult.exitCode !== 0) throw new Error(stripAnsi(setupResult.stderr || `Setup failed: ${setupCommand}`));
    }
    return gitBridge.getState();
  }, []);

  const runExplanation = useCallback(async (command: string) => {
    if (processingRef.current) return;
    processingRef.current = true;
    const requestId = ++requestIdRef.current;
    setIsProcessing(true);
    onProcessingChange?.(true);
    setError('');
    setSelectedCommit(null);
    try {
      const simulation = await gitBridge.runIsolated(async () => {
        const base = await setupBaseRepo(command);
        const commandResult = await executeCommandLine(command);
        return { before: cloneState(base), after: cloneState(commandResult.state), result: commandResult };
      });
      if (requestId !== requestIdRef.current) return;
      setBeforeState(simulation.before);
      setAfterState(simulation.after);
      setResult(simulation.result);
      if (simulation.result.exitCode !== 0) {
        const preset = findExplainerPreset(command);
        const prerequisite = preset ? `This example expects: ${preset.whenToUse}` : 'Choose a guided example to load a repository state that satisfies the command prerequisites.';
        setError(`${stripAnsi(simulation.result.stderr || simulation.result.stdout || 'Command failed.')} ${prerequisite}`);
      }
    } catch (runError) {
      if (requestId !== requestIdRef.current) return;
      setResult(null);
      setError(runError instanceof Error ? runError.message : String(runError));
    } finally {
      if (requestId === requestIdRef.current) {
        processingRef.current = false;
        setIsProcessing(false);
        onProcessingChange?.(false);
      }
    }
  }, [onProcessingChange, setupBaseRepo]);

  useEffect(() => {
    if (hasRunInitial.current) return;
    hasRunInitial.current = true;
    runExplanation(initialPreset.command);
  }, [initialPreset.command, runExplanation]);

  const handleRun = (event: React.FormEvent) => {
    event.preventDefault();
    const command = inputCommand.trim();
    if (!command || isProcessing) return;
    setSelectedPreset(findExplainerPreset(command));
    runExplanation(command);
  };

  const handleSelectPreset = (preset: ExplainerPreset) => {
    setSelectedPreset(preset);
    setInputCommand(preset.command);
    runExplanation(preset.command);
  };

  const comparisonRows = useMemo(() => beforeState && afterState ? compareRepoStates(beforeState, afterState) : [], [afterState, beforeState]);
  const changes = useMemo(() => beforeState && afterState ? describeRepoChanges(beforeState, afterState) : [], [afterState, beforeState]);
  const commandTokens = useMemo(() => tokenizeExplainerCommand(result?.rawCommand || inputCommand), [inputCommand, result]);
  const explanation = result ? stripAnsi(result.explanation || (result.exitCode === 0 ? 'Command completed successfully.' : 'Command failed.')) : '';
  const output = result ? stripAnsi(result.stdout || result.stderr || 'No terminal output. Git completed the command silently.') : '';
  const allVisibleCommits = [...(beforeState?.commits ?? []), ...(afterState?.commits ?? [])];
  const changedRows = comparisonRows.filter((row) => row.changed).length;

  return (
    <div className={styles.explainerContainer}>
      <div className={styles.explainerHeader}>
        <div>
          <span className={styles.eyebrow}>Visual command laboratory</span>
          <h1>See what one Git command reads and changes</h1>
          <p>Choose a prepared example or enter a command. CommitFlow builds a safe practice repository, runs the command, and compares every important layer.</p>
        </div>
        <div className={styles.headerStat}><strong>{EXPLAINER_PRESETS.length}</strong><span>guided commands</span></div>
      </div>

      <form className={styles.commandBar} onSubmit={handleRun}>
        <label htmlFor="explainer-command">Command to simulate</label>
        <div className={styles.commandInputRow}>
          <span className={styles.promptMark}>$</span>
          <input id="explainer-command" value={inputCommand} onChange={(event) => setInputCommand(event.target.value)} placeholder="Type or paste a supported Git command" spellCheck={false} />
          <button type="submit" disabled={isProcessing}><Play size={15} aria-hidden="true" />{isProcessing ? 'Building comparison' : 'Explain command'}</button>
        </div>
        <span className={styles.inputHint}>Guided examples load the exact files, branches, commits, and staging state the command needs.</span>
      </form>

      <div className={styles.explainerWorkspace}>
        <CommandCatalog selectedId={selectedPreset?.id} disabled={isProcessing} onSelect={handleSelectPreset} />

        <main className={styles.lessonContent}>
          <section className={styles.commandLesson} aria-label="Selected command guide">
            <div className={styles.lessonTitleRow}>
              <div>
                <span className={styles.eyebrow}>{selectedPreset ? selectedPreset.category : 'Custom command'}</span>
                <h2>{selectedPreset?.title ?? 'Custom simulation'}</h2>
              </div>
              <div className={styles.badgeRow}>
                <span className={selectedPreset?.kind === 'Inspect' ? styles.inspectBadge : styles.changeBadge}>{selectedPreset?.kind ?? 'Custom'}</span>
                {selectedPreset && <span>{selectedPreset.difficulty}</span>}
              </div>
            </div>
            <p className={styles.lessonSummary}>{selectedPreset?.summary ?? 'This command uses a general two-commit fixture. Choose a guided example if the command needs a specific branch, file, or staging state.'}</p>

            <div className={styles.commandAnatomy}>
              <span className={styles.anatomyLabel}>Command anatomy</span>
              <div>{commandTokens.map((token, index) => <span key={`${token.text}-${index}`} className={styles[token.role]}><code>{token.text}</code><small>{token.role}</small></span>)}</div>
            </div>

            {selectedPreset && (
              <div className={styles.guidanceGrid}>
                <div><span>When to use it</span><p>{selectedPreset.whenToUse}</p></div>
                <div><span>Git reads</span><p>{selectedPreset.reads.join(' • ')}</p></div>
                <div><span>Git changes</span><p>{selectedPreset.changes.join(' • ')}</p></div>
                <div className={styles.caution}><span><AlertTriangle size={13} aria-hidden="true" /> Watch for</span><p>{selectedPreset.caution}</p></div>
              </div>
            )}
          </section>

          {error && <div className={styles.errorBox} role="alert"><AlertTriangle size={18} aria-hidden="true" /><div><strong>Command could not be completed</strong><p>{error}</p></div></div>}

          {beforeState && afterState && result && (
            <>
              <section className={styles.resultGrid} aria-live="polite">
                <div className={styles.explanationCard}>
                  <span className={styles.cardLabel}>Plain-language result</span>
                  <strong>{result.exitCode === 0 ? 'Command completed' : 'Command failed'}</strong>
                  <p>{explanation}</p>
                  <div className={styles.conceptRow}>{selectedPreset?.concepts.map((concept) => <span key={concept}>{concept}</span>)}</div>
                </div>
                <div className={styles.outputCard}>
                  <span className={styles.cardLabel}>Command output</span>
                  <code>$ {result.rawCommand}</code>
                  <pre>{output}</pre>
                  <span className={styles.exitCode}>Exit code {result.exitCode}</span>
                </div>
              </section>

              <section className={styles.changeSection} aria-label="Repository changes">
                <div className={styles.sectionHeading}>
                  <div><span className={styles.eyebrow}>What changed</span><h2>{changes[0]?.kind === 'unchanged' ? 'This command inspected state' : `${changes.length} repository ${changes.length === 1 ? 'effect' : 'effects'}`}</h2></div>
                  <span className={styles.changedCount}>{changedRows} of {comparisonRows.length} state rows changed</span>
                </div>
                <div className={styles.changeCards}>
                  {changes.map((change, index) => <div key={`${change.title}-${index}`} className={`${styles.changeCard} ${styles[change.kind]}`}><span>{change.kind}</span><strong>{change.title}</strong><p>{change.detail}</p></div>)}
                </div>
              </section>

              <section className={styles.stateComparison} aria-label="Before and after state comparison">
                <div className={styles.comparisonHeaderRow}><span>Repository layer</span><span>Before</span><ArrowRight size={14} aria-hidden="true" /><span>After</span></div>
                {comparisonRows.map((row) => (
                  <div key={row.key} className={`${styles.comparisonRow} ${row.changed ? styles.rowChanged : styles.rowUnchanged}`} title={row.help}>
                    <div><strong>{row.label}</strong><span>{row.changed ? 'Changed' : 'Unchanged'}</span></div>
                    <code>{row.before}</code><ArrowRight size={14} aria-hidden="true" /><code>{row.after}</code>
                  </div>
                ))}
              </section>

              <section className={styles.graphSection} aria-label="Visual history comparison">
                <div className={styles.graphReadingGuide}>
                  <div><BookOpen size={18} aria-hidden="true" /><span><strong>How to read this comparison</strong>Start with HEAD and branch labels, then trace parent arrows. Select any commit for its full metadata.</span></div>
                  <div className={styles.graphModeControls}>
                    <button type="button" className={graphFocus === 'split' ? styles.modeActive : ''} onClick={() => setGraphFocus('split')}><Columns2 size={14} aria-hidden="true" />Equal view</button>
                    <button type="button" className={graphFocus === 'before' ? styles.modeActive : ''} onClick={() => setGraphFocus('before')}><Maximize2 size={14} aria-hidden="true" />Focus before</button>
                    <button type="button" className={graphFocus === 'after' ? styles.modeActive : ''} onClick={() => setGraphFocus('after')}><Maximize2 size={14} aria-hidden="true" />Focus after</button>
                    <button type="button" className={syncViews ? styles.modeActive : ''} onClick={() => { setSyncViews((value) => !value); setSharedViewport(undefined); }} aria-pressed={syncViews}><Link2 size={14} aria-hidden="true" />Sync views</button>
                  </div>
                </div>

                <div className={`${styles.comparisonGrid} ${styles[`focus_${graphFocus}`]}`}>
                  <article className={styles.graphColumn}>
                    <div className={styles.columnHeader}><div><span>01</span><strong>Before command</strong></div><p>The prepared repository immediately before the selected command runs.</p></div>
                    <SnapshotSummary state={beforeState} stage="Before" />
                    <div className={styles.graphWrapper}>
                      <CommitGraph
                        graphId="commitflow-before-graph"
                        commits={beforeState.commits}
                        onSelectCommit={setSelectedCommit}
                        isDark={isDark}
                        emptyTitle={beforeState.initialized ? 'No commits before this command' : 'No repository exists yet'}
                        emptyDescription={beforeState.initialized ? 'Use the state summary above to inspect files, refs, and HEAD.' : 'This is the state before git init creates repository metadata.'}
                        viewport={syncViews ? sharedViewport : undefined}
                        onViewportChange={syncViews ? setSharedViewport : undefined}
                      />
                    </div>
                  </article>

                  <article className={styles.graphColumn}>
                    <div className={styles.columnHeader}><div><span>02</span><strong>After command</strong></div><p>The repository after Git completes the command successfully.</p></div>
                    <SnapshotSummary state={afterState} stage="After" />
                    <div className={styles.graphWrapper}>
                      <CommitGraph
                        graphId="commitflow-after-graph"
                        commits={afterState.commits}
                        onSelectCommit={setSelectedCommit}
                        isDark={isDark}
                        emptyTitle={afterState.initialized ? 'Repository ready, with no commits yet' : 'Repository state is unchanged'}
                        emptyDescription={afterState.initialized ? 'Git is initialized. Create and commit a staged snapshot to add the first node.' : 'The command did not create a repository or commit history.'}
                        viewport={syncViews ? sharedViewport : undefined}
                        onViewportChange={syncViews ? setSharedViewport : undefined}
                      />
                    </div>
                  </article>
                </div>
              </section>
            </>
          )}
        </main>
      </div>

      <CommitInspector commit={selectedCommit} allCommits={allVisibleCommits} onSelectCommit={setSelectedCommit} onClose={() => setSelectedCommit(null)} />
    </div>
  );
}
