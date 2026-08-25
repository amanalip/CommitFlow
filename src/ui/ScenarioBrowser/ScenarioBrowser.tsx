import { useEffect, useMemo, useRef, useState } from 'react';
import { BookOpen, Check, ChevronDown, Clock, Search, X } from 'lucide-react';
import { Scenario } from '../../model/types';
import { SCENARIOS } from '../../scenarios/data';
import styles from './ScenarioBrowser.module.css';

interface ScenarioBrowserProps {
  selectedScenario: Scenario | null;
  onSelectScenario: (scenario: Scenario | null) => void;
  disabled?: boolean;
}

export function ScenarioBrowser({ selectedScenario, onSelectScenario, disabled = false }: ScenarioBrowserProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const rootRef = useRef<HTMLDivElement>(null);

  const scenarios = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return SCENARIOS;
    return SCENARIOS.filter((scenario) =>
      [scenario.title, scenario.category, scenario.difficulty, scenario.summary, ...scenario.concepts]
        .join(' ')
        .toLowerCase()
        .includes(normalized)
    );
  }, [query]);

  useEffect(() => {
    if (!open) return;
    const closeOnOutsideClick = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', closeOnOutsideClick);
    window.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('mousedown', closeOnOutsideClick);
      window.removeEventListener('keydown', closeOnEscape);
    };
  }, [open]);

  return (
    <div className={styles.browser} ref={rootRef}>
      <button
        type="button"
        className={`${styles.trigger} ${open ? styles.triggerOpen : ''}`}
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-haspopup="dialog"
        disabled={disabled}
      >
        <BookOpen size={15} aria-hidden="true" />
        <span>{selectedScenario ? selectedScenario.title : 'Learning scenarios'}</span>
        <span className={styles.count}>{SCENARIOS.length}</span>
        <ChevronDown size={14} aria-hidden="true" />
      </button>

      {open && (
        <div className={styles.popover} role="dialog" aria-label="Choose a learning scenario">
          <div className={styles.popoverHeader}>
            <div>
              <div className={styles.eyebrow}>Guided practice</div>
              <div className={styles.heading}>Choose what to learn next</div>
            </div>
            <button type="button" className={styles.closeButton} onClick={() => setOpen(false)} aria-label="Close scenario browser">
              <X size={17} aria-hidden="true" />
            </button>
          </div>

          <label className={styles.searchBox}>
            <Search size={15} aria-hidden="true" />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search commands, concepts, or difficulty" autoFocus />
          </label>

          <div className={styles.resultsMeta}>{scenarios.length} lessons available</div>
          <div className={styles.scenarioList}>
            {scenarios.map((scenario) => {
              const selected = selectedScenario?.id === scenario.id;
              return (
                <button
                  key={scenario.id}
                  type="button"
                  className={`${styles.scenarioCard} ${selected ? styles.selectedCard : ''}`}
                  onClick={() => {
                    onSelectScenario(scenario);
                    setOpen(false);
                    setQuery('');
                  }}
                >
                  <span className={styles.cardTopline}>
                    <span className={styles.category}>{scenario.category}</span>
                    <span className={styles.difficulty}>{scenario.difficulty}</span>
                    {selected && <Check size={15} className={styles.check} aria-label="Selected" />}
                  </span>
                  <span className={styles.cardTitle}>{scenario.title}</span>
                  <span className={styles.cardSummary}>{scenario.summary}</span>
                  <span className={styles.cardMeta}>
                    <Clock size={13} aria-hidden="true" /> {scenario.estimatedMinutes} min
                    <span aria-hidden="true">•</span>
                    {scenario.steps.length} steps
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
