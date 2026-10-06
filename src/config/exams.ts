import type { Blueprint } from '@/engine/assemble';
import type { SubjectId } from '@/engine/types';
import { defaultChapterWeights, SUBJECT_DYNAMIC_SHARE } from './syllabus';

/** Paper-level hybrid share that corresponds to the calibrated per-subject defaults. */
export const NOMINAL_DYNAMIC_SHARE = 0.55;

/** Section multiplier turning the paper-level share into the subject's calibrated share. */
export const dynamicFactorFor = (subject: SubjectId): number =>
  SUBJECT_DYNAMIC_SHARE[subject] / NOMINAL_DYNAMIC_SHARE;

/**
 * NET paper patterns.
 *
 * Current (NET-2025 onward, unchanged through the NET-2027 cycle): every NET is
 * 200 MCQs / 200 marks in 180 minutes, four options per MCQ, one mark each and
 * no negative marking. Subject weights from NUST's "Subjects Included in NET with
 * Weightings" page; MCQ counts follow from the 200-question total.
 *
 * Legacy patterns (in force up to the NET-2024 cycle / Series-1 of NET-2025) are kept
 * for candidates who want extra Chemistry / Computer Science / Intelligence practice.
 * Sources and history: docs/EXAM_PATTERN.md.
 */

export interface ExamSectionConfig {
  subject: SubjectId;
  /** Section name as shown on the terminal. */
  title: string;
  count: number;
  /** Optional chapter-weight overrides for this paper (merged over syllabus defaults). */
  chapterWeights?: Readonly<Record<string, number>>;
}

export interface ExamTypeConfig {
  /** Stable id used in URLs and storage. */
  id: string;
  /** Paper-code prefix, e.g. `ENG` in `ENG-K7Q2-9XM4`. */
  code: string;
  name: string;
  /** Test title in the terminal header. */
  cbtTitle: string;
  era: 'current' | 'legacy';
  /** Who sits this paper. */
  audience: string;
  /** Programmes admitted through it (examples). */
  programmes: readonly string[];
  durationMinutes: number;
  sections: readonly ExamSectionConfig[];
  note?: string;
}

/** English in the 100-MCQ papers leans more on analogies and passages (SAT pattern). */
const LONG_ENGLISH_WEIGHTS = { analogies: 9, comprehension: 11 } as const;

export const EXAM_TYPES: readonly ExamTypeConfig[] = [
  {
    id: 'engineering',
    code: 'ENG',
    name: 'NET Engineering',
    cbtTitle: 'NET-Engineering (Engineering / Computing)',
    era: 'current',
    audience: 'HSSC Pre-Engineering, ICS, or Pre-Medical with Additional Mathematics',
    programmes: [
      'All engineering programmes',
      'BS Computer Science / Software Engineering / AI / Data Science',
      'BS Mathematics / Physics / Chemistry',
    ],
    durationMinutes: 180,
    sections: [
      { subject: 'mathematics', title: 'Mathematics', count: 100 },
      { subject: 'physics', title: 'Physics', count: 60 },
      { subject: 'english', title: 'English', count: 40 },
    ],
  },
  {
    id: 'applied-sciences',
    code: 'APS',
    name: 'NET Applied Sciences',
    cbtTitle: 'NET-Applied Sciences',
    era: 'current',
    audience: 'HSSC Pre-Medical (with or without Additional Mathematics)',
    programmes: [
      'BS Biotechnology',
      'BS Environmental Science',
      'BS Agriculture',
      'BS Food Science & Technology',
      'BS Bioinformatics',
    ],
    durationMinutes: 180,
    sections: [
      { subject: 'biology', title: 'Biology', count: 100 },
      { subject: 'chemistry', title: 'Chemistry', count: 60 },
      { subject: 'english', title: 'English', count: 40 },
    ],
  },
  {
    id: 'business',
    code: 'BUS',
    name: 'NET Business Studies & Social Sciences',
    cbtTitle: 'NET-Business Studies & Social Sciences',
    era: 'current',
    audience: 'HSSC / equivalent, any subject combination',
    programmes: [
      'BBA',
      'BS Accounting & Finance',
      'BS Economics',
      'BS Mass Communication',
      'BS Psychology',
      'LLB',
      'BS International Relations',
    ],
    durationMinutes: 180,
    sections: [
      { subject: 'quantitative', title: 'Quantitative Mathematics', count: 100 },
      {
        subject: 'english',
        title: 'English (Verbal)',
        count: 100,
        chapterWeights: LONG_ENGLISH_WEIGHTS,
      },
    ],
  },
  {
    id: 'architecture',
    code: 'ARC',
    name: 'NET Architecture',
    cbtTitle: 'NET-Architecture (Architecture / Industrial Design)',
    era: 'current',
    audience: 'HSSC Pre-Engineering or equivalent with Mathematics and Physics',
    programmes: ['Bachelor of Architecture', 'Bachelor of Industrial Design'],
    durationMinutes: 180,
    sections: [
      { subject: 'design', title: 'Design Aptitude', count: 100 },
      { subject: 'mathematics', title: 'Mathematics', count: 60 },
      { subject: 'english', title: 'English (Comprehension)', count: 40 },
    ],
  },
  {
    id: 'natural-sciences',
    code: 'NAT',
    name: 'NET Natural Sciences',
    cbtTitle: 'NET-Natural Sciences (BS Mathematics / Physics / Chemistry)',
    era: 'current',
    audience: 'HSSC / equivalent with Mathematics (non pre-engineering backgrounds)',
    programmes: ['BS Mathematics', 'BS Physics', 'BS Chemistry'],
    durationMinutes: 180,
    sections: [
      { subject: 'mathematics', title: 'Mathematics', count: 100 },
      {
        subject: 'english',
        title: 'English (Comprehension)',
        count: 100,
        chapterWeights: LONG_ENGLISH_WEIGHTS,
      },
    ],
  },
  {
    id: 'legacy-engineering',
    code: 'LEN',
    name: 'Engineering — pre-2025 pattern',
    cbtTitle: 'Engineering/Computer Science/BS Mathematics (With Chemistry)',
    era: 'legacy',
    audience: 'Legacy pattern (up to NET-2024): Pre-Engineering',
    programmes: ['Practice for Chemistry and Intelligence'],
    durationMinutes: 180,
    note: 'Mathematics 40%, Physics 30%, Chemistry 15%, English 10%, Intelligence 5%.',
    sections: [
      { subject: 'chemistry', title: 'Chemistry', count: 30 },
      { subject: 'physics', title: 'Physics', count: 60 },
      { subject: 'mathematics', title: 'Mathematics', count: 80 },
      { subject: 'english', title: 'English', count: 20 },
      { subject: 'intelligence', title: 'Intelligence', count: 10 },
    ],
  },
  {
    id: 'legacy-ics',
    code: 'LCS',
    name: 'Engineering (ICS) — pre-2025 pattern',
    cbtTitle: 'Engineering/Computer Science/BS Mathematics (With Computer Science)',
    era: 'legacy',
    audience: 'Legacy pattern (up to NET-2024): ICS',
    programmes: ['Practice for Computer Science and Intelligence'],
    durationMinutes: 180,
    note: 'Mathematics 40%, Physics 30%, Computer Science 15%, English 10%, Intelligence 5%.',
    sections: [
      { subject: 'computer', title: 'Computer Science', count: 30 },
      { subject: 'physics', title: 'Physics', count: 60 },
      { subject: 'mathematics', title: 'Mathematics', count: 80 },
      { subject: 'english', title: 'English', count: 20 },
      { subject: 'intelligence', title: 'Intelligence', count: 10 },
    ],
  },
  {
    id: 'legacy-biosciences',
    code: 'LBI',
    name: 'Biosciences — pre-2025 pattern',
    cbtTitle: 'BS Biotechnology / BS Environmental Science',
    era: 'legacy',
    audience: 'Legacy pattern (up to NET-2024): Pre-Medical',
    programmes: ['Practice for Physics with Biology and Chemistry'],
    durationMinutes: 180,
    note: 'Biology 40%, Chemistry 30%, Physics 15%, English 10%, Intelligence 5%.',
    sections: [
      { subject: 'chemistry', title: 'Chemistry', count: 60 },
      { subject: 'physics', title: 'Physics', count: 30 },
      { subject: 'biology', title: 'Biology', count: 80 },
      { subject: 'english', title: 'English', count: 20 },
      { subject: 'intelligence', title: 'Intelligence', count: 10 },
    ],
  },
  {
    id: 'legacy-business',
    code: 'LBU',
    name: 'Business — pre-2025 pattern',
    cbtTitle: 'Business Studies & Social Sciences',
    era: 'legacy',
    audience: 'Legacy pattern (up to NET-2024)',
    programmes: ['Practice for Intelligence'],
    durationMinutes: 180,
    note: 'English 40%, Quantitative (Basic Mathematics) 40%, Intelligence 20%.',
    sections: [
      {
        subject: 'english',
        title: 'English (Verbal)',
        count: 80,
        chapterWeights: LONG_ENGLISH_WEIGHTS,
      },
      { subject: 'quantitative', title: 'Quantitative Mathematics', count: 80 },
      { subject: 'intelligence', title: 'Intelligence', count: 40 },
    ],
  },
  {
    id: 'legacy-architecture',
    code: 'LAR',
    name: 'Architecture — pre-2025 pattern',
    cbtTitle: 'Bachelor of Architecture / Industrial Design',
    era: 'legacy',
    audience: 'Legacy pattern (up to NET-2024)',
    programmes: ['Practice for Physics and Intelligence'],
    durationMinutes: 180,
    note: 'Mathematics 30%, Physics 30%, English 25%, Intelligence 15%.',
    sections: [
      { subject: 'english', title: 'English (Comprehension)', count: 50 },
      { subject: 'mathematics', title: 'Mathematics', count: 60 },
      { subject: 'physics', title: 'Physics', count: 60 },
      { subject: 'intelligence', title: 'Intelligence', count: 30 },
    ],
  },
];

export const DEFAULT_EXAM_TYPE = 'engineering';

export function examTypeById(id: string): ExamTypeConfig | undefined {
  return EXAM_TYPES.find((e) => e.id === id);
}

export function examTypeByCode(code: string): ExamTypeConfig | undefined {
  return EXAM_TYPES.find((e) => e.code === code.toUpperCase());
}

export const PAPER_CODE_PREFIXES: readonly string[] = [...EXAM_TYPES.map((e) => e.code), 'CUS'];

/** Turns an exam type into the assembler's blueprint. */
export function blueprintFor(exam: ExamTypeConfig): Blueprint {
  return {
    examType: exam.id,
    codePrefix: exam.code,
    title: exam.cbtTitle,
    durationMinutes: exam.durationMinutes,
    sections: exam.sections.map((s) => ({
      subject: s.subject,
      title: s.title,
      count: s.count,
      chapterWeights: { ...defaultChapterWeights(s.subject), ...(s.chapterWeights ?? {}) },
      dynamicFactor: dynamicFactorFor(s.subject),
    })),
  };
}

/** Subjects a paper of this type needs (for lazy-loading the bank). */
export const subjectsOf = (exam: Pick<ExamTypeConfig, 'sections'>): SubjectId[] => [
  ...new Set(exam.sections.map((s) => s.subject)),
];
