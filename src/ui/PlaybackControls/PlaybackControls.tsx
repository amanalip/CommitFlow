import { Scenario } from '../../model/types';
import styles from './PlaybackControls.module.css';

interface PlaybackControlsProps {
  currentScenario: Scenario | null;
  currentStepIndex: number;
  isPlaying: boolean;
  playbackSpeed: number;
  onStepBack: () => void;
  onStepForward: () => void;
  onPlayToggle: () => void;
  onReset: () => void;
  onSpeedChange: (speed: number) => void;
}

export function PlaybackControls({
  currentScenario,
  currentStepIndex,
  isPlaying,
  playbackSpeed,
  onStepBack,
  onStepForward,
  onPlayToggle,
  onReset,
  onSpeedChange,
}: PlaybackControlsProps) {
  if (!currentScenario) return null;

  const totalSteps = currentScenario.steps.length;
  const currentStep = currentScenario.steps[currentStepIndex];

  return (
    <div className={styles.controlsBar}>
      <div className={styles.scenarioInfo}>
        <div className={styles.scenarioTitle}>{currentScenario.title}</div>
        <div className={styles.scenarioDesc}>
          {currentStep ? currentStep.description : 'Completed scenario'}
        </div>
      </div>

      <div className={styles.buttonGroup}>
        <button
          className={styles.controlBtn}
          onClick={onReset}
          title="Reset to beginning of scenario"
          disabled={isPlaying}
        >
          ⏮ Reset
        </button>
        <button
          className={styles.controlBtn}
          onClick={onStepBack}
          disabled={currentStepIndex <= 0 || isPlaying}
          title="Step backward one command"
        >
          ◀ Step Back
        </button>
        <button
          className={`${styles.controlBtn} ${styles.primaryBtn}`}
          onClick={onPlayToggle}
          title={isPlaying ? 'Pause playback' : 'Play all steps automatically'}
        >
          {isPlaying ? '⏸ Pause' : '▶ Play All'}
        </button>
        <button
          className={styles.controlBtn}
          onClick={onStepForward}
          disabled={currentStepIndex >= totalSteps || isPlaying}
          title="Step forward one command"
        >
          Step Forward ▶
        </button>
      </div>

      <div className={styles.buttonGroup}>
        <span className={styles.stepIndicator}>
          Step {Math.min(currentStepIndex + 1, totalSteps)} of {totalSteps}
        </span>
        <select
          className={styles.speedSelect}
          value={playbackSpeed}
          onChange={(e) => onSpeedChange(Number(e.target.value))}
          title="Playback speed"
        >
          <option value={2000}>0.5x</option>
          <option value={1000}>1x</option>
          <option value={500}>2x</option>
        </select>
      </div>
    </div>
  );
}
