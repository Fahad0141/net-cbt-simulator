import { Card } from '@/ui/components/ui';
import { href } from '@/ui/router';
import s from './Sections.module.css';

const FACTS: ReadonlyArray<[term: string, detail: string]> = [
  ['Format', '200 MCQs with four options each, in 180 minutes'],
  ['Marking', 'One mark per correct answer, no negative marking'],
  ['Merit', 'Aggregate of NET 75%, HSSC 15% and SSC 10%'],
  ['Where', 'Computer-based in Islamabad and Quetta; paper-based in Karachi and Gilgit'],
  ['When', 'Four series in each admission year'],
];

/** Key facts about the real test, next to the progress card. */
export function GlanceCard() {
  return (
    <Card title="NET at a glance">
      <dl className={s.facts}>
        {FACTS.map(([term, detail]) => (
          <div key={term} className={s.fact}>
            <dt>{term}</dt>
            <dd>{detail}</dd>
          </div>
        ))}
      </dl>
      <p className={s.factsNote}>
        Rules can change between series. <a href={href('/about')}>More about the exam pattern</a>
      </p>
    </Card>
  );
}
