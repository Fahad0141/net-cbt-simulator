import { useDeferredValue, useId, useMemo, useState } from 'react';
import { chapterName } from '@/config/syllabus';
import type { QuestionTemplate, SubjectId } from '@/engine/types';
import { RichText } from '@/ui/components/RichText';
import { Button, ui } from '@/ui/components/ui';
import { BankLink } from './BankLink';
import {
  type DifficultyFilter,
  EMPTY_FILTER,
  filterTemplates,
  isFilterActive,
  type KindFilter,
  localId,
  type OriginFilter,
  snippetOf,
  type TemplateFilter,
} from './model';
import { rememberedFilter, rememberedLimit, rememberFilter, rememberLimit } from './navigation';
import { TagList, TemplateBadges } from './parts';
import s from './bank.module.css';

const PAGE_SIZE = 40;

const KIND_OPTIONS: ReadonlyArray<readonly [KindFilter, string]> = [
  ['all', 'All kinds'],
  ['dynamic', 'Parametric'],
  ['static', 'Fixed'],
  ['set', 'Passage sets'],
];
const DIFFICULTY_OPTIONS: ReadonlyArray<readonly [DifficultyFilter, string]> = [
  ['all', 'All levels'],
  ['1', 'Easy'],
  ['2', 'Medium'],
  ['3', 'Hard'],
];
const ORIGIN_OPTIONS: ReadonlyArray<readonly [OriginFilter, string]> = [
  ['all', 'All origins'],
  ['past-paper', 'Past-paper style'],
  ['original', 'Original'],
];

function FilterSelect<T extends string>({
  id,
  label,
  value,
  options,
  onChange,
}: {
  id: string;
  label: string;
  value: T;
  options: ReadonlyArray<readonly [T, string]>;
  onChange: (value: T) => void;
}) {
  return (
    <div className={ui.field}>
      <label className={ui.fieldLabel} htmlFor={id}>
        {label}
      </label>
      <select
        id={id}
        className={ui.select}
        value={value}
        onChange={(e) => onChange(e.target.value as T)}
      >
        {options.map(([optionValue, text]) => (
          <option key={optionValue} value={optionValue}>
            {text}
          </option>
        ))}
      </select>
    </div>
  );
}

function TemplateItem({
  template,
  subject,
  selected,
  showChapter,
}: {
  template: QuestionTemplate;
  subject: SubjectId;
  selected: boolean;
  showChapter: boolean;
}) {
  const snippet = snippetOf(template);
  return (
    <li className={selected ? `${s.item} ${s.itemSelected}` : s.item}>
      <div className={s.itemHead}>
        <BankLink
          to={{ subject, chapter: template.chapter, template: template.id }}
          focus="preview-heading"
          data-focus-key={`item:${template.id}`}
          className={s.itemLink}
          aria-current={selected ? 'true' : undefined}
        >
          {localId(template.id)}
        </BankLink>
        <TemplateBadges template={template} />
      </div>
      {showChapter ? (
        <p className={s.itemChapter}>{chapterName(subject, template.chapter)}</p>
      ) : null}
      {snippet.ok ? (
        <div className={s.snippet}>
          {snippet.title ? <strong className={s.snippetTitle}>{snippet.title}</strong> : null}
          <RichText text={snippet.text} className={s.snippetText} />
        </div>
      ) : (
        <p className={s.itemError}>Could not generate a sample: {snippet.error}</p>
      )}
      <TagList tags={template.tags} />
    </li>
  );
}

export interface TemplateBrowserProps {
  /** Key under which the search and filters are remembered for this visit. */
  scope: string;
  subject: SubjectId;
  templates: readonly QuestionTemplate[];
  selectedId?: string;
  /** Show each template's chapter (subject-wide search). */
  showChapter?: boolean;
  /** List nothing until a search term or filter is entered. */
  requireFilter?: boolean;
  /** Accessible name of the search form. */
  label: string;
}

/**
 * Searchable, filterable template list. Searches ids and tags, and the stem text of
 * fixed questions (parametric stems change with every variant).
 */
export function TemplateBrowser({
  scope,
  subject,
  templates,
  selectedId,
  showChapter = false,
  requireFilter = false,
  label,
}: TemplateBrowserProps) {
  const id = useId();
  const [filter, setFilter] = useState<TemplateFilter>(() => rememberedFilter(scope));
  const [limit, setLimit] = useState(() => rememberedLimit(scope, PAGE_SIZE));
  const deferred = useDeferredValue(filter);
  const results = useMemo(() => filterTemplates(templates, deferred), [templates, deferred]);
  const active = isFilterActive(deferred);
  const listed = !requireFilter || active;

  const update = (patch: Partial<TemplateFilter>) => {
    const next = { ...filter, ...patch };
    setFilter(next);
    rememberFilter(scope, next);
    setLimit(PAGE_SIZE);
    rememberLimit(scope, PAGE_SIZE);
  };

  const showMore = () => {
    const next = limit + PAGE_SIZE;
    setLimit(next);
    rememberLimit(scope, next);
  };

  const total = templates.length;
  const noun = total === 1 ? 'template' : 'templates';
  const status = !listed
    ? `Search ${total} ${noun} by id, tag or question text, or pick a filter.`
    : active
      ? `${results.length} of ${total} ${noun} match.`
      : `${total} ${noun}.`;
  const remaining = results.length - limit;

  return (
    <div className={s.browser}>
      <form
        role="search"
        aria-label={label}
        className={s.filters}
        onSubmit={(e) => e.preventDefault()}
      >
        <div className={`${ui.field} ${s.searchField}`}>
          <label className={ui.fieldLabel} htmlFor={`${id}-q`}>
            Search
          </label>
          <input
            id={`${id}-q`}
            type="search"
            className={ui.input}
            value={filter.query}
            placeholder="Id, tag or question text"
            autoComplete="off"
            spellCheck={false}
            onChange={(e) => update({ query: e.target.value })}
            onKeyDown={(e) => {
              if (e.key === 'Escape' && filter.query) {
                e.preventDefault();
                update({ query: '' });
              }
            }}
          />
        </div>
        <FilterSelect
          id={`${id}-kind`}
          label="Kind"
          value={filter.kind}
          options={KIND_OPTIONS}
          onChange={(kind) => update({ kind })}
        />
        <FilterSelect
          id={`${id}-difficulty`}
          label="Difficulty"
          value={filter.difficulty}
          options={DIFFICULTY_OPTIONS}
          onChange={(difficulty) => update({ difficulty })}
        />
        <FilterSelect
          id={`${id}-origin`}
          label="Origin"
          value={filter.origin}
          options={ORIGIN_OPTIONS}
          onChange={(origin) => update({ origin })}
        />
        {isFilterActive(filter) ? (
          <Button variant="ghost" className={s.clearButton} onClick={() => update(EMPTY_FILTER)}>
            Clear
          </Button>
        ) : null}
      </form>

      <p className={s.count} role="status">
        {status}
      </p>

      {listed && results.length > 0 ? (
        <ul className={s.list} aria-label={active ? 'Matching templates' : 'Templates'}>
          {results.slice(0, limit).map((t) => (
            <TemplateItem
              key={t.id}
              template={t}
              subject={subject}
              selected={t.id === selectedId}
              showChapter={showChapter}
            />
          ))}
        </ul>
      ) : null}

      {listed && results.length === 0 ? (
        <div className={s.noResults}>
          <p>
            <strong>No templates match.</strong> Try fewer or shorter words, or clear the filters.
          </p>
          <Button onClick={() => update(EMPTY_FILTER)}>Clear search and filters</Button>
        </div>
      ) : null}

      {listed && remaining > 0 ? (
        <Button onClick={showMore} className={s.moreButton}>
          Show {Math.min(PAGE_SIZE, remaining)} more ({remaining} not shown)
        </Button>
      ) : null}
    </div>
  );
}
