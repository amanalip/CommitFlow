import { useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import { EXPLAINER_PRESETS, ExplainerPreset } from './explainer-fixtures';
import styles from './ExplainerMode.module.css';

interface CommandCatalogProps {
  selectedId?: string;
  disabled: boolean;
  onSelect: (preset: ExplainerPreset) => void;
}

export function CommandCatalog({ selectedId, disabled, onSelect }: CommandCatalogProps) {
  const [query, setQuery] = useState('');
  const [difficulty, setDifficulty] = useState<'All' | ExplainerPreset['difficulty']>('All');
  const visible = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return EXPLAINER_PRESETS.filter((preset) => {
      const matchesDifficulty = difficulty === 'All' || preset.difficulty === difficulty;
      const haystack = [preset.title, preset.command, preset.category, preset.summary, ...preset.concepts].join(' ').toLowerCase();
      return matchesDifficulty && (!normalized || haystack.includes(normalized));
    });
  }, [difficulty, query]);

  const grouped = useMemo(() => {
    const groups = new Map<string, ExplainerPreset[]>();
    for (const item of visible) groups.set(item.category, [...(groups.get(item.category) ?? []), item]);
    return groups;
  }, [visible]);

  return (
    <aside className={styles.catalog} aria-label="Git command example library">
      <div className={styles.catalogHeader}>
        <div><span className={styles.eyebrow}>Command library</span><strong>{EXPLAINER_PRESETS.length} guided examples</strong></div>
        <span className={styles.resultCount}>{visible.length} shown</span>
      </div>
      <label className={styles.catalogSearch}>
        <Search size={15} aria-hidden="true" />
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search command or concept" />
      </label>
      <div className={styles.filterSection}>
        <span className={styles.filterLabel}>Difficulty</span>
        <div className={styles.filterRow} aria-label="Filter examples by difficulty">
          {(['All', 'Beginner', 'Intermediate', 'Advanced'] as const).map((item) => (
            <button type="button" key={item} className={difficulty === item ? styles.filterActive : ''} onClick={() => setDifficulty(item)} aria-pressed={difficulty === item}>{item}</button>
          ))}
        </div>
      </div>
      <div className={styles.catalogList}>
        {Array.from(grouped.entries()).map(([category, presets]) => (
          <section key={category} className={styles.catalogGroup}>
            <div className={styles.catalogGroupTitle}>{category}<span>{presets.length}</span></div>
            {presets.map((preset) => (
              <button
                type="button"
                key={preset.id}
                className={`${styles.catalogItem} ${selectedId === preset.id ? styles.catalogItemSelected : ''}`}
                onClick={() => onSelect(preset)}
                disabled={disabled}
              >
                <span className={styles.catalogItemTop}><strong>{preset.title}</strong><span>{preset.kind}</span></span>
                <code>$ {preset.command}</code>
                <span>{preset.summary}</span>
              </button>
            ))}
          </section>
        ))}
        {visible.length === 0 && <div className={styles.noResults}>No guided examples match this search.</div>}
      </div>
    </aside>
  );
}
