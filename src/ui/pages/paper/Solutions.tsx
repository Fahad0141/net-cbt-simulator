import { memo } from 'react';
import { chapterName } from '@/config/syllabus';
import type { Paper, Question } from '@/engine/types';
import { RichText } from '@/ui/components/RichText';
import { DIFFICULTY_LABEL, letterOf, sectionQuestions } from './layout';
import { useIncrementalCount } from './useIncrementalCount';
import css from './PaperDocument.module.css';

function chapterOf(question: Question): string {
  try {
    return chapterName(question.subject, question.chapter);
  } catch {
    return question.chapter; // subject missing from the syllabus (e.g. an older paper)
  }
}

const Solution = memo(function Solution({ question }: { question: Question }) {
  const number = question.index + 1;
  const answer = question.options[question.correct] ?? '';
  const meta = [
    chapterOf(question),
    DIFFICULTY_LABEL[question.difficulty],
    question.origin === 'past-paper' ? 'past-paper style' : null,
  ]
    .filter(Boolean)
    .join(' · ');
  return (
    <div className={css.sol}>
      <div className={css.solHead}>
        <span className={css.solNum}>{number}.</span>
        <span className={css.solAnswer}>({letterOf(question.correct)})</span>
        <RichText text={answer} inline className={css.solOption} />
        <span className={css.solMeta}>{meta}</span>
      </div>
      <RichText
        text={question.explanation || 'No worked solution is available for this question.'}
        className={css.solBody}
      />
    </div>
  );
});

/** Worked solutions for every question, rendered progressively (they can be long). */
export function Solutions({ paper, renderAll }: { paper: Paper; renderAll: boolean }) {
  const count = useIncrementalCount(paper.questions.length, {
    initial: 16,
    step: 32,
    all: renderAll,
  });
  const sections = paper.sections.filter((s) => s.count > 0);
  return (
    <section
      className={`${css.sheet} ${css.newPage} ${css.solutions}`}
      aria-labelledby="paper-solutions"
    >
      <header className={css.keyHead}>
        <h2 id="paper-solutions" className={css.keyTitle}>
          Worked Solutions
        </h2>
        <p className={css.keySub}>
          Paper code <strong className={css.code}>{paper.code}</strong> · the correct option, then
          the working. Chapter and difficulty help you find the topics to revise.
        </p>
      </header>
      {sections.map((section, i) => {
        if (section.start >= count) return null;
        const [first, ...rest] = sectionQuestions(paper, section).filter((q) => q.index < count);
        if (!first) return null;
        return (
          <div key={`${section.subject}-${section.start}`} className={css.solSection}>
            <div className={css.keep}>
              <h3 className={css.solSectionTitle}>
                Section {i + 1} · {section.title}
              </h3>
              <Solution question={first} />
            </div>
            {rest.map((q) => (
              <Solution key={q.uid} question={q} />
            ))}
          </div>
        );
      })}
    </section>
  );
}
