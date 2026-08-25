import { useEffect, useState } from 'react';
import { CheckCircle2, ChevronLeft, ChevronRight, Pause, Play, RotateCcw } from 'lucide-react';
import { CommandResult, Scenario } from '../../model/types';
import { getScenarioStepMetadata } from '../../scenarios/step-metadata';
import styles from './PlaybackControls.module.css';

interface PlaybackControlsProps {
  currentScenario: Scenario | null;
  currentStepIndex: number;
  isPlaying: boolean;
  isBusy: boolean;
  playbackSpeed: number;
  lastResult: CommandResult | null;
  onStepBack: () => void;
  onStepForward: () => void;
  onPlayToggle: () => void;
  onReset: () => void;
  onSpeedChange: (speed: number) => void;
}

export function PlaybackControls({ currentScenario, currentStepIndex, isPlaying, isBusy, playbackSpeed, lastResult, onStepBack, onStepForward, onPlayToggle, onReset, onSpeedChange }: PlaybackControlsProps) {
  const [previewStepIndex, setPreviewStepIndex] = useState(0);
  useEffect(() => {
    if (currentScenario) setPreviewStepIndex(Math.min(currentStepIndex, currentScenario.steps.length));
  }, [currentScenario, currentStepIndex]);
  if (!currentScenario) return null;
  const totalSteps = currentScenario.steps.length;
  const nextStep = currentScenario.steps[currentStepIndex];
  const completedStep = currentStepIndex > 0 ? currentScenario.steps[currentStepIndex - 1] : null;
  const visibleStep = currentScenario.steps[previewStepIndex] || nextStep || completedStep;
  const metadata = visibleStep ? getScenarioStepMetadata(visibleStep) : null;
  const complete = currentStepIndex >= totalSteps;
  const showingCompletion = complete && previewStepIndex === totalSteps;
  const isCurrentStep = previewStepIndex === currentStepIndex;
  const progress = Math.round((currentStepIndex / totalSteps) * 100);

  return (
    <section className={styles.learningPanel} aria-label={`${currentScenario.title} learning controls`}>
      <div className={styles.overviewRow}>
        <div className={styles.scenarioIdentity}>
          <div className={styles.titleLine}>
            <span className={styles.scenarioTitle}>{currentScenario.title}</span>
            <span className={styles.badge}>{currentScenario.category}</span>
            <span className={styles.badge}>{currentScenario.difficulty}</span>
            <span className={styles.badge}>{currentScenario.estimatedMinutes} min</span>
          </div>
          <div className={styles.summary}>{currentScenario.summary}</div>
        </div>
        <div className={styles.progressGroup}>
          <span>{currentStepIndex} of {totalSteps} complete</span>
          <div className={styles.progressTrack} role="progressbar" aria-valuemin={0} aria-valuemax={totalSteps} aria-valuenow={currentStepIndex}>
            <span style={{ width: `${progress}%` }} />
          </div>
        </div>
      </div>

      <div className={styles.lessonRow}>
        <div className={`${styles.stepCard} ${showingCompletion ? styles.completeCard : ''}`}>
          <div className={styles.stepHeader}>
            <span className={styles.stepLabel}>{showingCompletion ? 'Lesson complete' : isCurrentStep ? `Next command • step ${currentStepIndex + 1}` : `${previewStepIndex < currentStepIndex ? 'Completed' : 'Preview'} • step ${previewStepIndex + 1}`}</span>
            {!showingCompletion && metadata && <span className={styles.areaBadge}>{metadata.area}</span>}
          </div>
          {showingCompletion ? (
            <div className={styles.completionContent}>
              <CheckCircle2 size={21} aria-hidden="true" />
              <div><strong>You completed {currentScenario.title}</strong><span>{currentScenario.learningObjectives.join(' • ')}</span></div>
            </div>
          ) : (
            <>
              <code className={styles.command}>$ {visibleStep.command}</code>
              <div className={styles.description}>{visibleStep.description}</div>
              <div className={styles.explanation}>{visibleStep.explanation}</div>
            </>
          )}
        </div>

        <div className={styles.effectCard}>
          <div className={styles.stepLabel}>{showingCompletion ? 'Concepts practiced' : isCurrentStep ? 'What this step will change' : 'What this step changes'}</div>
          <div className={styles.effectText}>{showingCompletion ? currentScenario.concepts.join(' • ') : visibleStep.expectedStateNote || metadata?.effect}</div>
          {!showingCompletion && metadata && <div className={styles.commitNote}>{metadata.commitBehavior}</div>}
          {lastResult && (
            <div className={`${styles.lastOutcome} ${lastResult.exitCode === 0 ? styles.successOutcome : styles.errorOutcome}`}>
              <span>{lastResult.exitCode === 0 ? 'Completed' : 'Failed'}</span>
              <code>$ {lastResult.rawCommand}</code>
            </div>
          )}
        </div>

        <div className={styles.actionsCard}>
          <div className={styles.primaryActions}>
            <button type="button" className={styles.iconButton} onClick={onReset} disabled={isPlaying || isBusy} aria-label="Restart scenario" title="Restart scenario"><RotateCcw size={15} aria-hidden="true" /></button>
            <button type="button" className={styles.controlButton} onClick={onStepBack} disabled={currentStepIndex <= 0 || isPlaying || isBusy}><ChevronLeft size={15} aria-hidden="true" /> Previous</button>
            <button type="button" className={styles.playButton} onClick={onPlayToggle} disabled={complete || isBusy}>{isPlaying ? <Pause size={15} aria-hidden="true" /> : <Play size={15} aria-hidden="true" />}{isPlaying ? 'Pause' : 'Play lesson'}</button>
            <button type="button" className={styles.controlButton} onClick={onStepForward} disabled={complete || isPlaying || isBusy}>Run step <ChevronRight size={15} aria-hidden="true" /></button>
          </div>
          <label className={styles.speedControl}>
            <span>Playback pace</span>
            <select value={playbackSpeed} onChange={(event) => onSpeedChange(Number(event.target.value))} disabled={isPlaying || isBusy}>
              <option value={3200}>Guided</option><option value={2000}>Normal</option><option value={1000}>Quick</option>
            </select>
          </label>
        </div>
      </div>

      <div className={styles.timelineSection}>
        <div className={styles.timelineHeading}>
          <span>Lesson map</span>
          <span>Select any block to inspect what it teaches</span>
        </div>
        <div className={styles.timeline}>
          {currentScenario.steps.map((step, index) => {
            const state = index < currentStepIndex ? 'completed' : index === currentStepIndex ? 'next' : 'upcoming';
            const stepMeta = getScenarioStepMetadata(step);
            return (
              <button
                type="button"
                key={`${step.command}-${index}`}
                className={`${styles.timelineBlock} ${styles[state]} ${previewStepIndex === index ? styles.previewed : ''}`}
                onClick={() => setPreviewStepIndex(index)}
                aria-label={`Inspect step ${index + 1}: ${step.description}`}
              >
                <span className={styles.timelineTop}><span>{index + 1}</span><span>{stepMeta.area}</span></span>
                <code>$ {step.command}</code>
                <strong>{step.description}</strong>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}
