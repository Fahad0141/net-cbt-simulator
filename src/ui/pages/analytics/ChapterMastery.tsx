import { useId, useMemo, useState } from 'react';
import { Sparkline } from '@/ui/components/charts';
import { Badge, Card, ui } from '@/ui/components/ui';
import { href } from '@/ui/router';
import { formatPercent, plural } from './format';
import {
  type ChapterInsight,
  DRILL_QUESTIONS,
  drillPath,
  MIN_QUESTIONS_FOR_RATING,
  type MasteryLevel,
} from './model';
import s from './analytics.module.css';
import { type Direction, SORT_LABELS, type SortKey, sortChapters } from './sortChapters';

const LEVEL_LABEL: Record<MasteryLevel, string> = {
  strong: 'Strong',
  developing: 'Developing',
  weak: 'Weak',
  unrated: 'Not enough data',
};

const LEVEL_TONE: Record<MasteryLevel, 'success' | 'warning' | 'danger' | 'neutral'> = {
  strong: 'success',
  developing: 'warning',
  weak: 'danger',
  unrated: 'neutral',
};

export function MasteryBadge({ level }: { level: MasteryLevel }) {
  return <Badge tone={LEVEL_TONE[level]}>{LEVEL_LABEL[level]}</Badge>;
}

const DEFAULT_DIRECTION: Record<SortKey, Direction> = {
  syllabus: 'asc',
  name: 'asc',
  papers: 'desc',
  correct: 'desc',
  accuracy: 'asc',
  mastery: 'asc',
  trend: 'asc',
};

/** Points of change below which a trend counts as steady. */
const STEADY = 2;
const PAGE_SIZE = 20;

function TrendCell({ chapter }: { chapter: ChapterInsight }) {
  if (chapter.trend === null) {
    return (
      <span className={ui.muted}>
        <span aria-hidden="true">—</span>
        <span className="visually-hidden">Only one attempt</span>
      </span>
    );
  }
  const t = chapter.trend;
  const direction = t > STEADY ? 'up' : t < -STEADY ? 'down' : 'flat';
  const cls = { up: s.trendUp, down: s.trendDown, flat: s.trendFlat }[direction];
  const arrow = { up: '▲', down: '▼', flat: '▶' }[direction];
  const words = { up: 'improving', down: 'declining', flat: 'steady' }[direction];
  return (
    <span className={s.trendCell}>
      <Sparkline values={chapter.history} />
      <span className={cls}>
        <span aria-hidden="true">{arrow} </span>
        {t > 0 ? `+${t}` : String(t)} pts
        <span className="visually-hidden"> ({words} versus earlier attempts)</span>
      </span>
    </span>
  );
}

/** Sortable table of every chapter seen, with mastery rating, trend and a drill link. */
export function ChapterMastery({ chapters }: { chapters: readonly ChapterInsight[] }) {
  const [sort, setSort] = useState<{ key: SortKey; dir: Direction }>({
    key: 'syllabus',
    dir: 'asc',
  });
  const [subject, setSubject] = useState('all');
  const [expanded, setExpanded] = useState(false);
  const subjectId = useId();

  const subjects = useMemo(() => {
    const seen = new Map<string, string>();
    for (const c of chapters) if (!seen.has(c.subject)) seen.set(c.subject, c.subjectName);
    return [...seen];
  }, [chapters]);
  const activeSubject =
    subject !== 'all' && subjects.some(([id]) => id === subject) ? subject : 'all';

  const rows = useMemo(() => {
    const filtered =
      activeSubject === 'all' ? chapters : chapters.filter((c) => c.subject === activeSubject);
    return sortChapters(filtered, sort.key, sort.dir);
  }, [chapters, activeSubject, sort]);
  const visible = expanded ? rows : rows.slice(0, PAGE_SIZE);

  const toggleSort = (key: SortKey) =>
    setSort((cur) =>
      cur.key === key
        ? { key, dir: cur.dir === 'asc' ? 'desc' : 'asc' }
        : { key, dir: DEFAULT_DIRECTION[key] },
    );

  const header = (
    key: SortKey,
    label: string,
    options: { numeric?: boolean; className?: string } = {},
  ) => {
    const { numeric = false, className } = options;
    const active = sort.key === key;
    return (
      <th
        scope="col"
        className={[numeric ? ui.num : '', className].filter(Boolean).join(' ') || undefined}
        aria-sort={active ? (sort.dir === 'asc' ? 'ascending' : 'descending') : undefined}
      >
        <button
          type="button"
          className={numeric ? `${s.sortButton} ${s.sortNum}` : s.sortButton}
          onClick={() => toggleSort(key)}
        >
          {label}
          <span aria-hidden="true" className={active ? s.sortActive : s.sortIdle}>
            {active ? (sort.dir === 'asc' ? '↑' : '↓') : '↕'}
          </span>
        </button>
      </th>
    );
  };

  return (
    <Card title="Chapter mastery">
      <div className={s.masteryIntro}>
        <p className={`${ui.muted} ${ui.small}`}>
          Mastery is the share of the questions you saw that you got right: a skipped question is a
          lost mark (there is no negative marking), but questions you never reached are ignored. A
          rating needs at least {MIN_QUESTIONS_FOR_RATING} questions seen. Trend compares your
          latest attempt with the average of earlier ones. Select a column heading to sort.
        </p>
        {subjects.length > 1 ? (
          <span className={s.inlineField}>
            <label htmlFor={subjectId} className={ui.small}>
              Subject
            </label>
            <select
              id={subjectId}
              className={`${ui.select} ${s.compactSelect}`}
              value={activeSubject}
              onChange={(e) => {
                setSubject(e.target.value);
                setExpanded(false);
              }}
            >
              <option value="all">All subjects</option>
              {subjects.map(([id, name]) => (
                <option key={id} value={id}>
                  {name}
                </option>
              ))}
            </select>
          </span>
        ) : null}
      </div>
      {rows.length === 0 ? (
        <p className={ui.muted}>No chapters to show.</p>
      ) : (
        <>
          <div className={ui.tableWrap}>
            <table className={`${ui.table} ${s.masteryTable}`}>
              <caption className="visually-hidden">
                Chapter mastery, {plural(rows.length, 'chapter')}, sorted by {SORT_LABELS[sort.key]}
                , {sort.dir === 'asc' ? 'ascending' : 'descending'}
              </caption>
              <thead>
                <tr>
                  {header('syllabus', 'Subject')}
                  {header('name', 'Chapter', { className: s.stickyCol })}
                  {header('papers', 'Attempts', { numeric: true })}
                  {header('correct', 'Correct', { numeric: true })}
                  {header('accuracy', 'Accuracy', { numeric: true })}
                  {header('mastery', 'Mastery')}
                  {header('trend', 'Trend')}
                  <th scope="col">
                    <span className="visually-hidden">Practice</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {visible.map((c) => {
                  const drill = drillPath(c);
                  return (
                    <tr key={c.key}>
                      <td className={s.subjectCell}>{c.subjectName}</td>
                      <th scope="row" className={`${s.chapterCell} ${s.stickyCol}`}>
                        {c.practisable ? (
                          <a
                            href={href(
                              `/bank?subject=${encodeURIComponent(c.subject)}&chapter=${encodeURIComponent(c.chapter)}`,
                            )}
                          >
                            {c.name}
                          </a>
                        ) : (
                          c.name
                        )}
                      </th>
                      <td className={ui.num}>{c.papers}</td>
                      <td className={ui.num}>
                        {c.correct}/{c.seen}
                        <span className="visually-hidden">
                          {' '}
                          correct of {plural(c.seen, 'question')} seen
                        </span>
                      </td>
                      <td className={ui.num}>
                        {c.accuracy === null ? '—' : formatPercent(c.accuracy)}
                      </td>
                      <td>
                        <MasteryBadge level={c.level} />
                      </td>
                      <td>
                        <TrendCell chapter={c} />
                      </td>
                      <td>
                        {drill ? (
                          <a
                            className={s.drillLink}
                            href={href(drill)}
                            aria-label={`Drill ${c.name}: ${DRILL_QUESTIONS} questions`}
                          >
                            Drill
                          </a>
                        ) : null}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {rows.length > PAGE_SIZE ? (
            <button
              type="button"
              className={s.moreButton}
              onClick={() => setExpanded((v) => !v)}
              aria-expanded={expanded}
            >
              {expanded ? 'Show fewer chapters' : `Show all ${rows.length} chapters`}
            </button>
          ) : null}
        </>
      )}
    </Card>
  );
}
