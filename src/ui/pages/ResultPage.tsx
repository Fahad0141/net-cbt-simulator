import { useEffect, useMemo } from 'react';
import type { AttemptRecord } from '@/exam/store';
import { ui } from '@/ui/components/ui';
import { useAttempt } from '@/ui/hooks';
import { AggregateEstimator } from './result/AggregateEstimator';
import { analyzeSafely, type ResultModel } from './result/analysis';
import { AnswerMap } from './result/AnswerMap';
import { ChapterPerformance } from './result/ChapterPerformance';
import { DifficultyBreakdown } from './result/DifficultyBreakdown';
import { PaperDetails } from './result/PaperDetails';
import { ResultHeader } from './result/ResultHeader';
import { ResultDamaged, ResultError, ResultLoading, ResultNotFound } from './result/ResultStates';
import { ScoreHero } from './result/ScoreHero';
import { SubjectTable } from './result/SubjectTable';
import { TimeAnalysis } from './result/TimeAnalysis';
import styles from './ResultPage.module.css';

const APP_NAME = 'NET CBT Simulator';

const recordId = (record: AttemptRecord): string | undefined =>
  record.session?.id ?? record.summary?.id;

function ResultReport({ model }: { model: ResultModel }) {
  return (
    <div className={`${ui.page} ${styles.page}`}>
      <ResultHeader model={model} />
      <ScoreHero model={model} />
      <SubjectTable model={model} />
      <ChapterPerformance model={model} />
      <div className={styles.pair}>
        <DifficultyBreakdown model={model} />
        <TimeAnalysis model={model} />
      </div>
      <AnswerMap model={model} />
      <div className={styles.pair}>
        <AggregateEstimator netPercent={model.netPercent} indicative={!model.isFullLength} />
        <PaperDetails model={model} />
      </div>
    </div>
  );
}

/** Score report for an archived attempt (`#/result/<attemptId>`). */
export default function ResultPage({ id }: { id: string }) {
  const { data, error, loading, reload } = useAttempt(id);
  // While a new id loads, `data` may still hold the previous attempt: never show it.
  const record = data && (!loading || recordId(data) === id) ? data : undefined;
  const analysis = useMemo(() => (record ? analyzeSafely(record, id) : null), [record, id]);
  const code = analysis?.model?.paper.code;

  useEffect(() => {
    document.title = code ? `Result ${code} · ${APP_NAME}` : `Result · ${APP_NAME}`;
  }, [code]);

  if (!record) {
    if (loading) return <ResultLoading />;
    if (error) return <ResultError message={error.message} onRetry={reload} />;
    return <ResultNotFound />;
  }
  if (!analysis?.model) {
    return <ResultDamaged id={id} message={analysis?.error ?? 'unknown error'} />;
  }
  return <ResultReport model={analysis.model} />;
}
